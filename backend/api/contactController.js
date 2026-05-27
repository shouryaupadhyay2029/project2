const ContactMessage = require('../models/ContactMessage');
const User = require('../models/user');

// ==========================
// SEND CONTACT MESSAGE
// ==========================
const sendContactMessage = async(req, res) => {
    try {
        const { senderName, senderEmail, subject, message, receiverUsername } = req.body;

        // Validation
        if (!senderName || !senderEmail || !message) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and message are required'
            });
        }

        if (senderName.length > 60) {
            return res.status(400).json({
                success: false,
                message: 'Name must be less than 60 characters'
            });
        }

        if (subject && subject.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Subject must be less than 100 characters'
            });
        }

        if (message.length > 2000) {
            return res.status(400).json({
                success: false,
                message: 'Message must be less than 2000 characters'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(senderEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Find receiver by username
        let receiver = null;
        if (receiverUsername) {
            receiver = await User.findOne({ username: receiverUsername });
        }

        // Create contact message
        const contactMessage = await ContactMessage.create({
            senderName,
            senderEmail,
            subject: subject || '',
            message,
            receiver: receiver ? receiver._id : null
        });

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            contactMessage
        });

    } catch (error) {
        console.error('Send contact message error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// ==========================
// GET INBOX (PROTECTED)
// ==========================
const getInbox = async(req, res) => {
    try {
        const messages = await ContactMessage.find({ receiver: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            messages
        });

    } catch (error) {
        console.error('Get inbox error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = {
    sendContactMessage,
    getInbox
};
