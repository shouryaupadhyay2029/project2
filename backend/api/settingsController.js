const bcrypt = require("bcryptjs");
const User = require("../models/user");
const Project = require("../models/Project");
const Activity = require("../models/Activity");
const ContactMessage = require("../models/ContactMessage");
const { createActivity } = require("./activityController");

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
        profileVisibility: "public",
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
        user.profileVisibility = securitySettings.profileVisibility === "public";
        if (!user.privacy) user.privacy = {};
        user.privacy.twoFactorEnabled = securitySettings.twoFactorEnabled;
        user.privacy.profileIndexed = securitySettings.searchableProfile;

        await user.save();
        await logSettingsActivity(user._id, "Changed profile privacy", { section: "security", profileVisibility: securitySettings.profileVisibility });

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

        const requiresPassword = !req.user.isGoogleUser && user.password !== "google_auth_placeholder_password";
        if (requiresPassword) {
            const { password } = req.body;
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

        await Project.deleteMany({ owner: user._id });
        await Activity.deleteMany({ user: user._id });
        await ContactMessage.deleteMany({
            $or: [
                { receiver: user._id },
                { senderEmail: user.email }
            ]
        });
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
