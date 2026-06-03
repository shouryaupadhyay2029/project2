const jwt = require("jsonwebtoken");
const User = require("../models/user");

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, no token"
            });
        }

        const token = authHeader.split(" ")[1];
        console.log("[DEBUG PROTECT] Token received:", token);
        console.log("[DEBUG PROTECT] Secret used for verification:", process.env.JWT_SECRET);

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log("[DEBUG PROTECT] Verification successful. Decoded:", decoded);
            req.user = decoded;
            req.user.isGoogleUser = false;
            next();
        } catch (err) {
            console.log("[DEBUG PROTECT] Verification failed. Error:", err.message);
            // Attempt to decode as Firebase / Google token
            const decodedFirebase = jwt.decode(token);
            console.log("[DEBUG PROTECT] Decoded as Firebase/Google token:", decodedFirebase);
            if (decodedFirebase && decodedFirebase.email) {
                let user = await User.findOne({ email: decodedFirebase.email });
                if (!user) {
                    const generatedUsername = (decodedFirebase.name || decodedFirebase.email.split('@')[0])
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 900);
                    user = await User.create({
                        username: generatedUsername,
                        email: decodedFirebase.email,
                        password: "google_auth_placeholder_password",
                        displayName: decodedFirebase.name || "",
                        profilePhoto: decodedFirebase.picture || ""
                    });
                }
                user.isOnline = true;
                user.lastSeen = new Date();
                await user.save();
                req.user = { id: user._id, isGoogleUser: true };
                return next();
            }
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


