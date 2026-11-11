// Before/after captures for the graphics pass on lesson 6 › „במהלך הניווט: מה צריך לבדוק?” (the replay's live 3D view).
//
// Usage (dev server running):
//   node scripts/qa/shot-navigation-replay-graphics.mjs <before|after> [--base=http://localhost:3000] [--ref]
//
// At 1440 × 1122, for each of the four moments: the page, the view frame, full screen at the opening look,
// full screen looking down at the feet, turned 90° and 180°, and zoomed in. Then a drag-turn timing (frames
// drawn per second while the look changes) and the time a moment change takes. --ref also captures the
// „ניווט עיוור” view for side-by-side comparison.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const label = args.find((a) => !a.startsWith('--')) ?? 'before';
const BASE = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7);
const out = `design/screenshots/navigation-replay-graphics-2026-11-01/${label}`;
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1122 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(`${BASE}/lessons/topic-06/#scene-tips`, { waitUntil: 'domcontentloaded', timeout: 180000 });
const a = page.locator('[data-activity="navigation-replay"]');
await a.waitFor({ timeout: 180000 });
const frame = a.locator('[data-view-frame]');
const align = () =>
  page.evaluate(() => {
    const el = document.querySelector('[data-tips-screen="nav"]') ?? document.querySelector('[data-activity="navigation-replay"]');
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 104, behavior: 'instant' });
  });
const ready = (id) =>
  page.waitForFunction((id) => window.__replayStats?.station === id && document.querySelector('[data-activity="navigation-replay"] [data-view-frame][data-ready]'), id, { timeout: 180000 });
const keys = async (k, n) => {
  for (let i = 0; i < n; i++) await page.keyboard.press(k);
  await page.waitForTimeout(250);
};
const home = async () => {
  await frame.focus();
  await keys('Home', 1);
};

const report = { moments: {}, errors };
await align();
for (const id of ['depart', 'enroute', 'saddle', 'after']) {
  const t0 = Date.now();
  await a.locator(`[data-moment="${id}"]`).click();
  await ready(id);
  const changeMs = Date.now() - t0;
  await align();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${id}-page.png` });
  await frame.screenshot({ path: `${out}/${id}-view.png` });

  // full screen: the opening look, then the feet, the sides, behind, and a zoom
  await home();
  await a.locator('[data-view-controls] button').last().click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  await page.waitForTimeout(700);
  await frame.focus();
  await page.screenshot({ path: `${out}/${id}-fs.png` });
  await keys('ArrowDown', 7);
  await page.screenshot({ path: `${out}/${id}-fs-down.png` });
  await home();
  await keys('ArrowRight', 11); // 88°
  await page.screenshot({ path: `${out}/${id}-fs-yaw90.png` });
  await keys('ArrowRight', 12); // 184°
  await page.screenshot({ path: `${out}/${id}-fs-yaw180.png` });
  await home();
  await keys('+', 5); // ×3 zoom
  await page.screenshot({ path: `${out}/${id}-fs-zoom.png` });
  await home();
  await keys('ArrowDown', 4);
  await keys('+', 3);
  await page.screenshot({ path: `${out}/${id}-fs-zoom-near.png` });

  // frames drawn while dragging the look for ~2 s
  await home();
  const box = await frame.boundingBox();
  await page.evaluate(() => {
    window.__fps = { n: 0, on: true };
    const tick = () => {
      if (!window.__fps.on) return;
      window.__fps.n++;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  const tDrag = Date.now();
  for (let i = 0; i < 120; i++) await page.mouse.move(cx + Math.sin(i / 12) * 300, cy + Math.cos(i / 20) * 40);
  await page.mouse.up();
  const dragS = (Date.now() - tDrag) / 1000;
  const frames = await page.evaluate(() => {
    window.__fps.on = false;
    return window.__fps.n;
  });
  await page.evaluate(() => document.exitFullscreen());
  await page.waitForFunction(() => !document.fullscreenElement);
  await home();
  report.moments[id] = { changeMs, dragFps: Math.round(frames / dragS), stats: await page.evaluate(() => window.__replayStats) };
  console.log(id, JSON.stringify(report.moments[id]));
}

if (args.includes('--ref')) {
  await page.goto(`${BASE}/lessons/topic-06/#scene-combatnav`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  const dr = page.locator('[data-activity="dead-reckoning"]');
  await dr.waitFor({ timeout: 180000 });
  await dr.scrollIntoViewIfNeeded();
  await page.waitForTimeout(12000);
  await page.screenshot({ path: `${out}/ref-combatnav-page.png` });
}

await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify({ out, errors }));
