/* Service worker: офлайн-режим для всех игр.
   Все ресурсы приложения лежат локально (одного origin), поэтому
   используем precache + cache-first с обновлением по сети. */

const CACHE_NAME = 'burfool-v1';
const PRECACHE_URLS = [
  './',
  './index.html',
  './durak.html',
  './bur-kozel.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './js/tf.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS.map((u) => new URL(u, self.location).href)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('burfool-') && k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Кэшируем только свой origin — внешних зависимостей больше нет
  if (url.origin !== self.location.origin) return;

  // Навигация: сначала кэш, если нет — сеть, а при офлайне — index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(req, { ignoreSearch: true })
        .then((cached) => cached || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        }).catch(() => caches.match(new URL('./index.html', self.location).href)))
    );
    return;
  }

  // Остальные ассеты: cache-first с обновлением кэша по сети
  event.respondWith(
    caches.match(req)
      .then((cached) => cached || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }))
  );
});
