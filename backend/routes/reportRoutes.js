const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const { createReport, getMyReports } = require("../api/reportController");

router.use(authMiddleware);
router.post("/create", createReport);
router.get("/me", getMyReports);

module.exports = router;
