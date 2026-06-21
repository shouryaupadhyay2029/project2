const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/user");

dotenv.config();

async function fixCorrupt() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const email = "upadhyayshourya352@gmail.com";
  try {
      await User.updateOne({ email: email }, {
          $set: {
              followers: [],
              following: []
          }
      });
      console.log("Fixed user:", email);
  } catch (e) {
      console.error(e);
  }

  process.exit(0);
}

fixCorrupt();
