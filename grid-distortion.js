/**
 * Grid Magnetic Distortion Overlay
 * Creates a subtle interactive field effect without altering the CSS grid beneath.
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('grid-distortion-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    // Resize handler
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        
        // Handle high-DPI displays for crisp lines
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
    }
    
    window.addEventListener('resize', resize);
    resize();
    
    // Mouse tracking with LERP smoothing
    let targetX = width / 2;
    let targetY = height / 2;
    let currentX = targetX;
    let currentY = targetY;
    
    window.addEventListener('mousemove', (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
    });
    
    // Constants for the magnetic field
    const spacing = 32; // Primary grid spacing to mimic
    const radius = 250; // Size of the distortion field (Increased for wider reach)
    const maxStrength = 24; // Max offset distance in px (Increased for more pull)
    const sampleResolution = 10; // Distance between points on a line
    
    function draw() {
        // Clear canvas entirely each frame
        ctx.clearRect(0, 0, width, height);
        
        // LERP calculation for smooth cursor tracking
        currentX += (targetX - currentX) * 0.08;
        currentY += (targetY - currentY) * 0.08;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        
        // Only render the grid lines if the cursor is actually moving/within bounds 
        // to avoid drawing an entire static grid when nothing is happening.
        // But to keep the "field" alive, we draw the lines around the cursor area.
        
        // Calculate the bounds to draw (only around the cursor + some buffer)
        const startX = Math.max(0, Math.floor((currentX - radius - 50) / spacing) * spacing);
        const endX = Math.min(width, Math.ceil((currentX + radius + 50) / spacing) * spacing);
        const startY = Math.max(0, Math.floor((currentY - radius - 50) / spacing) * spacing);
        const endY = Math.min(height, Math.ceil((currentY + radius + 50) / spacing) * spacing);
        
        // Draw Vertical Lines within bounds
        for (let x = startX; x <= endX; x += spacing) {
            ctx.beginPath();
            let firstPoint = true;
            
            for (let y = startY; y <= endY; y += sampleResolution) {
                let dx = currentX - x;
                let dy = currentY - y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                
                let offsetX = 0;
                let offsetY = 0;
                
                if (distance < radius) {
                    // Quadratic falloff for smooth curve
                    let influence = Math.pow(1 - distance / radius, 2);
                    offsetX = (dx / distance) * influence * maxStrength;
                    offsetY = (dy / distance) * influence * maxStrength;
                }
                
                if (firstPoint) {
                    ctx.moveTo(x + offsetX, y + offsetY);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x + offsetX, y + offsetY);
                }
            }
            ctx.stroke();
        }
        
        // Draw Horizontal Lines within bounds
        for (let y = startY; y <= endY; y += spacing) {
            ctx.beginPath();
            let firstPoint = true;
            
            for (let x = startX; x <= endX; x += sampleResolution) {
                let dx = currentX - x;
                let dy = currentY - y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                
                let offsetX = 0;
                let offsetY = 0;
                
                if (distance < radius) {
                    let influence = Math.pow(1 - distance / radius, 2);
                    offsetX = (dx / distance) * influence * maxStrength;
                    offsetY = (dy / distance) * influence * maxStrength;
                }
                
                if (firstPoint) {
                    ctx.moveTo(x + offsetX, y + offsetY);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x + offsetX, y + offsetY);
                }
            }
            ctx.stroke();
        }
        
        requestAnimationFrame(draw);
    }
    
    // Start loop
    draw();
});
