// DOM Elements
const welcomeScreen = document.getElementById('welcome-screen');
const roomScreen = document.getElementById('room-screen');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const roomIdInput = document.getElementById('room-id-input');
const currentRoomId = document.getElementById('current-room-id');
const copyRoomIdBtn = document.getElementById('copy-room-id');
const clearRoomBtn = document.getElementById('clear-room-btn');
const deleteRoomBtn = document.getElementById('delete-room-btn');
const exitRoomBtn = document.getElementById('exit-room-btn');
const textEditor = document.getElementById('text-editor');
const usersList = document.getElementById('users-list');
const userCount = document.getElementById('user-count');
const saveStatus = document.getElementById('save-status');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');

import { initializeSocket, socket } from './socket.js';
import { showNotification } from './notifications.js';

// Application state
let username = '';
let currentRoom = '';
let isTyping = false;
let saveTimeout = null;

// Initialize the application
function init() {
  initializeSocket();
  bindEventListeners();
  setupSocketListeners();
}

// Bind DOM event listeners
function bindEventListeners() {
  createRoomBtn.addEventListener('click', createRoom);
  joinRoomBtn.addEventListener('click', joinRoom);
  roomIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinRoom();
  });
  copyRoomIdBtn.addEventListener('click', copyRoomId);
  clearRoomBtn.addEventListener('click', clearRoom);
  deleteRoomBtn.addEventListener('click', deleteRoom);
  exitRoomBtn.addEventListener('click', exitRoom);
  textEditor.addEventListener('input', handleTextChange);
}

// Setup Socket.IO listeners
function setupSocketListeners() {
  socket.on('connect', () => {
    updateConnectionStatus('connected');
  });
  
  socket.on('disconnect', () => {
    updateConnectionStatus('disconnected');
  });
  
  socket.on('connect_error', () => {
    updateConnectionStatus('disconnected');
    showNotification('Unable to connect to server', 'error');
  });
  
  socket.on('room-created', (roomId) => {
    currentRoom = roomId;
    showRoom(roomId);
    showNotification('Room created successfully', 'success');
  });
  
  socket.on('room-joined', (data) => {
    currentRoom = data.roomId;
    username = data.username;
    showRoom(data.roomId);
    textEditor.value = data.text;
    showNotification('Joined room successfully', 'success');
  });
  
  socket.on('text-updated', (text) => {
    // Only update if the user isn't currently typing
    if (!isTyping) {
      textEditor.value = text;
    }
    updateSaveStatus('saved');
  });
  
  socket.on('update-users', (users) => {
    renderUsersList(users);
  });
  
  socket.on('room-deleted', () => {
    showWelcomeScreen();
    showNotification('Room has been deleted', 'info');
  });
}

// Create a new room
function createRoom() {
  socket.emit('create-room');
}

// Join an existing room
function joinRoom() {
  const roomId = roomIdInput.value.trim();
  if (!roomId) {
    showNotification('Please enter a valid room ID', 'error');
    return;
  }
  
  socket.emit('join-room', roomId);
}

// Copy room ID to clipboard
function copyRoomId() {
  navigator.clipboard.writeText(currentRoom).then(() => {
    showNotification('Room ID copied to clipboard', 'success');
  }).catch(() => {
    showNotification('Failed to copy room ID', 'error');
  });
}

// Clear room content
function clearRoom() {
  if (confirm('Are you sure you want to clear all text in this room?')) {
    socket.emit('clear-room');
    textEditor.value = '';
    updateSaveStatus('saved');
    showNotification('Room content cleared', 'info');
  }
}

// Delete the room
function deleteRoom() {
  if (confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
    socket.emit('delete-room');
    showWelcomeScreen();
  }
}

// Exit the room
function exitRoom() {
  socket.emit('exit-room');
  showWelcomeScreen();
  showNotification('You left the room', 'info');
}

// Handle text editor changes
function handleTextChange() {
  isTyping = true;
  
  // Update save status to saving
  updateSaveStatus('saving');
  
  // Clear previous timeout
  if (saveTimeout) clearTimeout(saveTimeout);
  
  // Set a new timeout to emit the updated text
  saveTimeout = setTimeout(() => {
    socket.emit('text-update', textEditor.value);
    isTyping = false;
    updateSaveStatus('saved');
  }, 500);
}

// Render users list
function renderUsersList(users) {
  usersList.innerHTML = '';
  userCount.textContent = users.length;
  
  users.forEach(user => {
    const li = document.createElement('li');
    
    // Highlight the current user
    const isCurrentUser = user.id === socket.id;
    
    li.innerHTML = `
      <i class="fas fa-user"></i>
      ${user.name} ${isCurrentUser ? '(You)' : ''}
    `;
    
    if (isCurrentUser) {
      li.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      li.style.fontWeight = 'bold';
    }
    
    usersList.appendChild(li);
  });
}

// Show welcome screen
function showWelcomeScreen() {
  welcomeScreen.classList.add('active');
  roomScreen.classList.remove('active');
  currentRoom = '';
  textEditor.value = '';
}

// Show room screen
function showRoom(roomId) {
  welcomeScreen.classList.remove('active');
  roomScreen.classList.add('active');
  currentRoomId.textContent = roomId;
}

// Update save status
function updateSaveStatus(status) {
  saveStatus.textContent = status === 'saving' ? 'Saving...' : 'Saved';
  saveStatus.className = status;
}

// Update connection status
function updateConnectionStatus(status) {
  statusIndicator.className = status;
  statusText.textContent = status === 'connected' ? 'Connected' : 'Disconnected';
  
  if (status === 'disconnected') {
    showNotification('Disconnected from server', 'error');
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);