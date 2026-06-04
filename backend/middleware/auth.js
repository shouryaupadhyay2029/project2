const { JWT_SECRET_ENV_NAME, verifyAuthToken } = require("../utils/jwtTokens");

function extractBearerToken(authHeader) {
    const match = /^Bearer\s+(.+)$/i.exec(authHeader || "");
    return match ? match[1].trim() : "";
}

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        const token = extractBearerToken(authHeader);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, no token"
            });
        }

        console.log("[DEBUG PROTECT] Token received:", token);
        console.log("[DEBUG PROTECT] Secret variable used for verification:", JWT_SECRET_ENV_NAME);

        try {
            const decoded = verifyAuthToken(token);
            console.log("[DEBUG PROTECT] Verification successful. Decoded:", decoded);
            req.user = decoded;
            req.user.isGoogleUser = decoded.provider === "google";
            next();
        } catch (err) {
            console.log("[DEBUG PROTECT] Verification failed. Error:", err.message);
            return res.status(401).json({
                success: false,
                message: "Not authorized, token failed"
            });
        }
    } catch (error) {
        console.error("[DEBUG PROTECT] Outer catch error:", error);
        return res.status(401).json({
            success: false,
            message: "Not authorized, token failed"
        });
    }
};

module.exports = { protect };
