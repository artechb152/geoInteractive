// QA capture for the lessons 2 & 6 UI-language cleanup.
// Usage: node scripts/qa/shot-ui-cleanup.mjs <outDir> <topicId> [sceneId ...]
// Env: QA_BASE (default http://localhost:3000).
//
// Per scene writes:
//   <topic>-<scene>.png          full page (downscaled when viewed — for layout)
//   <topic>-<scene>-sN.png       1440×1100 slices of the same full page (for detail)
//   <topic>-<scene>.txt          innerText of #scene-<scene> (default state) — diff it
//                                before/after to prove no visible wording changed
// Scrolls through the page first so framer-motion `whileInView` sections are
// revealed, and retries when the Next.js dev error overlay / a mid-HMR compile
// is on screen.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const [outDir, topic, ...only] = process.argv.slice(2);
const BASE = process.env.QA_BASE ?? 'http://localhost:3000';
const SCENES = {
  'topic-02': ['hook', 'onboarding', 'relief-cover', 'landforms', 'geology', 'landcover', 'topography', 'scale', 'coordinates', 'contours', 'recap'],
  'topic-06': ['hook', 'onboarding', 'principles', 'planning', 'combatnav', 'recap'],
};
const list = only.length ? only : SCENES[topic];
const SLICE = 1100;
// Scene roots whose DOM id differs from the nav/hash id.
const ROOT_ID = { combatnav: 'scene-combat' };
const rootId = (sid) => ROOT_ID[sid] ?? `scene-${sid}`;

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1122 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));

async function capture(id) {
  await page.goto(`${BASE}/lessons/${topic}/#scene-${id}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(2500);
  const ok = await page.evaluate((rid) => !!document.getElementById(rid), rootId(id));
  if (!ok) throw new Error(`#scene-${id} not rendered (compile error or HMR in progress?)`);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(900);
  const base = `${outDir}/${topic}-${id}`;
  const text = await page.evaluate((rid) => document.getElementById(rid)?.innerText ?? '', rootId(id));
  await writeFile(`${base}.txt`, text, 'utf8');
  await page.screenshot({ path: `${base}.png`, fullPage: true });
  const full = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let i = 0, y = 0; y < full; i++, y += SLICE) {
    await page.screenshot({
      path: `${base}-s${i + 1}.png`,
      fullPage: true,
      clip: { x: 0, y, width: 1440, height: Math.min(SLICE, full - y) },
    });
  }
}

for (const id of list) {
  let last;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await capture(id);
      last = null;
      break;
    } catch (e) {
      last = e;
      await page.waitForTimeout(4000 * attempt);
    }
  }
  if (last) errors.push(`capture ${id} failed: ${String(last).slice(0, 200)}`);
}
console.log(JSON.stringify({ topic, shots: list.length, outDir, errors: [...new Set(errors)].slice(0, 8) }));
await browser.close();
