#!/usr/bin/env node
/**
 * Rebuild the two embedded prototypes (terrain-3d + terrain-overlay)
 * and copy the resulting dist/ folders into public/prototypes/<name>/
 * so they're served by Next.js as static assets and iframed from
 * `PrototypesShowcase`.
 *
 * Expects the source trees to be cloned into `./prototypes/<name>/`
 * (which is gitignored). If a source tree is missing the script
 * skips it with a warning — useful in CI where only the
 * pre-built public/prototypes/ may be present.
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const PROTOTYPES = [
  { name: 'terrain-3d', src: 'prototypes/terrain-3d' },
  { name: 'terrain-overlay', src: 'prototypes/terrain-overlay' },
];

const root = process.cwd();

for (const p of PROTOTYPES) {
  const src = join(root, p.src);
  if (!existsSync(src)) {
    console.warn(`[skip] ${p.name}: source not found at ${p.src}`);
    continue;
  }
  console.log(`[build] ${p.name}`);
  execSync('npm install', { cwd: src, stdio: 'inherit' });
  execSync('npm run build', { cwd: src, stdio: 'inherit' });

  const dest = join(root, 'public', 'embeds', p.name);
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(join(src, 'dist'), dest, { recursive: true });
  console.log(`[done]  ${p.name} → public/embeds/${p.name}/`);
}
