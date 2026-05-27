const crypto = require("crypto");
let logger;

try {
  logger = require("../utils/logger");
} catch (error) {
  logger = null;
}

const MAX_CONTENT_LENGTH_BYTES = 10 * 1024 * 1024;

const requestFingerprint = (req) => {
  const ip = req.ip || req.connection?.remoteAddress || "";
  const userAgent = req.get("user-agent") || "";
  const acceptLanguage = req.get("accept-language") || "";

  return crypto
    .createHash("sha256")
    .update(`${ip}|${userAgent}|${acceptLanguage}`)
    .digest("hex");
};

const fingerprintMiddleware = (req, res, next) => {
  req.fingerprint = requestFingerprint(req);
  next();
};

const logSecurityEvent = (message, req, extra = {}) => {
  if (logger && typeof logger.security === "function") {
    logger.security(message, {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.connection?.remoteAddress,
      fingerprint: req.fingerprint,
      ...extra,
    });
  }
};

const hasSuspiciousQueryKey = (value) => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.keys(value).some((key) => {
    if (key.includes("$") || key.includes("__proto__")) {
      return true;
    }

    return hasSuspiciousQueryKey(value[key]);
  });
};

const suspiciousActivityMiddleware = (req, res, next) => {
  const contentLengthHeader = req.get("content-length");
  const contentLength = Number(contentLengthHeader);

  if (
    contentLengthHeader &&
    Number.isFinite(contentLength) &&
    contentLength > MAX_CONTENT_LENGTH_BYTES
  ) {
    logSecurityEvent("Blocked oversized request", req, { contentLength });
    return res.status(413).json({
      success: false,
      message: "Request payload too large",
    });
  }

  if (hasSuspiciousQueryKey(req.query)) {
    logSecurityEvent("Blocked suspicious query parameters", req, {
      queryKeys: Object.keys(req.query || {}),
    });
    return res.status(400).json({
      success: false,
      message: "Invalid query parameters",
    });
  }

  next();
};

module.exports = {
  requestFingerprint,
  fingerprintMiddleware,
  suspiciousActivityMiddleware,
};
