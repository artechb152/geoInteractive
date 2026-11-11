// Unit tests for the background prefetcher's ordering (src/lib/prefetch/prefetchPlan.ts)
// and hold (prefetchHold.ts), plus a sanity check of the generated manifest.
// Run: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/background-prefetch.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { groupForPath, planOrder, encodeDone, decodeDone } from '../../src/lib/prefetch/prefetchPlan.ts';
import { holdPrefetch, prefetchHeld } from '../../src/lib/prefetch/prefetchHold.ts';

const manifest = {
  version: 'v1',
  files: [
    ['/assets/home.png', 10, 'r0'],
    ['/draco/d.wasm', 10, 'r1'],
    ['/assets/a.webp', 10, 'r2'],
    ['/assets/b.webp', 10, 'r3'],
    ['/assets/c.webp', 10, 'r4'],
  ],
  groups: [
    { id: 'home', files: [0] },
    { id: 'shared', files: [1] },
    { id: 'topic-02', files: [2, 1] },
    { id: 'topic-06', files: [3] },
    { id: 'topic-09', files: [4] },
  ],
};

test('groupForPath maps pages to manifest groups', () => {
  assert.equal(groupForPath('/'), 'home');
  assert.equal(groupForPath('/index.html'), 'home');
  assert.equal(groupForPath('/lessons/topic-06/'), 'topic-06');
  assert.equal(groupForPath('/lessons/topic-02/overview/'), 'topic-02');
  assert.equal(groupForPath('/lessons/topic-06'), 'topic-06');
  assert.equal(groupForPath('/archive/'), '');
  assert.equal(groupForPath('/course/lessons/topic-06/', '/course'), 'topic-06');
  assert.equal(groupForPath('/course', '/course'), 'home');
});

test('from home: home, shared, then the lessons in course order; a shared file once', () => {
  assert.deepEqual(planOrder(manifest, 'home'), [0, 1, 2, 3, 4]);
  assert.deepEqual(planOrder(manifest, ''), [0, 1, 2, 3, 4]);
});

test('from a lesson: that lesson, shared, the lessons after it, home, the lessons before it', () => {
  assert.deepEqual(planOrder(manifest, 'topic-06'), [3, 1, 4, 0, 2]);
  assert.deepEqual(planOrder(manifest, 'topic-02'), [2, 1, 3, 4, 0]);
  assert.deepEqual(planOrder(manifest, 'topic-09'), [4, 1, 0, 2, 3]);
});

test('done set survives a new manifest only for unchanged files', () => {
  const raw = encodeDone(['r0', 'r2', 'gone']);
  assert.deepEqual([...decodeDone(raw, manifest)].sort(), ['r0', 'r2']);
  assert.equal(decodeDone(null, manifest).size, 0);
  assert.equal(decodeDone('', manifest).size, 0);
});

test('holds pause the prefetcher until released, and expire after 20 s', () => {
  assert.equal(prefetchHeld(), false);
  const release = holdPrefetch();
  assert.equal(prefetchHeld(), true);
  release();
  assert.equal(prefetchHeld(), false);
  holdPrefetch();
  assert.equal(prefetchHeld(Date.now() + 21_000), false, 'a stuck hold expires');
  assert.equal(prefetchHeld(), false, 'and is dropped');
});

const MANIFEST = new URL('../../public/prefetch-manifest.json', import.meta.url);
test('generated manifest: public lessons only, every file exists, no video', { skip: !existsSync(MANIFEST) && 'run scripts/build-prefetch-manifest.mjs first' }, () => {
  const m = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const ids = m.groups.map((g) => g.id);
  assert.deepEqual(ids.slice(0, 2), ['home', 'shared']);
  const lessons = readFileSync(new URL('../../src/lib/lessons.ts', import.meta.url), 'utf8');
  const archived = lessons.match(/ARCHIVED_TOPIC_IDS[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/)[1].replace(/\/\/.*$/gm, '');
  for (const id of ids.slice(2)) assert.ok(!archived.includes(`'${id}'`), `${id} is archived`);
  for (const [url, size, rev] of m.files) {
    assert.ok(existsSync(new URL('../../public' + url, import.meta.url)), url);
    assert.ok(size > 0 && /^[0-9a-f]{12}$/.test(rev), url);
    assert.ok(!/\.(mp4|webm|mov|md|txt)$/i.test(url), url);
  }
});
