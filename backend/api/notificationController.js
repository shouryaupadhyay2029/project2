const mongoose = require("mongoose");
const User = require("../models/user");

function getSocketEmitter() {
  try {
    return require("../socket/socketServer");
  } catch (e) {
    return { emitToUser: () => { } };
  }
}

function sanitizeNotification(notification) {
  return {
    id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    priority: notification.priority || "normal",
    groupKey: notification.groupKey || "",
    silent: !!notification.silent,
    expiresAt: notification.expiresAt || null,
    createdAt: notification.createdAt,
    metadata: notification.metadata || {},
  };
}

function buildGroupKey(notification) {
  if (notification.groupKey) return String(notification.groupKey).slice(0, 120);
  const metadata = notification.metadata || {};
  return [
    notification.type || "general",
    metadata.projectId || "",
    metadata.conversationId || "",
    metadata.sender || "",
  ]
    .filter(Boolean)
    .join(":")
    .slice(0, 120);
}

async function createNotification(userId, notification) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;

  const groupKey = buildGroupKey(notification);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  // Deduplicate noisy notifications within a short window.
  const duplicate = await User.findOne({
    _id: userId,
    notifications: {
      $elemMatch: {
        type: notification.type || "general",
        groupKey,
        createdAt: { $gte: tenMinutesAgo },
      },
    },
  })
    .select("_id")
    .lean();

  if (duplicate && notification.dedupe !== false) return null;

  const expiresAt =
    notification.expiresAt || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $pull: { notifications: { expiresAt: { $lt: new Date() } } },
      $push: {
        notifications: {
          $each: [
            {
              type: notification.type || "general",
              title: notification.title || "Notification",
              message: notification.message || "",
              read: false,
              priority: notification.priority || "normal",
              groupKey,
              silent: !!notification.silent,
              expiresAt,
              createdAt: new Date(),
              metadata: notification.metadata || {},
            },
          ],
          $position: 0,
          $slice: 75,
        },
      },
    },
    { new: true, select: "notifications" },
  ).lean();

  const created = user?.notifications?.[0] || null;

  // Emit realtime notification via socket
  if (created) {
    try {
      const { emitToUser } = getSocketEmitter();
      emitToUser(
        String(userId),
        "notification_created",
        sanitizeNotification(created),
      );
    } catch (e) {
      /* socket not ready */
    }
  }

  return created;
}

const getMyNotifications = async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      50,
    );
    const user = await User.findById(req.user.id)
      .select("notifications")
      .lean();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const notifications = (user.notifications || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
    const unreadCount = notifications.filter(
      (notification) => !notification.read,
    ).length;

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications: notifications.slice(0, limit).map(sanitizeNotification),
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load notifications" });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid notification id" });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user.id, "notifications._id": id },
      { $set: { "notifications.$.read": true } },
      { new: true, select: "notifications" },
    ).lean();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    const unreadCount = (user.notifications || []).filter(
      (notification) => !notification.read,
    ).length;
    return res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to update notification" });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("notifications");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.notifications.forEach((notification) => {
      notification.read = true;
    });
    await user.save();

    return res.status(200).json({ success: true, unreadCount: 0 });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to update notifications" });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid notification id" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { notifications: { _id: id } } },
      { new: true, select: "notifications" },
    ).lean();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const unreadCount = (user.notifications || []).filter(
      (notification) => !notification.read,
    ).length;
    return res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    console.error("Delete notification error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to delete notification" });
  }
};

module.exports = {
  createNotification,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
};
