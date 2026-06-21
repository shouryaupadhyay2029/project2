const bcrypt = require("bcryptjs");
const https = require("https");
const User = require("../models/user");
const Project = require("../models/Project");
const Activity = require("../models/Activity");
const ContactMessage = require("../models/ContactMessage");
const { createActivity } = require("./activityController");
const { createAuditLog } = require("./auditController");

/**
 * Delete a Firebase Auth user using the Firebase Auth REST API.
 * Requires the user's current ID token (from Firebase client).
 * Fails silently if no token provided — local users don't have one.
 */
async function deleteFirebaseAuthUser(firebaseIdToken) {
    if (!firebaseIdToken) return;
    const apiKey = process.env.FIREBASE_API_KEY || "AIzaSyCVetFMH6RBpDVDrX20OsrhxK8Z4m-PmIg";
    const body = JSON.stringify({ idToken: firebaseIdToken });
    return new Promise((resolve) => {
        const req = https.request({
            hostname: "identitytoolkit.googleapis.com",
            path: `/v1/accounts:delete?key=${apiKey}`,
            method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
        }, (res) => {
            res.resume(); // drain response
            if (res.statusCode !== 200) {
                console.warn(`[deleteAccount] Firebase Auth deletion responded ${res.statusCode}`);
            }
            resolve();
        });
        req.on("error", (err) => {
            console.warn("[deleteAccount] Firebase Auth REST deletion failed:", err.message);
            resolve(); // non-fatal — MongoDB deletion continues
        });
        req.write(body);
        req.end();
    });
}

const DEFAULT_SETTINGS = {
    notifications: {
        emailUpdates: true,
        projectComments: true,
        collaborationRequests: true,
        productAnnouncements: false,
        securityAlerts: true
    },
    appearance: {
        theme: "dark",
        reducedMotion: false,
        compactMode: false
    },
    projectSettings: {
        autoPublish: false,
        allowForks: true,
        showProjectStats: true
    },
    ecosystem: {
        githubConnected: false,
        twitterConnected: false,
        linkedinConnected: false
    },
    security: {
        twoFactorEnabled: false,

        searchableProfile: true
    },
    advanced: {
        developerMode: false,
        betaFeatures: false,
        analyticsSharing: true
    }
};

const SECTION_FIELDS = {
    notifications: Object.keys(DEFAULT_SETTINGS.notifications),
    notificationSettings: Object.keys(DEFAULT_SETTINGS.notifications),
    appearance: Object.keys(DEFAULT_SETTINGS.appearance),
    projectSettings: Object.keys(DEFAULT_SETTINGS.projectSettings),
    ecosystem: Object.keys(DEFAULT_SETTINGS.ecosystem),
    security: Object.keys(DEFAULT_SETTINGS.security),
    advanced: Object.keys(DEFAULT_SETTINGS.advanced)
};

const THEME_VALUES = ["dark", "light", "system"];
const VISIBILITY_VALUES = ["public", "private"];

function sectionWithDefaults(user, sectionName) {
    const source = user[sectionName] || {};
    const defaultName = sectionName === "notificationSettings" ? "notifications" : sectionName;
    return SECTION_FIELDS[sectionName].reduce((settings, field) => {
        settings[field] = source[field] !== undefined ? source[field] : DEFAULT_SETTINGS[defaultName][field];
        return settings;
    }, {});
}

function safeSettings(user) {
    return {
        notifications: sectionWithDefaults(user, "notificationSettings"),
        appearance: sectionWithDefaults(user, "appearance"),
        projectSettings: sectionWithDefaults(user, "projectSettings"),
        ecosystem: sectionWithDefaults(user, "ecosystem"),
        security: sectionWithDefaults(user, "security"),
        advanced: sectionWithDefaults(user, "advanced")
    };
}

function safeUser(user) {
    return {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        settings: safeSettings(user)
    };
}

function hasUnexpectedFields(payload, allowedFields) {
    return Object.keys(payload || {}).some((field) => !allowedFields.includes(field));
}

function validateBooleanFields(payload, allowedFields) {
    for (const field of allowedFields) {
        if (payload[field] !== undefined && typeof payload[field] !== "boolean") {
            return `${field} must be a boolean`;
        }
    }
    return null;
}

