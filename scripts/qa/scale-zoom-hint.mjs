// Browser QA for the topic-02 scale lab's zoom hint (audit ב5; handoff topic02-map-readability-handoff-2026-10-27.md).
// Usage (dev server on :3000, or QA_BASE=http://localhost:<port>):
//   node scripts/qa/scale-zoom-hint.mjs [outDir]
// Screenshots + scale-zoom-hint.json go to outDir (default qa-output/scale-zoom-hint, git-ignored). Exit code 1 on any failure.
//
// The behaviour checked:
//   - explore: the bubble shows at load and describes the map; Tab alone does not dismiss it;
//   - the first action on the map (a press, an action key, a control in it) dismisses it and leaves the cue:
//     an accent border on + / − and the description, until the first zoom (wheel, + key, or the + button);
//   - measure: the bubble never shows — not on the tab, with one or two points, or on a scale switch —
//     and the zoom buttons never cover a point, a handle, the ruler or the reading; it does not come back in explore.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const W = 1440;
const H = 1122;
const BASE = process.env.QA_BASE ?? 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-02/#scene-scale`;
const outDir = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'qa-output/scale-zoom-hint';
const ACCENT = 'rgb(217, 126, 43)';
await mkdir(outDir, { recursive: true });

const failures = [];
const fail = (m) => {
  failures.push(m);
  console.log(`FAIL ${m}`);
};
const ok = (cond, m) => (cond ? console.log(`ok   ${m}`) : fail(m));
const report = { url: URL, viewport: `${W}x${H}` };
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];

async function fresh() {
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: 'load', timeout: 240000 });
  await page.waitForSelector('[data-qa="scale-lab"] [data-qa="sheet-viewport"]', { timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const el = document.querySelector('[data-qa="scale-lab"] .surface-elevated');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'instant' });
  });
  await page.waitForTimeout(500);
  const lab = page.locator('[data-qa="scale-lab"]');
  const vp = lab.locator('[data-qa="sheet-viewport"]');
  const state = () =>
    page.evaluate(() => {
      const lab = document.querySelector('[data-qa="scale-lab"]');
      const vp = lab.querySelector('[data-qa="sheet-viewport"]');
      const plus = lab.querySelector('button[aria-label="התקרבות"]');
      const d = vp.getAttribute('aria-describedby');
      return {
        hint: !!lab.querySelector('[data-qa="zoom-hint"]'),
        cue: lab.querySelector('[data-qa="zoom-buttons"]')?.getAttribute('data-cue') === 'true',
        plusBorder: getComputedStyle(plus).borderTopColor,
        k: +vp.getAttribute('data-view').split(',')[0],
        view: vp.getAttribute('data-view'),
        described: d ? (document.getElementById(d)?.textContent ?? null) : null,
      };
    });
  return { ctx, page, lab, vp, state };
}
const settle = (page) => page.waitForTimeout(450);
const j = (o) => JSON.stringify(o);

// explore at load, then a press on the map
{
  const { ctx, page, vp, state } = await fresh();
  const s0 = await state();
  report.exploreLoad = s0;
  ok(s0.hint && !s0.cue, `explore load: hint shown, no cue (${j(s0)})`);
  ok(!!s0.described && s0.described.includes('זום'), 'explore load: the map is described by the zoom hint');
  await page.screenshot({ path: `${outDir}/scale-1-explore-load.png` });
  const b = await vp.boundingBox();
  await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.3);
  await page.mouse.down();
  await page.mouse.up();
  await settle(page);
  const s1 = await state();
  report.explorePress = s1;
  ok(!s1.hint && s1.cue && s1.k === s0.k, `explore press: hint gone, cue on, no zoom (${j(s1)})`);
  ok(s1.plusBorder === ACCENT, `explore press: + wears the accent (${s1.plusBorder})`);
  ok(!!s1.described, 'explore press: description kept until the first zoom');
  await page.screenshot({ path: `${outDir}/scale-2-explore-cue.png` });
  await ctx.close();
}

