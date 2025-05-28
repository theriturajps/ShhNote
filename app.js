import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import favicon from 'serve-favicon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(join(__dirname, 'public')));
app.use(favicon(join(__dirname, 'public', 'images', 'logo.png')));

// Ensure all routes serve index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Store active rooms data
const rooms = {};

// Generate random room ID
function randomIdGenerator() {
  const part1 = Math.trunc(Math.random() * 1000).toString().padStart(3, '0');
  const part2 = Math.trunc(Math.random() * 1000).toString().padStart(3, '0');
  const part3 = Math.trunc(Math.random() * 1000).toString().padStart(3, '0');
  return `${part1}-${part2}-${part3}`;
}

io.on('connection', (socket) => {
  // console.log('User connected:', socket.id);

  let currentRoom = null;

  // Create room
  socket.on('create-room', () => {
    const roomId = randomIdGenerator();
    rooms[roomId] = { text: '', users: [] };

    socket.join(roomId);
    currentRoom = roomId;

    const username = `User-${socket.id.substring(0, 5)}`;
    rooms[roomId].users.push({ id: socket.id, name: username });

    socket.emit('room-created', roomId);
    socket.emit('room-joined', {
      roomId,
      text: rooms[roomId].text,
      username
    });

    io.to(roomId).emit('update-users', rooms[roomId].users);
  });

  // Join room
  socket.on('join-room', (roomId) => {
    if (currentRoom) {
      socket.leave(currentRoom);
      rooms[currentRoom].users = rooms[currentRoom].users.filter(user => user.id !== socket.id);
      io.to(currentRoom).emit('update-users', rooms[currentRoom].users);
    }

    if (!rooms[roomId]) {
      rooms[roomId] = { text: '', users: [] };
    }

    socket.join(roomId);
    currentRoom = roomId;

    const username = `User-${socket.id.substring(0, 5)}`;
    rooms[roomId].users.push({ id: socket.id, name: username });

    socket.emit('room-joined', {
      roomId,
      text: rooms[roomId].text,
      username
    });

    io.to(roomId).emit('update-users', rooms[roomId].users);
  });

  // Rejoin room
  socket.on('rejoin-room', (roomId) => {
    if (currentRoom) {
      socket.leave(currentRoom);
      rooms[currentRoom].users = rooms[currentRoom].users.filter(user => user.id !== socket.id);
      io.to(currentRoom).emit('update-users', rooms[currentRoom].users);
    }

    if (!rooms[roomId]) {
      rooms[roomId] = { text: '', users: [] };
    }

    socket.join(roomId);
    currentRoom = roomId;

    const username = `User-${socket.id.substring(0, 5)}`;
    rooms[roomId].users.push({ id: socket.id, name: username });

    socket.emit('room-joined', {
      roomId,
      text: rooms[roomId].text,
      username
    });

    io.to(roomId).emit('update-users', rooms[roomId].users);
  });

  // Text update
  socket.on('text-update', (text) => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].text = text;
      socket.to(currentRoom).emit('text-updated', text);
    }
  });

  // User typing
  socket.on('user-typing', (roomId) => {
    if (currentRoom && roomId === currentRoom) {
      socket.to(roomId).emit('user-typing', socket.id);
    }
  });

  // Clear room
  socket.on('clear-room', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].text = '';
      io.to(currentRoom).emit('text-updated', '');
    }
  });

  // Delete room
  socket.on('delete-room', () => {
    if (currentRoom && rooms[currentRoom]) {
      io.to(currentRoom).emit('room-deleted');
      delete rooms[currentRoom];
      currentRoom = null;
    }
  });

  // Exit room
  socket.on('exit-room', () => {
    if (currentRoom && rooms[currentRoom]) {
      socket.leave(currentRoom);
      rooms[currentRoom].users = rooms[currentRoom].users.filter(user => user.id !== socket.id);
      io.to(currentRoom).emit('update-users', rooms[currentRoom].users);
      currentRoom = null;
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    // console.log('User disconnected:', socket.id);

    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].users = rooms[currentRoom].users.filter(user => user.id !== socket.id);
      io.to(currentRoom).emit('update-users', rooms[currentRoom].users);

      if (rooms[currentRoom].users.length === 0) {
        delete rooms[currentRoom];
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});