async function getAuthenticatedUser(req, res) {
    const user = await User.findById(req.user.id);
    if (!user) {
        res.status(404).json({
            success: false,
            message: "User not found"
        });
        return null;
    }
    return user;
}

async function logSettingsActivity(userId, title, metadata = {}) {
    await createActivity(
        userId,
        "settings_updated",
        title,
        "",
        metadata,
        "private"
    );
}

function updateSection(user, sectionName, payload) {
    if (!user[sectionName]) {
        user[sectionName] = {};
    }

    SECTION_FIELDS[sectionName].forEach((field) => {
        if (payload[field] !== undefined) {
            user[sectionName][field] = payload[field];
        }
    });
}

const getMySettings = async(req, res) => {
    try {
        const user = await getAuthenticatedUser(req, res);
        if (!user) return;

        return res.status(200).json({
            success: true,
            settings: safeSettings(user),
            user: safeUser(user)
        });
    } catch (error) {
        console.error("Get settings error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load settings"
        });
    }
};

const updateNotifications = async(req, res) => {
    try {
        const allowed = SECTION_FIELDS.notifications;
        if (hasUnexpectedFields(req.body, allowed)) {
            return res.status(400).json({ success: false, message: "Invalid notification settings payload" });
        }

        const booleanError = validateBooleanFields(req.body, allowed);
        if (booleanError) {
            return res.status(400).json({ success: false, message: booleanError });
        }

        const user = await getAuthenticatedUser(req, res);
        if (!user) return;

        updateSection(user, "notificationSettings", req.body);
        await user.save();
        await logSettingsActivity(user._id, "Updated notification settings", { section: "notifications" });
        await createAuditLog(user._id, "settings_update", req, {
            resource: "user", resourceId: user._id,
            metadata: { section: "notifications" }
        });

        return res.status(200).json({
            success: true,
            message: "Notification settings updated",
            settings: safeSettings(user)
        });
    } catch (error) {
        console.error("Update notifications error:", error);
        return res.status(500).json({ success: false, message: "Unable to update notification settings" });
    }
};

const updateAppearance = async(req, res) => {
    try {
        const allowed = SECTION_FIELDS.appearance;
        if (hasUnexpectedFields(req.body, allowed)) {
            return res.status(400).json({ success: false, message: "Invalid appearance settings payload" });
        }

        if (req.body.theme !== undefined && !THEME_VALUES.includes(req.body.theme)) {
            return res.status(400).json({ success: false, message: "Invalid theme value" });
        }

        const booleanError = validateBooleanFields(req.body, ["reducedMotion", "compactMode"]);
        if (booleanError) {
            return res.status(400).json({ success: false, message: booleanError });
        }

        const user = await getAuthenticatedUser(req, res);
        if (!user) return;

        updateSection(user, "appearance", req.body);
        await user.save();
        await logSettingsActivity(user._id, "Updated appearance settings", { section: "appearance", theme: user.appearance.theme });
        await createAuditLog(user._id, "settings_update", req, {
            resource: "user", resourceId: user._id,
            metadata: { section: "appearance", theme: user.appearance?.theme }
        });

        return res.status(200).json({
            success: true,
            message: "Appearance settings updated",
            settings: safeSettings(user)
        });
    } catch (error) {
        console.error("Update appearance error:", error);
        return res.status(500).json({ success: false, message: "Unable to update appearance settings" });
    }
};

const updateProjects = async(req, res) => {
    try {
        const allowed = SECTION_FIELDS.projectSettings;
        if (hasUnexpectedFields(req.body, allowed)) {
            return res.status(400).json({ success: false, message: "Invalid project settings payload" });
        }

        const booleanError = validateBooleanFields(req.body, allowed);
        if (booleanError) {
            return res.status(400).json({ success: false, message: booleanError });
        }

        const user = await getAuthenticatedUser(req, res);
        if (!user) return;

        updateSection(user, "projectSettings", req.body);
        await user.save();
        await logSettingsActivity(user._id, "Updated project settings", { section: "projects" });
        await createAuditLog(user._id, "settings_update", req, {
            resource: "user", resourceId: user._id,
            metadata: { section: "projects" }
        });

        return res.status(200).json({
            success: true,
            message: "Project settings updated",
            settings: safeSettings(user)
        });
    } catch (error) {
        console.error("Update project settings error:", error);
        return res.status(500).json({ success: false, message: "Unable to update project settings" });
    }
};

