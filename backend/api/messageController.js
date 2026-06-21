const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/user");
const { createNotification } = require("./notificationController");
const { createActivity } = require("./activityController");

function getSocketEmitter() {
  try {
    return require("../socket/socketServer");
  } catch (e) {
    return { emitToUser: () => { }, emitToConversation: () => { } };
  }
}

function isObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function sanitizeText(value, maxLength) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

function sanitizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function memberIds(conversation) {
  return (conversation.participants || []).map((id) => String(id));
}

function canAccessConversation(conversation, userId) {
  return memberIds(conversation).includes(String(userId));
}

async function findOrCreateConversation(participantIds) {
  const uniqueIds = [...new Set(participantIds.map(String))].sort();
  let conversation = await Conversation.findOne({
    participants: { $all: uniqueIds, $size: uniqueIds.length },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: uniqueIds,
    });
  }

  return conversation;
}

function messageResponse(message) {
  return {
    id: message._id,
    conversationId: message.conversationId,
    sender: message.sender,
    content: message.content,
    attachments: message.attachments || [],
    readBy: message.readBy || [],
    deliveredAt: message.deliveredAt,
    readAt: message.readAt,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

const startConversation = async (req, res) => {
  try {
    const { recipientId, participantIds } = req.body;
    const participants = Array.isArray(participantIds)
      ? participantIds
      : [recipientId];
    const ids = [req.user.id, ...participants].filter(Boolean);

    if (ids.length < 2 || ids.some((id) => !isObjectId(id))) {
      return res
        .status(400)
        .json({ success: false, message: "Valid participants are required" });
    }

    const existingUsers = await User.find({
      _id: { $in: ids },
      isBanned: { $ne: true },
    })
      .select("_id")
      .lean();
    if (existingUsers.length !== [...new Set(ids.map(String))].length) {
      return res
        .status(400)
        .json({
          success: false,
          message: "One or more participants are invalid",
        });
    }

    const conversation = await findOrCreateConversation(ids);
    return res.status(200).json({
      success: true,
      conversation: {
        id: conversation._id,
        participants: conversation.participants,
        lastMessage: conversation.lastMessage,
        updatedAt: conversation.updatedAt,
      },
    });
  } catch (error) {
    console.error("Start conversation error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to start conversation" });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { conversationId, recipientId } = req.body;
    const content = sanitizeText(req.body.content, 2000);
    const attachments = sanitizeAttachments(req.body.attachments);

    if (!content && attachments.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Message content or attachment is required",
        });
    }

    let conversation;
    if (conversationId) {
      if (!isObjectId(conversationId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid conversation id" });
      }
      conversation = await Conversation.findById(conversationId);
      if (!conversation || !canAccessConversation(conversation, req.user.id)) {
        return res
          .status(403)
          .json({
            success: false,
            message: "You cannot access this conversation",
          });
      }
    } else {
      if (
        !isObjectId(recipientId) ||
        String(recipientId) === String(req.user.id)
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Valid recipient is required" });
      }
      conversation = await findOrCreateConversation([req.user.id, recipientId]);
    }

    const now = new Date();
    const message = await Message.create({
      conversationId: conversation._id,
      sender: req.user.id,
      content,
      attachments,
      readBy: [req.user.id],
      deliveredAt: now,
    });

    conversation.lastMessage = message._id;
    conversation.updatedAt = now;
    await conversation.save();

    const sender = await User.findById(req.user.id)
      .select("username displayName profilePhoto")
      .lean();
    const recipients = memberIds(conversation).filter(
      (id) => id !== String(req.user.id),
    );

    // Emit via socket to conversation room
    const { emitToConversation, emitToUser } = getSocketEmitter();
    const msgData = {
      ...messageResponse(message),
      senderInfo: sender
        ? {
          id: sender._id,
          username: sender.username,
          displayName: sender.displayName,
          profilePhoto: sender.profilePhoto,
        }
        : null,
    };

    // Emit receive_message to all in conversation room
    try {
      const { io } = require("../socket/socketServer");
      if (io) {
        io.to(`conversation:${conversation._id}`).emit(
          "receive_message",
          msgData,
        );
      }
    } catch (e) {
      /* socket not ready */
    }

    // Push notification to each recipient
    await Promise.all(
      recipients.map((id) => {
        emitToUser(id, "notification_created", {
          type: "message",
          title: "New Message",
          message: `${sender?.username || "Someone"} sent you a message`,
          metadata: {
            conversationId: conversation._id,
            messageId: message._id,
            sender: req.user.id,
          },
        });
        return createNotification(id, {
          type: "message",
          title: "New Message",
          message: `${sender?.username || "Someone"} sent you a message`,
          metadata: {
            conversationId: conversation._id,
            messageId: message._id,
            sender: req.user.id,
          },
        });
      }),
    );

    await createActivity(
      req.user.id,
      "message_sent",
      "Message sent",
      "Sent a direct message",
      { conversationId: conversation._id },
      "private",
    );

    return res.status(201).json({
      success: true,
      conversationId: conversation._id,
      message: msgData,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to send message" });
  }
};

const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id })
      .populate(
        "lastMessage",
        "content sender readBy createdAt attachments deliveredAt",
      )
      .populate(
        "participants",
        "username displayName profilePhoto isOnline lastSeen",
      )
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    const unreadCounts = await Promise.all(
      conversations.map((conversation) =>
        Message.countDocuments({
          conversationId: conversation._id,
          sender: { $ne: req.user.id },
          readBy: { $ne: req.user.id },
        }),
      ),
    );

    return res.status(200).json({
      success: true,
      conversations: conversations.map((conversation, index) => ({
        id: conversation._id,
        participants: conversation.participants,
        lastMessage: conversation.lastMessage,
        unreadCount: unreadCounts[index],
        updatedAt: conversation.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load conversations" });
  }
};

const getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid conversation id" });
    }

    const conversation = await Conversation.findById(id)
      .populate(
        "participants",
        "username displayName profilePhoto isOnline lastSeen",
      )
      .lean();
    if (!conversation || !canAccessConversation(conversation, req.user.id)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "You cannot access this conversation",
        });
    }

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 50, 1),
      100,
    );
    const messages = await Message.find({
      conversationId: id,
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      conversation,
      messages: messages.reverse().map(messageResponse),
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load conversation" });
  }
};

const markConversationRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid conversation id" });
    }

    const conversation = await Conversation.findById(id).lean();
    if (!conversation || !canAccessConversation(conversation, req.user.id)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "You cannot access this conversation",
        });
    }

    const now = new Date();
    await Message.updateMany(
      { conversationId: id, readBy: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id }, $set: { readAt: now } },
    );

    // Emit read receipt via socket
    try {
      const { io } = require("../socket/socketServer");
      if (io) {
        io.to(`conversation:${id}`).emit("messages_read", {
          conversationId: id,
          readBy: req.user.id,
          readAt: now,
        });
      }
    } catch (e) {
      /* socket not ready */
    }

    return res
      .status(200)
      .json({ success: true, message: "Conversation marked as read" });
  } catch (error) {
    console.error("Mark conversation read error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to mark conversation read" });
  }
};

module.exports = {
  startConversation,
  sendMessage,
  getConversations,
  getConversation,
  markConversationRead,
};
