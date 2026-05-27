const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const {
    saveProject, unsaveProject, getSavedProjects,
    saveProfile, unsaveProfile, getSavedProfiles,
    getBookmarkStatus
} = require("../api/bookmarkController");

router.use(authMiddleware);

router.post("/project/:id", saveProject);
router.delete("/project/:id", unsaveProject);
router.get("/projects", getSavedProjects);

router.post("/profile/:id", saveProfile);
router.delete("/profile/:id", unsaveProfile);
router.get("/profiles", getSavedProfiles);

router.get("/status", getBookmarkStatus);

module.exports = router;
