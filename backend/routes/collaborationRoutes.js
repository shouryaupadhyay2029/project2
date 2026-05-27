const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const {
    sendCollaborationRequest,
    acceptCollaborationRequest,
    rejectCollaborationRequest,
    getIncomingRequests,
    getOutgoingRequests
} = require("../api/collaborationController");

router.use(authMiddleware);

router.post("/send", sendCollaborationRequest);
router.put("/accept/:id", acceptCollaborationRequest);
router.put("/reject/:id", rejectCollaborationRequest);
router.get("/incoming", getIncomingRequests);
router.get("/outgoing", getOutgoingRequests);

module.exports = router;
