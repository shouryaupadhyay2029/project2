const mongoose = require("mongoose");
const Workspace = require("../models/Workspace");
const User = require("../models/user");
const Project = require("../models/Project");
const { createNotification } = require("./notificationController");
const { createActivity } = require("./activityController");

const ROLES = ["owner", "admin", "editor", "viewer"];

function isObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function sanitizeName(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 80);
}

function sanitizeProjectIds(projects) {
  if (!Array.isArray(projects)) return [];
  return [...new Set(projects.filter(isObjectId).map(String))];
}

function memberRole(workspace, userId) {
  if (String(workspace.owner) === String(userId)) return "owner";
  const member = (workspace.members || []).find(
    (item) => String(item.user) === String(userId),
  );
  return member?.role || null;
}

function canManageMembers(role) {
  return role === "owner" || role === "admin";
}

function workspaceResponse(workspace) {
  return {
    id: workspace._id,
    name: workspace.name,
    owner: workspace.owner,
    members: workspace.members || [],
    projects: workspace.projects || [],
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

async function loadWorkspaceForMember(workspaceId, userId) {
  if (!isObjectId(workspaceId)) return null;
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return null;
  const role = memberRole(workspace, userId);
  return role ? { workspace, role } : null;
}

const createWorkspace = async (req, res) => {
  try {
    const name = sanitizeName(req.body.name);
    const projectIds = sanitizeProjectIds(req.body.projects);
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Workspace name is required" });
    }

    if (projectIds.length) {
      const projectCount = await Project.countDocuments({
        _id: { $in: projectIds },
        owner: req.user.id,
      });
      if (projectCount !== projectIds.length) {
        return res
          .status(403)
          .json({
            success: false,
            message: "You can only link projects you own",
          });
      }
    }

    const workspace = await Workspace.create({
      name,
      owner: req.user.id,
      members: [{ user: req.user.id, role: "owner" }],
      projects: projectIds,
    });

    await createActivity(
      req.user.id,
      "workspace_created",
      "Workspace created",
      `Created workspace ${name}`,
      { workspaceId: workspace._id },
      "private",
    );

    return res
      .status(201)
      .json({ success: true, workspace: workspaceResponse(workspace) });
  } catch (error) {
    console.error("Create workspace error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to create workspace" });
  }
};

const getMyWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      $or: [{ owner: req.user.id }, { "members.user": req.user.id }],
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    return res
      .status(200)
      .json({ success: true, workspaces: workspaces.map(workspaceResponse) });
  } catch (error) {
    console.error("Get workspaces error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load workspaces" });
  }
};

const getWorkspace = async (req, res) => {
  try {
    const loaded = await loadWorkspaceForMember(req.params.id, req.user.id);
    if (!loaded) {
      return res
        .status(404)
        .json({ success: false, message: "Workspace not found" });
    }

    await loaded.workspace.populate([
      {
        path: "members.user",
        select: "username displayName profilePhoto isOnline lastSeen",
      },
      { path: "projects", select: "title status thumbnail" },
    ]);

    return res
      .status(200)
      .json({
        success: true,
        role: loaded.role,
        workspace: workspaceResponse(loaded.workspace),
      });
  } catch (error) {
    console.error("Get workspace error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load workspace" });
  }
};

const addMember = async (req, res) => {
  try {
    const { workspaceId, userId } = req.body;
    const role =
      ROLES.includes(req.body.role) && req.body.role !== "owner"
        ? req.body.role
        : "viewer";

    if (!isObjectId(workspaceId) || !isObjectId(userId)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Valid workspace and user are required",
        });
    }

    const loaded = await loadWorkspaceForMember(workspaceId, req.user.id);
    if (!loaded || !canManageMembers(loaded.role)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "You cannot manage members in this workspace",
        });
    }

    const user = await User.findById(userId).select("username").lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const exists = loaded.workspace.members.some(
      (member) => String(member.user) === String(userId),
    );
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "User is already a member" });
    }

    loaded.workspace.members.push({ user: userId, role });
    await loaded.workspace.save();

    await Promise.all([
      createNotification(userId, {
        type: "workspace_invite",
        title: "Workspace Invite",
        message: `You were added to ${loaded.workspace.name}`,
        metadata: { workspaceId: loaded.workspace._id, role },
      }),
      createActivity(
        req.user.id,
        "member_added",
        "Workspace member added",
        `Added ${user.username} to ${loaded.workspace.name}`,
        { workspaceId: loaded.workspace._id, userId, role },
        "private",
      ),
    ]);

    return res
      .status(200)
      .json({ success: true, workspace: workspaceResponse(loaded.workspace) });
  } catch (error) {
    console.error("Add workspace member error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to add member" });
  }
};

