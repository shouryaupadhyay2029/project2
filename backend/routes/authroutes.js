const express = require("express");
const router = express.Router();

const {
    registerUser,
    loginUser
} = require("../api/authcontroller");

const authMiddleware = require("../middleware/authmiddleware");
const User = require("../models/user");

router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected route — get current logged-in user
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Error fetching user:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

module.exports = router;