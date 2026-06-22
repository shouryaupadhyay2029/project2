const Project = require("../models/Project");
const { createActivity } = require("./activityController");

// ==========================
// CREATE PROJECT
// ==========================
const createProject = async (req, res) => {
  try {
    const {
      title,
      description,
      techStack,
      githubUrl,
      liveUrl,
      status,
      category,
      thumbnail,
    } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    if (title.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Title must be less than 80 characters",
      });
    }

    if (description.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Description must be less than 500 characters",
      });
    }

    if (techStack && techStack.length > 12) {
      return res.status(400).json({
        success: false,
        message: "Tech stack cannot have more than 12 tags",
      });
    }

    // Validate URLs if provided
    const urlRegex =
      /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (githubUrl && !urlRegex.test(githubUrl)) {
      return res.status(400).json({
        success: false,
        message: "Invalid GitHub URL format",
      });
    }

    if (liveUrl && !urlRegex.test(liveUrl)) {
      return res.status(400).json({
        success: false,
        message: "Invalid live URL format",
      });
    }

    // Create project with owner from authenticated user
    const project = await Project.create({
      title,
      description,
      techStack: techStack || [],
      githubUrl: githubUrl || "",
      liveUrl: liveUrl || "",
      status: status || "Planning",
      category: category || "Web App",
      thumbnail: thumbnail || "",
      owner: req.user.id,
    });

    // Create activity log
    await createActivity(
      req.user.id,
      "project_created",
      "Created a new project",
      `Project "${title}" was created`,
      { projectId: project._id, projectTitle: title },
      "public",
    );

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================
// GET MY PROJECTS
// ==========================
const getMyProjects = async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get my projects error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================
// UPDATE PROJECT
// ==========================
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      techStack,
      githubUrl,
      liveUrl,
      status,
      category,
      thumbnail,
    } = req.body;

    // Find project
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const collaborator = (project.collaborators || []).find(
      (member) => member.user && member.user.toString() === req.user.id,
    );
    const canEdit =
      project.owner.toString() === req.user.id ||
      ["admin", "editor"].includes(collaborator?.role);

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this project",
      });
    }

    // Validation
    if (title && title.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Title must be less than 80 characters",
      });
    }

    if (description && description.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Description must be less than 500 characters",
      });
    }

    if (techStack && techStack.length > 12) {
      return res.status(400).json({
        success: false,
        message: "Tech stack cannot have more than 12 tags",
      });
    }

    // Validate URLs if provided
    const urlRegex =
      /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (githubUrl && !urlRegex.test(githubUrl)) {
      return res.status(400).json({
        success: false,
        message: "Invalid GitHub URL format",
      });
    }

    if (liveUrl && !urlRegex.test(liveUrl)) {
      return res.status(400).json({
        success: false,
        message: "Invalid live URL format",
      });
    }

    // Update project
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      {
        ...(title && { title }),
        ...(description && { description }),
        ...(techStack && { techStack }),
        ...(githubUrl !== undefined && { githubUrl }),
        ...(liveUrl !== undefined && { liveUrl }),
        ...(status && { status }),
        ...(category && { category }),
        ...(thumbnail !== undefined && { thumbnail }),
      },
      { new: true, runValidators: true },
    );

    // Create activity log
    await createActivity(
      req.user.id,
      "project_updated",
      "Updated a project",
      `Project "${updatedProject.title}" was updated`,
      { projectId: updatedProject._id, projectTitle: updatedProject.title },
      "public",
    );

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================
// DELETE PROJECT
// ==========================
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    // Find project
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Verify ownership
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this project",
      });
    }

    // Delete project
    await Project.findByIdAndDelete(id);

    // Cascade delete analytics
    try {
      const ProjectAnalytics = require("../models/ProjectAnalytics");
      await ProjectAnalytics.deleteMany({ projectId: id });
    } catch (e) {
      console.error("Cascade delete analytics error:", e);
    }

    // Create activity log
    await createActivity(
      req.user.id,
      "project_deleted",
      "Deleted a project",
      `Project "${project.title}" was deleted`,
      { projectId: project._id, projectTitle: project.title },
      "private",
    );

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================
// FEATURE PROJECT
// ==========================
const featureProject = async (req, res) => {
  try {
    const { id } = req.params;

    // Find project
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Verify ownership
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to feature this project",
      });
    }

    // If setting as featured, remove featured from all other user projects
    if (!project.featured) {
      await Project.updateMany(
        { owner: req.user.id, featured: true },
        { featured: false },
      );
    }

    // Toggle featured status
    project.featured = !project.featured;
    await project.save();

    // Create activity log
    await createActivity(
      req.user.id,
      "featured_project_changed",
      project.featured ? "Featured a project" : "Unfeatured a project",
      `Project "${project.title}" was ${project.featured ? "featured" : "unfeatured"}`,
      {
        projectId: project._id,
        projectTitle: project.title,
        featured: project.featured,
      },
      "public",
    );

    res.status(200).json({
      success: true,
      message: project.featured
        ? "Project featured successfully"
        : "Project unfeatured successfully",
      project,
    });
  } catch (error) {
    console.error("Feature project error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ==========================
// LIKE PROJECT
// ==========================
const likeProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

    project.likes = (project.likes || 0) + 1;
    await project.save();

    return res.status(200).json({ success: true, likes: project.likes });
  } catch (error) {
    console.error("Like project error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==========================
// GET ALL PROJECTS (PUBLIC)
// ==========================
const getAllProjects = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 12, 1),
      50,
    );
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.featured === "true") filter.featured = true;

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .select(
          "title description techStack status category featured thumbnail likes views owner createdAt",
        )
        .populate("owner", "username displayName profilePhoto")
        .sort({ featured: -1, likes: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      projects,
      page,
      limit,
      total,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error("Get all projects error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createProject,
  getMyProjects,
  updateProject,
  deleteProject,
  featureProject,
  likeProject,
  getAllProjects,
};
