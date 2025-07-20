const express = require("express");
const { getBounty, createBounty, deleteBounty, enrollInBounty } = require("../controllers/Bounty.controller");
const { UserAuth } = require("../middleware/UserAuth.middleware");
const Bountyrouter = express.Router();


Bountyrouter.get('/getBounty',UserAuth,getBounty);
Bountyrouter.post('/createBounty',UserAuth,createBounty);
Bountyrouter.delete('/deleteBounty/:id',UserAuth,deleteBounty);
Bountyrouter.post('/applying/:id',UserAuth,enrollInBounty);

module.exports = Bountyrouter;
