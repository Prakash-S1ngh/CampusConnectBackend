const { signup, getAlumni, updateAlumni } = require('../controllers/Alumni.controller');
const Alumnirouter = require('express').Router();
const upload = require('../config/multer.config');
const { UserAuth } = require('../middleware/UserAuth.middleware');

Alumnirouter.post('/signup', upload.single('image'), signup);
Alumnirouter.get('/getAlumni', UserAuth , getAlumni);
Alumnirouter.post('/updateprofile', UserAuth , updateAlumni);


module.exports = Alumnirouter;