document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger-menu');
  const navLinks = document.getElementById('nav-links');
  const navbar = document.getElementById('main-navbar');

  // Toggle mobile menu
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('active');

    // Prevent scrolling when menu is open
    if (navLinks.classList.contains('active')) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('modal-open');
    }
  });

  // Close mobile menu when clicking a link
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('active');
      document.body.style.overflow = 'auto';
      document.body.classList.remove('modal-open');
    });
  });

  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target) && navLinks.classList.contains('active')) {
      hamburger.classList.remove('open');
      navLinks.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  });

  // ─── 3D Hollow Cursor Engine ───
  const cursor = document.getElementById('hollow-3d-cursor');
  const borderRing = cursor.querySelector('.border-ring');
  const haloGlow = cursor.querySelector('.halo-glow');
  
  // State & Physics
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let currentX = mouseX, currentY = mouseY;
  let currentW = 16, currentH = 16;
  let currentR = 50; 
  let currentScale = 1;
  
  let targetX = mouseX, targetY = mouseY;
  let targetW = 16, targetH = 16;
  let targetR = 50;
  let targetScale = 1;
  
  let isHovering = false;
  let isClicking = false;
  let hoverTarget = null;
  const LERP = 0.12; // Weighted feel

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Pulse effect during motion
    targetScale = 1.1;
    clearTimeout(window.cursorPulseTimeout);
    window.cursorPulseTimeout = setTimeout(() => targetScale = 1.0, 50);

    // Magnetic Attraction / Micro-parallax
    if (isHovering && hoverTarget) {
      const rect = hoverTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Element pulls toward mouse (Magnetic effect)
      const pullX = (e.clientX - centerX) * 0.2; // 20% attraction
      const pullY = (e.clientY - centerY) * 0.2;
      hoverTarget.style.transform = `translate3d(${pullX}px, ${pullY - 2}px, 0) scale(1.02)`;

      // Cursor target position also pulls slightly toward mouse center for "sticky" feel
      const padding = 8;
      targetX = rect.left - padding + (pullX * 0.5);
      targetY = rect.top - padding + (pullY * 0.5);
    }
  });

  document.addEventListener('mousedown', () => {
    isClicking = true;
    cursor.classList.add('is-clicking');
    setTimeout(() => {
      isClicking = false;
      cursor.classList.remove('is-clicking');
    }, 120);
  });

  // Target Detection
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('.hero-title span, a, button, .card, .hero-tag, .nav-logo, input, label, .modal-close');
    
    if (target) {
      isHovering = true;
      hoverTarget = target;
      cursor.classList.add('is-hovering');
      target.classList.add('energy-field-active');

      const rect = target.getBoundingClientRect();
      const style = window.getComputedStyle(target);
      const borderRadius = style.borderRadius;

      const padding = 8;
      targetW = rect.width + padding * 2;
      targetH = rect.height + padding * 2;
      targetX = rect.left - padding;
      targetY = rect.top - padding;
      targetR = borderRadius.includes('%') ? 50 : parseInt(borderRadius) || 8;
    } else {
      isHovering = false;
      if (hoverTarget) {
        hoverTarget.style.transform = 'translate3d(0, 0, 0) scale(1)';
        hoverTarget.classList.remove('energy-field-active');
        hoverTarget = null;
      }
      cursor.classList.remove('is-hovering');
      targetW = 16;
      targetH = 16;
      targetR = 50;
    }
  });

  function animateCursor() {
    // Positioning (Idle: center mouse. Hover: dynamic magnetic target)
    const destX = isHovering ? targetX : mouseX - targetW / 2;
    const destY = isHovering ? targetY : mouseY - targetH / 2;

    currentX += (destX - currentX) * LERP;
    currentY += (destY - currentY) * LERP;
    currentW += (targetW - currentW) * LERP;
    currentH += (targetH - currentH) * LERP;
    currentR += (targetR - currentR) * LERP;
    currentScale += (targetScale - currentScale) * 0.1;

    // Apply transformations
    cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    borderRing.style.width = `${currentW}px`;
    borderRing.style.height = `${currentH}px`;
    borderRing.style.borderRadius = isHovering ? `${currentR}px` : `${currentR}%`;
    borderRing.style.transform = `scale(${currentScale})`;

    // Edge Lighting - Gradient shift based on movement
    const gradX = (currentX / window.innerWidth) * 100;
    const gradY = (currentY / window.innerHeight) * 100;
    borderRing.style.background = `linear-gradient(${gradX + gradY}deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%)`;

    requestAnimationFrame(animateCursor);
  }

  animateCursor();

  // ─── GPU-Accelerated Wave Engine ───
  const canvas = document.getElementById('wave-canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  
  let width, height;
  let waves = [];
  const waveCount = 5;
  
  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initWaves();
  }

  class Wave {
    constructor(index) {
      this.index = index;
      // Layer depth: front waves (large index) are brighter/thicker
      const depthFactor = (index + 1) / waveCount;
      
      this.amplitude = 30 + depthFactor * 40;
      this.frequency = 0.001 + (1 - depthFactor) * 0.0015;
      this.speed = 0.004 + depthFactor * 0.006;
      this.yBase = height * (0.3 + depthFactor * 0.4);
      
      this.color = `rgba(255, 255, 255, ${0.05 + depthFactor * 0.15})`;
      this.lineWidth = 0.5 + depthFactor * 1.5;
      this.offset = Math.random() * Math.PI * 2;
    }

    draw(t) {
      this.offset += this.speed;
      
      ctx.beginPath();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.lineWidth;
      ctx.lineCap = 'round';

      for (let x = 0; x <= width; x += 2) {
        // Base sine wave
        let y = Math.sin(x * this.frequency + this.offset) * this.amplitude;
        
        // Cursor Distortion Field
        const dx = x - mouseX;
        const dy = (this.yBase + y) - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = 200;
        
        if (dist < radius) {
          // Smooth bell-curve falloff
          const force = Math.pow(1 - dist / radius, 2);
          const distortion = force * 60; // Max 60px bend
          
          // Pull toward/away from cursor
          y -= distortion * (dy / dist);
        }

        if (x === 0) ctx.moveTo(x, this.yBase + y);
        else ctx.lineTo(x, this.yBase + y);
      }
      
      ctx.stroke();
    }
  }

  function initWaves() {
    waves = [];
    for (let i = 0; i < waveCount; i++) {
      waves.push(new Wave(i));
    }
  }

  function renderWaves(t) {
    ctx.clearRect(0, 0, width, height);
    
    waves.forEach(wave => wave.draw(t));
    
    requestAnimationFrame(renderWaves);
  }

  window.addEventListener('resize', resize);
  resize();
  renderWaves(0);

  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Search focus effect
  const searchInput = document.getElementById('nav-search');
  if (searchInput) {
    searchInput.addEventListener('focus', () => {
      console.log('Search focused');
    });
  }

  // ─── Authentication Readiness ───
  console.log('[DevStage] System ready. Awaiting Google OAuth configuration.');

  // ─── Custom Scrollbar Logic (Sync + Drag + Auto-Hide) ───
  const thumb = document.getElementById('scrollbar-thumb');
  const container = document.getElementById('custom-scrollbar');
  let isDragging = false;
  let scrollTimeout;

  if (thumb && container) {
    const showScrollbar = () => {
      container.classList.add('is-visible');
      clearTimeout(scrollTimeout);
      if (!isDragging) {
        scrollTimeout = setTimeout(() => {
          container.classList.remove('is-visible');
        }, 2000); // Hide after 2 seconds of idle
      }
    };

    const updateScrollbar = () => {
      if (isDragging) return;

      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const scrollable = docHeight - winHeight;

      if (scrollable <= 0) {
        container.style.display = 'none';
        return;
      }
      
      container.style.display = 'flex';
      showScrollbar();

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollPercent = Math.min(Math.max(scrollTop / scrollable, 0), 1);
      
      const maxTravel = container.offsetHeight - thumb.offsetHeight;
      const moveY = scrollPercent * maxTravel;
      
      requestAnimationFrame(() => {
        thumb.style.transform = `translate3d(-50%, ${moveY}px, 0)`;
      });
    };

    const onDrag = (e) => {
      if (!isDragging) return;
      showScrollbar(); // Keep visible during drag
      
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const scrollPercent = Math.min(Math.max(y / rect.height, 0), 1);
      
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const targetScroll = scrollPercent * (docHeight - winHeight);
      
      window.scrollTo(0, targetScroll);
      
      const maxTravel = rect.height - thumb.offsetHeight;
      const moveY = scrollPercent * maxTravel;
      thumb.style.transform = `translate3d(-50%, ${moveY}px, 0)`;
    };

    const stopDrag = () => {
      isDragging = false;
      container.classList.remove('is-dragging');
      showScrollbar(); // Trigger fade-out timer
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
    };

    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      container.classList.add('is-dragging');
      onDrag(e);
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', stopDrag);
    });

    window.addEventListener('scroll', updateScrollbar, { passive: true });
    window.addEventListener('resize', updateScrollbar);
    updateScrollbar();
  }
});

