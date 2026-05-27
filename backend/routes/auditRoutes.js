const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const { getMyAuditLog } = require("../api/auditController");

router.use(authMiddleware);
router.get("/me", getMyAuditLog);

module.exports = router;
