const upload = require('../config/multer.config');
const { 
    createFaculty, 
    getFacultyConnections, 
    getFacultyById, 
    updateFacultyById,
    getAlumniForFaculty,
    getStudentsForFaculty,
    getFacultyAnalytics,
    getFacultyMessages,
    sendFacultyMessage,
    getFacultyConnectionsForChat
} = require('../controllers/Faculty.controller');
const { UserAuth } = require('../middleware/UserAuth.middleware');
const Facrouter = require('express').Router();

Facrouter.post('/signup',upload.single('image'),createFaculty);
Facrouter.get('/getFaculty', UserAuth , getFacultyConnections);
Facrouter.get('/getinfo',UserAuth,getFacultyById);
Facrouter.put('/updateinfo',UserAuth,upload.single('image'),updateFacultyById);

// New faculty endpoints
Facrouter.get('/getAlumni', UserAuth, getAlumniForFaculty);
Facrouter.get('/getStudents', UserAuth, getStudentsForFaculty);
Facrouter.get('/analytics', UserAuth, getFacultyAnalytics);

// Faculty messaging endpoints
Facrouter.get('/messages/:recipientId', UserAuth, getFacultyMessages);
Facrouter.post('/sendMessage', UserAuth, sendFacultyMessage);
Facrouter.get('/connections', UserAuth, getFacultyConnectionsForChat);

module.exports = Facrouter;