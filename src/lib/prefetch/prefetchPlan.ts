/**
 * Pure ordering logic of the background prefetcher (see backgroundPrefetch.ts
 * and docs/superpowers/specs/2026-11-02-background-prefetch-design.md).
 * No DOM here — unit-tested from scripts/qa/background-prefetch.test.mjs.
 */

/** [url without basePath, size in bytes, content hash] */
export type ManifestFile = [string, number, string];

export type PrefetchManifest = {
  version: string;
  files: ManifestFile[];
  groups: { id: string; files: number[] }[];
};

export const HOME_GROUP = 'home';
export const SHARED_GROUP = 'shared';

/** The manifest group a page belongs to: a lesson id, `home`, or '' (no group). */
export function groupForPath(pathname: string, basePath = ''): string {
  let p = pathname;
  if (basePath && p.startsWith(basePath)) p = p.slice(basePath.length);
  if (p === '' || p === '/' || p === '/index.html') return HOME_GROUP;
  const m = p.match(/^\/lessons\/(topic-\d\d)(?:\/|$)/);
  return m ? m[1] : '';
}

/**
 * File indices in download order: the current group, `shared`, the lessons
 * after the current one, `home`, then the lessons before it. From home (or a
 * page with no group): home, shared, the lessons in course order. A file
 * listed in several groups appears once, at its first place.
 */
export function planOrder(manifest: PrefetchManifest, current: string): number[] {
  const byId = new Map(manifest.groups.map((g) => [g.id, g]));
  const lessons = manifest.groups.filter((g) => g.id !== HOME_GROUP && g.id !== SHARED_GROUP);
  const at = lessons.findIndex((g) => g.id === current);

  const ids =
    at < 0
      ? [HOME_GROUP, SHARED_GROUP, ...lessons.map((g) => g.id)]
      : [current, SHARED_GROUP, ...lessons.slice(at + 1).map((g) => g.id), HOME_GROUP, ...lessons.slice(0, at).map((g) => g.id)];

  const seen = new Set<number>();
  const order: number[] = [];
  for (const id of ids) {
    for (const i of byId.get(id)?.files ?? []) {
      if (!seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    }
  }
  return order;
}

/** The done set, stored without a version: revs are content hashes, so a new manifest keeps every unchanged file. */
export function encodeDone(revs: Iterable<string>): string {
  return [...revs].join(',');
}

/** Revs from storage that the manifest still lists (stale ones drop out). */
export function decodeDone(raw: string | null, manifest: PrefetchManifest): Set<string> {
  if (!raw) return new Set();
  const live = new Set(manifest.files.map((f) => f[2]));
  return new Set(raw.split(',').filter((r) => live.has(r)));
}
