# Background prefetch — warm the whole course while the learner browses

**Status:** approved in chat (2026-11-02); revised the same day so a refresh never re-downloads (early SW, self-bootstrap, persistent storage) · **Date:** 2026-11-02
**Scope:** a site-wide background downloader for images, 3-D models and textures, plus an optional service-worker cache. No UI.

## 1. Goal

After a learner opens any page, the rest of the course (home, public lessons, shared chrome) downloads quietly in the background. The next activity, or the next lesson, then opens from cache. The learner never waits for this download, and it never competes with what is on screen.

## 2. Constraints

- `output: 'export'`: a static site, served from a normal host or inside an LMS (SCORM, usually an iframe, maybe under a `basePath`). Opening it from `file://` must keep working.
- About 790 MB sits in `public/assets`. Only the public course is warmed: about 364 MB today (home 7 MB, shared 4 MB, lesson 2 161 MB, lesson 6 193 MB). Archived topics are skipped.
- Asset paths are built at runtime (frame sequences, `${BASE}` prefixes), so the file list cannot come from a bundler.
- Other sessions run dev servers and Playwright QA against this repo at the same time. The downloader must stay off for them.

## 3. Design

### 3.1 Manifest (build time)

`scripts/build-prefetch-manifest.mjs` writes `public/prefetch-manifest.json`. The file is gitignored and runs from `npm run dev` and `npm run build`.

- **Groups.** `home`, `shared`, then one group per public lesson in course order. Public lessons are `allLessons` minus `ARCHIVED_TOPIC_IDS`, parsed from `src/lib/lessons.ts`.
- **Where files come from.** Each literal `/assets/…` string in a group's source folders is resolved against `public/`:
  - an existing file is taken as is;
  - an existing folder is taken whole;
  - a partial name, at least `/assets/<area>/<folder>/<stem>`, takes the files in its folder that start with that stem.
  - A bare area such as `/assets/isometric/` is ignored. The public lessons' isometric dioramas are added to `home` explicitly.
- **File types.** Only runtime types are listed. No video: browsers fetch video with Range requests.
- **Format.** `{ version, files: [url, size, rev][], groups: { id, files: index[] }[] }`.
  - `rev` is a 12-hex content hash. Hashes are cached by size and mtime in `node_modules/.cache`.
  - `version` hashes the whole manifest.
- **Order.** Within a group, files go smallest first, so many small files land quickly and the big frame sequences come last.

### 3.2 Runtime prefetcher

- `src/lib/prefetch/prefetchPlan.ts` holds the pure ordering logic and is unit-tested.
  - `groupForPath(pathname)` maps a page to its group.
  - `planOrder(manifest, current)` orders files: the current group, then `shared`, then the following lessons, then `home`, then the earlier lessons. A file listed in several groups is downloaded once.
- `src/lib/prefetch/prefetchHold.ts` lets the page hold the prefetcher off while it loads something of its own. Every hold expires after 20 s, so a stuck loader cannot stop the prefetcher for good.
- `src/lib/prefetch/backgroundPrefetch.ts` is the engine. `src/components/prefetch/BackgroundPrefetcher.tsx` is a render-nothing client component in the root layout that feeds it the pathname.

**Runs only when all of these hold:**

- production build;
- `http(s)`;
- `navigator.webdriver` is not set;
- Save-Data is off;
- the connection is not `2g`/`slow-2g`;
- `localStorage['geo:prefetch']` is not `'off'`.

`'on'` forces it on in dev and in automation; QA uses this. `'off'` also unregisters the service worker.

**When:**

- The service worker registers right after `load` (Save-Data included) and asks for persistent storage (`navigator.storage.persist()`). A refresh is then served from Cache Storage, even before the download has run.
- The download starts after `load`, then an idle callback, then 2 s. Files the page already loaded (`performance` resource entries) go first. They come from the HTTP cache, and on the way they land in the worker's cache.
- It downloads two files at a time with `fetch(…, { priority: 'low' })` and reads each body to the end.
- It pauses 6 s on every route or hash change.
- It pauses while any `ModelLoading` is mounted: `ModelLoading` renders a tiny `HoldBackgroundPrefetch`.
- It stops after 3 failures in a row (offline), when Save-Data turns on, or when less than 100 MB of storage quota is left.

**Done tracking:**

- With the service worker, presence in its cache is the source of truth.
- Without it, `localStorage['geo:prefetch:done']` holds the revs already fetched. Revs are content hashes, so a new version keeps every file that did not change.

### 3.3 Service worker (`public/sw.js`, progressive enhancement)

- **Registration.** `${BASE}/sw.js`, scope `${BASE}/`, production only, inside try/catch. When it fails (LMS iframe, blocked storage, `file://`), the prefetcher falls back to the browser's HTTP cache.
- **Fetch.** Cache-first, only for GET requests to manifest URLs under `${BASE}/assets/` and `${BASE}/draco/`.
  - A Range request, or a URL that is not in the manifest, goes to the network untouched.
  - A miss is fetched and stored, whether a page or the prefetcher asked for it.
- **Sync.** The page sends the fresh manifest (fetched with `no-cache`) over a `MessageChannel`. The SW then:
  - moves entries whose rev did not change into `geo-prefetch-<version>`;
  - deletes every other `geo-prefetch-*` cache;
  - stores the manifest in `geo-prefetch-meta`;
  - replies with the cache name.

  So a deploy re-downloads only the files that changed.
- **Takeover.** `skipWaiting` and `clients.claim`, so the first visit is already controlled.
- **Bootstrap.** On activation, or on the first fetch when it has no stored state, the worker fetches the manifest itself. It does not wait for a page to sync it. Syncs are serialised.

## 4. Out of scope (v1)

- JS chunks of the lazy 3-D scenes (`next/dynamic`). They are small next to the images.
- Video.
- Any UI or progress indicator.
- Offline HTML pages.

## 5. Verification

- `scripts/qa/background-prefetch.test.mjs` unit-tests `planOrder`, `groupForPath` and the done-set encoding.
- An e2e run with Playwright against a production export served from a worktree checks that:
  - nothing is requested before idle, and at most 2 requests run at once;
  - a navigation pauses the queue;
  - with Save-Data or the default automation settings, nothing runs;
  - the SW cache fills, and a second visit serves files from it;
  - every `/assets` request a page makes is covered by the manifest.
