// Socket.IO client initialization

let socket;

function initializeSocket() {
  // Initialize socket connection
  socket = io();
  
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