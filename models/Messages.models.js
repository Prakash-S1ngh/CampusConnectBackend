const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    roomId: { 
        type: String, 
        required: true 
    }, // Consistent room ID based on sender & receiver
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const Message = mongoose.model('Message', MessageSchema);
module.exports = Message;