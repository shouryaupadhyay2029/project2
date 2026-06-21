const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/user");

dotenv.config();

async function testLogin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const user = await User.findOne({});
  console.log("Testing save on user:", user.email);
  try {
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save();
      console.log("Save successful!");
  } catch (e) {
      console.error(e);
  }

  process.exit(0);
}

testLogin();
