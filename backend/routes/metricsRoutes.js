const express = require("express");
const router = express.Router();
const { getMetricsSnapshot } = require("../utils/metrics");

// Production-safe minimal metrics snapshot. No secrets or environment values are exposed.
// Add authentication before mounting this route in production if metrics should be private.
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    data: getMetricsSnapshot(),
  });
});

module.exports = router;
