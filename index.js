const express = require('express');
const { connectDB } = require('./config/Db.config');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const UserRouter = require('./routes/User.routes');
const http = require('http');
const setupSocket = require('./Socket/Socket');
require('dotenv').config();
// const url = process.env.URL
// const frontendurl = process.env.FRONTEND_URL || 'http://localhost:5173'; // Default to localhost if not set

const app = express();
const server = http.createServer(app); // Create HTTP server

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(cors({
//     origin: "http://localhost:5173",
//     credentials: true
// }));
// const allowedOrigins = [
//     // "http://localhost:5173",
//     "https://campus-connect-ro72-three.vercel.app"
//   ];

// const allowedOrigins="https://campus-connect-ro72-three.vercel.app";

//   console.log("Allowed Origins:", allowedOrigins);
  
//   app.use(cors({
//     origin: function (origin, callback) {
//       // allow requests with no origin (like mobile apps, curl)
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true
//   }));


app.use(cors({origin:"https://campus-connect-ro72-three.vercel.app",credentials:true}));

// Routes


// Database Connection
connectDB();

// User Routes
app.use('/student/v2', UserRouter);

// Initialize WebSocket
setupSocket(server); // Initialize socket with the server

// Start the server
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server is running on ${port}`);
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});