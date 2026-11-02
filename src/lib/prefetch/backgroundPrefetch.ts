/**
 * Background prefetcher — downloads the whole public course (images, 3-D
 * models, textures) while the learner browses, so later activities and
 * lessons open from cache. Spec: docs/superpowers/specs/2026-11-02-background-prefetch-design.md.
 *
 * - Off unless: production build, http(s), not automation (navigator.webdriver),
 *   no Save-Data / 2g, and localStorage['geo:prefetch'] !== 'off'.
 *   localStorage['geo:prefetch'] = 'on' forces it on (dev, QA).
 * - The service worker registers as soon as the page has loaded (also under
 *   Save-Data), so a refresh is served from Cache Storage even before the
 *   background download has run; it asks for persistent storage.
 * - Downloads start after load + idle + START_DELAY_MS; 2 low-priority fetches at a
 *   time; pauses NAV_PAUSE_MS on every route/hash change and while any
 *   ModelLoading is mounted (prefetchHold.ts).
 * - Order: current page's group first (prefetchPlan.ts).
 * - With the service worker (public/sw.js) the files land in Cache Storage
 *   and survive visits; without it they warm the browser's HTTP cache.
 */
import { decodeDone, encodeDone, groupForPath, planOrder, type PrefetchManifest } from './prefetchPlan';
import { prefetchHeld } from './prefetchHold';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const FLAG_KEY = 'geo:prefetch';
const DONE_KEY = 'geo:prefetch:done';
const CONCURRENCY = 2;
const START_DELAY_MS = 2000;
const NAV_PAUSE_MS = 6000;
const WAIT_TICK_MS = 500;
const MAX_FAILURES_IN_A_ROW = 3;
const MIN_FREE_QUOTA = 100 * 1024 * 1024;
const SAVE_DONE_EVERY = 10;

type NetworkInformationLike = { saveData?: boolean; effectiveType?: string };

const state = {
  started: false,
  stopped: false,
  group: '',
  pausedUntil: 0,
};

function readFlag(): string | null {
  try {
    return window.localStorage.getItem(FLAG_KEY);
  } catch {
    return null;
  }
}

function connection(): NetworkInformationLike | undefined {
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
}

function constrainedNetwork(): boolean {
  const c = connection();
  return !!c && (c.saveData === true || /(^|-)2g$/.test(c.effectiveType ?? ''));
}

/** The page may use the prefetcher at all (service worker included). */
function allowed(flag: string | null): boolean {
  if (flag === 'off' || !/^https?:$/.test(window.location.protocol)) return false;
  return flag === 'on' || !navigator.webdriver;
}

/** The background download may run (the network is not constrained). */
function downloadAllowed(flag: string | null): boolean {
  if (constrainedNetwork()) return false;
  return flag === 'on' || process.env.NODE_ENV === 'production';
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function afterLoad(): Promise<void> {
  if (document.readyState === 'complete') return Promise.resolve();
  return new Promise((r) => window.addEventListener('load', () => r(), { once: true }));
}

function idle(): Promise<void> {
  return new Promise((r) => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => r(), { timeout: 5000 });
    else setTimeout(r, 1000);
  });
}

/** Called on every pathname change (and once on mount). */
export function prefetchNavigate(pathname: string) {
  const group = groupForPath(pathname, BASE);
  if (state.started) state.pausedUntil = Date.now() + NAV_PAUSE_MS;
  state.group = group;
}

export function startBackgroundPrefetch(pathname: string) {
  if (state.started) return;
  state.started = true;
  state.group = groupForPath(pathname, BASE);

  const flag = readFlag();
  if (flag === 'off') {
    void unregisterServiceWorker();
    return;
  }
  if (!allowed(flag)) return;

  window.addEventListener('hashchange', () => {
    state.pausedUntil = Date.now() + NAV_PAUSE_MS;
  });

  const registered = afterLoad().then(registerServiceWorker);
  if (!downloadAllowed(flag)) return;
  void registered
    .then(idle)
    .then(() => sleep(START_DELAY_MS))
    .then(run)
    .catch(() => {});
}

