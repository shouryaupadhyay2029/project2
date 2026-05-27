const express = require("express");
const router = express.Router();
const { getTrendingProjects, getTrendingUsers } = require("../api/trendingController");

// Public routes (no auth required for trending)
router.get("/projects", getTrendingProjects);
router.get("/users", getTrendingUsers);

module.exports = router;
