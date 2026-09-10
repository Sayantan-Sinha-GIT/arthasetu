/**
 * Guards the launch path: the boot screen that removes the blank first frame,
 * and the service worker that decides what a second launch costs.
 *
 * The service worker is not grepped — it is loaded into a sandbox with stubbed
 * `caches` and `fetch` and actually driven. Each case primes the cache with one
 * body and has the network return a different one, so the body that comes back
 * proves which strategy ran, rather than proving a regex still matches.
 *
 *   npx tsx scripts/test-app-shell-boot.ts
 */
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok && detail) console.log(`        ${detail}`);
}

const read = (p: string) => readFileSync(p, 'utf8');

const CACHED = 'FROM-CACHE';
const NETWORK = 'FROM-NETWORK';
const ASSETS = 'arthasetu-assets-v2';
const PAGES = 'arthasetu-pages-v2';
const SHELL = 'arthasetu-shell-v2';
const MEDIA = 'arthasetu-media-v1';

function sameOrigin(body: string, varyOnAccept = false) {
  const res = new Response(body, {
    status: 200,
    headers: varyOnAccept ? { Vary: 'Accept' } : undefined,
  });
  // Constructed responses report type 'default'; a same-origin fetch inside a
  // worker reports 'basic', which is what the worker checks before storing.
  Object.defineProperty(res, 'type', { value: 'basic' });
  return res;
}

/**
 * Each saved copy remembers the Accept header it was saved under, because the
 * real Cache API compares it against a `Vary: Accept` response. A stub that
 * ignored Vary let every saved image look reachable in tests while every one of
 * them missed in Chrome.
 */
type Entry = { res: Response; accept: string };
type Bucket = Map<string, Entry>;
const acceptOf = (req: Request | string) =>
  typeof req === 'string' ? '' : req.headers.get('accept') ?? '';

function makeWorker(opts: { offline?: boolean; respond?: (url: string) => string } = {}) {
  const store = new Map<string, Bucket>();
  const listeners: Record<string, ((e: unknown) => void)[]> = {};

  const cacheStorage = {
    async open(name: string) {
      if (!store.has(name)) store.set(name, new Map());
      const bucket = store.get(name) as Bucket;
      const key = (req: Request | string) =>
        typeof req === 'string' ? new URL(req, 'https://x.test').href : req.url;

      return {
        async match(req: Request | string, o?: { ignoreSearch?: boolean; ignoreVary?: boolean }) {
          const url = key(req);
          let entry = bucket.get(url);
          if (!entry && o?.ignoreSearch) {
            const bare = url.split('?')[0];
            for (const [k, v] of bucket) if (k.split('?')[0] === bare) entry = v;
          }
          if (!entry) return undefined;
          const variesOnAccept = (entry.res.headers.get('vary') ?? '').toLowerCase().includes('accept');
          if (variesOnAccept && !o?.ignoreVary && entry.accept !== acceptOf(req)) return undefined;
          return entry.res.clone();
        },
        async put(req: Request | string, res: Response) {
          bucket.set(key(req), { res, accept: acceptOf(req) });
        },
        async add(url: string) {
          if (opts.offline) throw new Error('offline');
          bucket.set(new URL(url, 'https://x.test').href, { res: sameOrigin(url), accept: '' });
        },
      };
    },
    async keys() {
      return [...store.keys()];
    },
    async delete(name: string) {
      return store.delete(name);
    },
  };

  const sandbox = {
    self: {
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        (listeners[type] ||= []).push(fn);
      },
      skipWaiting: () => Promise.resolve(),
      clients: { claim: () => Promise.resolve() },
      location: { origin: 'https://x.test' },
    },
    caches: cacheStorage,
    fetch: async (input: Request | string) => {
      if (opts.offline) throw new Error('offline');
      const url = typeof input === 'string' ? input : input.url;
      return sameOrigin(opts.respond ? opts.respond(url) : NETWORK);
    },
    URL,
    Response,
    Request,
    Headers,
    Promise,
    Error,
    Boolean,
    Map,
    Set,
    console,
  };

  runInContext(read('public/sw.js'), createContext(sandbox), { filename: 'sw.js' });

  return {
    cacheStorage,

    async fire(type: string, data?: unknown, ports?: { postMessage: (m: unknown) => void }[]) {
      const waits: Promise<unknown>[] = [];
      const event = { data, ports, waitUntil: (p: Promise<unknown>) => waits.push(p) };
      for (const fn of listeners[type] || []) fn(event);
      await Promise.all(waits);
    },

    async seed(cacheName: string, url: string, body = CACHED, varyOnAccept = false) {
      const c = await cacheStorage.open(cacheName);
      await c.put(new Request(url), sameOrigin(body, varyOnAccept));
    },

    /** Runs one request through the worker and reports which path it took. */
    async route(
      url: string,
      init: { mode?: string; method?: string; headers?: Record<string, string> } = {}
    ): Promise<string> {
      const request = new Request(url, { method: init.method, headers: init.headers });
      Object.defineProperty(request, 'mode', { value: init.mode ?? 'no-cors' });

      let responded: Promise<Response> | undefined;
      const waits: Promise<unknown>[] = [];
      for (const fn of listeners.fetch || []) {
        fn({
          request,
          respondWith: (p: Promise<Response>) => {
            responded = p;
          },
          waitUntil: (p: Promise<unknown>) => waits.push(p),
        });
      }
      if (!responded) return 'unhandled';
      try {
        const res = await responded;
        await Promise.all(waits.map((p) => p.catch(() => undefined)));
        return await res.text();
      } catch {
        return 'threw';
      }
    },
  };
}

