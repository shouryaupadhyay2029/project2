/**
 * Optimized Particle Wave Animation - High Performance
 * Deep charcoal palette for Explore Page
 */

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

const canvas = document.getElementById('particle-wave-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d', { alpha: false }); 
  const cursorEl = document.getElementById('cursor-ring');

  let W, H, DPR;
  let particles = [];
  let time = 0;
  let mouse = { x: -9999, y: -9999 };
  let cursorVisible = false;
  let gradient;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    
    // Deep Charcoal Gradient to match requested image
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
          bx, by, x: bx, y: by, vx: 0, vy: 0,
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
    time += CFG.waveSpeed;
    
    // Draw background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const mx = mouse.x * DPR;
    const my = mouse.y * DPR;
    const repelR = CFG.repelRadius * DPR;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const { ox, oy, combined } = waveAt(p, time);
      const tx = p.bx * DPR + ox * DPR;
      const ty = p.by * DPR + oy * DPR;

      const dx = mx - p.x;
      const dy = my - p.y;
      const d2 = dx * dx + dy * dy;
      let repX = 0, repY = 0;

      if (d2 < repelR * repelR && d2 > 0.25) {
        const dist = sqrt(d2);
        const strength = (1 - dist / repelR) ** 2;
        repX = -(dx / dist) * strength * CFG.repelForce * DPR;
        repY = -(dy / dist) * strength * CFG.repelForce * DPR;
      }

      p.vx = p.vx * CFG.friction + (tx + repX - p.x) * CFG.attractStr;
      p.vy = p.vy * CFG.friction + (ty + repY - p.y) * CFG.attractStr;
      p.x += p.vx;
      p.y += p.vy;

      const distToMouse = sqrt((mx - p.x)**2 + (my - p.y)**2) / DPR;
      const cursorBoost = Math.max(0, 1 - distToMouse / 100);
      const radius = Math.max(0.2, (0.5 + combined * 1.5) * DPR);
      const alpha = (0.2 + combined * 0.2 + cursorBoost * 0.2).toFixed(2);

      ctx.fillStyle = cursorBoost > 0.5 
        ? `rgba(232, 112, 30, ${alpha})` 
        : `rgba(255, 255, 255, ${alpha})`;
      
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

  window.addEventListener('resize', resize, { passive: true });
  resize();
  draw();
}
