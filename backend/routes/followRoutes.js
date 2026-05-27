const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const {
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing
} = require("../api/followController");

router.get("/followers/:username", getFollowers);
router.get("/following/:username", getFollowing);
router.post("/:userId", authMiddleware, followUser);
router.post("/unfollow/:userId", authMiddleware, unfollowUser);

module.exports = router;
