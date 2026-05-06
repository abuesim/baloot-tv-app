// Service Worker — أكك لايف
const CACHE = "akak-v1";
const PRECACHE = ["/manifest.json", "/icon-192x192.png", "/icon-512x512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // تجاهل طلبات API و SSE
  const url = e.request.url;
  if (url.includes("/api/")) return;
  if (url.includes("_next/")) return;

  e.respondWith(
    caches.match(e.request).then((cached) => cached ?? fetch(e.request))
  );
});
