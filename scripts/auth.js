import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCVetFMH6RBpDVDrX20OsrhxK8Z4m-PmIg",
    authDomain: "devstage-872b1.firebaseapp.com",
    projectId: "devstage-872b1",
    storageBucket: "devstage-872b1.firebasestorage.app",
    messagingSenderId: "993834630425",
    appId: "1:993834630425:web:b063407a7d47a0830d5988",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

window.auth = auth;
if (!window.db) {
    window.db = db;
}

const DEVSTAGE_AUTH_KEY = "devstage_auth";
const DEVSTAGE_USER_CACHE_KEY = "devstage_user_cache";
const DEVSTAGE_NOTIFICATIONS_KEY = "devstage_notifications";
const DEVSTAGE_MESSAGES_KEY = "devstage_messages_cache";
const DEVSTAGE_WORKSPACE_KEY = "devstage_workspace_cache";
const DEVSTAGE_COLLABORATION_KEY = "devstage_collaboration_cache";

function getStoredToken() {
    try {
        const token = localStorage.getItem("token");
        if (token) return token;
        const stored = localStorage.getItem(DEVSTAGE_AUTH_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.token) return parsed.token;
        }
    } catch (e) {
        console.warn("[DevStage Auth] Failed to parse stored auth token:", e);
    }
    return "";
}

function cacheAuthSession(token, user, provider) {
    if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem(
            DEVSTAGE_AUTH_KEY,
            JSON.stringify({ token, savedAt: Date.now() }),
        );
    }
    if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("currentUser", JSON.stringify(user));
        localStorage.setItem(DEVSTAGE_USER_CACHE_KEY, JSON.stringify(user));
    }
    localStorage.setItem("isLoggedIn", "true");
    if (provider) {
        localStorage.setItem("authProvider", provider);
    }
    try {
        window.dispatchEvent(
            new CustomEvent("devstage:auth_changed", {
                detail: { loggedIn: true, token, user },
            }),
        );
    } catch (error) {
        console.warn("[DevStage Auth] auth_changed dispatch failed:", error);
    }
}

function clearAuthSession() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("devstageUser");
    localStorage.removeItem("devstageMockAccount");
    localStorage.removeItem(DEVSTAGE_AUTH_KEY);
    localStorage.removeItem(DEVSTAGE_USER_CACHE_KEY);
    localStorage.removeItem(DEVSTAGE_NOTIFICATIONS_KEY);
    localStorage.removeItem(DEVSTAGE_MESSAGES_KEY);
    localStorage.removeItem(DEVSTAGE_WORKSPACE_KEY);
    localStorage.removeItem(DEVSTAGE_COLLABORATION_KEY);
    localStorage.removeItem("authProvider");
    try {
        window.dispatchEvent(
            new CustomEvent("devstage:auth_changed", { detail: { loggedIn: false } }),
        );
    } catch (error) {
        console.warn("[DevStage Auth] auth_changed dispatch failed:", error);
    }
}

async function devstageApi(path, options = {}) {
    const token = getStoredToken();
    const headers = {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };
    const response = await fetch(`http://localhost:5000${path}`, {
        ...options,
        headers,
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || "Request failed");
    }
    return data;
}

