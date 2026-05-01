/**
 * Premium 3D Hollow Cursor Engine - Global Restoration
 * Restores original complex physics and magnetic interactions
 */
const init3DCursor = () => {
    // 1. Safety Check: Prevent duplicate initialization
    if (document.getElementById('hollow-3d-cursor')) return;

    // 2. Dynamically Create 3D Cursor Structure
    const cursor = document.createElement('div');
    cursor.id = 'hollow-3d-cursor';
    
    cursor.innerHTML = `
        <div class="halo-glow"></div>
        <div class="border-ring"></div>
        <div class="highlight-layer"></div>
        <div class="click-cross">
            <div class="cross-h"></div>
            <div class="cross-v"></div>
        </div>
    `;
    
    document.body.appendChild(cursor);

    const borderRing = cursor.querySelector('.border-ring');
    
    // 3. State & Physics Engine
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX, currentY = mouseY;
    let currentW = 24, currentH = 24;
    let currentR = 50;
    
    let targetX = mouseX, targetY = mouseY;
    let targetW = 24, targetH = 24;
    let targetR = 50;

    let isHovering = false;
    let hoverTarget = null;
    const LERP = 0.12;

    // 4. Input Tracking
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (isHovering && hoverTarget) {
            const rect = hoverTarget.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Magnetic attraction effect
            const pullX = (e.clientX - centerX) * 0.2;
            const pullY = (e.clientY - centerY) * 0.2;
            hoverTarget.style.transform = `translate3d(${pullX}px, ${pullY - 2}px, 0) scale(1.02)`;

            // Sticky cursor positioning
            const padding = 8;
            targetX = rect.left - padding + (pullX * 0.5);
            targetY = rect.top - padding + (pullY * 0.5);
            targetW = rect.width + (padding * 2);
            targetH = rect.height + (padding * 2);
            targetR = 12; // Square-ish rounded corners on hover
        } else {
            targetX = mouseX - (targetW / 2);
            targetY = mouseY - (targetH / 2);
            targetW = 24;
            targetH = 24;
            targetR = 50;
        }
    });

    // 5. Interaction Listeners
    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('a, button, input, .clickable, .dropdown-item');
        if (target) {
            isHovering = true;
            hoverTarget = target;
            cursor.classList.add('is-hovering');
            target.classList.add('energy-field-active');
        }
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('a, button, input, .clickable, .dropdown-item');
        if (target) {
            isHovering = false;
            if (hoverTarget) hoverTarget.style.transform = '';
            hoverTarget = null;
            cursor.classList.remove('is-hovering');
            target.classList.remove('energy-field-active');
        }
    });

    document.addEventListener('mousedown', () => cursor.classList.add('is-clicking'));
    document.addEventListener('mouseup', () => cursor.classList.remove('is-clicking'));

    // 6. Animation Loop (60fps)
    const animate = () => {
        // Smoothly interpolate position and size
        currentX += (targetX - currentX) * LERP;
        currentY += (targetY - currentY) * LERP;
        currentW += (targetW - currentW) * LERP;
        currentH += (targetH - currentH) * LERP;
        currentR += (targetR - currentR) * LERP;

        cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        borderRing.style.width = `${currentW}px`;
        borderRing.style.height = `${currentH}px`;
        borderRing.style.borderRadius = `${currentR}%`;

        requestAnimationFrame(animate);
    };

    animate();
    console.log("3D Hollow Cursor Restored Everywhere");
};

// Auto-Init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init3DCursor);
} else {
    init3DCursor();
}
