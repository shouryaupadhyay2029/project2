const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        role: {
            type: String,
            enum: ["owner", "admin", "editor", "viewer"],
            default: "viewer"
        }
    }],
    projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project"
    }]
}, {
    timestamps: true
});

workspaceSchema.index({ owner: 1, updatedAt: -1 });
workspaceSchema.index({ "members.user": 1, updatedAt: -1 });

module.exports = mongoose.model("Workspace", workspaceSchema);
