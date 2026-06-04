const jwt = require("jsonwebtoken");

const JWT_SECRET_ENV_NAME = "JWT_SECRET";
const JWT_ALGORITHM = "HS256";

function getJwtSecret() {
  const secret = process.env[JWT_SECRET_ENV_NAME];
  if (!secret) {
    throw new Error(`${JWT_SECRET_ENV_NAME} is not configured`);
  }
  return secret;
}

function signAuthToken(payload, options = {}) {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: JWT_ALGORITHM,
    expiresIn: "7d",
    ...options,
  });
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
  });
}

module.exports = {
  JWT_SECRET_ENV_NAME,
  JWT_ALGORITHM,
  signAuthToken,
  verifyAuthToken,
};
