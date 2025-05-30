// DOM Elements
const welcomeScreen = document.getElementById('welcome-screen');
const roomScreen = document.getElementById('room-screen');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const roomIdPart1 = document.getElementById('part1');
const roomIdPart2 = document.getElementById('part2');
const roomIdPart3 = document.getElementById('part3');
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
const shareQrBtn = document.getElementById('share-qr-btn');
const qrModal = document.getElementById('qr-modal');
const closeQrModal = document.getElementById('close-qr-modal');
const qrCodeElement = document.getElementById('qr-code');
const roomUrlInput = document.getElementById('room-url-input');
const copyUrlBtn = document.getElementById('copy-url-btn');
const installBtn = document.getElementById('install-btn')
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const editorContainer = document.querySelector('.editor-container');
const chatContainer = document.querySelector('.chat-container');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendMessageBtn = document.getElementById('send-message-btn');

import { initializeSocket, socket } from './socket.js';
import { showNotification } from './notifications.js';

// Application state
let username = '';
let currentRoom = '';
let isTyping = false;
let saveTimeout = null;
let typingTimeout = null;

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Initialize the application
function init() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker registered (install-only mode)');
        })
        .catch(err => {
          console.log('ServiceWorker registration failed: ', err);
        });
    });
  }

  initializeSocket();
  bindEventListeners();
  setupSocketListeners();
  checkForRoomInURL();
  setupPWAInstallPrompt();

  // Check for stored room data immediately
  const storedData = getStoredRoomData();
  if (storedData && storedData.roomId) {
    updateConnectionStatus('connecting');
    statusText.textContent = 'Reconnecting...';
  }
}

function setupPWAInstallPrompt() {
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Don't prevent default - let browser show its banner
    deferredPrompt = e;
    installBtn.style.display = 'block';
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    deferredPrompt = null;
    installBtn.style.display = 'none';
  });

  window.addEventListener('appinstalled', () => {
    installBtn.style.display = 'none';
    deferredPrompt = null;
    console.log('PWA was installed');
  });
}

// Bind DOM event listeners
function bindEventListeners() {
  createRoomBtn.addEventListener('click', createRoom);
  joinRoomBtn.addEventListener('click', joinRoom);
  shareQrBtn.addEventListener('click', () => showQRModal(currentRoom));
  closeQrModal.addEventListener('click', closeQRModal);

  copyUrlBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(roomUrlInput.value).then(() => {
      showNotification('Room URL copied', 'success');
    }).catch(() => {
      showNotification('Failed to copy room URL', 'error');
    });
  });

  // Close modal when clicking outside
  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) {
      closeQRModal();
    }
  });

  // Replace the old roomIdInput event listeners with:
  [roomIdPart1, roomIdPart2, roomIdPart3].forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') joinRoom();
    });

    input.addEventListener('input', (e) => {
      if (e.target.value.length === 3 && e.target.id.startsWith('part')) {
        const nextPart = e.target.id.replace(/\d+/, (match) => parseInt(match) + 1);
        const nextInput = document.getElementById(nextPart);
        if (nextInput) nextInput.focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      // Only allow numbers and navigation keys
      if (!/[0-9]|Backspace|ArrowLeft|ArrowRight|Delete|Tab/.test(e.key)) {
        e.preventDefault();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const paste = e.clipboardData.getData('text');
      const numbers = paste.replace(/\D/g, '');
      if (numbers.length === 9) {
        roomIdPart1.value = numbers.substr(0, 3);
        roomIdPart2.value = numbers.substr(3, 3);
        roomIdPart3.value = numbers.substr(6, 3);
        roomIdPart3.focus();
      }
    });
  });

  // Keep the rest of your existing event listeners
  copyRoomIdBtn.addEventListener('click', copyRoomId);
  clearRoomBtn.addEventListener('click', clearRoom);
  deleteRoomBtn.addEventListener('click', deleteRoom);
  exitRoomBtn.addEventListener('click', exitRoom);
  textEditor.addEventListener('input', handleTextChange);
  chatToggleBtn.addEventListener('click', toggleChat);
  sendMessageBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

