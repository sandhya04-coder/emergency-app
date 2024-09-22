// server/server.js

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');

// Initialize Express
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Passport middleware
app.use(passport.initialize());

// Serve service worker for Requester
app.use('/sw.js', express.static(path.join(__dirname, '..', 'requester', 'sw.js')));

// Serve service worker for Responder
app.use('/responder/sw.js', express.static(path.join(__dirname, '..', 'responder', 'sw.js')));



// Passport config
require('./config/passport')(passport);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/signals', passport.authenticate('jwt', { session: false }), require('./routes/signals'));

// Serve static files for Requester and Responder
app.use('/requester', express.static(path.join(__dirname, '..', 'requester')));
app.use('/responder', express.static(path.join(__dirname, '..', 'responder')));

// Create HTTP server
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
    }
});

// Socket.io authentication
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error("Authentication error"));
    }
    try {
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error("Authentication error"));
    }
});

// Handle socket connections
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.user.username}`);

    // Join rooms based on role
    if (socket.user.role === 'responder') {
        socket.join('responders');
        console.log(`${socket.user.username} joined responders room`);
    } else if (socket.user.role === 'requester') {
        socket.join('requesters');
        console.log(`${socket.user.username} joined requesters room`);
    }

    // Listen for emergency signals from requesters
    socket.on('emergencySignal', (data) => {
        console.log('Emergency Signal Received:', data);
        io.to('responders').emit('receiveSignal', data);
           // Broadcast to all requesters or handle accordingly
           io.to('requesters').emit('updateResponderLocation', {
            responderId: socket.user.id,
            location: data
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Requester App: http://localhost:${PORT}/requester`);
    console.log(`Responder App: http://localhost:${PORT}/responder`);
});
