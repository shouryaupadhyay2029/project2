const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/user");
const bcrypt = require("bcryptjs");

dotenv.config();

async function testRegister() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const email = "testnewuser@example.com";
  console.log("Testing create user:", email);
  try {
      // delete if exists
      await User.deleteOne({email});

      const hashedPassword = await bcrypt.hash("password123", 10);
      const user = await User.create({
            username: "testnewuser",
            email: email,
            password: hashedPassword,
            isOnline: true,
            lastSeen: new Date()
      });
      console.log("Create successful! User ID:", user._id);
  } catch (e) {
      console.error(e);
  }

  process.exit(0);
}

testRegister();