function toggleChat() {
  const isChatVisible = chatContainer.style.display !== 'none';

  if (isChatVisible) {
    chatContainer.style.display = 'none';
    editorContainer.style.display = 'flex';
    chatToggleBtn.innerHTML = '<i class="fas fa-comment"></i>';
    chatToggleBtn.title = 'Open Chat';
  } else {
    chatContainer.style.display = 'flex';
    editorContainer.style.display = 'none';
    chatToggleBtn.innerHTML = '<i class="fas fa-pen"></i>';
    chatToggleBtn.title = 'Open Editor';
  }
}

function sendMessage() {
  const message = chatInput.value.trim();
  if (message && currentRoom) {
    socket.emit('chat-message', {
      roomId: currentRoom,
      message: escapeHtml(message) // Escape before sending
    });
    chatInput.value = '';
  }
}

// Setup Socket.IO listeners
function setupSocketListeners() {
  socket.on('connect', () => {
    updateConnectionStatus('connected');

    // Auto-rejoin room if we have stored data and not already in a room
    if (!currentRoom) {
      const storedData = getStoredRoomData();
      if (storedData && storedData.roomId) {
        socket.emit('join-room', storedData.roomId);
      }
    }
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
    storeRoomData(data.roomId); // Store the room ID
    showRoom(data.roomId);
    textEditor.value = data.text;
    showNotification('Joined room successfully', 'success');
  });

  socket.on('text-updated', (text) => {
    if (!isTyping) {
      textEditor.value = text;
    }
    updateSaveStatus('saved');
  });

  socket.on('update-users', (users) => {
    renderUsersList(users);
  });

  socket.on('user-typing', (userId) => {
    const userElement = Array.from(usersList.children).find(li =>
      li.dataset.userId === userId
    );
    if (userElement) {
      let indicator = userElement.querySelector('.typing-indicator');
      if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'typing-indicator';
        userElement.appendChild(indicator);
      }
      indicator.textContent = 'typing...';

      // Clear previous timeout
      if (typingTimeout) clearTimeout(typingTimeout);

      // Clear typing indicator after 2 seconds
      typingTimeout = setTimeout(() => {
        indicator.textContent = '';
      }, 2000);
    }
  });

  socket.on('room-deleted', () => {
    showWelcomeScreen();
    showNotification('Room has been deleted', 'info');
  });

  socket.on('chat-message', (data) => {
    if (data.roomId === currentRoom) {
      const isCurrentUser = data.senderId === socket.id;
      const messageElement = document.createElement('div');
      messageElement.className = `chat-message ${isCurrentUser ? 'you' : ''}`;

      const senderElement = document.createElement('span');
      senderElement.className = 'sender';
      senderElement.textContent = `${isCurrentUser ? 'You' : data.senderName}:`;

      const textElement = document.createElement('span');
      textElement.className = 'message-text';
      textElement.textContent = data.message; // This is already escaped from the server

      messageElement.appendChild(senderElement);
      messageElement.appendChild(textElement);
      chatMessages.appendChild(messageElement);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });
}

function generateQRCode(roomId) {
  const roomUrl = `${window.location.origin}?room=${roomId}`;
  roomUrlInput.value = roomUrl;

  // Clear previous QR code
  qrCodeElement.innerHTML = '';

  // Create a canvas element
  const canvas = document.createElement('canvas');
  qrCodeElement.appendChild(canvas);

  // Generate new QR code
  QRCode.toCanvas(canvas, roomUrl, {
    width: 200,
    margin: 1,
    color: {
      dark: '#000',
      light: '#fff'
    }
  }, (error) => {
    if (error) {
      console.error('QR code generation error:', error);
      showNotification('Failed to generate QR code', 'error');
    }
  });
}

