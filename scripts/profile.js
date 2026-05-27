document.addEventListener('DOMContentLoaded', () => {
    // ─── 0. LOGO BLOOM ANIMATION ─────────────────────────────
    const logoWrapper = document.querySelector('.logo-bloom-wrapper');
    if (logoWrapper) {
        setTimeout(() => {
            logoWrapper.classList.add('bloom');
        }, 500);
    }

    const auth = firebase.auth();
    const db = firebase.firestore();

    // ─── 1. TAB SYSTEM ───────────────────────────────────────
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(`tab-${target}`).classList.add('active');

            if (target === 'github') initGitHubTab();
        });
    });

    // ─── 2. PROFILE DATA ENGINE ─────────────────────────────
    auth.onAuthStateChanged(async(user) => {
        if (user) {
            updateProfileUI(user);
            fetchUserProjects(user.uid);
            fetchUserActivity(user.uid);
            checkGitHubConnection(user.uid);

            // Track profile view
            const username = user.displayName || user.email.split('@')[0];
            trackProfileView(username);
        } else {
            // Auth guard handles redirect for protected pages — do nothing here
            console.log('[DevStage Profile] No Firebase user session.');
        }
    });

    // Track profile view
    async function trackProfileView(username) {
        try {
            const cleanUsername = String(username).toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').slice(0, 14);
            await fetch(`http://localhost:5000/api/users/view-profile/${cleanUsername}`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('[DevStage Profile] Error tracking profile view:', error);
        }
    }

    async function updateProfileUI(user) {
        document.getElementById('profile-avatar').src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=2a2a2a&color=fff`;
        document.getElementById('profile-name').innerText = user.displayName || 'Developer';
        document.getElementById('profile-email').innerText = user.email;

        const handleSource = user.displayName || user.email || 'developer';
        const safeHandle = `@${String(handleSource).toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').slice(0, 14)}`;
        const handleEl = document.getElementById('profile-handle');
        if (handleEl) handleEl.innerText = safeHandle;

        // Fetch bio and social links from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            if (data.bio) document.getElementById('profile-bio').innerText = data.bio;
            if (data.linkedin) {
                const linkedinLink = document.getElementById('link-linkedin');
                if (linkedinLink) linkedinLink.href = data.linkedin;
            }
            if (data.location) {
                const locationItem = document.querySelector('#profile-location');
                if (locationItem) locationItem.textContent = data.location;
            }
        }
    }

    // ─── 3. PROJECTS FEED ───────────────────────────────────
    async function fetchUserProjects(uid) {
        const grid = document.getElementById('user-projects-grid');
        const token = localStorage.getItem('token');

        if (!token) {
            console.log('[DevStage Profile] No auth token found');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/projects/my-projects', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success && data.projects.length > 0) {
                grid.innerHTML = '';
                data.projects.forEach((project, index) => {
                    // Map MongoDB project structure to Firebase-like structure for UI compatibility
                    const firebaseStyleProject = {
                        title: project.title,
                        description: project.description,
                        category: project.status || 'Project',
                        techStack: project.techStack || [],
                        githubUrl: project.githubUrl,
                        liveUrl: project.liveUrl,
                        thumbnail: project.thumbnail,
                        featured: project.featured,
                        likes: project.likes,
                        views: project.views,
                        createdAt: project.createdAt
                    };
                    renderProjectCard(firebaseStyleProject, project._id, grid, index);
                });
                lucide.createIcons();
            }
        } catch (error) {
            console.error('[DevStage Profile] Error fetching projects:', error);
        }
    }

    function renderProjectCard(p, id, container, index) {
        const item = document.createElement('div');
        item.className = 'project-item';
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = `all 0.6s ease ${index * 0.1}s`;

        item.innerHTML = `
            <span class="project-index">${String(index + 1).padStart(2, '0')}</span>
            <div class="project-info">
                <p class="project-name">${p.title}</p>
                <p class="project-desc">${p.description || 'No description available.'}</p>
            </div>
            <div class="project-meta">
                <span class="project-tag">${(p.category || 'Project').toUpperCase()}</span>
                <span class="project-arrow">→</span>
            </div>
        `;

        item.onclick = async() => {
            // Track project view
            try {
                await fetch(`http://localhost:5000/api/projects/view/${id}`, {
                    method: 'POST'
                });
            } catch (error) {
                console.error('[DevStage Profile] Error tracking project view:', error);
            }
            window.location.href = `explore.html?id=${id}`;
        };
        container.appendChild(item);
        requestAnimationFrame(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        });
    }

    // ─── 4. GITHUB INTELLIGENCE ─────────────────────────────
    const ghSyncBtn = document.getElementById('gh-sync-btn');
    const ghUsernameInput = document.getElementById('gh-username-input');

    async function checkGitHubConnection(uid) {
        const userDoc = await db.collection('users').doc(uid).get();
        const data = userDoc.data();
        if (data && data.githubUsername) {
            const ghSetup = document.getElementById('gh-setup');
            const ghDisplay = document.getElementById('gh-display');
            const linkGithub = document.getElementById('link-github');

            if (ghSetup) ghSetup.style.display = 'none';
            if (ghDisplay) ghDisplay.style.display = 'block';
            if (linkGithub) linkGithub.href = `https://github.com/${data.githubUsername}`;
            fetchGitHubRepos(data.githubUsername);
        }
    }

    if (ghSyncBtn && ghUsernameInput) {
        ghSyncBtn.addEventListener('click', async() => {
            const username = ghUsernameInput.value.trim();
            if (!username) return;

            const user = auth.currentUser;
            await db.collection('users').doc(user.uid).set({
                githubUsername: username
            }, { merge: true });

            checkGitHubConnection(user.uid);
        });
    }

    async function fetchGitHubRepos(username) {
        try {
            const res = await fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=6`);
            const repos = await res.json();

            const list = document.getElementById('gh-repo-list');
            const repoCountEl = document.getElementById('gh-repo-count');
            if (!list || !repoCountEl) return;
            repoCountEl.innerText = `${repos.length}+ Repos`;

            list.innerHTML = repos.map(repo => `
                <a href="${repo.html_url}" target="_blank" class="repo-item">
                    <div class="repo-info">
                        <h5>${repo.name}</h5>
                        <p>${repo.description || 'Public repository'}</p>
                    </div>
                    <div class="repo-stars">
                        <i data-lucide="star"></i>
                        <span>${repo.stargazers_count}</span>
                    </div>
                </a>
            `).join('');
            lucide.createIcons();
        } catch (e) { console.error(e); }
    }

    // ─── 5. ACTIVITY FEED ────────────────────────────────────
    async function fetchUserActivity(uid) {
        const grid = document.getElementById('contrib-grid');
        const token = localStorage.getItem('token');

        if (!grid) return;

        if (!token) {
            console.log('[DevStage Profile] No auth token found');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/activity/me', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success && data.activities.length > 0) {
                const classMap = {
                    project_created: 'l4',
                    project_updated: 'l2',
                    project_deleted: 'l3',
                    featured_project_changed: 'l1',
                    profile_updated: 'l2',
                    settings_updated: 'l2',
                    profile_customized: 'l1'
                };

                const cells = data.activities.slice(0, 52).map(activity => {
                    const cellClass = classMap[activity.type] || 'l2';
                    return `<div class="contrib-cell ${cellClass}" title="${activity.title || 'activity'}"></div>`;
                });

                while (cells.length < 52) {
                    cells.push('<div class="contrib-cell"></div>');
                }

                grid.innerHTML = cells.join('');
            } else {
                grid.innerHTML = '<p class="empty-msg">No recent activity found.</p>';
            }
        } catch (error) {
            console.error('[DevStage Profile] Error fetching activity:', error);
            grid.innerHTML = '<p class="empty-msg">No recent activity found.</p>';
        }
    }

    // Initialize Lucide icons on load
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});