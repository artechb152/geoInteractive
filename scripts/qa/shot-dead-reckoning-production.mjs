// Exercise the actual static export using public controls, with no dev placement/state hooks.
// node scripts/qa/shot-dead-reckoning-production.mjs [outDir] [--base=http://127.0.0.1:3078]
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const out = args.find(a => !a.startsWith('--')) ?? 'design/screenshots/dead-reckoning-polish/production';
const base = (args.find(a => a.startsWith('--base=')) ?? '--base=http://127.0.0.1:3078').slice(7);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];
const metrics = {};
let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; console.log('ok', label); };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1122 } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(`${base}/lessons/topic-06/#scene-combatnav`, { waitUntil: 'load', timeout: 120000 });
  const root = page.locator('[data-activity="dead-reckoning"]');
  await root.waitFor({ state: 'visible', timeout: 120000 });
  const align = () => root.evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'instant' }));
  await align();
  const t0 = Date.now();
  await root.locator('[data-view-ready]').waitFor({ timeout: 120000 });
  metrics.firstFrameMs = Date.now() - t0;
  check(await page.evaluate(() => !window.__dr && !window.__drDev && !window.__drScene), 'production contains no dev state/placement hooks');
  const shot = async name => {
    await align();
    await page.screenshot({ path: `${out}/${name}.png` });
    await root.locator('[data-panel="dr-view"]').screenshot({ path: `${out}/${name}-view.png` });
  };
  await shot('01-plan');
  await root.locator('[data-count-input]').fill('800');
  await root.getByRole('button', { name: 'בדיקה', exact: true }).click();
  const compass = root.locator('[data-travel-compass][role="slider"]');
  await compass.focus();
  for (let k = 0; k < 6; k++) await page.keyboard.press('PageUp');
  for (let k = 0; k < 2; k++) await page.keyboard.press('ArrowRight');
  check(await compass.getAttribute('aria-valuenow') === '62', 'compass set through keyboard');
  await root.getByRole('button', { name: 'יציאה לדרך', exact: true }).click();
  await shot('02-depart');
  const advance = async pairs => {
    await root.locator('[data-advance="walk"]').click();
    await page.locator(`[data-activity="dead-reckoning"][data-pairs="${pairs}"]:not([data-moving])`).waitFor({ timeout: 30000 });
    check(await root.getAttribute('data-pairs') === String(pairs), `count ${pairs} after real animated movement`);
  };
  for (const pairs of [100, 200, 300, 400]) await advance(pairs);
  await shot('03-wadi');
  check(await root.locator('[data-wadi-label]').count() === 0, 'wadi not named before identification');
  await root.locator('[data-compare-map]').click();
  check(await root.locator('[data-map-panel]').isVisible(), 'planning map opens in production');
  check(Number(await root.locator('[data-map-walked]').getAttribute('data-map-walked')) === 600, 'planning map and counted 600m agree');
  await shot('04-map');
  await root.locator('[data-map-close]').click();
  await root.locator('[data-radio="sign"] [data-option="wadi"]').click();
  await root.getByRole('button', { name: 'בדיקה', exact: true }).click();
  await root.locator('[data-wadi-label]').waitFor();
  await shot('05-identified');
  const surface = root.locator('[data-look-surface]');
  await surface.focus();
  for (let k = 0; k < 12; k++) await page.keyboard.press('ArrowRight');
  check(await root.getAttribute('data-pairs') === '400', 'looking around preserves count');
  await shot('06-look-side');
  await page.keyboard.press('Home');
  await advance(500);
  check(await root.locator('[data-wadi-label]').count() === 0, 'wadi label absent 150m later');
  await shot('07-past-wadi');
  metrics.idle = await page.evaluate(() => new Promise(resolve => {
    let frames = 0, last = performance.now(), start = last, worst = 0;
    function tick(now) {
      frames++; worst = Math.max(worst, now - last); last = now;
      if (now - start < 2000) requestAnimationFrame(tick);
      else resolve({ fps: Math.round(frames * 1000 / (now - start)), worstFrameMs: Math.round(worst) });
    }
    requestAnimationFrame(tick);
  }));
  for (const pairs of [600, 700, 800]) await advance(pairs);
  await shot('08-finished-count');
  check(await root.getAttribute('data-step') === 'verify', 'finished count asks for verification');
  await root.locator('[data-radio="verify"] [data-option="estimate"]').click();
  await root.getByRole('button', { name: 'בדיקה', exact: true }).click();
  await shot('09-debrief');
  check(await root.getAttribute('data-done') === 'true', 'verification completes activity');
  check(errors.length === 0, `no runtime/shader/network errors: ${errors.join(' | ')}`);
  await writeFile(`${out}/metrics.json`, JSON.stringify({ checks, ...metrics, errors }, null, 2));
  console.log(JSON.stringify({ checks, ...metrics }));
  await context.close();
} finally { await browser.close(); }
