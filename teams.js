document.addEventListener('DOMContentLoaded', () => {
    // ─── 1. NAVBAR & DROPDOWN ────────────────────────────────
    const navToggle = document.getElementById('nav-toggle');
    const navDropdown = document.getElementById('nav-dropdown');

    if (navToggle && navDropdown) {
        const navItems = navDropdown.querySelectorAll('.nav-item-anim');

        navToggle.addEventListener('change', () => {
            if (navToggle.checked) {
                navDropdown.classList.add('active');

                // Staggered Entrance Animation
                navItems.forEach((item) => {
                    item.classList.remove('nav-item-visible');
                    item.style.transitionDelay = '0ms';
                });

                requestAnimationFrame(() => {
                    navItems.forEach((item, index) => {
                        item.style.transitionDelay = `${index * 35}ms`;
                        item.classList.add('nav-item-visible');
                    });
                });
            } else {
                navDropdown.classList.remove('active');
                // Instantly reset
                navItems.forEach(item => {
                    item.classList.remove('nav-item-visible');
                    item.style.transitionDelay = '0ms';
                });
            }
        });

        // Cursor Following Highlight inside dropdown
        navDropdown.addEventListener('mousemove', (e) => {
            const rect = navDropdown.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            navDropdown.style.setProperty('--mouse-x', `${x}%`);
            navDropdown.style.setProperty('--mouse-y', `${y}%`);
        });

        document.addEventListener('click', (e) => {
            const hamburgerWrapper = document.querySelector('.hamburger-wrapper');
            if (navToggle.checked && !hamburgerWrapper.contains(e.target)) {
                navToggle.checked = false;
                navDropdown.classList.remove('active');
                navItems.forEach(item => {
                    item.classList.remove('nav-item-visible');
                });
            }
        });
    }

    // ─── 2. TERRAIN BACKGROUND ──────────────────────────────────────────
    const canvas = document.getElementById('teams-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const xhair = document.getElementById('xhair');

        let W, H;
        let t = 0;

        const mouse = {
            x: -9999,
            y: -9999,
            inside: false
        };

        let pulses = [];

        function resize() {
            W = canvas.width = innerWidth;
            H = canvas.height = innerHeight;
        }

        resize();
        window.addEventListener('resize', resize);

        window.addEventListener('mousemove', e => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.inside = true;

            if (xhair) {
                xhair.style.left = e.clientX + 'px';
                xhair.style.top = e.clientY + 'px';
                xhair.style.opacity = '1';
            }
        });

        window.addEventListener('mouseleave', () => {
            mouse.inside = false;
            if (xhair) xhair.style.opacity = '0';
        });

        window.addEventListener('click', e => {
            pulses.push({
                x: e.clientX,
                y: e.clientY,
                born: t
            });
        });

        function noise(x, y, t) {
            return (
                Math.sin(x * 1.2 + t * .34) * Math.cos(y * 1.0 + t * .27) * .44 +
                Math.sin(x * 2.2 - t * .19 + y * .82) * .25 +
                Math.cos(x * .75 + y * 1.9 + t * .48) * .17 +
                Math.sin(x * 3.0 + y * 2.4 - t * .15) * .09 +
                Math.cos(x * .38 - y * 2.8 + t * .31) * .10 +
                Math.sin(x * 4.1 + y * 3.3 - t * .22) * .045
            );
        }

        const SEGS = [
            [], [[3, 0]], [[0, 1]], [[3, 1]],
            [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]],
            [[2, 3]], [[0, 2], [2, 3]], [[2, 1], [0, 3]], [[2, 1]],
            [[1, 3]], [[0, 3], [1, 0]], [[2, 0]], []
        ];

        function edgePt(edge, x, y, s, v) {
            const cx = [x, x + s, x + s, x];
            const cy = [y, y, y + s, y + s];
            const p = [[0, 1], [1, 2], [2, 3], [3, 0]];
            const [a, b] = p[edge];
            const tt = (v[a] === v[b]) ? .5 : (-v[a]) / (v[b] - v[a]);
            return [cx[a] + tt * (cx[b] - cx[a]), cy[a] + tt * (cy[b] - cy[a])];
        }

        function clamp(v, min, max) {
            return Math.max(min, Math.min(max, v));
        }

        const STEP = 18;
        const LEVELS = 18;
        const SCALE = 0.0042;
        const CR = 220;
        const CS = 0.52;
        const PULSE_MAX_R = 300;

        function draw() {
            t += 0.0055;
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = '#161718';
            ctx.fillRect(0, 0, W, H);

            const cols = Math.ceil(W / STEP) + 2;
            const rows = Math.ceil(H / STEP) + 2;
            const field = [];

            for (let r = 0; r < rows; r++) {
                field[r] = [];
                for (let c = 0; c < cols; c++) {
                    let wx = c * STEP;
                    let wy = r * STEP;
                    const dx = wx - mouse.x;
                    const dy = wy - mouse.y;
                    const d = Math.sqrt(dx * dx + dy * dy);

                    if (d < CR) {
                        const pull = (1 - d / CR);
                        const eased = pull * pull * (3 - 2 * pull);
                        wx -= dx * eased * CS;
                        wy -= dy * eased * CS;
                    }

                    for (const p of pulses) {
                        const pd = Math.sqrt((wx - p.x) ** 2 + (wy - p.y) ** 2);
                        const pr = (t - p.born) * 320;
                        const pw = 50;
                        if (pd > pr - pw && pd < pr + pw) {
                            const env = 1 - Math.abs(pd - pr) / pw;
                            wx += Math.cos(pd * .08) * env * 18;
                            wy += Math.sin(pd * .08) * env * 18;
                        }
                    }
                    field[r][c] = noise(wx * SCALE, wy * SCALE, t);
                }
            }

            pulses = pulses.filter(p => (t - p.born) * 320 < PULSE_MAX_R + 80);

            for (let lvl = 0; lvl < LEVELS; lvl++) {
                const iso = -0.88 + (lvl / (LEVELS - 1)) * 1.76;
                const isPrimary = lvl % 3 === 0;
                const isAccent = lvl % 9 === 0;

                const baseAlpha = isPrimary
                    ? 0.08 + 0.11 * Math.pow(Math.sin((lvl / (LEVELS - 1)) * Math.PI), 1.2)
                    : 0.03 + 0.05 * Math.pow(Math.sin((lvl / (LEVELS - 1)) * Math.PI), 1.5);

                const baseSegments = [];
                const orangeSegments = [];

                for (let r = 0; r < rows - 1; r++) {
                    for (let c = 0; c < cols - 1; c++) {
                        const x = c * STEP;
                        const y = r * STEP;
                        const v = [
                            field[r][c] - iso,
                            field[r][c + 1] - iso,
                            field[r + 1][c + 1] - iso,
                            field[r + 1][c] - iso
                        ];
                        const idx = (v[0] > 0 ? 8 : 0) | (v[1] > 0 ? 4 : 0) | (v[2] > 0 ? 2 : 0) | (v[3] > 0 ? 1 : 0);

                        for (const [e1, e2] of SEGS[idx]) {
                            const p1 = edgePt(e1, x, y, STEP, v);
                            const p2 = edgePt(e2, x, y, STEP, v);
                            baseSegments.push([p1, p2]);

                            if (mouse.inside) {
                                const vx = p2[0] - p1[0];
                                const vy = p2[1] - p1[1];
                                const len2 = vx * vx + vy * vy;
                                if (len2 > 0.0001) {
                                    const tProj = clamp(((mouse.x - p1[0]) * vx + (mouse.y - p1[1]) * vy) / len2, 0, 1);
                                    const px = p1[0] + vx * tProj;
                                    const py = p1[1] + vy * tProj;
                                    const dist = Math.hypot(mouse.x - px, mouse.y - py);
                                    const hoverRadius = 140; // Reduced from 240

                                    if (dist < hoverRadius) {
                                        const intensity = 1 - (dist / hoverRadius);
                                        const span = 0.12 + intensity * 0.22; // Reduced span
                                        const a = clamp(tProj - span * .5, 0, 1);
                                        const b = clamp(tProj + span * .5, 0, 1);
                                        orangeSegments.push([[p1[0] + vx * a, p1[1] + vy * a], [p1[0] + vx * b, p1[1] + vy * b]]);
                                    }
                                }
                            }
                        }
                    }
                }

                ctx.beginPath();
                for (const [p1, p2] of baseSegments) {
                    ctx.moveTo(p1[0], p1[1]);
                    ctx.lineTo(p2[0], p2[1]);
                }
                ctx.strokeStyle = `rgba(245,245,242,${baseAlpha})`;
                ctx.lineWidth = isAccent ? 1.15 : isPrimary ? .8 : .45;
                ctx.stroke();

                if (orangeSegments.length) {
                    ctx.beginPath();
                    for (const [p1, p2] of orangeSegments) {
                        ctx.moveTo(p1[0], p1[1]);
                        ctx.lineTo(p2[0], p2[1]);
                    }
                    ctx.strokeStyle = 'rgba(215,138,47,.95)';
                    ctx.lineWidth = isAccent ? 1.35 : 1.1;
                    ctx.stroke();
                }
            }

            const vign = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .7);
            vign.addColorStop(0, 'rgba(255,255,255,0)');
            vign.addColorStop(.65, 'rgba(0,0,0,.12)');
            vign.addColorStop(1, 'rgba(0,0,0,.34)');
            ctx.fillStyle = vign;
            ctx.fillRect(0, 0, W, H);

            requestAnimationFrame(draw);
        }
        draw();
    }

    // ─── 3. LOGO BLOOM ANIMATION ────────────────────────────
    const logoChars = document.querySelectorAll('.char');
    setTimeout(() => {
        logoChars.forEach(char => {
            char.classList.add('nav-item-visible');
        });
    }, 100);

    const pageTag = document.querySelector('.logo-page-tag');
    if (pageTag) {
        pageTag.style.opacity = '1';
    }

    // ─── 4. PREMIUM FILTER & SORT SYSTEM ───────────────────────────
    const dropdowns = document.querySelectorAll('.custom-dropdown');
    const filterTagsContainer = document.getElementById('active-filters-tags');
    const clearAllBtn = document.getElementById('clear-all-filters');
    const searchInput = document.querySelector('.filter-search-input');
    const featuredSection = document.querySelector('.featured-teams-section');
    const collabSection = document.querySelector('.collab-requests-section');
    const emptyStateSection = document.querySelector('.teams-empty-state');
    const noResultsState = document.getElementById('no-results-state');

    const activeFilters = {
        skills: [],
        type: [],
        status: [],
        search: ''
    };

    // Dropdown Toggle Logic
    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const options = dropdown.querySelectorAll('.dropdown-option');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other dropdowns
            dropdowns.forEach(d => {
                if (d !== dropdown) d.classList.remove('active');
            });
            dropdown.classList.toggle('active');
        });

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.dataset.value;
                const category = dropdown.id.split('-')[0]; // skill, type, status, sort

                if (category !== 'sort') {
                    toggleFilter(category, value, option);
                } else {
                    // Handle Sort
                    dropdown.querySelector('.dropdown-trigger span').innerText = option.innerText;
                    dropdown.classList.remove('active');
                    // Add sort logic here if needed
                }
            });
        });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
        dropdowns.forEach(d => d.classList.remove('active'));
    });

    function toggleFilter(category, value, optionElement) {
        const index = activeFilters[category].indexOf(value);
        if (index === -1) {
            activeFilters[category].push(value);
            optionElement.classList.add('selected');
        } else {
            activeFilters[category].splice(index, 1);
            optionElement.classList.remove('selected');
        }
        updateFilterTags();
        applyFilters();
    }

    function updateFilterTags() {
        // Clear current tags except "Clear All" btn
        const currentTags = filterTagsContainer.querySelectorAll('.filter-tag');
        currentTags.forEach(t => t.remove());

        let hasFilters = false;

        ['skills', 'type', 'status'].forEach(cat => {
            activeFilters[cat].forEach(val => {
                hasFilters = true;
                const tag = document.createElement('div');
                tag.className = 'filter-tag';
                tag.innerHTML = `
                    <span>${val}</span>
                    <div class="filter-tag-remove" data-cat="${cat}" data-val="${val}">
                        <i data-lucide="x" style="width:10px;"></i>
                    </div>
                `;
                filterTagsContainer.insertBefore(tag, clearAllBtn);
            });
        });

        if (searchInput.value) hasFilters = true;

        clearAllBtn.style.display = hasFilters ? 'block' : 'none';
        lucide.createIcons();

        // Tag remove listeners
        filterTagsContainer.querySelectorAll('.filter-tag-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const cat = btn.dataset.cat;
                const val = btn.dataset.val;
                const option = document.querySelector(`#${cat}-dropdown [data-value="${val}"]`);
                toggleFilter(cat, val, option);
            });
        });
    }

    searchInput.addEventListener('input', () => {
        activeFilters.search = searchInput.value.toLowerCase();
        applyFilters();
        updateFilterTags();
    });

    clearAllBtn.addEventListener('click', () => {
        activeFilters.skills = [];
        activeFilters.type = [];
        activeFilters.status = [];
        activeFilters.search = '';
        searchInput.value = '';
        document.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
        updateFilterTags();
        applyFilters();
    });

    function applyFilters() {
        const hasFilters = activeFilters.skills.length > 0 || 
                           activeFilters.type.length > 0 || 
                           activeFilters.status.length > 0 || 
                           activeFilters.search.length > 0;

        // For demo purposes, we'll just toggle sections
        // In a real app, this would filter card visibility
        if (hasFilters) {
            emptyStateSection.style.display = 'none';
            
            // Mock filtering: if "Research" is in search, show nothing to demonstrate no-results
            if (activeFilters.search === 'empty_test') {
                featuredSection.style.display = 'none';
                collabSection.style.display = 'none';
                noResultsState.style.display = 'block';
            } else {
                featuredSection.style.display = 'block';
                collabSection.style.display = 'block';
                noResultsState.style.display = 'none';
            }
        } else {
            emptyStateSection.style.display = 'block';
            featuredSection.style.display = 'block';
            collabSection.style.display = 'block';
            noResultsState.style.display = 'none';
        }
    }

    // ─── 5. CARD INTERACTION (3D TILT) ───────────────────────────
    const teamCards = document.querySelectorAll('.featured-team-card');
    
    teamCards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 15;
            const rotateY = (centerX - x) / 15;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`;
        });
    });

    // ─── 6. AUTH STATE (UI ONLY FOR NOW) ─────────────────────
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            // Optional: Redirect if needed
            // window.location.href = 'index.html';
        }
    });
});
