// Checks the generated sheets against their data (spec §10.2) and writes crops for eye review:
//  - registration/<sheet>-<landmark>.png : orthophoto | map, same window, crosshair on the landmark
//  - registration/myth-250k-x5.png vs myth-50k.png : screen D's two sides at the same size
// Run: node --experimental-strip-types scripts/maps/check-scale-sheets.mjs
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { SHEETS, SHEET_IDS } from '../../src/components/lessons/topic-02/scale/scaleSheets.data.ts';
import { LANDMARKS } from '../../src/components/lessons/topic-02/scale/scaleContent.data.ts';
import { insideSheet, lonLatToSheet, sheetBox } from '../../src/components/lessons/topic-02/scale/geo.ts';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));
const OUT = 'design/screenshots/scale-redesign/registration';
mkdirSync(OUT, { recursive: true });
const N = 1200;
const WIN = 220;
let failures = 0;
const fail = (m) => { failures++; console.log(`FAIL ${m}`); };

for (const id of SHEET_IDS) {
  const s = SHEETS[id];
  sheetBox(s.center, s.groundWidthM).forEach((v, i) => { if (Math.abs(v - s.bbox3857[i]) > 0.01) fail(`${id} bbox[${i}]`); });
  const imgs = {};
  for (const [k, layer] of [['ortho', s.ortho], ['map', s.map]]) {
    const f = join('public', layer.src);
    if (!existsSync(f)) { fail(`${id} missing ${f}`); continue; }
    const meta = await sharp(f).metadata();
    if (meta.width !== layer.px || meta.height !== layer.px) fail(`${id} ${k} ${meta.width}x${meta.height} ≠ ${layer.px}`);
    imgs[k] = await sharp(f).resize(N, N).png().toBuffer();
  }
  if (!imgs.ortho || !imgs.map) continue;
  for (const [name, lm] of Object.entries(LANDMARKS)) {
    const q = lonLatToSheet(s, lm);
    if (!insideSheet(q)) continue;
    const cx = Math.round((q.x / 1000) * N);
    const cy = Math.round((q.y / 1000) * N);
    const left = Math.min(N - WIN, Math.max(0, cx - WIN / 2));
    const top = Math.min(N - WIN, Math.max(0, cy - WIN / 2));
    const x = cx - left;
    const y = cy - top;
    const mark = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIN}" height="${WIN}"><g stroke="#ff00ff" stroke-width="2" fill="none"><circle cx="${x}" cy="${y}" r="10"/><line x1="${x - 18}" y1="${y}" x2="${x + 18}" y2="${y}"/><line x1="${x}" y1="${y - 18}" x2="${x}" y2="${y + 18}"/></g></svg>`);
    const crop = (buf) => sharp(buf).extract({ left, top, width: WIN, height: WIN }).composite([{ input: mark }]).png().toBuffer();
    await sharp({ create: { width: WIN * 2 + 8, height: WIN, channels: 3, background: '#F3E9DC' } })
      .composite([{ input: await crop(imgs.ortho), left: 0, top: 0 }, { input: await crop(imgs.map), left: WIN + 8, top: 0 }])
      .png()
      .toFile(join(OUT, `${id}-${name}.png`));
  }
}

// Screen D: the central fifth of the 1:250,000 map enlarged ×5, next to the real 1:50,000 map.
const m250 = join('public', SHEETS['250k'].map.src);
const m50 = join('public', SHEETS['50k'].map.src);
const px250 = SHEETS['250k'].map.px;
const fifth = Math.round(px250 / 5);
await sharp(m250).extract({ left: Math.round((px250 - fifth) / 2), top: Math.round((px250 - fifth) / 2), width: fifth, height: fifth })
  .resize(N, N, { kernel: 'cubic' }).png().toFile(join(OUT, 'myth-250k-x5.png'));
await sharp(m50).resize(N, N).png().toFile(join(OUT, 'myth-50k.png'));

console.log(failures ? `${failures} failure(s)` : 'sheets OK');
process.exit(failures ? 1 : 0);
