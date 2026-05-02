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
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            updateProfileUI(user);
            fetchUserProjects(user.uid);
            fetchUserActivity(user.uid);
            checkGitHubConnection(user.uid);
        } else {
            // Public view logic could go here, but for now we redirect
            window.location.href = 'index.html?action=login';
        }
    });

    async function updateProfileUI(user) {
        document.getElementById('profile-avatar').src = user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`;
        document.getElementById('profile-name').innerText = user.displayName || 'Developer';
        document.getElementById('profile-email').innerText = user.email;
        
        // Fetch bio and social links from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            if (data.bio) document.getElementById('profile-bio').innerText = data.bio;
            if (data.linkedin) document.getElementById('link-linkedin').href = data.linkedin;
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
        const card = document.createElement('div');
        card.className = 'discovery-card';
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;

        card.innerHTML = `
            <div class="card-banner">
                <img src="${p.fileURL}" alt="${p.title}">
            </div>
            <div class="card-body">
                <h3 class="card-title">${p.title}</h3>
                <p class="card-description">${p.description}</p>
                <div class="card-stats">
                    <div class="stat-item"><i data-lucide="heart"></i> ${p.likesCount || 0}</div>
                    <div class="stat-item"><i data-lucide="eye"></i> ${p.viewCount || 0}</div>
                </div>
            </div>
        `;
        
        card.onclick = () => window.location.href = `explore.html?id=${id}`;
        container.appendChild(card);
        requestAnimationFrame(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    }

    // ─── 4. GITHUB INTELLIGENCE ─────────────────────────────
    const ghSyncBtn = document.getElementById('gh-sync-btn');
    const ghUsernameInput = document.getElementById('gh-username-input');

    async function checkGitHubConnection(uid) {
        const userDoc = await db.collection('users').doc(uid).get();
        const data = userDoc.data();
        if (data && data.githubUsername) {
            document.getElementById('gh-setup').style.display = 'none';
            document.getElementById('gh-display').style.display = 'block';
            document.getElementById('link-github').href = `https://github.com/${data.githubUsername}`;
            fetchGitHubRepos(data.githubUsername);
        }
    }

    ghSyncBtn.addEventListener('click', async () => {
        const username = ghUsernameInput.value.trim();
        if (!username) return;
        
        const user = auth.currentUser;
        await db.collection('users').doc(user.uid).set({
            githubUsername: username
        }, { merge: true });
        
        checkGitHubConnection(user.uid);
    });

    async function fetchGitHubRepos(username) {
        try {
            const res = await fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=6`);
            const repos = await res.json();
            
            const list = document.getElementById('gh-repo-list');
            document.getElementById('gh-repo-count').innerText = `${repos.length}+ Repos`;
            
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
        const feed = document.getElementById('user-activity-feed');
        const actSnap = await db.collection('activity')
            .where('userId', '==', uid)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        if (actSnap.empty) {
            feed.innerHTML = '<p class="empty-msg">No recent activity found.</p>';
            return;
        }

        feed.innerHTML = actSnap.docs.map(doc => {
            const a = doc.data();
            const date = a.timestamp ? new Date(a.timestamp.toDate()).toLocaleDateString() : 'Recent';
            return `
                <div class="dashboard-activity-item">
                    <div class="activity-icon-wrapper">
                        <i data-lucide="${a.type === 'upload' ? 'rocket' : 'heart'}"></i>
                    </div>
                    <div class="activity-info">
                        <h5>${a.type === 'upload' ? 'Shared Project' : 'Liked Project'}</h5>
                        <p>Interact with <b>${a.projectTitle}</b></p>
                    </div>
                    <span class="activity-date">${date}</span>
                </div>
            `;
        }).join('');
        lucide.createIcons();
    }
});
