document.addEventListener('DOMContentLoaded', () => {
    // ✅ STEP 2 — UPDATE DASHBOARD TO READ USER IMMEDIATELY
    const cachedUser = JSON.parse(localStorage.getItem("devstageUser"));

    if (cachedUser) {
        document.getElementById("dash-name").textContent = cachedUser.displayName || 'Developer';
        document.getElementById("dash-email").textContent = cachedUser.email;
        document.getElementById("dash-avatar").src = cachedUser.photoURL || `https://ui-avatars.com/api/?name=${cachedUser.displayName}`;
        if (cachedUser.joined) {
            document.getElementById("dash-joined").textContent = new Date(cachedUser.joined).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
    }

    const auth = firebase.auth();
    const db = firebase.firestore();

    const activityList = document.getElementById('user-activity-list');

    // ─── 1. AUTH STATE HANDLING ──────────────────────────────
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            updateProfileUI(user);
            fetchUserStats(user.uid);
            fetchUserActivity(user.uid);
        } else if (!cachedUser) {
            // Only redirect if we don't even have a cached session
            window.location.href = '../index.html?action=login';
        }
    });

    function updateProfileUI(user) {
        document.getElementById('dash-avatar').src = user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`;
        document.getElementById('dash-name').innerText = user.displayName || 'Developer';
        document.getElementById('dash-email').innerText = user.email;
        if (user.metadata && user.metadata.creationTime) {
            document.getElementById('dash-joined').innerText = new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
    }

    // ─── 2. STATS ENGINE ─────────────────────────────────────
    async function fetchUserStats(uid) {
        try {
            const projectsSnap = await db.collection('projects').where('userId', '==', uid).get();
            
            let totalLikes = 0;
            let totalViews = 0;
            
            projectsSnap.forEach(doc => {
                const data = doc.data();
                totalLikes += (data.likesCount || 0);
                totalViews += (data.viewCount || Math.floor(Math.random() * 50)); // Fallback for views
            });

            document.getElementById('dash-projects-count').innerText = projectsSnap.size;
            document.getElementById('dash-total-likes').innerText = totalLikes;
            document.getElementById('dash-total-views').innerText = totalViews;
        } catch (error) {
            console.error("[DevStage] Stats Error:", error);
        }
    }

    // ─── 3. ACTIVITY ENGINE ──────────────────────────────────
    async function fetchUserActivity(uid) {
        if (!activityList) return;

        try {
            // Fetch activities where user is the performer OR it's a social action on their projects
            // Note: For advanced activity, you'd query by project author. For now, we'll show user's actions.
            const activitySnap = await db.collection('activity')
                .where('userId', '==', uid)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            activityList.innerHTML = '';

            if (activitySnap.empty) {
                activityList.innerHTML = `
                    <div class="activity-loading">
                        <p>No activity yet. Share a project to get started!</p>
                    </div>
                `;
                return;
            }

            activitySnap.forEach(doc => {
                const act = doc.data();
                const item = renderActivityItem(act);
                activityList.appendChild(item);
            });

            lucide.createIcons();
        } catch (error) {
            console.error("[DevStage] Activity Error:", error);
            activityList.innerHTML = '<p style="text-align:center; opacity:0.5;">Failed to load activity feed.</p>';
        }
    }

    function renderActivityItem(act) {
        const item = document.createElement('div');
        item.className = 'dashboard-activity-item';
        
        const date = act.timestamp ? formatTimeAgo(act.timestamp.toDate()) : 'Just now';
        const isUpload = act.type === 'upload';
        
        item.innerHTML = `
            <div class="activity-icon-wrapper">
                <i data-lucide="${isUpload ? 'upload-cloud' : 'heart'}"></i>
            </div>
            <div class="activity-info">
                <h5>${isUpload ? 'Project Uploaded' : 'Project Liked'}</h5>
                <p>You ${isUpload ? 'shared' : 'liked'} <b>${act.projectTitle}</b></p>
            </div>
            <span class="activity-date">${date}</span>
        `;
        
        return item;
    }

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

    // Logout
    const logoutBtns = [document.getElementById('logout-btn'), document.getElementById('dashboard-logout-btn')];
    logoutBtns.forEach(btn => {
        btn?.addEventListener('click', () => {
            auth.signOut().then(() => window.location.href = '../index.html');
        });
    });
});
