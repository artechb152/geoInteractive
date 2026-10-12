// Web delivery for the measurement-mission landscape (render_measurement_landscape.py).
// Since the 2026-10-12 pass the page ships only the live model's ground image (model-albedo.webp,
// from export_measurement_model.py); its no-WebGL stills are taken from the live model itself
// (scripts/qa/capture-measurement-fallback.mjs). The layered 55° renders are no longer shipped:
// list a pass in LAYERS to package it again — each layer is cropped to its own alpha box and its
// placement (image px) is written to measurementLandscapeLayers.data.ts. Never resize the renders.
// A tripod ships with its cast shadow under it: the shadow-catcher pass also carries faint
// light (white, low alpha), so only its darkening is kept — black at alpha·(1 − luminance).
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));

const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'qa-output/measurement-landscape');
const out = path.join(root, 'public/reference-assets/measurement-mission');
const dataFile = path.join(root, 'src/components/lessons/topic-02/measurementLandscapeLayers.data.ts');
const W = 1400;
const H = 800;
const LAYERS = [];
const PAD = 2;

async function rgba(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== W || info.height !== H) throw new Error(`${file}: ${info.width}×${info.height}, expected ${W}×${H}`);
  return data;
}

function darkening(data) {
  const lin = (v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]);
    const a = Math.round(data[i + 3] * Math.max(0, 1 - lum));
    data[i] = data[i + 1] = data[i + 2] = 0;
    data[i + 3] = a < 10 ? 0 : a;
  }
  return data;
}

function over(top, bottom) {
  // top over bottom, straight alpha
  const outp = Buffer.alloc(top.length);
  for (let i = 0; i < top.length; i += 4) {
    const ta = top[i + 3] / 255;
    const ba = bottom[i + 3] / 255;
    const a = ta + ba * (1 - ta);
    for (let k = 0; k < 3; k++) outp[i + k] = a ? Math.round((top[i + k] * ta + bottom[i + k] * ba * (1 - ta)) / a) : 0;
    outp[i + 3] = Math.round(a * 255);
  }
  return outp;
}

function alphaBox(data) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 2) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD);
  x1 = Math.min(W - 1, x1 + PAD); y1 = Math.min(H - 1, y1 + PAD);
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const placed = {};
  let total = 0;
  for (const name of LAYERS) {
    let data = await rgba(path.join(source, name + '.png'));
    if (name.startsWith('tripod-')) {
      // the catcher also returns stray light and noise across the whole ground: keep the shadow near the tripod only
      const near = alphaBox(data);
      const shadow = darkening(await rgba(path.join(source, name.replace('tripod-', 'tripod-shadow-') + '.png')));
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const out = x < near.left - 50 || x > near.left + near.width + 70 || y < near.top || y > near.top + near.height + 30;
          if (out) shadow[(y * W + x) * 4 + 3] = 0;
        }
      }
      data = over(data, shadow);
    }
    const box = alphaBox(data);
    if (!box) throw new Error(`${name}: empty render`);
    const file = path.join(out, name + '.webp');
    const sheet = name.includes('geoid') || name.includes('ellipsoid');
    await sharp(data, { raw: { width: W, height: H, channels: 4 } })
      .extract(box)
      .webp({ quality: sheet ? 90 : 84, alphaQuality: 92, effort: 6 })
      .toFile(file);
    placed[name] = { file: name + '.webp', x: box.left, y: box.top, w: box.width, h: box.height };
    const kb = fs.statSync(file).size / 1024;
    total += kb;
    console.log(name.padEnd(16), `${box.width}×${box.height}`, Math.round(kb) + ' KB');
  }
  console.log('total', Math.round(total) + ' KB');
  // the live model's ground image (export_measurement_model.py): opaque, full size
  const albedo = path.join(source, 'model-albedo.png');
  if (fs.existsSync(albedo)) {
    const file = path.join(out, 'model-albedo.webp');
    await sharp(albedo).removeAlpha().webp({ quality: 82, effort: 6 }).toFile(file);
    console.log('model-albedo'.padEnd(16), Math.round(fs.statSync(file).size / 1024) + ' KB');
  }
  if (!LAYERS.length) return;
  const lines = Object.entries(placed).map(([k, v]) => `  '${k}': ${JSON.stringify(v).replace(/"(\w+)":/g, '$1: ')},`);
  fs.writeFileSync(
    dataFile,
    `/**
 * Generated by scripts/blender/package_measurement_landscape.cjs — do not edit by hand.
 * Each rendered layer of the measurement landscape, cropped to its own alpha box:
 * x, y, w, h in px of the ${W} × ${H} render frame (one camera for all of them).
 */
export type LandscapeLayer = { file: string; x: number; y: number; w: number; h: number };

export const LANDSCAPE_LAYERS = {
${lines.join('\n')}
} as const satisfies Record<string, LandscapeLayer>;
`,
  );
  console.log('wrote', path.relative(root, dataFile));
})();
