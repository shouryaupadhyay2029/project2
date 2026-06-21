const jwt = require("jsonwebtoken");

const JWT_ACCESS_SECRET_ENV_NAME = "JWT_ACCESS_SECRET";
const JWT_REFRESH_SECRET_ENV_NAME = "JWT_REFRESH_SECRET";
const JWT_ALGORITHM = "HS256";

function getJwtAccessSecret() {
  const secret = process.env[JWT_ACCESS_SECRET_ENV_NAME];
  if (!secret) {
    throw new Error(`${JWT_ACCESS_SECRET_ENV_NAME} is not configured`);
  }
  return secret;
}

function getJwtRefreshSecret() {
  const secret = process.env[JWT_REFRESH_SECRET_ENV_NAME];
  if (!secret) {
    throw new Error(`${JWT_REFRESH_SECRET_ENV_NAME} is not configured`);
  }
  return secret;
}

function signAuthToken(payload, options = {}) {
  return jwt.sign(payload, getJwtAccessSecret(), {
    algorithm: JWT_ALGORITHM,
    expiresIn: "15m",
    ...options,
  });
}

function signRefreshToken(payload, options = {}) {
  return jwt.sign(payload, getJwtRefreshSecret(), {
    algorithm: JWT_ALGORITHM,
    expiresIn: "7d",
    ...options,
  });
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtAccessSecret(), {
    algorithms: [JWT_ALGORITHM],
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, getJwtRefreshSecret(), {
    algorithms: [JWT_ALGORITHM],
  });
}

module.exports = {
  JWT_ACCESS_SECRET_ENV_NAME,
  JWT_REFRESH_SECRET_ENV_NAME,
  JWT_ALGORITHM,
  signAuthToken,
  signRefreshToken,
  verifyAuthToken,
  verifyRefreshToken,
};
