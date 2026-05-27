const Activity = require('../models/Activity');
const User = require('../models/user');

// ==========================
// GET MY ACTIVITY
// ==========================
const getMyActivity = async(req, res) => {
    try {
        const activities = await Activity.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            activities
        });

    } catch (error) {
        console.error('Get my activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// ==========================
// GET USER ACTIVITY (PUBLIC)
// ==========================
const getUserActivity = async(req, res) => {
    try {
        const { username } = req.params;

        // Find user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get only public activities
        const activities = await Activity.find({ 
            user: user._id,
            visibility: 'public'
        })
        .sort({ createdAt: -1 })
        .limit(50);

        res.status(200).json({
            success: true,
            activities
        });

    } catch (error) {
        console.error('Get user activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// ==========================
// CREATE ACTIVITY
// ==========================
const createActivity = async(userId, type, title, description = '', metadata = {}, visibility = 'public') => {
    try {
        const activity = await Activity.create({
            user: userId,
            type,
            title,
            description,
            metadata,
            visibility
        });
        return activity;
    } catch (error) {
        console.error('Create activity error:', error);
        return null;
    }
};

// ==========================
// GET ACTIVITY HEATMAP DATA
// ==========================
const getActivityHeatmap = async(req, res) => {
    try {
        const { username } = req.params;

        // Find user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get activities grouped by date
        const activities = await Activity.find({ 
            user: user._id,
            visibility: 'public'
        })
        .select('createdAt')
        .sort({ createdAt: -1 })
        .limit(365); // Last year

        // Group by date
        const heatmapData = {};
        activities.forEach(activity => {
            const date = activity.createdAt.toISOString().split('T')[0];
            heatmapData[date] = (heatmapData[date] || 0) + 1;
        });

        res.status(200).json({
            success: true,
            heatmap: heatmapData
        });

    } catch (error) {
        console.error('Get activity heatmap error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = {
    getMyActivity,
    getUserActivity,
    createActivity,
    getActivityHeatmap
};
