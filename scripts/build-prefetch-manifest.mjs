#!/usr/bin/env node
/**
 * Builds public/prefetch-manifest.json — the list of files the background
 * prefetcher (src/components/prefetch/BackgroundPrefetcher.tsx) warms while
 * the learner browses, grouped by where they are used:
 *
 *   home    — the landing page (src/app/page.tsx, src/components/landing) and
 *             the public lessons' isometric dioramas;
 *   shared  — lesson chrome (src/components/lesson, ui, assets, app/lessons)
 *             and the Draco decoder;
 *   topic-NN — one group per PUBLIC lesson (archived topics are skipped),
 *             from the `/assets/…` paths written in src/components/lessons/topic-NN.
 *
 * Paths are built dynamically in the code (frame sequences, `${BASE}` prefixes),
 * so each literal `/assets/…` string is resolved against public/: an existing
 * file is taken as is, an existing folder is taken whole, and a partial name
 * (`…/lesson-`) takes the files in its folder that start with it — only below
 * /assets/<area>/<folder>, so a loose prefix never pulls in a whole area.
 * Only runtime types are listed (no mp4: videos stream with Range requests,
 * which the service worker leaves to the network).
 *
 * Every file carries a content hash (`rev`); `version` hashes the whole list.
 * Content hashes are cached by size+mtime in node_modules/.cache, so a rerun
 * only reads files that changed.
 *
 * Usage: node scripts/build-prefetch-manifest.mjs [--quiet]
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const OUT = join(PUBLIC, 'prefetch-manifest.json');
const CACHE = join(ROOT, 'node_modules', '.cache', 'prefetch-manifest', 'hashes.json');
const QUIET = process.argv.includes('--quiet');

const RUNTIME_EXT = new Set(['.webp', '.jpg', '.jpeg', '.png', '.avif', '.svg', '.glb', '.gltf', '.bin', '.hdr', '.ktx2', '.json', '.wasm', '.js']);
const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json']);

const toPosix = (p) => p.split(sep).join('/');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Public lessons, in course order: ids from allLessons minus ARCHIVED_TOPIC_IDS. */
function publicLessons() {
  const src = readFileSync(join(ROOT, 'src/lib/lessons.ts'), 'utf8');
  const all = [...src.matchAll(/id:\s*'(topic-\d\d[a-z]?)',\s*\n\s*number:\s*(\d+)/g)].map((m) => ({ id: m[1], number: Number(m[2]) }));
  const archivedBlock = src.match(/ARCHIVED_TOPIC_IDS[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/);
  if (!all.length || !archivedBlock) throw new Error('build-prefetch-manifest: could not read lessons from src/lib/lessons.ts');
  const archived = new Set([...archivedBlock[1].replace(/\/\/.*$/gm, '').matchAll(/'(topic-\d\d[a-z]?)'/g)].map((m) => m[1]));
  return all.filter((l) => !archived.has(l.id));
}

/** Literal `/assets/…` (or `/draco/…`) prefixes in the given source files/folders (minus `skip`). */
function assetRefs(paths, skip = new Set()) {
  const refs = new Set();
  for (const p of paths) {
    const files = existsSync(p) && statSync(p).isDirectory() ? walk(p) : existsSync(p) ? [p] : [];
    for (const f of files) {
      if (!SOURCE_EXT.has(extname(f)) || skip.has(f)) continue;
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(/\/(?:assets|draco)\/[A-Za-z0-9_.\-/]*/g)) refs.add(m[0]);
    }
  }
  return refs;
}

/** Files in a public folder whose names start with `stem`. */
function filesStartingWith(dir, stem) {
  const abs = join(PUBLIC, dir);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) return [];
  return readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.name.startsWith(stem))
    .flatMap((e) => (e.isDirectory() ? walk(join(abs, e.name)) : [join(abs, e.name)]));
}

/** Public files a literal reference stands for (see header). */
function resolveRef(ref) {
  const parts = ref.split('/').filter(Boolean);
  // A bare area (`/assets/isometric/`, mostly from comments) never stands for all of it.
  if (parts[0] === 'assets' && parts.length <= 2) return [];
  const abs = join(PUBLIC, ref);
  if (existsSync(abs)) {
    const st = statSync(abs);
    return st.isDirectory() ? walk(abs) : [abs];
  }
  // /assets/<area>/<folder>/<partial> at least — never a whole area from a loose prefix.
  if (parts[0] !== 'assets' || parts.length < 4) return [];
  return filesStartingWith(parts.slice(0, -1).join('/'), parts[parts.length - 1]);
}

function filesFor(refs) {
  const set = new Set();
  for (const ref of refs) for (const f of resolveRef(ref)) if (RUNTIME_EXT.has(extname(f).toLowerCase())) set.add(f);
  return set;
}

