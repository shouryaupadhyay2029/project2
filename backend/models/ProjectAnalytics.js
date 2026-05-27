const mongoose = require("mongoose");

const dailyAnalyticsSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true
    },
    date: {
        type: String, // stored as "YYYY-MM-DD" for easy daily grouping
        required: true
    },
    impressions: { type: Number, default: 0 },
    uniqueVisitorHashes: [{ type: String }], // hashed visitor IDs (IP+UA hash)
    clicks: { type: Number, default: 0 },
    opens: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    collaborationRequests: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0 }
}, { timestamps: true });

// Unique constraint: one record per project per day
dailyAnalyticsSchema.index({ projectId: 1, date: 1 }, { unique: true });
dailyAnalyticsSchema.index({ projectId: 1, date: -1 });
dailyAnalyticsSchema.index({ date: -1 });

module.exports = mongoose.model("ProjectAnalytics", dailyAnalyticsSchema);
