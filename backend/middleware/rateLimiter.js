const rateLimit = require("express-rate-limit");

/**
 * Shared handler that returns a consistent JSON error body
 * instead of the plain-text default provided by express-rate-limit.
 *
 * @param {string} message  Human-readable reason shown to the client.
 */
const jsonHandler = (message) => (req, res) => {
  res.status(429).json({ success: false, message });
};

/**
 * Shared options applied to every limiter.
 * - standardHeaders: true  → sends RateLimit-* headers (RFC 6585 draft)
 * - legacyHeaders:   false → suppresses the old X-RateLimit-* headers
 */
const sharedOptions = {
  standardHeaders: true,
  legacyHeaders: false,
};

// ── Auth limiter ──────────────────────────────────────────────────────────────
// Protects /auth/login
const loginLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  handler: jsonHandler(
    "Too many login attempts. Try again in 15 minutes."
  ),
});

// Protects /auth/register
const registerLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  handler: jsonHandler(
    "Too many accounts created from this IP. Please try again after an hour."
  ),
});

// Protects /auth/refresh
const refreshLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  handler: jsonHandler(
    "Too many token refresh requests. Please slow down."
  ),
});

// Protects /auth/reset-password
const passwordResetLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  handler: jsonHandler(
    "Too many password reset attempts. Please try again after an hour."
  ),
});

// ── Message limiter ───────────────────────────────────────────────────────────
// Prevents message-spam in chat endpoints.
const messageLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  handler: jsonHandler(
    "Message rate limit exceeded. Please slow down."
  ),
});

// ── Contact limiter ───────────────────────────────────────────────────────────
// Throttles friend/contact request endpoints.
const contactLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  handler: jsonHandler(
    "Contact request limit reached. Try again later."
  ),
});

// ── Search limiter ────────────────────────────────────────────────────────────
// Protects user/room search endpoints from scraping.
const searchLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  handler: jsonHandler(
    "Search rate limit exceeded."
  ),
});

// ── General limiter ───────────────────────────────────────────────────────────
// Broad-spectrum limiter suitable for most API routes.
const generalLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  handler: jsonHandler(
    "Too many requests. Please try again later."
  ),
});

// ── Presence / heartbeat limiter ──────────────────────────────────────────────
// High-frequency allowance for online-status / heartbeat pings.
const presenceLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  handler: jsonHandler(
    "Presence update rate limit exceeded. Please slow down."
  ),
});

module.exports = {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  passwordResetLimiter,
  messageLimiter,
  contactLimiter,
  searchLimiter,
  generalLimiter,
  presenceLimiter,
};
