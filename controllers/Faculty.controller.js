const { uploadOnCloudinary } = require("../config/Cloudinary.config");
const College = require("../models/College.models");
const Message = require("../models/Messages.models");
const User = require("../models/User.models");
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Faculty = require("../models/Faculty.model");

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

