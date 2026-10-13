// QA for the topic-02 topography scene laptop fit (LessonViewportFit).
//
// Usage (dev server running):
//   node --experimental-strip-types scripts/qa/shot-topography-laptop-fit.mjs [baseUrl] [outDir]
//   default baseUrl http://localhost:3000, outDir design/screenshots/topography-laptop-fit
//
// At 1920×1080, 1536×864, 1440×1122 and 1366×768, checks (exit code 1 on any failure):
//   scale         1920×1080 stays at scale 1; no screen is ever enlarged
//   fit           the composition starts below the site header, ends on screen (shrunk screens),
//                 stays clear of the side nav, no horizontal scroll
//   footprint     the wrapper is exactly the scaled height; the 48 px gap to the pager row is unchanged
//   line breaks   every text line count matches the 1920×1080 reference
//   sharpness     the canvas backing store has ≥ 1 device px per on-screen px
//   registration  photo view: the camera's summit/buildings land on the map sheet ≤ 2 screen px
//   controls      tabs, prev/next, dots, arrow keys, 3D orbit drag, stack hover/pick, fullscreen
//   console       no page errors
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { sheetRect } from '../../src/components/lessons/topic-02/topographyLayout.ts';
import { TOPO } from '../../src/components/lessons/topic-02/topographyTerrain.data.ts';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const outDir = process.argv[3] ?? 'design/screenshots/topography-laptop-fit';
const URL = `${BASE}/lessons/topic-02/#scene-topography`;
const VIEWPORTS = [
  [1920, 1080],
  [1536, 864],
  [1440, 1122],
  [1366, 768],
];
await mkdir(outDir, { recursive: true });

const failures = [];
const report = {};
const browser = await chromium.launch({ channel: 'chrome' });
let reference = null;

const S = '#scene-topography';

async function geometry(page) {
  return page.evaluate((S) => {
    const s = document.querySelector(S);
    const fit = s.querySelector('[data-lesson-viewport-fit]');
    const inner = fit.firstElementChild.firstElementChild;
    const rect = (el) => el.getBoundingClientRect();
    const header = rect(s.querySelector('header'));
    const card = rect(s.querySelector('[role="tabpanel"]'));
    const aside = [...document.querySelectorAll('aside')].map(rect).find((r) => r.width > 100 && r.height > 300);
    const pager = [...document.querySelectorAll('main div')].find((d) => /\bmt-12\b/.test(d.className) && /\bmb-4\b/.test(d.className));
    const canvas = s.querySelector('canvas');
    const cr = rect(canvas);
    // Line count of every text node container — layout is the same whether a view is visible or hidden.
    const lines = [...s.querySelectorAll('h2, header p, [role="tabpanel"] p, [role="tabpanel"] li > span:last-child, [role="tab"] span')].map((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size;
    });
    return {
      scale: +fit.dataset.fitScale,
      headerTop: header.top,
      cardBottom: card.bottom,
      cardRight: card.right,
      cardLeft: card.left,
      asideLeft: aside ? aside.left : null,
      innerHeight,
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      footprint: fit.getBoundingClientRect().height,
      innerOffset: inner.offsetHeight,
      gapToPager: pager ? rect(pager).top - card.bottom : null,
      canvasDensity: canvas.width / cr.width,
      canvasBuffer: [canvas.width, canvas.height],
      lines,
    };
  }, S);
}

const tab = (page, name) => page.locator(S).getByRole('tab', { name: new RegExp(name) });
const selected = (page) => page.locator(`${S} [role="tab"][aria-selected="true"]`).innerText({ timeout: 4000 }).catch(async (e) => { await page.screenshot({ path: `${outDir}/debug-no-selected.png` }); throw e; });

