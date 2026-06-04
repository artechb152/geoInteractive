#!/usr/bin/env node
/**
 * Runs before BOTH `npm run dev` and `npm run build` (predev /
 * prebuild). It makes sure `.next/` is a real directory under the
 * project root, removing any stale junction left over from the old
 * `.next/ → %TEMP%/next-geo-course-dist/` workaround.
 *
 * Why the junction was abandoned: when Next's compiled output lands
 * in %TEMP%, Node resolves the junction to its real path and
 * `require()` walks up from %TEMP% — where it can't find the
 * project's `node_modules/`. In dev this crashes every request with
 * `Cannot find module 'react/jsx-runtime'` (the App Router server
 * bundle requires React as a bare specifier at runtime). The
 * `--preserve-symlinks` flag fixes the require but then breaks App
 * Router route matching (every route 404s), so there's no viable
 * junction setup. OneDrive sync corruption is instead mitigated by
 * disabling Webpack's filesystem cache in dev (see next.config.mjs).
 * If OneDrive still races on `.next/` files, move the project out of
 * OneDrive (e.g. to C:\dev\).
 *
 * If `.next/` is already a real directory (no junction in place)
 * this script is a no-op.
 */
import { existsSync, lstatSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const projectNext = join(process.cwd(), '.next');

if (!existsSync(projectNext)) {
  process.exit(0);
}

let isLink = false;
try {
  isLink = lstatSync(projectNext).isSymbolicLink();
} catch {
  process.exit(0);
}

if (!isLink) {
  process.exit(0);
}

try {
  unlinkSync(projectNext);
  console.log('[next-junction] removed .next junction for build');
} catch (err) {
  console.warn('[next-junction] could not remove junction:', err.message);
}
