// Side-by-side comparisons for the realism refinement: before | after | mockup,
// separately for the globe and for the linked close-up, at the same size.
//   [QA_STATES=open,demo-angle,…] node scripts/qa/compose-datum-realism.mjs [dir]
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));
const dir = process.argv[2] || 'design/screenshots/datum-guided/realism-refinement';
const REF = 'design/mockups/datum-concepts/01-guided-3d-site-palette.png';
const STATES = (process.env.QA_STATES || 'open,geoid,ellipsoid,demo,fit').split(',');
// the reference frame is 1421 px wide (a 0.987-scaled 1440 frame): its globe and close-up regions
const REF_GLOBE = { left: 270, top: 370, width: 460, height: 446 };
const REF_INSET = { left: 92, top: 619, width: 192, height: 192 };

const caption = (w, text) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="34"><rect width="100%" height="100%" fill="#FFFFFF"/><text x="${w / 2}" y="23" text-anchor="middle" font-family="Segoe UI, Arial" font-size="17" font-weight="600" fill="#38432E">${text}</text></svg>`);

async function row(files, labels, out) {
  const imgs = await Promise.all(files.map((f) => sharp(f).png().toBuffer({ resolveWithObject: true })));
  const w = imgs[0].info.width;
  const h = imgs[0].info.height;
  const gap = 16;
  const W = imgs.length * w + (imgs.length + 1) * gap;
  const H = h + 34 + 2 * gap;
  const layers = [];
  imgs.forEach((im, i) => {
    const x = gap + i * (w + gap);
    layers.push({ input: caption(w, labels[i]), left: x, top: gap });
    layers.push({ input: im.data, left: x, top: gap + 34 });
  });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#F3E9DC' } }).composite(layers).png().toFile(out);
}

for (const kind of ['globe', 'inset']) {
  const probe = await sharp(`${dir}/after-open-${kind}.png`).metadata();
  const ref = `${dir}/mockup-${kind}.png`;
  await sharp(REF).extract(kind === 'globe' ? REF_GLOBE : REF_INSET).resize(probe.width, probe.height, { fit: 'fill' }).toFile(ref);
  for (const s of STATES) {
    await row([`${dir}/before-${s}-${kind}.png`, `${dir}/after-${s}-${kind}.png`, ref], ['before', 'after', 'mockup (reference)'], `${dir}/compare-${s}-${kind}.png`);
  }
}
console.log('done');
