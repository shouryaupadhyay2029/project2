const mongoose = require("mongoose");

const ACHIEVEMENT_TYPES = [
    "profile_complete",
    "first_project",
    "top_creator",
    "collaborator",
    "trending_project",
    "open_source",
    "active_developer",
    "community_helper",
    "verified_creator",
    "early_adopter",
    "prolific_builder",
    "network_builder",
    "streak_7",
    "streak_30"
];

const RARITIES = ["common", "rare", "epic", "legendary"];

const achievementSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ACHIEVEMENT_TYPES,
        required: true
    },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    rarity: {
        type: String,
        enum: RARITIES,
        default: "common"
    },
    progress: { type: Number, default: 100, min: 0, max: 100 },
    isVisible: { type: Boolean, default: true },
    unlockedAt: { type: Date, default: Date.now },
    metadata: { type: Object, default: {} }
}, { timestamps: true });

// One achievement type per user (no duplicates)
achievementSchema.index({ userId: 1, type: 1 }, { unique: true });
achievementSchema.index({ userId: 1, unlockedAt: -1 });
achievementSchema.index({ type: 1, rarity: 1 });

module.exports = mongoose.model("Achievement", achievementSchema);
module.exports.ACHIEVEMENT_TYPES = ACHIEVEMENT_TYPES;
