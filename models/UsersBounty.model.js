const mongoose = require("mongoose");

const userBountySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  completedBounties: [
    {
      bountyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bounty",
        required: true,
      },
      completedAt: {
        type: Date,
        required: true,
      }
    }
  ],
  lastCompletedBounty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bounty",
  }
});

const UserBounty = mongoose.model("UserBounty", userBountySchema);
module.exports = UserBounty;