const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const {
    getMySettings,
    updateNotifications,
    updateAppearance,
    updateProjects,
    updateEcosystem,
    updateSecurity,
    updateAdvanced,
    deleteAccount
} = require("../api/settingsController");

router.get("/me", authMiddleware, getMySettings);
router.put("/notifications", authMiddleware, updateNotifications);
router.put("/appearance", authMiddleware, updateAppearance);
router.put("/projects", authMiddleware, updateProjects);
router.put("/ecosystem", authMiddleware, updateEcosystem);
router.put("/security", authMiddleware, updateSecurity);
router.put("/advanced", authMiddleware, updateAdvanced);
router.delete("/delete-account", authMiddleware, deleteAccount);

module.exports = router;
