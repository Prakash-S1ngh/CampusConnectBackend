const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connection success');
    } catch (error) {
        console.error('MongoDB connection failed');
        process.exit(1);
    }
}

exports.connectDB = connectDB;