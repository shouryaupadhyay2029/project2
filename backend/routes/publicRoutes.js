const express = require("express");
const router = express.Router();
// const { requireApiKey } = require("../public-api/apiKeyMiddleware");
const {
  getPublicProjects,
  getPublicUser,
  getPublicTrending,
} = require("../public-api/publicController");

// Public API routes are currently unauthenticated to avoid breaking public usage.
// To require API keys later, insert requireApiKey before the controller, e.g.:
// router.get("/projects", requireApiKey, getPublicProjects);
router.get("/projects", getPublicProjects);
router.get("/users/:username", getPublicUser);
router.get("/trending", getPublicTrending);

module.exports = router;
