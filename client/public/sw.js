// Enhanced Service Worker for PWA offline support
const CACHE_NAME = 'opes-trading-journal-v2';
const RUNTIME_CACHE = 'opes-runtime-v2';
const DATA_CACHE = 'opes-data-v2';
const IMAGE_CACHE = 'opes-images-v2';

// Cache size limits
const MAX_RUNTIME_CACHE_SIZE = 50;
const MAX_DATA_CACHE_SIZE = 100;
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/favicon.png',
  '/src/main.tsx',
  // Add other static assets as needed
];

// Helper: Limit cache size
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxItems);
  }
}

// Helper: Check if cache is expired
function isCacheExpired(response) {
  const cachedTime = response.headers.get('sw-cache-time');
  if (!cachedTime) return false;
  const age = Date.now() - parseInt(cachedTime);
  return age > CACHE_EXPIRATION_TIME;
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Failed to cache some assets:', err);
      });
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => 
              !['opes-trading-journal-v2', 'opes-runtime-v2', 'opes-data-v2', 'opes-images-v2'].includes(name)
            )
            .map((name) => caches.delete(name))
        );
      }),
      // Claim all clients
      self.clients.claim(),
    ])
  );
});

// Enhanced Fetch event with smart caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Strategy 1: API requests - Network first, cache as backup
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful GET API responses
          if (response.ok) {
            const responseClone = response.clone();
            const headers = new Headers(responseClone.headers);
            headers.append('sw-cache-time', Date.now().toString());
            
            caches.open(DATA_CACHE).then((cache) => {
              const modifiedResponse = new Response(responseClone.body, {
                status: responseClone.status,
                statusText: responseClone.statusText,
                headers: headers,
              });
              cache.put(request, modifiedResponse);
              limitCacheSize(DATA_CACHE, MAX_DATA_CACHE_SIZE);
            });
          }
          return response;
        })
        .catch(async () => {
          // Network failed, try cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse && !isCacheExpired(cachedResponse)) {
            return cachedResponse;
          }
          // Return offline response
          return new Response(
            JSON.stringify({ 
              error: 'Offline', 
              message: 'No internet connection. Some data may be outdated.' 
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 503,
            }
          );
        })
    );
    return;
  }

  // Strategy 2: Images - Cache first, network fallback
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, responseClone);
              limitCacheSize(IMAGE_CACHE, 50);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Strategy 3: Static assets - Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
              limitCacheSize(RUNTIME_CACHE, MAX_RUNTIME_CACHE_SIZE);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });

      // Return cached version immediately if available, update in background
      return cachedResponse || fetchPromise;
    })
  );
});

// Message event for manual cache clearing
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        });
      })
    );
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic background sync (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-trades') {
    event.waitUntil(
      // Sync logic here - can be implemented later
      Promise.resolve()
    );
  }
});
