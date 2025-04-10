const mongoose = require('mongoose');

const AlumniSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    graduationYear: {
        type: Number,
        required: true,
    },
    jobTitle: {
        type: String,
    },
    company: {
        type: String,
    },
    skills: [String], // Array of skills
    bio: {
        type: String,
    },
});

exports.module = mongoose.model('Alumni', AlumniSchema);
