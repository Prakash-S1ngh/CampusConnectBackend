const mongoose = require('mongoose');

const participationSchema = new mongoose.Schema({
    bounty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bounty',
        required: true,
    },
    teamName: {
        type: String,
        required: true,
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Students participating in the team
        required: true,
    }],
    submittedAt: {
        type: Date,
    },
    isApproved: {
        type: Boolean,
        default: false, // Indicates if the team is approved for participation
    },
});

const Participation = mongoose.model('Participation', participationSchema);
module.exports = Participation;
