const Project = require("../models/Project");
const User = require("../models/user");
const { getCache, setCache } = require("../utils/cache");

/**
 * Trending score formula (time-decay weighted):
 * score = (views * 1) + (likes * 3) + (saves * 5) + (collaborations * 8)
 * decay = score / (hoursAge + 2)^1.5
 */
function computeTrendingScore(project) {
    const now = Date.now();
    const createdAt = new Date(project.createdAt).getTime();
    const hoursAge = Math.max(0, (now - createdAt) / (1000 * 60 * 60));

    const rawScore =
        (project.views || 0) * 1 +
        (project.likes || 0) * 3 +
        (project.saves || 0) * 5;

    return rawScore / Math.pow(hoursAge + 2, 1.5);
}

const getTrendingProjects = async (req, res) => {
    try {
        const cacheKey = "trending:projects";
        const cached = getCache(cacheKey);
        if (cached) return res.status(200).json({ success: true, projects: cached, fromCache: true });

        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
        const techFilter = req.query.tech ? req.query.tech.toLowerCase() : null;

        // Fetch recent projects (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const query = { createdAt: { $gte: thirtyDaysAgo } };
        if (techFilter) {
            query.techStack = { $regex: new RegExp(techFilter, "i") };
        }

        const projects = await Project.find(query)
            .select("title description techStack status featured thumbnail likes views owner createdAt")
            .populate("owner", "username displayName profilePhoto isOnline")
            .lean();

        // Compute trending scores and sort
        const scored = projects
            .map(p => ({ ...p, trendingScore: computeTrendingScore(p) }))
            .sort((a, b) => b.trendingScore - a.trendingScore)
            .slice(0, limit);

        setCache(cacheKey, scored, 600); // 10 min cache

        return res.status(200).json({ success: true, projects: scored });
    } catch (error) {
        console.error("Get trending projects error:", error);
        return res.status(500).json({ success: false, message: "Unable to load trending projects" });
    }
};

const getTrendingUsers = async (req, res) => {
    try {
        const cacheKey = "trending:users";
        const cached = getCache(cacheKey);
        if (cached) return res.status(200).json({ success: true, users: cached, fromCache: true });

        const limit = Math.min(parseInt(req.query.limit, 10) || 10, 30);

        // Users with most follower growth + activity (approximate via followers count)
        const users = await User.find({
            isBanned: { $ne: true },
            $or: [
                { profileVisibility: { $ne: false } },
                { profileVisibility: { $exists: false } }
            ]
        })
            .select("username displayName bio profilePhoto skills developerTags followers following isOnline lastSeen currentStatus createdAt")
            .lean();

        // Score: followers * 2 + following * 0.5
        const scored = users
            .filter(u => u.username)
            .map(u => ({
                id: u._id,
                username: u.username,
                displayName: u.displayName,
                bio: u.bio,
                profilePhoto: u.profilePhoto,
                skills: u.skills || [],
                developerTags: u.developerTags || [],
                followersCount: Array.isArray(u.followers) ? u.followers.length : 0,
                followingCount: Array.isArray(u.following) ? u.following.length : 0,
                isOnline: u.isOnline,
                lastSeen: u.lastSeen,
                currentStatus: u.currentStatus,
                trendingScore: (Array.isArray(u.followers) ? u.followers.length : 0) * 2 +
                               (Array.isArray(u.following) ? u.following.length : 0) * 0.5
            }))
            .sort((a, b) => b.trendingScore - a.trendingScore)
            .slice(0, limit);

        setCache(cacheKey, scored, 600);

        return res.status(200).json({ success: true, users: scored });
    } catch (error) {
        console.error("Get trending users error:", error);
        return res.status(500).json({ success: false, message: "Unable to load trending users" });
    }
};

module.exports = { getTrendingProjects, getTrendingUsers, computeTrendingScore };
