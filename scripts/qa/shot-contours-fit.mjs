// Laptop-fit QA for the topic-02 contours scene ("קווי גובה", #scene-contours).
//
// Usage (private dev server, e.g. NEXT_DIST_DIR=.next-x next dev -p 3137):
//   QA_PORT=3137 node scripts/qa/shot-contours-fit.mjs <label> [WxH ...]
// Screenshots go to design/screenshots/contours-fit-<label>/.
//
// The scene holds two learning screens, each fitted on its own:
//   model   — SceneHeader + the 3D model / contour-map card
//   density — "הערכת תלילות…" title + tabs, explanation, glossary, map + profile
// For every viewport and every state (3 model views, map hover, layer drag,
// 3 density tabs) the screen is brought under the fixed site header the way a
// learner meets it, then checked: whole screen inside the viewport, no
// horizontal scroll, nothing below it overlapping, canvas sized to its box.
// Exit code 1 on any failure.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const label = process.argv[2] ?? 'after';
const SIZES = (process.argv.length > 3 ? process.argv.slice(3) : ['1366x768', '1536x864', '1440x1122', '1920x1080']).map((s) =>
  s.split('x').map(Number),
);
const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-contours`;
const outDir = `design/screenshots/contours-fit-${label}`;
const SITE_HEADER = 80;
const GAP = 24;
await mkdir(outDir, { recursive: true });

const failures = [];
const report = {};
const fail = (msg) => failures.push(msg);
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

/** Union rect of a screen's parts, viewport coords. */
const SCREEN_PARTS = {
  model: ['#scene-contours header', '#scene-contours .surface-elevated'],
  density: ['#scene-contours h3', '#scene-contours [data-qa="density-section"]'],
};

async function screenRect(page, which) {
  return page.evaluate((sels) => {
    const rs = sels.map((s) => document.querySelector(s).getBoundingClientRect());
    const top = Math.min(...rs.map((r) => r.top));
    const bottom = Math.max(...rs.map((r) => r.bottom));
    const left = Math.min(...rs.map((r) => r.left));
    const right = Math.max(...rs.map((r) => r.right));
    const fits = [...document.querySelectorAll('#scene-contours [data-lesson-viewport-fit]')].map((f) => +f.dataset.fitScale);
    return {
      top: Math.round(top),
      bottom: Math.round(bottom),
      left: Math.round(left),
      right: Math.round(right),
      width: Math.round(right - left),
      height: Math.round(bottom - top),
      innerHeight,
      innerWidth,
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      fits,
    };
  }, SCREEN_PARTS[which]);
}

/** Scroll so the screen's top sits GAP px under the fixed site header (screen 1: page top, as loaded). */
async function bring(page, which) {
  await page.evaluate(
    ([sel, which, off]) => {
      if (which === 'model') return window.scrollTo({ top: 0, behavior: 'instant' });
      const top = document.querySelector(sel).getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top - off, behavior: 'instant' });
    },
    [SCREEN_PARTS[which][0], which, SITE_HEADER + GAP],
  );
  await page.waitForTimeout(500);
}

function check(key, m) {
  report[key] = m;
  if (m.top < SITE_HEADER) fail(`${key}: screen top ${m.top} hidden under the header`);
  if (m.bottom > m.innerHeight) fail(`${key}: screen bottom ${m.bottom} > viewport ${m.innerHeight}`);
  if (m.hScroll > 0) fail(`${key}: horizontal scroll ${m.hScroll}px`);
}

for (const [w, h] of SIZES) {
  const tag = `${w}x${h}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: 'load', timeout: 240000 });
  await page.waitForSelector('#scene-contours [data-qa="density-section"]', { timeout: 120000 });
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some((f) => f.family.includes('Heebo') && f.status === 'loaded');
  });
  if (!fonts) fail(`${tag}: Heebo did not load — measurements use a fallback font`);
  // the 3D model: wait for the canvas and for the loading overlay to clear
  await page.waitForSelector('#scene-contours canvas', { timeout: 120000 });
  await page.waitForFunction(() => !document.body.innerText.includes('טוען מודל'), null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(2500);

  // ── Screen 1: model + map, three views ──
  await bring(page, 'model');
  await page.screenshot({ path: `${outDir}/${tag}-full.png`, fullPage: true });
  for (const [i, name] of ['הר שלם', 'פריסה לשכבות', 'מבט מלמעלה'].entries()) {
    await page.getByRole('button', { name }).click();
    await page.waitForTimeout(1800);
    await bring(page, 'model');
    const m = await screenRect(page, 'model');
    m.pressed = await page.getByRole('button', { name }).getAttribute('aria-pressed');
    m.canvas = await page.evaluate(() => {
      const c = document.querySelector('#scene-contours canvas');
      const box = c.parentElement.parentElement; // r3f wrapper → ContourCake3D container
      return { css: `${c.style.width}×${c.style.height}`, box: `${box.offsetWidth}×${box.offsetHeight}` };
    });
    if (m.pressed !== 'true') fail(`${tag} model/${name}: button not pressed`);
    check(`${tag}-model-${i + 1}`, m);
    await page.screenshot({ path: `${outDir}/${tag}-model-${i + 1}.png` });
  }

  // map hover → band highlight on the map (and the matching layer in the model)
  await page.getByRole('button', { name: 'הר שלם' }).click();
  await page.waitForTimeout(1500);
  const mapSvg = page.locator('#scene-contours svg[role="img"]').first();
  const mb = await mapSvg.boundingBox();
  // summit lies near the map centre; step outward until a band lights up
  let lit = null;
  for (const dx of [0, 0.05, 0.1, 0.15, 0.2]) {
    await page.mouse.move(mb.x + mb.width * (0.5 + dx), mb.y + mb.height * 0.5);
    await page.waitForTimeout(250);
    lit = await page.evaluate(() => {
      const svg = document.querySelector('#scene-contours svg[role="img"]');
      const band = [...svg.querySelectorAll('path[fill-rule="evenodd"]')];
      const chip = [...svg.querySelectorAll('rect')].find((r) => r.getAttribute('stroke') && r.getAttribute('stroke') !== 'none' && r.getAttribute('rx') === '1');
      return band.length ? { band: band.length, chipText: chip?.nextElementSibling?.textContent ?? null } : null;
    });
    if (lit) break;
  }
  if (!lit) fail(`${tag}: hovering the map lit no band`);
  report[`${tag}-hover`] = lit;
  await page.screenshot({ path: `${outDir}/${tag}-model-hover.png` });
  await page.mouse.move(5, h - 5);

  // sliced view: drag a layer up in the 3D model → "איפוס שכבות" appears
  await page.getByRole('button', { name: 'פריסה לשכבות' }).click();
  await page.waitForTimeout(2200);
  const cb = await page.locator('#scene-contours canvas').first().boundingBox();
  let dragged = false;
  for (const [fx, fy] of [[0.5, 0.45], [0.5, 0.5], [0.45, 0.55], [0.5, 0.6], [0.55, 0.5], [0.5, 0.4]]) {
    const x = cb.x + cb.width * fx;
    const y = cb.y + cb.height * fy;
    await page.mouse.move(x, y);
    await page.waitForTimeout(200);
    await page.mouse.down();
    await page.mouse.move(x, y - cb.height * 0.06, { steps: 6 });
    await page.mouse.move(x, y - cb.height * 0.12, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    if (await page.getByRole('button', { name: /איפוס שכבות/ }).count()) {
      dragged = true;
      break;
    }
  }
  report[`${tag}-drag`] = dragged;
  if (!dragged) fail(`${tag}: dragging a layer in the sliced view did nothing`);
  await bring(page, 'model');
  await page.screenshot({ path: `${outDir}/${tag}-model-dragged.png` });
  if (dragged) {
    await page.getByRole('button', { name: /איפוס שכבות/ }).click();
    await page.waitForTimeout(300);
    if (await page.getByRole('button', { name: /איפוס שכבות/ }).count()) fail(`${tag}: reset button did not clear`);
  }

  // fullscreen: the model leaves the scaled card and fills the screen at full size
  await page.getByRole('button', { name: 'מסך מלא' }).click();
  await page.waitForTimeout(1500);
  report[`${tag}-fullscreen`] = await page.evaluate(() => {
    const el = document.fullscreenElement;
    if (!el) return 'not entered';
    const b = el.getBoundingClientRect();
    const c = el.querySelector('canvas');
    return { box: `${Math.round(b.width)}×${Math.round(b.height)}`, canvas: c && `${c.style.width}×${c.style.height}`, screen: `${innerWidth}×${innerHeight}` };
  });
  await page.screenshot({ path: `${outDir}/${tag}-model-fullscreen.png` });
  await page.evaluate(() => document.fullscreenElement && document.exitFullscreen());
  await page.waitForTimeout(800);

  // ── Screen 2: density tabs ──
  const tabs = ['גבעה מתונה', 'הר תלול', 'מצוק'];
  for (const [i, name] of tabs.entries()) {
    await page.getByRole('tab', { name: new RegExp(name) }).click();
    await page.waitForTimeout(1400);
    await bring(page, 'density');
    const m = await screenRect(page, 'density');
    m.selected = await page.getByRole('tab', { name: new RegExp(name) }).getAttribute('aria-selected');
    m.panelTitle = await page.locator('#scene-contours [role="tabpanel"] h4').innerText();
    if (m.selected !== 'true' || m.panelTitle !== name) fail(`${tag} density/${name}: tab/panel mismatch (${m.panelTitle})`);
    // nothing below the screen may start above its bottom
    m.nextTop = await page.evaluate(() => {
      const btn = document.querySelector('[aria-label="תת הנושא הבא"]');
      return btn ? Math.round(btn.getBoundingClientRect().top) : null;
    });
    if (m.nextTop !== null && m.nextTop < m.bottom) fail(`${tag} density/${name}: prev/next row ${m.nextTop} overlaps screen bottom ${m.bottom}`);
    check(`${tag}-density-${i + 1}`, m);
    await page.screenshot({ path: `${outDir}/${tag}-density-${i + 1}.png` });
  }
  // keyboard: ← advances in RTL
  await page.getByRole('tab', { name: /גבעה מתונה/ }).click();
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(500);
  const kb = await page.locator('#scene-contours [role="tab"][aria-selected="true"]').innerText();
  if (!kb.includes('הר תלול')) fail(`${tag}: ArrowLeft did not move to the next tab (${kb})`);

  if (errors.length) fail(`${tag} page errors: ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 1));
if (failures.length) {
  console.log('FAIL\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('PASS');
