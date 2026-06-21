const mongoose = require("mongoose");
const User = require("../models/user");
const { createActivity } = require("./activityController");
const { createNotification } = require("./notificationController");

function profileSummary(user) {
    return {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        profilePhoto: user.profilePhoto,
        followersCount: Array.isArray(user.followers) ? user.followers.length : 0,
        followingCount: Array.isArray(user.following) ? user.following.length : 0,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
    };
}

async function findVisibleUserByUsername(username) {
    return User.findOne({
        username,
        isBanned: { $ne: true },
        $or: [
            { "security.profileVisibility": "public" },
            { "security.profileVisibility": { $exists: false } }
        ]
    })
        .select("username displayName profilePhoto followers following isOnline lastSeen")
        .lean();
}

const followUser = async(req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user id" });
        }

        const actorId = String(req.user.id);
        if (actorId === String(userId)) {
            return res.status(400).json({ success: false, message: "You cannot follow yourself" });
        }

        const [actor, target] = await Promise.all([
            User.findById(actorId).select("username displayName following"),
            User.findById(userId).select("username followers notifications isBanned")
        ]);

        if (!actor || !target || target.isBanned) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const alreadyFollowing = (actor.following || []).some((id) => String(id) === String(target._id));
        if (alreadyFollowing) {
            return res.status(400).json({ success: false, message: "Already following this user" });
        }

        await Promise.all([
            User.updateOne({ _id: actor._id }, { $addToSet: { following: target._id }, $set: { lastSeen: new Date() } }),
            User.updateOne({ _id: target._id }, { $addToSet: { followers: actor._id } })
        ]);

        await Promise.all([
            createNotification(target._id, {
                type: "follow",
                title: "New Follower",
                message: `${actor.username} started following you`,
                metadata: { followerId: actor._id, username: actor.username }
            }),
            createActivity(actor._id, "follow_user", "Followed user", `Started following ${target.username}`, { targetUser: target._id }, "public")
        ]);

        const [updatedActor, updatedTarget] = await Promise.all([
            User.findById(actor._id).select("followers following").lean(),
            User.findById(target._id).select("followers following").lean()
        ]);

        return res.status(200).json({
            success: true,
            message: "Followed user",
            isFollowing: true,
            followerCount: updatedTarget.followers.length,
            followingCount: updatedActor.following.length
        });
    } catch (error) {
        console.error("Follow user error:", error);
        return res.status(500).json({ success: false, message: "Unable to follow user" });
    }
};

const unfollowUser = async(req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user id" });
        }

        const actorId = String(req.user.id);
        if (actorId === String(userId)) {
            return res.status(400).json({ success: false, message: "You cannot unfollow yourself" });
        }

        const [actor, target] = await Promise.all([
            User.findById(actorId).select("username following"),
            User.findById(userId).select("username followers")
        ]);

        if (!actor || !target) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        await Promise.all([
            User.updateOne({ _id: actor._id }, { $pull: { following: target._id }, $set: { lastSeen: new Date() } }),
            User.updateOne({ _id: target._id }, { $pull: { followers: actor._id } })
        ]);

        await createActivity(actor._id, "unfollow_user", "Unfollowed user", `Stopped following ${target.username}`, { targetUser: target._id }, "private");

        const [updatedActor, updatedTarget] = await Promise.all([
            User.findById(actor._id).select("following").lean(),
            User.findById(target._id).select("followers").lean()
        ]);

        return res.status(200).json({
            success: true,
            message: "Unfollowed user",
            isFollowing: false,
            followerCount: updatedTarget.followers.length,
            followingCount: updatedActor.following.length
        });
    } catch (error) {
        console.error("Unfollow user error:", error);
        return res.status(500).json({ success: false, message: "Unable to unfollow user" });
    }
};

const getFollowers = async(req, res) => {
    try {
        const user = await findVisibleUserByUsername(req.params.username);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const followers = await User.find({ _id: { $in: user.followers || [] }, isBanned: { $ne: true } })
            .select("username displayName profilePhoto followers following isOnline lastSeen")
            .lean();

        return res.status(200).json({
            success: true,
            count: followers.length,
            followers: followers.map(profileSummary)
        });
    } catch (error) {
        console.error("Get followers error:", error);
        return res.status(500).json({ success: false, message: "Unable to load followers" });
    }
};

const getFollowing = async(req, res) => {
    try {
        const user = await findVisibleUserByUsername(req.params.username);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const following = await User.find({ _id: { $in: user.following || [] }, isBanned: { $ne: true } })
            .select("username displayName profilePhoto followers following isOnline lastSeen")
            .lean();

        return res.status(200).json({
            success: true,
            count: following.length,
            following: following.map(profileSummary)
        });
    } catch (error) {
        console.error("Get following error:", error);
        return res.status(500).json({ success: false, message: "Unable to load following" });
    }
};

module.exports = {
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing
};
