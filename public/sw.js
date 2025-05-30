const CACHE_NAME = 'shhnote-v1';

// Only cache essential static assets for faster loading
const ASSETS_TO_CACHE = [
	'/',
	'/index.html',
	'/css/style.css',
	'/js/client.js',
	'/js/socket.js',
	'/js/notifications.js',
	'/js/qrcode.min.js',
	'/images/logo.png',
	'/images/shh.png',
	'/images/github.png',
	'/images/logo-192.png',
	'/images/logo-512.png',
	'/manifest.json'
];

self.addEventListener('install', (event) => {
	// Cache only essential assets for faster loading when online
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then((cache) => cache.addAll(ASSETS_TO_CACHE))
	);
	// Skip waiting to activate immediately
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cache) => {
					if (cache !== CACHE_NAME) {
						return caches.delete(cache);
					}
				})
			);
		})
	);
	// Take control of all clients immediately
	return self.clients.claim();
});