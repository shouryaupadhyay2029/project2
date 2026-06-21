const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { signAuthToken, signRefreshToken, verifyAuthToken, verifyRefreshToken } = require("../utils/jwtTokens");
const { verifyFirebaseIdToken } = require("../utils/firebaseTokens");

function toAuthUser(user) {
    return {
        id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        location: user.location,
        timezone: user.timezone,
        portfolioWebsite: user.portfolioWebsite,
        profilePhoto: user.profilePhoto,
        followers: Array.isArray(user.followers) ? user.followers.length : 0,
        following: Array.isArray(user.following) ? user.following.length : 0,
        skills: user.skills,
        techStack: user.techStack,
        socialLinks: user.socialLinks,
        resumeUrl: user.resumeUrl,
        showContributionGraph: user.showContributionGraph,
        showAchievements: user.showAchievements,
        currentStatus: user.currentStatus,
        developerTags: user.developerTags,
        featuredProject: user.featuredProject,
        notifications: user.notificationSettings,
        appearance: user.appearance,
        projectSettings: user.projectSettings,
        ecosystem: user.ecosystem,
        security: user.security,
        advanced: user.advanced,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
    };
}

const RESERVED_USERNAMES = [
    "admin", "support", "root", "api", "system", "devstage", 
    "null", "undefined", "profile", "settings", "login", 
    "register", "auth", "home"
];

async function createUniqueGoogleUsername(decodedToken) {
    const base = (decodedToken.name || decodedToken.email.split("@")[0])
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 25) || "googleuser";
        
    const validBase = base.padEnd(3, "0");

    for (let attempt = 0; attempt < 10; attempt += 1) {
        const suffix = attempt === 0 ? "" : Math.floor(100 + Math.random() * 900);
        const username = `${validBase}${suffix}`.slice(0, 30);
        
        if (RESERVED_USERNAMES.includes(username)) continue;
        
        const existing = await User.findOne({ username }).select("_id").lean();
        if (!existing) return username;
    }

    return `${validBase}${Date.now()}`.slice(0, 30);
}


// ==========================
// REGISTER USER


// ==========================
// REGISTER USER
// ==========================

const registerUser = async(req, res) => {

    try {

        const {
            username,
            email,
            password
        } = req.body;

        // CHECK EMPTY FIELDS
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // VALIDATE USERNAME
        const usernameRegex = /^[a-z0-9_]{3,30}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                success: false,
                message: "Username must be 3-30 characters long and contain only lowercase letters, numbers, and underscores"
            });
        }
        
        if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: "This username is reserved and cannot be used"
            });
        }

        // CHECK EXISTING USER (Email)
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
            });
        }

        // CHECK EXISTING USER (Username)
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: "Username is already taken"
            });
        }

        // HASH PASSWORD
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // CREATE USER
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            isOnline: true,
            lastSeen: new Date()
        });

        const token = signAuthToken({ id: user._id }, { expiresIn: "15m" });
        const refreshToken = signRefreshToken({ id: user._id });

        user.refreshToken = refreshToken;
        await User.updateOne({ _id: user._id }, { $set: { refreshToken } });

        res.status(201).json({
            success: true,
            token,
            refreshToken,
            user: toAuthUser(user)
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

const loginUser = async(req, res) => {
    try {

        const { email, password } = req.body;

        // CHECK USER
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            });
        }

        // CHECK PASSWORD
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // GENERATE TOKEN
        const token = signAuthToken({ id: user._id }, { expiresIn: "15m" });
        const refreshToken = signRefreshToken({ id: user._id });

        user.isOnline = true;
        user.lastSeen = new Date();
        user.refreshToken = refreshToken;

        await User.updateOne({ _id: user._id }, {
            $set: {
                isOnline: true,
                lastSeen: user.lastSeen,
                refreshToken: refreshToken
            }
        });

        // RESPONSE
        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            refreshToken,
            user: toAuthUser(user)
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }
};

const googleLogin = async(req, res) => {
    try {
        const { token: firebaseToken } = req.body;

        if (!firebaseToken) {
            return res.status(400).json({
                success: false,
                message: "Google token is required"
            });
        }

        const decodedGoogleToken = await verifyFirebaseIdToken(firebaseToken);

        if (!decodedGoogleToken || !decodedGoogleToken.email) {
            return res.status(401).json({
                success: false,
                message: "Invalid Google token"
            });
        }

        let user = await User.findOne({ email: decodedGoogleToken.email });

        if (!user) {
            user = await User.create({
                username: await createUniqueGoogleUsername(decodedGoogleToken),
                email: decodedGoogleToken.email,
                password: "google_auth_placeholder_password",
                displayName: decodedGoogleToken.name || "",
                profilePhoto: decodedGoogleToken.picture || ""
            });
        }

        user.isOnline = true;
        user.lastSeen = new Date();
        if (decodedGoogleToken.name && !user.displayName) {
            user.displayName = decodedGoogleToken.name;
        }
        if (decodedGoogleToken.picture && !user.profilePhoto) {
            user.profilePhoto = decodedGoogleToken.picture;
        }

        const token = signAuthToken({ id: user._id, provider: "google" }, { expiresIn: "15m" });
        const refreshToken = signRefreshToken({ id: user._id, provider: "google" });

        user.refreshToken = refreshToken;

        await User.updateOne({ _id: user._id }, {
            $set: {
                isOnline: true,
                lastSeen: user.lastSeen,
                displayName: user.displayName,
                profilePhoto: user.profilePhoto,
                refreshToken: refreshToken
            }
        });

        return res.status(200).json({
            success: true,
            message: "Google login successful",
            token,
            refreshToken,
            user: toAuthUser(user)
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

const refreshTokenHandler = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "No refresh token provided"
            });
        }

        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (error) {
            return res.status(403).json({
                success: false,
                message: "Invalid refresh token"
            });
        }

        const user = await User.findById(decoded.id);

        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({
                success: false,
                message: "Invalid refresh token"
            });
        }

        const token = signAuthToken({ id: user._id, provider: decoded.provider }, { expiresIn: "15m" });
        const newRefreshToken = signRefreshToken({ id: user._id, provider: decoded.provider });

        user.refreshToken = newRefreshToken;
        await User.updateOne({ _id: user._id }, { $set: { refreshToken: newRefreshToken } });

        return res.status(200).json({
            success: true,
            token,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    googleLogin,
    refreshTokenHandler
};
