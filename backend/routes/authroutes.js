const express = require("express");
const router = express.Router();

const {
    registerUser
} = require("../api/authcontroller");

router.post("/register", registerUser);


module.exports = router;