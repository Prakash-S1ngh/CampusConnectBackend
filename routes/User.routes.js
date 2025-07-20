const upload  = require('../config/multer.config');
const { signup, login,  getUser, logout , getOrderedConnections, getMessages, addSkill, removeSkill, addProject, removeProject, updateUser, getAlumniConnections, getJuniors, getTeamDetails } = require('../controllers/Users.controllers');
const { UserAuth } = require('../middleware/UserAuth.middleware');
const express = require('express');
const User = require('../models/User.models');
const UserRouter = express.Router();

UserRouter.post('/signup', upload.single('image') , signup);
UserRouter.post('/login', login);
UserRouter.post('/logout', UserAuth, logout);
UserRouter.get('/getInfo', UserAuth, getUser);
UserRouter.get('/fetchConnnections', UserAuth, getOrderedConnections);
UserRouter.get('/messages',getMessages);

UserRouter.post('/addskills', addSkill);
UserRouter.delete('/removeskills', removeSkill);
UserRouter.post('/addproject',addProject);
UserRouter.delete('/removeproject', removeProject);
UserRouter.put('/updateUser',updateUser);
UserRouter.get('/getAlumni',UserAuth,getAlumniConnections);
UserRouter.get('/getjuniors',UserAuth,getJuniors);
UserRouter.get('/getTeams',UserAuth ,getTeamDetails);
module.exports = UserRouter;