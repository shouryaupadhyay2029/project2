const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Resolve logs directory relative to this file's location
const logsDir = path.resolve(__dirname, "../logs");

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// ─── Shared Format ────────────────────────────────────────────────────────────

const baseFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
        return `[${timestamp}] ${level}: ${message}${metaStr}`;
    })
);

// ─── Transport Factories ───────────────────────────────────────────────────────

const fileTransport = (filename, level = "info") =>
    new winston.transports.File({
        filename: path.join(logsDir, filename),
        level,
        format: baseFormat,
        maxsize: 10 * 1024 * 1024, // 10 MB
        maxFiles: 5,
        tailable: true,
    });

const consoleTransport = () =>
    new winston.transports.Console({
        format: consoleFormat,
        silent: process.env.NODE_ENV === "production",
    });

// ─── Main Logger ──────────────────────────────────────────────────────────────

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    transports: [
        consoleTransport(),
        fileTransport("combined.log", "info"),
        fileTransport("error.log", "error"),
    ],
    exitOnError: false,
});

/**
 * Log an incoming HTTP request.
 * @param {import("express").Request} req
 */
logger.request = (req) => {
    logger.info("Incoming request", {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get("user-agent"),
    });
};

/**
 * Log a security-related event (also written to security.log).
 * @param {string} message
 * @param {object} [meta]
 */
logger.security = (message, meta = {}) => {
    securityLogger.warn(message, meta);
};

/**
 * Log an auth-related event (also written to auth.log).
 * @param {string} message
 * @param {object} [meta]
 */
logger.auth = (message, meta = {}) => {
    authLogger.info(message, meta);
};

// ─── Security Logger ──────────────────────────────────────────────────────────

const securityLogger = winston.createLogger({
    level: "warn",
    transports: [
        consoleTransport(),
        fileTransport("security.log", "warn"),
    ],
    exitOnError: false,
});

// ─── Auth Logger ──────────────────────────────────────────────────────────────

const authLogger = winston.createLogger({
    level: "info",
    transports: [
        consoleTransport(),
        fileTransport("auth.log", "info"),
    ],
    exitOnError: false,
});

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = logger;
module.exports.securityLogger = securityLogger;
module.exports.authLogger = authLogger;
