// Browser QA for the topic-02 scale lab (task 10: one map, modes "חקירה" / "מדידה").
// Usage (dev server on :3000):
//   node --experimental-strip-types scripts/qa/shot-scale.mjs [--screen=explore|measure|compare|all] [outDir]
// Exit code 1 on any failure. Screenshots go to outDir (default design/screenshots/scale-redesign/qa).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { SHEETS } from '../../src/components/lessons/topic-02/scale/scaleSheets.data.ts';
import { EXAMPLE_PAIR, LANDMARKS, SHOWN_AS, ZOOM_SENTENCE } from '../../src/components/lessons/topic-02/scale/scaleContent.data.ts';
import {
  formatDistance, formatNumber, groundDistanceM, insideSheet, lonLatToSheet, readCm, readingPrecisionM, sheetCm, sheetToLonLat,
} from '../../src/components/lessons/topic-02/scale/geo.ts';

const args = process.argv.slice(2);
const SCREEN = (args.find((a) => a.startsWith('--screen=')) ?? '--screen=all').split('=')[1];
const outDir = args.find((a) => !a.startsWith('--')) ?? 'design/screenshots/scale-redesign/qa';
const BASE = 'http://localhost:3000/lessons/topic-02/';
const NAV = 88;
const H = 1122;
const LAB = 'scale-lab';
await mkdir(outDir, { recursive: true });

const failures = [];
const fail = (m) => {
  failures.push(m);
  console.log(`FAIL ${m}`);
};
const ok = (cond, m) => (cond ? console.log(`ok   ${m}`) : fail(m));
const browser = await chromium.launch({ channel: 'chrome' });

async function open(hash, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: H }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(BASE + hash, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  return { ctx, page, errors };
}

const shot = (page, name) => page.screenshot({ path: `${outDir}/${name}.png` });
const block = (page, qa) => page.locator(`[data-qa="${qa}"]`);
const viewport = (page) => block(page, LAB).locator('[data-qa="sheet-viewport"]');

async function scrollTo(page, qa) {
  await page.evaluate(([q, off]) => {
    const el = document.querySelector(`[data-qa="${q}"]`);
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off);
  }, [qa, NAV]);
  await page.waitForTimeout(500);
}

async function fits(page, label) {
  const r = await block(page, LAB).locator('.surface-elevated').first().boundingBox();
  ok(r && r.height <= H - NAV - 16, `${label}: workspace ${Math.round(r?.height ?? -1)}px fits under the nav`);
}

async function noHScroll(page, label) {
  const d = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(d <= 0, `${label}: no horizontal scroll (${d})`);
}

const rectOf = async (loc) => {
  const r = await loc.boundingBox();
  return r ? [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 2) / 2) : null;
};
const sameRect = (a, b) => a && b && a.every((v, i) => Math.abs(v - b[i]) <= 0.5);
const centre = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
const isActive = (loc) => loc.evaluate((el) => el === document.activeElement);
const SUFFIX = { 'מפה טופוגרפית': ` · מוצג: ${SHOWN_AS.map}`, 'תצ״א': ` · מוצג: ${SHOWN_AS.ortho}`, 'השוואה': ` · מוצג: ${SHOWN_AS.compare}` };

/** Current view transform of the lab map (data-view = "k,x,y"). */
const viewOf = async (page) => (await viewport(page).getAttribute('data-view')).split(',').map(Number);
/** Screen px of a sheet point under the current view. */
async function screenOfUnits(page, q) {
  const r = await viewport(page).boundingBox();
  const [k, tx, ty] = await viewOf(page);
  return { x: r.x + tx + (q.x / 1000) * r.width * k, y: r.y + ty + (q.y / 1000) * r.height * k };
}
/** Sheet units of a screen point under the current view. */
async function unitsOfScreen(page, p) {
  const r = await viewport(page).boundingBox();
  const [k, tx, ty] = await viewOf(page);
  return { x: ((p.x - r.x - tx) / (r.width * k)) * 1000, y: ((p.y - r.y - ty) / (r.height * k)) * 1000 };
}

/**
 * Each curtain chip hangs 8 px off the line on its own side (the left one drops below the north arrow when
 * it would reach under it); a chip is hidden only when its half is narrower than the chip + 16 px.
 * Runs in the page; returns problem strings.
 */
