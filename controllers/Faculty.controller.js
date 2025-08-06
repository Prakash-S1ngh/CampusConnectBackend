const { uploadOnCloudinary } = require("../config/Cloudinary.config");
const College = require("../models/College.models");
const Message = require("../models/Messages.models");
const User = require("../models/User.models");
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Faculty = require("../models/Faculty.model");
const Connection = require("../models/Connection.models");

exports.createFaculty = async (req, res) => {
    try {
        const { name, email, password, college } = req.body;
        const image = req.file;

        if (!name || !email || !password || !college) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const facultyExists = await User.findOne({ email });
        if (facultyExists) {
            return res.status(400).json({ message: "Faculty already exists" });
        }

        const imageUrl = await uploadOnCloudinary(image.path);
        if (!imageUrl) {
            return res.status(500).json({ message: "Image upload failed" });
        }

        let collegeDoc = await College.findOne({ name: college });

        // Create college if not found
        if (!collegeDoc) {
            collegeDoc = new College({ name: college });
            await collegeDoc.save();
        }

        const newFaculty = new User({
            name,
            email,
            password: hashedPassword, // ✅ This is correct
            profileImage: imageUrl.url,
            role: 'Faculty',
            college: collegeDoc._id
        });

        await newFaculty.save();

        return res.status(201).json({
            message: "Faculty created successfully",
            faculty: newFaculty
        });

    } catch (error) {
        console.error("Error creating faculty:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};

exports.getFacultyConnections = async (req, res) => {
    try {
        const userId = req.userId;

        const loggedInUser = await User.findById(userId).select("college");
        if (!loggedInUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const userCollege = loggedInUser.college;

        const facultyUsers = await User.find({
            role: "Faculty",
            college: userCollege,
            _id: { $ne: userId }
        }).select("name profileImage role");

        const result = facultyUsers.map(user => ({
            userId: user._id,
            name: user.name,
            profileImage: user.profileImage,
            role: user.role,
        }));

        return res.status(200).json({ success: true, users: result });
    } catch (error) {
        console.error("Error fetching faculty connections:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get all alumni for faculty
exports.getAlumniForFaculty = async (req, res) => {
    try {
        const userId = req.userId;

        const loggedInUser = await User.findById(userId).select("college role");
        if (!loggedInUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (loggedInUser.role !== 'Faculty') {
            return res.status(403).json({ success: false, message: "Only faculty can access this endpoint" });
        }

        const userCollege = loggedInUser.college;

        const alumniUsers = await User.find({
            role: "Alumni",
            college: userCollege
        }).populate('alumniDetails').select("name profileImage role alumniDetails");

        const result = alumniUsers.map(user => ({
            userId: user._id,
            name: user.name,
            profileImage: user.profileImage,
            role: user.role,
            currentCompany: user.alumniDetails?.currentCompany || 'Not specified',
            jobTitle: user.alumniDetails?.jobTitle || 'Not specified',
            graduationYear: user.alumniDetails?.graduationYear || 'Not specified'
        }));

        return res.status(200).json({ success: true, alumni: result });
    } catch (error) {
        console.error("Error fetching alumni for faculty:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get all students for faculty
exports.getStudentsForFaculty = async (req, res) => {
    try {
        const userId = req.userId;

        const loggedInUser = await User.findById(userId).select("college role");
        if (!loggedInUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (loggedInUser.role !== 'Faculty') {
            return res.status(403).json({ success: false, message: "Only faculty can access this endpoint" });
        }

        const userCollege = loggedInUser.college;
        const { department, year, search } = req.query;

        let query = {
            role: "Student",
            college: userCollege
        };

        // Add department filter if provided
        if (department) {
            query.department = department;
        }

        // Add year filter if provided
        if (year) {
            query.year = year;
        }

        // Add search filter if provided
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const studentUsers = await User.find(query)
            .select("name profileImage role department year email")
            .sort({ createdAt: -1 });

        const result = studentUsers.map(user => ({
            userId: user._id,
            name: user.name,
            profileImage: user.profileImage,
            role: user.role,
            department: user.department,
            year: user.year,
            email: user.email
        }));

        return res.status(200).json({ success: true, students: result });
    } catch (error) {
        console.error("Error fetching students for faculty:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get faculty analytics
exports.getFacultyAnalytics = async (req, res) => {
    try {
        const userId = req.userId;

        const loggedInUser = await User.findById(userId).select("college role");
        if (!loggedInUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (loggedInUser.role !== 'Faculty') {
            return res.status(403).json({ success: false, message: "Only faculty can access this endpoint" });
        }

        const userCollege = loggedInUser.college;

        // Get analytics data
        const totalStudents = await User.countDocuments({ 
            college: userCollege, 
            role: 'Student' 
        });
        
        const totalAlumni = await User.countDocuments({ 
            college: userCollege, 
            role: 'Alumni' 
        });
        
        const totalFaculty = await User.countDocuments({ 
            college: userCollege, 
            role: 'Faculty' 
        });

        const onlineUsers = await User.countDocuments({ 
            college: userCollege, 
            isOnline: true 
        });

        return res.status(200).json({
            success: true,
            analytics: {
                totalStudents,
                totalAlumni,
                totalFaculty,
                onlineUsers,
                totalUsers: totalStudents + totalAlumni + totalFaculty
            }
        });

    } catch (error) {
        console.error("Error fetching faculty analytics:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.getFacultyById = async (req, res) => {
    try {
        const id = req.userId;

        // Find the user by ID
        const faculty = await User.findById(id);
        console.log("Found faculty:", faculty);
        if (!faculty) {
            return res.status(404).json({ message: 'Faculty not found' });
        }

        // Ensure user has facultyDetails
        if (!faculty.facultyDetails) {
            return res.status(200).json({
                success: true,
                message: 'No faculty details found for this faculty yet',
                faculty: faculty
            });
        }

        // Fetch faculty details from Faculty model
        const facultyInfo = await Faculty.findById(faculty.facultyDetails);
    
        if (!facultyInfo) {
            return res.status(404).json({ message: 'Faculty information not found' });
        }

        return res.status(200).json({
            success: true,
            faculty: {
                ...facultyInfo.toObject(),
                name: faculty.name,
                email: faculty.email,
                profileImage: faculty.profileImage
            }
            
            
        });
    } catch (error) {
        console.error('Error fetching faculty data:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.updateFacultyById = async (req, res) => {
    try {
        const id = req.userId;

        const allowedUpdates = [
            'title', 'department', 'expertise', 'officeLocation',
            'contactEmail', 'researchInterests', 'publications',
            'teachingSubjects', 'officeHours', 'achievements', 'guidance'
        ];

        const updateData = Object.fromEntries(
            Object.entries(req.body).filter(([key]) => allowedUpdates.includes(key))
        );

        console.log("Updating faculty data for ID:", id, "with data:", updateData);

        const isValidOperation = Object.keys(updateData).every(key =>
            allowedUpdates.includes(key)
        );

        if (!isValidOperation) {
            return res.status(400).json({ message: 'Invalid updates!' });
        }

        const faculty = await User.findById(id);

        let facultyDetails = await Faculty.findByIdAndUpdate(
            faculty.facultyDetails,
            updateData,
            { new: true, runValidators: true }
        );

        if (!facultyDetails) {
            facultyDetails = new Faculty(updateData);
            await facultyDetails.save();

            faculty.facultyDetails = facultyDetails._id;
            await faculty.save();  // Save updated reference in User
        }

        return res.status(200).json({
            success: true,
            message: 'Faculty information updated successfully',
            faculty: facultyDetails
        });
    } catch (error) {
        console.error('Error updating faculty data:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Faculty messaging functions
exports.getFacultyMessages = async (req, res) => {
    try {
        const userId = req.userId;
        const { recipientId } = req.params;

        if (!recipientId) {
            return res.status(400).json({ success: false, message: "Recipient ID is required" });
        }

        // Check if both users exist
        const [sender, recipient] = await Promise.all([
            User.findById(userId),
            User.findById(recipientId)
        ]);

        if (!sender || !recipient) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Create roomId for consistent querying
        const roomId = [userId, recipientId].sort().join("_");
        
        // Get messages between these two users using roomId
        const messages = await Message.find({
            roomId: roomId
        })
        .populate('sender', 'name profileImage')
        .populate('receiver', 'name profileImage')
        .sort({ createdAt: 1 })
        .limit(100);

        return res.status(200).json({
            success: true,
            messages: messages
        });

    } catch (error) {
        console.error("Error fetching faculty messages:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.sendFacultyMessage = async (req, res) => {
    try {
        const { recipientId, message } = req.body;
        const senderId = req.userId;

        if (!recipientId || !message) {
            return res.status(400).json({ success: false, message: "Recipient ID and message are required" });
        }

        // Check if both users exist
        const [sender, recipient] = await Promise.all([
            User.findById(senderId),
            User.findById(recipientId)
        ]);

        if (!sender || !recipient) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Create roomId for consistent messaging
        const roomId = [senderId, recipientId].sort().join("_");
        
        // Create and save the message
        const newMessage = await Message.create({
            roomId: roomId,
            sender: senderId,
            receiver: recipientId,
            message: message.trim(),
            messageType: 'text'
        });

        // Populate sender info for the response
        await newMessage.populate('sender', 'name profileImage');

        console.log(`[FACULTY_MESSAGE] Message sent from ${senderId} to ${recipientId}`);

        return res.status(200).json({
            success: true,
            message: "Message sent successfully",
            data: newMessage
        });

    } catch (error) {
        console.error("Error sending faculty message:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.getFacultyConnectionsForChat = async (req, res) => {
    try {
        const userId = req.userId;

        const loggedInUser = await User.findById(userId).select("college role");
        if (!loggedInUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (loggedInUser.role !== 'Faculty') {
            return res.status(403).json({ success: false, message: "Only faculty can access this endpoint" });
        }

        const userCollege = loggedInUser.college;

        // Get all users from the same college (students, alumni, faculty)
        const allUsers = await User.find({
            college: userCollege,
            _id: { $ne: userId }
        }).select("name profileImage role department year email");

        // Get recent messages for each user
        const usersWithMessages = await Promise.all(
            allUsers.map(async (user) => {
                const roomId = [userId, user._id].sort().join("_");
                
                // Get the most recent message between current user and this user
                const lastMessage = await Message.findOne({
                    roomId: roomId
                })
                .sort({ createdAt: -1 })
                .select('message createdAt sender');

                return {
                    ...user.toObject(),
                    lastMessage: lastMessage ? lastMessage.message : null,
                    lastMessageTime: lastMessage ? lastMessage.createdAt : null,
                    lastMessageSender: lastMessage ? lastMessage.sender : null
                };
            })
        );

        // Group users by role
        const result = {
            students: usersWithMessages.filter(user => user.role === 'Student'),
            alumni: usersWithMessages.filter(user => user.role === 'Alumni'),
            faculty: usersWithMessages.filter(user => user.role === 'Faculty'),
            all: usersWithMessages
        };

        return res.status(200).json({ 
            success: true, 
            connections: result 
        });

    } catch (error) {
        console.error("Error fetching faculty connections for chat:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

