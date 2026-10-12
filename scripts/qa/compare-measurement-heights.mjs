// Before / after sheets for the measurement mission at 1440 × 1122, 900, 800 and the 1920 × 855
// desktop window (shots from scripts/qa/shot-measurement-heights.mjs before | after).
//   node scripts/qa/compare-measurement-heights.mjs [dir]
// Writes <dir>/compare/<size>.png: one row per state, before on the left, after on the right,
// cropped to the page left of the lesson's side menu (the site header stays in: it is part of
// what has to fit). A state the earlier version did not have shows as an empty "—" cell.
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));
const dir = process.argv[2] || 'design/screenshots/measurement-mission-clarity-2026-10-12';
const NAMES = ['view-surface', 'surface-back', 'view-ellipsoid', 'ellipsoid-zoomed', 'view-geoid', 'geoid-clear', 'view-undulation', 'mission-A-wrong', 'mission-complete'];
const SIZES = [
  ['h1122', 1440, 1122],
  ['h900', 1440, 900],
  ['h800', 1440, 800],
  ['1920x855', 1920, 855],
];
const SCALE = 0.5;
const GAP = 12;
const HEAD = 34;
await mkdir(`${dir}/compare`, { recursive: true });

const label = (text, w, h, color = '#38432E') =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#ffffff"/><text x="8" y="${h - 10}" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${color}">${text}</text></svg>`,
  );
const empty = (w, h) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#F6EFE6"/><text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" fill="#8A8873">—</text></svg>`,
  );

for (const [tag, W, H] of SIZES) {
  // the page left of the side menu (the menu is the last 240 px at 1440, wider windows keep it at the right)
  const crop = { left: 0, top: 0, width: W === 1440 ? 1200 : W - 240, height: H };
  const tw = Math.round(crop.width * SCALE);
  const th = Math.round(crop.height * SCALE);
  const names = NAMES.filter((n) => existsSync(`${dir}/after/${tag}-${n}.png`));
  const layers = [];
  for (const [r, name] of names.entries()) {
    const top = HEAD + r * (th + HEAD + GAP);
    for (const [c, side] of ['before', 'after'].entries()) {
      const left = c * (tw + GAP);
      const file = `${dir}/${side}/${tag}-${name}.png`;
      const img = existsSync(file) ? await sharp(file).extract(crop).resize(tw, th).toBuffer() : empty(tw, th);
      layers.push({ input: label(`${side.toUpperCase()} · ${name} · ${W}×${H}`, tw, HEAD, side === 'after' ? '#C96714' : '#38432E'), left, top: top - HEAD });
      layers.push({ input: img, left, top });
    }
  }
  const out = `${dir}/compare/${tag}.png`;
  await sharp({ create: { width: tw * 2 + GAP, height: names.length * (th + HEAD + GAP) + HEAD, channels: 3, background: '#ffffff' } })
    .composite(layers)
    .png()
    .toFile(out);
  console.log('wrote', out);
}