async function main() {
  // ── The boot screen ────────────────────────────────────────────────────────

  console.log('— the boot screen paints from the HTML alone —');

  const boot = read('src/components/layout/BootScreen.tsx');
  const layout = read('src/app/layout.tsx');
  const globals = read('src/app/globals.css');
  const intro = read('src/components/layout/IntroSplash.tsx');

  check(
    'the boot screen is rendered before the providers, not inside them',
    layout.indexOf('<BootScreen />') > -1 &&
      layout.indexOf('<BootScreen />') < layout.indexOf('<Providers>'),
    'it has to be in the server response, not something React draws after hydrating'
  );

  // If the boot screen ever referenced a custom property it would render
  // unstyled until globals.css arrives — the exact wait it exists to cover. So
  // the colours are literals, and these keep the literals honest against the
  // design tokens.
  function token(scope: 'root' | 'dark', name: string): string {
    const block = scope === 'root' ? /:root\s*\{([\s\S]*?)\}/ : /\.dark\s*\{([\s\S]*?)\}/;
    const body = globals.match(block)?.[1] ?? '';
    return (body.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{3,8})`))?.[1] ?? '').toUpperCase();
  }

  const pairs: [string, string, string][] = [
    ['the light background matches --color-background', token('root', '--color-background'), 'background'],
    ['the dark background matches the .dark override', token('dark', '--color-background'), 'background'],
    ['the light text colour matches --color-foreground', token('root', '--color-foreground'), 'color'],
    ['the dark text colour matches the .dark override', token('dark', '--color-foreground'), 'color'],
  ];
  for (const [label, value, prop] of pairs) {
    check(label, value !== '' && boot.includes(`${prop}:${value}`), `expected ${prop}:${value}`);
  }

  check(
    'no custom property is referenced',
    !/var\(--/.test(boot),
    'globals.css is a render-blocking link that has not necessarily arrived yet'
  );
  check(
    'the mark travels in the document rather than as a request',
    boot.includes('BOOT_LOGO_DATA_URI') && !/src="\//.test(boot),
    'a second request defeats the point on a slow link'
  );
  check('it is hidden from assistive technology', /id="as-boot"[\s\S]{0,60}aria-hidden="true"/.test(boot));
  check(
    'it fades itself out even if JavaScript never arrives',
    boot.includes('as-boot-bail') && /animation:as-boot-bail[^;]*forwards/.test(boot),
    'otherwise a dead bundle leaves the user staring at a splash forever'
  );
  check('reduced motion is respected', boot.includes('prefers-reduced-motion:reduce'));

  const dataUri = read('src/lib/boot-logo.ts').match(/'data:image\/png;base64,([^']+)'/)?.[1] ?? '';
  const logoBytes = Buffer.from(dataUri, 'base64');
  check('the inlined mark is a real PNG', logoBytes.subarray(1, 4).toString() === 'PNG');
  check(
    'the inlined mark stays under 8KB',
    logoBytes.length > 0 && logoBytes.length < 8 * 1024,
    `${logoBytes.length} bytes — it is carried in every HTML response`
  );

  console.log('\n— and is taken down by the client —');

  check(
    'IntroSplash dismisses the boot screen',
    intro.includes("classList.add('as-boot-out')") && intro.includes("classList.add('as-boot-done')")
  );
  check(
    'it dismisses by flagging <html>, never by deleting the node',
    !/\.remove\(\)/.test(intro) && intro.includes('document.documentElement'),
    'the boot screen is server-rendered inside the root layout, so React owns that node'
  );
  check(
    'the boot screen cannot come back on a client-side navigation',
    boot.includes(':root.as-boot-done #as-boot{display:none}') &&
      intro.includes("classList.contains('as-boot-done')"),
    'the app navigates without a document load; the splash must play once'
  );
  check(
    'the hold is measured from navigation start, not from mount',
    intro.includes('performance.now()') && intro.includes('MIN_VISIBLE_MS -'),
    'measuring from mount would charge a slow connection the splash time twice'
  );
  check(
    'the removal delay matches the CSS transition',
    Number(intro.match(/FADE_MS = (\d+)/)?.[1]) ===
      Number(boot.match(/transition:opacity \.(\d)s/)?.[1]) * 100,
    'a shorter delay cuts the fade off; a longer one holds a blank overlay in place'
  );

  // ── The service worker, actually run ───────────────────────────────────────

  console.log('\n— the service worker, driven for real —');

  const w = makeWorker();
  await w.fire('install');
  await w.fire('activate');

  // Everything below is primed in the cache with CACHED and served NETWORK by
  // the stub network, so the body that comes back names the strategy.
  await w.seed(ASSETS, 'https://x.test/_next/static/chunks/main-abc123.js');
  await w.seed(ASSETS, 'https://x.test/images/pottery-artisan.webp');
  await w.seed(ASSETS, 'https://x.test/_next/image?url=%2Fimages%2Fx.png&w=64');
  await w.seed(PAGES, 'https://x.test/advisor');

  check(
    'hashed chunks come from cache — this is the bulk of a cold launch',
    (await w.route('https://x.test/_next/static/chunks/main-abc123.js')) === CACHED
  );
  check(
    'images are shown from cache and refreshed behind the user',
    (await w.route('https://x.test/images/pottery-artisan.webp')) === CACHED
  );
  check(
    'optimised images take the same path',
    (await w.route('https://x.test/_next/image?url=%2Fimages%2Fx.png&w=64')) === CACHED
  );

  const logo128 = 'https://x.test/_next/image?url=%2Fimages%2Flogo-mark.png&w=128&q=75';
  const imageAccept = { Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' };
  await w.seed(ASSETS, logo128, CACHED, true);
  check(
    'a saved image is served even though the browser asks for it differently than it was saved',
    (await w.route(logo128, { headers: imageAccept })) === CACHED,
    'images are served Vary: Accept; honouring that, every saved image missed and the logo broke offline'
  );

  const deadImages = makeWorker({ offline: true });
  await deadImages.seed(ASSETS, logo128, CACHED, true);
  check(
    'and it is served with no connection at all',
    (await deadImages.route(logo128, { headers: imageAccept })) === CACHED
  );
  check(
    'a page navigation prefers the network, so a new deployment is never masked',
    (await w.route('https://x.test/advisor', { mode: 'navigate' })) === NETWORK,
    'stale HTML points at hashed chunks a later deployment has replaced'
  );

  console.log('\n— and stays out of the way of what it must not touch —');

  const untouched: [string, string, { mode?: string; headers?: Record<string, string> }][] = [
    ['the advisor API', 'https://x.test/api/advisor', {}],
    ['an RSC payload identified by query', 'https://x.test/dashboard?_rsc=1a2b3', {}],
    ['an RSC payload identified by header', 'https://x.test/dashboard', { headers: { RSC: '1' } }],
    ['the admin console behind its secret path', 'https://x.test/s3cr3t/admin/schemes', { mode: 'navigate' }],
    ['a cross-origin request', 'https://firestore.googleapis.com/v1/x', {}],
    ['the worker script itself', 'https://x.test/sw.js', {}],
  ];
  for (const [label, url, init] of untouched) {
    check(`${label} is left to the network`, (await w.route(url, init)) === 'unhandled');
  }
  check(
    'a non-GET request is left to the network',
    (await w.route('https://x.test/_next/static/chunks/main-abc123.js', { method: 'POST' })) ===
      'unhandled',
    'replaying a write from cache would be a correctness bug, not a speed one'
  );

  console.log('\n— the background video, so the redesign survives going offline —');

  const clip = 'https://x.test/videos/dark-mode-video.mp4';
  check(
    'the first request plays straight from the network',
    (await w.route(clip, { headers: { Range: 'bytes=0-' } })) === NETWORK
  );
  check(
    'and the whole clip is saved while it plays',
    (await (await w.cacheStorage.open(MEDIA)).match(clip)) !== undefined,
    'without it the moving background vanished offline and the app looked like its old design'
  );

  const offlineClip = makeWorker({ offline: true });
  await offlineClip.seed(MEDIA, clip);
  check(
    'a saved clip plays with no connection',
    (await offlineClip.route(clip, { headers: { Range: 'bytes=0-' } })) === CACHED
  );

  const upgraded = makeWorker();
  await upgraded.seed(MEDIA, clip);
  await upgraded.seed('arthasetu-assets-v1', 'https://x.test/old.js');
  await upgraded.fire('activate');
  const kept = await upgraded.cacheStorage.keys();
  check(
    'a worker update keeps the saved clip rather than downloading it again',
    kept.includes(MEDIA) && !kept.includes('arthasetu-assets-v1')
  );

  console.log('\n— every screen saved ahead of time —');

  const warm = makeWorker({
    respond: (url) =>
      url.endsWith('.js')
        ? 'chunk'
        : `<html><script src="/_next/static/chunks/page${new URL(url, 'https://x.test').pathname.replace(/\W/g, '-')}.js"></script>` +
          `<script>self.__next_f.push([1,"\\"/_next/static/chunks/shared.js\\""])</script>` +
          `<img srcSet="/_next/image?url=%2Fimages%2Flogo-mark.png&amp;w=32&amp;q=75 1x, /_next/image?url=%2Fimages%2Flogo-mark.png&amp;w=64&amp;q=75 2x"` +
          ` src="/_next/image?url=%2Fimages%2Fhero.jpg&amp;w=1920&amp;q=75"/></html>`,
  });
  await warm.fire('install');
  await warm.fire('activate');
  let warmReply: unknown = null;
  await warm.fire('message', 'arthasetu-warm', [{ postMessage: (m) => (warmReply = m) }]);

  const warmedPages = await warm.cacheStorage.open(PAGES);
  const warmedAssets = await warm.cacheStorage.open(ASSETS);
  const screens = ['/', '/dashboard', '/advisor', '/planner', '/schemes', '/profile', '/saved-plans', '/saved-advice'];
  const missingScreens: string[] = [];
  for (const s of screens) if (!(await warmedPages.match(s))) missingScreens.push(s);
  check(
    'every menu screen is saved, not only the ones already visited',
    missingScreens.length === 0,
    `missing: ${missingScreens.join(', ')} — an unsaved screen is where Chrome shows its own old copy`
  );
  check(
    'the code each screen needs is saved with it',
    (await warmedAssets.match('/_next/static/chunks/page-dashboard.js')) !== undefined,
    'a saved page without its scripts shows the boot screen and nothing else'
  );
  check(
    'script paths escaped inside inline page data are found too',
    (await warmedAssets.match('/_next/static/chunks/shared.js')) !== undefined
  );
  check(
    'the logo is saved at every size a screen draws it',
    (await warmedAssets.match('/_next/image?url=%2Fimages%2Flogo-mark.png&w=32&q=75')) !== undefined &&
      (await warmedAssets.match('/_next/image?url=%2Fimages%2Flogo-mark.png&w=64&q=75')) !== undefined,
    'otherwise an offline screen shows an empty tile where the logo goes'
  );
  check(
    'full-width photographs are not downloaded ahead of time',
    (await warmedAssets.match('/_next/image?url=%2Fimages%2Fhero.jpg&w=1920&q=75')) === undefined,
    "every width of a hero photo would cost megabytes of a rural user's data"
  );

  check(
    'the worker reports back only once every screen is saved',
    warmReply === 'arthasetu-warmed',
    'the page records the job as done on this reply, never on sending the request'
  );

  const registrar = read('src/components/system/ServiceWorkerRegistrar.tsx');
  check(
    'the page records the job as done on the reply, not on sending',
    registrar.indexOf("setItem('arthasetu-warmed-build'") > registrar.indexOf('port1.onmessage'),
    'an upgrading phone is still run by the old worker, which ignores the request'
  );
  check(
    'the request is repeated, ignoring the marker, when a new worker takes over',
    registrar.includes("const onTakeover = () => warm(true);") &&
      registrar.includes("addEventListener('controllerchange', onTakeover)") &&
      registrar.includes('(alreadyWarmed && !force)'),
    'the marker may record a job the OLD worker did under older rules'
  );
  check(
    'registration does not accidentally force a repeat',
    registrar.includes('.then(() => warm())'),
    '.then(warm) would pass the registration object in as `force`'
  );
  check(
    'the "already saved" marker is the deployment ID, not a script address',
    registrar.includes('process.env.ARTHASETU_BUILD_ID') &&
      !registrar.includes('script[src*=') &&
      read('next.config.ts').includes('ARTHASETU_BUILD_ID'),
    'the first script URL need not change when only one screen does, leaving its old copy offline'
  );

  let warmThrew = false;
  try {
    await makeWorker({ offline: true }).fire('message', 'arthasetu-warm');
  } catch {
    warmThrew = true;
  }
  check('saving ahead with no connection fails quietly', !warmThrew);

  console.log('\n— and holds up when the connection does not —');

  const dead = makeWorker({ offline: true });
  await dead.fire('install');
  await dead.seed(PAGES, 'https://x.test/advisor');
  check(
    'a page opened before still opens with no connection',
    (await dead.route('https://x.test/advisor', { mode: 'navigate' })) === CACHED
  );
  check(
    'a page never opened falls through rather than hanging',
    ['offline-page', 'threw', '/offline'].includes(
      await dead.route('https://x.test/planner', { mode: 'navigate' })
    )
  );

  const fresh = makeWorker();
  await fresh.fire('install');
  await fresh.fire('activate');
  const shell = await fresh.cacheStorage.open(SHELL);
  check('the offline page is precached at install', (await shell.match('/offline')) !== undefined);

  let installThrew = false;
  try {
    await makeWorker({ offline: true }).fire('install');
  } catch {
    installThrew = true;
  }
  check(
    'an install that cannot reach the network still completes',
    !installThrew,
    'a rejected install leaves the app with no worker at all'
  );

  const stale = makeWorker();
  await stale.seed('arthasetu-assets-v1', 'https://x.test/old.js');
  await stale.fire('activate');
  check(
    'caches from an older version are dropped on activation',
    !(await stale.cacheStorage.keys()).includes('arthasetu-assets-v1')
  );

  // ── Headers ────────────────────────────────────────────────────────────────

  console.log('\n— headers —');

  const config = read('next.config.ts');
  check(
    'assetlinks.json is cacheable, so verification is not a round trip every launch',
    /assetlinks\.json[\s\S]{0,600}stale-while-revalidate/.test(config)
  );
  check(
    'the worker itself is never cached',
    /'\/sw\.js'[\s\S]{0,300}max-age=0, must-revalidate/.test(config)
  );
  check('the worker may claim the whole origin', config.includes("'Service-Worker-Allowed'"));

  console.log(failed === 0 ? '\nAll launch-path checks passed.' : `\n${failed} check(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
