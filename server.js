const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log("Error", err));

const userSchema = new mongoose.Schema({
    username: String,
    status: String,
});

const messageSchema = new mongoose.Schema({
    id: Number,
    message: String,
    username: String,
    timestamp: String,
    replyTo: Number,
    recipient: String,
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// Create a single HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const users = {};
let messageId = 0;

io.on('connection', (socket) => {
    socket.on('register', async (username) => {
        users[socket.id] = username;
        socket.join(username); // Join a room with the username
        await User.updateOne({ username }, { $set: { status: 'online' } }, { upsert: true });

        // Fetch previous messages from MongoDB
        // const previousMessages = await Message.find({ $or: [{ username }, { recipient: username }] });
        // console.log('register');
        // const previousMessages = Message.on('add', (data) => {
        //     console.log('data', data);
        //     socket.emit('message', data);
        // })
        io.emit('user-list', Object.values(users));

        io.emit('user-status', { username, status: 'online' });
        const previousMessages = Message.watch();
        previousMessages.on('change', (data) => {
            console.log('data', data);
            socket.emit('previous-messages', data);
        })

        const previousUsers = await User.find({ $or: [{ username }, { status: 'online' }] });
        console.log("previousUsers", previousUsers)
        const usersList = User.watch();
        usersList.on('change', (data) => {
            console.log('users data', data);
            socket.emit('previous-users', data);
        })

        // Send previous messages to the user
        // socket.emit('previous-messages', previousMessages);

        // Broadcast the updated user list
    });

    // Handle message sending
    socket.on('user-message', async ({ message, replyTo, recipient }) => {
        const username = users[socket.id];
        const timestamp = new Date().toLocaleTimeString();
        const id = messageId++;
        const newMessage = new Message({ id, message, timestamp, replyTo, username, recipient });
        await newMessage.save();

        // Send message to both the recipient's room and the sender's room
        io.to(recipient).emit('message', { id, message, username, timestamp, replyTo });
        io.to(username).emit('message', { id, message, username, timestamp, replyTo });
    });

    socket.on('disconnect', async () => {
        const username = users[socket.id];
        delete users[socket.id];

        // Broadcast the updated user list
        io.emit('user-list', Object.values(users));

        await User.updateOne({ username }, { status: 'offline' });
        io.emit('user-status', { username, status: 'offline' });
    });
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Serve static files if needed
// app.use(express.static('public'));

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server is listening on http://localhost:${PORT}`);
});
