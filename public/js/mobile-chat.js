// Add this JavaScript to your existing client.js file or create a separate mobile-chat.js

class MobileChatHandler {
	constructor() {
		this.isKeyboardOpen = false;
		this.isMobile = window.innerWidth <= 768;
		this.initialViewportHeight = window.innerHeight;
		this.chatContainer = null;
		this.chatInput = null;
		this.chatMessages = null;
		this.chatToggleBtn = null;

		this.init();
	}

	init() {
		this.chatContainer = document.querySelector('.chat-container');
		this.chatInput = document.getElementById('chat-input');
		this.chatMessages = document.getElementById('chat-messages');
		this.chatToggleBtn = document.getElementById('chat-toggle-btn');

		if (!this.isMobile) return;

		this.setupEventListeners();
		this.setupViewportHandler();
		this.setupTouchHandling();
	}

	setupEventListeners() {
		// Chat input focus/blur events
		if (this.chatInput) {
			this.chatInput.addEventListener('focus', () => this.handleInputFocus());
			this.chatInput.addEventListener('blur', () => this.handleInputBlur());
		}

		// Chat toggle button
		if (this.chatToggleBtn) {
			this.chatToggleBtn.addEventListener('click', () => this.toggleMobileChat());
		}

		// Close chat when clicking outside (mobile)
		document.addEventListener('click', (e) => {
			if (this.isChatFullscreen() && !this.chatContainer.contains(e.target) &&
				!this.chatToggleBtn.contains(e.target)) {
				this.closeMobileChat();
			}
		});

		// Handle back button on mobile
		window.addEventListener('popstate', () => {
			if (this.isChatFullscreen()) {
				this.closeMobileChat();
			}
		});
	}

	setupViewportHandler() {
		// Detect virtual keyboard
		let timeout;
		window.addEventListener('resize', () => {
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				this.handleViewportChange();
			}, 100);
		});

		// Visual viewport API for better keyboard detection (if supported)
		if (window.visualViewport) {
			window.visualViewport.addEventListener('resize', () => {
				this.handleVisualViewportChange();
			});
		}
	}

	setupTouchHandling() {
		// Prevent chat container scroll when input is focused
		if (this.chatMessages) {
			let startY;

			this.chatMessages.addEventListener('touchstart', (e) => {
				startY = e.touches[0].clientY;
			});

			this.chatMessages.addEventListener('touchmove', (e) => {
				const currentY = e.touches[0].clientY;
				const element = this.chatMessages;

				// Prevent overscroll
				if ((element.scrollTop <= 0 && currentY > startY) ||
					(element.scrollTop >= element.scrollHeight - element.clientHeight && currentY < startY)) {
					e.preventDefault();
				}
			});
		}
	}

	handleInputFocus() {
		if (!this.isMobile) return;

		this.isKeyboardOpen = true;
		this.chatContainer?.classList.add('keyboard-active');

		// Scroll to bottom after keyboard appears
		setTimeout(() => {
			this.scrollToBottom();
			this.ensureInputVisible();
		}, 300);

		// Add body class to prevent scroll
		document.body.classList.add('keyboard-open');
	}

	handleInputBlur() {
		if (!this.isMobile) return;

		// Delay to allow for keyboard animation
		setTimeout(() => {
			this.isKeyboardOpen = false;
			this.chatContainer?.classList.remove('keyboard-active');
			document.body.classList.remove('keyboard-open');
		}, 100);
	}

	handleViewportChange() {
		const currentHeight = window.innerHeight;
		const heightDifference = this.initialViewportHeight - currentHeight;

		// If viewport height decreased significantly, keyboard is likely open
		if (heightDifference > 150) {
			if (!this.isKeyboardOpen) {
				this.handleInputFocus();
			}
		} else if (heightDifference < 50) {
			if (this.isKeyboardOpen) {
				this.handleInputBlur();
			}
		}
	}

	handleVisualViewportChange() {
		if (!window.visualViewport) return;

		const viewport = window.visualViewport;
		const keyboardHeight = window.innerHeight - viewport.height;

		if (keyboardHeight > 150 && !this.isKeyboardOpen) {
			this.handleInputFocus();
		} else if (keyboardHeight < 50 && this.isKeyboardOpen) {
			this.handleInputBlur();
		}
	}

	toggleMobileChat() {
		if (this.isChatFullscreen()) {
			this.closeMobileChat();
		} else {
			this.openMobileChat();
		}
	}

	openMobileChat() {
		if (!this.isMobile) return;

		this.chatContainer?.classList.add('chat-active');
		document.body.classList.add('chat-fullscreen');

		// Add to history stack for back button handling
		history.pushState({ chatOpen: true }, '', '');

		// Focus input after animation
		setTimeout(() => {
			this.chatInput?.focus();
			this.scrollToBottom();
		}, 300);

		// Update toggle button
		if (this.chatToggleBtn) {
			this.chatToggleBtn.innerHTML = '<i class="fas fa-times"></i>';
			this.chatToggleBtn.title = 'Close Chat';
		}
	}

	closeMobileChat() {
		if (!this.isMobile) return;

		this.chatContainer?.classList.remove('chat-active', 'keyboard-active');
		document.body.classList.remove('chat-fullscreen', 'keyboard-open');

		// Blur input
		this.chatInput?.blur();

		// Update toggle button
		if (this.chatToggleBtn) {
			this.chatToggleBtn.innerHTML = '<i class="fas fa-comment"></i>';
			this.chatToggleBtn.title = 'Open Chat';
		}
	}

	isChatFullscreen() {
		return this.chatContainer?.classList.contains('chat-active');
	}

	scrollToBottom() {
		if (this.chatMessages) {
			this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
		}
	}

	ensureInputVisible() {
		if (this.chatInput && this.isKeyboardOpen) {
			this.chatInput.scrollIntoView({
				behavior: 'smooth',
				block: 'end'
			});
		}
	}

	// Method to be called when new message is added
	onNewMessage() {
		// Auto scroll to bottom when new message arrives
		setTimeout(() => {
			this.scrollToBottom();
		}, 100);
	}

	// Handle orientation change
	handleOrientationChange() {
		setTimeout(() => {
			this.initialViewportHeight = window.innerHeight;
			this.isMobile = window.innerWidth <= 768;

			if (this.isChatFullscreen() && this.isKeyboardOpen) {
				this.ensureInputVisible();
			}
		}, 500);
	}
}

// Initialize mobile chat handler
let mobileChatHandler;

document.addEventListener('DOMContentLoaded', () => {
	mobileChatHandler = new MobileChatHandler();
});

// Handle orientation changes
window.addEventListener('orientationchange', () => {
	if (mobileChatHandler) {
		mobileChatHandler.handleOrientationChange();
	}
});

// Prevent zoom on input focus for iOS
document.addEventListener('touchstart', () => {
	const metaViewport = document.querySelector('meta[name="viewport"]');
	if (metaViewport) {
		metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
	}
});

// Add CSS to prevent body scroll when keyboard is open
const style = document.createElement('style');
style.textContent = `
  body.keyboard-open {
    position: fixed;
    width: 100%;
  }
  
  body.chat-fullscreen {
    overflow: hidden;
  }
`;
document.head.appendChild(style);