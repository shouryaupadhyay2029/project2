const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    createProject,
    getMyProjects,
    updateProject,
    deleteProject,
    featureProject
} = require('../api/projectController');
const Project = require('../models/Project');

// POST /api/projects/view/:id - Increment project view count
router.post('/view/:id', async(req, res) => {
    try {
        const { id } = req.params;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check cooldown (prevent spam refresh)
        const cooldownKey = `project_view_${req.ip}_${project._id}`;
        const lastView = req.app.get(cooldownKey) || 0;
        const now = Date.now();

        if (now - lastView < 30000) { // 30 second cooldown
            return res.status(200).json({
                success: true,
                message: 'Project view counted (cooldown active)',
                views: project.views
            });
        }

        // Increment view count
        project.views = (project.views || 0) + 1;
        await project.save();

        // Set cooldown
        req.app.set(cooldownKey, now);

        return res.status(200).json({
            success: true,
            message: 'Project view counted',
            views: project.views
        });

    } catch (error) {
        console.error('View project error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// All routes are protected
router.use(protect);

// POST /api/projects/create - Create a new project
router.post('/create', createProject);

// GET /api/projects/my-projects - Get current user's projects
router.get('/my-projects', getMyProjects);

// PUT /api/projects/update/:id - Update a project
router.put('/update/:id', updateProject);

// DELETE /api/projects/delete/:id - Delete a project
router.delete('/delete/:id', deleteProject);

// PUT /api/projects/feature/:id - Feature/unfeature a project
router.put('/feature/:id', featureProject);

module.exports = router;