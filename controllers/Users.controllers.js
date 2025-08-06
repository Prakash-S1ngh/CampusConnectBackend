const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User.models');
const College = require('../models/College.models');
const uploadOnCloudinary = require('../config/Cloudinary.config');
const Connection = require('../models/Connection.models');
const UserInfo = require('../models/UserInfo.models');
const Message = require('../models/Messages.models');
require('dotenv').config();
const mongoose = require('mongoose');
const Participation = require('../models/Participation.models');
const TeamMessage = require('../models/TeamMessage.model');

exports.signup = async (req, res) => {
    try {
        const { name, email, password, imageUrl, role, college, location, departments, website, alumniDetails, bio, skills, social, address } = req.body;
        const image = req.file;
        // Validate required fields
        if (!name || !email || !password || !college || !bio || !skills) {
            return res.status(400).json({ message: 'Please provide all required fields: name, email, password, college, bio, and skills' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        console.log("Existing User:", existingUser);

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Check if the college exists, otherwise create a new one
        let collegeRecord = await College.findOne({ name: college });

        if (!collegeRecord) {
            collegeRecord = new College({
                name: college,
                location,
                departments,
                website
            });
            await collegeRecord.save();
        }

        // Upload image to Cloudinary if file exists
        let profileImage = imageUrl;
        if (!profileImage && image) {
            const uploadedImage = await uploadOnCloudinary(image.path, 'campus');
            profileImage = uploadedImage.secure_url;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new User
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            profileImage,
            role,
            college: collegeRecord._id, // Ensure correct reference
            alumniDetails
        });

        // Save user to DB
        const savedUser = await newUser.save();

        // Create UserInfo associated with User
        const newUserInfo = new UserInfo({
            user: savedUser._id,
            bio,
            skills,
            social,
            address
        });

        await newUserInfo.save();

        // Update User with UserInfo reference
        savedUser.userInfo = newUserInfo._id;
        await savedUser.save();

        res.status(201).json({ message: 'User created successfully', user: savedUser });

    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


// Update Login Controller to include additional fields
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate input fields
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide both email and password' });
        }

        // Check if user exists
        const user = await User.findOne({ email }).populate('college alumniDetails userInfo');
        console.log("User found:", user);
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '12h' });

        // Set token in HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,  // Prevents client-side access
            secure: process.env.NODE_ENV === 'production',  // Use secure cookies in production
            sameSite: 'Strict', //for cookie cross-origin
            maxAge: 24 * 3600000,  // 1 hour
        });

        res.status(200).json({ success: true, message: 'Login successful', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.logout = async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            sameSite: "Strict",
        });

        return res.status(200).json({ message: "Logged out successfully" });

    } catch (error) {
        res.status(500).json({ message: "Error occurred during logging out" });
    }
};

