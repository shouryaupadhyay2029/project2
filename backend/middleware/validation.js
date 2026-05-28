const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true when `id` is a syntactically valid MongoDB ObjectId. */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/** Sends a uniform 400 validation-failure response. */
const fail = (res, message, statusCode = 400) =>
  res.status(statusCode).json({ success: false, message });

// ─────────────────────────────────────────────────────────────────────────────
// validateMessage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates the body of a message-send request.
 *
 * Rules:
 *  - Either `content` (string, max 2 000 chars) OR a non-empty `attachments`
 *    array must be present — both may coexist.
 *  - `conversationId` and `recipientId`, when supplied, must be valid ObjectIds.
 */
const validateMessage = (req, res, next) => {
  const { content, attachments, conversationId, recipientId } = req.body;

  const hasContent = typeof content === "string" && content.trim().length > 0;
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

  if (!hasContent && !hasAttachments) {
    return fail(
      res,
      "A message must contain either text content or at least one attachment.",
    );
  }

  if (hasContent && content.length > 2000) {
    return fail(res, "Message content must not exceed 2 000 characters.");
  }

  if (conversationId !== undefined && !isValidObjectId(conversationId)) {
    return fail(res, "conversationId is not a valid MongoDB ObjectId.");
  }

  if (recipientId !== undefined && !isValidObjectId(recipientId)) {
    return fail(res, "recipientId is not a valid MongoDB ObjectId.");
  }

  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// validateObjectId  (factory)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Factory that returns middleware validating a single URL parameter.
 *
 * Usage:
 *   router.get("/users/:userId", validateObjectId("userId"), handler)
 *
 * @param {string} param  The name of the route parameter to check.
 */
const validateObjectId = (param) => (req, res, next) => {
  const value = req.params[param];

  if (!value) {
    return fail(res, `Route parameter '${param}' is missing.`);
  }

  if (!isValidObjectId(value)) {
    return fail(
      res,
      `Route parameter '${param}' must be a valid MongoDB ObjectId.`,
    );
  }

  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// validateSearch
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates the `q` query-string parameter used by search endpoints.
 *
 * Rules: present, string, 1–60 characters after trimming.
 */
const validateSearch = (req, res, next) => {
  const q = req.query.q;

  if (q === undefined || q === null) {
    return fail(res, "Search query parameter 'q' is required.");
  }

  if (typeof q !== "string") {
    return fail(res, "Search query 'q' must be a string.");
  }

  const trimmed = q.trim();

  if (trimmed.length < 1) {
    return fail(res, "Search query 'q' must not be empty.");
  }

  if (trimmed.length > 60) {
    return fail(res, "Search query 'q' must not exceed 60 characters.");
  }

  // Normalise whitespace for downstream handlers.
  req.query.q = trimmed;

  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// validateUsername
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates `req.body.username`.
 * Allowed: letters, digits, underscores — 3 to 20 characters.
 */
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

const validateUsername = (req, res, next) => {
  const { username } = req.body;

  if (!username) {
    return fail(res, "Username is required.");
  }

  if (typeof username !== "string") {
    return fail(res, "Username must be a string.");
  }

  if (!USERNAME_RE.test(username)) {
    return fail(
      res,
      "Username must be 3–20 characters and may only contain letters, digits, and underscores.",
    );
  }

  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// validatePagination
// ─────────────────────────────────────────────────────────────────────────────

const PAGINATION_DEFAULTS = { page: 1, limit: 20 };

/**
 * Normalises and validates `req.query.page` and `req.query.limit`.
 *
 * Defaults: page = 1, limit = 20.
 * Constraints: page >= 1, limit in [1, 100].
 *
 * Values are coerced to integers and written back onto `req.query` so that
 * downstream handlers always receive proper numbers.
 */
const validatePagination = (req, res, next) => {
  let page = parseInt(req.query.page, 10);
  let limit = parseInt(req.query.limit, 10);

  // Apply defaults when absent or not a number.
  if (isNaN(page)) page = PAGINATION_DEFAULTS.page;
  if (isNaN(limit)) limit = PAGINATION_DEFAULTS.limit;

  if (page < 1) {
    return fail(res, "Page must be a positive integer (>= 1).");
  }

  if (limit < 1 || limit > 100) {
    return fail(res, "Limit must be between 1 and 100.");
  }

  req.query.page = page;
  req.query.limit = limit;

  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// Request sanitization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively sanitises a plain object or array in-place where possible:
 *   1. Trims leading/trailing whitespace from all string values.
 *   2. Deletes keys that can trigger Mongo/operator/prototype injection.
 *   3. Deletes dotted keys to prevent path injection (`profile.$where`, etc.).
 *
 * Important Express 5 compatibility note:
 * Never assign to `req.query` directly. In Express 5 it is getter-only.
 * Instead, mutate the returned query object in-place.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
const unsafeKeyPattern = /(^\$|\.|__proto__|prototype|constructor)/i;

const sanitize = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      value[index] = sanitize(value[index]);
    }
    return value;
  }

  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (unsafeKeyPattern.test(key)) {
        delete value[key];
      } else {
        value[key] = sanitize(value[key]);
      }
    }
    return value;
  }

  return value;
};

const sanitizeObject = (target) => {
  if (target && typeof target === "object") {
    sanitize(target);
  }
};

/**
 * Express middleware that sanitises body, params and query safely.
 * It intentionally mutates `req.query` in-place and never reassigns it.
 */
const sanitizeRequest = (req, res, next) => {
  sanitizeObject(req.body);
  sanitizeObject(req.params);
  sanitizeObject(req.query);
  next();
};

/**
 * Backwards-compatible alias used by existing server setup.
 */
const sanitizeBody = sanitizeRequest;

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  validateMessage,
  validateObjectId,
  validateSearch,
  validateUsername,
  validatePagination,
  sanitizeRequest,
  sanitizeBody,
  sanitize,
};
