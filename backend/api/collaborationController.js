const mongoose = require("mongoose");
const CollaborationRequest = require("../models/CollaborationRequest");
const Project = require("../models/Project");
const User = require("../models/user");
const { createNotification } = require("./notificationController");
const { createActivity } = require("./activityController");

function isObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

function sanitizeText(value, maxLength) {
    return String(value || "").replace(/[<>]/g, "").trim().slice(0, maxLength);
}

function requestResponse(request) {
    return {
        id: request._id,
        projectId: request.projectId,
        sender: request.sender,
        receiver: request.receiver,
        message: request.message,
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
    };
}

const sendCollaborationRequest = async(req, res) => {
    try {
        const { projectId } = req.body;
        let { receiverId } = req.body;
        const message = sanitizeText(req.body.message, 500);

        if (!isObjectId(projectId)) {
            return res.status(400).json({ success: false, message: "Invalid project id" });
        }

        const project = await Project.findById(projectId).select("title owner collaborators").lean();
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        receiverId = receiverId || String(project.owner);
        if (!isObjectId(receiverId)) {
            return res.status(400).json({ success: false, message: "Invalid receiver id" });
        }
        if (String(receiverId) === String(req.user.id)) {
            return res.status(400).json({ success: false, message: "You cannot request collaboration from yourself" });
        }
        if ((project.collaborators || []).some((member) => String(member.user) === String(req.user.id))) {
            return res.status(400).json({ success: false, message: "You are already a collaborator" });
        }

        const receiver = await User.findById(receiverId).select("username").lean();
        if (!receiver) {
            return res.status(404).json({ success: false, message: "Receiver not found" });
        }

        const duplicate = await CollaborationRequest.findOne({
            projectId,
            sender: req.user.id,
            receiver: receiverId,
            status: "pending"
        }).lean();
        if (duplicate) {
            return res.status(400).json({ success: false, message: "Collaboration request already pending" });
        }

        const request = await CollaborationRequest.create({
            projectId,
            sender: req.user.id,
            receiver: receiverId,
            message
        });

        const sender = await User.findById(req.user.id).select("username").lean();
        await Promise.all([
            createNotification(receiverId, {
                type: "collaboration_request",
                title: "Collaboration Request",
                message: `${sender?.username || "Someone"} wants to collaborate on ${project.title}`,
                metadata: { requestId: request._id, projectId }
            }),
            createActivity(req.user.id, "collaboration_requested", "Collaboration requested", `Requested to collaborate on ${project.title}`, { requestId: request._id, projectId }, "public")
        ]);

        return res.status(201).json({ success: true, request: requestResponse(request) });
    } catch (error) {
        console.error("Send collaboration request error:", error);
        return res.status(500).json({ success: false, message: "Unable to send collaboration request" });
    }
};

async function updateRequestStatus(req, res, status) {
    const { id } = req.params;
    if (!isObjectId(id)) {
        return res.status(400).json({ success: false, message: "Invalid request id" });
    }

    const request = await CollaborationRequest.findById(id);
    if (!request) {
        return res.status(404).json({ success: false, message: "Collaboration request not found" });
    }
    if (String(request.receiver) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: "You cannot update this request" });
    }
    if (request.status !== "pending") {
        return res.status(400).json({ success: false, message: "Request has already been resolved" });
    }

    request.status = status;
    await request.save();

    const project = await Project.findById(request.projectId).select("title collaborators");
    if (status === "accepted" && project) {
        const alreadyCollaborator = (project.collaborators || []).some((member) => String(member.user) === String(request.sender));
        if (!alreadyCollaborator) {
            project.collaborators.push({ user: request.sender, role: "editor" });
            await project.save();
        }
    }

    await Promise.all([
        createNotification(request.sender, {
            type: status === "accepted" ? "collaboration_accepted" : "collaboration_rejected",
            title: status === "accepted" ? "Collaboration Accepted" : "Collaboration Rejected",
            message: `Your collaboration request for ${project?.title || "a project"} was ${status}`,
            metadata: { requestId: request._id, projectId: request.projectId }
        }),
        createActivity(req.user.id, status === "accepted" ? "collaboration_accepted" : "collaboration_rejected", status === "accepted" ? "Collaboration accepted" : "Collaboration rejected", `${status} a collaboration request`, { requestId: request._id, projectId: request.projectId }, "private")
    ]);

    return res.status(200).json({ success: true, request: requestResponse(request) });
}

const acceptCollaborationRequest = async(req, res) => {
    try {
        return await updateRequestStatus(req, res, "accepted");
    } catch (error) {
        console.error("Accept collaboration request error:", error);
        return res.status(500).json({ success: false, message: "Unable to accept collaboration request" });
    }
};

const rejectCollaborationRequest = async(req, res) => {
    try {
        return await updateRequestStatus(req, res, "rejected");
    } catch (error) {
        console.error("Reject collaboration request error:", error);
        return res.status(500).json({ success: false, message: "Unable to reject collaboration request" });
    }
};

const getIncomingRequests = async(req, res) => {
    try {
        const requests = await CollaborationRequest.find({ receiver: req.user.id })
            .populate("sender", "username displayName profilePhoto")
            .populate("projectId", "title thumbnail status")
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        return res.status(200).json({ success: true, requests: requests.map(requestResponse) });
    } catch (error) {
        console.error("Get incoming collaboration requests error:", error);
        return res.status(500).json({ success: false, message: "Unable to load incoming requests" });
    }
};

const getOutgoingRequests = async(req, res) => {
    try {
        const requests = await CollaborationRequest.find({ sender: req.user.id })
            .populate("receiver", "username displayName profilePhoto")
            .populate("projectId", "title thumbnail status")
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        return res.status(200).json({ success: true, requests: requests.map(requestResponse) });
    } catch (error) {
        console.error("Get outgoing collaboration requests error:", error);
        return res.status(500).json({ success: false, message: "Unable to load outgoing requests" });
    }
};

module.exports = {
    sendCollaborationRequest,
    acceptCollaborationRequest,
    rejectCollaborationRequest,
    getIncomingRequests,
    getOutgoingRequests
};
