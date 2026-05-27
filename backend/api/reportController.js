const mongoose = require("mongoose");
const Report = require("../models/Report");
const { createAuditLog } = require("./auditController");

function isObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

const createReport = async (req, res) => {
    try {
        const { type, targetType, targetId, reason } = req.body;

        if (!type || !targetType || !targetId || !reason) {
            return res.status(400).json({ success: false, message: "type, targetType, targetId, and reason are required" });
        }

        const validTypes = ["spam", "abuse", "fake_project", "impersonation", "harassment", "inappropriate_content", "other"];
        const validTargetTypes = ["user", "project", "message", "workspace"];

        if (!validTypes.includes(type)) {
            return res.status(400).json({ success: false, message: "Invalid report type" });
        }
        if (!validTargetTypes.includes(targetType)) {
            return res.status(400).json({ success: false, message: "Invalid target type" });
        }
        if (!isObjectId(targetId)) {
            return res.status(400).json({ success: false, message: "Invalid target id" });
        }
        if (typeof reason !== "string" || reason.trim().length < 10 || reason.length > 1000) {
            return res.status(400).json({ success: false, message: "Reason must be between 10 and 1000 characters" });
        }

        // Prevent self-report
        if (targetType === "user" && String(targetId) === String(req.user.id)) {
            return res.status(400).json({ success: false, message: "You cannot report yourself" });
        }

        const report = await Report.create({
            reporter: req.user.id,
            type,
            targetType,
            targetId,
            reason: reason.trim(),
            status: "pending"
        });

        await createAuditLog(req.user.id, "report_create", req, {
            resource: targetType,
            resourceId: targetId,
            metadata: { reportType: type, reportId: report._id }
        });

        return res.status(201).json({
            success: true,
            message: "Report submitted. Our moderation team will review it.",
            reportId: report._id
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "You have already reported this content" });
        }
        console.error("Create report error:", error);
        return res.status(500).json({ success: false, message: "Unable to submit report" });
    }
};

const getMyReports = async (req, res) => {
    try {
        const reports = await Report.find({ reporter: req.user.id })
            .select("type targetType targetId status createdAt reason")
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        return res.status(200).json({ success: true, reports, count: reports.length });
    } catch (error) {
        console.error("Get my reports error:", error);
        return res.status(500).json({ success: false, message: "Unable to load reports" });
    }
};

module.exports = { createReport, getMyReports };