const chipAnchorProblems = (vp) => {
  const box = vp.getBoundingClientRect();
  const lineEl = vp.querySelector(':scope > [data-qa="curtain-line"]');
  if (!lineEl) return ['no curtain line'];
  const lr = lineEl.getBoundingClientRect();
  const x = (lr.left + lr.right) / 2 - box.left;
  const problems = [];
  for (const side of ['left', 'right']) {
    const el = vp.querySelector(`:scope > [data-qa="curtain-chip-${side}"]`);
    if (!el) {
      problems.push(`no ${side} chip`);
      continue;
    }
    const c = el.getBoundingClientRect();
    const half = side === 'left' ? x : box.width - x;
    const shown = el.dataset.shown === 'true' && getComputedStyle(el).visibility !== 'hidden';
    const fitsIn = half >= c.width + 16;
    if (shown !== fitsIn) problems.push(`${side} chip ${shown ? 'shown' : 'hidden'} with half ${half.toFixed(0)} px for a ${c.width.toFixed(0)} px chip`);
    if (!shown) continue;
    const gap = side === 'left' ? x - (c.right - box.left) : c.left - box.left - x;
    if (Math.abs(gap - 8) > 1) problems.push(`${side} chip ${gap.toFixed(1)} px from the line (want 8)`);
  }
  return problems;
};
const curtainX = (page) => viewport(page).evaluate((v) => {
  const l = v.querySelector(':scope > [data-qa="curtain-line"]');
  if (!l) return null;
  const r = l.getBoundingClientRect();
  return (r.left + r.right) / 2 - v.getBoundingClientRect().left;
});

const radio = (page, name) => block(page, LAB).getByRole('radio', { name, exact: true });
const sheetRadio = (page, re) => block(page, LAB).getByRole('radio', { name: re });
const tab = (page, name) => block(page, LAB).getByRole('tab', { name, exact: true });
const checkedSheet = async (page) => (await block(page, LAB).getByRole('radiogroup', { name: 'קנה מידה של המפה' }).locator('[aria-checked="true"]').innerText()).split('\n')[0].trim();
const checkedView = async (page) => (await block(page, LAB).getByRole('radiogroup', { name: 'סוג הייצוג' }).locator('[aria-checked="true"]').innerText()).trim();

async function waitMorph(page) {
  await page.waitForTimeout(900);
}

