const crypto = require("crypto");
const ApiKey = require("../models/ApiKey");

const hashApiKey = (apiKey) =>
  crypto.createHash("sha256").update(String(apiKey)).digest("hex");

const getApiKeyFromRequest = (req) => {
  const headerKey = req.get("x-api-key");
  const queryKey = req.query?.api_key;

  if (headerKey) {
    return headerKey;
  }

  if (Array.isArray(queryKey)) {
    return queryKey[0];
  }

  return queryKey;
};

const requireApiKey = async (req, res, next) => {
  try {
    const rawApiKey = getApiKeyFromRequest(req);

    if (!rawApiKey) {
      return res.status(401).json({
        success: false,
        message: "API key is required",
      });
    }

    const keyHash = hashApiKey(rawApiKey);
    const apiKey = await ApiKey.findOne({ keyHash, isActive: true });

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
      });
    }

    if (apiKey.usedThisMonth >= apiKey.monthlyQuota) {
      return res.status(429).json({
        success: false,
        message: "Monthly API quota exceeded",
      });
    }

    apiKey.usedThisMonth += 1;
    apiKey.lastUsedAt = new Date();
    await apiKey.save();

    req.apiKey = apiKey;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireApiKey,
  hashApiKey,
};
