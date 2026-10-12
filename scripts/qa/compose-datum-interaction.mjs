// Before / after pairs for the datum interaction refinement: the same state of
// the block (station row aligned at the same height, 1440 × 1122) before the
// change — the earlier QA run, scripts/qa/shot-datum.mjs at commit a5053ef —
// and after it (scripts/qa/shot-datum-interaction.mjs). The lesson's sidebar
// is cropped away; the rest is the full view, side by side, labelled.
// Usage: node scripts/qa/compose-datum-interaction.mjs
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));

const ROOT = 'design/screenshots/datum-guided/interaction-refinement';
const PAIRS = [
  ['station1-surface', '01-station1-surface', '01-station1-surface', 'תחנה 1 · פני השטח'],
  ['station1-geoid', '02-station1-geoid', '02-station1-geoid', 'תחנה 1 · גיאואיד'],
  ['station1-ellipsoid', '03-station1-ellipsoid', '03-station1-ellipsoid', 'תחנה 1 · אליפסואיד'],
  ['station2-open', '04-station2-open', '04-station2-open', 'תחנה 2 · פתיחה'],
  ['station2-demo-mid', '05-station2-demo-paused', '05-station2-demo-shift', 'תחנה 2 · ההדגמה באמצע'],
  ['station2-demo-end', '06-station2-demo-end', '08-station2-demo-end', 'תחנה 2 · סוף ההדגמה'],
  ['station2-experiment', '07-station2-manual', '10-station2-experiment-rotate', 'תחנה 2 · ניסיון עצמי'],
  ['station3-local', '09-station3-local-fit', '16-station3-local-inside', 'תחנה 3 · דאטום מקומי'],
  ['station3-global', '10-station3-global-of-local', '13-station3-global-inside', 'תחנה 3 · דאטום עולמי'],
];
const CROP = { left: 56, top: 0, width: 1080, height: 1122 };
const K = 0.6;
const W = Math.round(CROP.width * K);
const H = Math.round(CROP.height * K);
const HEAD = 46;
const GAP = 16;

await mkdir(`${ROOT}/compare`, { recursive: true });
const label = (text, w) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${HEAD}"><text x="${w / 2}" y="30" text-anchor="middle" direction="rtl" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#38432E">${text}</text></svg>`,
  );
for (const [name, before, after, title] of PAIRS) {
  const tile = (f) => sharp(`${ROOT}/${f}.png`).extract(CROP).resize(W, H).png().toBuffer();
  const [a, b] = await Promise.all([tile(`before/${before}`), tile(`after/${after}`)]);
  const out = `${ROOT}/compare/compare-${name}.png`;
  await sharp({ create: { width: 2 * W + GAP, height: H + HEAD, channels: 3, background: '#FAF6F0' } })
    .composite([
      { input: label(`לפני · ${title}`, W), left: 0, top: 0 },
      { input: label(`אחרי · ${title}`, W), left: W + GAP, top: 0 },
      { input: a, left: 0, top: HEAD },
      { input: b, left: W + GAP, top: HEAD },
    ])
    .png()
    .toFile(out);
  console.log(out);
}