async function run() {
  const manifest = await fetch(`${BASE}/prefetch-manifest.json`, { cache: 'no-cache' })
    .then((r) => (r.ok ? (r.json() as Promise<PrefetchManifest>) : null))
    .catch(() => null);
  if (!manifest || !Array.isArray(manifest.files)) return;

  const cacheName = await syncServiceWorker(manifest);
  const cache = cacheName && 'caches' in window ? await caches.open(cacheName).catch(() => null) : null;

  let done = new Set<string>();
  if (!cache) {
    try {
      done = decodeDone(window.localStorage.getItem(DONE_KEY), manifest);
    } catch {}
  }
  const saveDone = () => {
    if (cache) return;
    try {
      window.localStorage.setItem(DONE_KEY, encodeDone(done));
    } catch {}
  };

  // Files this page already loaded go first: they come from the HTTP cache,
  // and through the worker they land in Cache Storage for the next refresh.
  const loaded = new Set(
    performance.getEntriesByType('resource').map((e) => {
      try {
        return new URL(e.name).pathname;
      } catch {
        return '';
      }
    }),
  );
  const taken = new Set<number>();
  let orderFor = '';
  let order: number[] = [];
  const takeNext = (): number | undefined => {
    if (orderFor !== state.group || !order.length) {
      orderFor = state.group;
      const planned = planOrder(manifest, state.group);
      const isLoaded = (i: number) => loaded.has(BASE + manifest.files[i][0]);
      order = [...planned.filter(isLoaded), ...planned.filter((i) => !isLoaded(i))];
    }
    for (const i of order) {
      if (!taken.has(i)) {
        taken.add(i);
        return i;
      }
    }
    return undefined;
  };

  let failures = 0;
  let sinceSave = 0;
  let sinceQuotaCheck = 0;

  const waitUntilAllowed = async () => {
    while (!state.stopped && (Date.now() < state.pausedUntil || prefetchHeld())) await sleep(WAIT_TICK_MS);
  };

  const worker = async () => {
    for (let i = takeNext(); i !== undefined && !state.stopped; i = takeNext()) {
      const [url, , rev] = manifest.files[i];
      if (cache ? await cache.match(BASE + url).catch(() => undefined) : done.has(rev)) continue;

      await waitUntilAllowed();
      if (state.stopped) return;
      if (constrainedNetwork()) {
        state.stopped = true;
        return;
      }
      if (cache && ++sinceQuotaCheck >= 25) {
        sinceQuotaCheck = 0;
        if (!(await enoughQuota())) {
          state.stopped = true;
          return;
        }
      }

      try {
        const res = await fetch(BASE + url, { priority: 'low', credentials: 'same-origin' } as RequestInit);
        if (!res.ok) throw new Error(String(res.status));
        await res.arrayBuffer();
        failures = 0;
        done.add(rev);
        if (++sinceSave >= SAVE_DONE_EVERY) {
          sinceSave = 0;
          saveDone();
        }
      } catch {
        if (++failures >= MAX_FAILURES_IN_A_ROW) {
          state.stopped = true;
          return;
        }
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  saveDone();
}

async function enoughQuota(): Promise<boolean> {
  try {
    const { quota, usage } = await navigator.storage.estimate();
    return quota === undefined || usage === undefined || quota - usage > MIN_FREE_QUOTA;
  } catch {
    return true;
  }
}

const swSupported = () => process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator && window.isSecureContext;

/**
 * Registers public/sw.js (it loads the manifest itself on activation) and
 * asks for persistent storage, so the browser does not evict the course
 * under storage pressure. Never throws (LMS iframe, blocked storage).
 */
async function registerServiceWorker() {
  if (!swSupported()) return;
  try {
    await navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` });
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {}
}

/**
 * Hands the service worker the fresh manifest; resolves to the Cache Storage
 * name that holds the files, or null when there is no controlling worker
 * (dev, LMS iframe, blocked storage) — the prefetch then just warms the HTTP
 * cache.
 */
async function syncServiceWorker(manifest: PrefetchManifest): Promise<string | null> {
  if (!swSupported()) return null;
  try {
    const sw = navigator.serviceWorker;
    if (!(await sw.getRegistration(`${BASE}/`))) return null;
    await sw.ready;
    if (!sw.controller) {
      await Promise.race([new Promise((r) => sw.addEventListener('controllerchange', r, { once: true })), sleep(5000)]);
    }
    const controller = sw.controller;
    if (!controller) return null;
    return await new Promise<string | null>((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (e) => resolve(typeof e.data?.cacheName === 'string' ? e.data.cacheName : null);
      controller.postMessage({ type: 'geo-prefetch-sync', manifest }, [channel.port2]);
      setTimeout(() => resolve(null), 15000);
    });
  } catch {
    return null;
  }
}

async function unregisterServiceWorker() {
  try {
    if (!('serviceWorker' in navigator)) return;
    for (const reg of await navigator.serviceWorker.getRegistrations()) {
      if (reg.active?.scriptURL.endsWith(`${BASE}/sw.js`)) await reg.unregister();
    }
  } catch {}
}