// ───────────────────────── explore ─────────────────────────
async function checkExplore() {
  const { ctx, page, errors } = await open('#scene-scale');
  const L = block(page, LAB);
  const vp = viewport(page);

  // First screen: the scene title and the whole map are visible at load (no scroll).
  const first = await page.evaluate(() => {
    const v = document.querySelector('[data-qa="scale-lab"] [data-qa="sheet-viewport"]').getBoundingClientRect();
    const h2 = document.querySelector('#scene-scale h2').getBoundingClientRect();
    return { y: window.scrollY, vpTop: v.top, vpBottom: v.bottom, h2Top: h2.top };
  });
  ok(first.h2Top >= 88 && first.vpBottom <= H, `explore: first screen shows the title (top ${Math.round(first.h2Top)}) and the whole map (bottom ${Math.round(first.vpBottom)} ≤ ${H})`);
  await shot(page, 'lab-first-screen');

  await scrollTo(page, LAB);
  await fits(page, 'explore');
  await shot(page, 'explore-initial');

  ok((await tab(page, 'חקירה').getAttribute('aria-selected')) === 'true' && (await tab(page, 'מדידה').getAttribute('aria-selected')) === 'false', 'explore: opens on the "חקירה" tab');
  ok((await L.getByRole('tabpanel').getAttribute('aria-labelledby')) === (await tab(page, 'חקירה').getAttribute('id')), 'explore: the panel is labelled by the active tab');
  // No question, prediction, table or answer input on the first screen.
  ok((await L.locator('fieldset, table, input:not([type="range"])').count()) === 0, 'explore: no prediction question, status table or answer field');
  ok((await L.getByRole('button', { name: 'בדיקה' }).count()) === 0, 'explore: no check button');
  // Label "מפה טופוגרפית".
  ok((await radio(page, 'מפה טופוגרפית').getAttribute('aria-checked')) === 'true', 'explore: representation "מפה טופוגרפית" selected at mount');
  ok((await vp.getAttribute('aria-label')).endsWith(SUFFIX['מפה טופוגרפית']), 'explore: map label names the representation');

  // Readouts: only the page area and 1 cm.
  const rows = await L.locator('[data-qa="explore-readouts"] > div').evaluateAll((els) =>
    els.map((r) => ({ term: r.querySelector('dt').textContent, value: r.querySelector('dd').textContent, iso: r.querySelector('dd bdi[dir="ltr"]')?.textContent ?? null })),
  );
  ok(
    rows.length === 2 && rows[0].term === 'שטח הדף' && rows[0].iso === '12 × 12' && rows[0].value === '12 × 12 ק״מ' && rows[1].term === '1 ס״מ על הדף מייצג' && rows[1].value === '500 מ׳ בשטח',
    `explore: readouts ${JSON.stringify(rows)}`,
  );
  ok((await L.getByText('קמ״ר').count()) === 0 && (await L.locator('[data-qa="km-bar"]').count()) === 0, 'explore: no km² and no 1 km bar');
  ok((await block(page, 'explore-live').textContent()) === 'מפה 1:50,000: 12 × 12 ק״מ, 1 ס״מ על הדף = 500 מ׳ בשטח', 'explore: live summary of the sheet');

  // Child extent: ink long-dash frame "תחום 1:10,000".
  const extent = L.locator('[data-qa="child-extent-frame"]');
  ok((await extent.getAttribute('stroke')) === '#38432E' && (await L.locator('[data-qa="child-extent-label"] text').textContent()) === 'תחום 1:10,000', 'explore: ink extent frame "תחום 1:10,000"');

  // Layer switch keeps the view and the overlay pixel-identical.
  const r0 = await rectOf(extent);
  const v0 = await vp.getAttribute('data-view');
  for (const name of ['תצ״א', 'השוואה', 'מפה טופוגרפית']) {
    await radio(page, name).click();
    await page.waitForTimeout(350);
    ok(sameRect(r0, await rectOf(extent)) && v0 === (await vp.getAttribute('data-view')), `explore: view and overlay unchanged after "${name}"`);
    ok((await vp.getAttribute('aria-label')).endsWith(SUFFIX[name]), `explore: map label follows the representation (${name})`);
  }
  await radio(page, 'השוואה').click();
  await page.waitForTimeout(350);
  const chipR = await vp.locator('[data-qa="curtain-chip-right"]').textContent();
  ok(chipR === 'מפה טופוגרפית' && (await vp.locator('[data-qa="curtain-chip-left"]').textContent()) === 'תצ״א', `explore: curtain chips "תצ״א" | "${chipR}"`);
  const anchor = await vp.evaluate(chipAnchorProblems);
  ok(anchor.length === 0, `explore: curtain chips anchored ${anchor.join(', ')}`);
  ok((await L.locator('input[type="range"]').getAttribute('aria-valuetext')).includes('מפה טופוגרפית מימין לקו'), 'explore: curtain slider names "מפה טופוגרפית"');
  await shot(page, 'explore-compare');

  // Zoom + pan, then switch layers again.
  await vp.focus();
  await page.keyboard.press('+');
  await page.waitForTimeout(450);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(150);
  const vz = await vp.getAttribute('data-view');
  ok(Number(vz.split(',')[0]) > 1.4, `explore: keyboard zoom (${vz})`);
  const rz = await rectOf(extent);
  await radio(page, 'מפה טופוגרפית').click();
  await page.waitForTimeout(350);
  ok(vz === (await vp.getAttribute('data-view')) && sameRect(rz, await rectOf(extent)), 'explore: zoomed view and overlay survive a layer switch');
  await shot(page, 'explore-zoomed');

  // Scale switch: morph, then the full sheet.
  await sheetRadio(page, /1:10,000/).click();
  await page.waitForTimeout(200);
  ok((await page.locator('[data-qa="morph-ghost"]').count()) === 1, 'explore: morph ghost mid-transition');
  await waitMorph(page);
  ok((await vp.getAttribute('data-view')) === '1.000,0.0,0.0', 'explore: scale switch resets the view');
  ok((await block(page, 'explore-live').textContent()) === 'מפה 1:10,000: 2.4 × 2.4 ק״מ, 1 ס״מ על הדף = 100 מ׳ בשטח', 'explore: readouts follow the sheet');
  await shot(page, 'explore-10k');

  // Locate: Shibli inside → ring on the spot; the Kinneret outside → message.
  const marker = L.locator('[data-qa="locate-marker"]');
  const line = block(page, 'locate-line');
  const shibli = L.getByRole('button', { name: 'שיבלי', exact: true });
  await sheetRadio(page, /1:50,000/).click();
  await waitMorph(page);
  await shibli.click();
  await page.waitForTimeout(300);
  ok((await shibli.getAttribute('aria-pressed')) === 'true', 'locate: the active button is pressed');
  ok((await line.getAttribute('aria-live')) === 'polite' && (await line.innerText()) === 'שיבלי: סומן על המפה.', `locate: "${await line.innerText()}"`);
  const ring = await marker.locator('circle').last().boundingBox();
  const want = await screenOfUnits(page, lonLatToSheet(SHEETS['50k'], LANDMARKS.shibli));
  const d = Math.hypot(centre(ring).x - want.x, centre(ring).y - want.y);
  ok(d <= 1, `locate: ring centred on Shibli (Δ ${d.toFixed(2)} px)`);
  ok((await marker.locator('text').textContent()) === 'שיבלי', 'locate: the name pill reads "שיבלי"');
  await shot(page, 'locate-shibli');
  for (const name of ['הדרך לפסגה', 'פסגת הר תבור']) {
    await L.getByRole('button', { name, exact: true }).click();
    await page.waitForTimeout(200);
    ok((await marker.count()) === 1 && (await line.innerText()) === `${name}: סומן על המפה.`, `locate: "${name}" marked on 1:50,000`);
  }
  ok((await shibli.getAttribute('aria-pressed')) === 'false', 'locate: only one button pressed');
  const kinneret = L.getByRole('button', { name: 'הכנרת', exact: true });
  await kinneret.click();
  await page.waitForTimeout(250);
  ok((await line.innerText()) === 'הכנרת מחוץ לקטע הזה. עברו לקנה מידה קטן יותר.' && (await marker.count()) === 0, `locate: outside message "${await line.innerText()}"`);
  await shot(page, 'locate-outside');
  await sheetRadio(page, /1:250,000/).click();
  await waitMorph(page);
  ok((await marker.count()) === 1 && (await line.innerText()) === 'הכנרת: סומן על המפה.', 'locate: the Kinneret marked on 1:250,000');
  await shot(page, 'locate-kinneret-250k');
  await kinneret.click();
  await page.waitForTimeout(200);
  ok((await marker.count()) === 0 && (await line.innerText()) === '', 'locate: pressing again clears the mark');

  await noHScroll(page, 'explore');
  ok(errors.length === 0, `explore: no console errors ${errors.join(' | ')}`);
  await ctx.close();

  // Reduced motion: no morph frame.
  const rm = await open('#scene-scale', { reducedMotion: 'reduce' });
  await scrollTo(rm.page, LAB);
  await sheetRadio(rm.page, /1:10,000/).click();
  await rm.page.waitForTimeout(100);
  ok((await rm.page.locator('[data-qa="morph-ghost"]').count()) === 0, 'explore: reduced motion has no morph');
  await block(rm.page, 'zoom-compare-toggle').click();
  await rm.page.waitForTimeout(100);
  ok((await rm.page.locator('[data-qa="morph-ghost"]').count()) === 0 && (await viewOf(rm.page))[0] === 1.6, 'compare: reduced motion opens at once at ×1.6');
  await rm.ctx.close();
}

