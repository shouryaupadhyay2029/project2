const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  addMember,
  removeMember,
  changeRole,
  deleteWorkspace,
  getWorkspaceActivity,
} = require("../api/workspaceController");

router.use(authMiddleware);

router.post("/create", createWorkspace);
router.get("/my-workspaces", getMyWorkspaces);
router.get("/:id", getWorkspace);
router.put("/add-member", addMember);
router.put("/remove-member", removeMember);
router.put("/change-role", changeRole);
router.delete("/delete/:id", deleteWorkspace);
router.get("/activity/:workspaceId", getWorkspaceActivity);

module.exports = router;
