#!/usr/bin/env node
/**
 * Pull the latest commit for each cloned prototype source under
 * `prototypes/<name>/` (see build-prototypes.mjs for the list), then
 * rebuild and copy into public/embeds/. Run this after pushing changes
 * to any of the external prototype repos on GitHub.
 *
 * Skips any prototype whose source isn't cloned locally.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PROTOTYPE_DIRS = [
  'terrain-3d',
  'terrain-overlay',
  'pyramid-3-levels',
  'valley-crossing-3d',
];

const root = process.cwd();

for (const name of PROTOTYPE_DIRS) {
  const src = join(root, 'prototypes', name);
  if (!existsSync(src)) {
    console.warn(`[skip] ${name}: not cloned at prototypes/${name}`);
    continue;
  }
  console.log(`[pull] ${name}`);
  execSync('git pull', { cwd: src, stdio: 'inherit' });
}

console.log('[build] rebuilding all prototypes...');
execSync('node scripts/build-prototypes.mjs', { cwd: root, stdio: 'inherit' });
