const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['profile_updated', 'project_created', 'project_updated', 'project_deleted', 'featured_project_changed', 'settings_updated', 'profile_customized']
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    metadata: {
        type: Object,
        default: {}
    },
    visibility: {
        type: String,
        enum: ['public', 'private'],
        default: 'public'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Activity', activitySchema);
