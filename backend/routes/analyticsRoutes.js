const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const {
    trackProjectImpression,
    trackProjectClick,
    getProjectAnalytics,
    getMyAnalyticsSummary
} = require("../api/analyticsController");

// Public tracking (no auth required for impressions)
router.post("/impression/:projectId", trackProjectImpression);
router.post("/click/:projectId", trackProjectClick);

// Protected analytics
router.use(authMiddleware);
router.get("/project/:projectId", getProjectAnalytics);
router.get("/me", getMyAnalyticsSummary);

module.exports = router;
