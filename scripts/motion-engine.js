/**
 * DevStage Unified Motion & Visual Effects Engine
 * Combined, optimized, and verified by Antigravity
 */

// Lightweight helpers used by multiple canvas systems
const debounce = (fn, ms) => {
    let id;
    return (...args) => {
        clearTimeout(id);
        id = setTimeout(() => fn(...args), ms);
    };
};

const onVisibilityChange = (pauseFn, resumeFn) => {
    document.addEventListener('visibilitychange', () => {
        document.hidden ? pauseFn() : resumeFn();
    });
};

/* === SECTION 1: GLOBAL LOADER === */
(function() {
    // 1. Create and Inject Loader HTML
    const injectLoader = () => {
        if (document.getElementById('page-loader')) return;

        const loaderHTML = `
            <div id="page-loader" class="loader-wrapper">
                <div class="loader">
                    <svg viewBox="0 0 80 80">
                        <circle r="32" cy="40" cx="40" id="test"></circle>
                    </svg>
                </div>

                <div class="loader triangle">
                    <svg viewBox="0 0 86 80">
                        <polygon points="43 8 79 72 7 72"></polygon>
                    </svg>
                </div>

                <div class="loader">
                    <svg viewBox="0 0 80 80">
                        <rect height="64" width="64" y="8" x="8"></rect>
                    </svg>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('afterbegin', loaderHTML);
    };

    let isInitialLoad = true;

    // 2. Loader Logic
    const pageLoader = {
        hide: () => {
            const el = document.getElementById('page-loader');
            if (el) {
                el.classList.add('hidden');
                setTimeout(() => {
                    el.style.display = 'none';
                    isInitialLoad = false; // After first hide, it's no longer initial
                }, 800);
            }
        },
        show: () => {
            const el = document.getElementById('page-loader');
            if (el) {
                el.style.display = 'flex';
                el.offsetHeight;
                el.classList.remove('hidden');
            }
        }
    };

    // Expose to window
    window.pageLoader = pageLoader;

    // 3. Initialize immediately
    injectLoader();
    const startTime = Date.now();

    // Hide on window load with conditional duration check
    window.addEventListener('load', () => {
        const elapsed = Date.now() - startTime;
        // Initial load: 1.5s, Transitions: 0.5s
        const minDuration = isInitialLoad ? 1500 : 500;
        const remaining = Math.max(0, minDuration - elapsed);

        setTimeout(() => {
            pageLoader.hide();
        }, remaining);
    });

    // Safety fallback — only fires if load never resolved
    let safetyTimer = setTimeout(pageLoader.hide, 8000);
    window.addEventListener('load', () => clearTimeout(safetyTimer));

    // 4. Page Transition Logic (Link Interception)
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        const target = link.getAttribute('target');

        // Skip if it's an external link, anchor, or has target="_blank"
        if (!href || href.startsWith('#') || href.startsWith('javascript:') ||
            link.hasAttribute('download') || target === '_blank') {
            return;
        }

        // Only transition if it's a different internal page
        try {
            const url = new URL(href, window.location.origin);
            if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
                // Pre-show loader before navigation starts
                pageLoader.show();
            }
        } catch (err) {
            // Ignore invalid URLs
        }
    });
})();

/* === SECTION 2: INTERACTIVE PARTICLE WAVE (Explore Background) === */
const initParticleWaveSystem = (canvas) => {
    const ctx = canvas.getContext('2d', { alpha: false });

    const CFG = {
        cols: 64, // Optimized density
        rows: 32,
        waveSpeed: 0.012,
        attractStr: 0.015,
        repelRadius: 100,
        repelForce: 25,
        friction: 0.82,
        minRadius: 0.2,
        maxRadius: 2.0,
    };

    let W, H, DPR;
    let particles = [];
    let time = 0;
    let mouse = { x: -9999, y: -9999 };
    let cursorVisible = false;
    // Custom cursor is now created globally by init3DCursor().
    // Declare variable so legacy checks don't throw ReferenceError.
    let cursorEl = null;
    let gradient;
    let rafHandle = null;

    function resize() {
        const isMobile = window.innerWidth < 768;
        DPR = Math.min(isMobile ? 1.5 : 2, window.devicePixelRatio || 1);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * DPR;
        canvas.height = H * DPR;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';

        // Deep Charcoal Gradient
        gradient = ctx.createRadialGradient(
            W * 0.38 * DPR, H * 0.35 * DPR, 0,
            W * 0.50 * DPR, H * 0.50 * DPR, Math.max(W, H) * DPR * 0.90
        );
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(0.5, '#121212');
        gradient.addColorStop(1, '#0a0a0a');

        buildGrid();
    }

    function buildGrid() {
        particles = [];
        const { cols, rows } = CFG;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const bx = (c / (cols - 1)) * W;
                const by = (r / (rows - 1)) * H;
                particles.push({
                    bx,
                    by,
                    x: bx,
                    y: by,
                    vx: 0,
                    vy: 0,
                    phase: c * 0.23 + r * 0.17 + Math.random() * 0.4,
                });
            }
        }
    }

    const sin = Math.sin;
    const cos = Math.cos;
    const sqrt = Math.sqrt;

    function waveAt(p, t) {
        const nx = p.bx / W;
        const ny = p.by / H;
        const w1 = sin(nx * 3.8 + ny * 2.2 - t * 1.9) * 0.5 + 0.5;
        const w2 = sin(nx * 2.1 - ny * 3.1 + t * 1.3 + 1.8) * 0.5 + 0.5;
        const w3 = sin(nx * 5.5 + ny * 1.8 + t * 2.6 + 3.2) * 0.5 + 0.5;
        const combined = w1 * 0.52 + w2 * 0.30 + w3 * 0.18;
        const amp = 14 * combined;
        const ox = sin(nx * 4.2 + ny * 2.1 - t * 1.7 + p.phase) * amp;
        const oy = cos(ny * 3.8 + nx * 1.6 + t * 1.5 + 0.9 + p.phase) * amp;
        return { ox, oy, combined };
    }

    function draw() {
        if (document.hidden) {
            requestAnimationFrame(draw);
            return;
        }

        time += CFG.waveSpeed;

        // Draw background
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const mx = mouse.x * DPR;
        const my = mouse.y * DPR;
        const repelR = CFG.repelRadius * DPR;
        const repelR2 = repelR * repelR;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const { ox, oy, combined } = waveAt(p, time);
            const tx = p.bx * DPR + ox * DPR;
            const ty = p.by * DPR + oy * DPR;

            const dx = mx - p.x;
            const dy = my - p.y;
            const d2 = dx * dx + dy * dy;
            let repX = 0,
                repY = 0;

            if (d2 < repelR2 && d2 > 0.25) {
                const dist = sqrt(d2);
                const strength = (1 - dist / repelR) ** 2;
                repX = -(dx / dist) * strength * CFG.repelForce * DPR;
                repY = -(dy / dist) * strength * CFG.repelForce * DPR;
            }

            p.vx = p.vx * CFG.friction + (tx + repX - p.x) * CFG.attractStr;
            p.vy = p.vy * CFG.friction + (ty + repY - p.y) * CFG.attractStr;
            p.x += p.vx;
            p.y += p.vy;

            const distToMouse = sqrt((mx - p.x) ** 2 + (my - p.y) ** 2) / DPR;
            const cursorBoost = Math.max(0, 1 - distToMouse / 100);
            const radius = Math.max(0.2, (0.5 + combined * 1.5) * DPR);
            const alpha = (0.2 + combined * 0.2 + cursorBoost * 0.2).toFixed(2);

            ctx.fillStyle = cursorBoost > 0.5 ?
                `rgba(232, 112, 30, ${alpha})` :
                `rgba(255, 255, 255, ${alpha})`;

            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, 6.28);
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }

    function showCursor() {
        if (!cursorVisible && cursorEl) {
            cursorEl.style.opacity = '1';
            cursorVisible = true;
        }
    }

    document.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        if (cursorEl) {
            requestAnimationFrame(() => {
                cursorEl.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
            });
        }
        showCursor();
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
        mouse.x = -9999;
        mouse.y = -9999;
        if (cursorEl) cursorEl.style.opacity = '0';
        cursorVisible = false;
    });

    document.addEventListener('touchmove', e => {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('resize', debounce(resize, 100), { passive: true });
    resize();

    const pauseWave = () => {
        if (rafHandle) {
            cancelAnimationFrame(rafHandle);
            rafHandle = null;
        }
    };
    const resumeWave = () => { if (!rafHandle) rafHandle = requestAnimationFrame(draw); };
    onVisibilityChange(pauseWave, resumeWave);

    rafHandle = requestAnimationFrame(draw);
    console.log("[DevStage] Particle Wave System Restored");
};

/* === SECTION 4: GRID DISTORTION PRESSURE FIELD (Explore Grid) === */
const initGridDistortionSystem = (canvas) => {
    const ctx = canvas.getContext('2d');

    let width = window.innerWidth;
    let height = window.innerHeight;
    let rafHandle = null;

    // ── Resize with DPI support ─────────────────────────────────
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        const isMobile = width < 768;
        const dpr = Math.min(isMobile ? 1.5 : 2, window.devicePixelRatio || 1);
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', debounce(resize, 100), { passive: true });
    resize();

    // ── Cursor State ─────────────────────────────────────────────
    let targetX = -9999; // Off-screen initially — no effect on load
    let targetY = -9999;
    let currentX = targetX;
    let currentY = targetY;
    let isOnPage = false;
    let inputFocused = false;

    window.addEventListener('mousemove', (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
        isOnPage = true;
    }, { passive: true });

    // Smoothly exit when cursor leaves the window
    window.addEventListener('mouseleave', () => {
        isOnPage = false;
    }, { passive: true });

    // Input field tension boost
    document.addEventListener('focusin', (e) => {
        if (e.target.matches('input, textarea, select')) inputFocused = true;
    });
    document.addEventListener('focusout', (e) => {
        if (e.target.matches('input, textarea, select')) inputFocused = false;
    });

    // ── Configuration ────────────────────────────────────────────
    const GRID_SPACING = 32; // Must match CSS grid
    const RADIUS = 320; // Influence circle radius
    const MAX_STRENGTH = 28; // Absolute maximum displacement
    const INPUT_BOOST = 1.2; // Tension multiplier
    const LERP_FACTOR = 0.07; // Smoothing
    const SAMPLE_STEP = 8; // Sampling resolution
    const LINE_OPACITY = 0.055; // Base canvas line opacity
    const LINE_OPACITY_IN = 0.075; // Opacity near cursor

    // ── Draw Loop ────────────────────────────────────────────────
    function draw() {
        if (document.hidden) {
            requestAnimationFrame(draw);
            return;
        }

        ctx.clearRect(0, 0, width, height);

        // LERP cursor tracking
        currentX += (targetX - currentX) * LERP_FACTOR;
        currentY += (targetY - currentY) * LERP_FACTOR;

        // If cursor is far off-screen, skip drawing entirely
        if (!isOnPage && Math.abs(currentX - targetX) < 0.5) {
            requestAnimationFrame(draw);
            return;
        }

        // Effective tension multiplier
        const strength = MAX_STRENGTH * (inputFocused ? INPUT_BOOST : 1.0);

        // Bounding box
        const buf = RADIUS + GRID_SPACING;
        const startX = Math.max(0, Math.floor((currentX - buf) / GRID_SPACING) * GRID_SPACING);
        const endX = Math.min(width, Math.ceil((currentX + buf) / GRID_SPACING) * GRID_SPACING);
        const startY = Math.max(0, Math.floor((currentY - buf) / GRID_SPACING) * GRID_SPACING);
        const endY = Math.min(height, Math.ceil((currentY + buf) / GRID_SPACING) * GRID_SPACING);

        // ── Vertical Lines ─────────────────────────────────────
        for (let x = startX; x <= endX; x += GRID_SPACING) {
            ctx.beginPath();
            let firstPoint = true;

            for (let y = startY; y <= endY; y += SAMPLE_STEP) {
                const dx = currentX - x;
                const dy = currentY - y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                let ox = 0,
                    oy = 0;

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

        // ── Horizontal Lines ───────────────────────────────────
        for (let y = startY; y <= endY; y += GRID_SPACING) {
            ctx.beginPath();
            let firstPoint = true;

            for (let x = startX; x <= endX; x += SAMPLE_STEP) {
                const dx = currentX - x;
                const dy = currentY - y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                let ox = 0,
                    oy = 0;

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

    const pauseDistortion = () => {
        if (rafHandle) {
            cancelAnimationFrame(rafHandle);
            rafHandle = null;
        }
    };
    const resumeDistortion = () => { if (!rafHandle) rafHandle = requestAnimationFrame(draw); };
    onVisibilityChange(pauseDistortion, resumeDistortion);

    rafHandle = requestAnimationFrame(draw);
    console.log("[DevStage] Grid Distortion System Restored");
};

/* === SECTION 5: 3D PERSPECTIVE TERRAIN MESH (Landing Background) === */
const initTerrainSystem = (cv) => {
    const cx = cv.getContext('2d');
    let W, H, t = 0;
    const M = { x: -9999, y: -9999, on: false };

    // Grid density
    const COLS = 64;
    const ROWS = 36;

    // Perspective camera
    const FOV = 300;
    const NEAR_Z = 90;
    const FAR_Z = 1000;

    let DPR = Math.max(1, window.devicePixelRatio || 1);
    let rafHandle = null;

    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        const isMobile = W < 768;
        DPR = Math.min(isMobile ? 1.5 : 2, Math.max(1, window.devicePixelRatio || 1));
        cv.width = Math.floor(W * DPR);
        cv.height = Math.floor(H * DPR);
        cv.style.width = W + 'px';
        cv.style.height = H + 'px';
        cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function pk(x) {
        return Math.sin(x) +
            0.25 * Math.sin(2 * x) +
            0.05 * Math.sin(3 * x);
    }

    function waveH(nx, nz, time) {
        const w1 = pk(nx * 9.2 + nz * 20.0 - time * 0.72) * 0.52;
        const w2 = pk(-nx * 5.8 + nz * 13.5 + time * 0.55) * 0.26;
        const w3 = pk(nx * 16.0 - nz * 8.0 - time * 0.88) * 0.14;
        const w4 = Math.sin(nx * 28.0 + nz * 5.5 + time * 1.05) * 0.05;
        const w5 = Math.sin(-nx * 7.0 + nz * 32.0 - time * 1.30) * 0.04;
        return (w1 + w2 + w3 + w4 + w5) / 1.01;
    }

    function swayX(nx, nz, time) {
        const s1 = Math.sin(nx * 7.0 + nz * 9.0 - time * 0.65) * 0.016;
        const s2 = Math.sin(nx * 18.0 - nz * 6.0 + time * 0.95) * 0.010;
        const s3 = Math.sin(nx * 3.6 + nz * 24.0 + time * 0.40) * 0.006;
        return s1 + s2 + s3;
    }

    const pts = [];

    function buildPts() {
        const AMP = H * 0.15;
        const CAMH = H * 0.260;
        const HY = H * 0.268;

        for (let ri = 0; ri < ROWS; ri++) {
            if (!pts[ri]) pts[ri] = [];
            const rf = ri / (ROWS - 1);
            const z = NEAR_Z + (FAR_Z - NEAR_Z) * rf;
            const scl = FOV / z;
            const nz = 1 - rf;

            for (let ci = 0; ci < COLS; ci++) {
                const nx = ci / (COLS - 1);
                const wval = waveH(nx, nz, t);
                const xDrift = swayX(nx, nz, t) * W * (0.85 - rf * 0.45);

                const sx = nx * W + xDrift;
                let sy = HY + (CAMH - wval * AMP) * scl;

                if (M.on) {
                    const dx = sx - M.x;
                    const dy = sy - M.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < 140 * 140) {
                        const d = Math.sqrt(d2);
                        const f = 1 - d / 140;
                        sy -= f * f * f * 68;
                    }
                }

                const hn = (wval + 1.15) / 2.3;
                const dm = 0.42 + (1 - rf) * 0.58;
                const pkBoost = hn > 0.70 ? (hn - 0.70) * 0.55 : 0;
                const alpha = Math.min(0.90, (0.03 + hn * 0.80 + pkBoost) * dm);

                pts[ri][ci] = { sx, sy, scl, alpha, rf };
            }
        }
    }

    function seg(p1, p2, alphaMult, widthMult) {
        const a = (p1.alpha + p2.alpha) * 0.5 * alphaMult;
        if (a < 0.02) return;

        const lw = Math.max(0.12, ((p1.scl + p2.scl) * 0.5) * widthMult);
        cx.beginPath();
        cx.moveTo(p1.sx, p1.sy);
        cx.lineTo(p2.sx, p2.sy);
        cx.strokeStyle = `rgba(205,205,205,${a.toFixed(2)})`;
        cx.lineWidth = lw;
        cx.stroke();
    }

    function dot(p) {
        if (p.alpha < 0.05) return;

        const r = Math.max(0.45, Math.min(2.35, 0.55 + p.scl * 0.20));
        cx.beginPath();
        cx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        cx.fillStyle = `rgba(235,235,235,${Math.min(0.92, p.alpha + 0.08).toFixed(2)})`;
        cx.fill();
    }

    function draw() {
        if (document.hidden) {
            requestAnimationFrame(draw);
            return;
        }

        t += 0.010;

        cx.clearRect(0, 0, W, H);

        buildPts();

        for (let ri = ROWS - 1; ri >= 0; ri--) {
            for (let ci = 0; ci < COLS; ci++) {
                const p = pts[ri][ci];
                if (!p) continue;

                if (ci < COLS - 1) {
                    const p2 = pts[ri][ci + 1];
                    if (p2) seg(p, p2, 1.00, 0.80);
                }

                if (ri > 0) {
                    const p2 = pts[ri - 1][ci];
                    if (p2) seg(p, p2, 0.50, 0.50);
                }
            }
        }

        for (let ri = ROWS - 1; ri >= 0; ri--) {
            for (let ci = 0; ci < COLS; ci++) {
                const p = pts[ri][ci];
                if (p) dot(p);
            }
        }

        requestAnimationFrame(draw);
    }

    cv.addEventListener('mousemove', e => {
        M.x = e.clientX;
        M.y = e.clientY;
        M.on = true;
    });
    cv.addEventListener('mouseleave', () => { M.on = false; });
    cv.addEventListener('touchmove', e => {
        e.preventDefault();
        M.x = e.touches[0].clientX;
        M.y = e.touches[0].clientY;
        M.on = true;
    }, { passive: false });
    cv.addEventListener('touchend', () => { M.on = false; }, { passive: true });
    window.addEventListener('resize', debounce(resize, 100), { passive: true });

    const pauseTerrain = () => {
        if (rafHandle) {
            cancelAnimationFrame(rafHandle);
            rafHandle = null;
        }
    };
    const resumeTerrain = () => { if (!rafHandle) rafHandle = requestAnimationFrame(draw); };
    onVisibilityChange(pauseTerrain, resumeTerrain);

    resize();
    rafHandle = requestAnimationFrame(draw);
    console.log("[DevStage] Terrain System Restored");
};

/* === SECTION 6: INTERACTIVE MESH CANVAS (Upload Background) === */
const initUploadMeshSystem = (canvas) => {
    class MeshBackground {
        constructor(canvasElement) {
            this.canvas = canvasElement;
            this.ctx = this.canvas.getContext('2d');
            this.width = 0;
            this.height = 0;

            this.mouse = { x: -1000, y: -1000, onCanvas: false };
            this.ripples = [];
            this.lastRippleTime = 0;
            this.rafHandle = null;

            this.layers = [{
                    cols: 12,
                    rows: 8,
                    speed: 0.50,
                    amp: 28,
                    opacity: 0.07,
                    lineWidth: 0.7,
                    phase: 0,
                    vertices: []
                },
                {
                    cols: 20,
                    rows: 12,
                    speed: 0.72,
                    amp: 20,
                    opacity: 0.10,
                    lineWidth: 0.6,
                    phase: 2.1,
                    vertices: []
                },
                {
                    cols: 28,
                    rows: 17,
                    speed: 0.98,
                    amp: 13,
                    opacity: 0.13,
                    lineWidth: 0.55,
                    phase: 4.3,
                    vertices: []
                }
            ];

            this.init();
        }

        init() {
            this.resize();
            window.addEventListener('resize', debounce(() => this.resize(), 100), { passive: true });

            window.addEventListener('mousemove', (e) => {
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
                this.mouse.onCanvas = true;
            }, { passive: true });

            window.addEventListener('mouseout', () => {
                this.mouse.onCanvas = false;
            }, { passive: true });

            window.addEventListener('mousedown', (e) => {
                this.spawnRipple(e.clientX, e.clientY);
            }, { passive: true });

            const pause = () => {
                if (this.rafHandle) {
                    cancelAnimationFrame(this.rafHandle);
                    this.rafHandle = null;
                }
            };
            const resume = () => { if (!this.rafHandle) this.rafHandle = requestAnimationFrame((t) => this.animate(t)); };
            onVisibilityChange(pause, resume);

            this.rafHandle = requestAnimationFrame((t) => this.animate(t));
        }

        resize() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            const isMobile = this.width < 768;
            const dpr = Math.min(isMobile ? 1.5 : 2, Math.max(1, window.devicePixelRatio || 1));
            this.canvas.width = Math.floor(this.width * dpr);
            this.canvas.height = Math.floor(this.height * dpr);
            this.canvas.style.width = `${this.width}px`;
            this.canvas.style.height = `${this.height}px`;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        spawnRipple(x, y) {
            this.ripples.push({
                x: x,
                y: y,
                startTime: performance.now(),
                duration: 2600
            });
        }

        animate(timestamp) {
            if (document.hidden) {
                this.rafHandle = requestAnimationFrame((t) => this.animate(t));
                return;
            }

            this.ctx.clearRect(0, 0, this.width, this.height);

            // Auto ripples every 3200ms
            if (timestamp - this.lastRippleTime > 3200) {
                this.spawnRipple(Math.random() * this.width, Math.random() * this.height);
                this.lastRippleTime = timestamp;
            }

            // Clean up finished ripples
            this.ripples = this.ripples.filter(r => timestamp - r.startTime < r.duration);

            this.layers.forEach(layer => {
                this.computeLayer(layer, timestamp);
                this.drawLayerLines(layer);
                this.drawLayerDots(layer);
            });

            this.rafHandle = requestAnimationFrame((t) => this.animate(t));
        }

        computeLayer(layer, timestamp) {
            const { cols, rows, speed, amp, phase } = layer;
            const tw = timestamp * speed * 0.001;
            const colSpacing = this.width / (cols - 1);
            const rowSpacing = this.height / (rows - 1);

            layer.vertices = [];

            for (let r = 0; r < rows; r++) {
                const rowArr = [];
                for (let c = 0; c < cols; c++) {
                    const ox = c / (cols - 1);
                    const oy = r / (rows - 1);

                    // Vertex displacement formula
                    let dx = Math.sin(ox * Math.PI * 3 + tw + phase) * Math.cos(oy * Math.PI * 2 + tw * 0.7) * amp +
                        Math.sin(ox * Math.PI * 1.5 + tw * 0.6 + phase) * amp * 0.4 +
                        Math.cos((ox + oy) * Math.PI * 2 + tw * 1.1 + phase) * amp * 0.25;

                    let dy = Math.sin(oy * Math.PI * 4 + tw * 1.2 + phase) * Math.cos(ox * Math.PI * 2.5 + tw * 0.5) * amp * 0.9 +
                        Math.cos(oy * Math.PI * 2 + tw * 0.8 + phase) * amp * 0.35 +
                        Math.sin((ox - oy) * Math.PI * 1.8 + tw * 0.9 + phase) * amp * 0.22;

                    let x = c * colSpacing + dx;
                    let y = r * rowSpacing + dy;

                    // Cursor push interaction
                    const distToMouse = Math.hypot(x - this.mouse.x, y - this.mouse.y);
                    if (this.mouse.onCanvas && distToMouse < 85) {
                        const pushForce = Math.pow((85 - distToMouse) / 85, 1.8) * 11;
                        const angle = Math.atan2(y - this.mouse.y, x - this.mouse.x);
                        x += Math.cos(angle) * pushForce;
                        y += Math.sin(angle) * pushForce;
                    }

                    // Ripple displacement
                    this.ripples.forEach(ripple => {
                        const distToRipple = Math.hypot(x - ripple.x, y - ripple.y);
                        if (distToRipple < 0.1) return;

                        const lifeProgress = (timestamp - ripple.startTime) / ripple.duration;
                        const life = 1 - lifeProgress;

                        const wave = Math.sin(distToRipple * 0.045 - life * 18) * Math.exp(-distToRipple * 0.011) * life * 12;

                        x += wave * (x - ripple.x) / distToRipple * 0.4;
                        y += wave;
                    });

                    rowArr.push({ x, y, distToMouse });
                }
                layer.vertices.push(rowArr);
            }
        }

        drawLayerLines(layer) {
            const { vertices, opacity, lineWidth, cols, rows } = layer;

            this.ctx.beginPath();
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            this.ctx.lineWidth = lineWidth;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const v = vertices[r][c];

                    if (c < cols - 1) {
                        const nextV = vertices[r][c + 1];
                        this.ctx.moveTo(v.x, v.y);
                        this.ctx.lineTo(nextV.x, nextV.y);
                    }

                    if (r < rows - 1) {
                        const nextV = vertices[r + 1][c];
                        this.ctx.moveTo(v.x, v.y);
                        this.ctx.lineTo(nextV.x, nextV.y);
                    }
                }
            }
            this.ctx.stroke();
        }

        drawLayerDots(layer) {
            const { vertices, opacity, cols, rows } = layer;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const v = vertices[r][c];

                    if (v.distToMouse < 100) {
                        const strength = Math.pow(1 - v.distToMouse / 100, 1.2);

                        this.ctx.beginPath();
                        this.ctx.fillStyle = `rgba(210, 100, 20, ${0.13 * strength})`;
                        this.ctx.arc(v.x, v.y, 5 + strength * 3, 0, Math.PI * 2);
                        this.ctx.fill();

                        this.ctx.beginPath();
                        this.ctx.fillStyle = `rgba(224, 120, 32, ${0.22 * strength})`;
                        this.ctx.arc(v.x, v.y, 3 + strength * 1.5, 0, Math.PI * 2);
                        this.ctx.fill();

                        this.ctx.beginPath();
                        this.ctx.fillStyle = `rgba(235, 145, 55, ${0.82 + strength * 0.18})`;
                        this.ctx.arc(v.x, v.y, 2 + strength * 1, 0, Math.PI * 2);
                        this.ctx.fill();
                    } else {
                        this.ctx.beginPath();
                        this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 1.8})`;
                        this.ctx.arc(v.x, v.y, 1.2, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
            }
        }
    }

    new MeshBackground(canvas);
    console.log("[DevStage] Upload Mesh Background Restored");
};

/* === UNIFIED SMART INITIALIZER === */
const initAllVisualSystems = () => {
    console.log("[DevStage] Initializing Visual Systems...");

    // Custom cursor: scripts/cursor.js (loaded globally on every page)

    // 1. Initialize 3D Perspective Terrain (Landing Background - only on landing page)
    const cv = document.getElementById('c');
    if (cv && document.body.classList.contains('home-page')) {
        initTerrainSystem(cv);
    }

    // 2. Initialize Interactive Particle Wave (Explore Background)
    const waveCanvas = document.getElementById('particle-wave-canvas');
    if (waveCanvas) {
        initParticleWaveSystem(waveCanvas);
    }

    // 3. Initialize Grid Distortion Pressure Field (Explore Grid)
    const distortionCanvas = document.getElementById('grid-distortion-canvas');
    if (distortionCanvas) {
        initGridDistortionSystem(distortionCanvas);
    }

    // 4. Initialize Interactive Mesh Canvas (Upload Background)
    const uploadCanvas = document.getElementById('upload-mesh-canvas');
    if (uploadCanvas) {
        initUploadMeshSystem(uploadCanvas);
    }
};

// Safe initialization triggering on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllVisualSystems);
} else {
    initAllVisualSystems();
}