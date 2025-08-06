const mongoose = require('mongoose');

const teamMessageSchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participation',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    messageType: {
        type: String,
        enum: ['text', 'file', 'image'],
        default: 'text'
    },
    fileUrl: {
        type: String,
        default: null
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date,
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for efficient querying
teamMessageSchema.index({ teamId: 1, createdAt: -1 });
teamMessageSchema.index({ sender: 1 });

const TeamMessage = mongoose.model('TeamMessage', teamMessageSchema);
module.exports = TeamMessage; 