const removeMember = async (req, res) => {
  try {
    const { workspaceId, userId } = req.body;
    if (!isObjectId(workspaceId) || !isObjectId(userId)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Valid workspace and user are required",
        });
    }

    const loaded = await loadWorkspaceForMember(workspaceId, req.user.id);
    if (!loaded || !canManageMembers(loaded.role)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "You cannot manage members in this workspace",
        });
    }
    if (String(loaded.workspace.owner) === String(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Workspace owner cannot be removed" });
    }

    loaded.workspace.members = loaded.workspace.members.filter(
      (member) => String(member.user) !== String(userId),
    );
    await loaded.workspace.save();

    await Promise.all([
      createNotification(userId, {
        type: "workspace_removed",
        title: "Workspace Access Removed",
        message: `You were removed from ${loaded.workspace.name}`,
        metadata: { workspaceId: loaded.workspace._id },
      }),
      createActivity(
        req.user.id,
        "member_removed",
        "Workspace member removed",
        `Removed a member from ${loaded.workspace.name}`,
        { workspaceId: loaded.workspace._id, userId },
        "private",
      ),
    ]);

    return res
      .status(200)
      .json({ success: true, workspace: workspaceResponse(loaded.workspace) });
  } catch (error) {
    console.error("Remove workspace member error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to remove member" });
  }
};

const changeRole = async (req, res) => {
  try {
    const { workspaceId, userId } = req.body;
    const { role } = req.body;
    if (
      !isObjectId(workspaceId) ||
      !isObjectId(userId) ||
      !ROLES.includes(role) ||
      role === "owner"
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Valid workspace, user, and role are required",
        });
    }

    const loaded = await loadWorkspaceForMember(workspaceId, req.user.id);
    if (!loaded || !canManageMembers(loaded.role)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "You cannot manage roles in this workspace",
        });
    }
    if (String(loaded.workspace.owner) === String(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Owner role cannot be changed" });
    }

    const member = loaded.workspace.members.find(
      (item) => String(item.user) === String(userId),
    );
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    member.role = role;
    await loaded.workspace.save();

    await Promise.all([
      createNotification(userId, {
        type: "workspace_role_changed",
        title: "Workspace Role Updated",
        message: `Your role in ${loaded.workspace.name} is now ${role}`,
        metadata: { workspaceId: loaded.workspace._id, role },
      }),
      createActivity(
        req.user.id,
        "role_changed",
        "Workspace role changed",
        `Changed a workspace member role to ${role}`,
        { workspaceId: loaded.workspace._id, userId, role },
        "private",
      ),
    ]);

    return res
      .status(200)
      .json({ success: true, workspace: workspaceResponse(loaded.workspace) });
  } catch (error) {
    console.error("Change workspace role error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to change role" });
  }
};

const deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid workspace id" });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res
        .status(404)
        .json({ success: false, message: "Workspace not found" });
    }
    if (String(workspace.owner) !== String(req.user.id)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Only the owner can delete this workspace",
        });
    }

    await Workspace.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ success: true, message: "Workspace deleted" });
  } catch (error) {
    console.error("Delete workspace error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to delete workspace" });
  }
};

const getWorkspaceActivity = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const loaded = await loadWorkspaceForMember(workspaceId, req.user.id);
    if (!loaded) {
      return res
        .status(404)
        .json({ success: false, message: "Workspace not found" });
    }

    const Activity = require("../models/Activity");

    // Get activities related to this workspace from all members
    const memberIds = loaded.workspace.members.map((m) => m.user);
    const activities = await Activity.find({
      user: { $in: memberIds },
      "metadata.workspaceId": loaded.workspace._id,
    })
      .populate("user", "username displayName profilePhoto")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ success: true, activities, workspaceId });
  } catch (error) {
    console.error("Get workspace activity error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load workspace activity" });
  }
};

module.exports = {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  addMember,
  removeMember,
  changeRole,
  deleteWorkspace,
  getWorkspaceActivity,
};
