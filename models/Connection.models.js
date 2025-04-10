const mongoose = require("mongoose");

const ConnectionSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: { // Fixed spelling (reciever -> receiver)
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { 
      type: String, 
      enum: ["mentor", "friend", "colleague"], 
      required: true,
    }, // Connection type

    status: { 
      type: String, 
      enum: ["pending", "accepted", "rejected"], 
      default: "pending",
    }, // Request status
  },
  { timestamps: true } // Automatically manages createdAt & updatedAt
);

// **Ensures Unique Connections**
ConnectionSchema.index({ sender: 1, receiver: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("Connection", ConnectionSchema);