exports.getUser = async (req, res) => {
    try {
        const userId = req.userId;
        // console.log("User is ",req);

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // Find user and populate associated data
        const user = await User.findById(userId)
            .populate("college", "name location website") // Populate college details
            .populate("userInfo", "bio skills social address") // Populate additional user info
            .select("name email profileImage role alumniDetails"); // Select necessary fields

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error("Get User Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Fetch and order connections based on messaging activity
exports.getOrderedConnections = async (req, res) => {
    try {
        const userId = req.userId;

        const loggedInUser = await User.findById(userId).select("role college");
        if (!loggedInUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const userRole = loggedInUser.role;
        const userCollege = loggedInUser.college;

        // Fetch messages received by the user
        const sentMessages = await Message.aggregate([
            { $match: { receiver: new mongoose.Types.ObjectId(userId) } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$sender",
                    lastMessage: { $first: "$message" },
                    timestamp: { $first: "$createdAt" }
                }
            }
        ]);

        // Fetch messages sent by the user
        const receivedMessages = await Message.aggregate([
            { $match: { sender: new mongoose.Types.ObjectId(userId) } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$receiver",
                    lastMessage: { $first: "$message" },
                    timestamp: { $first: "$createdAt" }
                }
            }
        ]);

        // Merge & deduplicate by user ID, keeping the most recent message
        const messageMap = new Map();

        [...sentMessages, ...receivedMessages].forEach((msg) => {
            const id = msg._id.toString();
            if (!messageMap.has(id) || (msg.timestamp > messageMap.get(id).timestamp)) {
                messageMap.set(id, msg);
            }
        });

        const allMessageUsers = Array.from(messageMap.values());
        const allUserIds = allMessageUsers.map(msg => msg._id);

        // Get user details of those messaged
        const messagedUsers = await User.find({ _id: { $in: allUserIds }, role: userRole, college: userCollege })
            .select("name profileImage role");

        // Remaining users of same role and same college (excluding messaged + self)
        const remainingUsers = await User.find({
            _id: { $nin: [...allUserIds, userId] },
            role: userRole,
            college: userCollege
        }).select("name profileImage role");

        // Final list
        const finalUsers = [
            ...messagedUsers.map(user => {
                const msg = messageMap.get(user._id.toString());
                return {
                    userId: user._id,
                    name: user.name,
                    profileImage: user.profileImage,
                    role: user.role,
                    lastMessage: msg?.lastMessage || "None",
                    timestamp: msg?.timestamp || null,
                    priority: "messaged"
                };
            }),
            ...remainingUsers.map(user => ({
                userId: user._id,
                name: user.name,
                profileImage: user.profileImage,
                role: user.role,
                lastMessage: "None",
                timestamp: null,
                priority: "same-role-same-college"
            }))
        ];

        res.status(200).json({ success: true, users: finalUsers });

    } catch (error) {
        console.error("Error fetching connections:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Fetch messages for a specific room
exports.getMessages = async (req, res) => {
    try {
        const { roomId } = req.query;

        // Fetch messages for the given roomId, sorted in descending order (recent first)
        const messages = await Message.find({ roomId })
            .populate('sender receiver') // Populates sender & receiver details
            .sort({ createdAt: -1 }); // Sorts messages by `createdAt` in descending order        
        res.status(200).json({ success: true, messages });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching messages",
            error: error.message
        });
    }
};

// Add all skills to the UserInfo
exports.addSkill = async (req, res) => {
    try {
        const { skill, userinfoid } = req.body;

        if (!skill || !userinfoid) {
            return res.status(400).json({ message: "Skill and userinfo ID are required" });
        }

        const updatedUserInfo = await UserInfo.findByIdAndUpdate(
            userinfoid,
            { $addToSet: { skills: skill } }, // $addToSet avoids duplicates
            { new: true }
        );

        if (!updatedUserInfo) {
            return res.status(404).json({ message: "UserInfo not found" });
        }

        res.status(200).json({
            message: "Skill added successfully",
            data: updatedUserInfo
        });
    } catch (error) {
        console.error("Error adding skill:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Remove a skill from the UserInfo
exports.removeSkill = async (req, res) => {
    try {
        const { skill, userinfoid } = req.body;

        if (!skill || !userinfoid) {
            return res.status(400).json({ message: "Skill and userinfo ID are required" });
        }

        // Find the user info document
        const userInfo = await UserInfo.findById(userinfoid);
        if (!userInfo) {
            return res.status(404).json({ message: "UserInfo not found" });
        }

        // Filter out the skill, including from comma-separated strings
        let updatedSkills = [];
        for (let item of userInfo.skills) {
            // Split if it contains commas, then filter
            const parts = item.split(',').map(p => p.trim()).filter(Boolean);
            const filtered = parts.filter(s => s.toLowerCase() !== skill.toLowerCase());

            if (filtered.length === 0) continue;

            // If more than one remains, join back. Else keep it as single.
            updatedSkills.push(filtered.join(', '));
        }

        userInfo.skills = updatedSkills;
        await userInfo.save();

        res.status(200).json({
            message: "Skill removed successfully",
            data: userInfo
        });
    } catch (error) {
        console.error("Error removing skill:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.addProject = async (req, res) => {
    try {
        const { project, userinfoid } = req.body;

        if (!project) {
            return res.status(400).json({ message: "Project is required" });
        }

        const updatedUserInfo = await UserInfo.findByIdAndUpdate(
            userinfoid,
            { $push: { 'social.projects': project } },
            { new: true }
        );

        if (!updatedUserInfo) {
            return res.status(404).json({ message: "UserInfo not found" });
        }

        res.status(200).json({
            message: "Project added successfully",
            data: updatedUserInfo
        });

    } catch (error) {
        console.error("Error adding project:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.removeProject = async (req, res) => {
    try {
        const { userinfoid, project } = req.body;

        const updatedUserInfo = await UserInfo.findByIdAndUpdate(
            userinfoid,
            { $pull: { 'social.projects': project } },
            { new: true }
        );

        if (!updatedUserInfo) {
            return res.status(404).json({ message: "UserInfo not found" });
        }

        res.status(200).json({
            message: "Project removed successfully",
            data: updatedUserInfo
        });

    } catch (error) {
        console.error("Error removing project:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update user information
exports.updateUser = async (req, res) => {
    try {
        const { name, email, role, profileImage, userInfo } = req.body;
        const { userinfoid, bio, address, social } = userInfo;

        if (!userinfoid) {
            return res.status(400).json({ message: "UserInfo ID is required" });
        }

        // Update basic user fields
        const updatedUser = await User.findOneAndUpdate(
            { userInfo: userinfoid },
            { name, email, role, profileImage },
            { new: true }
        );

        // Update UserInfo document
        const updatedUserInfo = await UserInfo.findByIdAndUpdate(
            userinfoid,
            { bio, address, social },
            { new: true }
        );

        if (!updatedUser || !updatedUserInfo) {
            return res.status(404).json({ message: "User or UserInfo not found" });
        }

        return res.status(200).json({
            message: "User updated successfully",
            updatedUser: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                profileImage: updatedUser.profileImage,
                userInfo: {
                    _id: updatedUserInfo._id,
                    bio: updatedUserInfo.bio,
                    address: updatedUserInfo.address,
                    social: updatedUserInfo.social
                }
            }
        });
    } catch (error) {
        console.error("Error updating user:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

exports.getAlumniConnections = async (req, res) => {
    try {
        const userId = req.userId;
        const loggedInUser = await User.findById(userId).select("college");
        if (!loggedInUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const userCollege = loggedInUser.college;

        // Fetch messages received by the user
        const receivedMsgs = await Message.aggregate([
            { $match: { receiver: new mongoose.Types.ObjectId(userId) } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$sender",
                    lastMessage: { $first: "$message" },
                    timestamp: { $first: "$createdAt" }
                }
            }
        ]);

        // Fetch messages sent by the user
        const sentMsgs = await Message.aggregate([
            { $match: { sender: new mongoose.Types.ObjectId(userId) } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$receiver",
                    lastMessage: { $first: "$message" },
                    timestamp: { $first: "$createdAt" }
                }
            }
        ]);

        // Merge and keep most recent message per user
        const messageMap = new Map();

        [...receivedMsgs, ...sentMsgs].forEach((msg) => {
            const id = msg._id.toString();
            if (!messageMap.has(id) || msg.timestamp > messageMap.get(id).timestamp) {
                messageMap.set(id, msg);
            }
        });

        const messagedUserIds = Array.from(messageMap.keys());

        // Get Alumni details who have exchanged messages
        const messagedAlumni = await User.find({
            _id: { $in: messagedUserIds },
            role: "Alumni",
            college: userCollege
        }).select("name profileImage role");

        // Remaining alumni from same college (no messages exchanged)
        const remainingAlumni = await User.find({
            _id: { $nin: [...messagedUserIds, userId] },
            role: "Alumni",
            college: userCollege
        }).select("name profileImage role");

        // Format final output
        const finalUsers = [
            ...messagedAlumni.map(user => {
                const msg = messageMap.get(user._id.toString());
                return {
                    userId: user._id,
                    name: user.name,
                    profileImage: user.profileImage,
                    role: user.role,
                    lastMessage: msg?.lastMessage || "None",
                    timestamp: msg?.timestamp || null,
                    priority: "messaged"
                };
            }),
            ...remainingAlumni.map(user => ({
                userId: user._id,
                name: user.name,
                profileImage: user.profileImage,
                role: user.role,
                lastMessage: "None",
                timestamp: null,
                priority: "same-college-alumni"
            }))
        ];
        res.status(200).json({ success: true, users: finalUsers });

    } catch (error) {
        console.error("Error fetching alumni connections:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.getJuniors = async (req, res) => {
    try {
        const userId = req.userId;
        const loggedInUser = await User.findById(userId).select("college");

        if (!loggedInUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const userCollege = loggedInUser.college;

        // Fetch messages received by the user
        const receivedMsgs = await Message.aggregate([
            { $match: { receiver: new mongoose.Types.ObjectId(userId) } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$sender",
                    lastMessage: { $first: "$message" },
                    timestamp: { $first: "$createdAt" }
                }
            }
        ]);

        // Fetch messages sent by the user
        const sentMsgs = await Message.aggregate([
            { $match: { sender: new mongoose.Types.ObjectId(userId) } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$receiver",
                    lastMessage: { $first: "$message" },
                    timestamp: { $first: "$createdAt" }
                }
            }
        ]);

        const messageMap = new Map();

        [...receivedMsgs, ...sentMsgs].forEach((msg) => {
            const id = msg._id.toString();
            if (!messageMap.has(id) || msg.timestamp > messageMap.get(id).timestamp) {
                messageMap.set(id, msg);
            }
        });

        const messagedUserIds = Array.from(messageMap.keys());

        // Get messaged students from same college
        const messagedJuniors = await User.find({
            _id: { $in: messagedUserIds },
            role: "Student",
            college: userCollege
        }).select("name profileImage role");

        // Get students from same college not messaged
        const remainingJuniors = await User.find({
            _id: { $nin: [...messagedUserIds, userId] },
            role: "Student",
            college: userCollege
        }).select("name profileImage role");

        // Combine all into a single response
        const finalUsers = [
            ...messagedJuniors.map(user => {
                const msg = messageMap.get(user._id.toString());
                return {
                    userId: user._id,
                    name: user.name,
                    profileImage: user.profileImage,
                    role: user.role,
                    lastMessage: msg?.lastMessage || "None",
                    timestamp: msg?.timestamp || null,
                    priority: "messaged"
                };
            }),
            ...remainingJuniors.map(user => ({
                userId: user._id,
                name: user.name,
                profileImage: user.profileImage,
                role: user.role,
                lastMessage: "None",
                timestamp: null,
                priority: "same-college-junior"
            }))
        ];

        res.status(200).json({ success: true, users: finalUsers });

    } catch (error) {
        console.error("Error fetching juniors:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


exports.getTeamDetails = async (req, res) => {
    try {
      const userId = req.userId;
      console.log("userId is ", userId);
  
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
  
      const participations = await Participation.find({
        members: userId,
      })
        .populate({
          path: "bounty",
          select: "title description deadline updatedAt amount isActive",
        })
        .populate({
          path: "members",
          select: "name profileImage",
        });
  
      // Filter out null bounty (inactive ones)
    //   let activeParticipations = participations
    //     .filter(p => p.bounty)
    //     .map(p => ({
    //       bountyId: p.bounty._id,
    //       bountyTitle: p.bounty.title,
    //       description: p.bounty.description,
    //       deadline: p.bounty.deadline,
    //       updatedAt: p.bounty.updatedAt,
    //       members: p.members.filter(m => m._id.toString() !== userId),
    //     }));
  
      // Sort so that recent bounty comes first
      participations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  
      res.status(200).json({
        success: true,
        participation: participations,
      });
  
    } catch (error) {
      console.error("Error fetching team details:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };

// Get user by ID (for public profile viewing)
exports.getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        const user = await User.findById(userId)
            .populate('college', 'name')
            .populate('userInfo')
            .populate('alumniDetails')
            .populate('facultyDetails')
            .populate('directorDetails');

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Return user data for public viewing (no sensitive information)
        const publicUserData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profileImage: user.profileImage,
            college: user.college,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen,
            userInfo: user.userInfo,
            alumniDetails: user.alumniDetails,
            facultyDetails: user.facultyDetails,
            directorDetails: user.directorDetails
        };

        return res.status(200).json({ 
            success: true, 
            user: publicUserData 
        });

    } catch (error) {
        console.error("Error fetching user by ID:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get user's teams
exports.getTeams = async (req, res) => {
    try {
        const userId = req.userId;

        const participation = await Participation.find({
            members: userId
        }).populate('bounty', 'title description amount deadline isActive')
        .populate('members', 'name profileImage role');

        console.log(`[GET_TEAMS] User ${userId} has ${participation.length} teams`);

        return res.status(200).json({
            success: true,
            participation: participation
        });

    } catch (error) {
        console.error("Error fetching user teams:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get team members for a specific team
exports.getTeamMembers = async (req, res) => {
    try {
        const { teamId } = req.params;
        const userId = req.userId;

        console.log(`[GET_TEAM_MEMBERS] Request for team ${teamId} by user ${userId}`);

        if (!teamId) {
            return res.status(400).json({ success: false, message: "Team ID is required" });
        }

        // Find the participation/team
        const participation = await Participation.findById(teamId)
            .populate('members', 'name profileImage role email')
            .populate('bounty', 'title description amount deadline');

        if (!participation) {
            console.log(`[GET_TEAM_MEMBERS] Team ${teamId} not found`);
            return res.status(404).json({ success: false, message: "Team not found" });
        }

        console.log(`[GET_TEAM_MEMBERS] Found team:`, participation.teamName);

        // Check if user is a member of this team
        const isMember = participation.members.some(member => member._id.toString() === userId);
        if (!isMember) {
            console.log(`[GET_TEAM_MEMBERS] User ${userId} is not a member of team ${teamId}`);
            return res.status(403).json({ success: false, message: "Access denied. You are not a member of this team" });
        }

        console.log(`[GET_TEAM_MEMBERS] Returning ${participation.members.length} members`);

        return res.status(200).json({
            success: true,
            members: participation.members,
            teamInfo: {
                teamName: participation.teamName,
                bounty: participation.bounty,
                isApproved: participation.isApproved,
                submittedAt: participation.submittedAt
            }
        });

    } catch (error) {
        console.error("Error fetching team members:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get team messages
exports.getTeamMessages = async (req, res) => {
    try {
        const { teamId } = req.params;
        const userId = req.userId;

        console.log(`[GET_TEAM_MESSAGES] Request for team ${teamId} by user ${userId}`);

        if (!teamId) {
            return res.status(400).json({ success: false, message: "Team ID is required" });
        }

        // Check if user is a member of this team
        const participation = await Participation.findById(teamId);
        if (!participation) {
            console.log(`[GET_TEAM_MESSAGES] Team ${teamId} not found`);
            return res.status(404).json({ success: false, message: "Team not found" });
        }

        const isMember = participation.members.some(member => member.toString() === userId);
        if (!isMember) {
            console.log(`[GET_TEAM_MESSAGES] User ${userId} is not a member of team ${teamId}`);
            return res.status(403).json({ success: false, message: "Access denied. You are not a member of this team" });
        }

        // Fetch messages from TeamMessage model
        const messages = await TeamMessage.find({ 
            teamId: teamId,
            isDeleted: false 
        })
        .populate('sender', 'name profileImage')
        .sort({ createdAt: 1 })
        .limit(100); // Limit to last 100 messages for performance

        console.log(`[GET_TEAM_MESSAGES] Returning ${messages.length} messages`);

        return res.status(200).json({
            success: true,
            messages: messages
        });

    } catch (error) {
        console.error("Error fetching team messages:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Function to check all teams for a user
exports.checkUserTeams = async (req, res) => {
    try {
        const userId = req.userId;
        
        console.log(`[CHECK_USER_TEAMS] Checking teams for user ${userId}`);
        
        const participations = await Participation.find({ members: userId })
            .populate('bounty', 'title description amount deadline isActive')
            .populate('members', 'name profileImage role');
        
        console.log(`[CHECK_USER_TEAMS] Found ${participations.length} teams for user ${userId}`);
        
        return res.status(200).json({
            success: true,
            teams: participations,
            teamCount: participations.length
        });
    } catch (err) {
        console.error("[CHECK_USER_TEAMS] Error checking user teams:", err);
        return res.status(500).json({ success: false, message: "Server Error", error: err.message });
    }
};

// Send team message
exports.sendTeamMessage = async (req, res) => {
    try {
        const { teamId, message } = req.body;
        const userId = req.userId;

        console.log(`[SEND_TEAM_MESSAGE] User ${userId} sending message to team ${teamId}`);

        if (!teamId || !message) {
            return res.status(400).json({ success: false, message: "Team ID and message are required" });
        }

        // Check if user is a member of this team
        const participation = await Participation.findById(teamId);
        if (!participation) {
            console.log(`[SEND_TEAM_MESSAGE] Team ${teamId} not found`);
            return res.status(404).json({ success: false, message: "Team not found" });
        }

        const isMember = participation.members.some(member => member.toString() === userId);
        if (!isMember) {
            console.log(`[SEND_TEAM_MESSAGE] User ${userId} is not a member of team ${teamId}`);
            return res.status(403).json({ success: false, message: "Access denied. You are not a member of this team" });
        }

        // Create and save the message
        const newMessage = await TeamMessage.create({
            teamId: teamId,
            sender: userId,
            message: message.trim(),
            messageType: 'text'
        });

        // Populate sender info for the response
        await newMessage.populate('sender', 'name profileImage');

        console.log(`[SEND_TEAM_MESSAGE] Message saved with ID: ${newMessage._id}`);

        return res.status(200).json({
            success: true,
            message: "Message sent successfully",
            data: newMessage
        });

    } catch (error) {
        console.error("Error sending team message:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};