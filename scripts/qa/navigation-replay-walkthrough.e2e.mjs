import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const out = 'design/screenshots/navigation-replay-walkthrough-2026-11-02';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const key = 'geo9900:topic06:position-walkthrough:v1';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1122 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const url = `${process.env.QA_BASE ?? 'http://localhost:3000'}/lessons/topic-06/#scene-tips`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  const activity = page.locator('[data-activity="navigation-replay"]');
  await activity.waitFor({ timeout: 180000 });
  // The walkthrough should wait for its own screen, rather than interrupt planning.
  assert.equal(await page.locator('[data-walkthrough-intro][open]').count(), 0);
  await page.locator('[data-tips-screen="nav"]').evaluate((e) => window.scrollTo({ top: e.getBoundingClientRect().top + scrollY - 104, behavior: 'instant' }));
  const intro = page.locator('[data-walkthrough-intro]');
  await intro.waitFor({ timeout: 5000 });
  assert.match(await intro.innerText(), /שני סימנים/);
  assert.match(await intro.innerText(), /בשטח.*במפה/s);
  await page.screenshot({ path: `${out}/00-intro.png` });
  await intro.locator('[data-guide-start]').click();
  const coach = activity.locator('[data-walkthrough-coach]');
  await coach.waitFor();
  await page.waitForFunction(() => document.querySelector('[data-activity="navigation-replay"] [data-view-frame]')?.hasAttribute('data-ready'), {}, { timeout: 180000 });
  let height;
  const shot = async (name, step) => {
    assert.equal(await coach.getAttribute('data-guide-step'), String(step));
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${name}.png` });
    const box = await activity.boundingBox();
    assert.ok(box.y >= 80 && box.y + box.height <= 1122, `${name}: desktop fit`);
    height ??= box.height;
    assert.ok(Math.abs(box.height - height) < 1, `${name}: stable layout`);
  };
  await shot('01-first-field', 1);
  // An unrelated but valid landmark must not advance the worked example.
  await activity.locator('[data-list="view"]').selectOption('summitW');
  assert.equal(await coach.getAttribute('data-guide-step'), '1');
  await activity.locator('[data-list="view"]').selectOption('saddle');
  await shot('02-first-map', 2);
  await activity.locator('[data-list="map"]').selectOption('summitE');
  assert.equal(await coach.getAttribute('data-guide-step'), '2');
  await activity.locator('[data-list="map"]').selectOption('saddle');
  assert.equal(await coach.locator('[data-guide-pair="1"]').getAttribute('data-complete'), 'true');
  assert.equal(await activity.locator('[data-action="commit"]').isDisabled(), true);
  await shot('03-second-field', 3);
  await activity.locator('[data-list="view"]').selectOption('stream');
  await shot('04-second-map', 4);
  await activity.locator('[data-list="map"]').selectOption('stream');
  assert.equal(await coach.locator('[data-guide-pair="2"]').getAttribute('data-complete'), 'true');
  await shot('05-verify', 5);
  await activity.locator('[data-action="commit"]').click();
  await activity.locator('[data-action="next"]').waitFor();
  assert.match(await coach.innerText(), /שתי התאמות/);
  assert.equal(await page.evaluate((k) => localStorage.getItem(k), key), 'complete');
  await activity.locator('[data-action="next"]').click();
  await activity.locator('[data-choice="check"]').waitFor();
  assert.equal(await coach.count(), 0);
  // Replay from a later station crosses an animated phase boundary: preserve focus.
  await activity.locator('[data-guide-replay]').click();
  await intro.locator('[data-guide-start]').click();
  await coach.waitFor();
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-list') === 'view', {}, { timeout: 2000 });
  assert.equal(await coach.getAttribute('data-guide-step'), '1');
  await coach.locator('[data-guide-skip]').click();
  // Once learned, the walkthrough does not reopen automatically; help remains available.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await activity.waitFor();
  await page.locator('[data-tips-screen="nav"]').evaluate((e) => e.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForTimeout(250);
  assert.equal(await intro.count(), 0);
  await activity.locator('[data-guide-replay]').click();
  await intro.waitFor();
  await intro.locator('[data-guide-skip]').click();
  assert.equal(await intro.count(), 0);
  assert.equal(await coach.count(), 0);
  // Perform the same four choices directly on the visible 3D hints and map.
  await activity.locator('[data-guide-replay]').click();
  await intro.locator('[data-guide-start]').click();
  await page.waitForFunction(() => document.querySelector('[data-activity="navigation-replay"] [data-view-frame]')?.hasAttribute('data-ready'), {}, { timeout: 180000 });
  for (const [sign, expectedStep] of [['saddle', '2'], ['stream', '4']]) {
    const ring = activity.locator('[data-view-marker="hint"] > span').last();
    await ring.waitFor();
    await page.waitForTimeout(300);
    const r = await ring.boundingBox();
    await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
    await page.waitForTimeout(150);
    assert.equal(await coach.getAttribute('data-guide-step'), expectedStep, `3D click selects ${sign}`);
    const mapFeature = sign === 'saddle'
      ? activity.locator('[data-panel="map"] [data-highlight="pulse"]')
      : activity.locator('[data-panel="map"] [data-marker="fix"]').first();
    const m = await mapFeature.boundingBox();
    await page.mouse.click(m.x + m.width / 2, m.y + m.height / 2);
    await page.waitForTimeout(150);
    assert.equal(await coach.locator(`[data-guide-pair="${sign === 'saddle' ? 1 : 2}"]`).getAttribute('data-complete'), 'true', `map click matches ${sign}`);
  }
  await activity.locator('[data-action="commit"]').click();
  await activity.locator('[data-action="next"]').waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: first-view intro, four action-driven selections (lists AND direct 3D/map clicks), wrong-pick recovery, two matched pairs, verification, persistence, replay, skip, stable 1440px layout.');
} finally {
  await browser.close();
}
