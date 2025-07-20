const upload = require('../config/multer.config');
const { createFaculty, getFacultyConnections, getFacultyById, updateFacultyById } = require('../controllers/Faculty.controller');
const { UserAuth } = require('../middleware/UserAuth.middleware');
const Facrouter = require('express').Router();

Facrouter.post('/signup',upload.single('image'),createFaculty);
Facrouter.get('/getFaculty', UserAuth , getFacultyConnections);
Facrouter.get('/getinfo',UserAuth,getFacultyById);
Facrouter.put('/updateinfo',UserAuth,upload.single('image'),updateFacultyById)

module.exports = Facrouter;