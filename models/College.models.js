const mongoose = require('mongoose');

const CollegeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    location: {
        type: String,
    },
    departments: [String], // Array of department names
    website: {
        type: String,
    },
});

const College = mongoose.model('College', CollegeSchema);
module.exports = College;