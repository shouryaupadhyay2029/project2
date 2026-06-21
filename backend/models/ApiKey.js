const mongoose = require("mongoose");

const apiKeySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    scopes: {
      type: [String],
      default: [],
    },
    monthlyQuota: {
      type: Number,
      default: 10000,
      min: 0,
    },
    usedThisMonth: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

apiKeySchema.index({ owner: 1 });

module.exports = mongoose.model("ApiKey", apiKeySchema);