// ───────────────────────── measure ─────────────────────────
async function checkMeasure() {
  const { ctx, page, errors } = await open('#scene-scale');
  const L = block(page, LAB);
  const vp = viewport(page);
  await scrollTo(page, LAB);

  // Mode switching keeps the sheet, the representation and the curtain.
  await sheetRadio(page, /1:10,000/).click();
  await waitMorph(page);
  await radio(page, 'השוואה').click();
  await page.waitForTimeout(300);
  await L.locator('input[type="range"]').fill('40');
  await page.waitForTimeout(200);
  const cx0 = await curtainX(page);
  await tab(page, 'מדידה').click();
  await page.waitForTimeout(400);
  ok((await tab(page, 'מדידה').getAttribute('aria-selected')) === 'true', 'measure: tab selected');
  ok((await checkedSheet(page)) === '1:10,000' && (await checkedView(page)) === 'השוואה', `measure: sheet and representation kept (${await checkedSheet(page)}, ${await checkedView(page)})`);
  const cx1 = await curtainX(page);
  ok(cx0 !== null && Math.abs(cx0 - cx1) < 0.5 && (await L.locator('input[type="range"]').inputValue()) === '40', `measure: curtain kept (${cx0?.toFixed(1)} → ${cx1?.toFixed(1)})`);
  await fits(page, 'measure');
  // Keyboard: the tablist roves with the arrows (RTL: ← = next).
  await tab(page, 'מדידה').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  ok((await tab(page, 'חקירה').getAttribute('aria-selected')) === 'true' && (await isActive(tab(page, 'חקירה'))), 'mode tabs: arrow keys move selection and focus');
  ok((await checkedSheet(page)) === '1:10,000' && (await checkedView(page)) === 'השוואה' && Math.abs((await curtainX(page)) - cx0) < 0.5, 'mode tabs: back in explore, sheet/representation/curtain unchanged');
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(250);
  ok((await tab(page, 'מדידה').getAttribute('aria-selected')) === 'true', 'mode tabs: ← selects "מדידה"');

  // Free tool: no targets, no answer input, no check button.
  ok((await L.locator('input:not([type="range"]), select').count()) === 0 && (await L.getByRole('button', { name: 'בדיקה' }).count()) === 0, 'measure: no answer field, list or check button');
  ok((await block(page, 'result-empty').innerText()) === 'סמנו שתי נקודות על המפה.', 'measure: empty state asks for two points');

  await sheetRadio(page, /1:50,000/).click();
  await waitMorph(page);
  await radio(page, 'מפה טופוגרפית').click();
  await page.waitForTimeout(300);
  const box = await vp.boundingBox();
  const at = (fx, fy) => ({ x: box.x + fx * box.width, y: box.y + fy * box.height });
  const S = SHEETS['50k'];

  /** Expected readout for two sheet points on `sheetId`. */
  const expectFor = (sheetId, la, lb) => {
    const D = SHEETS[sheetId].denominator;
    const g = groundDistanceM(la, lb);
    return { ground: formatDistance(g, readingPrecisionM(D)), cm: `${formatNumber(readCm(sheetCm(g, D)), 1)} ס״מ על הדף`, g };
  };
  const result = async () => ({ ground: (await block(page, 'result-ground').innerText()).replace(/\s*בשטח$/, ''), sheet: await block(page, 'result-sheet').innerText() });
  const dotAt = async (i) => centre(await L.locator(`[data-qa="handle-${i}"] [data-qa="point-dot"]`).boundingBox());

  // Two arbitrary clicks: the distance appears at once and equals the geodesic of the two lat/lons.
  const pA = at(0.43, 0.46);
  const pB = at(0.58, 0.55);
  await page.mouse.click(pA.x, pA.y);
  await page.waitForTimeout(200);
  ok((await block(page, 'result-empty').innerText()) === 'סמנו את נקודה ב.', 'measure: after one click the panel asks for ב');
  const dA = await dotAt(0);
  ok(Math.hypot(dA.x - pA.x, dA.y - pA.y) <= 1, `measure: point א on the click (Δ ${Math.hypot(dA.x - pA.x, dA.y - pA.y).toFixed(2)} px)`);
  await page.mouse.click(pB.x, pB.y);
  await page.waitForTimeout(250);
  let llA = sheetToLonLat(S, await unitsOfScreen(page, pA));
  let llB = sheetToLonLat(S, await unitsOfScreen(page, pB));
  let want = expectFor('50k', llA, llB);
  let got = await result();
  ok(got.ground === want.ground && got.sheet === want.cm, `measure: free distance "${got.ground}" / "${got.sheet}" = geodesic ${want.g.toFixed(1)} m → "${want.ground}" / "${want.cm}"`);
  ok((await L.locator('[data-qa="ruler"]').count()) === 1 && (await L.locator('[data-qa="reading-chip"] text').textContent()) === got.sheet.replace(' על הדף', ''), 'measure: ruler and reading chip on the map');
  ok((await block(page, 'result-relation').innerText()) === 'ב־1:50,000, כל ס״מ על הדף הוא 500 מ׳ בשטח.', 'measure: relation line');
  await page.waitForTimeout(800);
  ok((await block(page, 'measure-live').textContent()) === `המרחק בין א ל־ב: ${want.ground} בשטח, ${want.cm.replace(' על הדף', '')} על הדף.`, `measure: live region "${await block(page, 'measure-live').textContent()}"`);
  ok(await block(page, 'measure-live').evaluate((el) => el.getAttribute('aria-live') === 'polite' && el.closest('[data-qa="measure-result"]') === null), 'measure: one polite live region, the visible result is not live');
  await page.mouse.move(box.x - 40, box.y);
  await shot(page, 'measure-two-points');

  // A third click moves the nearer point (here א).
  const pA2 = at(0.35, 0.5); // clear of א's disc (it stands off up-left of א)
  await page.mouse.click(pA2.x, pA2.y);
  await page.waitForTimeout(250);
  const dA2 = await dotAt(0);
  const dB2 = await dotAt(1);
  const fmt = (p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  ok(
    Math.hypot(dA2.x - pA2.x, dA2.y - pA2.y) <= 1 && Math.hypot(dB2.x - pB.x, dB2.y - pB.y) <= 1,
    `measure: a third click moves the nearer point (א ${fmt(dA2)} → click ${fmt(pA2)}), ב stays (${fmt(dB2)} vs ${fmt(pB)})`,
  );
  llA = sheetToLonLat(S, await unitsOfScreen(page, pA2));

  // Drag ב: live update during the drag; the announcement waits for the rest.
  const before = await result();
  const disc = centre(await L.locator('[data-qa="handle-1"] [data-qa="handle-disc"]').boundingBox());
  await page.mouse.move(disc.x, disc.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(disc.x + i * 5, disc.y + i * 3);
  await page.waitForTimeout(100);
  const mid = await result();
  ok(mid.ground !== before.ground, `measure: the distance updates live while dragging (${before.ground} → ${mid.ground})`);
  ok((await block(page, 'measure-live').textContent()) !== `המרחק בין א ל־ב: ${mid.ground} בשטח, ${mid.sheet.replace(' על הדף', '')} על הדף.`, 'measure: not announced mid-drag');
  await page.mouse.up();
  await page.waitForTimeout(250);
  const dB3 = await dotAt(1);
  ok(Math.hypot(dB3.x - (pB.x + 40), dB3.y - (pB.y + 24)) <= 1.5, 'measure: dragging the disc moves ב by the pointer offset');
  llB = sheetToLonLat(S, await unitsOfScreen(page, dB3));
  want = expectFor('50k', llA, llB);
  got = await result();
  ok(got.ground === want.ground && got.sheet === want.cm, `measure: after the drag "${got.ground}" / "${got.sheet}" (want "${want.ground}" / "${want.cm}")`);
  await page.waitForTimeout(800);
  ok((await block(page, 'measure-live').textContent()).startsWith(`המרחק בין א ל־ב: ${want.ground} בשטח`), 'measure: announced once the drag rests');
  await shot(page, 'measure-dragged');

  // Keyboard: ב moves 5 mm with five → presses.
  const handle1 = L.locator('[data-qa="handle-1"]');
  await handle1.focus();
  const k0 = await dotAt(1);
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  const k1 = await dotAt(1);
  const mm5 = (5 * box.width) / 240;
  ok(Math.abs(k1.x - k0.x - mm5) <= 1 && Math.abs(k1.y - k0.y) <= 0.5, `measure: 5 × → moves ב 5 mm (${(k1.x - k0.x).toFixed(1)} px, want ${mm5.toFixed(1)})`);
  ok((await handle1.getAttribute('aria-label')).startsWith('נקודה ב.') && (await handle1.getAttribute('role')) === 'button', 'measure: the handle is a named, focusable control');
  llB = sheetToLonLat(S, await unitsOfScreen(page, k1));
  want = expectFor('50k', llA, llB);
  got = await result();
  ok(got.ground === want.ground && got.sheet === want.cm, `measure: after the keys "${got.ground}" / "${got.sheet}" (want "${want.ground}" / "${want.cm}")`);

  // Layer switch keeps the points pixel-identical.
  const dots0 = [await rectOf(L.locator('[data-qa="handle-0"] [data-qa="point-dot"]')), await rectOf(L.locator('[data-qa="handle-1"] [data-qa="point-dot"]'))];
  for (const name of ['תצ״א', 'השוואה', 'מפה טופוגרפית']) {
    await radio(page, name).click();
    await page.waitForTimeout(300);
    const dots = [await rectOf(L.locator('[data-qa="handle-0"] [data-qa="point-dot"]')), await rectOf(L.locator('[data-qa="handle-1"] [data-qa="point-dot"]'))];
    ok(sameRect(dots0[0], dots[0]) && sameRect(dots0[1], dots[1]) && (await result()).ground === got.ground, `measure: points and result unchanged after "${name}"`);
    if (name === 'תצ״א') await shot(page, 'measure-ortho');
  }

  // Scale switch keeps the geographic position: 1:10,000 (both inside), then 1:250,000.
  for (const id of ['10k', '250k', '50k']) {
    await sheetRadio(page, new RegExp(SHEETS[id].denominator.toLocaleString('en-US'))).click();
    await waitMorph(page);
    for (const [i, ll] of [[0, llA], [1, llB]]) {
      const q = lonLatToSheet(SHEETS[id], ll);
      const w = await screenOfUnits(page, q);
      const g = await dotAt(i);
      const dd = Math.hypot(g.x - w.x, g.y - w.y);
      ok(insideSheet(q) && dd <= 1, `measure: on ${id} point ${i ? 'ב' : 'א'} sits on its lat/lon (Δ ${dd.toFixed(2)} px)`);
    }
    const e = expectFor(id, llA, llB);
    const r = await result();
    ok(r.ground === e.ground && r.sheet === e.cm, `measure: on ${id} "${r.ground}" / "${r.sheet}" (want "${e.ground}" / "${e.cm}")`);
    if (id !== '50k') await shot(page, `measure-${id}`);
  }

  // A point outside the sheet: note, no move, ground distance still shown, no sheet length.
  const pFar = at(0.12, 0.85);
  await page.mouse.click(pFar.x, pFar.y); // nearer to א → moves א
  await page.waitForTimeout(250);
  const llFar = sheetToLonLat(S, await unitsOfScreen(page, pFar));
  await sheetRadio(page, /1:10,000/).click();
  await waitMorph(page);
  const eFar = expectFor('10k', llFar, llB);
  ok((await block(page, 'outside-note').innerText()) === 'נקודה א מחוץ לקטע הזה.', `measure: outside note "${await block(page, 'outside-note').innerText()}"`);
  const rFar = await result();
  ok(rFar.ground === eFar.ground && rFar.sheet === 'על הדף הזה אי אפשר למדוד את הקטע.', `measure: outside → ground "${rFar.ground}" (want ${eFar.ground}), sheet line "${rFar.sheet}"`);
  ok((await L.locator('[data-qa="handle-0"]').count()) === 0 && (await L.locator('[data-qa="handle-1"]').count()) === 1 && (await L.locator('[data-qa="ruler"]').count()) === 0, 'measure: the outside point is not drawn; no ruler');
  await shot(page, 'measure-outside');
  await sheetRadio(page, /1:50,000/).click();
  await waitMorph(page);
  const back = await dotAt(0);
  const wFar = await screenOfUnits(page, lonLatToSheet(S, llFar));
  ok(Math.hypot(back.x - wFar.x, back.y - wFar.y) <= 1 && (await block(page, 'outside-note').innerText()) === '', 'measure: back on 1:50,000 the point is where it was, the note is gone');

  // "הצג דוגמה" on 1:10,000 → 890 מ׳ / 8.9 ס״מ.
  await sheetRadio(page, /1:10,000/).click();
  await waitMorph(page);
  await L.getByRole('button', { name: 'הצג דוגמה', exact: true }).click();
  await page.waitForTimeout(300);
  const ex = await result();
  const exWant = expectFor('10k', LANDMARKS[EXAMPLE_PAIR[0]], LANDMARKS[EXAMPLE_PAIR[1]]);
  ok(ex.ground === '890 מ׳' && ex.sheet === '8.9 ס״מ על הדף' && ex.ground === exWant.ground, `measure: example "${ex.ground}" / "${ex.sheet}"`);
  const exA = await dotAt(0);
  const exAWant = await screenOfUnits(page, lonLatToSheet(SHEETS['10k'], LANDMARKS[EXAMPLE_PAIR[0]]));
  ok(Math.hypot(exA.x - exAWant.x, exA.y - exAWant.y) <= 1, 'measure: example point א on the basilica');
  // Calculation details: collapsed, then the chain with LTR equations.
  const details = block(page, 'calc-details');
  ok(!(await details.evaluate((el) => el.open)), 'measure: "פרטי החישוב" collapsed by default');
  await details.locator('summary').click();
  await page.waitForTimeout(200);
  const chain = await details.locator('[data-qa="calc-chain"] li').evaluateAll((els) => els.map((li) => li.textContent));
  const ltr = await details.locator('[data-qa="calc-chain"] bdi[dir="ltr"]').count();
  ok(
    chain.length === 3 && chain[1].includes('8.9 × 10,000 = 89,000') && chain[2].includes('890 מ׳ (±10 מ׳)') && ltr === 3,
    `measure: calculation chain ${chain.join(' | ')}`,
  );
  const dText = await details.innerText();
  ok(dText.includes('מרחק אופקי בקו ישר') && dText.includes('24 ס״מ') && dText.includes('מילימטר אחד על הדף הוא 10 מ׳'), 'measure: details hold the precision, horizontal and ruler notes');
  await shot(page, 'measure-example');

  // Clear, then the keyboard alternative: points at the centre of the visible map.
  await L.getByRole('button', { name: 'ניקוי', exact: true }).click();
  await page.waitForTimeout(200);
  ok((await L.locator('[data-qa^="handle-"]').count()) === 0 && (await block(page, 'result-empty').innerText()) === 'סמנו שתי נקודות על המפה.', 'measure: "ניקוי" clears both points');
  ok(await L.getByRole('button', { name: 'ניקוי', exact: true }).isDisabled(), 'measure: "ניקוי" disabled with nothing to clear');
  const centreBtn = L.getByRole('button', { name: 'הוספת נקודה במרכז המפה', exact: true });
  await centreBtn.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const c0 = await dotAt(0);
  ok(Math.hypot(c0.x - (box.x + box.width / 2), c0.y - (box.y + box.height / 2)) <= 1, 'measure: keyboard places א at the map centre');
  await handleKeys(page, L, 0, 'ArrowUp', true, 2); // 2 cm north
  await centreBtn.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  const kr = await result();
  ok(kr.sheet === '2 ס״מ על הדף' && kr.ground === '200 מ׳', `measure: keyboard-only measurement (Shift+↑ ×2 = 2 cm) "${kr.ground}" / "${kr.sheet}"`);
  // Zoomed in, the centre button uses the visible centre.
  await vp.focus();
  await page.keyboard.press('+');
  await page.waitForTimeout(450);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(150);
  await L.getByRole('button', { name: 'ניקוי', exact: true }).click();
  await centreBtn.click();
  await page.waitForTimeout(200);
  const cz = await dotAt(0);
  ok(Math.hypot(cz.x - (box.x + box.width / 2), cz.y - (box.y + box.height / 2)) <= 1, 'measure: zoomed in, א lands at the visible centre');
  await shot(page, 'measure-zoomed-centre');

  // The comparison button belongs to explore only.
  ok((await block(page, 'zoom-compare-toggle').count()) === 0, 'measure: no "הגדלה לעומת פירוט" in measure mode');
  await noHScroll(page, 'measure');
  ok(errors.length === 0, `measure: no console errors ${errors.join(' | ')}`);
  await ctx.close();
}

/** Focus handle `i` and press `key` `n` times (Shift = 1 cm). */
async function handleKeys(page, L, i, key, shift, n) {
  await L.locator(`[data-qa="handle-${i}"]`).focus();
  for (let j = 0; j < n; j++) await page.keyboard.press(shift ? `Shift+${key}` : key);
  await page.waitForTimeout(150);
}

// ───────────────────────── enlargement vs detail ─────────────────────────
async function checkCompare() {
  const { ctx, page, errors } = await open('#scene-scale');
  const L = block(page, LAB);
  const vp = viewport(page);
  await scrollTo(page, LAB);
  await radio(page, 'תצ״א').click();
  await sheetRadio(page, /1:10,000/).click();
  await waitMorph(page);

  const toggle = block(page, 'zoom-compare-toggle');
  ok((await toggle.innerText()) === 'הגדלה לעומת פירוט' && (await toggle.getAttribute('aria-pressed')) === 'false', 'compare: toggle "הגדלה לעומת פירוט", not pressed');
  await toggle.click();
  await page.waitForTimeout(1000);
  ok((await toggle.getAttribute('aria-pressed')) === 'true' && (await isActive(toggle)), 'compare: pressed, focus stays on it');
  const panel = block(page, 'zoom-compare');
  ok((await block(page, 'zoom-sentence').innerText()) === ZOOM_SENTENCE, `compare: the sentence verbatim "${await block(page, 'zoom-sentence').innerText()}"`);
  ok(
    (await L.locator('fieldset, input:not([type="range"]), [role="radiogroup"]').count()) === 0 && (await L.getByRole('button', { name: /בדיקה|כן|לא/ }).count()) === 0,
    'compare: no question, no options, no check button (scale picker and representation toggle hidden)',
  );
  ok((await panel.locator('p').count()) === 2, 'compare: one instruction line + the sentence');
  const [k, x, y] = await viewOf(page);
  const size = (await vp.boundingBox()).width;
  ok(k === 1.6 && Math.abs(x - (size / 2 - size * 0.8)) < 1 && Math.abs(y - (size / 2 - size * 0.8)) < 1, `compare: opens at ×1.6 on Tavor (${k}, ${x}, ${y})`);
  const chips = [await vp.locator('[data-qa="curtain-chip-left"]').textContent(), await vp.locator('[data-qa="curtain-chip-right"]').textContent()];
  ok(chips[0] === '1:250,000 מוגדלת פי 5' && chips[1] === '1:50,000', `compare: chips ${chips.join(' | ')}`);
  const anchor = await vp.evaluate(chipAnchorProblems);
  ok(anchor.length === 0, `compare: chips anchored ${anchor.join(', ')}`);
  ok(Math.abs((await curtainX(page)) - size * 0.65) < 1, 'compare: curtain at 0.65');
  ok((await vp.getAttribute('aria-label')).includes('מוגדלת פי 5') && (await vp.getAttribute('aria-label')).endsWith(SUFFIX['השוואה']), 'compare: map label');
  ok((await block(page, 'zoom-compare-caption').innerText()) === 'השוואה: 1:250,000 מוגדלת פי 5 מול 1:50,000', 'compare: caption above the map');
  const imgs = await vp.locator('img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
  ok(imgs.some((s) => s.includes('250k-map')) && imgs.some((s) => s.includes('50k-map')) && !imgs.some((s) => s.includes('ortho')), 'compare: the ×5 1:250,000 map vs the 1:50,000 map');
  await fits(page, 'compare');
  await page.mouse.move(0, 0);
  await shot(page, 'compare-open');

  // The curtain moves with the slider; the back button closes and restores the lab.
  await L.locator('input[type="range"]').fill('40');
  await page.waitForTimeout(200);
  ok(Math.abs((await curtainX(page)) - size * 0.4) < 1, 'compare: the slider moves the curtain');
  await shot(page, 'compare-40');
  await L.getByRole('button', { name: 'חזרה למפות', exact: true }).click();
  await page.waitForTimeout(1000);
  ok((await toggle.getAttribute('aria-pressed')) === 'false' && (await isActive(toggle)) && (await panel.count()) === 0, 'compare: "חזרה למפות" closes it and focuses the toggle');
  ok((await checkedSheet(page)) === '1:10,000' && (await checkedView(page)) === 'תצ״א' && (await vp.getAttribute('data-view')) === '1.000,0.0,0.0', 'compare: back on 1:10,000 תצ״א, full sheet');
  await shot(page, 'compare-closed');
  // The toggle itself also closes it; switching to measure closes it.
  await toggle.click();
  await page.waitForTimeout(400);
  await toggle.click();
  await page.waitForTimeout(400);
  ok((await toggle.getAttribute('aria-pressed')) === 'false', 'compare: the toggle closes it too');
  await toggle.click();
  await page.waitForTimeout(400);
  await tab(page, 'מדידה').click();
  await page.waitForTimeout(400);
  ok((await panel.count()) === 0 && (await checkedSheet(page)) === '1:10,000', 'compare: switching to "מדידה" leaves the comparison');
  await tab(page, 'חקירה').click();
  await page.waitForTimeout(400);
  ok((await toggle.getAttribute('aria-pressed')) === 'false', 'compare: closed when coming back to explore');

  await noHScroll(page, 'compare');
  ok(errors.length === 0, `compare: no console errors ${errors.join(' | ')}`);
  await ctx.close();
}

const SCREENS = { explore: checkExplore, measure: checkMeasure, compare: checkCompare };

for (const [key, fn] of Object.entries(SCREENS)) {
  if (SCREEN === 'all' || SCREEN === key) await fn();
}
await browser.close();
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