const updateEcosystem = async(req, res) => {
    try {
        const allowed = SECTION_FIELDS.ecosystem;
        if (hasUnexpectedFields(req.body, allowed)) {
            return res.status(400).json({ success: false, message: "Invalid ecosystem settings payload" });
        }

        const booleanError = validateBooleanFields(req.body, allowed);
        if (booleanError) {
            return res.status(400).json({ success: false, message: booleanError });
        }

        const user = await getAuthenticatedUser(req, res);
        if (!user) return;

        updateSection(user, "ecosystem", req.body);
        await user.save();
        await logSettingsActivity(user._id, "Updated ecosystem settings", { section: "ecosystem" });
        await createAuditLog(user._id, "settings_update", req, {
            resource: "user", resourceId: user._id,
            metadata: { section: "ecosystem" }
        });

        return res.status(200).json({
            success: true,
            message: "Ecosystem settings updated",
            settings: safeSettings(user)
        });
    } catch (error) {
        console.error("Update ecosystem error:", error);
        return res.status(500).json({ success: false, message: "Unable to update ecosystem settings" });
    }
};

const updateSecurity = async(req, res) => {
    try {
        const allowed = SECTION_FIELDS.security;
        if (hasUnexpectedFields(req.body, allowed)) {
            return res.status(400).json({ success: false, message: "Invalid security settings payload" });
        }

        if (req.body.profileVisibility !== undefined && !VISIBILITY_VALUES.includes(req.body.profileVisibility)) {
            return res.status(400).json({ success: false, message: "Invalid profile visibility value" });
        }

        const booleanError = validateBooleanFields(req.body, ["twoFactorEnabled", "searchableProfile"]);
        if (booleanError) {
            return res.status(400).json({ success: false, message: booleanError });
        }

        const user = await getAuthenticatedUser(req, res);
        if (!user) return;

        updateSection(user, "security", req.body);
        const securitySettings = sectionWithDefaults(user, "security");

        await user.save();
        await logSettingsActivity(user._id, "Changed profile privacy", { section: "security", profileVisibility: securitySettings.profileVisibility });
        await createAuditLog(user._id, "settings_update", req, {
            resource: "user", resourceId: user._id,
            metadata: { section: "security", profileVisibility: securitySettings.profileVisibility }
        });

        return res.status(200).json({
            success: true,
            message: "Security settings updated",
            settings: safeSettings(user)
        });
    } catch (error) {
        console.error("Update security error:", error);
        return res.status(500).json({ success: false, message: "Unable to update security settings" });
    }
};

const updateAdvanced = async(req, res) => {
    try {
        const allowed = SECTION_FIELDS.advanced;
        if (hasUnexpectedFields(req.body, allowed)) {
            return res.status(400).json({ success: false, message: "Invalid advanced settings payload" });
        }

        const booleanError = validateBooleanFields(req.body, allowed);
        if (booleanError) {
            return res.status(400).json({ success: false, message: booleanError });
        }

        const user = await getAuthenticatedUser(req, res);
        if (!user) return;

        updateSection(user, "advanced", req.body);
        await user.save();

        const title = req.body.developerMode === true ? "Enabled developer mode" : "Updated advanced settings";
        await logSettingsActivity(user._id, title, { section: "advanced" });
        await createAuditLog(user._id, "settings_update", req, {
            resource: "user", resourceId: user._id,
            metadata: { section: "advanced", developerMode: req.body.developerMode }
        });

        return res.status(200).json({
            success: true,
            message: "Advanced settings updated",
            settings: safeSettings(user)
        });
    } catch (error) {
        console.error("Update advanced error:", error);
        return res.status(500).json({ success: false, message: "Unable to update advanced settings" });
    }
};

