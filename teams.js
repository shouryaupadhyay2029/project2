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

    // ─── 2. BACKGROUND WAVE CANVAS ───────────────────────────
    const canvas = document.getElementById('wave-canvas');
    const ctx = canvas.getContext('2d');

    let width, height;
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Wave {
        constructor(color, amplitude, wavelength, speed) {
            this.color = color;
            this.amplitude = amplitude;
            this.wavelength = wavelength;
            this.speed = speed;
            this.offset = Math.random() * 100;
        }

        draw() {
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.moveTo(0, height / 2);

            for (let x = 0; x < width; x++) {
                const y = height / 2 + Math.sin(x * this.wavelength + this.offset) * this.amplitude;
                ctx.lineTo(x, y);
            }

            ctx.stroke();
            this.offset += this.speed;
        }
    }

    const waves = [
        new Wave('rgba(255, 140, 0, 0.05)', 50, 0.002, 0.005),
        new Wave('rgba(255, 255, 255, 0.02)', 30, 0.003, 0.008),
        new Wave('rgba(255, 140, 0, 0.03)', 70, 0.001, 0.003)
    ];

    function animate() {
        ctx.clearRect(0, 0, width, height);
        waves.forEach(wave => wave.draw());
        requestAnimationFrame(animate);
    }
    animate();

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
