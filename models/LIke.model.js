const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  feed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Feed',
    required: true
  },
  likedAt: {
    type: Date,
    default: Date.now
  }
});

LikeSchema.index({ user: 1, feed: 1 }, { unique: true }); // Prevent duplicate likes

module.exports = mongoose.model('Like', LikeSchema);