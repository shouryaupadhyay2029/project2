const User = require("../models/user");

function getSocketEmitter() {
  try {
    return require("../socket/socketServer");
  } catch (e) {
    return { emitToUser: () => {}, io: null };
  }
}

async function updatePresence(userId, isOnline) {
  return User.findByIdAndUpdate(
    userId,
    {
      isOnline,
      lastSeen: new Date(),
    },
    { new: true, select: "isOnline lastSeen" },
  ).lean();
}

async function broadcastPresence(userId, presence) {
  try {
    const { io } = require("../socket/socketServer");
    if (io) {
      io.emit("presence_update", {
        userId: String(userId),
        isOnline: presence.isOnline,
        lastSeen: presence.lastSeen,
      });
    }
  } catch (e) {
    /* socket not ready */
  }
}

const markOnline = async (req, res) => {
  try {
    const presence = await updatePresence(req.user.id, true);
    if (!presence) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    await broadcastPresence(req.user.id, presence);
    return res.status(200).json({ success: true, presence });
  } catch (error) {
    console.error("Mark online error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to update presence" });
  }
};

const heartbeat = async (req, res) => {
  try {
    const presence = await updatePresence(req.user.id, true);
    if (!presence) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    // Don't broadcast on every heartbeat to avoid flooding
    return res.status(200).json({ success: true, presence });
  } catch (error) {
    console.error("Presence heartbeat error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to update presence" });
  }
};

const markOffline = async (req, res) => {
  try {
    const presence = await updatePresence(req.user.id, false);
    if (!presence) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    await broadcastPresence(req.user.id, presence);
    return res.status(200).json({ success: true, presence });
  } catch (error) {
    console.error("Mark offline error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to update presence" });
  }
};

const getPresence = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID required" });
    }

    const user = await User.findById(userId)
      .select("isOnline lastSeen username displayName")
      .lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Auto-timeout: if lastSeen > 5 minutes ago and isOnline, mark as offline
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (user.isOnline && user.lastSeen < fiveMinutesAgo) {
      await User.findByIdAndUpdate(userId, { isOnline: false });
      user.isOnline = false;
    }

    return res.status(200).json({
      success: true,
      presence: {
        userId: user._id,
        username: user.username,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      },
    });
  } catch (error) {
    console.error("Get presence error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to get presence" });
  }
};

module.exports = {
  markOnline,
  heartbeat,
  markOffline,
  getPresence,
};
