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
    projects: [
        {
          title: { type: String },
          description: { type: String },
          link: { type: String }
        }
      ]
});

module.exports = mongoose.model('Alumni', AlumniSchema);
