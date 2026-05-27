const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getMyActivity,
    getUserActivity,
    getActivityHeatmap
} = require('../api/activityController');

// GET /api/activity/me - Get current user's activity (protected)
router.get('/me', protect, getMyActivity);

// GET /api/activity/user/:username - Get public user activity
router.get('/user/:username', getUserActivity);

// GET /api/activity/heatmap/:username - Get activity heatmap data
router.get('/heatmap/:username', getActivityHeatmap);

module.exports = router;
