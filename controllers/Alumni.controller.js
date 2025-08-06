const mongoose = require("mongoose");
const Alumni = require("../models/Alumni.models");
const User = require("../models/User.models");
const College = require("../models/College.models");
const Message = require("../models/Messages.models");
const bcrypt = require("bcrypt");
const uploadOnCloudinary = require("../config/Cloudinary.config");

exports.signup = async (req, res) => {
    try {
        const { name, email, password, imageUrl, role, college } = req.body;
        const image = req.file;
        // Validate required fields
        if (!name || !email || !password || !college ) {
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
            college: collegeRecord._id,
        });
        await newUser.save();
        console.log("New User:", newUser);

        res.status(201).json({ message: 'Alumni created successfully', user: newUser });

    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAlumni = async (req, res) => {
    try {
      const userId = req.userId;
  
      const user = await User.findById(userId)
        .populate('college', 'name') // only get college name
        .populate('alumniDetails', 'graduationYear jobTitle company skills bio projects');
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const response = {
        user: {
          name: user.name,
          email: user.email,
          profileImage: user.profileImage || null,
          isOnline: user.isOnline || false,
          lastSeen: user.lastSeen || new Date().toISOString(),
          college: user.college?.name || null
        },
        graduationYear: user.alumniDetails?.graduationYear || null,
        jobTitle: user.alumniDetails?.jobTitle || null,
        company: user.alumniDetails?.company || null,
        skills: user.alumniDetails?.skills || [],
        bio: user.alumniDetails?.bio || '',
        projects: user.alumniDetails?.projects || []
      };
  
      return res.status(200).json({
        success: true,
        message: 'Alumni fetched successfully',
        data: response
      });
    } catch (error) {
      console.error('Error fetching alumni:', error);
      res.status(500).json({ message: 'Server error' });
    }
};

// Get alumni connections (other alumni and faculty from same college)
exports.getAlumniConnections = async (req, res) => {
    try {
        const userId = req.userId;

        const loggedInUser = await User.findById(userId).select("college role");
        if (!loggedInUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (loggedInUser.role !== 'Alumni') {
            return res.status(403).json({ success: false, message: "Only alumni can access this endpoint" });
        }

        const userCollege = loggedInUser.college;

        // Get all alumni and faculty from the same college
        const connections = await User.find({
            college: userCollege,
            _id: { $ne: userId },
            role: { $in: ['Alumni', 'Faculty'] }
        }).populate('alumniDetails facultyDetails').select("name profileImage role alumniDetails facultyDetails");

        const result = connections.map(user => ({
            userId: user._id,
            name: user.name,
            profileImage: user.profileImage,
            role: user.role,
            currentCompany: user.alumniDetails?.currentCompany || user.facultyDetails?.department || 'Not specified',
            jobTitle: user.alumniDetails?.jobTitle || user.facultyDetails?.designation || 'Not specified',
            graduationYear: user.alumniDetails?.graduationYear || 'Faculty'
        }));

        return res.status(200).json({ success: true, users: result });
    } catch (error) {
        console.error("Error fetching alumni connections:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get alumni messages
exports.getAlumniMessages = async (req, res) => {
    try {
        const userId = req.userId;
        const { recipientId } = req.params;

        if (!recipientId) {
            return res.status(400).json({ success: false, message: "Recipient ID is required" });
        }

        const messages = await Message.find({
            $or: [
                { sender: userId, recipient: recipientId },
                { sender: recipientId, recipient: userId }
            ]
        }).populate('sender', 'name profileImage').populate('recipient', 'name profileImage')
        .sort({ createdAt: 1 });

        return res.status(200).json({ success: true, messages });
    } catch (error) {
        console.error("Error fetching alumni messages:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Send message as alumni
exports.sendAlumniMessage = async (req, res) => {
    try {
        const userId = req.userId;
        const { recipientId, message, messageType = 'text' } = req.body;

        if (!recipientId || !message) {
            return res.status(400).json({ success: false, message: "Recipient ID and message are required" });
        }

        const newMessage = new Message({
            sender: userId,
            recipient: recipientId,
            message,
            messageType
        });

        await newMessage.save();

        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'name profileImage')
            .populate('recipient', 'name profileImage');

        return res.status(201).json({ success: true, message: populatedMessage });
    } catch (error) {
        console.error("Error sending alumni message:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get alumni analytics
exports.getAlumniAnalytics = async (req, res) => {
    try {
        const userId = req.userId;

        const loggedInUser = await User.findById(userId).select("college role");
        if (!loggedInUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (loggedInUser.role !== 'Alumni') {
            return res.status(403).json({ success: false, message: "Only alumni can access this endpoint" });
        }

        const userCollege = loggedInUser.college;

        // Get analytics data
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
                totalAlumni,
                totalFaculty,
                onlineUsers,
                totalConnections: totalAlumni + totalFaculty - 1 // Exclude self
            }
        });

    } catch (error) {
        console.error("Error fetching alumni analytics:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get students (juniors) for alumni
exports.getJuniorsForAlumni = async (req, res) => {
    try {
        const userId = req.userId;

        const loggedInUser = await User.findById(userId).select("college role");
        if (!loggedInUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (loggedInUser.role !== 'Alumni') {
            return res.status(403).json({ success: false, message: "Only alumni can access this endpoint" });
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
        console.error("Error fetching juniors for alumni:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get faculty for alumni
exports.getFacultyForAlumni = async (req, res) => {
    try {
        const userId = req.userId;

        const loggedInUser = await User.findById(userId).select("college role");
        if (!loggedInUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (loggedInUser.role !== 'Alumni') {
            return res.status(403).json({ success: false, message: "Only alumni can access this endpoint" });
        }

        const userCollege = loggedInUser.college;
        const { department, search } = req.query;

        let query = {
            role: "Faculty",
            college: userCollege
        };

        // Add department filter if provided
        if (department) {
            query.department = department;
        }

        // Add search filter if provided
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const facultyUsers = await User.find(query)
            .populate('facultyDetails')
            .select("name profileImage role facultyDetails")
            .sort({ createdAt: -1 });

        const result = facultyUsers.map(user => ({
            userId: user._id,
            name: user.name,
            profileImage: user.profileImage,
            role: user.role,
            department: user.facultyDetails?.department || 'Not specified',
            designation: user.facultyDetails?.designation || 'Not specified',
            email: user.email
        }));

        return res.status(200).json({ success: true, faculty: result });
    } catch (error) {
        console.error("Error fetching faculty for alumni:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get user by ID for alumni (for public profile viewing)
exports.getUserByIdForAlumni = async (req, res) => {
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
        console.error("Error fetching user by ID for alumni:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.updateAlumni = async (req, res) => {
    try {
      const userId = req.userId;
      const {
        user,
        graduationYear,
        jobTitle,
        company,
        skills,
        bio,
        projects
      } = req.body;
      const user1 = await User.findById(userId).populate('alumniDetails');
      if (!user1) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // ✅ Update basic user fields
      if (user?.name) user1.name = user.name;
      if (user?.email) user1.email = user.email;
      if (user?.isOnline !== undefined) user1.isOnline = user.isOnline;
      if (user?.lastSeen) user1.lastSeen = user.lastSeen;
  
      // ✅ Update college
      if (user?.college) {
        const collegeDoc = await College.findOne({ name: user.college });
        if (!collegeDoc) {
          return res.status(404).json({ message: 'College not found' });
        }
        user1.college = collegeDoc._id;
      }
  
      // ✅ Handle Alumni creation or update
      let alumni = await Alumni.findOne({ user: userId });
      if (!alumni) {
        alumni = new Alumni({ user: userId });
        user1.alumniDetails = alumni._id;
      }
  
      if (graduationYear !== undefined) alumni.graduationYear = graduationYear;
      if (jobTitle) alumni.jobTitle = jobTitle;
      if (company) alumni.company = company;
      if (skills) alumni.skills = skills;
      if (bio) alumni.bio = bio;
      if (Array.isArray(projects)) alumni.projects = projects;
  
      await alumni.save();
      await user1.save();
  
      return res.status(200).json({
        success: true,
        message: 'Alumni updated successfully',
        user: user1
      });
    } catch (error) {
      console.error("Error updating alumni:", error);
      return res.status(500).json({ message: 'Server error' });
    }
  };

