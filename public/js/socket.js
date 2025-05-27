// Socket.IO client initialization

let socket;

function initializeSocket() {
  // Initialize socket connection
  socket = io({
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });

  // Set up logging for socket events (development only)
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    setupSocketLogging();
  }

  return socket;
}

function setupSocketLogging() {
  // Log socket connection events
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
  
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
  });
}

export { initializeSocket, socket };