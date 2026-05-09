/**
 * Grid Terrain Animation
 * Adapted for DevStage Platform
 */

const cv = document.getElementById('c');
const cx = cv.getContext('2d');
let W, H, t = 0;
const M = { x: -9999, y: -9999, on: false };

// Grid density - Reduced for performance
const COLS = 64; 
const ROWS = 36; 

// Perspective camera
const FOV    = 300;
const NEAR_Z = 90;
const FAR_Z  = 1000; // Reduced slightly to tighten the view

// Pixel ratio safety
let DPR = Math.max(1, window.devicePixelRatio || 1);

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  DPR = Math.min(2, Math.max(1, window.devicePixelRatio || 1)); // Cap DPR at 2 for performance
  cv.width  = Math.floor(W * DPR);
  cv.height = Math.floor(H * DPR);
  cv.style.width  = W + 'px';
  cv.style.height = H + 'px';
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

// Peak-enhanced sine for a more natural wave crest
function pk(x) {
  return Math.sin(x)
    + 0.25 * Math.sin(2 * x)
    + 0.05 * Math.sin(3 * x);
}

// Multi-directional wave superposition
function waveH(nx, nz, time) {
  const w1 = pk( nx *  9.2 + nz * 20.0 - time * 0.72) * 0.52;
  const w2 = pk(-nx *  5.8 + nz * 13.5 + time * 0.55) * 0.26;
  const w3 = pk( nx * 16.0 - nz *  8.0 - time * 0.88) * 0.14;
  const w4 = Math.sin( nx * 28.0 + nz *  5.5 + time * 1.05) * 0.05;
  const w5 = Math.sin(-nx *  7.0 + nz * 32.0 - time * 1.30) * 0.04;
  return (w1 + w2 + w3 + w4 + w5) / 1.01;
}

// Horizontal drift field so vertical lines do not read as static rulers
function swayX(nx, nz, time) {
  const s1 = Math.sin(nx * 7.0 + nz * 9.0 - time * 0.65) * 0.016;
  const s2 = Math.sin(nx * 18.0 - nz * 6.0 + time * 0.95) * 0.010;
  const s3 = Math.sin(nx * 3.6 + nz * 24.0 + time * 0.40) * 0.006;
  return s1 + s2 + s3;
}

const pts = [];

function buildPts() {
  const AMP  = H * 0.15; // Reduced from 0.195 to reduce spread
  const CAMH = H * 0.260;
  const HY   = H * 0.268;

  for (let ri = 0; ri < ROWS; ri++) {
    if (!pts[ri]) pts[ri] = [];
    const rf = ri / (ROWS - 1);   // 0 = near, 1 = far
    const z  = NEAR_Z + (FAR_Z - NEAR_Z) * rf;
    const scl = FOV / z;
    const nz = 1 - rf;            // wave coordinate: 0 = far, 1 = near

    for (let ci = 0; ci < COLS; ci++) {
      const nx = ci / (COLS - 1);
      const wval = waveH(nx, nz, t);

      // Subtle sideways motion
      const xDrift = swayX(nx, nz, t) * W * (0.85 - rf * 0.45);

      const sx = nx * W + xDrift;
      let sy = HY + (CAMH - wval * AMP) * scl;

      // Cursor lift — cubic falloff in screen space
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

      // Pre-calculate alpha for efficiency
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
  if (a < 0.02) return; // Skip nearly invisible lines
  
  const lw = Math.max(0.12, ((p1.scl + p2.scl) * 0.5) * widthMult);
  cx.beginPath();
  cx.moveTo(p1.sx, p1.sy);
  cx.lineTo(p2.sx, p2.sy);
  cx.strokeStyle = `rgba(205,205,205,${a.toFixed(2)})`;
  cx.lineWidth = lw;
  cx.stroke();
}

function dot(p) {
  if (p.alpha < 0.05) return; // Skip dots for faint points
  
  const r = Math.max(0.45, Math.min(2.35, 0.55 + p.scl * 0.20));
  cx.beginPath();
  cx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
  cx.fillStyle = `rgba(235,235,235,${Math.min(0.92, p.alpha + 0.08).toFixed(2)})`;
  cx.fill();
}

function draw() {
  t += 0.010;

  cx.clearRect(0, 0, W, H);

  buildPts();

  // Painter's algorithm: far rows first
  for (let ri = ROWS - 1; ri >= 0; ri--) {
    for (let ci = 0; ci < COLS; ci++) {
      const p = pts[ri][ci];
      if (!p) continue;

      // Horizontal lines
      if (ci < COLS - 1) {
        const p2 = pts[ri][ci + 1];
        if (p2) seg(p, p2, 1.00, 0.80);
      }

      // Depth lines
      if (ri > 0) {
        const p2 = pts[ri - 1][ci];
        if (p2) seg(p, p2, 0.50, 0.50);
      }
    }
  }

  // Intersection dots
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
cv.addEventListener('touchend', () => { M.on = false; });
window.addEventListener('resize', resize);

resize();
draw();
