const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      sparse: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    displayName: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    timezone: {
      type: String,
      default: "IST - UTC +5:30",
    },

    portfolioWebsite: {
      type: String,
      default: "",
    },

    profilePhoto: {
      type: String,
      default: "",
    },

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    skills: {
      type: [String],
      default: [],
    },

    techStack: {
      type: [String],
      default: [],
    },

    socialLinks: {
      github: {
        type: String,
        default: "",
      },
      twitter: {
        type: String,
        default: "",
      },
      linkedin: {
        type: String,
        default: "",
      },
    },

    resumeUrl: {
      type: String,
      default: "",
    },

    profileVisibility: {
      type: Boolean,
      default: true,
    },

    showContributionGraph: {
      type: Boolean,
      default: true,
    },

    showAchievements: {
      type: Boolean,
      default: true,
    },

    currentStatus: {
      type: String,
      default: "Available",
    },

    developerTags: {
      type: [String],
      default: [],
    },

    featuredProject: {
      type: String,
      default: "",
    },

    profileViews: {
      type: Number,
      default: 0,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },

    isBanned: {
      type: Boolean,
      default: false,
    },

    notifications: [
      {
        type: {
          type: String,
        },
        title: String,
        message: String,
        read: {
          type: Boolean,
          default: false,
        },
        priority: {
          type: String,
          enum: ["low", "normal", "high", "urgent"],
          default: "normal",
        },
        groupKey: {
          type: String,
          default: "",
        },
        silent: {
          type: Boolean,
          default: false,
        },
        expiresAt: {
          type: Date,
          default: null,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        metadata: {
          type: Object,
          default: {},
        },
      },
    ],

    notificationSettings: {
      emailUpdates: {
        type: Boolean,
        default: true,
      },
      projectComments: {
        type: Boolean,
        default: true,
      },
      collaborationRequests: {
        type: Boolean,
        default: true,
      },
      productAnnouncements: {
        type: Boolean,
        default: false,
      },
      securityAlerts: {
        type: Boolean,
        default: true,
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      projectUpdates: {
        type: Boolean,
        default: true,
      },
      marketingEmails: {
        type: Boolean,
        default: false,
      },
      collaborationInvites: {
        type: Boolean,
        default: true,
      },
    },

    appearance: {
      theme: {
        type: String,
        enum: ["dark", "light", "system"],
        default: "dark",
      },
      reducedMotion: {
        type: Boolean,
        default: false,
      },
      compactMode: {
        type: Boolean,
        default: false,
      },
    },

    projectSettings: {
      autoPublish: {
        type: Boolean,
        default: false,
      },
      allowForks: {
        type: Boolean,
        default: true,
      },
      showProjectStats: {
        type: Boolean,
        default: true,
      },
    },

    projectPreferences: {
      autoSaveDrafts: {
        type: Boolean,
        default: true,
      },
      showProjectAnalytics: {
        type: Boolean,
        default: true,
      },
      enablePublicProjects: {
        type: Boolean,
        default: false,
      },
    },

    ecosystem: {
      githubConnected: {
        type: Boolean,
        default: false,
      },
      twitterConnected: {
        type: Boolean,
        default: false,
      },
      linkedinConnected: {
        type: Boolean,
        default: false,
      },
      enableCommunityProfile: {
        type: Boolean,
        default: true,
      },
      showOnlineStatus: {
        type: Boolean,
        default: true,
      },
      allowTeamInvites: {
        type: Boolean,
        default: true,
      },
    },

    security: {
      twoFactorEnabled: {
        type: Boolean,
        default: false,
      },
      profileVisibility: {
        type: String,
        enum: ["public", "private"],
        default: "public",
      },
      searchableProfile: {
        type: Boolean,
        default: true,
      },
    },

    advanced: {
      developerMode: {
        type: Boolean,
        default: false,
      },
      betaFeatures: {
        type: Boolean,
        default: false,
      },
      analyticsSharing: {
        type: Boolean,
        default: true,
      },
    },

    privacy: {
      twoFactorEnabled: {
        type: Boolean,
        default: false,
      },
      profileIndexed: {
        type: Boolean,
        default: true,
      },
      activityVisible: {
        type: Boolean,
        default: true,
      },
    },

    // ─── Bookmarks ───────────────────────────────────────────
    savedProjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
      },
    ],

    savedProfiles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ─── Streak tracking ─────────────────────────────────────
    currentStreak: {
      type: Number,
      default: 0,
    },

    longestStreak: {
      type: Number,
      default: 0,
    },

    lastActiveDate: {
      type: String, // "YYYY-MM-DD"
      default: "",
    },

    // ─── Feed preferences ─────────────────────────────────────
    feedPreferences: {
      showTrending: { type: Boolean, default: true },
      showFollowing: { type: Boolean, default: true },
      showRecommended: { type: Boolean, default: true },
    },

    // ─── Moderation ───────────────────────────────────────────
    warningCount: {
      type: Number,
      default: 0,
    },

    reportCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ displayName: 1 });
userSchema.index({ skills: 1 });
userSchema.index({ developerTags: 1 });
userSchema.index({ isOnline: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ "notifications.read": 1 });
userSchema.index({ "notifications.createdAt": -1 });
userSchema.index({ "notifications.groupKey": 1 });
userSchema.index({ "notifications.expiresAt": 1 });
userSchema.index({ savedProjects: 1 });
userSchema.index({ savedProfiles: 1 });
userSchema.index({ currentStreak: -1 });

module.exports = mongoose.model("User", userSchema);
