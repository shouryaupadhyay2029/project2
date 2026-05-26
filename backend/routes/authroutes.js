const express = require("express");

const router = express.Router();

const {
    registerUser
} = require("./api/authController");


// REGISTER ROUTE
router.post("/register", registerUser);


module.exports = router;