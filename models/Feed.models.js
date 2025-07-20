const mongoose = require('mongoose');

const FeedSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    media: [
        {
            url: String,
            type: {
                type: String,
                enum: ['image', 'video', 'other'],
                required: true
            },
            preview: String // Optional: low-res version for fast loading
        }
    ],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    college: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College'
    },
    type: {
        type: String,
        enum: ['event', 'fest', 'announcement', 'achievement', 'opportunity', 'fun'],
        default: 'announcement'
    },
    reactions: {
        like: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        dislike: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        love: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        fire: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    comments:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }]
});

const Feed = mongoose.model('Feed', FeedSchema);
module.exports = Feed;