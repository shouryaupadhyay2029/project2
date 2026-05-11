/**
 * Cinematic Particle Wave Animation
 * Brighter & Enhanced version for DevStage Explore Page
 */

const CFG = {
  cols: 72,
  rows: 40,
  waveSpeed: 0.013,
  attractStr: 0.016,
  repelRadius: 110,
  repelForce: 28,
  friction: 0.80,
  minRadius: 0.18,
  maxRadius: 2.15,
};

const canvas = document.getElementById('particle-wave-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const cursorEl = document.getElementById('cursor-ring');

  let W, H, DPR;
  let particles = [];
  let time = 0;
  let mouse = { x: -9999, y: -9999 };
  let cursorVisible = false;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
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

  function waveAt(p, t) {
    const nx = p.bx / W;
    const ny = p.by / H;
    const w1 = Math.sin(nx * 3.8 + ny * 2.2 - t * 1.9) * 0.5 + 0.5;
    const w2 = Math.sin(nx * 2.1 - ny * 3.1 + t * 1.3 + 1.8) * 0.5 + 0.5;
    const w3 = Math.sin(nx * 5.5 + ny * 1.8 + t * 2.6 + 3.2) * 0.5 + 0.5;
    const combined = w1 * 0.52 + w2 * 0.30 + w3 * 0.18;
    const amp = 16 * combined;
    const ox = Math.sin(nx * 4.2 + ny * 2.1 - t * 1.7 + p.phase) * amp;
    const oy = Math.cos(ny * 3.8 + nx * 1.6 + t * 1.5 + 0.9 + p.phase) * amp;
    return { ox, oy, combined };
  }

  function draw() {
    time += CFG.waveSpeed;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bg = ctx.createRadialGradient(
      W * 0.38 * DPR, H * 0.35 * DPR, 0,
      W * 0.50 * DPR, H * 0.50 * DPR, Math.max(W, H) * DPR * 0.90
    );
    bg.addColorStop(0, '#403e3d');
    bg.addColorStop(0.5, '#373534');
    bg.addColorStop(1, '#262524');
    ctx.fillStyle = bg;
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
      const dist = Math.sqrt(dx * dx + dy * dy);
      let repX = 0, repY = 0;

      if (dist < repelR && dist > 0.5) {
        const strength = (1 - dist / repelR) * (1 - dist / repelR);
        repX = -(dx / dist) * strength * CFG.repelForce * DPR;
        repY = -(dy / dist) * strength * CFG.repelForce * DPR;
      }

      p.vx = p.vx * CFG.friction + (tx + repX - p.x) * CFG.attractStr;
      p.vy = p.vy * CFG.friction + (ty + repY - p.y) * CFG.attractStr;
      p.x += p.vx;
      p.y += p.vy;

      const cssDist = Math.sqrt((mouse.x - p.x / DPR) ** 2 + (mouse.y - p.y / DPR) ** 2);
      const cursorBoost = Math.max(0, 1 - cssDist / CFG.repelRadius);
      const depth = 0.55 + (1 - p.by / H) * 0.45;
      const radius = Math.max(CFG.minRadius, (CFG.minRadius + combined * (CFG.maxRadius - CFG.minRadius)) * depth * DPR);

      // Enhanced alpha for deeper constant visibility
      const alpha = Math.min(0.68, 0.22 + combined * 0.18 + cursorBoost * 0.08);

      const orangeBoost = Math.max(0, 1 - cssDist / 22);
      const r = Math.round(255 + (232 - 255) * orangeBoost);
      const g = Math.round(255 + (112 - 255) * orangeBoost);
      const b = Math.round(255 + (30 - 255) * orangeBoost);

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
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
      cursorEl.style.left = e.clientX + 'px';
      cursorEl.style.top = e.clientY + 'px';
    }
    showCursor();
  });

  document.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
    if (cursorEl) {
      cursorEl.style.opacity = '0';
      cursorVisible = false;
    }
  });

  document.addEventListener('touchmove', e => {
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  document.addEventListener('click', e => {
    const cx = e.clientX * DPR;
    const cy = e.clientY * DPR;
    const burst = 180 * DPR;
    particles.forEach(p => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < burst && d > 1) {
        const f = ((burst - d) / burst) ** 2 * 18;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }
    });
  });

  window.addEventListener('resize', resize);
  resize();
  draw();
}
