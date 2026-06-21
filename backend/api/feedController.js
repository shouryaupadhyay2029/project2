const mongoose = require("mongoose");
const User = require("../models/user");
const Project = require("../models/Project");
const Activity = require("../models/Activity");
const Achievement = require("../models/Achievement");
const { getCache, setCache } = require("../utils/cache");
const { computeTrendingScore } = require("./trendingController");

function deduplicateById(items) {
    const seen = new Set();
    return items.filter(item => {
        const id = String(item._id || item.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}

const getMyFeed = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
        const skip = (page - 1) * limit;

        const cacheKey = `feed:user:${req.user.id}:page:${page}`;
        const cached = getCache(cacheKey);
        if (cached && page === 1) {
            return res.status(200).json({ success: true, ...cached, fromCache: true });
        }

        const currentUser = await User.findById(req.user.id)
            .select("following savedProjects skills developerTags techStack")
            .lean();

        if (!currentUser) return res.status(404).json({ success: false, message: "User not found" });

        const following = currentUser.following || [];
        const userSkills = [...(currentUser.skills || []), ...(currentUser.techStack || []), ...(currentUser.developerTags || [])];

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Parallel fetch of feed sources
        const [followingProjects, trendingProjects, recentActivities, recentAchievements] = await Promise.all([
            // Projects from followed users
            following.length > 0
                ? Project.find({ owner: { $in: following }, createdAt: { $gte: thirtyDaysAgo } })
                    .select("title description techStack status featured thumbnail likes views owner createdAt")
                    .populate("owner", "username displayName profilePhoto isOnline")
                    .sort({ createdAt: -1 })
                    .limit(20)
                    .lean()
                : Promise.resolve([]),

            // Trending projects with matching tech stack
            userSkills.length > 0
                ? Project.find({
                    techStack: { $in: userSkills.map(s => new RegExp(s, "i")) },
                    createdAt: { $gte: thirtyDaysAgo }
                })
                    .select("title description techStack status featured thumbnail likes views owner createdAt")
                    .populate("owner", "username displayName profilePhoto isOnline")
                    .sort({ likes: -1, views: -1 })
                    .limit(10)
                    .lean()
                : Project.find({ createdAt: { $gte: thirtyDaysAgo } })
                    .select("title description techStack status featured thumbnail likes views owner createdAt")
                    .populate("owner", "username displayName profilePhoto isOnline")
                    .sort({ featured: -1, likes: -1, views: -1 })
                    .limit(10)
                    .lean(),

            // Recent public activity from followed users
            following.length > 0
                ? Activity.find({
                    user: { $in: following },
                    visibility: "public",
                    createdAt: { $gte: thirtyDaysAgo }
                })
                    .populate("user", "username displayName profilePhoto")
                    .sort({ createdAt: -1 })
                    .limit(15)
                    .lean()
                : Promise.resolve([]),

            // Recent achievements from followed users
            following.length > 0
                ? Achievement.find({ userId: { $in: following }, isVisible: true, unlockedAt: { $gte: thirtyDaysAgo } })
                    .populate("userId", "username displayName profilePhoto")
                    .sort({ unlockedAt: -1 })
                    .limit(10)
                    .lean()
                : Promise.resolve([])
        ]);

        // Build feed items with type tags
        const feedItems = [
            ...followingProjects.map(p => ({ ...p, feedType: "following_project", feedScore: 100 + computeTrendingScore(p) })),
            ...trendingProjects.map(p => ({ ...p, feedType: "recommended_project", feedScore: 50 + computeTrendingScore(p) })),
            ...recentActivities.map(a => ({ ...a, feedType: "activity", feedScore: 30 })),
            ...recentAchievements.map(a => ({ ...a, feedType: "achievement", feedScore: 40 }))
        ];

        // Deduplicate by id, sort by score, paginate
        const deduped = deduplicateById(feedItems)
            .sort((a, b) => b.feedScore - a.feedScore);

        const total = deduped.length;
        const paginated = deduped.slice(skip, skip + limit);

        const result = {
            feed: paginated,
            page,
            limit,
            total,
            hasMore: skip + limit < total
        };

        if (page === 1) setCache(cacheKey, result, 120); // 2 min cache for page 1

        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error("Get feed error:", error);
        return res.status(500).json({ success: false, message: "Unable to load feed" });
    }
};

module.exports = { getMyFeed };
