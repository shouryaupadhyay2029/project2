const express = require("express");
const router = express.Router();

const {
    registerUser,
    loginUser,
    googleLogin
} = require("../api/authcontroller");

const authMiddleware = require("../middleware/authmiddleware");
const User = require("../models/user");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleLogin);

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
                profileVisibility: user.profileVisibility,
                showContributionGraph: user.showContributionGraph,
                showAchievements: user.showAchievements,
                currentStatus: user.currentStatus,
                developerTags: user.developerTags,
                featuredProject: user.featuredProject,
                notifications: user.notificationSettings,
                unreadNotifications: Array.isArray(user.notifications) ? user.notifications.filter(notification => !notification.read).length : 0,
                appearance: user.appearance,
                projectSettings: user.projectSettings,
                projectPreferences: user.projectPreferences,
                ecosystem: user.ecosystem,
                security: user.security,
                advanced: user.advanced,
                privacy: user.privacy,
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

// Update user settings
router.put("/update", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const updatableFields = [
            "displayName", "username", "bio", "location", "timezone", 
            "portfolioWebsite", "profilePhoto", "skills", "techStack", 
            "socialLinks", "resumeUrl", "profileVisibility", 
            "showContributionGraph", "showAchievements", "currentStatus", 
            "developerTags", "featuredProject"
        ];

        updatableFields.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        });

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
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
                profileVisibility: user.profileVisibility,
                showContributionGraph: user.showContributionGraph,
                showAchievements: user.showAchievements,
                currentStatus: user.currentStatus,
                developerTags: user.developerTags,
                featuredProject: user.featuredProject
            }
        });

    } catch (error) {
        console.error("Error updating user:", error.message);
        if (error.code === 11000 && error.keyPattern && error.keyPattern.username) {
            return res.status(400).json({
                success: false,
                message: "Username is already taken"
            });
        }
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

module.exports = router;
