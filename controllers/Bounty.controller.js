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
        // Convert deadline string to proper Date object
        console.log('Received deadline:', deadline);
        const deadlineDate = new Date(deadline);
        console.log('Converted deadline date:', deadlineDate);
        console.log('Current date:', new Date());
        
        // Validate that the deadline is in the future
        if (deadlineDate <= new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Deadline must be in the future',
            });
        }

        const bounty = await Bounty.create({
            title,
            tags,
            description,
            amount,
            deadline: deadlineDate,
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
                console.log('Bounty deadline:', bounty.deadline);
                console.log('Bounty deadline type:', typeof bounty.deadline);
                const daysLeft = Math.ceil(
                    (new Date(bounty.deadline) - new Date()) / (1000 * 60 * 60 * 24)
                );
                console.log('Days left calculated:', daysLeft);

                const daysAgo = Math.ceil(
                    (new Date() - new Date(bounty.createdAt)) / (1000 * 60 * 60 * 24)
                );

                const profileImage =
                    bounty.createdBy._id.toString() === userId
                        ? user.profileImage
                        : bounty.createdBy.profileImage;

                // 👉 Count total participants for this bounty
                const { totalParticipants, queueMembers, totalTeamMembers } = await calculateTotalParticipants(bounty._id);

                return {
                    title: bounty.title,
                    createdBy: bounty.createdBy.name || "Unknown",
                    description: bounty.description,
                    tags: bounty.tags,
                    amount: `₹ ${bounty.amount}`,
                    postedAgo: `${daysAgo} days ago`,
                    deadline: `${daysLeft > 0 ? daysLeft : 0} days left`,
                    daysLeft: daysLeft, // Add raw daysLeft for frontend logic
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

// Helper function to calculate total participants for a bounty
const calculateTotalParticipants = async (bountyId) => {
    try {
        const queueMembers = await BountyQueue.countDocuments({ bounty: bountyId });
        
        const teamMembersAggregation = await Participation.aggregate([
            { $match: { bounty: new mongoose.Types.ObjectId(bountyId) } },
            { $unwind: '$members' },
            { $group: { _id: null, totalMembers: { $sum: 1 } } }
        ]);
        const totalTeamMembers = teamMembersAggregation.length > 0 ? teamMembersAggregation[0].totalMembers : 0;
        
        const totalParticipants = queueMembers + totalTeamMembers;
        
        console.log(`[CALCULATE_TOTAL] Bounty ${bountyId}: ${totalParticipants} total participants (${queueMembers} in queue, ${totalTeamMembers} in teams)`);
        
        return {
            totalParticipants,
            queueMembers,
            totalTeamMembers
        };
    } catch (error) {
        console.error('Error calculating total participants:', error);
        return { totalParticipants: 0, queueMembers: 0, totalTeamMembers: 0 };
    }
};


exports.enrollInBounty = async (req, res) => {
    try {
        const userId = req.userId;
        const bountyId = req.params.id;

        const bounty = await Bounty.findById(bountyId);
        if (!bounty) return res.status(404).json({ success: false, message: "Bounty not found" });
        
        // Check if bounty is still active
        if (!bounty.isActive) {
            return res.status(400).json({ success: false, message: "This bounty is no longer active" });
        }

        let userBountyData = await UserBounty.findOne({ user: userId });

        // Create UserBounty record if it doesn't exist
        if (!userBountyData) {
            userBountyData = await UserBounty.create({ user: userId });
            console.log(`[ENROLL] Created new UserBounty record for user ${userId}`);
        }

        if (userBountyData && userBountyData.lastCompletedBounty) {
            const now = new Date();
            const diffInHours = (now - new Date(userBountyData.lastCompletedBounty)) / (1000 * 60 * 60);
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
        
        console.log(`[ENROLL] User ${userId} enrolling in bounty ${bountyId}`);
        
        // Create queue entry with error handling
        const queueEntry = await BountyQueue.create({ user: userId, bounty: bountyId });
        console.log(`[ENROLL] User ${userId} successfully added to queue for bounty ${bountyId}, queue entry ID: ${queueEntry._id}`);
        
        // Calculate total participants: queue members + team members
        const { totalParticipants, queueMembers, totalTeamMembers } = await calculateTotalParticipants(bountyId);

        // Emit to everyone in real-time
        getIO().emit(`bounty:participants:${bountyId}`, {
            bountyId,
            count: totalParticipants
        });

        const queue = await BountyQueue.find({ bounty: bountyId });
        console.log(`[TEAM] Queue length: ${queue.length}, TEAM_SIZE: ${TEAM_SIZE}`);
        
        if (queue.length < TEAM_SIZE) {
            console.log(`[TEAM] Not enough users to form team. Need ${TEAM_SIZE - queue.length} more users.`);
            return res.status(200).json({ success: true, message: "Enrolled and currently in queue." });
        }

        // 👉 If enough users to form a team
        if (queue.length >= TEAM_SIZE) {
            console.log(`[TEAM] Enough users to form team! Queue length: ${queue.length}`);
            console.log(`[TEAM] Forming team for bounty ${bountyId} with ${queue.length} users`);
            const shuffled = shuffleArray(queue.map(q => q.user.toString()));
            const teams = [];

            console.log(`[TEAM] Starting team formation. Shuffled users:`, shuffled);
            console.log(`[TEAM] Will form ${Math.floor(shuffled.length / TEAM_SIZE)} team(s) and leave ${shuffled.length % TEAM_SIZE} user(s) in queue`);
            
            while (shuffled.length >= TEAM_SIZE) {
                const members = shuffled.splice(0, TEAM_SIZE);
                const teamName = TEAM_NAMES[Math.floor(Math.random() * TEAM_NAMES.length)];

                console.log(`[TEAM] Creating team "${teamName}" with members:`, members);
                const newTeam = await Participation.create({
                    bounty: bountyId,
                    teamName,
                    members,
                });
                console.log(`[TEAM] Team created successfully:`, newTeam._id);
                teams.push(newTeam);
                console.log(`[TEAM] Remaining users after team formation:`, shuffled.length);
            }
            
            if (shuffled.length > 0) {
                console.log(`[TEAM] ${shuffled.length} user(s) left in queue after team formation`);
            }

            console.log(`[TEAM] Teams formed:`, teams.length);
            console.log(`[TEAM] Users to remove from queue:`, teams.flatMap(team => team.members));
            
            // Update bounty participation count
            await Bounty.findByIdAndUpdate(bountyId, {
                $push: { participation: { $each: teams.map(team => team._id) } },
                $inc: { teamAssignedCount: teams.length }
            });
            console.log(`[TEAM] Updated bounty participation with ${teams.length} new teams`);
            
            await BountyQueue.deleteMany({
                bounty: bountyId,
                user: { $in: teams.flatMap(team => team.members) },
            });

            const remainingUsers = await BountyQueue.countDocuments({ bounty: bountyId });
            console.log(`[TEAM] Queue cleaned up. Remaining users in queue:`, remainingUsers);

            // Calculate total participants after team formation
            const { totalParticipants: totalParticipantsAfter } = await calculateTotalParticipants(bountyId);
            
            console.log(`[TEAM] Total participants after team formation: ${totalParticipantsAfter}`);

            // Emit updated count to frontend
            getIO().emit(`bounty:participants:${bountyId}`, {
                bountyId,
                count: totalParticipantsAfter
            });

            // Emit team formation event to all team members
            for (const team of teams) {
                for (const memberId of team.members) {
                    getIO().emit(`team:assignment:${memberId}`, {
                        teamId: team._id,
                        teamName: team.teamName,
                        bountyTitle: bounty.title,
                        members: team.members
                    });
                }
            }

            for (const team of teams) {
                for (const memberId of team.members) {
                    await sendNotification(
                        memberId,
                        `🎉 Team Assignment: You have been added to team "${team.teamName}" for bounty "${bounty.title}". Check your Team tab for details!`
                    );
                }
            }

            return res.status(200).json({ 
                success: true, 
                message: `Team formed and you are enrolled! ${teams.length} team(s) created.`,
                teamsFormed: teams.length,
                remainingUsers: remainingUsers
            });
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

            // Find expired bounties
            const expiredBounties = await Bounty.find({ deadline: { $lt: now } });
            
            for (const bounty of expiredBounties) {
                // Mark bounty as inactive instead of deleting
                await Bounty.findByIdAndUpdate(bounty._id, { isActive: false });
                
                // Clean up queue entries for this bounty
                await BountyQueue.deleteMany({ bounty: bounty._id });
                
                console.log(`[CRON] Marked bounty "${bounty.title}" as inactive at ${now.toISOString()}`);
            }

            console.log(`[CRON] Processed ${expiredBounties.length} expired bounties at ${now.toISOString()}`);
        } catch (err) {
            console.error("[CRON] Error processing expired bounties:", err);
        }
    });
}

// Function to check and restore lost participations
exports.checkAndRestoreParticipations = async () => {
    try {
        console.log("[RESTORE] Checking for lost participations...");
        
        // Find all participations
        const participations = await Participation.find().populate('bounty');
        
        for (const participation of participations) {
            if (!participation.bounty) {
                console.log(`[RESTORE] Found orphaned participation ${participation._id}`);
                // You can either delete it or mark it as inactive
                await Participation.findByIdAndUpdate(participation._id, { isApproved: false });
            }
        }
        
        console.log("[RESTORE] Participation check completed");
    } catch (err) {
        console.error("[RESTORE] Error checking participations:", err);
    }
};

// Function to manually trigger team formation for testing
exports.triggerTeamFormation = async (req, res) => {
    try {
        const { bountyId } = req.params;
        
        console.log(`[TEST] Manually triggering team formation for bounty ${bountyId}`);
        
        const queue = await BountyQueue.find({ bounty: bountyId });
        console.log(`[TEST] Queue length: ${queue.length}`);
        
        if (queue.length >= TEAM_SIZE) {
            console.log(`[TEST] Forming team for bounty ${bountyId} with ${queue.length} users`);
            const shuffled = shuffleArray(queue.map(q => q.user.toString()));
            const teams = [];

            while (shuffled.length >= TEAM_SIZE) {
                const members = shuffled.splice(0, TEAM_SIZE);
                const teamName = TEAM_NAMES[Math.floor(Math.random() * TEAM_NAMES.length)];

                console.log(`[TEST] Creating team "${teamName}" with members:`, members);
                const newTeam = await Participation.create({
                    bounty: bountyId,
                    teamName,
                    members,
                });

                console.log(`[TEST] Team created successfully:`, newTeam._id);
                teams.push(newTeam);
            }

            await BountyQueue.deleteMany({
                bounty: bountyId,
                user: { $in: teams.flatMap(team => team.members) },
            });

            const remainingUsers = await BountyQueue.countDocuments({ bounty: bountyId });
            console.log(`[TEST] Remaining users after team formation:`, remainingUsers);

            return res.status(200).json({ 
                success: true, 
                message: `Team formation triggered. Created ${teams.length} teams.`,
                teams: teams.length,
                remainingUsers: remainingUsers
            });
        } else {
            return res.status(400).json({ 
                success: false, 
                message: `Not enough users in queue. Need ${TEAM_SIZE - queue.length} more users.`,
                queueLength: queue.length
            });
        }
    } catch (err) {
        console.error("[TEST] Error triggering team formation:", err);
        return res.status(500).json({ success: false, message: "Server Error", error: err.message });
    }
};

// Function to check queue status
exports.checkQueueStatus = async (req, res) => {
    try {
        const { bountyId } = req.params;
        
        const queue = await BountyQueue.find({ bounty: bountyId }).populate('user', 'name email');
        const participations = await Participation.find({ bounty: bountyId }).populate('members', 'name email');
        
        return res.status(200).json({
            success: true,
            queueLength: queue.length,
            queue: queue,
            teams: participations,
            teamCount: participations.length
        });
    } catch (err) {
        console.error("[STATUS] Error checking queue status:", err);
        return res.status(500).json({ success: false, message: "Server Error", error: err.message });
    }
};



