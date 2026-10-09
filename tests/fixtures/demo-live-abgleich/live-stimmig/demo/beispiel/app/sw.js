'use strict';
const CACHE = 'vivodepot-shell-v900';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE)); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((namen) => Promise.all(namen
    .filter((n) => n !== CACHE && n.indexOf('vivodepot-shell-') === 0)
    .map((n) => caches.delete(n)))));
});
