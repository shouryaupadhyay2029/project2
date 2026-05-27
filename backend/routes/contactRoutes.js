const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    sendContactMessage,
    getInbox
} = require('../api/contactController');

// POST /api/contact/send - Send a contact message (public)
router.post('/send', sendContactMessage);

// GET /api/contact/inbox - Get user's inbox (protected)
router.get('/inbox', protect, getInbox);

module.exports = router;