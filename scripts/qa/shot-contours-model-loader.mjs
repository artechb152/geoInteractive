// Loader QA for the contours 3D mountain (topic-02, #scene-contours):
// hold the model's GLB with page.route, screenshot the ModelLoading frame,
// release it and confirm the loader goes once the mountain is drawn.
//   QA_PORT=3123 node scripts/qa/shot-contours-model-loader.mjs <label>
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const label = process.argv[2] ?? 'after';
const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-contours`;
const outDir = `design/screenshots/contours-model-${label}`;
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1122 } })).newPage();
let release;
const held = new Promise((r) => (release = r));
await page.route('**/contour-mountain/contour-mountain.glb', async (route) => {
  await held;
  await route.continue();
});

await page.goto(URL, { waitUntil: 'load', timeout: 240000 });
await page.waitForSelector('#scene-contours .surface-elevated', { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => document.querySelector('#scene-contours')?.innerText.includes('טוען הר תלת־ממדי'), null, { timeout: 120000 });
await page.waitForTimeout(800);
const card = page.locator('#scene-contours .surface-elevated').first();
await card.screenshot({ path: `${outDir}/0-loader-card.png` });

release();
const t0 = Date.now();
await page.waitForFunction(() => !document.querySelector('#scene-contours')?.innerText.includes('טוען הר'), null, { timeout: 120000 });
const gone = Date.now() - t0;
await page.waitForTimeout(1500);
await card.screenshot({ path: `${outDir}/0-loaded-card.png` });
await browser.close();
console.log(`loader shown while the GLB was held; cleared ${gone} ms after release`);
