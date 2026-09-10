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
 *   /videos/**            cache-first, downloaded whole exactly once. Leaving it
 *                         to the network made the moving background vanish
 *                         offline, and the pages looked like the old design.
 *   /<key>/admin/**       never cached. Reachable only through a secret path
 *                         segment and no business being left on the device.
 *
 * Every screen is also downloaded ahead of time after a launch (APP_PAGES).
 * A screen this worker cannot answer is exactly where Chrome falls back to its
 * own saved copy of the page, which can be weeks old — and was: the offline
 * dashboard first reported in testing was the design from before the redesign.
 *
 * Escape hatch: loading any page with ?nosw=1 unregisters this worker and drops
 * every cache. If it ever misbehaves during a demo, that is the way out.
 */

const VERSION = 'v2';
const ASSET_CACHE = `arthasetu-assets-${VERSION}`;
const PAGE_CACHE = `arthasetu-pages-${VERSION}`;
const SHELL_CACHE = `arthasetu-shell-${VERSION}`;
// Deliberately not versioned: re-downloading a 6.5 MB clip because the worker
// changed would cost a rural user more than every other change put together.
const MEDIA_CACHE = 'arthasetu-media-v1';
const CURRENT_CACHES = [ASSET_CACHE, PAGE_CACHE, SHELL_CACHE, MEDIA_CACHE];

const OFFLINE_URL = '/offline';

/** Precached so the offline screen is never itself a network request. */
const SHELL_URLS = [OFFLINE_URL, '/icons/icon-192.png'];

/** Every screen reachable from the menu. Dynamic detail pages are cached as visited. */
const APP_PAGES = [
  '/',
  '/dashboard',
  '/advisor',
  '/planner',
  '/schemes',
  '/profile',
  '/saved-plans',
  '/saved-advice',
  '/onboarding',
  '/login',
  '/signup',
];

/**
 * Widest optimised image saved ahead of time. The logo is drawn at 32-128px;
 * photographs are requested at 384px and up, at every width a phone might ask
 * for, which would spend megabytes of the user's data on decoration.
 */
const SMALL_IMAGE_MAX_WIDTH = 256;

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
  if (event.data === 'arthasetu-warm') {
    // Replies when finished, so the page records the job as done only once it
    // really is. An older worker that does not know this message never replies,
    // which is what makes the page ask again after the upgrade.
    const reply = event.ports && event.ports[0];
    event.waitUntil(warmAppPages().then(() => reply && reply.postMessage('arthasetu-warmed')));
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
  if (url.pathname.startsWith('/videos/')) {
    event.respondWith(cachedVideo(request));
    return;
  }
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

/*
 * Every lookup below ignores Vary. Optimised images are served `Vary: Accept`,
 * and a copy saved by a plain fetch, which accepts any type, is not a match for
 * the browser's own image request, which lists AVIF and WebP. So every saved
 * image quietly missed, and offline screens showed a broken tile where the logo
 * goes. Ignoring it is safe here: a saved PNG is a valid answer to a browser that
 * would also have accepted WebP, and a hashed chunk is the same bytes whatever
 * the request looked like.
 */
const MATCH = { ignoreVary: true };

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, MATCH);
  if (hit) return hit;

  const response = await fetch(request);
  if (isStorable(response)) {
    cache.put(request, response.clone());
  }
  return response;
}

function staleWhileRevalidate(event, request, cacheName) {
  return caches.open(cacheName).then(async (cache) => {
    const hit = await cache.match(request, MATCH);
    const refresh = fetch(request)
      .then((response) => {
        if (isStorable(response)) cache.put(request, response.clone());
        return response;
      })
      // Offline with nothing saved: a real network error, rather than
      // resolving to undefined and leaving the browser to guess.
      .catch(() => hit || Response.error());

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
    const hit = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
    if (hit) return hit;

    const shell = await caches.open(SHELL_CACHE);
    const offline = await shell.match(OFFLINE_URL);
    if (offline) return offline;

    throw new Error('offline and nothing cached for this page');
  }
}

/** Downloads in progress, so concurrent requests for one clip share a download. */
const videoDownloads = new Map();

/*
 * A <video> asks for byte ranges, and a partial (206) response cannot be stored.
 * So the first request fetches the WHOLE file without a Range header and hands
 * that complete 200 straight to the player — Chrome plays a full answer to a
 * range request without complaint — while the same stream is written to the
 * cache. One download, used twice. A second request for the same clip while
 * that is still in flight waits for it rather than starting a second copy.
 */
async function cachedVideo(request) {
  const url = request.url;
  const cache = await caches.open(MEDIA_CACHE);

  const hit = await cache.match(url);
  if (hit) return hit;

  if (videoDownloads.has(url)) {
    await videoDownloads.get(url);
    return (await cache.match(url)) || fetch(request);
  }

  const response = await fetch(url);
  if (!isStorable(response)) return response;

  const stored = cache
    .put(url, response.clone())
    .catch(() => {})
    .finally(() => videoDownloads.delete(url));
  videoDownloads.set(url, stored);
  return response;
}

/*
 * Fetches every app screen and every static file those screens reference.
 * Sequential on purpose: on a slow link, eleven parallel page downloads would
 * compete with whatever the user is actually doing. Already-cached files are
 * skipped, so after the first run this costs only the HTML.
 */
async function warmAppPages() {
  const pages = await caches.open(PAGE_CACHE);
  const assets = await caches.open(ASSET_CACHE);

  for (const path of APP_PAGES) {
    try {
      const response = await fetch(path, { credentials: 'same-origin' });
      // A redirected response cannot be replayed for a navigation.
      if (!isStorable(response) || response.redirected) continue;

      const html = await response.clone().text();
      await pages.put(path, response);

      const refs = new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || []);

      // Optimised images appear HTML-escaped (&amp;) in srcset and preload tags.
      // Without the small ones, an offline screen showed an empty tile where the
      // logo goes, because each screen draws it at a size no other screen used.
      for (const match of html.match(/\/_next\/image\?url=[^"'\s,\\]+/g) || []) {
        const ref = match.replace(/&amp;/g, '&');
        const width = Number(new URL(ref, self.location.origin).searchParams.get('w'));
        if (width > 0 && width <= SMALL_IMAGE_MAX_WIDTH) refs.add(ref);
      }
      for (const ref of refs) {
        try {
          if (await assets.match(ref, MATCH)) continue;
          const asset = await fetch(ref);
          if (isStorable(asset)) await assets.put(ref, asset);
        } catch {
          // One missing file must not stop the rest of the screens being saved.
        }
      }
    } catch {
      // Offline part-way through: whatever was saved so far is still useful.
    }
  }
}
