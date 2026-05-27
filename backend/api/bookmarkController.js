const mongoose = require("mongoose");
const User = require("../models/user");
const Project = require("../models/Project");
const { delCache } = require("../utils/cache");

function isObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

// ─── Project Bookmarks ────────────────────────────────────────

const saveProject = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ success: false, message: "Invalid project id" });

        const project = await Project.findById(id).select("_id title owner").lean();
        if (!project) return res.status(404).json({ success: false, message: "Project not found" });

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $addToSet: { savedProjects: id } },
            { new: true, select: "savedProjects" }
        ).lean();

        delCache(`bookmarks:projects:${req.user.id}`);

        // Emit socket event
        try {
            const { emitToUser } = require("../socket/socketServer");
            emitToUser(String(req.user.id), "bookmark_updated", {
                action: "saved",
                type: "project",
                id,
                title: project.title
            });
        } catch (e) {}

        return res.status(200).json({
            success: true,
            message: "Project saved",
            savedCount: user.savedProjects.length
        });
    } catch (error) {
        console.error("Save project error:", error);
        return res.status(500).json({ success: false, message: "Unable to save project" });
    }
};

const unsaveProject = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ success: false, message: "Invalid project id" });

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { savedProjects: new mongoose.Types.ObjectId(id) } },
            { new: true, select: "savedProjects" }
        ).lean();

        delCache(`bookmarks:projects:${req.user.id}`);

        try {
            const { emitToUser } = require("../socket/socketServer");
            emitToUser(String(req.user.id), "bookmark_updated", { action: "unsaved", type: "project", id });
        } catch (e) {}

        return res.status(200).json({
            success: true,
            message: "Project removed from saved",
            savedCount: user.savedProjects.length
        });
    } catch (error) {
        console.error("Unsave project error:", error);
        return res.status(500).json({ success: false, message: "Unable to remove saved project" });
    }
};

const getSavedProjects = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("savedProjects").lean();
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const projects = await Project.find({ _id: { $in: user.savedProjects || [] } })
            .select("title description techStack status featured thumbnail likes views owner createdAt")
            .populate("owner", "username displayName profilePhoto")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            projects,
            count: projects.length
        });
    } catch (error) {
        console.error("Get saved projects error:", error);
        return res.status(500).json({ success: false, message: "Unable to load saved projects" });
    }
};

// ─── Profile Bookmarks ────────────────────────────────────────

const saveProfile = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ success: false, message: "Invalid user id" });
        if (String(id) === String(req.user.id)) {
            return res.status(400).json({ success: false, message: "You cannot save your own profile" });
        }

        const target = await User.findById(id).select("_id username").lean();
        if (!target) return res.status(404).json({ success: false, message: "User not found" });

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $addToSet: { savedProfiles: id } },
            { new: true, select: "savedProfiles" }
        ).lean();

        delCache(`bookmarks:profiles:${req.user.id}`);

        return res.status(200).json({
            success: true,
            message: "Profile saved",
            savedCount: user.savedProfiles.length
        });
    } catch (error) {
        console.error("Save profile error:", error);
        return res.status(500).json({ success: false, message: "Unable to save profile" });
    }
};

const unsaveProfile = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ success: false, message: "Invalid user id" });

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { savedProfiles: new mongoose.Types.ObjectId(id) } },
            { new: true, select: "savedProfiles" }
        ).lean();

        delCache(`bookmarks:profiles:${req.user.id}`);

        return res.status(200).json({
            success: true,
            message: "Profile removed from saved",
            savedCount: user.savedProfiles.length
        });
    } catch (error) {
        console.error("Unsave profile error:", error);
        return res.status(500).json({ success: false, message: "Unable to remove saved profile" });
    }
};

const getSavedProfiles = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("savedProfiles").lean();
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const profiles = await User.find({
            _id: { $in: user.savedProfiles || [] },
            isBanned: { $ne: true }
        })
            .select("username displayName bio profilePhoto skills developerTags followers following isOnline lastSeen")
            .lean();

        return res.status(200).json({ success: true, profiles, count: profiles.length });
    } catch (error) {
        console.error("Get saved profiles error:", error);
        return res.status(500).json({ success: false, message: "Unable to load saved profiles" });
    }
};

const getBookmarkStatus = async (req, res) => {
    try {
        const { projectId } = req.query;
        const user = await User.findById(req.user.id).select("savedProjects savedProfiles").lean();
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const savedProjectIds = (user.savedProjects || []).map(String);
        const result = {};
        if (projectId && isObjectId(projectId)) {
            result.projectSaved = savedProjectIds.includes(String(projectId));
        }
        result.savedProjectCount = savedProjectIds.length;
        result.savedProfileCount = (user.savedProfiles || []).length;

        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error("Get bookmark status error:", error);
        return res.status(500).json({ success: false, message: "Unable to get bookmark status" });
    }
};

module.exports = {
    saveProject, unsaveProject, getSavedProjects,
    saveProfile, unsaveProfile, getSavedProfiles,
    getBookmarkStatus
};
