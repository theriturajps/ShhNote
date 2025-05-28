const CACHE_NAME = 'shhnote-v1';
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
	'/images/logo-512.png'
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then((cache) => cache.addAll(ASSETS_TO_CACHE))
	);
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
});

// Intercept fetch requests to serve cached assets
self.addEventListener('fetch', (event) => {
	if (event.request.url.includes('/socket.io/')) {
		return; // Skip caching for Socket.io connections
	}

	event.respondWith(
		caches.match(event.request)
			.then((response) => {
				if (response) {
					return response;
				}

				return fetch(event.request).then((response) => {
					// Check if we received a valid response
					if (!response || response.status !== 200 || response.type !== 'basic') {
						return response;
					}

					// Clone the response
					const responseToCache = response.clone();

					caches.open(CACHE_NAME)
						.then((cache) => {
							cache.put(event.request, responseToCache);
						});

					return response;
				}).catch(() => {
					// If both fetch and cache fail, show a generic offline page
					return caches.match('/offline.html');
				});
			})
	);
});