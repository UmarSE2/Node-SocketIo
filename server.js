// const express = require('express');
// const http = require('http');
// const { Server } = require("socket.io");

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server);

// const users = {}; // Object to track users

// io.on('connection', (socket) => {
//     socket.on('register', username => {
//         users[socket.id] = username; // Associate socket ID with username
//         io.emit('user-status', { username, status: 'online' }); // Notify others that user is online
//     });

//     socket.on('user-message', message => {
//         io.emit('message', message);
//     });

//     socket.on('disconnect', () => {
//         const username = users[socket.id];
//         delete users[socket.id]; // Remove user from tracking
//         io.emit('user-status', { username, status: 'offline' }); // Notify others that user is offline
//     });
// });

// app.use(express.static('public'));

// server.listen(3000, () => {
//     console.log('listening on *:3000');
// });

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const users = {};

io.on('connection', (socket) => {
    socket.on('register', username => {
        users[socket.id] = username;
        io.emit('user-status', { username, status: 'online' });
    });

    socket.on('user-message', message => {
        const username = users[socket.id];
        const timestamp = new Date().toLocaleTimeString();
        io.emit('message', { message, username, timestamp });
    });

    socket.on('disconnect', () => {
        const username = users[socket.id];
        delete users[socket.id];
        io.emit('user-status', { username, status: 'offline' });
    });
});

app.use(express.static('public'));

server.listen(3000, () => {
    console.log('listening on *:3000');
});