// Other sessions edit this checkout while the dev server runs, so a Fast
// Refresh full reload can land mid-run: a viewport whose page navigates away
// is run again from scratch (its findings are discarded first).
async function runViewport(w, h, found) {
  const id = `${w}x${h}`;
  const fail = (msg) => found.push(`${id}: ${msg}`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const shot = (name) => page.screenshot({ path: `${outDir}/after-${id}-${name}.png` });
  page.setDefaultTimeout(90000);
  await page.goto(URL, { waitUntil: 'load', timeout: 180000 });
  await page.waitForSelector(`${S} canvas`, { state: 'attached', timeout: 120000 });
  await page.waitForFunction(() => !document.body.innerText.includes('טוען שטח תלת־ממדי'), null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // ---------------------------------------------------------- geometry
  const g = await geometry(page);
  report[id] = { scale: g.scale, cardBottom: +g.cardBottom.toFixed(1), footprint: Math.round(g.footprint), gapToPager: g.gapToPager, canvasDensity: +g.canvasDensity.toFixed(2) };
  if (g.scale > 1) fail(`scale ${g.scale} > 1`);
  if (w === 1920 && g.scale !== 1) fail(`reference screen scaled to ${g.scale}`);
  if (g.headerTop < 80) fail(`composition starts at ${g.headerTop}px, under the site header`);
  // Shrunk screens keep the whole card on screen; the 1920×1080 reference ends on the fold as before the fit.
  if (g.scale < 1 && g.cardBottom > g.innerHeight) fail(`card ends at ${g.cardBottom.toFixed(1)}px, below the fold (${g.innerHeight})`);
  if (g.scale === 1 && g.cardBottom > g.innerHeight + 1.5) fail(`card ends at ${g.cardBottom.toFixed(1)}px, below the fold (${g.innerHeight})`);
  if (g.asideLeft !== null && g.cardRight > g.asideLeft) fail(`card overlaps the side nav (${g.cardRight} > ${g.asideLeft})`);
  if (g.cardLeft < 0) fail(`card starts off screen (${g.cardLeft})`);
  if (g.hScroll > 0) fail(`horizontal scroll ${g.hScroll}px`);
  if (Math.abs(g.footprint - g.innerOffset * g.scale) > 1) fail(`footprint ${g.footprint} ≠ ${g.innerOffset} × ${g.scale}`);
  // mb-12 under the scene and the pager's mt-12 collapse into one 48 px gap, as before the fit.
  if (g.gapToPager !== null && Math.abs(g.gapToPager - 48) > 1) fail(`gap to pager ${g.gapToPager}px (reference 48px)`);
  if (g.canvasDensity < 1) fail(`canvas density ${g.canvasDensity.toFixed(2)} < 1 device px per on-screen px`);
  if (!reference) reference = g.lines;
  else if (g.lines.join() !== reference.join()) fail(`line breaks differ from 1920×1080: ${g.lines.join()} vs ${reference.join()}`);
  await shot('topo');
  await page.screenshot({ path: `${outDir}/after-${id}-full.png`, fullPage: true });

  // ---------------------------------------------------------- tabs, pager, dots, keys
  for (const name of ['תצ״א', 'מודל תלת־ממדי', 'כל התצוגות יחד', 'מפה טופוגרפית']) {
    await tab(page, name).click();
    await page.waitForTimeout(2800);
    if (!(await selected(page)).includes(name)) fail(`tab "${name}" not selected after click`);
    if (name !== 'מפה טופוגרפית') await shot(name === 'תצ״א' ? 'photo' : name === 'כל התצוגות יחד' ? 'stack' : '3d');
  }
  await page.getByRole('button', { name: 'התצוגה הבאה' }).click();
  if (!(await selected(page)).includes('תצ״א')) fail('next button did not advance');
  await page.getByRole('button', { name: 'התצוגה הקודמת' }).click();
  if (!(await selected(page)).includes('מפה טופוגרפית')) fail('prev button did not go back');
  await page.locator(`${S} [role="tabpanel"] div[aria-hidden] > button`).nth(2).click();
  if (!(await selected(page)).includes('מודל תלת־ממדי')) fail('progress dot did not select its view');
  await tab(page, 'מודל תלת־ממדי').focus();
  await page.keyboard.press('ArrowLeft');
  if (!(await selected(page)).includes('כל התצוגות יחד')) fail('ArrowLeft did not advance');
  await page.keyboard.press('ArrowRight');
  if (!(await selected(page)).includes('מודל תלת־ממדי')) fail('ArrowRight did not go back');

  // ---------------------------------------------------------- 3D orbit drag
  await page.waitForTimeout(2800);
  const viewer = page.locator(`${S} [role="img"]`);
  const vb = await viewer.boundingBox();
  const before = await viewer.screenshot();
  await page.mouse.move(vb.x + vb.width * 0.5, vb.y + vb.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(vb.x + vb.width * 0.5 + 120 * g.scale, vb.y + vb.height * 0.5, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(1200);
  const after = await viewer.screenshot();
  if (before.equals(after)) fail('orbit drag did not move the 3D model');
  await shot('3d-orbited');

  // ---------------------------------------------------------- photo registration
  await tab(page, 'תצ״א').click();
  await page.waitForTimeout(3200);
  const reg = await page.evaluate(
    ([S, pts]) => {
      const el = document.querySelector(`${S} [role="img"]`);
      return { w: el.offsetWidth, h: el.offsetHeight, probes: pts.map(([x, y, hm]) => window.__topoProbe?.(x, y, hm) ?? null) };
    },
    [S, [[TOPO.summit.x, TOPO.summit.y, TOPO.summit.heightM], ...TOPO.buildings.map((b) => [b.x, b.y, b.heightM])]],
  );
  if (reg.probes.some((p) => !p)) fail('registration probe unavailable');
  else {
    const r = sheetRect(reg.w, reg.h);
    const expect = [[TOPO.summit.x, TOPO.summit.y], ...TOPO.buildings.map((b) => [b.x, b.y])].map(([x, y]) => [r.x + (x / 100) * r.w, r.y + (y / 75) * r.h]);
    const err = Math.max(...reg.probes.map((p, i) => Math.hypot(p[0] - expect[i][0], p[1] - expect[i][1]))) * g.scale;
    report[id].registrationPx = +err.toFixed(2);
    if (err > 2) fail(`registration error ${err.toFixed(2)} screen px > 2`);
  }

  // ---------------------------------------------------------- map sheet labels stay on the viewer
  await tab(page, 'מפה טופוגרפית').click();
  await page.waitForTimeout(3200);
  const labels = await page.evaluate((S) => {
    const v = document.querySelector(`${S} [role="img"]`).getBoundingClientRect();
    const texts = [...document.querySelectorAll(`${S} [role="img"] svg text`)].map((t) => t.getBoundingClientRect()).filter((r) => r.width > 0);
    return { count: texts.length, outside: texts.filter((r) => r.left < v.left - 1 || r.right > v.right + 1 || r.top < v.top - 1 || r.bottom > v.bottom + 1).length };
  }, S);
  if (labels.count === 0) fail('no map labels rendered');
  if (labels.outside) fail(`${labels.outside} map labels fall outside the viewer`);

  // ---------------------------------------------------------- stack: hover linking + layer pick
  await tab(page, 'כל התצוגות יחד').click();
  await page.waitForTimeout(3200);
  const box = await viewer.boundingBox();
  // Pointing at the map layer: the chip must read the same spot at every scale
  // (bare ground → its elevation; the path near the summit → its name).
  for (const [name, x, y, ok] of [
    ['sw-cluster', TOPO.guides[1].x, TOPO.guides[1].y, (c) => /^\d{3} מ׳$/.test(c) && parseInt(c, 10) >= 295 && parseInt(c, 10) <= 315],
    ['summit-path', TOPO.summit.x - 1.2, TOPO.summit.y + 1.2, (c) => c === 'שביל רגלי'],
  ]) {
    const p = await page.evaluate(([sx, sy]) => window.__topoProbe?.(sx, sy, 283.06) ?? null, [x, y]);
    if (!p) {
      fail('probe unavailable for hover');
      break;
    }
    await page.mouse.move(box.x + p[0] * g.scale - 10, box.y + p[1] * g.scale - 10);
    await page.mouse.move(box.x + p[0] * g.scale, box.y + p[1] * g.scale, { steps: 5 });
    await page.waitForTimeout(700);
    const chip = await page.evaluate((S) => {
      const el = [...document.querySelectorAll(`${S} span`)].find((s) => s.style.opacity === '1' && s.textContent);
      return el ? el.textContent : null;
    }, S);
    report[id][`hover-${name}`] = chip;
    if (!chip || !ok(chip)) fail(`stack hover ${name}: chip "${chip}"`);
    await shot(`stack-hover-${name}`);
  }
  await page.mouse.move(5, 5);
  const layerBtns = await page.evaluate((S) => {
    const v = document.querySelector(`${S} [role="img"]`).parentElement.getBoundingClientRect();
    return [...document.querySelectorAll(`${S} button[aria-pressed]`)].map((b) => {
      const r = b.getBoundingClientRect();
      return { text: b.innerText.trim(), inside: r.left >= v.left - 1 && r.right <= v.right + 1 && r.top >= v.top - 1 && r.bottom <= v.bottom + 1 };
    });
  }, S);
  if (layerBtns.length !== 2 || layerBtns.some((b) => !b.inside)) fail(`stack layer labels: ${JSON.stringify(layerBtns)}`);
  await page.locator(`${S} button[aria-pressed]`, { hasText: 'מודל תלת־ממדי' }).click();
  await page.waitForTimeout(800);
  if (!(await selected(page)).includes('מודל תלת־ממדי')) fail('stack layer pick did not select the 3D view');

  // ---------------------------------------------------------- fullscreen
  await page.getByRole('button', { name: 'מסך מלא' }).click();
  await page.waitForTimeout(1800);
  const fs = await page.evaluate(() => {
    const el = document.fullscreenElement;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = el.querySelector('canvas');
    return { x: r.x, y: r.y, w: r.width, h: r.height, cw: c.getBoundingClientRect().width, ch: c.getBoundingClientRect().height };
  });
  if (!fs) fail('fullscreen did not open');
  else {
    report[id].fullscreen = fs;
    if (Math.abs(fs.x) > 1 || Math.abs(fs.y) > 1 || Math.abs(fs.w - w) > 1 || Math.abs(fs.h - h) > 1) fail(`fullscreen box ${JSON.stringify(fs)} ≠ viewport`);
    if (Math.abs(fs.cw - fs.w) > 1 || Math.abs(fs.ch - fs.h) > 1) fail(`fullscreen canvas ${fs.cw}×${fs.ch} does not fill ${fs.w}×${fs.h}`);
    await shot('fullscreen');
    await page.getByRole('button', { name: 'יציאה ממסך מלא' }).click();
    await page.waitForTimeout(1200);
    const back = await geometry(page);
    if (Math.abs(back.footprint - g.footprint) > 1) fail(`after fullscreen the footprint changed ${g.footprint} → ${back.footprint}`);
  }

  if (errors.length) fail(`console errors: ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

for (const [w, h] of VIEWPORTS) {
  for (let attempt = 1; ; attempt++) {
    const found = [];
    try {
      await runViewport(w, h, found);
      failures.push(...found);
      break;
    } catch (e) {
      if (attempt >= 3) throw e;
      console.warn(`${w}x${h}: attempt ${attempt} interrupted (${String(e).split(/\r?\n/)[0]}), retrying`);
    }
  }
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(`\nFAIL (${failures.length}):\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('\nPASS');
