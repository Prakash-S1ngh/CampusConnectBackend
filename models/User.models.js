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
        enum: ['Student', 'Alumni'], 
        default: 'Student',
    },
    college: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College',
        required: true,
    },
    alumniDetails: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumni',
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