/**
 * DevStage Upload Page Animated Mesh Background - SPECIFIED VERSION
 */

class MeshBackground {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;

        this.mouse = { x: -1000, y: -1000, onCanvas: false };
        this.ripples = [];
        this.lastRippleTime = 0;

        this.layers = [
            {
                cols: 12, rows: 8, speed: 0.50, amp: 28, opacity: 0.07, lineWidth: 0.7, phase: 0,
                vertices: []
            },
            {
                cols: 20, rows: 12, speed: 0.72, amp: 20, opacity: 0.10, lineWidth: 0.6, phase: 2.1,
                vertices: []
            },
            {
                cols: 28, rows: 17, speed: 0.98, amp: 13, opacity: 0.13, lineWidth: 0.55, phase: 4.3,
                vertices: []
            }
        ];

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.mouse.onCanvas = true;
        });

        window.addEventListener('mouseout', () => {
            this.mouse.onCanvas = false;
        });

        window.addEventListener('mousedown', (e) => {
            this.spawnRipple(e.clientX, e.clientY);
        });

        requestAnimationFrame((t) => this.animate(t));
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
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

        requestAnimationFrame((t) => this.animate(t));
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
                let dx = Math.sin(ox * Math.PI * 3 + tw + phase) * Math.cos(oy * Math.PI * 2 + tw * 0.7) * amp
                    + Math.sin(ox * Math.PI * 1.5 + tw * 0.6 + phase) * amp * 0.4
                    + Math.cos((ox + oy) * Math.PI * 2 + tw * 1.1 + phase) * amp * 0.25;

                let dy = Math.sin(oy * Math.PI * 4 + tw * 1.2 + phase) * Math.cos(ox * Math.PI * 2.5 + tw * 0.5) * amp * 0.9
                    + Math.cos(oy * Math.PI * 2 + tw * 0.8 + phase) * amp * 0.35
                    + Math.sin((ox - oy) * Math.PI * 1.8 + tw * 0.9 + phase) * amp * 0.22;

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
                    if (distToRipple < 0.1) return; // avoid division by zero

                    const lifeProgress = (timestamp - ripple.startTime) / ripple.duration;
                    const life = 1 - lifeProgress; // goes from 1 to 0
                    
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
                
                // Horizontal lines
                if (c < cols - 1) {
                    const nextV = vertices[r][c + 1];
                    this.ctx.moveTo(v.x, v.y);
                    this.ctx.lineTo(nextV.x, nextV.y);
                }
                
                // Vertical lines
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
                    
                    // Outer soft halo
                    this.ctx.beginPath();
                    this.ctx.fillStyle = `rgba(210, 100, 20, ${0.13 * strength})`;
                    this.ctx.arc(v.x, v.y, 5 + strength * 3, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Mid ring
                    this.ctx.beginPath();
                    this.ctx.fillStyle = `rgba(224, 120, 32, ${0.22 * strength})`;
                    this.ctx.arc(v.x, v.y, 3 + strength * 1.5, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Crisp bright core dot
                    this.ctx.beginPath();
                    this.ctx.fillStyle = `rgba(235, 145, 55, ${0.82 + strength * 0.18})`;
                    this.ctx.arc(v.x, v.y, 2 + strength * 1, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    // Plain white dot
                    this.ctx.beginPath();
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 1.8})`;
                    this.ctx.arc(v.x, v.y, 1.2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MeshBackground('upload-mesh-canvas');
});
