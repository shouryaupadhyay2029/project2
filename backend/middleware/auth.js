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

        const jwt = require("jsonwebtoken");
        try {
            const decoded = verifyAuthToken(token);
            console.log("[DEBUG PROTECT] Verification successful. Decoded:", decoded);
            req.user = decoded;
            req.user.isGoogleUser = decoded.provider === "google";
            next();
        } catch (err) {
            console.log("[DEBUG PROTECT] JWT verification failed. Attempting Firebase fallback. Error:", err.message);
            
            let decodedGoogleToken = null;
            try {
                const { verifyFirebaseIdToken } = require("../utils/firebaseTokens");
                decodedGoogleToken = await verifyFirebaseIdToken(token);
                console.log("[DEBUG PROTECT] Real Firebase token verified.");
            } catch (fbErr) {
                console.log("[DEBUG PROTECT] Firebase token fallback verification failed:", fbErr.message);
                return res.status(401).json({
                    success: false,
                    message: "Not authorized, token failed"
                });
            }

            if (!decodedGoogleToken || !decodedGoogleToken.email) {
                return res.status(401).json({
                    success: false,
                    message: "Not authorized, token payload invalid"
                });
            }

            const User = require("../models/user");
            let user = await User.findOne({ email: decodedGoogleToken.email });
            if (!user) {
                const base = (decodedGoogleToken.name || decodedGoogleToken.email.split("@")[0])
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, "")
                    .slice(0, 24) || "googleuser";

                let uniqueUsername = `${base}${Date.now()}`;
                for (let attempt = 0; attempt < 10; attempt += 1) {
                    const suffix = Math.floor(100 + Math.random() * 900);
                    const usernameAttempt = `${base}${suffix}`;
                    const existing = await User.findOne({ username: usernameAttempt }).select("_id").lean();
                    if (!existing) {
                        uniqueUsername = usernameAttempt;
                        break;
                    }
                }

                user = await User.create({
                    username: uniqueUsername,
                    email: decodedGoogleToken.email,
                    password: "google_auth_placeholder_password",
                    displayName: decodedGoogleToken.name || "",
                    profilePhoto: decodedGoogleToken.picture || "",
                    isOnline: true,
                    lastSeen: new Date()
                });
                console.log("[DEBUG PROTECT] Created new synced Google user:", user.username);
                user.isOnline = true;
                user.lastSeen = new Date();
                let updatePayload = {
                    isOnline: true,
                    lastSeen: user.lastSeen
                };
                if (decodedGoogleToken.name && !user.displayName) {
                    user.displayName = decodedGoogleToken.name;
                    updatePayload.displayName = decodedGoogleToken.name;
                }
                if (decodedGoogleToken.picture && !user.profilePhoto) {
                    user.profilePhoto = decodedGoogleToken.picture;
                    updatePayload.profilePhoto = decodedGoogleToken.picture;
                }
                await User.updateOne({ _id: user._id }, { $set: updatePayload });
            }

            req.user = {
                id: user._id,
                email: user.email,
                provider: "google"
            };
            req.user.isGoogleUser = true;
            next();
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
