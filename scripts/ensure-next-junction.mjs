#!/usr/bin/env node
/**
 * Idempotent setup step that runs before every `npm run dev` / `npm
 * run build`. It makes sure `.next/` is a junction pointing at a
 * folder outside OneDrive — otherwise OneDrive's sync engine
 * virtualises the cache files faster than Next.js can read them and
 * the dev server crashes with ENOENT on `.pack.gz`,
 * `middleware-manifest.json`, `routes-manifest.json`, etc.
 *
 * On platforms other than Windows-with-OneDrive this is a no-op:
 * the `.next/` folder stays a plain directory under the project.
 */
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import { join } from 'node:path';

const projectNext = join(process.cwd(), '.next');
const externalNext = join(tmpdir(), 'next-geo-course-dist');

function looksLikeOneDrive(cwd) {
  // Heuristic — the only thing this script protects against.
  return /[\\/]OneDrive[\\/]/i.test(cwd);
}

if (platform() !== 'win32' || !looksLikeOneDrive(process.cwd())) {
  // Nothing to do — `.next/` can live in the project safely.
  process.exit(0);
}

if (!existsSync(externalNext)) {
  mkdirSync(externalNext, { recursive: true });
}

if (existsSync(projectNext)) {
  let isLink = false;
  try {
    isLink = lstatSync(projectNext).isSymbolicLink();
  } catch {
    // ignore — treat as not-a-link, rmSync below will clean it up
  }
  if (isLink) {
    process.exit(0);
  }
  console.log('[next-junction] removing existing .next directory');
  try {
    rmSync(projectNext, { recursive: true, force: true });
  } catch (err) {
    console.warn('[next-junction] could not remove existing .next:', err.message);
    process.exit(0);
  }
}

try {
  symlinkSync(externalNext, projectNext, 'junction');
  console.log(`[next-junction] linked .next → ${externalNext}`);
} catch (err) {
  console.warn('[next-junction] could not create junction:', err.message);
  console.warn(
    '[next-junction] dev may still hit ENOENT errors from OneDrive sync. ' +
      'Consider moving the project out of OneDrive (e.g. to C:\\dev\\).',
  );
}
