const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 80 },
  description: { type: String, required: true, maxlength: 500 },
  techStack: { type: [String], default: [] },
  githubUrl: { type: String, default: "" },
  liveUrl: { type: String, default: "" },
  thumbnail: { type: String, default: "" },
  status: {
    type: String,
    enum: ["Planning", "In Progress", "Completed"],
    default: "Planning",
  },
  featured: { type: Boolean, default: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  collaborators: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      role: {
        type: String,
        enum: ["admin", "editor", "viewer"],
        default: "editor",
      },
    },
  ],
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// Indexes for search and sorting optimization
projectSchema.index({ title: "text", description: "text", techStack: "text" });
projectSchema.index({ owner: 1, createdAt: -1 });
projectSchema.index({ featured: -1, likes: -1, views: -1 });
projectSchema.index({ status: 1 });
projectSchema.index({ "collaborators.user": 1 });

module.exports = mongoose.model("Project", projectSchema);
