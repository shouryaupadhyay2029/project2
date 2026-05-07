/**
 * Grid Elastic Tension Engine
 * Creates a subtle "pressure" sensation on grid lines near the cursor.
 * Physics: soft elastic surface, NOT magnetic pull. Effect is near-invisible.
 *
 * Constraints:
 *   - Max displacement: 28px
 *   - Influence radius: 320px
 *   - Linear falloff: influence = (1 - distance / radius)
 *   - Ultra-intensity magnetic tension
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('grid-distortion-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    let width  = window.innerWidth;
    let height = window.innerHeight;

    // ── Resize with DPI support ─────────────────────────────────
    function resize() {
        width  = window.innerWidth;
        height = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width  = width  * dpr;
        canvas.height = height * dpr;
        canvas.style.width  = width  + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(dpr, dpr);
    }
    window.addEventListener('resize', resize);
    resize();

    // ── Cursor State ─────────────────────────────────────────────
    let targetX  = -9999; // Off-screen initially — no effect on load
    let targetY  = -9999;
    let currentX = targetX;
    let currentY = targetY;
    let isOnPage = false;
    let inputFocused = false;

    window.addEventListener('mousemove', (e) => {
        targetX  = e.clientX;
        targetY  = e.clientY;
        isOnPage = true;
    });

    // Smoothly exit when cursor leaves the window
    window.addEventListener('mouseleave', () => {
        isOnPage = false;
        // Don't snap targetX/Y — let LERP carry it off gracefully
    });

    // Input field tension boost
    document.addEventListener('focusin',  (e) => {
        if (e.target.matches('input, textarea, select')) inputFocused = true;
    });
    document.addEventListener('focusout', (e) => {
        if (e.target.matches('input, textarea, select')) inputFocused = false;
    });

    // ── Configuration ────────────────────────────────────────────
    const GRID_SPACING    = 32;    // Must match CSS grid (layer-1 is 24px, layer-2 is 64px — we use 32px as visual midpoint)
    const RADIUS          = 320;   // Influence circle radius (px) - Ultra-wide magnetic field
    const MAX_STRENGTH    = 28;    // Absolute maximum displacement (px) - Extreme intensity
    const INPUT_BOOST     = 1.2;   // Tension multiplier when hovering inputs
    const LERP_FACTOR     = 0.07;  // Smoothing — lower = more inertia
    const SAMPLE_STEP     = 8;     // Sampling resolution along each line (px)
    const LINE_OPACITY    = 0.055; // Base canvas line opacity
    const LINE_OPACITY_IN = 0.075; // Opacity near cursor (input focus boost)

    // ── Draw Loop ────────────────────────────────────────────────
    function draw() {
        ctx.clearRect(0, 0, width, height);

        // LERP cursor tracking
        currentX += (targetX - currentX) * LERP_FACTOR;
        currentY += (targetY - currentY) * LERP_FACTOR;

        // If cursor is far off-screen, skip drawing entirely (performance)
        if (!isOnPage && Math.abs(currentX - targetX) < 0.5) {
            requestAnimationFrame(draw);
            return;
        }

        // Effective tension multiplier
        const strength = MAX_STRENGTH * (inputFocused ? INPUT_BOOST : 1.0);

        // Bounding box: only draw in the influenced zone + buffer
        const buf    = RADIUS + GRID_SPACING;
        const startX = Math.max(0,     Math.floor((currentX - buf) / GRID_SPACING) * GRID_SPACING);
        const endX   = Math.min(width, Math.ceil( (currentX + buf) / GRID_SPACING) * GRID_SPACING);
        const startY = Math.max(0,     Math.floor((currentY - buf) / GRID_SPACING) * GRID_SPACING);
        const endY   = Math.min(height,Math.ceil( (currentY + buf) / GRID_SPACING) * GRID_SPACING);

        // ── Vertical Lines ─────────────────────────────────────
        for (let x = startX; x <= endX; x += GRID_SPACING) {
            ctx.beginPath();
            let firstPoint = true;

            for (let y = startY; y <= endY; y += SAMPLE_STEP) {
                const dx  = currentX - x;
                const dy  = currentY - y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                let ox = 0, oy = 0;

                if (dist < RADIUS && dist > 0) {
                    // Linear falloff — "pressure", not attraction wave
                    const influence = (1 - dist / RADIUS);
                    ox = (dx / dist) * influence * strength;
                    oy = (dy / dist) * influence * strength;

                    // Opacity boost very close to cursor
                    const op = LINE_OPACITY + (influence * (LINE_OPACITY_IN - LINE_OPACITY));
                    ctx.strokeStyle = `rgba(255, 255, 255, ${op.toFixed(3)})`;
                } else {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${LINE_OPACITY})`;
                }

                ctx.lineWidth = 0.7;

                if (firstPoint) {
                    ctx.moveTo(x + ox, y + oy);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x + ox, y + oy);
                }
            }
            ctx.stroke();
        }

        // ── Horizontal Lines ───────────────────────────────────
        for (let y = startY; y <= endY; y += GRID_SPACING) {
            ctx.beginPath();
            let firstPoint = true;

            for (let x = startX; x <= endX; x += SAMPLE_STEP) {
                const dx  = currentX - x;
                const dy  = currentY - y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                let ox = 0, oy = 0;

                if (dist < RADIUS && dist > 0) {
                    const influence = (1 - dist / RADIUS);
                    ox = (dx / dist) * influence * strength;
                    oy = (dy / dist) * influence * strength;

                    const op = LINE_OPACITY + (influence * (LINE_OPACITY_IN - LINE_OPACITY));
                    ctx.strokeStyle = `rgba(255, 255, 255, ${op.toFixed(3)})`;
                } else {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${LINE_OPACITY})`;
                }

                ctx.lineWidth = 0.7;

                if (firstPoint) {
                    ctx.moveTo(x + ox, y + oy);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x + ox, y + oy);
                }
            }
            ctx.stroke();
        }

        requestAnimationFrame(draw);
    }

    draw();
});
