document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons immediately
    if (window.lucide) {
        lucide.createIcons();
    }

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

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            navLinks.classList.toggle('active');

            if (navLinks.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
                document.body.classList.add('modal-open');
            } else {
                document.body.style.overflow = 'auto';
                document.body.classList.remove('modal-open');
            }
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('open');
                navLinks.classList.remove('active');
                document.body.style.overflow = 'auto';
                document.body.classList.remove('modal-open');
            });
        });

        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navLinks.contains(e.target) && navLinks.classList.contains('active')) {
                hamburger.classList.remove('open');
                navLinks.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    }

    // Custom cursor support removed — native system cursor restored.

    // ─── Premium Localized Card Interaction Engine ───
    const featureCards = document.querySelectorAll('.feature-terminal-card');
    featureCards.forEach(card => {
        let ticking = false;
        let mouseEvt = null;
        let isHovered = false;

        // Sub-elements for Depth Shift
        const icon = card.querySelector('.card-icon');
        const title = card.querySelector('.card-title');
        const bar = card.querySelector('.card-terminal-bar');

        const resetCard = () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)`;
            if (icon) icon.style.transform = `translate3d(0, 0, 0)`;
            if (title) title.style.transform = `translate3d(0, 0, 0)`;
            if (bar) bar.style.transform = `translate3d(0, 0, 0)`;
            card.style.setProperty('--mouse-x', `50%`);
            card.style.setProperty('--mouse-y', `50%`);
        };

        const updateCard = () => {
            if (!mouseEvt || !isHovered) return;

            const rect = card.getBoundingClientRect();
            const x = mouseEvt.clientX - rect.left;
            const y = mouseEvt.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // 1. 3D Perspective Tilt (Subtle: 4-6deg max)
            const rotateX = (y - centerY) / 25;
            const rotateY = (centerX - x) / 25;

            // 2. Inner Depth Shift (Subtle Parallax)
            const moveX = (x - centerX) / 40;
            const moveY = (y - centerY) / 40;

            if (icon) icon.style.transform = `translate3d(${moveX * 1.5}px, ${moveY * 1.5}px, 20px)`;
            if (title) title.style.transform = `translate3d(${moveX * 0.8}px, ${moveY * 0.8}px, 10px)`;
            if (bar) bar.style.transform = `translate3d(${moveX * 0.5}px, ${moveY * 0.5}px, 5px)`;

            // 3. Glass Light Follow
            const px = (x / rect.width) * 100;
            const py = (y / rect.height) * 100;
            card.style.setProperty('--mouse-x', `${px}%`);
            card.style.setProperty('--mouse-y', `${py}%`);

            // 4. Main Card Transform (Tilt + Float)
            card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate3d(0, -8px, 0)`;

            ticking = false;
        };

        card.addEventListener('mousemove', e => {
            mouseEvt = e;
            isHovered = true;
            if (!ticking) {
                requestAnimationFrame(updateCard);
                ticking = true;
            }
        }, { passive: true });

        card.addEventListener('mouseleave', () => {
            isHovered = false;
            mouseEvt = null;
            resetCard();
        }, { passive: true });
    });



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
            requestAnimationFrame(updateParallax);
        }
    };
    if (heroLayer) requestAnimationFrame(updateParallax);

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

    const initDiscoveryFeed = async () => {
        if (!discoveryGrid) return;

        // Skeletons while connecting
        discoveryGrid.innerHTML = `
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    `;

        try {
            const res = await fetch('http://localhost:5000/api/projects/all');
            const data = await res.json();
            
            discoveryGrid.innerHTML = '';
            if (!data.success || data.projects.length === 0) {
                 discoveryGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 60px 0; opacity: 0.5;">
            <i data-lucide="compass" style="width: 40px; height: 40px; margin-bottom: 15px;"></i>
            <p>No projects found. Be the first to share!</p>
          </div>
        `;
                 lucide.createIcons();
                 return;
            }
            data.projects.slice(0, 12).forEach((p, index) => {
                const mapped = {
                    title: p.title,
                    description: p.description,
                    userName: p.owner?.displayName || p.owner?.username || 'DevStage Developer',
                    userAvatar: p.owner?.profilePhoto || \`https://ui-avatars.com/api/?name=\${p.owner?.displayName || 'User'}\`,
                    likesCount: p.likes,
                    viewCount: p.views,
                    fileURL: p.thumbnail,
                    category: p.category
                };
                renderDiscoveryCard(mapped, p._id || p.id, index);
            });
            lucide.createIcons();
        } catch (error) {
            console.error("[DevStage] Discovery Engine Error:", error);
            discoveryGrid.innerHTML = \`<p style="grid-column: 1/-1; text-align: center; color: #ff4b4b;">Sync failed. Please check your connection.</p>\`;
        }
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

        // Analytics: Fire impression
        if (id) {
            fetch(\`http://localhost:5000/api/analytics/impression/\${id}\`, { method: 'POST' }).catch(() => {});
        }

        // Click Card to View
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.stat-btn')) {
                // Analytics: Fire click
                if (id) {
                    fetch(\`http://localhost:5000/api/analytics/click/\${id}\`, { method: 'POST' }).catch(() => {});
                }
                
                const isRoot = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/') || window.location.pathname.endsWith('/project2') || window.location.pathname.endsWith('/project2/');
                window.location.href = (isRoot ? 'pages/' : '') + \`explore.html?id=\${id}\`;
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
            const isRoot = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/') || window.location.pathname.endsWith('/project2') || window.location.pathname.endsWith('/project2/');
            window.location.href = (isRoot ? 'pages/' : '') + `explore.html?id=${id}#comments`;
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
    const handleLikeToggle = async(projectId, btn) => {
        // Disabled for now, handled via backend API in explore.html
        console.log("Like toggled on landing page", projectId);
    };

    const checkIfLiked = async(projectId, btn) => {
        // Disabled
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

    const initActivityPulse = () => {};

    // Initial Boot
    setupFilterDropdowns();
    initDiscoveryFeed();
    initActivityPulse();
    initPlatformCoreCardNavigation();

    // ─── Platform Core feature cards → page navigation ───
    function initPlatformCoreCardNavigation() {
        const cards = document.querySelectorAll('.service-card-link');
        if (!cards.length) return;

        const NAV_DELAY_MS = 160;

        cards.forEach((card) => {
            card.addEventListener('click', (e) => {
                const href = card.getAttribute('href');
                if (!href || href.startsWith('#')) return;
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

                e.preventDefault();
                card.classList.add('is-navigating');

                if (window.pageLoader?.show) {
                    window.pageLoader.show();
                }

                window.setTimeout(() => {
                    window.location.assign(href);
                }, NAV_DELAY_MS);
            });
        });
    }

    // ─── Vertical Waves Cursor Interaction ───
    const verticalWaves = document.querySelector(".vertical-waves");
    let verticalWaveX = 0;
    let verticalWaveRAF = null;

    if (verticalWaves) {
        document.addEventListener("mousemove", (e) => {
            verticalWaveX = (e.clientX / window.innerWidth - 0.5) * 40;
            if (!verticalWaveRAF) {
                verticalWaveRAF = requestAnimationFrame(() => {
                    verticalWaves.style.transform = `translateX(${verticalWaveX}px)`;
                    verticalWaveRAF = null;
                });
            }
        }, { passive: true });
    }
});