#!/usr/bin/env node
/**
 * Run before `npm run build`. The dev workflow uses a junction
 * `.next/ → %TEMP%/next-geo-course-dist/` (see
 * `ensure-next-junction.mjs`) to dodge OneDrive sync corruption.
 * `next build` doesn't tolerate the junction — when build artifacts
 * land in %TEMP% Node's `require()` walks up from there and can't
 * find the project's `node_modules/`. So before each production
 * build we remove the junction; Next then creates a real `.next/`
 * folder under the project root.
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
