// The measurement mission's no-WebGL stills (#scene-coordinates → "אליפסואיד, גיאואיד וגליות"):
// the turnable model itself — the height grid and the top-down Cycles image of
// render_measurement_landscape.py, drawn by MeasurementLandscape3D — photographed in the surface
// view's profile (measurementView.LAND_START), so the fallback is the model's own opening view.
//
//   land       the surface view: the ground, the survey line
//   clear      the geoid view revealed: the see-through ground, the geoid and the ellipsoid inside it
//   task-A/B/C the task view: the receiver at each station
//
// Each is taken through the page's own controls: the views are a whole number of arrow-key steps
// from the profile (measurementView.LAND_STARTS), so the keys bring each one to it exactly.
// Only the model's canvas is kept (everything else is hidden, the background transparent).
//
// Usage (a dev server; QA_BASE=http://localhost:<port>):
//   node scripts/qa/capture-measurement-fallback.mjs
// Writes public/reference-assets/measurement-mission/fallback-*.webp and
// src/components/lessons/topic-02/measurementFallback.data.ts (the frame the stills were taken in).
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));
const ROOT = process.cwd();
const RAW = path.join(ROOT, 'qa-output/measurement-fallback');
const OUT = path.join(ROOT, 'public/reference-assets/measurement-mission');
const DATA = path.join(ROOT, 'src/components/lessons/topic-02/measurementFallback.data.ts');
const URL = `${process.env.QA_BASE || 'http://localhost:3000'}/lessons/topic-02/#scene-coordinates`;
const CARD = '#scene-coordinates [aria-label="שכבות החתך"]';
const PROFILE = '0.0,9.0';
await mkdir(RAW, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1122 }, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: 'networkidle', timeout: 180000 });
await page.waitForSelector(CARD, { timeout: 60000 });
await page.evaluate((sel) => {
  const c = document.querySelector(sel).closest('.surface-elevated');
  window.scrollTo(0, c.getBoundingClientRect().top + window.scrollY - 92);
}, CARD);
await page.waitForSelector('#scene-coordinates [data-landscape="live"]', { timeout: 120000 });

const land = () => page.locator('#scene-coordinates [data-land]').getAttribute('data-land');
const stage = page.locator('#scene-coordinates [data-landscape] [role="img"][tabindex="0"]');
const keys = async (...ks) => {
  await stage.focus();
  for (const k of ks) {
    await page.keyboard.press(k);
    await page.waitForTimeout(60);
  }
};
const tab = async (name) => {
  await page.getByRole('tab', { name, exact: true }).click();
  await page.waitForTimeout(1300);
};
// only the canvas, on a transparent page
const shoot = async (name) => {
  if ((await land()) !== PROFILE) throw new Error(`${name}: the view is ${await land()}, not the profile`);
  await page.waitForTimeout(900);
  const style = await page.addStyleTag({
    content: `html, body { background: transparent !important; } body * { visibility: hidden !important; } #scene-coordinates [data-landscape] canvas { visibility: visible !important; }`,
  });
  const canvas = page.locator('#scene-coordinates [data-landscape] canvas');
  const box = await canvas.boundingBox();
  await canvas.screenshot({ path: path.join(RAW, `${name}.png`), omitBackground: true });
  await style.evaluate((n) => n.remove());
  console.log(name.padEnd(8), `${Math.round(box.width)} × ${Math.round(box.height)} css px`);
  return { w: Math.round(box.width), h: Math.round(box.height) };
};

const frames = {};
// the section's plot width at capture time: the stills' camera is registered with it (landCamera spanPx)
const span = Number(await page.locator('#scene-coordinates [data-span-px]').getAttribute('data-span-px'));
await tab('פני השטח');
frames.land = await shoot('land');
await tab('גיאואיד');
await keys('ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowDown');
await page.getByRole('button', { name: 'חשיפת משטחי הייחוס', exact: true }).click();
// the geoid sweeps in from the sea, then its line in the survey plane follows (MeasurementLandscape3D SWEEP_MS)
await page.waitForTimeout(2400);
frames.clear = await shoot('clear');
await tab('גליות וגובה');
await keys('ArrowDown');
for (const id of ['B', 'A', 'C']) {
  await page.getByRole('group', { name: 'בחירת תחנה' }).getByRole('button', { name: new RegExp(`^תחנה ${id}`) }).click();
  await page.waitForTimeout(500);
  frames[`task-${id}`] = await shoot(`task-${id}`);
}
await browser.close();

const sizes = new Set(Object.values(frames).map((f) => `${f.w}x${f.h}`));
if (sizes.size !== 1) throw new Error(`the stills were taken in different frames: ${[...sizes].join(', ')}`);
const frame = Object.values(frames)[0];
let total = 0;
for (const name of Object.keys(frames)) {
  const file = path.join(OUT, `fallback-${name}.webp`);
  await sharp(path.join(RAW, `${name}.png`)).webp({ quality: 84, alphaQuality: 90, effort: 6 }).toFile(file);
  const { size } = await import('node:fs').then((fs) => fs.statSync(file));
  total += size;
  console.log(`fallback-${name}.webp`.padEnd(24), Math.round(size / 1024) + ' KB');
}
console.log('total', Math.round(total / 1024) + ' KB');
await writeFile(
  DATA,
  `// AUTO-GENERATED by scripts/qa/capture-measurement-fallback.mjs — do not edit by hand.
// The landscape without WebGL: stills of the turnable model in the surface view's profile
// (measurementView.LAND_START), drawn from the same height grid and image, at frame w × h.

export const MEASUREMENT_FALLBACK = {
  /** The stage the stills were taken in (CSS px); the camera is landCamera(LAND_START, frame, span). */
  frame: { w: ${frame.w}, h: ${frame.h} },
  /** The section's plot width beside them (CSS px): the survey line's stretch is drawn no longer. */
  span: ${span},
  files: {
${Object.keys(frames)
  .map((k) => `    ${k.includes('-') ? `'${k}'` : k}: 'fallback-${k}.webp',`)
  .join('\n')}
  },
} as const;
`,
);
console.log('wrote', path.relative(ROOT, DATA));
