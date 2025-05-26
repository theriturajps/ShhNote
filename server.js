import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(join(__dirname, 'public')));

// Store active rooms data
const rooms = {};

// Generate a random room ID
function randomIdGenerator() {
  return `${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}`;
}

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  let currentRoom = null;

  // Create a new room
  socket.on('create-room', () => {
    const roomId = randomIdGenerator();
    rooms[roomId] = { text: '', users: [] };

    // Join the room immediately after creation
    socket.join(roomId);
    currentRoom = roomId;

    // Add user to room
    const username = `User-${socket.id.substring(0, 5)}`;
    rooms[roomId].users.push({ id: socket.id, name: username });

    // Emit both events to properly initialize the room
    socket.emit('room-created', roomId);
    socket.emit('room-joined', {
      roomId,
      text: rooms[roomId].text,
      username
    });

    // Update users list
    io.to(roomId).emit('update-users', rooms[roomId].users);
    console.log(`Room created: ${roomId}`);
  });

  // Join a room
  socket.on('join-room', (roomId) => {
    // Leave previous room if any
    if (currentRoom) {
      socket.leave(currentRoom);
      rooms[currentRoom].users = rooms[currentRoom].users.filter(user => user.id !== socket.id);
      io.to(currentRoom).emit('update-users', rooms[currentRoom].users);
    }

    // Check if room exists
    if (!rooms[roomId]) {
      rooms[roomId] = { text: '', users: [] };
    }

    // Join the room
    socket.join(roomId);
    currentRoom = roomId;
    
    // Add user to room
    const username = `User-${socket.id.substring(0, 5)}`;
    rooms[roomId].users.push({ id: socket.id, name: username });
    
    // Send room data to the user
    socket.emit('room-joined', {
      roomId,
      text: rooms[roomId].text,
      username
    });
    
    // Update all users in the room
    io.to(roomId).emit('update-users', rooms[roomId].users);
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  // Text update from client
  socket.on('text-update', (text) => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].text = text;
      // Broadcast to all users in room except sender
      socket.to(currentRoom).emit('text-updated', text);
    }
  });

  // Clear room
  socket.on('clear-room', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].text = '';
      io.to(currentRoom).emit('text-updated', '');
      console.log(`Room cleared: ${currentRoom}`);
    }
  });

  // Delete room
  socket.on('delete-room', () => {
    if (currentRoom && rooms[currentRoom]) {
      io.to(currentRoom).emit('room-deleted');
      delete rooms[currentRoom];
      currentRoom = null;
      console.log(`Room deleted: ${currentRoom}`);
    }
  });

  // Exit room
  socket.on('exit-room', () => {
    if (currentRoom && rooms[currentRoom]) {
      socket.leave(currentRoom);
      rooms[currentRoom].users = rooms[currentRoom].users.filter(user => user.id !== socket.id);
      io.to(currentRoom).emit('update-users', rooms[currentRoom].users);
      currentRoom = null;
      console.log(`User ${socket.id} left room`);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].users = rooms[currentRoom].users.filter(user => user.id !== socket.id);
      io.to(currentRoom).emit('update-users', rooms[currentRoom].users);
      
      // Remove empty rooms
      if (rooms[currentRoom].users.length === 0) {
        delete rooms[currentRoom];
        console.log(`Empty room removed: ${currentRoom}`);
      }
    }
  });

  // Handle user typing
  socket.on('user-typing', (roomId) => {
    if (currentRoom && rooms[currentRoom] && roomId === currentRoom) {
      // Broadcast to all other users in the room
      socket.to(roomId).emit('user-typing', socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});