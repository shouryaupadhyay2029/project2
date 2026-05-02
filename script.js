document.addEventListener('DOMContentLoaded', () => {
  // ─── Weight Bloom Logo Animation ───
  const logoWrapper = document.querySelector('.logo-bloom-wrapper');
  if (logoWrapper) {
    // 500ms silence before bloom
    setTimeout(() => {
      logoWrapper.classList.add('bloom');

      // 2.2s after page load for breathing (Total 2.2s)
      setTimeout(() => {
        logoWrapper.classList.add('is-breathing');
      }, 1700);
    }, 500);
  }

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
    const target = e.target.closest('.hero-title span, a, button, .card, .discovery-card, .hero-tag, .logo-bloom-wrapper, input, select, label, .modal-close');

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
  // ─── High-End Scroll Interaction Engine ───
  const heroLayer = document.querySelector('.hero-layer');
  const exploreLayer = document.querySelector('.lower-section');

  const updateParallax = () => {
    const scrollY = window.scrollY;
    const vh = window.innerHeight;
    const progress = Math.min(scrollY / vh, 1);

    // Apply dim/blur to Hero as we scroll
    if (heroLayer) {
      heroLayer.style.setProperty('--scroll-progress', progress);
      heroLayer.style.filter = `blur(${progress * 8}px)`;
      heroLayer.style.opacity = 1 - (progress * 0.4);
      heroLayer.style.transform = `translateY(${scrollY * 0.2}px)`; // Subtle parallax
    }

    requestAnimationFrame(updateParallax);
  };
  requestAnimationFrame(updateParallax);

  // Entrance Observer for Explore Layer
  const entranceObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');

        // Stagger project cards if they exist
        const cards = entry.target.querySelectorAll('.discovery-card');
        cards.forEach((card, index) => {
          setTimeout(() => {
            card.classList.add('fade-up');
          }, index * 100);
        });
      }
    });
  }, { threshold: 0.15 });

  if (exploreLayer) entranceObserver.observe(exploreLayer);

  // ─── Discovery Engine (Awwwards Style) ───
  // ─── 4. DISCOVERY FEED ENGINE (Real-time) ────────────────
  const discoveryGrid = document.getElementById('explore-grid');
  
  const getFilterValue = (dropdownId) => {
    const activeOpt = document.querySelector(`#${dropdownId} .menu-col a.active`);
    return activeOpt ? activeOpt.getAttribute('data-value') : 'all';
  };

  let discoveryUnsubscribe = null;

  const initDiscoveryFeed = () => {
    if (!discoveryGrid) return;

    // Skeletons while connecting
    discoveryGrid.innerHTML = `
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    `;

    // Unsubscribe from existing listener if filters change
    if (discoveryUnsubscribe) discoveryUnsubscribe();

    const domain = getFilterValue('domain-dropdown');
    const tech = getFilterValue('tech-dropdown');
    const diff = getFilterValue('difficulty-dropdown');
    const sortBy = getFilterValue('sort-dropdown');
    
    let query = db.collection('projects');

    // Apply Client-side filtering if needed or order by
    if (sortBy === 'newest') query = query.orderBy('createdAt', 'desc');
    else if (sortBy === 'likes') query = query.orderBy('likesCount', 'desc');
    else if (sortBy === 'views') query = query.orderBy('viewCount', 'desc');

    // Real-time Listener
    discoveryUnsubscribe = query.limit(12).onSnapshot((snapshot) => {
      discoveryGrid.innerHTML = '';

      if (snapshot.empty) {
        discoveryGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 60px 0; opacity: 0.5;">
            <i data-lucide="compass" style="width: 40px; height: 40px; margin-bottom: 15px;"></i>
            <p>No projects found. Be the first to share!</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      snapshot.forEach((doc, index) => {
        renderDiscoveryCard(doc.data(), doc.id, index);
      });

      lucide.createIcons();
    }, (error) => {
      console.error("[DevStage] Discovery Engine Error:", error);
      discoveryGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #ff4b4b;">Sync failed. Please check your connection.</p>`;
    });
  };

  const renderDiscoveryCard = (p, id, index) => {
    const card = document.createElement('div');
    card.className = 'discovery-card';
    card.setAttribute('data-id', id);

    const banner = p.fileURL || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80';
    const avatar = p.userAvatar || `https://ui-avatars.com/api/?name=${p.userName || 'User'}&background=random`;

    // Smooth entrance
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = `all 0.6s cubic-bezier(0.23, 1, 0.32, 1) ${index * 0.05}s`;

    card.innerHTML = `
      <div class="card-banner">
        <img src="${banner}" alt="${p.title}" loading="lazy">
      </div>
      <div class="card-body">
        <div class="card-user">
          <img src="${avatar}" alt="${p.userName}">
          <span>${p.userName || 'DevStage Developer'}</span>
        </div>
        <h3 class="card-title">${p.title}</h3>
        <p class="card-description">${p.description}</p>
        <div class="card-stats">
          <button class="stat-btn like-btn" id="like-${id}">
            <i data-lucide="heart"></i>
            <span class="count">${p.likesCount || 0}</span>
          </button>
          <button class="stat-btn comment-btn" id="comment-${id}">
            <i data-lucide="message-square"></i>
            <span class="count">${p.commentCount || 0}</span>
          </button>
          <div class="stat-item">
            <i data-lucide="eye"></i>
            <span>${p.viewCount || Math.floor(Math.random() * 50)}</span>
          </div>
        </div>
      </div>
    `;

    // Click Card to View
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.stat-btn')) {
        window.location.href = `explore.html?id=${id}`;
      }
    });

    // Like Interaction
    const likeBtn = card.querySelector('.like-btn');
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleLikeToggle(id, likeBtn);
    });

    // Comment Interaction
    const commentBtn = card.querySelector('.comment-btn');
    commentBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = `explore.html?id=${id}#comments`;
    });

    discoveryGrid.appendChild(card);

    // Check if liked by current user
    checkIfLiked(id, likeBtn);

    requestAnimationFrame(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });
  };

  // ─── Engagement Logic ───
  const handleLikeToggle = async (projectId, btn) => {
    if (!window.auth.currentUser) {
      if (window.showGlobalAuthMessage) {
        window.showGlobalAuthMessage("Please login to like projects", "info");
      }
      return;
    }

    const userId = window.auth.currentUser.uid;
    const likeId = `${userId}_${projectId}`;
    const likeRef = db.collection('likes').doc(likeId);
    const projectRef = db.collection('projects').doc(projectId);

    try {
      const likeDoc = await likeRef.get();
      const icon = btn.querySelector('i');
      const countSpan = btn.querySelector('.count');
      let currentCount = parseInt(countSpan.textContent);

      if (likeDoc.exists) {
        // Unlike
        await likeRef.delete();
        await projectRef.update({ likesCount: firebase.firestore.FieldValue.increment(-1) });
        btn.classList.remove('active');
        countSpan.textContent = Math.max(0, currentCount - 1);
      } else {
        // Like
        await likeRef.set({ userId, projectId, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        const pDoc = await projectRef.get();
        const pTitle = pDoc.data()?.title || "a project";

        await projectRef.update({ likesCount: firebase.firestore.FieldValue.increment(1) });

        // Log Activity
        await db.collection('activity').add({
          type: 'like',
          userId,
          userName: window.auth.currentUser.displayName || 'Anonymous',
          userAvatar: window.auth.currentUser.photoURL || `https://ui-avatars.com/api/?name=User`,
          projectId,
          projectTitle: pTitle,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        btn.classList.add('active');
        countSpan.textContent = currentCount + 1;
      }
      lucide.createIcons();
    } catch (error) {
      console.error("[DevStage] Like Error:", error);
    }
  };

  const checkIfLiked = async (projectId, btn) => {
    if (!window.auth.currentUser) return;
    const userId = window.auth.currentUser.uid;
    const likeId = `${userId}_${projectId}`;
    const likeDoc = await db.collection('likes').doc(likeId).get();
    if (likeDoc.exists) {
      btn.classList.add('active');
      lucide.createIcons();
    }
  };

  // Bind Filters
  if (filters.domain) filters.domain.addEventListener('change', initDiscoveryFeed);
  if (filters.tech) filters.tech.addEventListener('change', initDiscoveryFeed);
  if (filters.difficulty) filters.difficulty.addEventListener('change', initDiscoveryFeed);
  if (filters.sort) filters.sort.addEventListener('change', initDiscoveryFeed);

  // ─── 5. ACTIVITY PULSE ENGINE (Real-time) ────────────────
  const activityList = document.getElementById('activity-list');

  const initActivityPulse = () => {
    if (!activityList) return;

    db.collection('activity')
      .orderBy('timestamp', 'desc')
      .limit(8)
      .onSnapshot((snapshot) => {
        activityList.innerHTML = '';

        if (snapshot.empty) {
          activityList.innerHTML = '<p class="loading-text">Quiet for now...</p>';
          return;
        }

        snapshot.forEach((doc) => {
          const act = doc.data();
          const item = document.createElement('div');
          item.className = 'activity-item';

          const time = act.timestamp ? formatTimeAgo(act.timestamp.toDate()) : 'Just now';
          const icon = act.type === 'upload' ? 'rocket' : 'heart';
          const actionText = act.type === 'upload' ? 'uploaded' : 'liked';

          item.innerHTML = `
            <img src="${act.userAvatar}" class="activity-avatar" alt="${act.userName}">
            <div class="activity-content">
              <b>${act.userName}</b> ${actionText} 
              <a href="explore.html?id=${act.projectId}" class="activity-project-link">
                ${act.projectTitle}
              </a>
              <span class="activity-time">${time}</span>
            </div>
          `;
          activityList.appendChild(item);
        });

        lucide.createIcons();
      });
  };

  function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "just now";
  }

  // ─── 5. FILTER DROPDOWNS ENGINE ────────────────
  const setupFilterDropdowns = () => {
    const dropdowns = document.querySelectorAll('.filter-dropdown');
    
    dropdowns.forEach(dropdown => {
      const trigger = dropdown.querySelector('.filter-trigger');
      const options = dropdown.querySelectorAll('.filter-menu a');
      
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdowns.forEach(d => { if (d !== dropdown) d.classList.remove('active'); });
        dropdown.classList.toggle('active');
      });
      
      options.forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const text = opt.innerText;
          
          trigger.innerHTML = `${text} <span class="tilt-line"></span>`;
          lucide.createIcons();
          
          options.forEach(o => o.classList.remove('active'));
          opt.classList.add('active');
          dropdown.classList.remove('active');
          
          initDiscoveryFeed();
        });
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-dropdown')) {
        dropdowns.forEach(d => d.classList.remove('active'));
      }
    });
  };

  // Initial Boot
  setupFilterDropdowns();
  initDiscoveryFeed();
  initActivityPulse();

  // ─── Vertical Waves Cursor Interaction ───
  document.addEventListener("mousemove", (e) => {
    const wave = document.querySelector(".vertical-waves");
    if (wave) {
      const x = (e.clientX / window.innerWidth - 0.5) * 40;
      wave.style.transform = `translateX(${x}px)`;
    }
  });
});
