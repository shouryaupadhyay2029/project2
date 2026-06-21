const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth").protect;
const {
    getMyNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
} = require("../api/notificationController");

router.use(authMiddleware);

router.get("/me", getMyNotifications);
router.put("/read-all", markAllNotificationsRead);
router.put("/read/:id", markNotificationRead);
router.delete("/delete/:id", deleteNotification);

module.exports = router;
