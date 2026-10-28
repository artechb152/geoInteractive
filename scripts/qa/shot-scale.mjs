// Browser QA for the topic-02 scale lab (task 10: one map, modes "חקירה" / "מדידה").
// Usage (dev server on :3000):
//   node --experimental-strip-types scripts/qa/shot-scale.mjs [--screen=explore|measure|compare|all] [outDir]
// Exit code 1 on any failure. Screenshots go to outDir (default design/screenshots/scale-redesign/qa).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { SHEETS, SHEET_IDS } from '../../src/components/lessons/topic-02/scale/scaleSheets.data.ts';
import { EXAMPLE_PAIR, LANDMARKS, LOCATE, SHOWN_AS, ZOOM_SENTENCE } from '../../src/components/lessons/topic-02/scale/scaleContent.data.ts';
import {
  formatDistance, formatNumber, groundDistanceM, insideSheet, lonLatToSheet, readCm, readingPrecisionM, sheetCm,
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
const SHEET_OF = { '1:10,000': '10k', '1:50,000': '50k', '1:250,000': '250k' };
const SUFFIX = ` · מוצג: ${SHOWN_AS.compare}`;

/** Current view transform of the lab map (data-view = "k,x,y"). */
const viewOf = async (page) => (await viewport(page).getAttribute('data-view')).split(',').map(Number);
/**
 * `data-view` (k, x, y) and the component's own constants are local px; boxes are screen px. The lesson fit
 * scales the whole card uniformly (×0.7827 at 1440×1122), so `s` converts local → screen.
 */
async function frameOf(page) {
  const r = await viewport(page).boundingBox();
  const w = await viewport(page).evaluate((v) => v.offsetWidth);
  return { r, w, s: r.width / w };
}
/** Screen px of a sheet point under the current view. */
async function screenOfUnits(page, q) {
  const { r, s } = await frameOf(page);
  const [k, tx, ty] = await viewOf(page);
  return { x: r.x + s * tx + (q.x / 1000) * r.width * k, y: r.y + s * ty + (q.y / 1000) * r.height * k };
}
/**
 * Each curtain chip hangs 8 local px (CHIP_GAP) off the line on its own side (the left one drops below the
 * north arrow when it would reach under it); a chip is hidden only when its half is narrower than the chip
 * + 16 local px. Measured on screen, so both scale with the lesson fit. Runs in the page; returns problem strings.
 */
const chipAnchorProblems = (vp) => {
  const box = vp.getBoundingClientRect();
  const s = box.width / vp.offsetWidth;
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
    const fitsIn = half >= c.width + 16 * s;
    if (shown !== fitsIn) problems.push(`${side} chip ${shown ? 'shown' : 'hidden'} with half ${half.toFixed(0)} px for a ${c.width.toFixed(0)} px chip`);
    if (!shown) continue;
    const gap = side === 'left' ? x - (c.right - box.left) : c.left - box.left - x;
    if (Math.abs(gap - 8 * s) > 1) problems.push(`${side} chip ${gap.toFixed(1)} px from the line (want 8 × ${s.toFixed(4)} = ${(8 * s).toFixed(1)})`);
  }
  return problems;
};
const curtainX = (page) => viewport(page).evaluate((v) => {
  const l = v.querySelector(':scope > [data-qa="curtain-line"]');
  if (!l) return null;
  const r = l.getBoundingClientRect();
  return (r.left + r.right) / 2 - v.getBoundingClientRect().left;
});

