const mongoose = require('mongoose');

const DirectorSchema = new mongoose.Schema({
    title: {
        type: String,
        enum: ['Director', 'Associate Director', 'Assistant Director', 'Dean', 'Associate Dean']
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
    },
    // Director-specific fields
    directorRole: {
        type: String,
        enum: ['Campus Director', 'Department Director', 'Academic Director', 'Administrative Director'],
        required: true
    },
    permissions: {
        canRemoveFaculty: { type: Boolean, default: true },
        canRemoveStudents: { type: Boolean, default: true },
        canRemoveAlumni: { type: Boolean, default: true },
        canManageCampus: { type: Boolean, default: true },
        canViewAnalytics: { type: Boolean, default: true }
    },
    managedDepartments: [String], // Departments this director manages
    reportingTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Director' // Self-reference for hierarchy
    }
}, { timestamps: true });

const Director = mongoose.model('Director', DirectorSchema);
module.exports = Director; 