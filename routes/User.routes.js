const upload  = require('../config/multer.config');
const { signup, login,  acceptRequest, rejectRequest, getUser, logout , getOrderedConnections, getMessages } = require('../controllers/Users.controllers');
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

// Accept and Reject Connection Requests
UserRouter.patch('/accept/:connectionId', UserAuth, acceptRequest);
UserRouter.patch('/reject/:connectionId', UserAuth, rejectRequest);

module.exports = UserRouter;