const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
    senderName: {
        type: String,
        required: true,
        maxlength: 60
    },
    senderEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    subject: {
        type: String,
        maxlength: 100
    },
    message: {
        type: String,
        required: true,
        maxlength: 2000
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
