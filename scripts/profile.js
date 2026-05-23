document.addEventListener('DOMContentLoaded', () => {
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
        } else {
            // Public view logic could go here, but for now we redirect
            window.location.href = '../index.html?action=login';
        }
    });

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
        const projectsSnap = await db.collection('projects').where('userId', '==', uid).get();

        if (projectsSnap.empty) return;

        grid.innerHTML = '';
        projectsSnap.forEach((doc, index) => {
            renderProjectCard(doc.data(), doc.id, grid, index);
        });
        lucide.createIcons();
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

        item.onclick = () => window.location.href = `explore.html?id=${id}`;
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
        if (!grid) return;

        const actSnap = await db.collection('activity')
            .where('userId', '==', uid)
            .orderBy('timestamp', 'desc')
            .limit(52)
            .get();

        if (actSnap.empty) {
            grid.innerHTML = '<p class="empty-msg">No recent activity found.</p>';
            return;
        }

        const classMap = {
            upload: 'l4',
            comment: 'l2',
            like: 'l3',
            update: 'l1'
        };

        const cells = actSnap.docs.map(doc => {
            const a = doc.data();
            const cellClass = classMap[a.type] || 'l2';
            return `<div class="contrib-cell ${cellClass}" title="${a.type || 'activity'}"></div>`;
        });

        while (cells.length < 52) {
            cells.push('<div class="contrib-cell"></div>');
        }

        grid.innerHTML = cells.join('');
    }
});