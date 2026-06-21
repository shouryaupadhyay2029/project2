const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth").protect;
const { getMyFeed } = require("../api/feedController");

router.use(authMiddleware);
router.get("/me", getMyFeed);

module.exports = router;
