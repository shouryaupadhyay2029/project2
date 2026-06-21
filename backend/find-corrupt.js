const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/user");

dotenv.config();

async function findCorrupt() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const users = await User.find({});
  for (const user of users) {
      try {
          user.isOnline = true;
          await user.save();
      } catch (e) {
          console.error("Corrupt user:", user.email, user._id, e.message);
      }
  }

  process.exit(0);
}

findCorrupt();
