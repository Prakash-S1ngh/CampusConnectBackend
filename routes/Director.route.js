const upload = require('../config/multer.config');
const { 
    createDirector, 
    loginDirector,
    logoutDirector,
    getDirectorConnections, 
    getCampusStudents,
    getCampusAlumni,
    getCampusFaculty,
    getDirectorById, 
    updateDirectorById,
    removeUserFromCampus,
    getCampusAnalytics,
    getCampusUsers,
    sendCampusMessage
} = require('../controllers/Director.controller');
const { UserAuth } = require('../middleware/UserAuth.middleware');
const DirectorRouter = require('express').Router();

// Director registration and authentication
DirectorRouter.post('/signup', upload.single('image'), createDirector);
DirectorRouter.post('/login', loginDirector);
DirectorRouter.post('/logout', logoutDirector);

// Get director connections (other directors in same campus)
DirectorRouter.get('/connections', UserAuth, getDirectorConnections);

// Get campus members by role
DirectorRouter.get('/campus-students', UserAuth, getCampusStudents);
DirectorRouter.get('/campus-alumni', UserAuth, getCampusAlumni);
DirectorRouter.get('/campus-faculty', UserAuth, getCampusFaculty);

// Get director information
DirectorRouter.get('/info', UserAuth, getDirectorById);

// Update director information
DirectorRouter.put('/update', UserAuth, upload.single('image'), updateDirectorById);

// Remove user from campus (only directors can do this)
DirectorRouter.delete('/remove-user', UserAuth, removeUserFromCampus);

// Get campus analytics
DirectorRouter.get('/analytics', UserAuth, getCampusAnalytics);

// Get all users in campus for management
DirectorRouter.get('/campus-users', UserAuth, getCampusUsers);

// Send message to campus members
DirectorRouter.post('/send-campus-message', UserAuth, sendCampusMessage);

module.exports = DirectorRouter; 