// measure: the hint never covers; scale switch, wheel zoom, drag; back to explore
{
  const { ctx, page, lab, vp, state } = await fresh();
  await lab.getByRole('tab', { name: 'מדידה' }).click();
  await settle(page);
  const s0 = await state();
  report.measureTab = s0;
  ok(!s0.hint && s0.cue, `measure tab: hint gone, cue on (${j(s0)})`);
  const b = await vp.boundingBox();
  await page.mouse.click(b.x + b.width * 0.35, b.y + b.height * 0.3);
  await settle(page);
  ok(!(await state()).hint, 'measure one point: no hint');
  // B in the lower middle, where the audit saw the bubble cover it
  await page.mouse.click(b.x + b.width * 0.62, b.y + b.height * 0.82);
  await page.waitForTimeout(900);
  const two = await page.evaluate(() => {
    const lab = document.querySelector('[data-qa="scale-lab"]');
    const r = (el) => el && el.getBoundingClientRect();
    const hit = (a, c) => !!a && !!c && a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top;
    const btns = r(lab.querySelector('[data-qa="zoom-buttons"]'));
    const marks = [...lab.querySelectorAll('[data-qa="point-dot"], [data-qa="handle-disc"], [data-qa="ruler"], [data-qa="reading-chip"]')].map(r);
    return {
      dots: lab.querySelectorAll('[data-qa="point-dot"]').length,
      result: lab.querySelector('[data-qa="result-ground"]')?.textContent ?? null,
      buttonsCover: marks.some((m) => hit(btns, m)),
      hint: !!lab.querySelector('[data-qa="zoom-hint"]'),
    };
  });
  report.measureTwo = two;
  ok(two.dots === 2 && !!two.result && !two.hint && !two.buttonsCover, `measure two points: two dots, a result, no hint, nothing under + / − (${j(two)})`);
  await page.screenshot({ path: `${outDir}/scale-3-measure-two.png` });
  await vp.screenshot({ path: `${outDir}/scale-3-measure-two-map.png` });

  await lab.getByRole('radio', { name: /1:10,000/ }).click();
  await page.waitForTimeout(1200);
  const sw = await state();
  report.measureScaleSwitch = sw;
  ok(!sw.hint && sw.cue, `measure scale switch: no hint, cue kept (${j(sw)})`);
  await lab.getByRole('radio', { name: /1:50,000/ }).click();
  await page.waitForTimeout(1200);

  await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(700);
  const z = await state();
  report.measureZoom = z;
  ok(z.k > 1 && !z.cue && !z.hint && z.described === null, `measure wheel zoom: zoomed, cue and description gone (${j(z)})`);
  const before = z.view;
  await page.mouse.move(b.x + b.width * 0.2, b.y + b.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.6, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = (await state()).view;
  ok(before !== after, `measure drag: the map pans (${before} → ${after})`);
  await page.screenshot({ path: `${outDir}/scale-4-measure-zoomed.png` });

  await lab.getByRole('tab', { name: 'חקירה' }).click();
  await settle(page);
  const e = await state();
  ok(!e.hint, `back to explore: the hint stays gone (${j(e)})`);
  await ctx.close();
}

// keyboard: an action key dismisses, + zooms and ends the cue, 0 resets
{
  const { ctx, page, vp, state } = await fresh();
  await vp.focus();
  await page.keyboard.press('ArrowRight');
  await settle(page);
  const s1 = await state();
  report.keyArrow = s1;
  ok(!s1.hint && s1.cue, `keyboard arrow: hint gone, cue on (${j(s1)})`);
  await page.keyboard.press('+');
  await page.waitForTimeout(600);
  const s2 = await state();
  report.keyPlus = s2;
  ok(s2.k > 1 && !s2.cue, `keyboard +: zoomed, cue gone (${j(s2)})`);
  await page.keyboard.press('0');
  await page.waitForTimeout(600);
  ok((await state()).k === 1, 'keyboard 0: reset');
  await ctx.close();
}

// Tab alone does not dismiss; the + button zooms and ends both; the reset button
{
  const { ctx, page, lab, vp, state } = await fresh();
  await vp.focus();
  await page.keyboard.press('Tab');
  await settle(page);
  ok((await state()).hint, 'Tab: the hint stays (moving focus is not an action)');
  await lab.locator('button[aria-label="התקרבות"]').click();
  await page.waitForTimeout(600);
  const s = await state();
  report.plusButton = s;
  ok(!s.hint && !s.cue && s.k > 1, `+ button: zoomed, hint and cue gone (${j(s)})`);
  await lab.locator('button[aria-label="איפוס התצוגה"]').click();
  await page.waitForTimeout(600);
  ok((await state()).k === 1, 'reset button: back to k = 1');
  await ctx.close();
}

await browser.close();
ok(errors.length === 0, `no page errors ${errors.slice(0, 3).join(' | ')}`);
report.failures = failures;
await writeFile(`${outDir}/scale-zoom-hint.json`, JSON.stringify(report, null, 1));
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nPASS');
process.exit(failures.length ? 1 : 0);
