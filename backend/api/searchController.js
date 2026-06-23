const User = require("../models/user");
const Project = require("../models/Project");
const { getCache, setCache } = require("../utils/cache");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeQuery(value) {
  return String(value || "")
    .trim()
    .replace(/[^\w\s.@#-]/g, "")
    .slice(0, 60);
}

function publicUserFilter(extra = {}) {
  return {
    ...extra,
    isBanned: { $ne: true },
    $or: [
      { "security.profileVisibility": "public" },
      { "security.profileVisibility": { $exists: false } },
    ],
  };
}

function userResult(user) {
  return {
    id: user._id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    profilePhoto: user.profilePhoto,
    skills: user.skills || [],
    developerTags: user.developerTags || [],
    followersCount: Array.isArray(user.followers) ? user.followers.length : 0,
    followingCount: Array.isArray(user.following) ? user.following.length : 0,
    currentStatus: user.currentStatus,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
  };
}

function projectResult(project) {
  return {
    id: project._id,
    title: project.title,
    description: project.description,
    techStack: project.techStack || [],
    status: project.status,
    category: project.category,
    featured: project.featured,
    thumbnail: project.thumbnail,
    likes: project.likes || 0,
    views: project.views || 0,
    owner: project.owner,
    createdAt: project.createdAt,
  };
}

const searchUsers = async (req, res) => {
  try {
    const q = sanitizeQuery(req.query.q);
    if (!q) return res.status(200).json({ success: true, users: [] });

    const cacheKey = `search:users:${q}`;
    const cached = getCache(cacheKey);
    if (cached)
      return res
        .status(200)
        .json({ success: true, query: q, users: cached, fromCache: true });

    const regex = new RegExp(escapeRegex(q), "i");
    const users = await User.find(
      publicUserFilter({
        $or: [
          { username: regex },
          { displayName: regex },
          { skills: regex },
          { developerTags: regex },
        ],
      }),
    )
      .select(
        "username displayName bio profilePhoto skills developerTags followers following currentStatus isOnline lastSeen",
      )
      .limit(20)
      .lean();

    const results = users.map(userResult);
    setCache(cacheKey, results, 30);
    return res.status(200).json({ success: true, query: q, users: results });
  } catch (error) {
    console.error("Search users error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to search users" });
  }
};

const searchProjects = async (req, res) => {
  try {
    const q = sanitizeQuery(req.query.q);
    const techFilter = req.query.tech ? sanitizeQuery(req.query.tech) : null;
    const categoryFilter = req.query.category ? sanitizeQuery(req.query.category) : null;
    const statusFilter = req.query.status || null;
    const featuredOnly = req.query.featured === "true";

    if (!q && !techFilter && !categoryFilter)
      return res.status(200).json({ success: true, projects: [] });

    const cacheKey = `search:projects:${q}:${techFilter}:${categoryFilter}:${statusFilter}:${featuredOnly}`;
    const cached = getCache(cacheKey);
    if (cached)
      return res
        .status(200)
        .json({ success: true, query: q, projects: cached, fromCache: true });

    const filter = {};

    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      filter.$or = [
        { title: regex },
        { description: regex },
        { techStack: regex },
      ];
    }

    if (techFilter) {
      filter.techStack = { $regex: new RegExp(escapeRegex(techFilter), "i") };
    }

    if (
      statusFilter &&
      ["Planning", "In Progress", "Completed"].includes(statusFilter)
    ) {
      filter.status = statusFilter;
    }

    if (categoryFilter) {
      filter.category = { $regex: new RegExp(escapeRegex(categoryFilter), "i") };
    }

    if (featuredOnly) {
      filter.featured = true;
    }

    const projects = await Project.find(filter)
      .select(
        "title description techStack status category featured thumbnail likes views owner createdAt",
      )
      .populate("owner", "username displayName profilePhoto")
      .sort({ featured: -1, likes: -1, views: -1 })
      .limit(20)
      .lean();

    const results = projects.map(projectResult);
    setCache(cacheKey, results, 30);
    return res.status(200).json({ success: true, query: q, projects: results });
  } catch (error) {
    console.error("Search projects error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to search projects" });
  }
};

const globalSearch = async (req, res) => {
  try {
    const q = sanitizeQuery(req.query.q);
    if (!q)
      return res.status(200).json({ success: true, users: [], projects: [] });

    const cacheKey = `search:global:${q}`;
    const cached = getCache(cacheKey);
    if (cached)
      return res
        .status(200)
        .json({ success: true, query: q, ...cached, fromCache: true });

    const regex = new RegExp(escapeRegex(q), "i");

    const [users, projects] = await Promise.all([
      User.find(
        publicUserFilter({
          $or: [
            { username: regex },
            { displayName: regex },
            { skills: regex },
            { developerTags: regex },
          ],
        }),
      )
        .select(
          "username displayName bio profilePhoto skills developerTags followers following currentStatus isOnline lastSeen",
        )
        .limit(10)
        .lean(),
      Project.find({
        $or: [{ title: regex }, { description: regex }, { techStack: regex }],
      })
        .select(
          "title description techStack status featured thumbnail likes views owner createdAt",
        )
        .populate("owner", "username displayName profilePhoto")
        .sort({ featured: -1, likes: -1 })
        .limit(10)
        .lean(),
    ]);

    const result = {
      users: users.map(userResult),
      projects: projects.map(projectResult),
    };
    setCache(cacheKey, result, 30);
    return res.status(200).json({ success: true, query: q, ...result });
  } catch (error) {
    console.error("Global search error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to search" });
  }
};

const getTrendingSearches = async (req, res) => {
  try {
    // Trending tech stacks based on popular projects
    const cacheKey = "search:trending_tech";
    const cached = getCache(cacheKey);
    if (cached)
      return res
        .status(200)
        .json({ success: true, trendingTech: cached, fromCache: true });

    const result = await Project.aggregate([
      { $unwind: "$techStack" },
      { $group: { _id: "$techStack", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
      { $project: { tech: "$_id", count: 1, _id: 0 } },
    ]);

    setCache(cacheKey, result, 600); // 10 min cache
    return res.status(200).json({ success: true, trendingTech: result });
  } catch (error) {
    console.error("Trending searches error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load trending searches" });
  }
};

module.exports = {
  searchUsers,
  searchProjects,
  globalSearch,
  getTrendingSearches,
  publicUserFilter,
  userResult,
};
