const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const User = require("../models/user");

// POST /api/users/view-profile/:username - Increment profile view count
router.post("/view-profile/:username", async(req, res) => {
    try {
        const { username } = req.params;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check cooldown (prevent spam refresh)
        const cooldownKey = `profile_view_${req.ip}_${user._id}`;
        const lastView = req.app.get(cooldownKey) || 0;
        const now = Date.now();

        if (now - lastView < 30000) { // 30 second cooldown
            return res.status(200).json({
                success: true,
                message: "Profile view counted (cooldown active)",
                profileViews: user.profileViews
            });
        }

        // Increment view count
        user.profileViews = (user.profileViews || 0) + 1;
        await user.save();

        // Set cooldown
        req.app.set(cooldownKey, now);

        return res.status(200).json({
            success: true,
            message: "Profile view counted",
            profileViews: user.profileViews
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

// PUT /api/users/update-profile
router.put("/update-profile", protect, async(req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const {
            displayName,
            username,
            bio,
            location,
            timezone,
            portfolioWebsite,
            socialLinks,
            currentStatus,
            developerTags,
            featuredProject,
            profileVisibility,
            showContributionGraph,
            showAchievements,
            profilePhoto
        } = req.body;

        // Validation rules
        if (bio && bio.length > 160) {
            return res.status(400).json({
                success: false,
                message: "Bio exceeds 160 characters limit"
            });
        }

        if (developerTags && developerTags.length > 8) {
            return res.status(400).json({
                success: false,
                message: "Too many tags (maximum is 8)"
            });
        }

        if (portfolioWebsite) {
            const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
            if (!urlPattern.test(portfolioWebsite)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid portfolio website URL format"
                });
            }
        }

        if (username) {
            const cleanUsername = username.trim().toLowerCase();

            const existingUser = await User.findOne({
                username: cleanUsername,
                _id: { $ne: user._id }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: "Username already taken"
                });
            }

            user.username = cleanUsername;
        }

        // Safe update logic
        user.displayName = displayName || user.displayName;
        user.bio = bio !== undefined ? bio : user.bio;
        user.location = location || user.location;
        user.timezone = timezone || user.timezone;
        user.portfolioWebsite = portfolioWebsite !== undefined ? portfolioWebsite : user.portfolioWebsite;
        user.currentStatus = currentStatus || user.currentStatus;
        user.featuredProject = featuredProject || user.featuredProject;

        if (profilePhoto !== undefined) {
            user.profilePhoto = profilePhoto;
        }

        if (socialLinks) {
            if (!user.socialLinks) {
                user.socialLinks = {};
            }
            user.socialLinks.github = socialLinks.github !== undefined ? socialLinks.github : user.socialLinks.github;
            user.socialLinks.twitter = socialLinks.twitter !== undefined ? socialLinks.twitter : user.socialLinks.twitter;
            user.socialLinks.linkedin = socialLinks.linkedin !== undefined ? socialLinks.linkedin : user.socialLinks.linkedin;
        }

        if (developerTags) {
            user.developerTags = Array.isArray(developerTags) ? developerTags : [];
        }

        if (typeof profileVisibility === "boolean") {
            user.profileVisibility = profileVisibility;
        }

        if (typeof showContributionGraph === "boolean") {
            user.showContributionGraph = showContributionGraph;
        }

        if (typeof showAchievements === "boolean") {
            user.showAchievements = showAchievements;
        }

        const updatedUser = await user.save();

        const safeUser = updatedUser.toObject();
        delete safeUser.password;

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: safeUser
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

// PUT /api/users/platform-settings
router.put("/platform-settings", protect, async(req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const { notifications, appearance, projectPreferences, ecosystem } = req.body;

        if (notifications) {
            if (!user.notifications) user.notifications = {};
            if (typeof notifications.emailNotifications === "boolean") user.notifications.emailNotifications = notifications.emailNotifications;
            if (typeof notifications.projectUpdates === "boolean") user.notifications.projectUpdates = notifications.projectUpdates;
            if (typeof notifications.marketingEmails === "boolean") user.notifications.marketingEmails = notifications.marketingEmails;
            if (typeof notifications.collaborationInvites === "boolean") user.notifications.collaborationInvites = notifications.collaborationInvites;
        }

        if (appearance) {
            if (!user.appearance) user.appearance = {};
            if (appearance.theme) user.appearance.theme = appearance.theme;
            if (typeof appearance.reducedMotion === "boolean") user.appearance.reducedMotion = appearance.reducedMotion;
            if (typeof appearance.compactMode === "boolean") user.appearance.compactMode = appearance.compactMode;
        }

        if (projectPreferences) {
            if (!user.projectPreferences) user.projectPreferences = {};
            if (typeof projectPreferences.autoSaveDrafts === "boolean") user.projectPreferences.autoSaveDrafts = projectPreferences.autoSaveDrafts;
            if (typeof projectPreferences.showProjectAnalytics === "boolean") user.projectPreferences.showProjectAnalytics = projectPreferences.showProjectAnalytics;
            if (typeof projectPreferences.enablePublicProjects === "boolean") user.projectPreferences.enablePublicProjects = projectPreferences.enablePublicProjects;
        }

        if (ecosystem) {
            if (!user.ecosystem) user.ecosystem = {};
            if (typeof ecosystem.enableCommunityProfile === "boolean") user.ecosystem.enableCommunityProfile = ecosystem.enableCommunityProfile;
            if (typeof ecosystem.showOnlineStatus === "boolean") user.ecosystem.showOnlineStatus = ecosystem.showOnlineStatus;
            if (typeof ecosystem.allowTeamInvites === "boolean") user.ecosystem.allowTeamInvites = ecosystem.allowTeamInvites;
        }

        const updatedUser = await user.save();
        const safeUser = updatedUser.toObject();
        delete safeUser.password;

        return res.status(200).json({
            success: true,
            message: "Platform settings updated successfully",
            user: safeUser
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

// PUT /api/users/privacy-settings
router.put("/privacy-settings", protect, async(req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const { twoFactorEnabled, profileIndexed, activityVisible } = req.body;

        if (!user.privacy) user.privacy = {};
        if (typeof twoFactorEnabled === "boolean") {
            user.privacy.twoFactorEnabled = twoFactorEnabled;
        }
        if (typeof profileIndexed === "boolean") {
            user.privacy.profileIndexed = profileIndexed;
        }
        if (typeof activityVisible === "boolean") {
            user.privacy.activityVisible = activityVisible;
        }

        const updatedUser = await user.save();
        const safeUser = updatedUser.toObject();
        delete safeUser.password;

        return res.status(200).json({
            success: true,
            message: "Privacy settings updated successfully",
            user: safeUser
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

// DELETE /api/users/delete-account
const bcrypt = require("bcryptjs");
router.delete("/delete-account", protect, async(req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // skip password verification for Google Auth users or placeholder password users
        if (!req.user.isGoogleUser && user.password !== "google_auth_placeholder_password") {
            const { password } = req.body;
            if (!password) {
                return res.status(400).json({
                    success: false,
                    message: "Password is required to delete your account"
                });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: "Incorrect password"
                });
            }
        }

        await User.findByIdAndDelete(req.user.id);

        return res.status(200).json({
            success: true,
            message: "Account deleted successfully"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

module.exports = router;