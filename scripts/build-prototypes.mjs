#!/usr/bin/env node
/** Build the prototype sources tracked in this repository into public/embeds/. */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';

const prototypes = [
  { name: 'terrain-3d', outDir: 'dist' },
  { name: 'terrain-overlay', outDir: 'dist' },
  { name: 'pyramid-3-levels', outDir: 'dist' },
  { name: 'valley-crossing-3d', outDir: 'out' },
];

const ignoredDirs = new Set([
  '.git', '.next', '.tmp', 'coverage', 'dist', 'dist-lib', 'node_modules',
  'out', 'playwright-report', 'test-results',
]);
const root = process.cwd();
const sourcesRoot = join(root, 'prototypes');
const embedsRoot = join(root, 'public', 'embeds');
const ifChanged = process.argv.includes('--if-changed');

for (const { name, outDir } of prototypes) {
  const sourcePath = join(sourcesRoot, name);
  if (!existsSync(join(sourcePath, 'package.json'))) {
    throw new Error(`Missing prototype source: prototypes/${name}/`);
  }

  const source = realpathSync(sourcePath);
  const location = relative(sourcesRoot, source);
  if (location.startsWith('..') || isAbsolute(location)) {
    throw new Error(`Prototype source must be inside this project: ${sourcePath}`);
  }

  const destination = join(embedsRoot, name);
  const fingerprint = sourceFingerprint(source);
  const marker = join(destination, '.source-hash');
  if (
    ifChanged &&
    existsSync(join(destination, 'index.html')) &&
    existsSync(marker) &&
    readFileSync(marker, 'utf8').trim() === fingerprint
  ) {
    console.log(`[current] ${name}`);
    continue;
  }

  console.log(`[build] ${name}`);
  if (!existsSync(join(source, 'node_modules', '.package-lock.json'))) {
    console.log(`[install] ${name} (first build only)`);
    await runNpm(source, 'ci');
  }
  await runNpm(source, 'run', 'build');

  const output = join(source, outDir);
  if (!existsSync(join(output, 'index.html'))) {
    throw new Error(`Prototype build did not produce ${outDir}/index.html: ${name}`);
  }

  // Keep the previous working embed until the new build is ready.
  const staged = join(embedsRoot, `.${name}-next`);
  if (existsSync(staged)) removeEmbed(staged);
  mkdirSync(staged, { recursive: true });
  await copyOutput(output, staged);
  fixAbsoluteTexturePaths(staged);
  writeFileSync(join(staged, '.source-hash'), fingerprint + '\n');
  if (existsSync(destination)) removeEmbed(destination);
  try {
    renameSync(staged, destination);
  } catch (error) {
    if (process.platform !== 'win32' || error.code !== 'EPERM') throw error;
    // OneDrive can temporarily block a directory rename immediately after copying.
    await copyOutput(staged, destination);
    removeEmbed(staged);
  }
  console.log(`[done] ${name} → public/embeds/${name}/`);
}

function removeEmbed(path) {
  const resolved = realpathSync(path);
  const location = relative(embedsRoot, resolved);
  if (!location || location.startsWith('..') || isAbsolute(location)) {
    throw new Error(`Refusing to remove a directory outside public/embeds: ${path}`);
  }
  rmSync(path, { recursive: true, force: true });
}

function copyOutput(source, destination) {
  if (process.platform !== 'win32') {
    return import('node:fs').then(({ cpSync }) => cpSync(source, destination, { recursive: true }));
  }
  // Node's recursive cpSync crashes on OneDrive-backed files on this Windows host.
  return new Promise((resolve, reject) => {
    const child = spawn('robocopy', [source, destination, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NC', '/NS'], {
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code !== null && code < 8) resolve();
      else reject(new Error(`robocopy failed (${signal ?? code})`));
    });
  });
}

function runNpm(cwd, ...args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`npm ${args.join(' ')} failed (${signal ?? code}) in ${cwd}`));
    });
  });
}

function sourceFingerprint(dir) {
  const hash = createHash('sha256');
  visit(dir, '');
  return hash.digest('hex');

  function visit(folder, prefix) {
    for (const entry of readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
      if (entry.name.endsWith('.tsbuildinfo')) continue;
      const full = join(folder, entry.name);
      const rel = join(prefix, entry.name);
      if (entry.isDirectory()) visit(full, rel);
      else if (entry.isFile()) {
        hash.update(rel);
        hash.update(readFileSync(full));
      }
    }
  }
}

// The terrain app refers to /textures/ in its JavaScript. Its iframe is served
// under /embeds/terrain-3d/, so make those URLs relative to that directory.
function fixAbsoluteTexturePaths(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) fixAbsoluteTexturePaths(full);
    else if (/\.(js|css|html)$/.test(entry.name)) {
      const before = readFileSync(full, 'utf8');
      const after = before
        .replaceAll('`/textures/', '`textures/')
        .replaceAll('"/textures/', '"textures/')
        .replaceAll("'/textures/", "'textures/");
      if (after !== before) writeFileSync(full, after);
    }
  }
}
