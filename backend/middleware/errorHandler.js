const isDev = process.env.NODE_ENV !== "production";

/**
 * Formats a Mongoose ValidationError into a readable field → message map.
 * @param {import("mongoose").Error.ValidationError} err
 * @returns {Record<string, string>}
 */
const formatValidationErrors = (err) => {
  return Object.fromEntries(
    Object.entries(err.errors).map(([field, { message }]) => [field, message])
  );
};

/**
 * Builds a consistent error response body.
 * In development the stack trace and raw error object are included.
 */
const buildResponse = (statusCode, message, err) => {
  const body = {
    success: false,
    status: statusCode,
    message,
  };

  if (isDev) {
    body.stack = err.stack;
    body.error = err;
  }

  return body;
};

/**
 * 404 handler — attach to the bottom of the route stack, before errorHandler.
 */
const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

/**
 * Centralised Express error-handling middleware.
 * Must be registered LAST, after all routes and other middleware.
 *
 * @type {import("express").ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // ── Logging ──────────────────────────────────────────────────────────────
  if (isDev) {
    console.error("❌ [ErrorHandler]", err);
  } else {
    // Swap this for your production logger (e.g. winston / pino) when ready.
    console.error(
      `[${new Date().toISOString()}] ERROR ${err.statusCode || 500}: ${err.message}`
    );
  }

  // ── Default status / message (may be overridden below) ───────────────────
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";

  // ── Mongoose: CastError (e.g. invalid ObjectId) ───────────────────────────
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for field '${err.path}': ${err.value}`;
  }

  // ── Mongoose: Duplicate key (unique index violation) ──────────────────────
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    const value = err.keyValue ? err.keyValue[field] : "";
    message = `Duplicate value for '${field}'${value ? `: '${value}' already exists` : ""}.`;
  }

  // ── Mongoose: ValidationError ─────────────────────────────────────────────
  else if (err.name === "ValidationError") {
    statusCode = 400;
    const fields = formatValidationErrors(err);
    message = Object.values(fields).join("; ");

    const body = buildResponse(statusCode, message, err);
    body.fields = fields; // extra detail regardless of env
    return res.status(statusCode).json(body);
  }

  // ── JWT: malformed / invalid signature ───────────────────────────────────
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }

  // ── JWT: expired ──────────────────────────────────────────────────────────
  else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired. Please log in again.";
  }

  return res.status(statusCode).json(buildResponse(statusCode, message, err));
};

module.exports = { errorHandler, notFound };
