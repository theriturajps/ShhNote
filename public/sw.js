const CACHE_NAME = 'shhnote-pwa-install-only';
const INSTALL_EVENT = 'beforeinstallprompt';

self.addEventListener('install', (event) => {
	// Skip the waiting phase to activate immediately
	self.skipWaiting();
	console.log('Service Worker installed (install-only mode)');
});

self.addEventListener('activate', (event) => {
	console.log('Service Worker activated (install-only mode)');
});

self.addEventListener('fetch', (event) => {
	// Let the browser handle the fetch normally
	return;
});