const express = require("express");
const router = express.Router();
const {
  searchUsers,
  searchProjects,
  globalSearch,
  getTrendingSearches,
} = require("../api/searchController");

router.get("/users", searchUsers);
router.get("/projects", searchProjects);
router.get("/global", globalSearch);
router.get("/trending", getTrendingSearches);

module.exports = router;
