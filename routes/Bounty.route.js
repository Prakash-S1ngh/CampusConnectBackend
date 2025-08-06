const express = require("express");
const { getBounty, createBounty, deleteBounty, enrollInBounty, checkAndRestoreParticipations, triggerTeamFormation, checkQueueStatus } = require("../controllers/Bounty.controller");
const { UserAuth } = require("../middleware/UserAuth.middleware");
const Bountyrouter = express.Router();


Bountyrouter.get('/getBounty',UserAuth,getBounty);
Bountyrouter.post('/createBounty',UserAuth,createBounty);
Bountyrouter.delete('/deleteBounty/:id',UserAuth,deleteBounty);
Bountyrouter.post('/applying/:id',UserAuth,enrollInBounty);
Bountyrouter.post('/check-participations',UserAuth,checkAndRestoreParticipations);
Bountyrouter.post('/trigger-team-formation/:bountyId',UserAuth,triggerTeamFormation);
Bountyrouter.get('/queue-status/:bountyId',UserAuth,checkQueueStatus);

module.exports = Bountyrouter;
