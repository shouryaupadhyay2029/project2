const Project = require("../models/Project");
const User = require("../models/user");

const PROJECT_PUBLIC_FIELDS =
  "title description techStack status thumbnail likes views owner createdAt featured";
const USER_PUBLIC_FIELDS =
  "username displayName bio location portfolioWebsite profilePhoto skills techStack socialLinks currentStatus developerTags profileViews createdAt";
const OWNER_PUBLIC_FIELDS = "username displayName profilePhoto";

const getPagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const getPublicProjects = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const [projects, total] = await Promise.all([
      Project.find({})
        .select(PROJECT_PUBLIC_FIELDS)
        .populate("owner", OWNER_PUBLIC_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments({}),
    ]);

    res.status(200).json({
      success: true,
      data: projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get public projects error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getPublicUser = async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username,
      isBanned: { $ne: true },
      $or: [
        { "security.profileVisibility": "public" },
        { "security.profileVisibility": { $exists: false } }
      ]
    })
      .select(USER_PUBLIC_FIELDS)
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const [projectsCount, latestProjects] = await Promise.all([
      Project.countDocuments({ owner: user._id }),
      Project.find({ owner: user._id })
        .select(PROJECT_PUBLIC_FIELDS)
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...user,
        projectsCount,
        latestProjects,
      },
    });
  } catch (error) {
    console.error("Get public user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getPublicTrending = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const projects = await Project.find({})
      .select(PROJECT_PUBLIC_FIELDS)
      .populate("owner", OWNER_PUBLIC_FIELDS)
      .sort({ featured: -1, likes: -1, views: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error("Get public trending error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getPublicProjects,
  getPublicUser,
  getPublicTrending,
};
