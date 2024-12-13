const CACHE_NAME = 'car-warning-system-v1';
const urlsToCache = [
    '/VD-PWA/',
    '/VD-PWA/index.html',
    '/VD-PWA/styles.css',
    '/VD-PWA/app.js',
    '/VD-PWA/manifest.json',
    '/VD-PWA/videos/car-no-obstacle.mp4',
    '/VD-PWA/videos/car-medium-distance.mp4',
    '/VD-PWA/videos/car-close-obstacle.mp4'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
}); 