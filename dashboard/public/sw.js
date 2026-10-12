/**
 * ColorIq — Service Worker for PWA offline support
 * Supports: static caching, API response caching, offline data entry
 */

const CACHE_NAME = 'coloriq-v2';
const API_CACHE = 'coloriq-api-v1';
const OFFLINE_QUEUE = 'coloriq-offline-queue';

const STATIC_ASSETS = [
  '/',
  '/capture',
  '/formulate',
  '/clients',
  '/service',
  '/login',
];

// API endpoints to cache for offline
const CACHEABLE_API = [
  '/api/clients',
  '/api/user/brands',
  '/api/v1/inventory',
  '/api/v1/formulas/list',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE).map((k) => caches.delete(k))
        )
      ),
      // Process offline queue
      processOfflineQueue(),
    ])
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    if (event.request.method === 'GET') {
      // Cache-first for GET API requests
      event.respondWith(
        caches.match(event.request).then((cached) => {
          const fetched = fetch(event.request)
            .then((response) => {
              if (response.ok) {
                const clone = response.clone();
                caches.open(API_CACHE).then((cache) => cache.put(event.request, clone));
              }
              return response;
            })
            .catch(() => cached || new Response(JSON.stringify({ error: 'Offline' }), { status: 503 }));
          return cached || fetched;
        })
      );
    } else if (event.request.method === 'POST' || event.request.method === 'PUT') {
      // Queue non-GET requests for background sync
      event.respondWith(
        fetch(event.request.clone()).catch(() => {
          return queueOfflineRequest(event.request).then(() => {
            return new Response(JSON.stringify({ queued: true, message: 'Saved offline, will sync when connected' }), {
              status: 202,
              headers: { 'Content-Type': 'application/json' },
            });
          });
        })
      );
    }
    return;
  }

  // Handle static assets
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});

// Listen for background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(processOfflineQueue());
  }
});

// Queue offline requests
async function queueOfflineRequest(request) {
  const body = await request.clone().text();
  const entry = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body,
    timestamp: Date.now(),
  };

  const db = await openDB();
  const tx = db.transaction(OFFLINE_QUEUE, 'readwrite');
  tx.objectStore(OFFLINE_QUEUE).add(entry);
  await tx.complete;
}

// Process offline queue
async function processOfflineQueue() {
  const db = await openDB();
  const tx = db.transaction(OFFLINE_QUEUE, 'readonly');
  const store = tx.objectStore(OFFLINE_QUEUE);
  const entries = await store.getAll();

  for (const entry of entries) {
    try {
      await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body,
      });
      // Remove from queue on success
      const deleteTx = db.transaction(OFFLINE_QUEUE, 'readwrite');
      deleteTx.objectStore(OFFLINE_QUEUE).delete(entry.id);
      await deleteTx.complete;
    } catch (e) {
      // Will retry on next sync
    }
  }
}

// Simple IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('coloriq-offline', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE)) {
        db.createObjectStore(OFFLINE_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
