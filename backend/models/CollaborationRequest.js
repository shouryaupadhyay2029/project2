const mongoose = require("mongoose");

const collaborationRequestSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    message: {
        type: String,
        maxlength: 500,
        default: ""
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending"
    }
}, {
    timestamps: true
});

collaborationRequestSchema.index({ projectId: 1, sender: 1, receiver: 1, status: 1 });
collaborationRequestSchema.index({ receiver: 1, createdAt: -1 });
collaborationRequestSchema.index({ sender: 1, createdAt: -1 });

module.exports = mongoose.model("CollaborationRequest", collaborationRequestSchema);
