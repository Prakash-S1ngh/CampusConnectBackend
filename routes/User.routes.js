const upload  = require('../config/multer.config');
const { signup, login,  getUser, logout , getOrderedConnections, getMessages, addSkill, removeSkill, addProject, removeProject, updateUser, getAlumniConnections, getJuniors, getTeamDetails, getUserById, getTeams, getTeamMembers, getTeamMessages, sendTeamMessage, checkUserTeams } = require('../controllers/Users.controllers');
const { UserAuth } = require('../middleware/UserAuth.middleware');
const express = require('express');
const User = require('../models/User.models');
const UserRouter = express.Router();

UserRouter.post('/signup', upload.single('image') , signup);
UserRouter.post('/login', login);
UserRouter.post('/logout', UserAuth, logout);
UserRouter.get('/getInfo', UserAuth, getUser);
UserRouter.get('/fetchConnections', UserAuth, getOrderedConnections);
UserRouter.get('/messages',getMessages);

UserRouter.post('/addskills', addSkill);
UserRouter.delete('/removeskills', removeSkill);
UserRouter.post('/addproject',addProject);
UserRouter.delete('/removeproject', removeProject);
UserRouter.put('/updateUser',updateUser);
UserRouter.get('/getAlumni',UserAuth,getAlumniConnections);
UserRouter.get('/getjuniors',UserAuth,getJuniors);
UserRouter.get('/getTeams',UserAuth ,getTeamDetails);
UserRouter.get('/getUserById/:userId', UserAuth, getUserById);

// Team routes
UserRouter.get('/getTeams', UserAuth, getTeams);
UserRouter.get('/getTeamMembers/:teamId', UserAuth, getTeamMembers);
UserRouter.get('/getTeamMessages/:teamId', UserAuth, getTeamMessages);
UserRouter.post('/sendTeamMessage', UserAuth, sendTeamMessage);
UserRouter.get('/checkUserTeams', UserAuth, checkUserTeams);

module.exports = UserRouter;