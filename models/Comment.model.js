const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    feed: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feed',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    comment: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Comment', CommentSchema);