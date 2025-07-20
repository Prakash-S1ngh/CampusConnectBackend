const mongoose = require('mongoose');

const FacultySchema = new mongoose.Schema({
    title: {
        type: String,
        enum: ['Professor', 'Assistant Professor', 'Scholar', 'PhD', 'Temporary Professor']
    },
    department: {
        type: String
    },
    expertise: [String], 
    officeLocation: {
        type: String, // e.g., 'Block A, Room 204'
    },
    contactEmail: {
        type: String,
    },
    researchInterests: [String],
    publications: [{
        title: String,
        journal: String,
        year: Number,
        link: String
    }],
    teachingSubjects: [String],
    officeHours: {
        from: String, // e.g., '10:00 AM'
        to: String    // e.g., '01:00 PM'
    },
    achievements: [String],
    guidance: {
        phd: { type: Number, default: 0 },
        mtech: { type: Number, default: 0 },
        btech: { type: Number, default: 0 }
    }
}, { timestamps: true });

const Faculty = mongoose.model('Faculty', FacultySchema);
module.exports = Faculty;