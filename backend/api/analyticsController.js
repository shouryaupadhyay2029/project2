const mongoose = require("mongoose");
const ProjectAnalytics = require("../models/ProjectAnalytics");
const Project = require("../models/Project");
const { getCache, setCache } = require("../utils/cache");
const crypto = require("crypto");

function getTodayDateString() {
    return new Date().toISOString().split("T")[0];
}

function hashVisitor(req) {
    const raw = (req.ip || "") + (req.headers["user-agent"] || "");
    return crypto.createHash("md5").update(raw).digest("hex");
}

async function recordAnalyticsEvent(projectId, eventType, req) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
    const date = getTodayDateString();
    const visitorHash = hashVisitor(req);

    const update = { $inc: {} };
    const arrayUpdate = {};

    if (eventType === "impression") {
        update.$inc.impressions = 1;
        // Only add unique visitor if not already in today's list
        arrayUpdate.$addToSet = { uniqueVisitorHashes: visitorHash };
    } else if (eventType === "click") {
        update.$inc.clicks = 1;
    } else if (eventType === "open") {
        update.$inc.opens = 1;
    } else if (eventType === "save") {
        update.$inc.saves = 1;
    } else if (eventType === "collaboration") {
        update.$inc.collaborationRequests = 1;
    }

    const combined = { ...update, ...arrayUpdate };
    if (Object.keys(combined.$inc || {}).length === 0) return null;

    try {
        return await ProjectAnalytics.findOneAndUpdate(
            { projectId, date },
            combined,
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error("Analytics record error:", err.message);
        return null;
    }
}

const trackProjectImpression = async (req, res) => {
    try {
        const { projectId } = req.params;
        await recordAnalyticsEvent(projectId, "impression", req);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Track impression error:", error);
        return res.status(500).json({ success: false, message: "Unable to track impression" });
    }
};

const trackProjectClick = async (req, res) => {
    try {
        const { projectId } = req.params;
        await recordAnalyticsEvent(projectId, "click", req);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Track click error:", error);
        return res.status(500).json({ success: false, message: "Unable to track click" });
    }
};

const getProjectAnalytics = async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ success: false, message: "Invalid project id" });
        }

        const project = await Project.findById(projectId).select("owner title").lean();
        if (!project) return res.status(404).json({ success: false, message: "Project not found" });
        if (String(project.owner) !== String(req.user.id)) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const cacheKey = `analytics:project:${projectId}`;
        const cached = getCache(cacheKey);
        if (cached) return res.status(200).json({ success: true, ...cached, fromCache: true });

        // Last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().split("T")[0];

        const [dailyData, totals] = await Promise.all([
            ProjectAnalytics.find({ projectId, date: { $gte: startDate } })
                .sort({ date: 1 })
                .select("-uniqueVisitorHashes -__v")
                .lean(),
            ProjectAnalytics.aggregate([
                { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
                {
                    $group: {
                        _id: null,
                        totalImpressions: { $sum: "$impressions" },
                        totalClicks: { $sum: "$clicks" },
                        totalOpens: { $sum: "$opens" },
                        totalSaves: { $sum: "$saves" },
                        totalCollaborations: { $sum: "$collaborationRequests" }
                    }
                }
            ])
        ]);

        const summary = totals[0] || {
            totalImpressions: 0, totalClicks: 0, totalOpens: 0,
            totalSaves: 0, totalCollaborations: 0
        };

        // Compute unique visitors from daily records
        const uniqueVisitorSets = await ProjectAnalytics.find({ projectId, date: { $gte: startDate } })
            .select("uniqueVisitorHashes")
            .lean();
        const allHashes = new Set(uniqueVisitorSets.flatMap(d => d.uniqueVisitorHashes || []));
        summary.uniqueVisitors30d = allHashes.size;

        const result = { analytics: dailyData, summary };
        setCache(cacheKey, result, 300); // 5 min cache

        return res.status(200).json({ success: true, projectId, title: project.title, ...result });
    } catch (error) {
        console.error("Get project analytics error:", error);
        return res.status(500).json({ success: false, message: "Unable to load analytics" });
    }
};

const getMyAnalyticsSummary = async (req, res) => {
    try {
        const cacheKey = `analytics:me:${req.user.id}`;
        const cached = getCache(cacheKey);
        if (cached) return res.status(200).json({ success: true, ...cached, fromCache: true });

        const projects = await Project.find({ owner: req.user.id }).select("_id title").lean();
        if (!projects.length) {
            return res.status(200).json({ success: true, summary: [], totalImpressions: 0, totalViews: 0 });
        }

        const projectIds = projects.map(p => p._id);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().split("T")[0];

        const summary = await ProjectAnalytics.aggregate([
            {
                $match: {
                    projectId: { $in: projectIds },
                    date: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: "$projectId",
                    impressions: { $sum: "$impressions" },
                    clicks: { $sum: "$clicks" },
                    saves: { $sum: "$saves" }
                }
            }
        ]);

        const projectMap = {};
        projects.forEach(p => { projectMap[String(p._id)] = p.title; });

        const enriched = summary.map(s => ({
            projectId: s._id,
            title: projectMap[String(s._id)] || "Unknown",
            impressions: s.impressions,
            clicks: s.clicks,
            saves: s.saves,
            ctr: s.impressions > 0 ? ((s.clicks / s.impressions) * 100).toFixed(1) : "0.0"
        }));

        const totalImpressions = enriched.reduce((sum, s) => sum + s.impressions, 0);

        const result = { summary: enriched, totalImpressions, projectCount: projects.length };
        setCache(cacheKey, result, 300);

        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error("Get analytics summary error:", error);
        return res.status(500).json({ success: false, message: "Unable to load analytics summary" });
    }
};

module.exports = {
    trackProjectImpression,
    trackProjectClick,
    getProjectAnalytics,
    getMyAnalyticsSummary,
    recordAnalyticsEvent
};
