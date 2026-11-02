/**
 * Service worker of the background prefetcher
 * (src/lib/prefetch/backgroundPrefetch.ts; spec:
 * docs/superpowers/specs/2026-11-02-background-prefetch-design.md).
 *
 * Cache-first for the files listed in public/prefetch-manifest.json, and only
 * those: a GET under <base>/assets/ or <base>/draco/ whose path is in the
 * manifest. Everything else, and every Range request (video), goes to the
 * network untouched. A miss is fetched and stored, whether the page or the
 * prefetcher asked for it.
 *
 * On activation the worker fetches the manifest itself, so the first refresh
 * after a first visit is already served from the cache. Each page load then
 * posts { type: 'geo-prefetch-sync', manifest } over a
 * MessageChannel after each load. A new manifest version moves the entries
 * whose content hash (rev) did not change into geo-prefetch-<version> and
 * drops every older geo-prefetch-* cache, so a deploy re-downloads only what
 * changed. Replies { cacheName }.
 */
const META_CACHE = 'geo-prefetch-meta';
const META_KEY = 'state.json';
const CACHE_PREFIX = 'geo-prefetch-';
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '');

/** @type {Promise<{ version: string, cacheName: string, revs: Map<string, string> } | null> | null} */
let statePromise = null;

function loadState() {
  if (!statePromise) {
    statePromise = caches
      .open(META_CACHE)
      .then((c) => c.match(META_KEY))
      .then((r) => (r ? r.json() : null))
      .then((s) => (s ? { version: s.version, cacheName: s.cacheName, revs: new Map(Object.entries(s.revs)) } : null))
      .catch(() => null);
  }
  return statePromise;
}

/** @type {Promise<unknown> | null} */
let bootstrap = null;

/**
 * The stored state, or — on a first install, before any page has synced —
 * the state built from the manifest the worker fetches itself. A refresh
 * right after the first visit is then already served from the cache.
 */
async function ensureState() {
  const state = await loadState();
  if (state) return state;
  if (!bootstrap) {
    bootstrap = fetch(BASE + '/prefetch-manifest.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => (m && Array.isArray(m.files) ? sync(m) : null))
      .catch(() => null);
  }
  await bootstrap;
  return loadState();
}

/** Syncs run one at a time (activation and a page message can overlap). */
let syncChain = Promise.resolve();
function sync(manifest) {
  const run = syncChain.then(() => syncNow(manifest));
  syncChain = run.catch(() => {});
  return run;
}

async function syncNow(manifest) {
  const old = await loadState();
  const cacheName = CACHE_PREFIX + manifest.version;
  if (old && old.version === manifest.version) return cacheName;

  const revs = new Map(manifest.files.map((f) => [f[0], f[2]]));
  if (old && old.cacheName !== cacheName && (await caches.has(old.cacheName))) {
    const from = await caches.open(old.cacheName);
    const to = await caches.open(cacheName);
    for (const req of await from.keys()) {
      const path = new URL(req.url).pathname.slice(BASE.length);
      const rev = revs.get(path);
      if (rev && old.revs.get(path) === rev) {
        const res = await from.match(req);
        if (res) await to.put(req, res);
      }
    }
  }
  for (const name of await caches.keys()) {
    if (name.startsWith(CACHE_PREFIX) && name !== cacheName && name !== META_CACHE) await caches.delete(name);
  }
  const meta = await caches.open(META_CACHE);
  await meta.put(
    META_KEY,
    new Response(JSON.stringify({ version: manifest.version, cacheName, revs: Object.fromEntries(revs) }), {
      headers: { 'content-type': 'application/json' },
    }),
  );
  statePromise = Promise.resolve({ version: manifest.version, cacheName, revs });
  return cacheName;
}

async function cacheFirst(event, url) {
  const state = await ensureState();
  const path = url.pathname.slice(BASE.length);
  if (!state || !state.revs.has(path)) return fetch(event.request);

  const cache = await caches.open(state.cacheName);
  const key = url.origin + url.pathname;
  const hit = await cache.match(key);
  if (hit) return hit;

  const res = await fetch(event.request);
  if (res.ok && res.status === 200 && res.type === 'basic') {
    event.waitUntil(cache.put(key, res.clone()).catch(() => {}));
  }
  return res;
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([self.clients.claim(), ensureState()]));
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'geo-prefetch-sync' || !data.manifest) return;
  const port = event.ports && event.ports[0];
  event.waitUntil(
    sync(data.manifest)
      .then((cacheName) => port && port.postMessage({ cacheName }))
      .catch(() => port && port.postMessage({ cacheName: null })),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(BASE + '/assets/') && !url.pathname.startsWith(BASE + '/draco/')) return;
  event.respondWith(cacheFirst(event, url));
});
