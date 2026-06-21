const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth").protect;
const {
    startConversation,
    sendMessage,
    getConversations,
    getConversation,
    markConversationRead
} = require("../api/messageController");

router.use(authMiddleware);

router.post("/start", startConversation);
router.post("/send", sendMessage);
router.get("/conversations", getConversations);
router.get("/conversation/:id", getConversation);
router.put("/read/:id", markConversationRead);

module.exports = router;
