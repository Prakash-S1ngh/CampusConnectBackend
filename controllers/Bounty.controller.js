const mongoose = require('mongoose');
const Bounty = require('../models/Bounty.models');
const { getIO ,io} = require('../Socket/Socket');
const cron = require("node-cron");
const BountyQueue = require('../models/BountyQueue.model');
const User = require('../models/User.models');
const Participation = require('../models/Participation.models');
const College = require('../models/College.models');
const Notification = require('../models/Notification.model');
const BountyData = require('../models/BountyData.model');
const UserBounty = require('../models/UsersBounty.model');







exports.createBounty = async (req, res) => {
    try {
        const {
            title,
            tags,
            description,
            amount,
            deadline,
            difficulty
        } = req.body;
        const createdBy = req.userId;

        if (!title || !tags || !description || !amount || !deadline || !createdBy) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields',
            });
        }
        const user = await User.findOne({ _id: createdBy });
        const eligibleCollege = user.college;
        const bounty = await Bounty.create({
            title,
            tags,
            description,
            amount,
            deadline,
            createdBy,
            eligibleCollege,
            difficulty,
        });

        // ✅ Emit to only eligible college rooms
        if (io && eligibleCollege) {
            io.to(eligibleCollege.toString()).emit("newBounty", bounty);
        }

        return res.status(201).json({
            success: true,
            message: 'Bounty created successfully',
            bounty,
        });
    } catch (error) {
        console.log('Error in creating bounty', error);
        return res.status(500).json({
            success: false,
            message: 'Error in creating bounty',
            error: error.message,
        });
    }
};


exports.getBounty = async (req, res) => {
    try {
        const userId = req.userId;

        // 1. Get user's college
        const user = await User.findById(userId).populate("college");
        if (!user || !user.college) {
            return res.status(404).json({
                success: false,
                message: "User or user's college not found",
            });
        }

        const userCollegeId = user.college._id;

        // 2. Find bounties eligible for this college
        const bounties = await Bounty.find({
            eligibleCollege: userCollegeId,
            isActive: true,
        })
            .sort({ createdAt: -1 })
            .populate("createdBy", "name profileImage")
            .populate("eligibleCollege", "name");

        // 3. For each bounty, get total participants and format the response
        const formattedBounties = await Promise.all(
            bounties.map(async (bounty) => {
                const daysLeft = Math.ceil(
                    (new Date(bounty.deadline) - new Date()) / (1000 * 60 * 60 * 24)
                );

                const daysAgo = Math.ceil(
                    (new Date() - new Date(bounty.createdAt)) / (1000 * 60 * 60 * 24)
                );

                const profileImage =
                    bounty.createdBy._id.toString() === userId
                        ? user.profileImage
                        : bounty.createdBy.profileImage;

                // 👉 Count total participants for this bounty
                let totalParticipants = await Participation.countDocuments({
                    bountyId: bounty._id,
                });

                const rem = await BountyQueue.find({ bounty: bounty._id });

                totalParticipants = totalParticipants + rem.length;

                return {
                    title: bounty.title,
                    createdBy: bounty.createdBy.name || "Unknown",
                    description: bounty.description,
                    tags: bounty.tags,
                    amount: `₹ ${bounty.amount}`,
                    postedAgo: `${daysAgo} days ago`,
                    deadline: `${daysLeft > 0 ? daysLeft : 0} days left`,
                    difficulty: bounty.difficulty,
                    bountyId: bounty._id,
                    profileImage: profileImage || null,
                    totalParticipants: totalParticipants,
                };
            })
        );

        return res.status(200).json({
            success: true,
            bounties: formattedBounties,
        });
    } catch (error) {
        console.error("Error fetching bounty:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching bounty",
            error: error.message,
        });
    }
};