const src = (...p) => join(ROOT, 'src', ...p);
const lessons = publicLessons();

// The home page's 3D model is switched off (SHOW_3D_MODEL in HomeTerrainDiorama): its 3.6 MB glb is
// never shown, so it is not fetched either.
const homeModelOn = /const SHOW_3D_MODEL = true/.test(readFileSync(src('components/landing/home/HomeTerrainDiorama.tsx'), 'utf8'));
const homeSkip = new Set(homeModelOn ? [] : [src('components/landing/home/InteractiveHomeTerrainModel.tsx')]);

const groups = [
  {
    id: 'home',
    files: (() => {
      const set = filesFor(assetRefs([src('app/page.tsx'), src('components/landing'), src('components/LessonCard.tsx')], homeSkip));
      // lessonDioramaSrc(id) is the lesson's card in lessonAssets; take it and its -hook still.
      const assets = readFileSync(join(ROOT, 'src/lib/lesson-scenes.ts'), 'utf8');
      for (const l of lessons) {
        const card = assets.match(new RegExp(`'${l.id}':\\s*\\{[^}]*card:\\s*'/assets/isometric/([^.']+)\\.png'`));
        if (!card) throw new Error(`build-prefetch-manifest: no lessonAssets card for ${l.id}`);
        for (const f of filesStartingWith('assets/isometric', card[1])) {
          if (RUNTIME_EXT.has(extname(f).toLowerCase())) set.add(f);
        }
      }
      return set;
    })(),
  },
  {
    id: 'shared',
    files: filesFor(
      new Set([
        ...assetRefs([src('components/lesson'), src('components/ui'), src('components/assets'), src('app/lessons')]),
        '/draco/',
      ]),
    ),
  },
    // A split lesson (topic-02b) keeps its scenes in the original lesson's folder.
  ...lessons.map((l) => ({ id: l.id, files: filesFor(assetRefs([src('components/lessons', l.id.replace(/[a-z]$/, ''))])) })),
];

// Docs that sit next to assets are not runtime files even with a runtime extension.
const isDocJson = (f) => /(^|[\\/])(package|tsconfig)\.json$/i.test(f);

// ---- content hashes (cached by size + mtime) ----
let cache = {};
try {
  cache = JSON.parse(readFileSync(CACHE, 'utf8'));
} catch {}
const nextCache = {};
function rev(abs) {
  const st = statSync(abs);
  const key = toPosix(relative(PUBLIC, abs));
  const stamp = `${st.size}:${Math.round(st.mtimeMs)}`;
  const hit = cache[key];
  const hash = hit && hit.stamp === stamp ? hit.hash : createHash('sha1').update(readFileSync(abs)).digest('hex').slice(0, 12);
  nextCache[key] = { stamp, hash };
  return { size: st.size, hash };
}

// ---- assemble: one global file table, groups hold indices ----
const index = new Map();
const files = [];
const outGroups = [];
for (const g of groups) {
  const list = [...g.files]
    .filter((f) => !isDocJson(f))
    .map((abs) => ({ abs, url: '/' + toPosix(relative(PUBLIC, abs)), ...rev(abs) }))
    // Smallest first: many small files land quickly, and the big frame
    // sequences (which their own players also load) come last.
    .sort((a, b) => a.size - b.size || a.url.localeCompare(b.url));
  const ids = [];
  for (const f of list) {
    if (!index.has(f.url)) {
      index.set(f.url, files.length);
      files.push([f.url, f.size, f.hash]);
    }
    ids.push(index.get(f.url));
  }
  outGroups.push({ id: g.id, files: ids });
}

const version = createHash('sha1').update(JSON.stringify([files, outGroups])).digest('hex').slice(0, 12);
const manifest = { version, files, groups: outGroups };
const json = JSON.stringify(manifest);

let previous = '';
try {
  previous = readFileSync(OUT, 'utf8');
} catch {}
if (previous !== json) writeFileSync(OUT, json);
mkdirSync(dirname(CACHE), { recursive: true });
writeFileSync(CACHE, JSON.stringify(nextCache));

if (!QUIET) {
  const mb = (n) => (n / 1048576).toFixed(1) + 'MB';
  const total = files.reduce((s, f) => s + f[1], 0);
  console.log(`prefetch-manifest ${version}: ${files.length} files, ${mb(total)}${previous === json ? ' (unchanged)' : ''}`);
  for (const g of outGroups) console.log(`  ${g.id.padEnd(9)} ${String(g.files.length).padStart(5)} files  ${mb(g.files.reduce((s, i) => s + files[i][1], 0))}`);
}

