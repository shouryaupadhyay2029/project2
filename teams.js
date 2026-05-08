document.addEventListener('DOMContentLoaded', () => {
    // ─── 1. NAVBAR & DROPDOWN ────────────────────────────────
    const navToggle = document.getElementById('nav-toggle');
    const navDropdown = document.getElementById('nav-dropdown');

    if (navToggle && navDropdown) {
        navToggle.addEventListener('change', () => {
            if (navToggle.checked) {
                navDropdown.classList.add('active');
            } else {
                navDropdown.classList.remove('active');
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!navDropdown.contains(e.target) && !navToggle.parentElement.contains(e.target)) {
                navToggle.checked = false;
                navDropdown.classList.remove('active');
            }
        });
    }

    // ─── 2. VORONOI & CONSTELLATION BACKGROUND ───────────────────────────
    const canvas = document.getElementById('teams-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');

        let width, height;
        let seeds = [];
        let nodes = [];
        let mouseX = -999, mouseY = -999;
        let isMouseOnCanvas = false;

        function initSystem() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;

            seeds = [];
            for (let i = 0; i < 9; i++) {
                seeds.push({
                    x: 80 + Math.random() * (Math.max(10, width - 160)),
                    y: 80 + Math.random() * (Math.max(10, height - 160)),
                    vx: (Math.random() - 0.5) * 0.25,
                    vy: (Math.random() - 0.5) * 0.25,
                    index: i
                });
            }

            nodes = [];
            for (let i = 0; i < 42; i++) {
                nodes.push({
                    x: 18 + Math.random() * (Math.max(10, width - 36)),
                    y: 18 + Math.random() * (Math.max(10, height - 36)),
                    vx: (Math.random() - 0.5) * 0.85,
                    vy: (Math.random() - 0.5) * 0.85,
                    ci: -1,
                    assembled: Math.random(),
                    twinkle: Math.random() * Math.PI * 2,
                    twinkleSpd: 0.020 + Math.random() * 0.018
                });
            }
        }

        window.addEventListener('resize', initSystem);
        
        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            isMouseOnCanvas = true; 
        });
        window.addEventListener('mouseleave', () => {
            isMouseOnCanvas = false;
            mouseX = -999;
            mouseY = -999;
        });

        function draw() {
            ctx.clearRect(0, 0, width, height);

            // --- UPDATE SEEDS ---
            for (let i = 0; i < seeds.length; i++) {
                let s = seeds[i];
                s.x += s.vx;
                s.y += s.vy;
                s.vx *= 0.995;
                s.vy *= 0.995;

                if (s.x < 70) { s.x = 70; s.vx *= -1; }
                else if (s.x > width - 70) { s.x = width - 70; s.vx *= -1; }
                if (s.y < 70) { s.y = 70; s.vy *= -1; }
                else if (s.y > height - 70) { s.y = height - 70; s.vy *= -1; }

                for (let j = i + 1; j < seeds.length; j++) {
                    let s2 = seeds[j];
                    let dx = s.x - s2.x;
                    let dy = s.y - s2.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120 && dist > 0) {
                        let force = ((120 - dist) / 120) * 0.012;
                        let fx = (dx / dist) * force;
                        let fy = (dy / dist) * force;
                        s.vx += fx; s.vy += fy;
                        s2.vx -= fx; s2.vy -= fy;
                    }
                }
            }

            // --- VORONOI MAP ---
            const ST = 7;
            const cols = Math.ceil(width / ST) + 1;
            const rows = Math.ceil(height / ST) + 1;
            
            let activeSeeds = [...seeds];
            const CI = seeds.length;
            if (isMouseOnCanvas) {
                activeSeeds.push({ x: mouseX, y: mouseY, index: CI });
            }

            let vMap = new Array(rows);
            for (let r = 0; r < rows; r++) {
                vMap[r] = new Int32Array(cols);
                let cy = r * ST;
                for (let c = 0; c < cols; c++) {
                    let cx = c * ST;
                    let minDist = Infinity;
                    let nearestIdx = -1;
                    for (let i = 0; i < activeSeeds.length; i++) {
                        let s = activeSeeds[i];
                        let dx = cx - s.x;
                        let dy = cy - s.y;
                        let dsq = dx * dx + dy * dy;
                        if (dsq < minDist) {
                            minDist = dsq;
                            nearestIdx = s.index;
                        }
                    }
                    vMap[r][c] = nearestIdx;
                }
            }

            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            for (let r = 0; r < rows - 1; r++) {
                for (let c = 0; c < cols - 1; c++) {
                    let current = vMap[r][c];
                    if (current !== vMap[r][c + 1] || current !== vMap[r + 1][c]) {
                        if (current === CI || vMap[r][c+1] === CI || vMap[r+1][c] === CI) {
                            let bx = c * ST;
                            let by = r * ST;
                            let dx = bx - mouseX;
                            let dy = by - mouseY;
                            let dist = Math.sqrt(dx * dx + dy * dy);
                            let strength = Math.max(0, 1 - dist / 200);
                            ctx.fillStyle = `rgba(224, 120, 32, ${0.20 + strength * 0.50})`;
                            ctx.fillRect(bx - 1.25, by - 1.25, 2.5, 2.5);
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                        } else {
                            ctx.fillRect((c * ST) - 0.9, (r * ST) - 0.9, 1.8, 1.8);
                        }
                    }
                }
            }

            // --- UPDATE & DRAW CONSTELLATION ---
            for (let i = 0; i < nodes.length; i++) {
                let n = nodes[i];
                let minDist = Infinity;
                let nearestSeed = null;
                for (let j = 0; j < seeds.length; j++) {
                    let s = seeds[j];
                    let dx = s.x - n.x;
                    let dy = s.y - n.y;
                    let dsq = dx * dx + dy * dy;
                    if (dsq < minDist) {
                        minDist = dsq;
                        nearestSeed = s;
                    }
                }
                n.ci = nearestSeed.index;

                let d = Math.sqrt(minDist);
                let dx = nearestSeed.x - n.x;
                let dy = nearestSeed.y - n.y;

                let force = d > 90 ? 0.028 : 0.008;
                if (d > 0) {
                    n.vx += (dx / d) * force;
                    n.vy += (dy / d) * force;
                }

                if (isMouseOnCanvas) {
                    let cursorDX = mouseX - n.x;
                    let cursorDY = mouseY - n.y;
                    let cursorDist = Math.sqrt(cursorDX * cursorDX + cursorDY * cursorDY);
                    if (cursorDist < 170 && cursorDist > 0) {
                        n.vx += (cursorDX / cursorDist) * 0.045;
                        n.vy += (cursorDY / cursorDist) * 0.045;
                    }
                }

                n.x += n.vx;
                n.y += n.vy;
                n.vx *= 0.91;
                n.vy *= 0.91;

                if (n.x < 18) { n.x = 18; n.vx *= -1; }
                else if (n.x > width - 18) { n.x = width - 18; n.vx *= -1; }
                if (n.y < 18) { n.y = 18; n.vy *= -1; }
                else if (n.y > height - 18) { n.y = height - 18; n.vy *= -1; }

                if (d < 100) n.assembled = Math.min(1, n.assembled + 0.022);
                else n.assembled = Math.max(0, n.assembled - 0.018);

                n.twinkle += n.twinkleSpd;
            }

            ctx.lineWidth = 0.5;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    let n1 = nodes[i];
                    let n2 = nodes[j];
                    if (n1.ci !== n2.ci) continue;
                    let minAssembled = Math.min(n1.assembled, n2.assembled);
                    if (minAssembled < 0.22) continue;

                    let dx = n1.x - n2.x;
                    let dy = n1.y - n2.y;
                    let d = Math.sqrt(dx * dx + dy * dy);
                    if (d > 118) continue;

                    let str = minAssembled * (1 - d / 118);
                    let mx = (n1.x + n2.x) / 2;
                    let my = (n1.y + n2.y) / 2;
                    
                    let glowL = 0;
                    if (isMouseOnCanvas) {
                        let cdx = mouseX - mx;
                        let cdy = mouseY - my;
                        let cdist = Math.sqrt(cdx * cdx + cdy * cdy);
                        if (cdist < 140) glowL = ((140 - cdist) / 140) * 0.15;
                    }

                    ctx.strokeStyle = `rgba(255, 255, 255, ${str * 0.35 + glowL})`;
                    ctx.beginPath();
                    ctx.moveTo(n1.x, n1.y);
                    ctx.lineTo(n2.x, n2.y);
                    ctx.stroke();
                }
            }

            for (let i = 0; i < nodes.length; i++) {
                let n = nodes[i];
                let dm = 999;
                if (isMouseOnCanvas) {
                    let cdx = mouseX - n.x;
                    let cdy = mouseY - n.y;
                    dm = Math.sqrt(cdx * cdx + cdy * cdy);
                }
                let near = dm < 155;
                let twink = 0.75 + Math.sin(n.twinkle) * 0.25;
                let brightness = near ? 1 : (0.45 + n.assembled * 0.55) * twink;

                if (n.assembled > 0.45 || near) {
                    let radius = near ? 10 : 7;
                    let grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius);
                    let centerColor = near ? `rgba(224, 120, 32, ${0.30 + n.assembled * 0.15})` : `rgba(255, 255, 255, ${0.10 + n.assembled * 0.15})`;
                    grad.addColorStop(0, centerColor);
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }

                let coreRadius = 1.3 + n.assembled * 0.7;
                ctx.fillStyle = near ? `rgba(224, 120, 32, 0.92)` : `rgba(255, 255, 255, ${brightness})`;
                ctx.beginPath();
                ctx.arc(n.x, n.y, coreRadius, 0, Math.PI * 2);
                ctx.fill();
            }



            requestAnimationFrame(draw);
        }

        initSystem();
        draw();
    }

    // ─── 3. LOGO BLOOM ANIMATION ────────────────────────────
    const logoChars = document.querySelectorAll('.char');
    setTimeout(() => {
        logoChars.forEach(char => {
            char.classList.add('nav-item-visible');
        });
    }, 100);

    // Ensure page tag is also sharp
    const pageTag = document.querySelector('.logo-page-tag');
    if (pageTag) {
        pageTag.style.opacity = '1';
    }

    // ─── 4. AUTH STATE (UI ONLY FOR NOW) ─────────────────────
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            // Optional: Redirect if needed
            // window.location.href = 'index.html';
        }
    });
});
