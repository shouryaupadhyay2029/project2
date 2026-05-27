const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("[DevStage DB] MongoDB connected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("[DevStage DB] MongoDB connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn(
        "[DevStage DB] MongoDB disconnected. Attempting reconnect...",
      );
    });

    mongoose.connection.on("reconnected", () => {
      console.log("[DevStage DB] MongoDB reconnected");
    });

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      heartbeatFrequencyMS: 10000,
    });

    console.log(`[DevStage DB] Connected to: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("[DevStage DB] Initial connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
