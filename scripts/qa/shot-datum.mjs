// QA for the guided 3-D datum block (topic-02 #scene-coordinates), as lesson 2
// tasks 14–15 rebuilt it (2026-10-26): "אותו אליפסואיד, עיגון אחר", "דאטום עולמי
// ומקומי", the "מה השתנה?" check, and the closed "הרחבה" card.
//
// Usage (dev server on :3000):
//   node scripts/qa/shot-datum.mjs [outDir]          (QA_BASE=http://localhost:3001 for another server)
//
// Drives every station, choice and feedback at 1440 × 1122 and fails (exit 1) on:
//   - console / page errors, or a failed request;
//   - a removed control coming back (the demo button, "נסו בעצמכם", sliders, a score);
//   - station 1: switching the anchoring that changes the size, or a comparison that
//     does not appear once both anchorings are seen;
//   - station 2: a datum choice that does not apply, check points that do not follow
//     the choice, a close-up that is missing;
//   - station 3: a wrong answer that is not explained or cannot be changed, a right one
//     that does not open the next pair, the next pair not starting at datum A, no
//     completion, a restart that keeps old answers;
//   - an answer or a choice that resizes the card inside a station;
//   - textures or GPU buffers created while the ellipsoid moves (per-frame allocation);
//   - the "הרחבה" card open by default, or not opening;
//   - the 3-D loader not covering the wait (textures held), or staying after the first frame;
//   - missing reduced-motion (instant) or no-WebGL (live section + legend, no loader) behaviour.
// The stage exposes its state as data-* attributes (station, anchor, mode, pair,
// moving, pose, other, inspect) — read here instead of any on-screen number.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] || 'design/screenshots/datum-guided/tasks-14-15';
const BASE = process.env.QA_BASE || 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-02/#scene-coordinates`;
await mkdir(outDir, { recursive: true });

/* The block's poses (datumDemo.ts — the unit tests pin them). */
const GLOBAL = '0,0,0,1';
const ANCHOR_B = '-18,16,10,1';
const LOCAL = '22,-4,-6,1';
const CHECK = ['20,-16,12,1', '0,0,0,1.08', '-20,12,-12,0.88'];
const ANSWERS = ['anchor', 'ellipsoid', 'both'];

const failures = [];
const notes = [];
const fail = (m) => failures.push(m);
const check = (cond, m) => (cond ? notes.push(`ok  ${m}`) : fail(m));

const browser = await chromium.launch({ channel: 'chrome' });
const TITLE = 'דאטום: אליפסואיד ועיגון';
const stageSel = `[role=group][aria-label="${TITLE}"]`;

async function open({ reducedMotion = 'no-preference', webgl = true, hold = null } = {}) {
  const b = webgl ? browser : await chromium.launch({ channel: 'chrome', args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1122 }, reducedMotion });
  const page = await ctx.newPage();
  // count WebGL textures / buffers created by the datum stage's canvas (not the lesson's other scenes)
  await page.addInitScript((title) => {
    window.__datumGL = { createTexture: 0, createBuffer: 0 };
    for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext].filter(Boolean)) {
      for (const m of ['createTexture', 'createBuffer']) {
        const orig = C.prototype[m];
        C.prototype[m] = function (...a) {
          if (this.canvas?.closest?.(`[aria-label="${title}"]`)) window.__datumGL[m]++;
          return orig.apply(this, a);
        };
      }
    }
  }, TITLE);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/datum-fallback\.webp/.test(m.text()) && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && !r.url().includes('_next/webpack-hmr') && errors.push(`${r.status()} ${r.url()}`));
  let release = null;
  if (hold) {
    // hold the globe's surface textures: the 3-D view cannot draw its first frame until they arrive
    const held = [];
    release = () => held.splice(0).forEach((r) => r.continue());
    await page.route(hold, (route) => held.push(route));
  }
  await page.goto(URL, { waitUntil: 'load', timeout: 180000 });
  await page.waitForSelector(stageSel, { state: 'attached', timeout: 120000 });
  await align(page);
  if (webgl && !hold) {
    await page.waitForSelector(`${stageSel} canvas`, { timeout: 60000 });
    await page.waitForFunction((sel) => !document.querySelector(`${sel} [data-loading]`), stageSel, { timeout: 60000 });
    await page.waitForTimeout(1500);
  } else await page.waitForTimeout(1500);
  await align(page);
  return { b, ctx, page, errors, release };
}

/** Scroll so the card's top sits just under the site header — repeated until the lesson above stops moving. */
async function align(page) {
  for (let i = 0; i < 6; i++) {
    const moved = await page.evaluate((title) => {
      const card = [...document.querySelectorAll('h3')].find((h) => h.textContent === title).closest('.surface-elevated');
      const d = card.getBoundingClientRect().top - 96;
      window.scrollBy(0, d);
      return Math.abs(d);
    }, TITLE);
    await page.waitForTimeout(moved > 2 ? 500 : 150);
    if (moved <= 2) return;
  }
}

