const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        sparse: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    displayName: {
        type: String,
        default: ""
    },

    bio: {
        type: String,
        default: ""
    },

    location: {
        type: String,
        default: ""
    },

    timezone: {
        type: String,
        default: "IST - UTC +5:30"
    },

    portfolioWebsite: {
        type: String,
        default: ""
    },

    profilePhoto: {
        type: String,
        default: ""
    },

    followers: {
        type: Number,
        default: 0
    },

    following: {
        type: Number,
        default: 0
    },

    skills: {
        type: [String],
        default: []
    },

    techStack: {
        type: [String],
        default: []
    },

    socialLinks: {
        github: {
            type: String,
            default: ""
        },
        twitter: {
            type: String,
            default: ""
        },
        linkedin: {
            type: String,
            default: ""
        }
    },

    resumeUrl: {
        type: String,
        default: ""
    },

    profileVisibility: {
        type: Boolean,
        default: true
    },

    showContributionGraph: {
        type: Boolean,
        default: true
    },

    showAchievements: {
        type: Boolean,
        default: true
    },

    currentStatus: {
        type: String,
        default: "Available"
    },

    developerTags: {
        type: [String],
        default: []
    },

    featuredProject: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);