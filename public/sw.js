/*
 * ArthaSetu service worker.
 *
 * The app is installed on phones in places where the connection is the thing
 * most likely to fail. Without this file every launch re-downloads the whole
 * JavaScript bundle before anything can be drawn — which is why the browser's
 * loading bar was visible on launch even on a fast connection, and why on a
 * village 2G link it would be visible for a very long time.
 *
 * Strategy, per kind of request:
 *
 *   /_next/static/**      cache-first. The filenames contain a content hash, so
 *                         a cached copy can never be the wrong copy. This is the
 *                         bulk of the bytes and after one visit it costs zero.
 *   images, icons, fonts  stale-while-revalidate. Shown instantly, refreshed in
 *                         the background.
 *   navigations           network-first, falling back to the last copy of that
 *                         page and then to /offline. Never serve stale HTML while
 *                         the network is available: an old document points at
 *                         hashed chunks that a later deployment has replaced.
 *   /api/**, RSC payloads network only. Both are tied to live server state.
 *   /videos/**            network only. Range requests, and far too large to be
 *                         worth a cache slot on a low-end phone.
 *   /<key>/admin/**       never cached. Reachable only through a secret path
 *                         segment and no business being left on the device.
 *
 * Escape hatch: loading any page with ?nosw=1 unregisters this worker and drops
 * every cache. If it ever misbehaves during a demo, that is the way out.
 */

const VERSION = 'v1';
const ASSET_CACHE = `arthasetu-assets-${VERSION}`;
const PAGE_CACHE = `arthasetu-pages-${VERSION}`;
const SHELL_CACHE = `arthasetu-shell-${VERSION}`;
const CURRENT_CACHES = [ASSET_CACHE, PAGE_CACHE, SHELL_CACHE];

const OFFLINE_URL = '/offline';

/** Precached so the offline screen is never itself a network request. */
const SHELL_URLS = [OFFLINE_URL, '/icons/icon-192.png'];

const IMMUTABLE = /^\/_next\/static\//;
const REVALIDATE = /^\/(icons|images|fonts)\//;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // Individually, so one missing file cannot fail the whole install and
      // leave the app with no worker at all.
      .then((cache) => Promise.all(SHELL_URLS.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !CURRENT_CACHES.includes(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'arthasetu-purge') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/videos/')) return;
  if (url.pathname.includes('/admin')) return;
  if (url.pathname === '/sw.js') return;

  // React Server Component payloads belong to one build. Replaying an old one
  // renders a tree the current deployment no longer knows how to hydrate.
  if (url.searchParams.has('_rsc') || request.headers.get('RSC') === '1') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (IMMUTABLE.test(url.pathname)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (REVALIDATE.test(url.pathname) || url.pathname === '/_next/image') {
    event.respondWith(staleWhileRevalidate(event, request, ASSET_CACHE));
  }
});

/** Only responses we are allowed to replay later. */
function isStorable(response) {
  return Boolean(response) && response.ok && response.type === 'basic';
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (isStorable(response)) {
    cache.put(request, response.clone());
  }
  return response;
}

function staleWhileRevalidate(event, request, cacheName) {
  return caches.open(cacheName).then(async (cache) => {
    const hit = await cache.match(request);
    const refresh = fetch(request)
      .then((response) => {
        if (isStorable(response)) cache.put(request, response.clone());
        return response;
      })
      .catch(() => hit);

    if (hit) {
      event.waitUntil(refresh);
      return hit;
    }
    return refresh;
  });
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (isStorable(response)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;

    const shell = await caches.open(SHELL_CACHE);
    const offline = await shell.match(OFFLINE_URL);
    if (offline) return offline;

    throw new Error('offline and nothing cached for this page');
  }
}
