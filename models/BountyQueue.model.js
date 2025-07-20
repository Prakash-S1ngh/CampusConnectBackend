const mongoose = require('mongoose');

const bountyQueueSchema = new mongoose.Schema({
  bounty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bounty',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

const BountyQueue = mongoose.model('BountyQueue', bountyQueueSchema);
module.exports = BountyQueue;