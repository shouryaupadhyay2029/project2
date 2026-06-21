// Central Auth Guard Utility for DevStage
(function() {
    // ─── SAFE AUTH STATE CHECK ───
    function getDevstageAuth() {
        const stored = localStorage.getItem("devstage_auth");
        if (!stored) return null;
        try {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.token && parsed.user && parsed.user.id) {
                return parsed;
            }
            return null;
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
        const authSession = getDevstageAuth();
        
        // Block mock sessions natively if they somehow get into devstage_auth
        let isMock = false;
        if (authSession && authSession.user && authSession.user.id && String(authSession.user.id).startsWith("mock-")) {
            isMock = true;
        }

        const hasSession = authSession && !isMock;

        if (!hasSession) {
            // Redirect to homepage
            const isInsidePages = path.includes("/pages/");
            const redirectUrl = isInsidePages ? "../index.html" : "index.html";
            window.location.replace(redirectUrl);
        }
    }

    // Do NOT redirect logged-in users away from auth pages.
    // Do NOT redirect from any non-protected page.
    // Homepage (index.html) should ALWAYS load for everyone.
})();