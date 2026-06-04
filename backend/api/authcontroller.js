const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { signAuthToken } = require("../utils/jwtTokens");
const { verifyFirebaseIdToken } = require("../utils/firebaseTokens");

function toAuthUser(user) {
    return {
        id: user._id,
        username: user.username,
        email: user.email
    };
}

async function createUniqueGoogleUsername(decodedToken) {
    const base = (decodedToken.name || decodedToken.email.split("@")[0])
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 24) || "googleuser";

    for (let attempt = 0; attempt < 10; attempt += 1) {
        const suffix = Math.floor(100 + Math.random() * 900);
        const username = `${base}${suffix}`;
        const existing = await User.findOne({ username }).select("_id").lean();
        if (!existing) return username;
    }

    return `${base}${Date.now()}`;
}


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


        // CHECK EXISTING USER
        const existingUser = await User.findOne({
            email
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
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


        // GENERATE TOKEN
        const token = signAuthToken({ id: user._id }, { expiresIn: "30d" });


        res.status(201).json({
            success: true,
            token,
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
        const token = signAuthToken({ id: user._id }, { expiresIn: "7d" });

        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();

        // RESPONSE
        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
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
        await user.save();

        const token = signAuthToken({ id: user._id, provider: "google" }, { expiresIn: "7d" });

        return res.status(200).json({
            success: true,
            message: "Google login successful",
            token,
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

module.exports = {
    registerUser,
    loginUser,
    googleLogin
};
