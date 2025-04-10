const mongoose = require('mongoose');

const bountySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    tags: {
        type: [String],
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    deadline: {
        type: Date,
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Alumni creating the bounty
        required: true,
    },
    eligibleColleges: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College',
    }],
    participation: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participation', // References to teams participating in this bounty
    }],
    bountyType: {
        type: String,
        enum: ['Team'], // Now, only team participation is allowed
        default: 'Team',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    difficulty: {
        type: String,
        enum: ['S', 'A', 'B', 'C', 'D'], // Difficulty levels
        default: 'D',
    },
});

const Bounty = mongoose.model('Bounty', bountySchema);
module.exports = Bounty;
