const CACHE_NAME = 'quiz-app-v1.0.1';
const STATIC_CACHE = 'quiz-static-v1.0.1';
const DYNAMIC_CACHE = 'quiz-dynamic-v1.0.1';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/about.html',
    '/contact.html',
    '/css/style.css',
    '/css/auth.css',
    '/css/about.css',
    '/css/contact.css',
    '/js/app.js',
    '/js/userManager.js',
    '/js/authUI.js',
    '/js/about.js',
    '/js/contact.js',
    '/images/favicon.ico',
    '/images/OB_PIC.JPG'
];

// Question bank files to cache on demand
const QUESTION_FILES = [
    '/js/questions-html-intro.js',
    '/js/questions-text-formatting.js',
    '/js/questions-lists.js',
    '/js/questions-links.js',
    '/js/questions-images.js',
    '/js/questions-media.js',
    '/js/questions-tables.js',
    '/js/questions-forms.js',
    '/js/questions-other.js'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .catch(error => {
                console.log('Cache installation failed:', error);
            })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle question bank files with lazy loading
    if (url.pathname.includes('/js/questions-') && url.pathname.endsWith('.js')) {
        event.respondWith(
            caches.open(DYNAMIC_CACHE)
                .then(cache => {
                    return cache.match(request)
                        .then(response => {
                            if (response) {
                                console.log('Serving question bank from cache:', url.pathname);
                                return response;
                            }
                            
                            // Fetch from network and cache
                            return fetch(request)
                                .then(networkResponse => {
                                    if (networkResponse.status === 200) {
                                        cache.put(request, networkResponse.clone());
                                        console.log('Cached question bank:', url.pathname);
                                    }
                                    return networkResponse;
                                })
                                .catch(error => {
                                    console.log('Failed to fetch question bank:', error);
                                    return new Response('[]', {
                                        headers: { 'Content-Type': 'application/javascript' }
                                    });
                                });
                        });
                })
        );
        return;
    }

    // Handle static files
    if (STATIC_FILES.includes(url.pathname) || url.pathname === '/') {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        console.log('Serving static file from cache:', url.pathname);
                        return response;
                    }
                    
                    return fetch(request)
                        .then(networkResponse => {
                            if (networkResponse.status === 200) {
                                const responseClone = networkResponse.clone();
                                caches.open(STATIC_CACHE)
                                    .then(cache => cache.put(request, responseClone));
                            }
                            return networkResponse;
                        });
                })
                .catch(error => {
                    console.log('Fetch failed for static file:', error);
                    // Return offline page or fallback
                    if (url.pathname.endsWith('.html')) {
                        return caches.match('/index.html');
                    }
                })
        );
        return;
    }

    // Handle images with optimization
    if (url.pathname.includes('/images/')) {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        console.log('Serving image from cache:', url.pathname);
                        return response;
                    }
                    
                    return fetch(request)
                        .then(networkResponse => {
                            if (networkResponse.status === 200) {
                                const responseClone = networkResponse.clone();
                                caches.open(DYNAMIC_CACHE)
                                    .then(cache => cache.put(request, responseClone));
                            }
                            return networkResponse;
                        });
                })
        );
        return;
    }

    // Default strategy for other requests
    event.respondWith(
        fetch(request)
            .catch(error => {
                console.log('Fetch failed:', error);
                return new Response('Network error', { status: 503 });
            })
    );
});

// Background sync for offline data
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        console.log('Background sync triggered');
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    // Sync any pending data when back online
    try {
        // You can add offline data sync logic here
        console.log('Background sync completed');
    } catch (error) {
        console.log('Background sync failed:', error);
    }
}

// Handle push notifications (for future use)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/images/favicon.ico',
            badge: '/images/favicon.ico',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
}); 