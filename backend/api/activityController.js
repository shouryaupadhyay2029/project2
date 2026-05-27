const Activity = require("../models/Activity");
const User = require("../models/user");
const { getCache, setCache } = require("../utils/cache");

// ==========================
// GET MY ACTIVITY
// ==========================
const getMyActivity = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const activities = await Activity.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({ success: true, activities });
  } catch (error) {
    console.error("Get my activity error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==========================
// GET USER ACTIVITY (PUBLIC)
// ==========================
const getUserActivity = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select("_id").lean();
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const activities = await Activity.find({
      user: user._id,
      visibility: "public",
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({ success: true, activities });
  } catch (error) {
    console.error("Get user activity error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==========================
// CREATE ACTIVITY
// ==========================
const createActivity = async (
  userId,
  type,
  title,
  description = "",
  metadata = {},
  visibility = "public",
) => {
  try {
    const activity = await Activity.create({
      user: userId,
      type,
      title,
      description,
      metadata,
      visibility,
    });

    // Update user streak
    updateUserStreak(userId).catch(() => {});

    return activity;
  } catch (error) {
    console.error("Create activity error:", error);
    return null;
  }
};

// ==========================
// STREAK TRACKING
// ==========================
async function updateUserStreak(userId) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const user = await User.findById(userId)
      .select("currentStreak longestStreak lastActiveDate")
      .lean();
    if (!user) return;

    if (user.lastActiveDate === today) return; // already counted today

    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];
    const isConsecutive = user.lastActiveDate === yesterday;

    const newStreak = isConsecutive ? (user.currentStreak || 0) + 1 : 1;
    const newLongest = Math.max(user.longestStreak || 0, newStreak);

    await User.findByIdAndUpdate(userId, {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: today,
    });
  } catch (err) {
    console.error("Streak update error:", err.message);
  }
}

// ==========================
// CONTRIBUTION GRAPH
// ==========================
const getContributions = async (req, res) => {
  try {
    const { username } = req.params;

    const cacheKey = `contributions:${username}`;
    const cached = getCache(cacheKey);
    if (cached)
      return res
        .status(200)
        .json({ success: true, ...cached, fromCache: true });

    const user = await User.findOne({ username })
      .select("_id currentStreak longestStreak")
      .lean();
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Aggregate contributions by date for the last 365 days using pipeline
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const pipeline = [
      {
        $match: {
          user: user._id,
          createdAt: { $gte: oneYearAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
          types: { $addToSet: "$type" },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const rawData = await Activity.aggregate(pipeline);

    // Build heatmap data
    const heatmap = {};
    let totalContributions = 0;
    rawData.forEach((entry) => {
      heatmap[entry._id] = { count: entry.count, types: entry.types };
      totalContributions += entry.count;
    });

    // Compute intensity levels (l0-l4)
    const counts = rawData.map((e) => e.count);
    const maxCount = counts.length > 0 ? Math.max(...counts) : 0;

    const intensityMap = {};
    rawData.forEach((entry) => {
      let level = 0;
      if (maxCount > 0) {
        const ratio = entry.count / maxCount;
        if (ratio >= 0.75) level = 4;
        else if (ratio >= 0.5) level = 3;
        else if (ratio >= 0.25) level = 2;
        else if (ratio > 0) level = 1;
      }
      intensityMap[entry._id] = level;
    });

    const result = {
      heatmap,
      intensityMap,
      totalContributions,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      activeDays: rawData.length,
    };

    setCache(cacheKey, result, 300); // 5 min cache

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("Get contributions error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load contributions" });
  }
};

// ==========================
// GET ACTIVITY HEATMAP DATA (legacy)
// ==========================
const getActivityHeatmap = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).lean();
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const activities = await Activity.find({
      user: user._id,
      visibility: "public",
    })
      .select("createdAt")
      .sort({ createdAt: -1 })
      .limit(365)
      .lean();

    const heatmapData = {};
    activities.forEach((activity) => {
      const date = activity.createdAt.toISOString().split("T")[0];
      heatmapData[date] = (heatmapData[date] || 0) + 1;
    });

    res.status(200).json({ success: true, heatmap: heatmapData });
  } catch (error) {
    console.error("Get activity heatmap error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getMyActivity,
  getUserActivity,
  createActivity,
  getActivityHeatmap,
  getContributions,
  updateUserStreak,
};