exports.deleteBounty = async (req, res) => {
    try {
        const userId = req.userId; // Assuming userId is set on request by authentication middleware
        const bountyId = req.params.id;

        if (!userId || !bountyId) {
            return res.status(400).json({
                success: false,
                message: "User ID or bounty ID missing in request",
            });
        }

        const bounty = await Bounty.findById(bountyId);

        if (!bounty) {
            return res.status(404).json({
                success: false,
                message: "Bounty not found",
            });
        }

        // Check if the current user is the one who created the bounty
        if (bounty.createdBy.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this bounty",
            });
        }

        // Delete the bounty
        await Bounty.findByIdAndDelete(bountyId);

        return res.status(200).json({
            success: true,
            message: "Bounty deleted successfully",
        });
    } catch (error) {
        console.log("Error in deleting bounty", error);
        return res.status(500).json({
            success: false,
            message: "Error in deleting bounty",
            error: error.message,
        });
    }
};

const TEAM_SIZE = 4;
const TEAM_NAMES = ['Code Avengers', 'Bug Busters', 'Pixel Ninjas', 'Hackstreet Boys', 'Code Crusaders']

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


//For notificatioin 
// utils/sendNotification.js

const sendNotification = async (userId, message) => {
    try {
        await Notification.create({ user: userId, message });
    } catch (err) {
        console.error("Failed to send notification:", err.message);
    }
};


exports.enrollInBounty = async (req, res) => {
    try {
        const userId = req.userId;
        const bountyId = req.params.id;

        const bounty = await Bounty.findById(bountyId);
        if (!bounty) return res.status(404).json({ success: false, message: "Bounty not found" });

        const userBountyData = await UserBounty.findOne({ user: userId });

        if (userBountyData && userBountyData.lastCompleted) {
            const now = new Date();
            const diffInHours = (now - new Date(userBountyData.lastCompleted)) / (1000 * 60 * 60);
            if (diffInHours < 24) {
                return res.status(403).json({
                    success: false,
                    message: `You must wait ${(24 - diffInHours).toFixed(1)} more hours before enrolling in another bounty.`,
                });
            }
        }

        const alreadyInQueue = await BountyQueue.findOne({ user: userId });
        if (alreadyInQueue) {
            return res.status(400).json({ success: false, message: "Already enrolled in some bounty " });
        }
        await BountyQueue.create({ user: userId, bounty: bountyId });
        const totalParticipants = await BountyQueue.countDocuments({ bounty: bountyId });

        // Emit to everyone in real-time
        getIO().emit(`bounty:participants:${bountyId}`, {
            bountyId,
            count: totalParticipants
        });

        const queue = await BountyQueue.find({ bounty: bountyId });
        if (queue.length < TEAM_SIZE) {
            return res.status(200).json({ success: true, message: "Enrolled and currently in queue." });
        }

        // 👉 If enough users to form a team
        if (queue.length >= TEAM_SIZE) {
            const shuffled = shuffleArray(queue.map(q => q.user.toString()));
            const teams = [];

            while (shuffled.length >= TEAM_SIZE) {
                const members = shuffled.splice(0, TEAM_SIZE);
                const teamName = TEAM_NAMES[Math.floor(Math.random() * TEAM_NAMES.length)];

                const newTeam = await Participation.create({
                    bounty: bountyId,
                    teamName,
                    members,
                });

                teams.push(newTeam);
            }

            await BountyQueue.deleteMany({
                bounty: bountyId,
                user: { $in: teams.flatMap(team => team.members) },
            });

            for (const team of teams) {
                for (const memberId of team.members) {
                    await sendNotification(
                        memberId,
                        `🎉 You have been added to team "${team.teamName}" for bounty "${bounty.title}"`
                    );
                }
            }

            return res.status(200).json({ success: true, message: "Team formed and you are enrolled!" });
        }

        // 👉 If team not yet full
        return res.status(200).json({ success: true, message: "Enrolled and currently in queue." });

    } catch (err) {
        console.error("Error in enrolling bounty:", err);
        return res.status(500).json({ success: false, message: "Server Error", error: err.message });
    }
};


exports.startBountyCleanupJob = () => {
    // Runs every day at midnight
    cron.schedule("0 0 * * *", async () => {
        try {
            const now = new Date();

            // Delete bounties where deadline is before now
            const result = await Bounty.deleteMany({ deadline: { $lt: now } });

            console.log(`[CRON] Deleted ${result.deletedCount} expired bounties at ${now.toISOString()}`);
        } catch (err) {
            console.error("[CRON] Error deleting expired bounties:", err);
        }
    });
}