function showQRModal(roomId) {
  generateQRCode(roomId);
  qrModal.classList.add('show');
}

function closeQRModal() {
  qrModal.classList.remove('show');
}

function checkForRoomInURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room');

  if (roomId) {
    // Validate room ID format (000-000-000)
    const roomIdPattern = /^\d{3}-\d{3}-\d{3}$/;
    if (roomIdPattern.test(roomId)) {
      // Split the room ID into parts
      const [part1, part2, part3] = roomId.split('-');
      roomIdPart1.value = part1;
      roomIdPart2.value = part2;
      roomIdPart3.value = part3;

      // Auto-focus the join button
      joinRoomBtn.focus();
    }
  }
}

// Create a new room
function createRoom() {
  socket.emit('create-room');
}

function storeRoomData(roomId) {
  localStorage.setItem('shhNoteRoom', JSON.stringify({
    roomId,
    timestamp: Date.now()
  }));
}

function getStoredRoomData() {
  const data = localStorage.getItem('shhNoteRoom');
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function clearStoredRoomData() {
  localStorage.removeItem('shhNoteRoom');
}

// Join an existing room
function joinRoom() {
  const part1 = roomIdPart1.value.trim();
  const part2 = roomIdPart2.value.trim();
  const part3 = roomIdPart3.value.trim();

  if (!part1 || !part2 || !part3) {
    showNotification('Please enter a complete room ID', 'error');
    return;
  }

  const roomId = `${part1}-${part2}-${part3}`;
  socket.emit('join-room', roomId);
}

// Copy room ID to clipboard
function copyRoomId() {
  navigator.clipboard.writeText(currentRoom).then(() => {
    showNotification('Room ID copied', 'success');
  }).catch(() => {
    showNotification('Failed to copy room ID', 'error');
  });
}

// Clear room content
function clearRoom() {
  if (confirm('Clear all text in this room?')) {
    socket.emit('clear-room');
    textEditor.value = '';
    updateSaveStatus('saved');
    showNotification('Room cleared', 'info');
  }
}

// Delete the room
function deleteRoom() {
  if (confirm('Delete this room? This cannot be undone.')) {
    clearStoredRoomData();
    socket.emit('delete-room');
    showWelcomeScreen();
  }
}

// Exit the room
function exitRoom() {
  clearStoredRoomData();
  socket.emit('exit-room');
  showWelcomeScreen();
  showNotification('You left the room', 'info');
}

// Handle text editor changes
function handleTextChange() {
  isTyping = true;

  // Emit typing event
  socket.emit('user-typing', currentRoom);

  updateSaveStatus('saving');

  if (saveTimeout) clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    socket.emit('text-update', textEditor.value);
    isTyping = false;
    updateSaveStatus('saved');
  }, 500);
}

document.querySelectorAll('.room-code-input input').forEach(input => {
  input.addEventListener('keydown', (e) => {
    // Only allow numbers and navigation keys
    if (!/[0-9]|Backspace|ArrowLeft|ArrowRight|Delete|Tab/.test(e.key)) {
      e.preventDefault();
    }
  });

  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    const numbers = paste.replace(/\D/g, '');
    if (numbers.length === 9) {
      document.getElementById('part1').value = numbers.substr(0, 3);
      document.getElementById('part2').value = numbers.substr(3, 3);
      document.getElementById('part3').value = numbers.substr(6, 3);
      document.getElementById('part3').focus();
    }
  });
});

// Render users list
function renderUsersList(users) {
  usersList.innerHTML = '';
  userCount.textContent = users.length;

  users.forEach(user => {
    const li = document.createElement('li');
    li.dataset.userId = user.id;

    const isCurrentUser = user.id === socket.id;

    li.innerHTML = `
      <i class="fas fa-user-tie"></i>
      ${user.name} ${isCurrentUser ? '(You)' : ''}
    `;

    if (isCurrentUser) {
      li.style.backgroundColor = 'rgba(74, 107, 255, 0.1)';
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