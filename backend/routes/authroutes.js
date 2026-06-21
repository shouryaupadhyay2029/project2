const express = require("express");
const router = express.Router();

const {
    registerUser,
    loginUser,
    googleLogin,
    refreshTokenHandler
} = require("../api/authcontroller");

const authMiddleware = require("../middleware/auth").protect;
const User = require("../models/user");
const {
    validateRegister,
    validateLogin,
    handleValidationErrors
} = require("../middleware/validation");

const {
    loginLimiter,
    registerLimiter,
    refreshLimiter
} = require("../middleware/rateLimiter");

router.post("/register", registerLimiter, validateRegister, handleValidationErrors, registerUser);
router.post("/login", loginLimiter, validateLogin, handleValidationErrors, loginUser);
router.post("/google", loginLimiter, googleLogin);
router.post("/refresh", refreshLimiter, refreshTokenHandler);

// Protected route — get current logged-in user
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                bio: user.bio,
                location: user.location,
                timezone: user.timezone,
                portfolioWebsite: user.portfolioWebsite,
                profilePhoto: user.profilePhoto,
                followers: Array.isArray(user.followers) ? user.followers.length : 0,
                following: Array.isArray(user.following) ? user.following.length : 0,
                skills: user.skills,
                techStack: user.techStack,
                socialLinks: user.socialLinks,
                resumeUrl: user.resumeUrl,
                profileVisibility: user.security?.profileVisibility || 'public',
                showContributionGraph: user.showContributionGraph,
                showAchievements: user.showAchievements,
                currentStatus: user.currentStatus,
                developerTags: user.developerTags,
                featuredProject: user.featuredProject,
                notifications: user.notificationSettings,
                unreadNotifications: Array.isArray(user.notifications) ? user.notifications.filter(notification => !notification.read).length : 0,
                appearance: user.appearance,
                projectSettings: user.projectSettings,
                ecosystem: user.ecosystem,
                security: user.security,
                advanced: user.advanced,
                isOnline: user.isOnline,
                lastSeen: user.lastSeen
            }
        });

    } catch (error) {
        console.error("Error fetching user:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});


module.exports = router;