async function presenceRequest(endpoint) {
    const token = getStoredToken();
    if (!token) return;
    try {
        await fetch(`http://localhost:5000/api/presence/${endpoint}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch (error) {
        console.warn("[DevStage Presence] Update failed:", error);
    }
}

function syncNavbarUser(user) {
    if (!user) return;
    const displayName =
        user.displayName || user.username || user.fullName || "User";
    const avatarUrl =
        user.profilePhoto ||
        user.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=c8b89a&color=0b0b0b`;

    localStorage.setItem(DEVSTAGE_USER_CACHE_KEY, JSON.stringify(user));
    localStorage.setItem(
        "devstageUser",
        JSON.stringify({
            displayName,
            email: user.email,
            uid: user.id || user._id || user.uid,
            photoURL: avatarUrl,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen,
        }),
    );

    document.querySelectorAll("#navAvatar, #dropdown-avatar").forEach((img) => {
        if (img.tagName === "IMG") img.src = avatarUrl;
    });
    document.querySelectorAll("#navName, #dropdown-user-name").forEach((el) => {
        el.textContent = displayName;
    });
    document.querySelectorAll("#dropdown-user-email").forEach((el) => {
        el.textContent = user.email || "";
    });
}

function updateNotificationBadge(unreadCount) {
    document
        .querySelectorAll(
            "#notification-count, #notification-badge, .notification-badge, [data-notification-count]",
        )
        .forEach((el) => {
            el.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
            el.style.display = unreadCount > 0 ? "" : "none";
        });
}

function renderNotificationList(notifications) {
    const list = document.querySelector(
        "#notification-list, .notification-list, [data-notification-list]",
    );
    if (!list) return;
    list.innerHTML = "";
    notifications.slice(0, 10).forEach((notification) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "dropdown-item nav-item-anim";
        item.dataset.notificationId = notification.id;
        item.textContent = `${notification.title}: ${notification.message}`;
        item.addEventListener("click", () => markNotificationRead(notification.id));
        list.appendChild(item);
    });
}

async function loadNotifications() {
    const token = getStoredToken();
    if (!token) return;
    try {
        const response = await fetch(
            "http://localhost:5000/api/notifications/me?limit=20", {
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        const data = await response.json();
        if (!response.ok || !data.success)
            throw new Error(data.message || "Notification load failed");
        localStorage.setItem(
            DEVSTAGE_NOTIFICATIONS_KEY,
            JSON.stringify(data.notifications),
        );
        updateNotificationBadge(data.unreadCount || 0);
        renderNotificationList(data.notifications || []);
    } catch (error) {
        console.warn("[DevStage Notifications] Load failed:", error);
    }
}

async function markNotificationRead(id) {
    const token = getStoredToken();
    if (!token || !id) return;
    try {
        const response = await fetch(
            `http://localhost:5000/api/notifications/read/${id}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        const data = await response.json();
        if (data.success) {
            updateNotificationBadge(data.unreadCount || 0);
            loadNotifications();
        }
    } catch (error) {
        console.warn("[DevStage Notifications] Mark read failed:", error);
    }
}

async function deleteNotification(id) {
    const token = getStoredToken();
    if (!token || !id) return;
    try {
        const response = await fetch(
            `http://localhost:5000/api/notifications/delete/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        const data = await response.json();
        if (data.success) {
            updateNotificationBadge(data.unreadCount || 0);
            loadNotifications();
        }
    } catch (error) {
        console.warn("[DevStage Notifications] Delete failed:", error);
    }
}

async function markAllNotificationsRead() {
    const token = getStoredToken();
    if (!token) return;
    try {
        const response = await fetch(
            "http://localhost:5000/api/notifications/read-all", {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        const data = await response.json();
        if (data.success) {
            updateNotificationBadge(0);
            loadNotifications();
        }
    } catch (error) {
        console.warn("[DevStage Notifications] Mark all read failed:", error);
    }
}

window.devstageSyncUser = syncNavbarUser;
window.devstageLoadNotifications = loadNotifications;
window.devstageMarkNotificationRead = markNotificationRead;
window.devstageDeleteNotification = deleteNotification;
window.devstageMarkAllNotificationsRead = markAllNotificationsRead;

async function toggleFollow(userId, button) {
    const token = getStoredToken();
    if (!token || !userId) return;
    const isFollowing = button?.classList.contains("following");
    const endpoint = isFollowing ?
        `http://localhost:5000/api/unfollow/${userId}` :
        `http://localhost:5000/api/follow/${userId}`;

    if (button) {
        button.classList.toggle("following", !isFollowing);
        button.textContent = isFollowing ? "Follow" : "Following";
    }

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data.success)
            throw new Error(data.message || "Follow update failed");
        document.querySelectorAll("[data-followers-count]").forEach((el) => {
            el.textContent = data.followerCount;
        });
        loadNotifications();
    } catch (error) {
        if (button) {
            button.classList.toggle("following", isFollowing);
            button.textContent = isFollowing ? "Following" : "Follow";
        }
        alert(error.message || "Unable to update follow state");
    }
}

function bindFollowButtons() {
    document
        .querySelectorAll(".follow-btn, [data-follow-user-id]")
        .forEach((button) => {
            if (button.dataset.followBound === "true") return;
            button.dataset.followBound = "true";
            button.addEventListener("click", () => {
                const userId = button.dataset.userId || button.dataset.followUserId;
                if (userId) toggleFollow(userId, button);
            });
        });
}

function bindUserSearch() {
    document
        .querySelectorAll("#feed-search, #command-search-input, [data-user-search]")
        .forEach((input) => {
            if (input.dataset.userSearchBound === "true") return;
            input.dataset.userSearchBound = "true";
            let timer;
            input.addEventListener("input", () => {
                clearTimeout(timer);
                const q = input.value.trim();
                if (q.length < 2) return;
                timer = setTimeout(async() => {
                    try {
                        const response = await fetch(
                            `http://localhost:5000/api/search/users?q=${encodeURIComponent(q)}`,
                        );
                        const data = await response.json();
                        if (data.success) {
                            window.devstageUserSearchResults = data.users;
                            window.dispatchEvent(
                                new CustomEvent("devstage:user-search", { detail: data.users }),
                            );
                        }
                    } catch (error) {
                        console.warn("[DevStage Search] User lookup failed:", error);
                    }
                }, 220);
            });
        });
}

function bindNotificationControls() {
    document
        .querySelectorAll("[data-notification-read-all], #notification-read-all")
        .forEach((button) => {
            if (button.dataset.notificationBound === "true") return;
            button.dataset.notificationBound = "true";
            button.addEventListener("click", markAllNotificationsRead);
        });
    document
        .querySelectorAll("[data-delete-notification-id]")
        .forEach((button) => {
            if (button.dataset.notificationBound === "true") return;
            button.dataset.notificationBound = "true";
            button.addEventListener("click", () =>
                deleteNotification(button.dataset.deleteNotificationId),
            );
        });
}

function bindCollaborationControls() {
    document
        .querySelectorAll(
            "[data-collaboration-project-id], .teamup-btn, .join-team-btn",
        )
        .forEach((button) => {
            if (button.dataset.collaborationBound === "true") return;
            button.dataset.collaborationBound = "true";
            button.addEventListener("click", () => {
                const projectId =
                    button.dataset.collaborationProjectId || button.dataset.projectId;
                const receiverId = button.dataset.receiverId;
                if (!projectId) return;
                sendCollaborationRequest({
                    projectId,
                    receiverId,
                    message: button.dataset.message || "",
                }).catch((error) =>
                    alert(error.message || "Unable to send collaboration request"),
                );
            });
        });
}

function bindMessageControls() {
    document.querySelectorAll("[data-message-recipient-id]").forEach((button) => {
        if (button.dataset.messageBound === "true") return;
        button.dataset.messageBound = "true";
        button.addEventListener("click", () => {
            const recipientId = button.dataset.messageRecipientId;
            if (!recipientId) return;
            startDevstageConversation({ recipientId }).catch((error) =>
                alert(error.message || "Unable to start conversation"),
            );
        });
    });
}

async function loadMessageConversations() {
    const data = await devstageApi("/api/messages/conversations");
    localStorage.setItem(
        DEVSTAGE_MESSAGES_KEY,
        JSON.stringify(data.conversations || []),
    );
    window.dispatchEvent(
        new CustomEvent("devstage:messages-updated", {
            detail: data.conversations || [],
        }),
    );
    return data.conversations || [];
}

async function sendDevstageMessage(payload) {
    const data = await devstageApi("/api/messages/send", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    loadMessageConversations().catch(() => {});
    loadNotifications();
    return data;
}

async function startDevstageConversation(payload) {
    const data = await devstageApi("/api/messages/start", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    loadMessageConversations().catch(() => {});
    return data;
}

async function loadCollaborationRequests() {
    const [incoming, outgoing] = await Promise.all([
        devstageApi("/api/collaboration/incoming"),
        devstageApi("/api/collaboration/outgoing"),
    ]);
    const cache = {
        incoming: incoming.requests || [],
        outgoing: outgoing.requests || [],
    };
    localStorage.setItem(DEVSTAGE_COLLABORATION_KEY, JSON.stringify(cache));
    window.dispatchEvent(
        new CustomEvent("devstage:collaboration-updated", { detail: cache }),
    );
    return cache;
}

async function sendCollaborationRequest(payload) {
    const data = await devstageApi("/api/collaboration/send", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    loadCollaborationRequests().catch(() => {});
    loadNotifications();
    return data;
}

async function resolveCollaborationRequest(id, action) {
    const data = await devstageApi(`/api/collaboration/${action}/${id}`, {
        method: "PUT",
    });
    loadCollaborationRequests().catch(() => {});
    loadNotifications();
    return data;
}

async function loadWorkspaces() {
    const data = await devstageApi("/api/workspaces/my-workspaces");
    localStorage.setItem(
        DEVSTAGE_WORKSPACE_KEY,
        JSON.stringify(data.workspaces || []),
    );
    window.dispatchEvent(
        new CustomEvent("devstage:workspaces-updated", {
            detail: data.workspaces || [],
        }),
    );
    return data.workspaces || [];
}

async function createWorkspace(payload) {
    const data = await devstageApi("/api/workspaces/create", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    loadWorkspaces().catch(() => {});
    return data;
}

window.devstageMessages = {
    loadConversations: loadMessageConversations,
    startConversation: startDevstageConversation,
    sendMessage: sendDevstageMessage,
    markRead: (conversationId) =>
        devstageApi(`/api/messages/read/${conversationId}`, { method: "PUT" }),
};

window.devstageCollaboration = {
    load: loadCollaborationRequests,
    send: sendCollaborationRequest,
    accept: (id) => resolveCollaborationRequest(id, "accept"),
    reject: (id) => resolveCollaborationRequest(id, "reject"),
};

window.devstageWorkspaces = {
    load: loadWorkspaces,
    create: createWorkspace,
    get: (id) => devstageApi(`/api/workspaces/${id}`),
    addMember: (payload) =>
        devstageApi("/api/workspaces/add-member", {
            method: "PUT",
            body: JSON.stringify(payload),
        }),
    removeMember: (payload) =>
        devstageApi("/api/workspaces/remove-member", {
            method: "PUT",
            body: JSON.stringify(payload),
        }),
    changeRole: (payload) =>
        devstageApi("/api/workspaces/change-role", {
            method: "PUT",
            body: JSON.stringify(payload),
        }),
    delete: (id) =>
        devstageApi(`/api/workspaces/delete/${id}`, { method: "DELETE" }),
};

// ─── GLOBAL USER UI LOADER ───
window.loadUserUI = function() {
    let cachedUser = null;
    try {
        cachedUser = JSON.parse(
            localStorage.getItem("devstageUser") ||
            localStorage.getItem(DEVSTAGE_USER_CACHE_KEY) ||
            "null",
        );
    } catch (e) {
        console.warn("[DevStage Auth] Failed to parse cached user:", e);
    }

    const guestSection = document.getElementById("guestSection");
    const userSection = document.getElementById("userSection");
    const navAvatar = document.getElementById("navAvatar");
    const navName = document.getElementById("navName");
    const dropdownName = document.getElementById("dropdown-user-name");
    const dropdownEmail = document.getElementById("dropdown-user-email");
    const dropdownAvatar = document.getElementById("dropdown-avatar");
    if (!cachedUser) {
        if (guestSection) guestSection.style.display = "flex";
        if (userSection) userSection.style.display = "none";
        return;
    }

    // Populate UI
    if (guestSection) guestSection.style.display = "none";
    if (userSection) userSection.style.display = "flex";

    const avatarUrl =
        cachedUser.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(cachedUser.displayName || "User")}&background=c8b89a&color=0b0b0b`;

    if (navAvatar) navAvatar.src = avatarUrl;
    if (navName) navName.textContent = cachedUser.displayName || "User";
    if (dropdownName) dropdownName.textContent = cachedUser.displayName || "User";
    if (dropdownEmail) dropdownEmail.textContent = cachedUser.email || "";
    if (dropdownAvatar) dropdownAvatar.src = avatarUrl;
};

document.addEventListener("DOMContentLoaded", () => {
    console.log("[DevStage Auth] Initializing authentication module...");

    function handleInvalidToken() {
        clearAuthSession();
        const isInsidePages = window.location.pathname.includes("/pages/");
        const redirectUrl = isInsidePages ? "../index.html" : "index.html";
        window.location.replace(redirectUrl);
    }

    function injectProfileUI(user) {
        // 1. Sidebar name
        const nameEl = document.querySelector(".sidebar .name");
        if (nameEl) nameEl.textContent = user.username;

        // 2. Sidebar handle
        const handleEl = document.querySelector(".sidebar .handle");
        if (handleEl) {
            handleEl.textContent =
                "@" + user.username.toLowerCase().replace(/\s+/g, "");
        }

        // 3. Sidebar email
        const emailMetaItem = document.querySelector("#profile-email-sidebar");
        if (emailMetaItem) {
            emailMetaItem.textContent = user.email;
        }

        // 4. Contact email values (under Contact tab)
        const contactEmailVal = document.querySelector(".contact-email-val");
        if (contactEmailVal) contactEmailVal.textContent = user.email;

        // 5. Contact copy button data-copy
        document.querySelectorAll(".copy-btn").forEach((btn) => {
            if (
                btn.dataset.copy &&
                (btn.dataset.copy.includes("@") || btn.dataset.copy === "")
            ) {
                btn.dataset.copy = user.email;
                btn.setAttribute("data-copy", user.email);
            }
        });

        // 6. Sidebar avatar initials
        const avatarEl = document.querySelector(".sidebar .avatar");
        const initials = user.username ?
            user.username
            .trim()
            .split(/\s+/)
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) :
            "U";
        if (avatarEl) avatarEl.textContent = initials;

        // 7. Preview card avatar initials
        const previewAvatar = document.querySelector(".preview-avatar");
        if (previewAvatar) previewAvatar.textContent = initials;

        // 8. Preview card name
        const previewName = document.querySelector(".preview-name");
        if (previewName) previewName.textContent = user.username;

        // 9. Document title
        document.title = `${user.username} — Designer & Developer`;

        // 10. Update reveal-wordmark text content if exists
        const wordmarkEl = document.getElementById("reveal-wordmark");
        if (wordmarkEl) wordmarkEl.textContent = user.username;
    }

    // Protected page authentication check
    const protectedPages = ["profile.html", "dashboard.html", "settings.html"];
    const currentPage = window.location.pathname.split("/").pop();

    function checkAuth() {
        console.log("DEBUG - checkAuth called. currentPage:", currentPage);
        console.log("DEBUG - token:", localStorage.getItem("token"));
        console.log("DEBUG - user:", localStorage.getItem("user"));
        console.log("DEBUG - devstageUser:", localStorage.getItem("devstageUser"));

        if (!protectedPages.includes(currentPage)) return;

        const token = getStoredToken();
        const user =
            localStorage.getItem("user") ||
            localStorage.getItem(DEVSTAGE_USER_CACHE_KEY);
        
        let cachedDevstageUser = null;
        try {
            cachedDevstageUser = JSON.parse(
                localStorage.getItem("devstageUser") || "null",
            );
        } catch (e) {
            console.warn("[DevStage Auth] Failed to parse devstageUser:", e);
        }

        // Google / Firebase session
        const authProvider = localStorage.getItem("authProvider");
        const isFirebaseSession =
            authProvider === "google" ||
            (!authProvider &&
             cachedDevstageUser &&
             cachedDevstageUser.uid &&
             !cachedDevstageUser.uid.startsWith("mock-") &&
             !/^[0-9a-fA-F]{24}$/.test(cachedDevstageUser.uid));

        if (isFirebaseSession) {
            console.log(
                "[DevStage Auth] Firebase session detected. Deferring to onAuthStateChanged.",
            );
            return;
        }

        // Mock session
        if (
            cachedDevstageUser &&
            cachedDevstageUser.uid &&
            cachedDevstageUser.uid.startsWith("mock-")
        ) {
            console.log(
                "[DevStage Auth] Mock session active. Skipping backend check.",
            );
            injectProfileUI({
                username: cachedDevstageUser.displayName || "Mock User",
                email: cachedDevstageUser.email || "mock@example.com",
            });
            return;
        }

        // Backend JWT session
        if (!token || !user) {
            console.log("[DevStage Auth] No auth found. Redirecting to login.");
            handleInvalidToken();
            return;
        }

        console.log("[DevStage Auth] Verifying backend JWT token...");
        fetch("http://localhost:5000/api/auth/me", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Invalid token or server error");
                }
                return response.json();
            })
            .then((data) => {
                if (!data.success || !data.user) {
                    throw new Error("User authentication failed");
                }

                const backendUser = data.user;
                console.log(
                    "[DevStage Auth] User authenticated via backend:",
                    backendUser.username,
                );

                // Sync user data to local storage
                cacheAuthSession(token, backendUser, "local");

                const devstageUserData = {
                    displayName: backendUser.username,
                    email: backendUser.email,
                    uid: backendUser.id,
                    photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(backendUser.username)}&background=c8b89a&color=0b0b0b`,
                };
                window.currentUser = devstageUserData;
                syncNavbarUser({
                    ...backendUser,
                    displayName: backendUser.displayName || backendUser.username,
                    photoURL: devstageUserData.photoURL,
                });

                window.loadUserUI();
                presenceRequest("online");
                loadNotifications();

                if (currentPage === "profile.html") {
                    injectProfileUI(backendUser);
                }
            })
            .catch((error) => {
                console.error("[DevStage Auth] Backend verification failed:", error);
                handleInvalidToken();
            });
    }

    checkAuth();

    // Auth page redirect removed — do NOT auto-redirect logged-in users away from auth pages.

    window.loadUserUI();
    loadNotifications();
    loadMessageConversations().catch(() => {});
    loadCollaborationRequests().catch(() => {});
    loadWorkspaces().catch(() => {});
    bindFollowButtons();
    bindUserSearch();
    bindNotificationControls();
    bindCollaborationControls();
    bindMessageControls();
    if (getStoredToken()) {
        presenceRequest("online");
        setInterval(() => presenceRequest("heartbeat"), 60000);
    }

    const authForm = document.getElementById("auth-form");
    const authSubmitBtn = document.getElementById("auth-submit-btn");
    const authMessage = document.getElementById("auth-message");
    const loginBtn = document.getElementById("loginBtn");
    const signupBtn = document.getElementById("signupBtn");
    const authModal = document.getElementById("auth-modal");
    const authCard = document.getElementById("auth-card");
    const authTitle = document.getElementById("auth-title");
    const authToggleText = document.getElementById("auth-toggle-text");
    const closeAuthModal = document.getElementById("close-auth-modal");

    let isLoginMode = true;

    function isMockSession(userData) {
        return userData?.uid && String(userData.uid).startsWith("mock-");
    }

    // ─── 2. AUTH STATE CHANGE LISTENER ───
    onAuthStateChanged(auth, async(user) => {
        if (user) {
            console.log("[DevStage] Global Auth: User Found", user.email);

            // Get token and save to localStorage for unified auth persistence
            try {
                const token = await user.getIdToken();

                const userDataForLocalStorage = {
                    id: user.uid,
                    username: user.displayName || user.email.split("@")[0],
                    email: user.email,
                    fullName: user.displayName || "",
                    photoURL: user.photoURL ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "User")}&background=c8b89a&color=0b0b0b`,
                    profileImage: user.photoURL ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "User")}&background=c8b89a&color=0b0b0b`,
                };
                cacheAuthSession(token, userDataForLocalStorage, "google");
            } catch (e) {
                console.error("Error retrieving Firebase ID token:", e);
            }

            const userData = {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                uid: user.uid,
                joined: user.metadata.creationTime,
            };
            localStorage.setItem("devstageUser", JSON.stringify(userData));
            window.currentUser = userData;
            syncNavbarUser(userData);
            window.loadUserUI();
            presenceRequest("online");
            loadNotifications();

            if (
                protectedPages.includes(currentPage) &&
                currentPage === "profile.html"
            ) {
                injectProfileUI({
                    username: user.displayName || user.email.split("@")[0],
                    email: user.email,
                });
            }
        } else {
            let cached = null;
            try {
                cached = JSON.parse(localStorage.getItem("devstageUser") || "null");
            } catch (e) {
                console.warn("[DevStage Auth] Failed to parse devstageUser:", e);
            }

            const authProvider = localStorage.getItem("authProvider");
            const wasFirebaseSession =
                authProvider === "google" ||
                (!authProvider &&
                 cached &&
                 cached.uid &&
                 !cached.uid.startsWith("mock-") &&
                 !/^[0-9a-fA-F]{24}$/.test(cached.uid));

            if (wasFirebaseSession) {
                console.log("[DevStage Auth] Firebase session expired or user logged out.");
                if (protectedPages.includes(currentPage)) {
                    handleInvalidToken();
                } else {
                    clearAuthSession();
                    window.currentUser = null;
                    window.loadUserUI();
                }
                return;
            }

            if (cached && (isMockSession(cached) || (authProvider === "local" && localStorage.getItem("token")))) {
                window.currentUser = cached;
                window.loadUserUI();
                return;
            }
            console.log("[DevStage] Global Auth: No Session");
            if (protectedPages.includes(currentPage)) {
                handleInvalidToken();
            } else {
                clearAuthSession();
                window.currentUser = null;
                window.loadUserUI();
            }
        }
    });

    const provider = new GoogleAuthProvider();

    window.loginWithGoogle = function() {
        signInWithPopup(auth, provider)
            .then(async(result) => {
                const user = result.user;
                console.log("Google login success");

                const token = await user.getIdToken();

                const userData = {
                    id: user.uid,
                    username: user.displayName || user.email.split("@")[0],
                    email: user.email,
                    fullName: user.displayName || "",
                    photoURL: user.photoURL ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "User")}&background=c8b89a&color=0b0b0b`,
                    profileImage: user.photoURL ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "User")}&background=c8b89a&color=0b0b0b`,
                };
                cacheAuthSession(token, userData, "google");
                console.log("User stored:", userData);

                saveUserToFirestore(user);

                // Sync devstageUser with the newly logged in user details to populate global UI
                const devstageUserData = {
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    uid: user.uid,
                    joined: user.metadata.creationTime,
                };
                localStorage.setItem("devstageUser", JSON.stringify(devstageUserData));
                window.currentUser = devstageUserData;
                syncNavbarUser(devstageUserData);
                presenceRequest("online");

                console.log("Redirecting to profile page");
                const isInsidePages = window.location.pathname.includes("/pages/");
                const redirectUrl = isInsidePages ?
                    "profile.html" :
                    "pages/profile.html";
                window.location.href = redirectUrl;
            })
            .catch((error) => {
                console.error("Login error:", error);
                if (authMessage) showMessage("Login failed: " + error.message, "error");
            });
    };

    async function saveUserToFirestore(user) {
        const userRef = doc(db, "users", user.uid);
        try {
            const docSnap = await getDoc(userRef);
            if (!docSnap.exists()) {
                await setDoc(
                    userRef, {
                        uid: user.uid,
                        name: user.displayName || "Anonymous",
                        email: user.email,
                        avatar: user.photoURL ||
                            `https://ui-avatars.com/api/?name=${user.displayName}`,
                        createdAt: serverTimestamp(),
                    }, { merge: true },
                );
            }
        } catch (error) {
            console.error("Firestore Sync Error:", error);
        }
    }

    window.openLoginModal = (mode = "login") => {
        if (!authModal) return;
        isLoginMode = mode === "login";

        authCard?.classList.toggle("auth-mode-login", isLoginMode);
        authCard?.classList.toggle("auth-mode-signup", !isLoginMode);

        // Update header text
        if (authTitle) authTitle.innerText = isLoginMode ? "Log in" : "Sign Up";
        if (authSubmitBtn && authSubmitBtn.querySelector("span")) {
            authSubmitBtn.querySelector("span").innerText = isLoginMode ?
                "Enter" :
                "Create";
        }

        // Update footer toggle text
        if (authToggleText) {
            authToggleText.innerHTML = isLoginMode ?
                'Don\'t have an account? <a href="#" class="toggle-auth-link">Sign Up</a>' :
                'Already have an account? <a href="#" class="toggle-auth-link">Login</a>';

            // Re-attach event listener to the new toggle link
            const toggleLinks = document.querySelectorAll(".toggle-auth-link");
            toggleLinks.forEach((link) => {
                link.addEventListener("click", (e) => {
                    e.preventDefault();
                    window.openLoginModal(isLoginMode ? "signup" : "login");
                });
            });
        }

        // Clear form and messages
        if (authForm) authForm.reset();
        if (authMessage) authMessage.innerText = "";
        if (authMessage) authMessage.className = "auth-message";

        // Show modal
        if (authCard) authCard.classList.remove("fade-out");
        authModal.classList.add("active");
        document.body.style.overflow = "hidden";
        document.body.classList.add("modal-open");

        if (window.lucide) lucide.createIcons();

        // Focus on first field
        setTimeout(() => {
            const firstInput = isLoginMode ?
                document.getElementById("auth-email") :
                document.getElementById("auth-fullname");
            if (firstInput) firstInput.focus();
        }, 300);
    };

    function closeModal() {
        if (!authModal) return;
        const authCard = document.getElementById("auth-card");
        if (authCard) {
            authCard.classList.add("fade-out");
            setTimeout(() => {
                authModal.classList.remove("active");
                authCard.classList.remove("fade-out");
                document.body.style.overflow = "";
                document.body.classList.remove("modal-open");
            }, 280);
        } else {
            authModal.classList.remove("active");
            document.body.style.overflow = "";
            document.body.classList.remove("modal-open");
        }
    }

    closeAuthModal?.addEventListener("click", closeModal);

    function saveMockSession(userData) {
        localStorage.setItem("devstageUser", JSON.stringify(userData));
        window.currentUser = userData;
        window.loadUserUI();
    }

    function completeMockAuth(userData, successText) {
        localStorage.setItem("authProvider", "mock");
        saveMockSession(userData);
        showMessage(successText, "success");
        setTimeout(() => closeModal(), 600);
    }

    // ─── FORM SUBMISSION HANDLER (demo / mock when email auth backend unavailable) ───
    if (authForm) {
        authForm.addEventListener("submit", async(e) => {
            e.preventDefault();

            const email = document.getElementById("auth-email")?.value.trim();
            const password = document.getElementById("auth-password")?.value;

            if (!email || !password) {
                showMessage("Please fill in all required fields", "error");
                return;
            }

            try {
                if (isLoginMode) {
                    let stored = null;
                    try {
                        stored = JSON.parse(
                            localStorage.getItem("devstageMockAccount") || "null",
                        );
                    } catch (e) {
                        console.warn("[DevStage Auth] Failed to parse mock account:", e);
                    }
                    if (
                        stored &&
                        stored.email === email &&
                        stored.password !== password
                    ) {
                        showMessage("Incorrect password", "error");
                        return;
                    }

                    const displayName = stored?.displayName || email.split("@")[0];
                    completeMockAuth({
                            displayName,
                            email,
                            photoURL: stored?.photoURL ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=c8b89a&color=0b0b0b`,
                            uid: stored?.uid || `mock-${email}`,
                            joined: stored?.joined || new Date().toISOString(),
                        },
                        "Welcome back!",
                    );
                } else {
                    const fullname = document
                        .getElementById("auth-fullname")
                        ?.value.trim();
                    const username = document
                        .getElementById("auth-username")
                        ?.value.trim();
                    const confirmPassword = document.getElementById(
                        "auth-confirm-password",
                    )?.value;

                    if (!fullname || !username || !confirmPassword) {
                        showMessage("Please fill in all required fields", "error");
                        return;
                    }

                    if (password !== confirmPassword) {
                        showMessage("Passwords do not match", "error");
                        return;
                    }

                    if (password.length < 6) {
                        showMessage("Password must be at least 6 characters", "error");
                        return;
                    }

                    const photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullname)}&background=c8b89a&color=0b0b0b`;
                    const mockAccount = {
                        displayName: fullname,
                        username,
                        email,
                        password,
                        photoURL,
                        uid: `mock-${Date.now()}`,
                        joined: new Date().toISOString(),
                    };
                    localStorage.setItem(
                        "devstageMockAccount",
                        JSON.stringify(mockAccount),
                    );
                    completeMockAuth({
                            displayName: fullname,
                            email,
                            photoURL,
                            uid: mockAccount.uid,
                            joined: mockAccount.joined,
                        },
                        "Account created successfully!",
                    );
                }
            } catch (error) {
                showMessage("An error occurred: " + error.message, "error");
            }
        });
    }

    // ─── TOGGLE AUTH MODE LINK ───
    const toggleAuthLink = document.getElementById("toggle-auth");
    if (toggleAuthLink) {
        toggleAuthLink.addEventListener("click", (e) => {
            e.preventDefault();
            window.openLoginModal(isLoginMode ? "signup" : "login");
        });
    }

    // ─── CLOSE MODAL ON ESC ───
    document.addEventListener("keydown", (e) => {
        if (
            e.key === "Escape" &&
            authModal &&
            authModal.classList.contains("active")
        ) {
            closeModal();
        }
    });

    // ─── CLOSE MODAL ON BACKDROP CLICK ───
    if (authModal) {
        authModal.addEventListener("click", (e) => {
            if (e.target === authModal) {
                closeModal();
            }
        });
    }

    document.querySelectorAll(".forgot-password-link").forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            showMessage(
                "Password reset is not connected yet. Use demo login or Google.",
                "error",
            );
        });
    });

    loginBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        window.openLoginModal("login");
    });

    signupBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        window.openLoginModal("signup");
    });

    if (loginBtn && signupBtn) {
        console.log("[DevStage Auth] Login & Sign Up buttons initialized");
    } else {
        console.warn(
            "[DevStage Auth] Warning: Login or Sign Up button not found in DOM",
        );
    }

    document.getElementById("google-login-btn")?.addEventListener("click", () => {
        window.loginWithGoogle();
    });

    document.getElementById("github-login-btn")?.addEventListener("click", () => {
        const name = isLoginMode ? "GitHub User" : "New GitHub User";
        completeMockAuth({
                displayName: name,
                email: "github.user@devstage.demo",
                photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0b0b0b&color=f5f2ec`,
                uid: `mock-github-${Date.now()}`,
                joined: new Date().toISOString(),
            },
            "Signed in with GitHub",
        );
    });

    function showMessage(text, type) {
        if (authMessage) {
            authMessage.innerText = text;
            authMessage.className = `auth-message ${type}`;
        }
    }

    const logoutBtns = document.querySelectorAll(".logout-btn");
    logoutBtns.forEach((btn) => {
        btn.addEventListener("click", async(e) => {
            e.preventDefault();
            try {
                await presenceRequest("offline");
                clearAuthSession();
                if (auth) {
                    await signOut(auth);
                }
            } catch (error) {
                console.error("Logout failed:", error);
            } finally {
                const isInsidePages = window.location.pathname.includes("/pages/");
                const redirectUrl = isInsidePages ? "../index.html" : "index.html";
                window.location.replace(redirectUrl);
            }
        });
    });

    const userProfile = document.getElementById("user-profile");
    const userSection = document.getElementById("userSection");
    const profileDropdown = document.getElementById("profile-dropdown");

    const closeProfileDropdown = () => {
        if (userSection) userSection.classList.remove("active");
        if (profileDropdown) profileDropdown.classList.remove("active");
    };

    const adjustProfileDropdownPosition = () => {
        if (!profileDropdown || !profileDropdown.classList.contains("active"))
            return;

        profileDropdown.style.top = "";
        profileDropdown.style.bottom = "";
        profileDropdown.style.right = "0";
        profileDropdown.style.left = "";

        const rect = profileDropdown.getBoundingClientRect();
        const pad = 12;

        if (rect.right > window.innerWidth - pad) {
            profileDropdown.style.right = "0";
        }
        if (rect.left < pad) {
            profileDropdown.style.right = "auto";
            profileDropdown.style.left = "0";
        }
        if (rect.bottom > window.innerHeight - pad) {
            profileDropdown.style.top = "auto";
            profileDropdown.style.bottom = "calc(100% + 10px)";
        }
    };

    userProfile?.addEventListener("click", (e) => {
        e.stopPropagation();
        userSection?.classList.toggle("active");
        profileDropdown?.classList.toggle("active");
        if (profileDropdown?.classList.contains("active")) {
            if (window.lucide) lucide.createIcons();
            requestAnimationFrame(adjustProfileDropdownPosition);
        }
    });

    window.addEventListener("resize", adjustProfileDropdownPosition);

    // Close dropdown when clicking outside (but not on the dropdown itself or profile button)
    document.addEventListener("click", (e) => {
        const isClickOnProfile = userProfile && userProfile.contains(e.target);
        const isClickInDropdown =
            profileDropdown && profileDropdown.contains(e.target);

        if (!isClickOnProfile && !isClickInDropdown && userSection) {
            closeProfileDropdown();
        }
    });

    // Add click handler to dropdown items to navigate and close
    if (profileDropdown) {
        const dropdownLinks = profileDropdown.querySelectorAll("a.dropdown-item");
        dropdownLinks.forEach((link) => {
            link.addEventListener("click", () => {
                // Close dropdown when clicking a link
                setTimeout(() => closeProfileDropdown(), 100);
            });
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" || e.key === "Esc") {
            closeProfileDropdown();
        }
    });
});

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async(e) => {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("http://localhost:5000/api/auth/register", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    username,
                    email,
                    password,
                }),
            });

            const data = await response.json();

            console.log(data);

            if (data.success) {
                cacheAuthSession(data.token, data.user, "local");

                alert("Registration Successful");

                window.location.href = "../pages/dashboard.html";
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.log(error);

            alert("Something went wrong");
        }
    });
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async(e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("http://localhost:5000/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const data = await response.json();
            console.log(data);

            if (data.success === true) {
                console.log("Login Success");
                console.log(data);

                cacheAuthSession(data.token, data.user, "local");

                // Sync devstageUser with the newly logged in user details to populate global UI
                const userData = {
                    displayName: data.user.username,
                    email: data.user.email,
                    uid: data.user.id,
                    photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.username)}&background=c8b89a&color=0b0b0b`,
                };
                localStorage.setItem("devstageUser", JSON.stringify(userData));
                window.currentUser = userData;
                syncNavbarUser({...data.user, displayName: data.user.username });
                presenceRequest("online");
                loadNotifications();

                alert("Login successful! Redirecting to your profile...");
                window.location.href = "../pages/profile.html";
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.log(error);
            alert("Something went wrong");
        }
    });
}

// ─── PWA Registration (additive, no UI changes) ─────────────────────────────
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/service-worker.js")
            .catch((error) =>
                console.warn(
                    "[DevStage PWA] Service worker registration failed:",
                    error,
                ),
            );
    });
}