const stage = (page) => page.locator(stageSel);
const attr = (page, a) => stage(page).getAttribute(`data-${a}`);
const poseOf = async (page) => (await attr(page, 'pose')).split(',').map(Number).map((x) => +x.toFixed(3)).join(',');
const settle = async (page) => {
  await page.waitForFunction((sel) => document.querySelector(sel)?.dataset.moving === 'false', stageSel, { timeout: 10000 });
  await page.waitForTimeout(250);
};
const cardH = (page) => page.evaluate((title) => [...document.querySelectorAll('h3')].find((h) => h.textContent === title).closest('.surface-elevated').offsetHeight, TITLE);
const feedback = (page) => page.locator('[data-datum-feedback]');
const shot = async (page, name) => {
  await align(page);
  await page.screenshot({ path: `${outDir}/${name}.png` });
};

/* ───────────── the main run ───────────── */
{
  const { ctx, page, errors } = await open();
  const block = page.locator('.surface-elevated', { has: page.locator('h3', { hasText: TITLE }) });

  // removed controls stay out
  for (const name of ['הפעלת ההדגמה', 'נסו בעצמכם', 'הצגת התאמה', 'איפוס']) check((await block.getByRole('button', { name }).count()) === 0, `no "${name}" button`);
  check((await block.locator('input[type=range]').count()) === 0, 'no sliders in the block');
  check(!/%|אחוז/.test(await block.innerText()), 'no score or percentage');

  /* station 1 */
  check((await attr(page, 'station')) === '0', 'opens on station 1');
  check((await poseOf(page)) === GLOBAL, `anchoring A is the geocentric pose (${await poseOf(page)})`);
  check((await attr(page, 'other')) === ANCHOR_B, 'the dashed outline is anchoring B');
  check((await feedback(page).innerText()).includes('עברו לעיגון ב׳'), 'before B: the feedback asks to compare');
  const h1a = await cardH(page);
  await shot(page, '01-station1-anchor-a');
  await page.locator('button[data-anchor="b"]').click();
  check((await attr(page, 'moving')) === 'true', 'switching the anchoring eases');
  await settle(page);
  check((await poseOf(page)) === ANCHOR_B, `anchoring B on screen (${await poseOf(page)})`);
  const fb1 = await feedback(page).innerText();
  check(fb1.includes('אותו אליפסואיד בעיגון אחר הוא דאטום אחר') && fb1.includes('גוף הייחוס'), 'after B: the comparison (reference body vs anchoring) is shown');
  check((await cardH(page)) === h1a, `station 1 card height stable (${h1a} → ${await cardH(page)})`);
  await shot(page, '02-station1-anchor-b');
  // keyboard: the radio group (RTL: ArrowRight goes back to A)
  await page.locator('button[data-anchor="b"]').focus();
  await page.keyboard.press('ArrowRight');
  await settle(page);
  check((await attr(page, 'anchor')) === 'a', 'arrow keys move between the anchorings');
  check((await feedback(page).innerText()).includes('אותו אליפסואיד בעיגון אחר'), 'back on A: the comparison stays');
  await shot(page, '03-station1-anchor-a-after-b');

  /* station 2 */
  await page.getByRole('button', { name: 'דאטום עולמי ומקומי' }).click();
  await settle(page);
  check((await attr(page, 'station')) === '1', 'station 2 opens');
  check((await poseOf(page)) === GLOBAL && (await attr(page, 'other')) === LOCAL, 'global datum shown, local dashed');
  check((await page.locator('[data-coordinates1-screen="datum"] svg circle').count()) > 0, 'the close-up is drawn');
  const fbG = await feedback(page).innerText();
  check(/באזור המסומן/.test(fbG) && /פער גדול/.test(fbG), `global · inside: a large gap ("${fbG.replace(/\s+/g, ' ')}")`);
  const h2 = await cardH(page);
  await shot(page, '04-station2-global-inside');
  await page.locator('[data-probe="outside"]').click();
  await page.waitForTimeout(500);
  check((await attr(page, 'inspect')) === '0.600', 'the outside check point');
  check(/פער קטן/.test(await feedback(page).innerText()), 'global · outside: a small gap');
  await shot(page, '05-station2-global-outside');
  await page.locator('button[data-mode="local"]').click();
  await settle(page);
  check((await poseOf(page)) === LOCAL && (await attr(page, 'other')) === GLOBAL, 'local datum shown, global dashed');
  check((await attr(page, 'inspect')) === '0.600', 'the check point does not move with the datum');
  const fbLo = await feedback(page).innerText();
  check(/מחוץ לאזור/.test(fbLo) && /יש פער/.test(fbLo) && /קטן יותר/.test(fbLo), 'local · outside: a gap, smaller in the global datum');
  await shot(page, '06-station2-local-outside');
  await page.locator('[data-probe="inside"]').click();
  await page.waitForTimeout(500);
  check(/כמעט חופפים/.test(await feedback(page).innerText()), 'local · inside: almost coincide');
  check((await cardH(page)) === h2, `station 2 card height stable (${h2} → ${await cardH(page)})`);
  await shot(page, '07-station2-local-inside');

  /* station 3 */
  await page.getByRole('button', { name: 'בדיקה: מה השתנה?' }).click();
  check((await poseOf(page)) === GLOBAL, 'the check opens on datum A');
  await settle(page);
  check((await poseOf(page)) === CHECK[0] && (await attr(page, 'other')) === GLOBAL, 'pair 1: datum B on screen, datum A dashed');
  const h3idle = await cardH(page);
  check((await feedback(page).getAttribute('data-datum-feedback')) === 'idle', 'pair 1: no verdict before an answer');
  await shot(page, '08-check-pair1');
  for (let i = 0; i < 3; i++) {
    const wrong = ['anchor', 'ellipsoid', 'both'].filter((c) => c !== ANSWERS[i]);
    const gl0 = await page.evaluate(() => ({ ...window.__datumGL }));
    for (const w of wrong) {
      await page.locator(`[data-change="${w}"]`).click();
      await page.waitForTimeout(250);
      check((await feedback(page).getAttribute('data-datum-feedback')) === 'wrong', `pair ${i + 1}: "${w}" is marked wrong`);
      check((await page.getByRole('button', { name: 'לזוג הבא' }).count()) === 0, `pair ${i + 1}: no next pair after a wrong answer`);
      check((await cardH(page)) === h3idle, `pair ${i + 1}: card height stable after "${w}"`);
      await shot(page, `09-check-pair${i + 1}-wrong-${w}`);
    }
    await page.locator(`[data-change="${ANSWERS[i]}"]`).click();
    await page.waitForTimeout(250);
    check((await feedback(page).getAttribute('data-datum-feedback')) === 'right', `pair ${i + 1}: "${ANSWERS[i]}" is right`);
    check((await feedback(page).innerText()).startsWith('נכון'), `pair ${i + 1}: the explanation starts with the verdict`);
    await page.locator(`[data-change="${wrong[0]}"]`).click({ force: true }); // aria-disabled once the pair is done
    check((await page.locator(`[data-change="${ANSWERS[i]}"]`).getAttribute('aria-pressed')) === 'true', `pair ${i + 1}: a right answer stays`);
    check((await cardH(page)) === h3idle, `pair ${i + 1}: card height stable after the right answer`);
    await shot(page, `10-check-pair${i + 1}-right`);
    if (i < 2) {
      await page.getByRole('button', { name: 'לזוג הבא' }).click();
      check((await poseOf(page)) === GLOBAL, `pair ${i + 2} starts at datum A`);
      await settle(page);
      check((await poseOf(page)) === CHECK[i + 1], `pair ${i + 2}: datum B on screen (${await poseOf(page)})`);
      const focused = await page.evaluate(() => document.activeElement?.dataset?.change ?? null);
      check(focused === 'anchor', 'focus moves to the first answer of the new pair');
      const gl1 = await page.evaluate(() => ({ ...window.__datumGL }));
      check(gl1.createTexture === gl0.createTexture && gl1.createBuffer === gl0.createBuffer,
        `no textures / buffers created while the ellipsoid moves (textures ${gl0.createTexture}→${gl1.createTexture}, buffers ${gl0.createBuffer}→${gl1.createBuffer})`);
    }
  }
  const done = await feedback(page).innerText();
  check(/באליפסואיד, בעיגון או בשניהם/.test(done), 'completion: the takeaway is stated');
  await page.getByRole('button', { name: 'הצגת המעבר שוב' }).click();
  check((await poseOf(page)) === GLOBAL, 'replay: back to datum A');
  await settle(page);
  check((await poseOf(page)) === CHECK[2], 'replay: and to datum B again');
  await shot(page, '11-check-complete');
  await page.getByRole('button', { name: 'מההתחלה' }).click();
  await settle(page);
  check((await attr(page, 'pair')) === '0' && (await feedback(page).getAttribute('data-datum-feedback')) === 'idle', 'restart: pair 1, no answers');

  /* stations keep their state */
  await page.getByRole('button', { name: 'אותו אליפסואיד, עיגון אחר' }).click();
  await settle(page);
  check((await attr(page, 'anchor')) === 'a' && (await poseOf(page)) === GLOBAL, 'station 1 as it was left');
  await page.getByRole('button', { name: 'דאטום עולמי ומקומי' }).click();
  await settle(page);
  check((await attr(page, 'mode')) === 'local' && (await attr(page, 'inspect')) === '-0.800', 'station 2 as it was left');

  /* the "הרחבה" card */
  const conv = page.getByRole('button', { name: 'הרחבה: המרת קואורדינטות בין דאטומים' });
  check((await conv.getAttribute('aria-expanded')) === 'false', 'הרחבה: closed by default');
  check((await page.locator('#datum-conversion-body').count()) === 0, 'הרחבה: its text is not on the page until opened');
  await conv.click();
  await page.waitForTimeout(600);
  check((await conv.getAttribute('aria-expanded')) === 'true', 'הרחבה: opens');
  const convText = await page.locator('#datum-conversion-body').innerText();
  check(/המרת קואורדינטות היא פעולה אחרת/.test(convText) && /אינו משנה את האליפסואיד/.test(convText), 'הרחבה: conversion is set apart from the datum; scale is not the ellipsoid');
  await conv.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/12-conversion-open.png` });
  await conv.click();

  check(errors.length === 0, `no console / page errors (${errors.slice(0, 3).join(' | ')})`);
  await ctx.close();
}

/* ───────────── the 3-D loader covers the wait, then goes ───────────── */
{
  const { ctx, page, errors, release } = await open({ hold: '**/datum-guided/textures/**' });
  await page.waitForTimeout(2500);
  const loader = page.locator(`${stageSel} [data-loading]`);
  check((await loader.count()) === 1 && /טוען גלובוס תלת־ממדי/.test(await loader.innerText()), 'loader shown while the textures are held');
  check((await page.locator(`${stageSel} ul`).count()) === 0, 'no legend before its marks are drawn');
  await shot(page, '13-loader');
  release();
  await page.waitForFunction((sel) => !document.querySelector(`${sel} [data-loading]`), stageSel, { timeout: 60000 }).catch(() => {});
  check((await loader.count()) === 0, 'loader gone once the globe is drawn');
  check((await page.locator(`${stageSel} canvas`).count()) === 1, 'the canvas is up');
  check((await page.locator(`${stageSel} ul`).count()) === 1, 'the legend comes with the first frame');
  check(errors.length === 0, `loader run: no errors (${errors.slice(0, 3).join(' | ')})`);
  await ctx.close();
}

/* ───────────── reduced motion: every change is instant ───────────── */
{
  const { ctx, page, errors } = await open({ reducedMotion: 'reduce' });
  await page.locator('button[data-anchor="b"]').click();
  check((await attr(page, 'moving')) === 'false' && (await poseOf(page)) === ANCHOR_B, 'reduced motion: the anchoring switches at once');
  await page.getByRole('button', { name: 'בדיקה: מה השתנה?' }).click();
  check((await attr(page, 'moving')) === 'false' && (await poseOf(page)) === CHECK[0], 'reduced motion: the pair shows datum B at once');
  await page.locator('[data-change="anchor"]').click();
  await page.getByRole('button', { name: 'לזוג הבא' }).click();
  check((await attr(page, 'moving')) === 'false' && (await poseOf(page)) === CHECK[1], 'reduced motion: the next pair at once');
  check(errors.length === 0, 'reduced motion: no errors');
  await ctx.close();
}

/* ───────────── no WebGL: the live section beside the static picture ───────────── */
{
  const { b, ctx, page, errors } = await open({ webgl: false });
  check((await page.locator(`${stageSel} canvas`).count()) === 0, 'no WebGL: no canvas');
  check((await page.locator(`${stageSel} [data-loading]`).count()) === 0, 'no WebGL: no loader');
  check((await page.locator(`${stageSel} svg[role=img]`).count()) === 1, 'no WebGL: the live section');
  check((await page.locator(`${stageSel} ul`).innerText()).includes('מרכז כדור הארץ וציר הסיבוב'), 'no WebGL: the legend');
  await shot(page, '14-no-webgl-station1');
  await page.locator('button[data-anchor="b"]').click();
  await page.waitForTimeout(1200);
  await shot(page, '15-no-webgl-station1-b');
  await page.getByRole('button', { name: 'דאטום עולמי ומקומי' }).click();
  await page.waitForTimeout(1200);
  await shot(page, '16-no-webgl-station2');
  check(errors.length === 0, 'no WebGL: no errors');
  await ctx.close();
  await b.close();
}

await browser.close();
console.log(notes.join('\n'));
if (failures.length) {
  console.log(`\nFAIL (${failures.length}):\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`\nPASS — ${notes.length} checks; screenshots in ${outDir}`);
