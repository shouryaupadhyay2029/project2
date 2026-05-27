"use strict";

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/user");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const CollaborationRequest = require("../models/CollaborationRequest");
const Workspace = require("../models/Workspace");
const { recordSocketConnection } = require("../utils/metrics");

// Holds the active Socket.IO server instance — populated by initializeSocket()
let io;

// Maps userId (string) → Set<socketId> to support multiple tabs per user
const connectedUsers = new Map();

// ─── Helper Exports ───────────────────────────────────────────────────────────

/**
 * Returns all active socket IDs for the given userId.
 * @param {string|ObjectId} userId
 * @returns {string[]}
 */
function getSocketIds(userId) {
  const ids = connectedUsers.get(String(userId));
  return ids ? [...ids] : [];
}

/**
 * Returns true when the user has at least one active socket connection.
 * @param {string|ObjectId} userId
 * @returns {boolean}
 */
function isUserOnline(userId) {
  const ids = connectedUsers.get(String(userId));
  return !!(ids && ids.size > 0);
}

/**
 * Emits an event to all sockets belonging to userId via their personal room.
 * @param {string|ObjectId} userId
 * @param {string} event
 * @param {*} data
 */
function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emits an event to the conversation room.
 * @param {Server|null} ioInstance  - Pass io from caller, or null to use module-level io
 * @param {string}      conversationId
 * @param {string}      event
 * @param {*}           data
 */
function emitToConversation(ioInstance, conversationId, event, data) {
  const target = ioInstance || io;
  if (!target) return;
  target.to(`conversation:${conversationId}`).emit(event, data);
}

// ─── Socket.IO Server Initializer ────────────────────────────────────────────

/**
 * Attaches a Socket.IO server to the provided HTTP server, registers all
 * middleware and event handlers, and returns the io instance.
 * @param {import("http").Server} httpServer
 * @returns {Server}
 */
