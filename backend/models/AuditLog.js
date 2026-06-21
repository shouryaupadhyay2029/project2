const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    actorIp: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    action: {
        type: String,
        required: true,
        enum: [
            "auth_register", "auth_login", "auth_logout",
            "profile_update", "avatar_change", "username_change",
            "settings_update", "account_delete",
            "project_create", "project_update", "project_delete", "project_feature",
            "follow_user", "unfollow_user",
            "collaboration_request", "collaboration_accept", "collaboration_reject",
            "message_send",
            "workspace_create", "workspace_update", "member_add", "member_remove", "role_change",
            "bookmark_add", "bookmark_remove",
            "report_create",
            "achievement_unlock",
            "moderation_action"
        ]
    },
    resource: { type: String, default: "" }, // "project", "user", "workspace", etc.
    resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    metadata: { type: Object, default: {} },
    success: { type: Boolean, default: true }
}, {
    timestamps: true,
    // Audit logs are append-only — never update existing documents
});

// Indexes for efficient querying
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorIp: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
