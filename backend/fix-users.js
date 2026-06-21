const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/user");

dotenv.config();

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const users = await User.find({});
  let fixed = 0;
  for (const user of users) {
    let changed = false;
    if (user.following && user.following.some(f => !f || typeof f !== 'object')) {
        // filter out invalid objectIds
        user.following = user.following.filter(f => f && mongoose.Types.ObjectId.isValid(f));
        changed = true;
    }
    if (user.followers && user.followers.some(f => !f || typeof f !== 'object')) {
        user.followers = user.followers.filter(f => f && mongoose.Types.ObjectId.isValid(f));
        changed = true;
    }
    
    // Also fix any other arrays that might be corrupt
    // e.g. empty strings inside arrays
    
    if (changed) {
        // save without validation to force it, or just regular save
        try {
            await user.save();
            fixed++;
        } catch(e) {
            console.log("Failed to save user", user.email, e.message);
            // hard update
            await User.updateOne({_id: user._id}, {
                $set: { followers: [], following: [] }
            });
            fixed++;
        }
    }
  }

  console.log(`Fixed ${fixed} users.`);
  process.exit(0);
}

fix();
