const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const {
  getMyActivity,
  getUserActivity,
  getActivityHeatmap,
  getContributions,
} = require("../api/activityController");

// GET /api/activity/me - Get current user's activity (protected)
router.get("/me", authMiddleware, getMyActivity);

// GET /api/activity/user/:username - Get public user activity
router.get("/user/:username", getUserActivity);

// GET /api/activity/heatmap/:username - Get activity heatmap data
router.get("/heatmap/:username", getActivityHeatmap);

// GET /api/activity/contributions/:username - GitHub-style contribution graph
router.get("/contributions/:username", getContributions);

module.exports = router;
