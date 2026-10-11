// Before / after sheets for the measurement mission at 1440 × 1122, 900 and 800
// (shots from scripts/qa/shot-measurement-heights.mjs before | after).
//   node scripts/qa/compare-measurement-heights.mjs [dir]
// Writes <dir>/compare/h<H>.png: one row per view and the completed task,
// before on the left, after on the right, cropped to the activity card's column
// (the site header stays in: it is part of what has to fit).
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('../../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp');
const dir = process.argv[2] || 'design/screenshots/measurement-mission-interactive';
const NAMES = ['view-surface', 'view-ellipsoid', 'view-geoid', 'view-undulation', 'mission-complete'];
const SCALE = 0.5;
const GAP = 12;
const HEAD = 34;
await mkdir(`${dir}/compare`, { recursive: true });

const label = (text, w, h, color = '#38432E') =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#ffffff"/><text x="8" y="${h - 10}" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${color}">${text}</text></svg>`,
  );

for (const H of [1122, 900, 800]) {
  const crop = { left: 0, top: 0, width: 1200, height: H };
  const tw = Math.round(crop.width * SCALE);
  const th = Math.round(crop.height * SCALE);
  const layers = [];
  for (const [r, name] of NAMES.entries()) {
    const top = HEAD + r * (th + HEAD + GAP);
    for (const [c, side] of ['before', 'after'].entries()) {
      const left = c * (tw + GAP);
      const img = await sharp(`${dir}/${side}/h${H}-${name}.png`).extract(crop).resize(tw, th).toBuffer();
      layers.push({ input: label(`${side.toUpperCase()} · ${name} · 1440×${H}`, tw, HEAD, side === 'after' ? '#C96714' : '#38432E'), left, top: top - HEAD });
      layers.push({ input: img, left, top });
    }
  }
  const out = `${dir}/compare/h${H}.png`;
  await sharp({ create: { width: tw * 2 + GAP, height: NAMES.length * (th + HEAD + GAP) + HEAD, channels: 3, background: '#ffffff' } })
    .composite(layers)
    .png()
    .toFile(out);
  console.log('wrote', out);
}
