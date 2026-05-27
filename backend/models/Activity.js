const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      "profile_updated",
      "project_created",
      "project_updated",
      "project_deleted",
      "featured_project_changed",
      "settings_updated",
      "profile_customized",
      "follow_user",
      "unfollow_user",
      "profile_visit",
      "message_sent",
      "collaboration_requested",
      "collaboration_accepted",
      "collaboration_rejected",
      "workspace_created",
      "member_added",
      "member_removed",
      "role_changed",
    ],
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  metadata: {
    type: Object,
    default: {},
  },
  visibility: {
    type: String,
    enum: ["public", "private"],
    default: "public",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for efficient activity queries
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ user: 1, visibility: 1, createdAt: -1 });
activitySchema.index({ type: 1 });

module.exports = mongoose.model("Activity", activitySchema);
