const http = require("http");
const connectDB = require("./config/db");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const { metricsMiddleware } = require("./utils/metrics");
const {
  fingerprintMiddleware,
  suspiciousActivityMiddleware,
} = require("./middleware/securityHardening");

// Load env first
dotenv.config();
connectDB();

const app = express();
const httpServer = http.createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────
const { initializeSocket } = require("./socket/socketServer");
initializeSocket(httpServer);

// ─── Security middleware ───────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "https://www.gstatic.com",
          "https://cdn.socket.io",
        ],
        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
        "img-src": ["'self'", "data:", "https:"],
        "connect-src": [
          "'self'",
          "http://localhost:5000",
          "ws://localhost:5000",
          "https://*.firebaseio.com",
          "https://*.googleapis.com",
        ],
      },
    },
  }),
);

app.set("trust proxy", 1);

const corsOptions = {
  origin: process.env.CLIENT_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(fingerprintMiddleware);
app.use(suspiciousActivityMiddleware);
app.use(metricsMiddleware);

// ─── Performance middleware ────────────────────────────────────
app.use(compression());

// ─── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Mongo injection protection ───────────────────────────────
// Custom sanitizer is mounted below after validation import.
// It mutates body/params/query in-place and does not reassign req.query,
// which keeps it compatible with Express 5's getter-only req.query.

// ─── Request logging (Morgan) ─────────────────────────────────
try {
  const morgan = require("morgan");
  const logger = require("./utils/logger");
  const morganStream = { write: (message) => logger.info(message.trim()) };
  app.use(morgan("combined", { stream: morganStream }));
} catch (e) {
  // logger not ready, skip
}

// ─── Rate limiting ────────────────────────────────────────────
const {
  generalLimiter,
  authLimiter,
  messageLimiter,
  searchLimiter,
  presenceLimiter,
  contactLimiter,
} = require("./middleware/rateLimiter");
app.use(generalLimiter);

// ─── Sanitize middleware ──────────────────────────────────────
const { sanitizeRequest } = require("./middleware/validation");
app.use(sanitizeRequest);

// ─── Route imports ────────────────────────────────────────────
const authRoutes = require("./routes/authroutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const activityRoutes = require("./routes/activityRoutes");
const contactRoutes = require("./routes/contactRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const followRoutes = require("./routes/followRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const searchRoutes = require("./routes/searchRoutes");
const presenceRoutes = require("./routes/presenceRoutes");
const messageRoutes = require("./routes/messageRoutes");
const collaborationRoutes = require("./routes/collaborationRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const achievementRoutes = require("./routes/achievementRoutes");
const bookmarkRoutes = require("./routes/bookmarkRoutes");
const trendingRoutes = require("./routes/trendingRoutes");
const feedRoutes = require("./routes/feedRoutes");
const auditRoutes = require("./routes/auditRoutes");
const reportRoutes = require("./routes/reportRoutes");
const publicRoutes = require("./routes/publicRoutes");
const metricsRoutes = require("./routes/metricsRoutes");
const seoRoutes = require("./routes/seoRoutes");
const authMiddleware = require("./middleware/auth").protect;
const { unfollowUser } = require("./api/followController");

// ─── Routes with specific rate limits ────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/contact", contactLimiter, contactRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/follow", followRoutes);
app.post("/api/unfollow/:userId", authMiddleware, unfollowUser);
app.use("/api/notifications", notificationRoutes);
app.use("/api/search", searchLimiter, searchRoutes);
app.use("/api/presence", presenceLimiter, presenceRoutes);
app.use("/api/messages", messageLimiter, messageRoutes);
app.use("/api/collaboration", collaborationRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/trending", trendingRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/reports", reportRoutes);
app.use("/public", publicRoutes);
app.use("/metrics", metricsRoutes);
app.use("/", seoRoutes);

// ─── Health check ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "DevStage Backend",
    status: "running",
    timestamp: new Date().toISOString(),
    realtime: "Socket.IO active",
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 + Error handling ─────────────────────────────────────
const { notFound, errorHandler } = require("./middleware/errorHandler");
app.use(notFound);
app.use(errorHandler);

// ─── Graceful shutdown ────────────────────────────────────────
const gracefulShutdown = (signal) => {
  console.log(`\n[DevStage] ${signal} received. Shutting down gracefully...`);
  httpServer.close(() => {
    console.log("[DevStage] HTTP server closed.");
    require("mongoose")
      .connection.close()
      .then(() => {
        console.log("[DevStage] MongoDB connection closed.");
        process.exit(0);
      })
      .catch(() => process.exit(0));
  });
  // Force kill after 10 seconds
  setTimeout(() => {
    console.error("[DevStage] Forcing shutdown after timeout.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason, promise) => {
  console.error("[DevStage] Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[DevStage] Uncaught Exception:", err);
  process.exit(1);
});

// ─── Start server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`[DevStage] Server running on port ${PORT}`);
  console.log(`[DevStage] Socket.IO listening on port ${PORT}`);
  console.log(
    `[DevStage] Environment: ${process.env.NODE_ENV || "development"}`,
  );
});
