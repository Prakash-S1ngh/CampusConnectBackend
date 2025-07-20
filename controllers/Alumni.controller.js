const mongoose = require("mongoose");
const Alumni = require("../models/Alumni.models");
const User = require("../models/User.models");
const College = require("../models/College.models");
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
      console.error("Error fetching alumni:", error);
      res.status(500).json({ message: "Server error" });
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

