const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    profileImage: {
        type: String,  
    },
    role: {
        type: String,
        enum: ['Student', 'Alumni','Faculty', 'Director'], 
        default: 'Student',
    },
    college: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College',
        required: true,
    },
    facultyDetails: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty'
    },
    alumniDetails: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumni',
    },
    directorDetails: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Director',
    },
    userInfo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserInfo',
    },
    isOnline: { 
        type: Boolean, 
        default: false 
    },
    lastSeen: { 
        type: Date 
    },
    socketId: {  // ✅ Added socketId field
        type: String, 
        default: null 
    }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
module.exports = User;