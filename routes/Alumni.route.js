const { 
    signup, 
    getAlumni, 
    updateAlumni,
    getAlumniConnections,
    getAlumniMessages,
    sendAlumniMessage,
    getAlumniAnalytics,
    getJuniorsForAlumni,
    getFacultyForAlumni,
    getUserByIdForAlumni
} = require('../controllers/Alumni.controller');
const Alumnirouter = require('express').Router();
const upload = require('../config/multer.config');
const { UserAuth } = require('../middleware/UserAuth.middleware');

Alumnirouter.post('/signup', upload.single('image'), signup);
Alumnirouter.get('/getAlumni', UserAuth , getAlumni);
Alumnirouter.post('/updateprofile', UserAuth , updateAlumni);

// New alumni messaging endpoints
Alumnirouter.get('/connections', UserAuth, getAlumniConnections);
Alumnirouter.get('/messages/:recipientId', UserAuth, getAlumniMessages);
Alumnirouter.post('/send-message', UserAuth, sendAlumniMessage);
Alumnirouter.get('/analytics', UserAuth, getAlumniAnalytics);

// Alumni networking endpoints
Alumnirouter.get('/juniors', UserAuth, getJuniorsForAlumni);
Alumnirouter.get('/faculty', UserAuth, getFacultyForAlumni);
Alumnirouter.get('/getUserById/:userId', UserAuth, getUserByIdForAlumni);


module.exports = Alumnirouter;