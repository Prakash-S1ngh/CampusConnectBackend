const mongoose = require('mongoose');

const bountySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // or String if you prefer
    ref: 'User',
    required: true
  },
  nextBountieAvailable: {
    type: Date,
    default: () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
  }
  ,participation: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participation'
  }]
});

module.exports = mongoose.model('BountyData', bountySchema);