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
        console.log("User is ",req.body);
        const { email, password } = req.body;
        console.log("Email is ",email);
        console.log("Password is ",password);
        // Validate input fields
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide both email and password' });
        }

        // Check if user exists
        const user = await User.findOne({ email }).populate('college alumniDetails userInfo');
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({  message: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '12h' });

        // Set token in HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,  // Prevents client-side access
            secure: process.env.NODE_ENV === 'production',  // Use secure cookies in production
            sameSite: 'Strict',  // Helps prevent CSRF attacks
            maxAge: 3600000,  // 1 hour
        });

        res.status(200).json({success:true ,message: 'Login successful', user });
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

        const loggedInUser = await User.findById(userId).select("role");
        if (!loggedInUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const userRole = loggedInUser.role;

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
        const messagedUsers = await User.find({ _id: { $in: allUserIds } })
            .select("name profileImage role");

        // Remaining users of same role (excluding messaged + self)
        const remainingUsers = await User.find({
            _id: { $nin: [...allUserIds, userId] },
            role: userRole
        }).select("name profileImage role");

        // Fetch connections for ordering
        const allConnections = await Connection.find({
            $or: [
                { senderUser: userId },
                { receiverUser: userId },
            ],
        }).populate("senderUser receiverUser")
          .sort({ createdAt: -1 });

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
                priority: "same-role"
            }))
        ];

        res.status(200).json({ success: true, users: finalUsers, connections: allConnections });

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



exports.requests = async(req , res)=>{
    try {
        const { userId } = req.userId;
        if(!userId){
            return res.status(400).json({message: 'User not found'});
        }
        
        const requests = await Connection.find({
            receiverUser: userId,
            status: 'pending',
        })
            .populate('senderUser senderAlumni')
            .sort({ createdAt: -1 });
    } catch (error) {
        return res.status(500).json({
            message:"An error occured while fetching the requests",
            error:error.message
        })
    }
}


// Accept Connection Request
exports.acceptRequest = async (req, res) => {
    try {
        const { connectionId } = req.params; // Assuming connectionId is passed as a URL parameter

        // Find the connection request
        const connection = await Connection.findById(connectionId);
        if (!connection) {
            return res.status(404).json({ message: "Connection request not found" });
        }

        // Check if the request is already accepted
        if (connection.status === "Accepted") {
            return res.status(400).json({ message: "Request already accepted" });
        }

        // Update the status to "Accepted"
        connection.status = "Accepted";
        await connection.save();

        res.status(200).json({
            message: "Connection request accepted successfully",
            connection,
        });
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error while accepting request",
            error: error.message,
        });
    }
};

// Reject Connection Request
exports.rejectRequest = async (req, res) => {
    try {
        const { connectionId } = req.params; // Assuming connectionId is passed as a URL parameter

        // Find the connection request
        const connection = await Connection.findById(connectionId);
        if (!connection) {
            return res.status(404).json({ message: "Connection request not found" });
        }

        // Check if the request is already rejected or accepted
        if (connection.status === "Rejected") {
            return res.status(400).json({ message: "Request already rejected" });
        }

        // Update the status to "Rejected"
        connection.status = "Rejected";
        await connection.save();

        res.status(200).json({
            message: "Connection request rejected successfully",
            connection,
        });
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error while rejecting request",
            error: error.message,
        });
    }
};

