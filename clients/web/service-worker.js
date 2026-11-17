// Retired: the dictionary no longer uses a service worker (lookups need the network anyway).
// This file stays deployed so phones that registered an older worker pick it up on their next
// update check, clear the dictionary's caches, and unregister. Do not delete it for months.
// It has no fetch handler, so it never touches any request on this origin.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('advanced-dictionary')).map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.navigate(c.url));
  })());
});