const sheetRadio = (page, re) => block(page, LAB).getByRole('radio', { name: re });
const tab = (page, name) => block(page, LAB).getByRole('tab', { name, exact: true });
const checkedSheet = async (page) => (await block(page, LAB).getByRole('radiogroup', { name: 'קנה מידה של המפה' }).locator('[aria-checked="true"]').innerText()).split('\n')[0].trim();

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
  // The curtain is the only representation: no toggle.
  ok((await L.getByRole('radiogroup', { name: 'סוג הייצוג' }).count()) === 0 && (await vp.locator('[data-qa="curtain-line"]').count()) === 1, 'explore: no representation toggle, the curtain shows at mount');
  ok((await vp.getAttribute('aria-label')).endsWith(SUFFIX), 'explore: map label names the curtain');

  // Readouts: only the page area and 1 cm.
  const rows = await L.locator('[data-qa="explore-readouts"] > div').evaluateAll((els) =>
    els.map((r) => ({ term: r.querySelector('dt').textContent, value: r.querySelector('dd').textContent, iso: r.querySelector('dd bdi[dir="ltr"]')?.textContent ?? null })),
  );
  ok(
    rows.length === 2 && rows[0].term === 'הדף מכסה' && rows[0].iso === '12 × 12' && rows[0].value === '12 × 12 ק״מ' && rows[1].term === '1 ס״מ על הדף מייצג' && rows[1].value === '500 מ׳ בשטח',
    `explore: readouts ${JSON.stringify(rows)}`,
  );
  ok((await L.getByText('קמ״ר').count()) === 0 && (await L.locator('[data-qa="km-bar"]').count()) === 0, 'explore: no km² and no 1 km bar');
  ok((await block(page, 'explore-live').textContent()) === 'מפה 1:50,000: הדף מכסה 12 על 12 ק״מ, וכל ס״מ עליו הוא 500 מ׳ בשטח.', 'explore: live summary of the sheet');

  // Child extent: ink long-dash frame "תחום 1:10,000".
  const extent = L.locator('[data-qa="child-extent-frame"]');
  ok((await extent.getAttribute('stroke')) === '#38432E' && (await L.locator('[data-qa="child-extent-label"] text').textContent()) === 'תחום 1:10,000', 'explore: ink extent frame "תחום 1:10,000"');

  const chipR = await vp.locator('[data-qa="curtain-chip-right"]').textContent();
  ok(chipR === 'מפה טופוגרפית' && (await vp.locator('[data-qa="curtain-chip-left"]').textContent()) === 'תצ״א', `explore: curtain chips "תצ״א" | "${chipR}"`);
  const anchor = await vp.evaluate(chipAnchorProblems);
  ok(anchor.length === 0, `explore: curtain chips anchored ${anchor.join(', ')}`);
  ok((await L.locator('input[type="range"]').getAttribute('aria-valuetext')).includes('מפה טופוגרפית מימין לקו'), 'explore: curtain slider names "מפה טופוגרפית"');
  await shot(page, 'explore-compare');

  // Zoom + pan.
  await vp.focus();
  await page.keyboard.press('+');
  await page.waitForTimeout(450);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(150);
  const vz = await vp.getAttribute('data-view');
  ok(Number(vz.split(',')[0]) > 1.4, `explore: keyboard zoom (${vz})`);
  await shot(page, 'explore-zoomed');

  // Zoom hand-over: zooming into the 1:10,000 extent opens 1:10,000 at the same ground view (no morph);
  // − at the whole sheet opens 1:50,000 again, zoomed on the same place.
  await page.keyboard.press('0');
  await page.waitForTimeout(450);
  let presses = 0;
  while ((await checkedSheet(page)) === '1:50,000' && presses < 8) {
    await page.keyboard.press('+');
    presses++;
    await page.waitForTimeout(80);
    if ((await page.locator('[data-qa="morph-ghost"]').count()) > 0) break;
    await page.waitForTimeout(370);
  }
  const [hk, hx, hy] = await viewOf(page);
  const hs = (await frameOf(page)).w; // local, like hx / hy
  // The visible square's centre is still the sheet centre (Tavor).
  const hc = { x: ((hs / 2 - hx) / (hs * hk)) * 1000, y: ((hs / 2 - hy) / (hs * hk)) * 1000 };
  ok((await checkedSheet(page)) === '1:10,000' && (await page.locator('[data-qa="morph-ghost"]').count()) === 0, `hand-over: "+" ×${presses} on 1:50,000 opens 1:10,000 without a morph`);
  ok(hk >= 1 && hk < 1.25 && Math.hypot(hc.x - 500, hc.y - 500) < 2, `hand-over: 1:10,000 opens at the same ground view (k ${hk.toFixed(3)}, centre ${hc.x.toFixed(1)},${hc.y.toFixed(1)})`);
  await shot(page, 'handover-10k');
  await page.keyboard.press('0');
  await page.waitForTimeout(450);
  await page.keyboard.press('-');
  await page.waitForTimeout(600);
  const [ok50] = await viewOf(page);
  ok((await checkedSheet(page)) === '1:50,000' && Math.abs(ok50 - 5 / 1.5) < 0.01, `hand-over: "−" on the whole 1:10,000 opens 1:50,000 zoomed out one step (k ${ok50.toFixed(3)})`);
  ok((await vp.locator('[aria-label="התרחקות"]').getAttribute('aria-disabled')) === 'false', 'hand-over: zoom-out stays enabled at the whole sheet when a wider one exists');
  // The wheel past the whole 1:50,000 opens 1:250,000 at the same ground view (k = 5), with no morph.
  const wc = centre(await vp.boundingBox());
  await page.mouse.move(wc.x, wc.y);
  let wheels = 0;
  while ((await checkedSheet(page)) === '1:50,000' && wheels < 40) {
    await page.mouse.wheel(0, 100);
    wheels++;
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(100);
  const [wk] = await viewOf(page);
  ok((await checkedSheet(page)) === '1:250,000' && wk > 4.2 && wk <= 5 && (await page.locator('[data-qa="morph-ghost"]').count()) === 0, `hand-over: wheel out past the whole 1:50,000 opens 1:250,000 at the same view (k ${wk.toFixed(3)})`);
  await page.mouse.move(0, 0);
  await vp.focus();
  await page.keyboard.press('0');
  await page.waitForTimeout(450);
  ok((await vp.locator('[aria-label="התרחקות"]').getAttribute('aria-disabled')) === 'true', 'hand-over: zoom-out disabled at the whole 1:250,000');
  // At a zoom limit the wheel over the map does nothing: the page does not scroll.
  const wheelScrolls = async (dy) => {
    const y0 = await page.evaluate(() => window.scrollY);
    for (let i = 0; i < 5; i++) await page.mouse.wheel(0, dy);
    await page.waitForTimeout(300);
    return (await page.evaluate(() => window.scrollY)) - y0;
  };
  await page.mouse.move(wc.x, wc.y);
  const dOut = await wheelScrolls(200);
  ok(dOut === 0 && (await checkedSheet(page)) === '1:250,000' && (await viewOf(page))[0] === 1, `wheel: at the whole 1:250,000 the wheel out neither zooms nor scrolls the page (Δ ${dOut})`);
  await sheetRadio(page, /1:10,000/).click();
  await waitMorph(page);
  await page.mouse.move(wc.x, wc.y);
  for (let i = 0; i < 30; i++) await page.mouse.wheel(0, -200);
  await page.waitForTimeout(300);
  const dIn = await wheelScrolls(-200);
  ok(dIn === 0 && (await viewOf(page))[0] === 3, `wheel: at max zoom on 1:10,000 the wheel in neither zooms nor scrolls the page (Δ ${dIn})`);
  await page.mouse.move(0, 0);
  await sheetRadio(page, /1:50,000/).click();
  await waitMorph(page);

  // Scale switch: morph, then the full sheet.
  await sheetRadio(page, /1:10,000/).click();
  await page.waitForTimeout(200);
  ok((await page.locator('[data-qa="morph-ghost"]').count()) === 1, 'explore: morph ghost mid-transition');
  await waitMorph(page);
  ok((await vp.getAttribute('data-view')) === '1.000,0.0,0.0', 'explore: scale switch resets the view');
  ok((await block(page, 'explore-live').textContent()) === 'מפה 1:10,000: הדף מכסה 2.4 על 2.4 ק״מ, וכל ס״מ עליו הוא 100 מ׳ בשטח.', 'explore: readouts follow the sheet');
  await shot(page, 'explore-10k');

  // Locate: Kfar Tavor inside → ring on the spot; the Kinneret outside → message and an edge pointer. The
  // coverage row shows each place on the three sheets (data-on, in the picker's order).
  const marker = L.locator('[data-qa="locate-marker"]');
  const line = block(page, 'locate-line');
  const coverage = () => Promise.all(SHEET_IDS.map((id) => L.locator(`[data-qa="locate-coverage-${id}"]`).getAttribute('data-on'))).then((v) => v.join());
  const kfar = L.getByRole('button', { name: 'כפר תבור', exact: true });
  await sheetRadio(page, /1:50,000/).click();
  await waitMorph(page);
  await kfar.click();
  await page.waitForTimeout(300);
  ok((await kfar.getAttribute('aria-pressed')) === 'true', 'locate: the active button is pressed');
  ok((await line.getAttribute('aria-live')) === 'polite' && (await line.innerText()) === 'כפר תבור: סומן על המפה.', `locate: "${await line.innerText()}"`);
  ok((await coverage()) === 'false,true,true', 'locate: Kfar Tavor is off 1:10,000, on 1:50,000 and 1:250,000');
  ok((await L.locator('[data-qa="locate-coverage-50k"]').getAttribute('aria-current')) === 'true', 'locate: the shown sheet is current in the coverage row');
  const ring = await marker.locator('circle').last().boundingBox();
  const want = await screenOfUnits(page, lonLatToSheet(SHEETS['50k'], LANDMARKS.kfarTavor));
  const d = Math.hypot(centre(ring).x - want.x, centre(ring).y - want.y);
  ok(d <= 1, `locate: ring centred on Kfar Tavor (Δ ${d.toFixed(2)} px)`);
  ok((await marker.locator('text').textContent()) === 'כפר תבור', 'locate: the name pill reads "כפר תבור"');
  await L.getByRole('button', { name: 'פסגת הר תבור', exact: true }).click();
  await page.waitForTimeout(200);
  ok((await marker.count()) === 1 && (await line.innerText()) === 'פסגת הר תבור: סומן על המפה.', 'locate: "פסגת הר תבור" marked on 1:50,000');
  ok((await coverage()) === 'true,true,true', 'locate: the summit is on all three sheets');
  ok((await kfar.getAttribute('aria-pressed')) === 'false', 'locate: only one button pressed');
  const kinneret = L.getByRole('button', { name: 'הכנרת', exact: true });
  await kinneret.click();
  await page.waitForTimeout(250);
  ok((await line.innerText()) === 'הכנרת מחוץ לתחום המפה. עברו ל־1:250,000, שמכסה שטח רחב יותר.' && (await marker.count()) === 0, `locate: outside message "${await line.innerText()}"`);
  ok((await coverage()) === 'false,false,true', 'locate: the Kinneret is on 1:250,000 only');
  ok((await L.locator('[data-qa="locate-pointer-label"] text').textContent()) === 'הכנרת · מחוץ לדף', 'locate: an edge pointer names the Kinneret');
  {
    const head = await L.locator('[data-qa="locate-pointer"] path').last().boundingBox();
    const vb = await vp.boundingBox();
    ok(centre(head).x > vb.x + vb.width / 2 && centre(head).y < vb.y + vb.height / 2, 'locate: the pointer sits north-east, towards the Kinneret');
  }
  await shot(page, 'locate-outside');
  // A coverage cell opens its sheet.
  await L.locator('[data-qa="locate-coverage-250k"]').click();
  await waitMorph(page);
  ok((await marker.count()) === 1 && (await line.innerText()) === 'הכנרת: סומן על המפה.' && (await L.locator('[data-qa="locate-pointer"]').count()) === 0, 'locate: the Kinneret marked on 1:250,000, no pointer');
  await shot(page, 'locate-kinneret-250k');
  await kinneret.click();
  await page.waitForTimeout(200);
  ok((await marker.count()) === 0 && (await line.innerText()) === '', 'locate: pressing again clears the mark');

  // Every locate pill stays clear of the extent label and inside the map, on every sheet where it shows.
  const vpBox = await vp.boundingBox();
  for (const id of ['250k', '50k', '10k']) {
    await sheetRadio(page, new RegExp(`1:${SHEETS[id].denominator.toLocaleString('en-US')}`)).click();
    await waitMorph(page);
    for (const l of LOCATE) {
      const btn = L.getByRole('button', { name: l.label, exact: true });
      await btn.click();
      await page.waitForTimeout(150);
      if (!insideSheet(lonLatToSheet(SHEETS[id], LANDMARKS[l.id]))) {
        ok((await marker.count()) === 0, `locate: ${l.label} outside ${id}, no mark`);
      } else {
        const pill = await L.locator('[data-qa="locate-label"] rect').boundingBox();
        const ext = (await L.locator('[data-qa="child-extent-label"] rect').count()) ? await L.locator('[data-qa="child-extent-label"] rect').boundingBox() : null;
        const clear = !ext || pill.x > ext.x + ext.width || pill.x + pill.width < ext.x || pill.y > ext.y + ext.height || pill.y + pill.height < ext.y;
        const within = pill.x >= vpBox.x && pill.y >= vpBox.y && pill.x + pill.width <= vpBox.x + vpBox.width && pill.y + pill.height <= vpBox.y + vpBox.height;
        ok(clear && within, `locate: "${l.label}" pill on ${id} clear of the extent label and inside the map`);
        if (id === '50k' && l.id === 'kfarTavor') await shot(page, 'locate-kfar-tavor');
      }
      await btn.click(); // release
      await page.waitForTimeout(100);
    }
  }

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

  // Mode switching keeps the sheet and the curtain.
  await sheetRadio(page, /1:10,000/).click();
  await waitMorph(page);
  await L.locator('input[type="range"]').fill('40');
  await page.waitForTimeout(200);
  const cx0 = await curtainX(page);
  await tab(page, 'מדידה').click();
  await page.waitForTimeout(400);
  ok((await tab(page, 'מדידה').getAttribute('aria-selected')) === 'true', 'measure: tab selected');
  ok((await checkedSheet(page)) === '1:10,000', `measure: sheet kept (${await checkedSheet(page)})`);
  const cx1 = await curtainX(page);
  ok(cx0 !== null && Math.abs(cx0 - cx1) < 0.5 && (await L.locator('input[type="range"]').inputValue()) === '40', `measure: curtain kept (${cx0?.toFixed(1)} → ${cx1?.toFixed(1)})`);
  await fits(page, 'measure');
  // Keyboard: the tablist roves with the arrows (RTL: ← = next).
  await tab(page, 'מדידה').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  ok((await tab(page, 'חקירה').getAttribute('aria-selected')) === 'true' && (await isActive(tab(page, 'חקירה'))), 'mode tabs: arrow keys move selection and focus');
  ok((await checkedSheet(page)) === '1:10,000' && Math.abs((await curtainX(page)) - cx0) < 0.5, 'mode tabs: back in explore, sheet/curtain unchanged');
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(250);
  ok((await tab(page, 'מדידה').getAttribute('aria-selected')) === 'true', 'mode tabs: ← selects "מדידה"');

  // Free tool: no targets, no answer input, no check button.
  ok((await L.locator('input:not([type="range"]), select').count()) === 0 && (await L.getByRole('button', { name: 'בדיקה' }).count()) === 0, 'measure: no answer field, list or check button');
  ok((await block(page, 'result-empty').innerText()) === 'סמנו שתי נקודות על המפה.', 'measure: empty state asks for two points');

  await sheetRadio(page, /1:50,000/).click();
  await waitMorph(page);
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
  /** The lat/lons the lab stores (data-points). */
  const stored = async () => JSON.parse(await block(page, 'measure-result').getAttribute('data-points'));
  /** A stored lat/lon lies within 1.5 px of screen point p on the current sheet (clicks land on whole px). */
  const near = async (ll, p) => {
    const w = await screenOfUnits(page, lonLatToSheet(SHEETS[SHEET_OF[await checkedSheet(page)]], ll));
    return Math.hypot(w.x - p.x, w.y - p.y) <= 1.5;
  };

  // Two arbitrary clicks: the distance appears at once and equals the geodesic of the two lat/lons.
  // Near the centre, so both stay inside the 1:10,000 extent (the middle fifth) after the moves below.
  const pA = at(0.46, 0.47);
  const pB = at(0.55, 0.53);
  await page.mouse.click(pA.x, pA.y);
  await page.waitForTimeout(200);
  ok((await block(page, 'result-empty').innerText()) === 'סמנו את נקודה ב.', 'measure: after one click the panel asks for ב');
  const dA = await dotAt(0);
  ok(Math.hypot(dA.x - pA.x, dA.y - pA.y) <= 1.5, `measure: point א on the click (Δ ${Math.hypot(dA.x - pA.x, dA.y - pA.y).toFixed(2)} px)`);
  await page.mouse.click(pB.x, pB.y);
  await page.waitForTimeout(250);
  let [llA, llB] = await stored();
  ok(await near(llA, pA) && await near(llB, pB), 'measure: the stored lat/lons are the clicked spots (≤ 1.5 px)');
  let want = expectFor('50k', llA, llB);
  let got = await result();
  ok(got.ground === want.ground && got.sheet === want.cm, `measure: free distance "${got.ground}" / "${got.sheet}" = geodesic ${want.g.toFixed(1)} m → "${want.ground}" / "${want.cm}"`);
  ok((await L.locator('[data-qa="ruler"]').count()) === 1 && (await L.locator('[data-qa="reading-chip"] text').textContent()) === got.sheet.replace(' על הדף', ''), 'measure: ruler and reading chip on the map');
  ok((await block(page, 'result-relation').innerText()) === 'במפה 1:50,000, כל ס״מ על הדף שווה ל־500 מ׳ בשטח.', 'measure: relation line');
  await page.waitForTimeout(800);
  ok((await block(page, 'measure-live').textContent()) === `המרחק בין נקודה א לנקודה ב: ${want.ground} בשטח, ${want.cm.replace(' על הדף', '')} על הדף.`, `measure: live region "${await block(page, 'measure-live').textContent()}"`);
  ok(await block(page, 'measure-live').evaluate((el) => el.getAttribute('aria-live') === 'polite' && el.closest('[data-qa="measure-result"]') === null), 'measure: one polite live region, the visible result is not live');
  await page.mouse.move(box.x - 40, box.y);
  await shot(page, 'measure-two-points');

  // A third click moves the nearer point (here א).
  const pA2 = at(0.43, 0.52); // clear of א's disc (it stands off up-left of א)
  await page.mouse.click(pA2.x, pA2.y);
  await page.waitForTimeout(250);
  const dA2 = await dotAt(0);
  const dB2 = await dotAt(1);
  const fmt = (p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  ok(
    Math.hypot(dA2.x - pA2.x, dA2.y - pA2.y) <= 1.5 && Math.hypot(dB2.x - pB.x, dB2.y - pB.y) <= 1.5,
    `measure: a third click moves the nearer point (א ${fmt(dA2)} → click ${fmt(pA2)}), ב stays (${fmt(dB2)} vs ${fmt(pB)})`,
  );
  [llA, llB] = await stored();

  // Drag ב: live update during the drag; the announcement waits for the rest.
  const before = await result();
  const disc = centre(await L.locator('[data-qa="handle-1"] [data-qa="handle-disc"]').boundingBox());
  await page.mouse.move(disc.x, disc.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(disc.x - i * 2.5, disc.y + i * 1.5);
  await page.waitForTimeout(100);
  const mid = await result();
  ok(mid.ground !== before.ground, `measure: the distance updates live while dragging (${before.ground} → ${mid.ground})`);
  ok((await block(page, 'measure-live').textContent()) !== `המרחק בין נקודה א לנקודה ב: ${mid.ground} בשטח, ${mid.sheet.replace(' על הדף', '')} על הדף.`, 'measure: not announced mid-drag');
  await page.mouse.up();
  await page.waitForTimeout(250);
  const dB3 = await dotAt(1);
  ok(Math.hypot(dB3.x - (pB.x - 20), dB3.y - (pB.y + 12)) <= 1.5, 'measure: dragging the disc moves ב by the pointer offset');
  [llA, llB] = await stored();
  want = expectFor('50k', llA, llB);
  got = await result();
  ok(got.ground === want.ground && got.sheet === want.cm, `measure: after the drag "${got.ground}" / "${got.sheet}" (want "${want.ground}" / "${want.cm}")`);
  await page.waitForTimeout(800);
  ok((await block(page, 'measure-live').textContent()).startsWith(`המרחק בין נקודה א לנקודה ב: ${want.ground} בשטח`), 'measure: announced once the drag rests');
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
  [llA, llB] = await stored();
  want = expectFor('50k', llA, llB);
  got = await result();
  ok(got.ground === want.ground && got.sheet === want.cm, `measure: after the keys "${got.ground}" / "${got.sheet}" (want "${want.ground}" / "${want.cm}")`);

  // Scale switch keeps the geographic position: 1:10,000 (both inside), then 1:250,000.
  for (const id of ['10k', '250k', '50k']) {
    await sheetRadio(page, new RegExp(`1:${SHEETS[id].denominator.toLocaleString('en-US')}`)).click();
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
  const [llFar] = await stored();
  ok(await near(llFar, pFar), 'measure: the far click moved א (the nearer point)');
  await sheetRadio(page, /1:10,000/).click();
  await waitMorph(page);
  const eFar = expectFor('10k', llFar, llB);
  ok((await block(page, 'outside-note').innerText()) === 'נקודה א מחוץ לתחום המפה.', `measure: outside note "${await block(page, 'outside-note').innerText()}"`);
  const rFar = await result();
  ok(rFar.ground === eFar.ground && rFar.sheet === 'על הדף הזה אי אפשר למדוד את המרחק.', `measure: outside → ground "${rFar.ground}" (want ${eFar.ground}), sheet line "${rFar.sheet}"`);
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
    chain.length === 3 && chain[1].includes('8.9 × 10,000 = 89,000') && chain[2].includes('890 מ׳ (±10 מ׳)') && ltr === 1,
    `measure: calculation chain ${chain.join(' | ')}`,
  );
  const dText = await details.innerText();
  ok(dText.includes('המרחק האופקי בקו ישר') && dText.includes('24 ס״מ') && dText.includes('מילימטר אחד על הדף הוא 10 מ׳'), 'measure: details hold the precision, horizontal and ruler notes');
  await shot(page, 'measure-example');

  // Clear, then the keyboard alternative: points at the centre of the visible map.
  await L.getByRole('button', { name: 'ניקוי נקודות', exact: true }).click();
  await page.waitForTimeout(200);
  ok((await L.locator('[data-qa^="handle-"]').count()) === 0 && (await block(page, 'result-empty').innerText()) === 'סמנו שתי נקודות על המפה.', 'measure: "ניקוי" clears both points');
  ok(await L.getByRole('button', { name: 'ניקוי נקודות', exact: true }).isDisabled(), 'measure: "ניקוי" disabled with nothing to clear');
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
  await L.getByRole('button', { name: 'ניקוי נקודות', exact: true }).click();
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
    'compare: no question, no options, no check button (scale picker hidden)',
  );
  const [k, x, y] = await viewOf(page);
  const { r: vpBox, w: local } = await frameOf(page);
  const size = vpBox.width; // screen, for the curtain checks below
  // ×1.6 about the sheet centre (Tavor): the offset is local px, like data-view
  ok(k === 1.6 && Math.abs(x - local * (0.5 - 0.8)) < 1 && Math.abs(y - local * (0.5 - 0.8)) < 1, `compare: opens at ×1.6 on Tavor (${k}, ${x}, ${y}; want ${local * (0.5 - 0.8)} of ${local} local px)`);
  const chips = [await vp.locator('[data-qa="curtain-chip-left"]').textContent(), await vp.locator('[data-qa="curtain-chip-right"]').textContent()];
  ok(chips[0] === 'מפת 1:250,000 מוגדלת פי 5' && chips[1] === 'מפת 1:50,000', `compare: chips ${chips.join(' | ')}`);
  const anchor = await vp.evaluate(chipAnchorProblems);
  ok(anchor.length === 0, `compare: chips anchored ${anchor.join(', ')}`);
  ok(Math.abs((await curtainX(page)) - size * 0.65) < 1, 'compare: curtain at 0.65');
  ok((await vp.getAttribute('aria-label')).includes('מוגדלת פי 5') && (await vp.getAttribute('aria-label')).endsWith('של אותו תחום'), 'compare: map label');
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
  ok((await checkedSheet(page)) === '1:10,000' && (await vp.getAttribute('data-view')) === '1.000,0.0,0.0', 'compare: back on 1:10,000, full sheet');
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
