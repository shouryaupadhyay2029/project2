const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { protect } = require("../middleware/auth");
const User = require("../models/user");
const Project = require("../models/Project");
const Activity = require("../models/Activity");
const { createActivity } = require("../api/activityController");

function publicProfileResponse(user, featuredProject, heatmap) {
    return {
        id: user._id,
        profilePhoto: user.profilePhoto,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        followers: Array.isArray(user.followers) ? user.followers.length : 0,
        following: Array.isArray(user.following) ? user.following.length : 0,
        followersCount: Array.isArray(user.followers) ? user.followers.length : 0,
        followingCount: Array.isArray(user.following) ? user.following.length : 0,
        featuredProject,
        skills: user.skills || [],
        developerTags: user.developerTags || [],
        activityHeatmap: heatmap,
        currentStatus: user.currentStatus,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
    };
}

function buildHeatmap(activities) {
    return activities.reduce((heatmap, activity) => {
        const date = activity.createdAt.toISOString().split("T")[0];
        heatmap[date] = (heatmap[date] || 0) + 1;
        return heatmap;
    }, {});
}

// GET /api/users/profile/:username - Public profile lookup
router.get("/profile/:username", async(req, res) => {
    try {
        const username = String(req.params.username || "").trim().toLowerCase();
        const user = await User.findOne({
            username,
            isBanned: { $ne: true },
            $and: [
                { $or: [{ profileVisibility: { $ne: false } }, { profileVisibility: { $exists: false } }] },
                { $or: [{ "security.profileVisibility": "public" }, { "security.profileVisibility": { $exists: false } }] }
            ]
        })
            .select("username displayName bio profilePhoto followers following featuredProject skills developerTags currentStatus isOnline lastSeen")
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "Profile not found" });
        }

        const hasFeaturedProjectId = user.featuredProject && mongoose.Types.ObjectId.isValid(user.featuredProject);
        const [featuredProject, activities] = await Promise.all([
            hasFeaturedProjectId ?
                Project.findOne({ _id: user.featuredProject, owner: user._id }).select("title description techStack githubUrl liveUrl thumbnail status views likes").lean() :
                Project.findOne({ owner: user._id, featured: true }).select("title description techStack githubUrl liveUrl thumbnail status views likes").lean(),
            Activity.find({ user: user._id, visibility: "public" }).select("createdAt").sort({ createdAt: -1 }).limit(365).lean()
        ]);

        await createActivity(user._id, "profile_visit", "Profile visit", "Someone viewed your public profile", {}, "private");

        return res.status(200).json({
            success: true,
            profile: publicProfileResponse(user, featuredProject, buildHeatmap(activities))
        });
    } catch (error) {
        console.error("Public profile lookup error:", error);
        return res.status(500).json({ success: false, message: "Unable to load profile" });
    }
});

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
        await createActivity(
            user._id,
            "profile_updated",
            "Profile updated",
            "Updated profile details",
            { featuredProjectChanged: featuredProject !== undefined },
            "private"
        );

        const safeUser = updatedUser.toObject();
        delete safeUser.password;
        safeUser.followers = Array.isArray(updatedUser.followers) ? updatedUser.followers.length : 0;
        safeUser.following = Array.isArray(updatedUser.following) ? updatedUser.following.length : 0;
        safeUser.notifications = updatedUser.notificationSettings;

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
            if (!user.notificationSettings) user.notificationSettings = {};
            if (typeof notifications.emailNotifications === "boolean") user.notificationSettings.emailNotifications = notifications.emailNotifications;
            if (typeof notifications.projectUpdates === "boolean") user.notificationSettings.projectUpdates = notifications.projectUpdates;
            if (typeof notifications.marketingEmails === "boolean") user.notificationSettings.marketingEmails = notifications.marketingEmails;
            if (typeof notifications.collaborationInvites === "boolean") user.notificationSettings.collaborationInvites = notifications.collaborationInvites;
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
        safeUser.followers = Array.isArray(updatedUser.followers) ? updatedUser.followers.length : 0;
        safeUser.following = Array.isArray(updatedUser.following) ? updatedUser.following.length : 0;
        safeUser.notifications = updatedUser.notificationSettings;

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
        safeUser.followers = Array.isArray(updatedUser.followers) ? updatedUser.followers.length : 0;
        safeUser.following = Array.isArray(updatedUser.following) ? updatedUser.following.length : 0;
        safeUser.notifications = updatedUser.notificationSettings;

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
const { deleteAccount } = require("../api/settingsController");
router.delete("/delete-account", protect, deleteAccount);

module.exports = router;
