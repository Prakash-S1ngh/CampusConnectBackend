const express = require('express');
const { connectDB } = require('./config/Db.config');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const UserRouter = require('./routes/User.routes');
const http = require('http');
const {setupSocket} = require('./Socket/Socket');
const Alumnirouter = require('./routes/Alumni.route');
const FeedRouter = require('./routes/Feed.router');
const Bountyrouter = require('./routes/Bounty.route');
const { startBountyCleanupJob } = require('./controllers/Bounty.controller');
const Facrouter = require('./routes/Faculty.route');
require('dotenv').config();
// const url = process.env.URL
// const frontendurl = process.env.FRONTEND_URL || 'http://localhost:5173'; // Default to localhost if not set

const app = express();
const server = http.createServer(app); // Create HTTP server

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
})
);
// app.use(cors({
//     origin:"https://campusconnect-1-tw1a.onrender.com",
//     credentials:true
// })
// );


// Routes


// Database Connection
connectDB();

// User Routes
app.use('/student/v2', UserRouter);
app.use('/alumni/v2', Alumnirouter);
app.use('/feed/v2', FeedRouter);
app.use('/bounty/v2', Bountyrouter);
app.use('/faculty/v2',Facrouter);

// Initialize WebSocket
setupSocket(server); // Initialize socket with the server

// Start the server
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server is running on ${port}`);
});
startBountyCleanupJob();

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Backend Server</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f5f5f5;
              color: #333;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
            }
            h1 {
              background-color: #fff;
              padding: 20px 40px;
              border-radius: 8px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <h1>Hello World! This is the backend server.</h1>
        </body>
        </html>
      `);
});