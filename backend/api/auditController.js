const AuditLog = require("../models/AuditLog");

async function createAuditLog(actor, action, req, extra = {}) {
    try {
        if (!actor || !action) return null;
        const log = await AuditLog.create({
            actor,
            actorIp: req?.ip || req?.connection?.remoteAddress || "",
            userAgent: req?.headers?.["user-agent"] || "",
            action,
            resource: extra.resource || "",
            resourceId: extra.resourceId || null,
            metadata: extra.metadata || {},
            success: extra.success !== false
        });
        return log;
    } catch (err) {
        // Audit log creation should never crash the application
        console.error("Audit log error:", err.message);
        return null;
    }
}

const getMyAuditLog = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
        const logs = await AuditLog.find({ actor: req.user.id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select("-actorIp -userAgent") // strip sensitive fields from user-facing view
            .lean();

        return res.status(200).json({ success: true, logs, count: logs.length });
    } catch (error) {
        console.error("Get audit log error:", error);
        return res.status(500).json({ success: false, message: "Unable to load audit log" });
    }
};

module.exports = { createAuditLog, getMyAuditLog };
