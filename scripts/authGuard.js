// Central Auth Guard Utility for DevStage
(function() {
    // ─── SAFE AUTH STATE CHECK ───
    function getCurrentUser() {
        const user = localStorage.getItem("currentUser");

        if (!user) return null;

        try {
            return JSON.parse(user);
        } catch {
            return null;
        }
    }

    // ONLY these pages are protected
    const protectedPages = [
        "profile.html",
        "settings.html"
    ];

    // Extract current filename
    const path = window.location.pathname;
    const currentPage = path.split("/").pop() || "index.html";

    // Check if current page is protected
    if (protectedPages.includes(currentPage)) {
        // Try all possible user session sources
        const currentUser = getCurrentUser();
        const token = localStorage.getItem("token");
        const devstageAuth = localStorage.getItem("devstage_auth");
        const devstageUserCache = localStorage.getItem("devstage_user_cache");
        const devstageUser = localStorage.getItem("devstageUser");
        const user = localStorage.getItem("user");
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

        // Allow access if ANY valid session exists
        const hasSession = currentUser || (token && isLoggedIn) || devstageAuth || devstageUserCache || devstageUser || user;

        if (!hasSession) {
            // Redirect to homepage, NOT login page
            const isInsidePages = path.includes("/pages/");
            const redirectUrl = isInsidePages ? "../index.html" : "index.html";
            window.location.replace(redirectUrl);
        }
    }

    // Do NOT redirect logged-in users away from auth pages.
    // Do NOT redirect from any non-protected page.
    // Homepage (index.html) should ALWAYS load for everyone.
})();
