document.addEventListener("DOMContentLoaded", () => {
  // ─── 0. LOGO BLOOM ANIMATION ─────────────────────────────
  const logoWrapper = document.querySelector(".logo-bloom-wrapper");
  if (logoWrapper) {
    setTimeout(() => {
      logoWrapper.classList.add("bloom");
    }, 500);
  }



  // ─── 1. TAB SYSTEM ───────────────────────────────────────
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(`tab-${target}`).classList.add("active");

      if (target === "github") initGitHubTab();
    });
  });

  // ─── 2. PROFILE DATA ENGINE ─────────────────────────────
  const user = window.getDevstageUser();
  if (user) {
    fetchUserProjects(user.id);
    fetchUserActivity(user.id);
    checkGitHubConnection(user.id);

    // Track profile view
    const username = user.username || user.email.split("@")[0];
    trackProfileView(username);
  } else {
    // Auth guard handles redirect for protected pages — do nothing here
    console.log("[DevStage Profile] No canonical user session.");
  }

  // Track profile view
  async function trackProfileView(username) {
    try {
      const cleanUsername = String(username)
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 14);
      await fetch(
        `http://localhost:5000/api/users/view-profile/${cleanUsername}`,
        {
          method: "POST",
        },
      );
    } catch (error) {
      console.error("[DevStage Profile] Error tracking profile view:", error);
    }
  }



  // ─── 3. PROJECTS FEED ───────────────────────────────────
  async function fetchUserProjects(uid) {
    const grid = document.getElementById("user-projects-grid");
    const token = getToken();

    if (!token) {
      console.log("[DevStage Profile] No auth token found");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/projects/my-projects",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (data.success && data.projects.length > 0) {
        grid.innerHTML = "";
        data.projects.forEach((project, index) => {
          // Map MongoDB project structure to Firebase-like structure for UI compatibility
          const firebaseStyleProject = {
            title: project.title,
            description: project.description,
            category: project.status || "Project",
            techStack: project.techStack || [],
            githubUrl: project.githubUrl,
            liveUrl: project.liveUrl,
            thumbnail: project.thumbnail,
            featured: project.featured,
            likes: project.likes,
            views: project.views,
            createdAt: project.createdAt,
          };
          renderProjectCard(firebaseStyleProject, project._id, grid, index);
        });
        lucide.createIcons();
      }
    } catch (error) {
      console.error("[DevStage Profile] Error checking GitHub connection:", error);
    }
  }

  function renderProjectCard(p, id, container, index) {
    const item = document.createElement("div");
    item.className = "project-item";
    item.style.opacity = "0";
    item.style.transform = "translateY(20px)";
    item.style.transition = `all 0.6s ease ${index * 0.1}s`;

    item.innerHTML = `
            <span class="project-index">${String(index + 1).padStart(2, "0")}</span>
            <div class="project-info">
                <p class="project-name">${p.title}</p>
                <p class="project-desc">${p.description || "No description available."}</p>
                <div class="project-actions" style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="analytics-btn" style="padding: 4px 10px; font-size: 11px; background: transparent; border: 1px solid var(--border); color: #fff; cursor: pointer; border-radius: 4px; transition: 0.2s;">Analytics</button>
                    <button class="edit-btn" style="padding: 4px 10px; font-size: 11px; background: transparent; border: 1px solid var(--border); color: #fff; cursor: pointer; border-radius: 4px; transition: 0.2s;">Edit</button>
                    <button class="delete-btn" style="padding: 4px 10px; font-size: 11px; background: transparent; border: 1px solid #c06060; color: #c06060; cursor: pointer; border-radius: 4px; transition: 0.2s;">Delete</button>
                </div>
            </div>
            <div class="project-meta">
                <span class="project-tag">${(p.category || "Project").toUpperCase()}</span>
                <span class="project-arrow">→</span>
            </div>
        `;

    const analyticsBtn = item.querySelector('.analytics-btn');
    const editBtn = item.querySelector('.edit-btn');
    const deleteBtn = item.querySelector('.delete-btn');

    analyticsBtn.onclick = (e) => {
        e.stopPropagation();
        openAnalyticsModal(id, p.title);
    };

    editBtn.onclick = (e) => {
        e.stopPropagation();
        window.location.href = `upload.html?edit=${id}`;
    };

    deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${p.title}"?`)) {
            try {
                const res = await fetch(`http://localhost:5000/api/projects/delete/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': \`Bearer \${getToken()}\` }
                });
                const data = await res.json();
                if (data.success) {
                    item.style.opacity = '0';
                    setTimeout(() => item.remove(), 300);
                } else {
                    alert('Failed to delete project.');
                }
            } catch (err) {
                console.error('Delete error', err);
            }
        }
    };

    item.onclick = async () => {
      // Track project view
      try {
        await fetch(`http://localhost:5000/api/projects/view/${id}`, {
          method: "POST",
        });
      } catch (error) {
        console.error("[DevStage Profile] Error tracking project view:", error);
      }
      window.location.href = `explore.html?id=${id}`;
    };
    container.appendChild(item);
    requestAnimationFrame(() => {
      item.style.opacity = "1";
      item.style.transform = "translateY(0)";
    });
  }

  // ─── 4. GITHUB INTELLIGENCE ─────────────────────────────
  const ghSyncBtn = document.getElementById("gh-sync-btn");
  const ghUsernameInput = document.getElementById("gh-username-input");

  async function checkGitHubConnection(uid) {
    const userDoc = await db.collection("users").doc(uid).get();
    const data = userDoc.data();
    if (data && data.githubUsername) {
      const ghSetup = document.getElementById("gh-setup");
      const ghDisplay = document.getElementById("gh-display");
      const linkGithub = document.getElementById("link-github");

      if (ghSetup) ghSetup.style.display = "none";
      if (ghDisplay) ghDisplay.style.display = "block";
      if (linkGithub)
        linkGithub.href = `https://github.com/${data.githubUsername}`;
      fetchGitHubRepos(data.githubUsername);
    }
  }

  if (ghSyncBtn && ghUsernameInput) {
    ghSyncBtn.addEventListener("click", async () => {
      const username = ghUsernameInput.value.trim();
      if (!username) return;

      const user = window.getDevstageUser();
      if (!user) return;
      await db.collection("users").doc(user.id).set(
        {
          githubUsername: username,
        },
        { merge: true },
      );

      checkGitHubConnection(user.id);
    });
  }

  async function fetchGitHubRepos(username) {
    try {
      const res = await fetch(
        `https://api.github.com/users/${username}/repos?sort=stars&per_page=6`,
      );
      const repos = await res.json();

      const list = document.getElementById("gh-repo-list");
      const repoCountEl = document.getElementById("gh-repo-count");
      if (!list || !repoCountEl) return;
      repoCountEl.innerText = `${repos.length}+ Repos`;

      list.innerHTML = repos
        .map(
          (repo) => `
                <a href="${repo.html_url}" target="_blank" class="repo-item">
                    <div class="repo-info">
                        <h5>${repo.name}</h5>
                        <p>${repo.description || "Public repository"}</p>
                    </div>
                    <div class="repo-stars">
                        <i data-lucide="star"></i>
                        <span>${repo.stargazers_count}</span>
                    </div>
                </a>
            `,
        )
        .join("");
      lucide.createIcons();
    } catch (e) {
      console.error(e);
    }
  }

  // ─── 5. ACTIVITY FEED ────────────────────────────────────
  async function fetchUserActivity(uid) {
    const grid = document.getElementById("contrib-grid");
    const token = getToken();

    if (!grid) return;

    if (!token) {
      console.log("[DevStage Profile] No auth token found");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/activity/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success && data.activities.length > 0) {
        const classMap = {
          project_created: "l4",
          project_updated: "l2",
          project_deleted: "l3",
          featured_project_changed: "l1",
          profile_updated: "l2",
          settings_updated: "l2",
          profile_customized: "l1",
        };

        const cells = data.activities.slice(0, 52).map((activity) => {
          const cellClass = classMap[activity.type] || "l2";
          return `<div class="contrib-cell ${cellClass}" title="${activity.title || "activity"}"></div>`;
        });

        while (cells.length < 52) {
          cells.push('<div class="contrib-cell"></div>');
        }

        grid.innerHTML = cells.join("");
      } else {
        grid.innerHTML = '<p class="empty-msg">No recent activity found.</p>';
      }
    } catch (error) {
      console.error("[DevStage Profile] Error fetching activity:", error);
      grid.innerHTML = '<p class="empty-msg">No recent activity found.</p>';
    }
  }

  // Initialize Lucide icons on load
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  // ─── 7. ANALYTICS MODAL ─────────────────────────────
  window.openAnalyticsModal = async function(projectId, projectTitle) {
      let modal = document.getElementById('analytics-modal');
      if (!modal) {
          modal = document.createElement('div');
          modal.id = 'analytics-modal';
          modal.style.cssText = `
              position: fixed; top: 0; left: 0; width: 100%; height: 100%;
              background: rgba(0,0,0,0.8); z-index: 10000; display: flex;
              align-items: center; justify-content: center; backdrop-filter: blur(5px);
          `;
          modal.innerHTML = \`
              <div style="background: var(--surface); padding: 30px; border-radius: 12px; width: 90%; max-width: 500px; border: 1px solid var(--border);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                      <h3 id="analytics-title" style="margin: 0; font-family: 'Cormorant Garamond', serif; font-size: 24px; color: var(--accent);">Project Analytics</h3>
                      <button id="close-analytics" style="background: transparent; border: none; color: #fff; cursor: pointer; font-size: 18px;">✕</button>
                  </div>
                  <div id="analytics-content" style="color: var(--text-secondary);">Loading...</div>
              </div>
          \`;
          document.body.appendChild(modal);
          document.getElementById('close-analytics').onclick = () => modal.style.display = 'none';
      }
      
      document.getElementById('analytics-title').innerText = \`Analytics: \${projectTitle}\`;
      document.getElementById('analytics-content').innerHTML = 'Loading...';
      modal.style.display = 'flex';

      try {
          const res = await fetch(\`http://localhost:5000/api/projects/analytics/\${projectId}\`, {
              headers: { 'Authorization': \`Bearer \${getToken()}\` }
          });
          const data = await res.json();
          if (data.success && data.analytics) {
              const views = data.views || 0;
              const impressions = data.summary?.totalImpressions || 0;
              const clicks = data.summary?.totalClicks || 0;
              const saves = data.summary?.totalSaves || 0;
              document.getElementById('analytics-content').innerHTML = \`
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                      <div style="background: var(--bg); padding: 15px; border-radius: 8px; text-align: center;">
                          <div style="font-size: 24px; color: #fff;">\${views || 0}</div>
                          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">Total Views</div>
                      </div>
                      <div style="background: var(--bg); padding: 15px; border-radius: 8px; text-align: center;">
                          <div style="font-size: 24px; color: #fff;">\${impressions || 0}</div>
                          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">Impressions</div>
                      </div>
                      <div style="background: var(--bg); padding: 15px; border-radius: 8px; text-align: center;">
                          <div style="font-size: 24px; color: #fff;">\${clicks || 0}</div>
                          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">Clicks</div>
                      </div>
                      <div style="background: var(--bg); padding: 15px; border-radius: 8px; text-align: center;">
                          <div style="font-size: 24px; color: #fff;">\${saves || 0}</div>
                          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">Saves</div>
                      </div>
                  </div>
              \`;
          } else {
              document.getElementById('analytics-content').innerHTML = 'No analytics data available yet.';
          }
      } catch (err) {
          console.error('Analytics error:', err);
          document.getElementById('analytics-content').innerHTML = 'Failed to load analytics.';
      }
  };
});

(function () {
  "use strict";

  function getToken() {
    try {
      const stored = localStorage.getItem("devstage_auth");
      return stored ? JSON.parse(stored).token : "";
    } catch (error) {
      return "";
    }
  }

  function getUsername() {
    const handle = document
      .getElementById("profile-handle")
      ?.textContent?.replace("@", "");
    const user = window.getDevstageUser ? window.getDevstageUser() : null;
    return handle || user?.username || user?.displayName || "";
  }

  async function loadAchievements() {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(
        "http://localhost:5000/api/achievements/me",
        { headers: { Authorization: "Bearer " + token } },
      );
      const data = await response.json();
      if (!data.success) return;
      window.dispatchEvent(
        new CustomEvent("devstage:achievements_loaded", { detail: data }),
      );
      const targets = document.querySelectorAll(
        "[data-achievements-count], .achievements-count",
      );
      targets.forEach(function (el) {
        el.textContent = String(
          data.totalUnlocked || data.achievements?.length || 0,
        );
      });
    } catch (error) {
      console.warn("[DevStage Profile] Achievement load failed:", error);
    }
  }

  async function loadContributions() {
    const username = getUsername();
    if (!username) return;
    try {
      const response = await fetch(
        "http://localhost:5000/api/activity/contributions/" +
          encodeURIComponent(username),
      );
      const data = await response.json();
      if (!data.success) return;
      window.dispatchEvent(
        new CustomEvent("devstage:contributions_loaded", { detail: data }),
      );
      document
        .querySelectorAll("[data-current-streak], .current-streak")
        .forEach(function (el) {
          el.textContent = String(data.currentStreak || 0);
        });
      document
        .querySelectorAll("[data-total-contributions], .total-contributions")
        .forEach(function (el) {
          el.textContent = String(data.totalContributions || 0);
        });
    } catch (error) {
      console.warn("[DevStage Profile] Contribution load failed:", error);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadAchievements();
    setTimeout(loadContributions, 800);
  });

  window.addEventListener("devstage:achievement", loadAchievements);
  window.addEventListener("devstage:presence", loadContributions);
})();
