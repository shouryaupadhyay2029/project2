const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const {
    getMyAchievements,
    getUserAchievements
} = require("../api/achievementController");

router.use(authMiddleware);

router.get("/me", getMyAchievements);
router.get("/:username", getUserAchievements);

module.exports = router;
