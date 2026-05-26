const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


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
            password: hashedPassword
        });


        // GENERATE TOKEN
        const token = jwt.sign({
                id: user._id
            },
            process.env.JWT_SECRET, {
                expiresIn: "30d"
            }
        );


        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};


module.exports = {
    registerUser
};