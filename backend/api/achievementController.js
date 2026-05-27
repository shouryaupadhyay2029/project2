const mongoose = require("mongoose");
const Achievement = require("../models/Achievement");
const User = require("../models/user");
const Project = require("../models/Project");
const { getCache, setCache, delCache } = require("../utils/cache");

const ACHIEVEMENT_CATALOG = {
    early_adopter: {
        title: "Early Adopter",
        description: "One of the first developers to join DevStage",
        rarity: "legendary"
    },
    profile_complete: {
        title: "Profile Complete",
        description: "Filled out all profile sections including bio, skills, and social links",
        rarity: "common"
    },
    first_project: {
        title: "First Project",
        description: "Created your first project on DevStage",
        rarity: "common"
    },
    top_creator: {
        title: "Top Creator",
        description: "Published 10 or more projects",
        rarity: "epic"
    },
    collaborator: {
        title: "Collaborator",
        description: "Accepted or sent a collaboration request",
        rarity: "rare"
    },
    trending_project: {
        title: "Trending Project",
        description: "Had a project reach trending status",
        rarity: "epic"
    },
    open_source: {
        title: "Open Source Dev",
        description: "Linked a GitHub repository to a project",
        rarity: "rare"
    },
    active_developer: {
        title: "Active Developer",
        description: "Logged in and contributed for 7 days straight",
        rarity: "rare"
    },
    community_helper: {
        title: "Community Helper",
        description: "Followed 20 or more developers",
        rarity: "rare"
    },
    verified_creator: {
        title: "Verified Creator",
        description: "Project featured and received 50+ impressions",
        rarity: "epic"
    },
    network_builder: {
        title: "Network Builder",
        description: "Gained 10 or more followers",
        rarity: "common"
    },
    prolific_builder: {
        title: "Prolific Builder",
        description: "Created 5 or more projects",
        rarity: "rare"
    },
    streak_7: {
        title: "Week Streak",
        description: "Maintained a 7-day activity streak",
        rarity: "rare"
    },
    streak_30: {
        title: "Month Streak",
        description: "Maintained a 30-day activity streak",
        rarity: "legendary"
    }
};

async function unlockAchievement(userId, type) {
    try {
        const catalog = ACHIEVEMENT_CATALOG[type];
        if (!catalog) return null;

        const existing = await Achievement.findOne({ userId, type }).lean();
        if (existing) return null; // already unlocked

        const achievement = await Achievement.create({
            userId,
            type,
            title: catalog.title,
            description: catalog.description,
            rarity: catalog.rarity,
            progress: 100,
            isVisible: true,
            unlockedAt: new Date()
        });

        // Invalidate cache
        delCache(`achievements:user:${userId}`);

        // Emit realtime event
        try {
            const { emitToUser } = require("../socket/socketServer");
            emitToUser(String(userId), "achievement_unlocked", {
                type,
                title: catalog.title,
                description: catalog.description,
                rarity: catalog.rarity,
                unlockedAt: achievement.unlockedAt
            });
        } catch (e) { /* socket not ready */ }

        return achievement;
    } catch (err) {
        if (err.code === 11000) return null; // duplicate, already exists
        console.error("Unlock achievement error:", err.message);
        return null;
    }
}

async function checkAndUnlockAchievements(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) return;

    try {
        const [user, projects] = await Promise.all([
            User.findById(userId)
                .select("bio skills socialLinks followers following currentStreak")
                .lean(),
            Project.find({ owner: userId }).select("githubUrl featured").lean()
        ]);

        if (!user) return;

        const unlocks = [];

        // first_project
        if (projects.length >= 1) unlocks.push(unlockAchievement(userId, "first_project"));

        // prolific_builder
        if (projects.length >= 5) unlocks.push(unlockAchievement(userId, "prolific_builder"));

        // top_creator
        if (projects.length >= 10) unlocks.push(unlockAchievement(userId, "top_creator"));

        // open_source - has at least one project with github url
        if (projects.some(p => p.githubUrl)) unlocks.push(unlockAchievement(userId, "open_source"));

        // profile_complete - has bio, at least 2 skills, at least one social link
        const hasProfile = user.bio && user.bio.length > 10 &&
            user.skills && user.skills.length >= 2 &&
            (user.socialLinks?.github || user.socialLinks?.linkedin || user.socialLinks?.twitter);
        if (hasProfile) unlocks.push(unlockAchievement(userId, "profile_complete"));

        // network_builder - has 10+ followers
        if (user.followers && user.followers.length >= 10) unlocks.push(unlockAchievement(userId, "network_builder"));

        // community_helper - follows 20+ people
        if (user.following && user.following.length >= 20) unlocks.push(unlockAchievement(userId, "community_helper"));

        // streak achievements
        if (user.currentStreak >= 7) unlocks.push(unlockAchievement(userId, "streak_7"));
        if (user.currentStreak >= 30) unlocks.push(unlockAchievement(userId, "streak_30"));

        await Promise.all(unlocks);
    } catch (err) {
        console.error("Check achievements error:", err.message);
    }
}

const getMyAchievements = async (req, res) => {
    try {
        const cacheKey = `achievements:user:${req.user.id}`;
        const cached = getCache(cacheKey);
        if (cached) return res.status(200).json({ success: true, achievements: cached, fromCache: true });

        const achievements = await Achievement.find({ userId: req.user.id })
            .sort({ unlockedAt: -1 })
            .lean();

        // Also compute locked achievements (progress)
        const unlockedTypes = new Set(achievements.map(a => a.type));
        const locked = Object.entries(ACHIEVEMENT_CATALOG)
            .filter(([type]) => !unlockedTypes.has(type))
            .map(([type, info]) => ({
                type,
                title: info.title,
                description: info.description,
                rarity: info.rarity,
                progress: 0,
                isLocked: true
            }));

        setCache(cacheKey, achievements, 120);

        return res.status(200).json({
            success: true,
            achievements,
            locked,
            totalUnlocked: achievements.length,
            totalAvailable: Object.keys(ACHIEVEMENT_CATALOG).length
        });
    } catch (error) {
        console.error("Get achievements error:", error);
        return res.status(500).json({ success: false, message: "Unable to load achievements" });
    }
};

const getUserAchievements = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username, isBanned: { $ne: true } }).select("_id").lean();
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const cacheKey = `achievements:username:${username}`;
        const cached = getCache(cacheKey);
        if (cached) return res.status(200).json({ success: true, achievements: cached, fromCache: true });

        const achievements = await Achievement.find({ userId: user._id, isVisible: true })
            .sort({ rarity: 1, unlockedAt: -1 })
            .lean();

        setCache(cacheKey, achievements, 120);

        return res.status(200).json({ success: true, achievements });
    } catch (error) {
        console.error("Get user achievements error:", error);
        return res.status(500).json({ success: false, message: "Unable to load achievements" });
    }
};

module.exports = {
    getMyAchievements,
    getUserAchievements,
    unlockAchievement,
    checkAndUnlockAchievements,
    ACHIEVEMENT_CATALOG
};
