const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ["spam", "abuse", "fake_project", "impersonation", "harassment", "inappropriate_content", "other"]
    },
    targetType: {
        type: String,
        required: true,
        enum: ["user", "project", "message", "workspace"]
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    reason: {
        type: String,
        required: true,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: ["pending", "reviewed", "resolved", "dismissed"],
        default: "pending"
    },
    moderatorNote: { type: String, default: "" },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

// Prevent duplicate reports from the same user on the same target
reportSchema.index({ reporter: 1, targetId: 1, type: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetId: 1, targetType: 1 });
reportSchema.index({ reporter: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