function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    maxHttpBufferSize: 1e6,
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // ── JWT / Firebase Authentication Middleware ──────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        return next(new Error("Authentication failed"));
      }

      // Attempt standard JWT verification first
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          return next(new Error("Authentication failed"));
        }
        socket.user = { id: decoded.id, username: decoded.username };
        return next();
      } catch (jwtErr) {
        // Verification failed — decode without verifying to inspect payload
        const decoded = jwt.decode(token);

        // Presence of an email field signals a Google / Firebase ID token
        if (decoded && decoded.email) {
          const user = await User.findOne({ email: decoded.email })
            .select("_id username")
            .lean();
          if (!user) {
            return next(new Error("Authentication failed"));
          }
          socket.user = { id: user._id, username: user.username };
          return next();
        }

        return next(new Error("Authentication failed"));
      }
    } catch (err) {
      return next(new Error("Authentication failed"));
    }
  });

  // ── Connection Handler ────────────────────────────────────────────────────
  io.on("connection", async (socket) => {
    const userId = String(socket.user.id);
    recordSocketConnection(1);

    // Register this socket in the connectedUsers map
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId).add(socket.id);

    // Join the user's personal room for direct targeting
    socket.join(`user:${userId}`);

    // Mark the user as online in the database
    const connectionTime = new Date();
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: connectionTime,
    }).catch(() => {});

    // Broadcast online presence to all connected clients
    io.emit("presence_update", {
      userId,
      isOnline: true,
      lastSeen: connectionTime,
    });

    // ── disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      recordSocketConnection(-1);
      const sockets = connectedUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);

        // Only update DB and broadcast when the user has no remaining sockets
        if (sockets.size === 0) {
          connectedUsers.delete(userId);

          const lastSeen = new Date();
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen,
          }).catch(() => {});

          io.emit("presence_update", {
            userId,
            isOnline: false,
            lastSeen,
          });
        }
      }
    });

    // ── join_conversation ─────────────────────────────────────────────────
    socket.on("join_conversation", async ({ conversationId } = {}) => {
      try {
        if (
          !conversationId ||
          !mongoose.Types.ObjectId.isValid(conversationId)
        ) {
          return;
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.user.id,
        }).lean();

        if (!conversation) return;

        socket.join(`conversation:${conversationId}`);
        socket.emit("joined_conversation", { conversationId });
      } catch (_) {}
    });

    // ── leave_conversation ────────────────────────────────────────────────
    socket.on("leave_conversation", ({ conversationId } = {}) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    // ── send_message ──────────────────────────────────────────────────────
    socket.on(
      "send_message",
      async ({ conversationId, content = "", attachments = [] } = {}) => {
        try {
          if (
            !conversationId ||
            !mongoose.Types.ObjectId.isValid(conversationId)
          ) {
            return;
          }
          if (content.length > 2000) return;

          const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: socket.user.id,
          });
          if (!conversation) return;

          // Persist the message; mark sender as having already read it
          const message = await Message.create({
            conversationId,
            sender: socket.user.id,
            content,
            attachments,
            readBy: [socket.user.id],
          });

          // Keep conversation metadata current
          conversation.lastMessage = message._id;
          conversation.updatedAt = new Date();
          await conversation.save();

          // Populate sender fields for the broadcast payload
          await message.populate("sender", "username displayName profilePhoto");

          // Broadcast the new message to everyone in the conversation room
          io.to(`conversation:${conversationId}`).emit("receive_message", {
            _id: message._id,
            conversationId,
            sender: message.sender,
            content: message.content,
            attachments: message.attachments,
            readBy: message.readBy,
            createdAt: message.createdAt,
          });

          // Push an in-app notification to every other participant
          for (const participantId of conversation.participants) {
            if (String(participantId) === userId) continue;

            emitToUser(participantId, "notification_created", {
              type: "message",
              conversationId,
              senderId: userId,
              senderUsername: socket.user.username,
              preview: content.slice(0, 100),
              createdAt: new Date(),
            });
          }
        } catch (_) {}
      },
    );

    // ── typing_start ──────────────────────────────────────────────────────
    socket.on("typing_start", ({ conversationId } = {}) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("typing_update", {
        conversationId,
        userId,
        isTyping: true,
      });
    });

    // ── typing_stop ───────────────────────────────────────────────────────
    socket.on("typing_stop", ({ conversationId } = {}) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("typing_update", {
        conversationId,
        userId,
        isTyping: false,
      });
    });

    // ── message_read ──────────────────────────────────────────────────────
    socket.on("message_read", async ({ conversationId } = {}) => {
      try {
        if (
          !conversationId ||
          !mongoose.Types.ObjectId.isValid(conversationId)
        ) {
          return;
        }

        // Mark all unread messages in this conversation as read by this user
        await Message.updateMany(
          {
            conversationId,
            readBy: { $ne: socket.user.id },
          },
          { $addToSet: { readBy: socket.user.id } },
        );

        io.to(`conversation:${conversationId}`).emit("messages_read", {
          conversationId,
          readBy: userId,
        });
      } catch (_) {}
    });

    // ── presence_ping ─────────────────────────────────────────────────────
    socket.on("presence_ping", async () => {
      try {
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { lastSeen }).catch(() => {});
        socket.emit("presence_pong", { lastSeen });
      } catch (_) {}
    });

    // ── workspace_update ──────────────────────────────────────────────────
    socket.on(
      "workspace_update",
      async ({ workspaceId, action, payload } = {}) => {
        try {
          if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) {
            return;
          }

          // Only allow members (including owner) to broadcast workspace events
          const workspace = await Workspace.findOne({
            _id: workspaceId,
            $or: [
              { owner: socket.user.id },
              { "members.user": socket.user.id },
            ],
          }).lean();

          if (!workspace) return;

          io.to(`workspace:${workspaceId}`).emit("workspace_update", {
            workspaceId,
            action,
            payload,
          });
        } catch (_) {}
      },
    );

    // ── analytics_update ─────────────────────────────────────────────────
    socket.on("analytics_update", ({ projectId, payload } = {}, ack) => {
      if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        if (typeof ack === "function")
          ack({ ok: false, error: "invalid_project" });
        return;
      }
      io.to(`project:${projectId}`).emit("analytics_update", {
        projectId,
        payload,
      });
      if (typeof ack === "function") ack({ ok: true });
    });

    // ── feed_updated ──────────────────────────────────────────────────────
    socket.on("feed_updated", (payload = {}, ack) => {
      emitToUser(userId, "feed_updated", {
        userId,
        payload,
        updatedAt: new Date(),
      });
      if (typeof ack === "function") ack({ ok: true });
    });

    // ── project_trending ──────────────────────────────────────────────────
    socket.on("project_trending", ({ projectId, payload } = {}, ack) => {
      if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        if (typeof ack === "function")
          ack({ ok: false, error: "invalid_project" });
        return;
      }
      io.emit("project_trending", {
        projectId,
        payload,
        updatedAt: new Date(),
      });
      if (typeof ack === "function") ack({ ok: true });
    });

    // ── workspace_activity ────────────────────────────────────────────────
    socket.on(
      "workspace_activity",
      async ({ workspaceId, payload } = {}, ack) => {
        try {
          if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) {
            if (typeof ack === "function")
              ack({ ok: false, error: "invalid_workspace" });
            return;
          }
          const workspace = await Workspace.findOne({
            _id: workspaceId,
            $or: [
              { owner: socket.user.id },
              { "members.user": socket.user.id },
            ],
          }).lean();
          if (!workspace) {
            if (typeof ack === "function")
              ack({ ok: false, error: "forbidden" });
            return;
          }
          io.to(`workspace:${workspaceId}`).emit("workspace_activity", {
            workspaceId,
            payload,
            updatedAt: new Date(),
          });
          if (typeof ack === "function") ack({ ok: true });
        } catch (_) {
          if (typeof ack === "function")
            ack({ ok: false, error: "server_error" });
        }
      },
    );

    // ── collaboration_changed alias ───────────────────────────────────────
    socket.on(
      "collaboration_changed",
      async ({ requestId, action } = {}, ack) => {
        try {
          if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
            if (typeof ack === "function")
              ack({ ok: false, error: "invalid_request" });
            return;
          }
          const request = await CollaborationRequest.findById(requestId).lean();
          if (!request) {
            if (typeof ack === "function")
              ack({ ok: false, error: "not_found" });
            return;
          }
          const updatePayload = {
            requestId,
            action,
            projectId: request.projectId,
            status: action,
          };
          emitToUser(
            String(request.sender),
            "collaboration_changed",
            updatePayload,
          );
          emitToUser(
            String(request.receiver),
            "collaboration_changed",
            updatePayload,
          );
          if (typeof ack === "function") ack({ ok: true });
        } catch (_) {
          if (typeof ack === "function")
            ack({ ok: false, error: "server_error" });
        }
      },
    );

    // ── collaboration_update ──────────────────────────────────────────────
    socket.on("collaboration_update", async ({ requestId, action } = {}) => {
      try {
        if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
          return;
        }

        const request = await CollaborationRequest.findById(requestId).lean();
        if (!request) return;

        const updatePayload = {
          requestId,
          action,
          projectId: request.projectId,
          status: action,
        };

        // Notify both the original sender and receiver of the request
        emitToUser(
          String(request.sender),
          "collaboration_update",
          updatePayload,
        );
        emitToUser(
          String(request.receiver),
          "collaboration_update",
          updatePayload,
        );
      } catch (_) {}
    });
  });

  return io;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  initializeSocket,
  getSocketIds,
  isUserOnline,
  emitToUser,
  emitToConversation,
  // Getter ensures callers always receive the live instance even if they
  // imported this module before initializeSocket() was called
  get io() {
    return io;
  },
};
