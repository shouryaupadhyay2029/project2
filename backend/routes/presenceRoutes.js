const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth").protect;
const {
  markOnline,
  heartbeat,
  markOffline,
  getPresence,
} = require("../api/presenceController");

router.use(authMiddleware);

router.put("/online", markOnline);
router.put("/heartbeat", heartbeat);
router.put("/offline", markOffline);
router.get("/user/:userId", getPresence);

module.exports = router;