const deleteAccount = async(req, res) => {
    try {
        const user = await getAuthenticatedUser(req, res);
        if (!user) return;

        const { password, firebaseToken } = req.body;

        // ── 1. Password confirmation for non-Google users ─────────────────────
        const requiresPassword = !req.user.isGoogleUser && user.password !== "google_auth_placeholder_password";
        if (requiresPassword) {
            if (!password || typeof password !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Password confirmation is required"
                });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(403).json({
                    success: false,
                    message: "Password confirmation failed"
                });
            }
        }

        // ── 2. Remove user from all followers/following/savedProfiles lists ───
        await User.updateMany(
            {
                $or: [
                    { followers: user._id },
                    { following: user._id },
                    { savedProfiles: user._id }
                ]
            },
            {
                $pull: {
                    followers: user._id,
                    following: user._id,
                    savedProfiles: user._id
                }
            }
        );

        // ── 3. Core cascade deletions ─────────────────────────────────────────
        const userProjectIds = await Project.find({ owner: user._id }).distinct("_id");

        // Project analytics keyed to the user's projects
        try {
            const ProjectAnalytics = require("../models/ProjectAnalytics");
            if (userProjectIds.length > 0) {
                await ProjectAnalytics.deleteMany({ projectId: { $in: userProjectIds } });
            }
        } catch (e) { console.error("Cascade delete ProjectAnalytics error:", e.message); }

        await Project.deleteMany({ owner: user._id });
        await Activity.deleteMany({ user: user._id });
        await ContactMessage.deleteMany({
            $or: [{ receiver: user._id }, { senderEmail: user.email }]
        });

        // Messages & Conversations
        try {
            const Message = require("../models/Message");
            const Conversation = require("../models/Conversation");
            // Find conversations the user participated in
            const convIds = await Conversation.find({ participants: user._id }).distinct("_id");
            if (convIds.length > 0) {
                await Message.deleteMany({ conversationId: { $in: convIds } });
                await Conversation.deleteMany({ _id: { $in: convIds } });
            }
            // Also remove any messages sent by the user in other conversations
            await Message.deleteMany({ sender: user._id });
        } catch (e) { console.error("Cascade delete Message/Conversation error:", e.message); }

        // Reports submitted by or targeting the user
        try {
            const Report = require("../models/Report");
            await Report.deleteMany({
                $or: [
                    { reporter: user._id },
                    { targetType: "user", targetId: user._id }
                ]
            });
        } catch (e) { console.error("Cascade delete Report error:", e.message); }

        // Workspaces: delete owned workspaces, remove from member lists
        try {
            const Workspace = require("../models/Workspace");
            await Workspace.deleteMany({ owner: user._id });
            await Workspace.updateMany(
                { "members.user": user._id },
                { $pull: { members: { user: user._id } } }
            );
        } catch (e) { console.error("Cascade delete Workspace error:", e.message); }

        // Achievements
        try {
            const Achievement = require("../models/Achievement");
            await Achievement.deleteMany({ userId: user._id });
        } catch (e) { console.error("Cascade delete Achievement error:", e.message); }

        // Collaboration Requests
        try {
            const CollaborationRequest = require("../models/CollaborationRequest");
            await CollaborationRequest.deleteMany({
                $or: [{ sender: user._id }, { receiver: user._id }]
            });
        } catch (e) { console.error("Cascade delete CollaborationRequest error:", e.message); }

        // API Keys
        try {
            const ApiKey = require("../models/ApiKey");
            await ApiKey.deleteMany({ owner: user._id });
        } catch (e) { console.error("Cascade delete API Key error:", e.message); }

        // Audit Logs
        try {
            const AuditLog = require("../models/AuditLog");
            await AuditLog.deleteMany({ actor: user._id });
        } catch (e) { console.error("Cascade delete AuditLog error:", e.message); }

        // ── 4. Firebase Auth user deletion ───────────────────────────────────
        if (firebaseToken) {
            await deleteFirebaseAuthUser(firebaseToken);
        }

        // ── 5. Write audit log before the user document is destroyed ─────────
        // (Actor must still exist in DB when AuditLog.create runs)
        await createAuditLog(user._id, "account_delete", req, {
            resource: "user",
            resourceId: user._id,
            metadata: { username: user.username, email: user.email }
        });

        // ── 6. Finally: remove the User document ─────────────────────────────
        await User.findByIdAndDelete(user._id);

        return res.status(200).json({
            success: true,
            message: "Account deleted successfully"
        });
    } catch (error) {
        console.error("Delete account error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to delete account"
        });
    }
};

module.exports = {
    getMySettings,
    updateNotifications,
    updateAppearance,
    updateProjects,
    updateEcosystem,
    updateSecurity,
    updateAdvanced,
    deleteAccount
};
