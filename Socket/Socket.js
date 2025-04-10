const { Server } = require("socket.io");
const mongoose = require("mongoose");
const Message = require("../models/Messages.models");
const User = require("../models/User.models");
require("dotenv").config();

const setupSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL,
            credentials: true,
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", async (socket) => {
        console.log("User connected:", socket.id);

        socket.on("userOnline", async (userId) => {
            await User.findByIdAndUpdate(userId, { isOnline: true });
            io.emit("updateStatus", { userId, isOnline: true });
        });
        // VIDEO CALL SOCKET LOGIC
        socket.on("call-user", ({ to, signalData, from }) => {
            console.log(`Call initiated from ${from} to ${to}`);
            io.to(to).emit("receive-signal", { signal: signalData, from });
        });

        socket.on("accept-call", ({ to, signal }) => {
            console.log(`Call accepted and signal sent to ${to}`);
            io.to(to).emit("signal-accepted", signal);
        });

        socket.on("joinRoom", ({ sender, receiver }) => {
            const roomId = [sender, receiver].sort().join("_"); // Ensure consistent room ID
            socket.join(roomId);
            console.log(`User ${socket.id} joined room ${roomId}`);
        });
        

        socket.on("sendMessage", async ({ sender, receiver, message }) => {
            try {
                const roomId = [sender, receiver].sort().join("_");

                // Check if the exact message exists (avoid duplicates)
                const existingMessage = await Message.findOne({ roomId, sender, message }).sort({ createdAt: -1 });

                if (!existingMessage) {
                    // Save message to MongoDB
                    const newMessage = new Message({ roomId, sender, receiver, message });
                    await newMessage.save();

                    // Emit message to the room with _id and createdAt
                    io.to(roomId).emit("receiveMessage", {
                        _id: newMessage._id,
                        sender,
                        message,
                        createdAt: newMessage.createdAt
                    });
                }
            } catch (error) {
                console.error("Error saving message:", error);
            }
        });

        socket.on("disconnect", async () => {
            console.log("User disconnected:", socket.id);
            const user = await User.findOne({ socketId: socket.id });

            if (user) {
                await User.findByIdAndUpdate(user._id, { isOnline: false, lastSeen: new Date() });
                io.emit("updateStatus", { userId: user._id, isOnline: false, lastSeen: new Date() });
            }
        });

        socket.on("leaveRoom", ({ sender, receiver }) => {
            const roomId = [sender, receiver].sort().join("_");
            socket.leave(roomId);
            console.log(`User ${socket.id} left room ${roomId}`);
        });

    });

    return io;
};

module.exports = setupSocket;