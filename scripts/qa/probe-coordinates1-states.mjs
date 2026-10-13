// States + pointer checks for the "קואורדינטות 1" laptop fit (topic-02 #scene-coordinates).
// Per viewport: a screenshot of each screen state (screen top under the 80px header), whether the
// state fits the view, and pointer readings that must not depend on the fit scale:
//   - landscape drag-turn: the view's turn for a drag of 60 reference px (60·scale screen px);
//   - datum globe: chip leader ends touch their chip; the check-point marker drag (40 reference px);
//   - datum experiment: the ellipsoid drag (50 reference px) moves the pose by the same amount.
// Usage: node scripts/qa/probe-coordinates1-states.mjs <outDir> <tag> [base] [WxH ...]
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const outDir = process.argv[2] ?? 'design/screenshots/topic02-coordinates1-fit';
const tag = process.argv[3] ?? 'states';
const BASE = process.argv[4] ?? 'http://localhost:3117';
const sizes = (process.argv.slice(5).length ? process.argv.slice(5) : ['1920x1080', '1536x864', '1440x1122', '1366x768']).map((s) =>
  s.split('x').map(Number),
);
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const report = {};

for (const [width, height] of sizes) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const page = await browser.newPage({ viewport: { width, height } });
    try {
      report[`${width}x${height}`] = await run(page, width, height);
      break;
    } catch (e) {
      console.error(`${width}x${height} attempt ${attempt}: ${String(e).slice(0, 200)}`);
    } finally {
      await page.close();
    }
  }
}
await writeFile(`${outDir}/${tag}-report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
await browser.close();

async function run(page, width, height) {
  page.setDefaultTimeout(45000);
  const out = { states: {}, pointer: {} };
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(`${BASE}/lessons/topic-02/#scene-coordinates`, { waitUntil: 'networkidle', timeout: 240000 });
  await page.waitForSelector('#scene-coordinates', { state: 'attached', timeout: 120000 });
  await page.waitForTimeout(2500);
  const vp = `${width}x${height}`;
  const screen = (name) => page.locator(`[data-coordinates1-screen="${name}"]`);

  const geometry = (name) =>
    page.evaluate((n) => {
      const el = document.querySelector(`[data-coordinates1-screen="${n}"] [data-lesson-viewport-fit]`);
      const box = el.firstElementChild.getBoundingClientRect();
      return { scale: Number(el.dataset.fitScale), h: Math.round(box.height), top: Math.round(box.top + scrollY) };
    }, name);
  const goTo = async (name) => {
    const g = await geometry(name);
    await page.evaluate((y) => window.scrollTo(0, y), g.top - 80);
    await page.waitForTimeout(400);
    return g;
  };
  const shot = async (screenName, state) => {
    const g = await goTo(screenName);
    await page.waitForTimeout(500);
    const g2 = await geometry(screenName);
    out.states[`${screenName}:${state}`] = { scale: g2.scale, h: g2.h, fitsView: g2.h <= height - 80 };
    console.error(`${vp} ${screenName}:${state} scale ${g2.scale} h ${g2.h}`);
    await page.screenshot({ path: `${outDir}/${tag}-${vp}-${screenName}-${state}.png` });
    return g;
  };
  const drag = async (x0, y0, dx, dy) => {
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(x0 + (dx * i) / 10, y0 + (dy * i) / 10);
    await page.mouse.up();
  };

  // ── אליפסואיד, גיאואיד וגליות ──
  const RB = screen('reference-bodies');
  await shot('reference-bodies', 'surface');
  const { scale: sRB } = await geometry('reference-bodies');
  await page.waitForSelector('[data-landscape="live"]', { timeout: 30000 }).catch(() => {});
  const live = await page.locator('[data-landscape="live"]').count();
  if (live) {
    await goTo('reference-bodies');
    const land0 = await RB.locator('[data-land]').getAttribute('data-land');
    const b = await page.locator('[data-landscape="live"]').boundingBox();
    await drag(b.x + b.width / 2, b.y + b.height / 2, 60 * sRB, 0);
    await page.waitForTimeout(300);
    const land1 = await RB.locator('[data-land]').getAttribute('data-land');
    out.pointer.landTurnAz = Math.round((Number(land1.split(',')[0]) - Number(land0.split(',')[0])) * 10) / 10;
  } else out.pointer.landTurnAz = 'no-webgl';
  await RB.getByRole('button', { name: /^תחנה A/ }).first().click();
  out.pointer.stationPicked = (await RB.getByText(/תחנת מדידה A/).count()) > 0;

  await RB.getByRole('tab', { name: 'אליפסואיד' }).click();
  await page.waitForTimeout(800);
  await shot('reference-bodies', 'ellipsoid');
  await RB.getByRole('button', { name: 'הגדלת האזור' }).click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${outDir}/${tag}-${vp}-reference-bodies-ellipsoid-zooming.png` });
  await page.waitForTimeout(1300);
  await shot('reference-bodies', 'ellipsoid-linked');
  await RB.getByRole('button', { name: 'חזרה למבט הכללי' }).click();

  await RB.getByRole('tab', { name: 'גיאואיד' }).click();
  await RB.getByRole('button', { name: 'חשיפת משטחי הייחוס' }).click();
  await page.waitForTimeout(800);
  await shot('reference-bodies', 'geoid-clear');

  await RB.getByRole('tab', { name: 'גליות וגובה' }).click();
  await page.waitForTimeout(800);
  await shot('reference-bodies', 'undulation');
  await RB.locator('input[inputmode="decimal"]').fill('1');
  await RB.getByRole('button', { name: 'בדיקת תשובה' }).click();
  await page.waitForTimeout(700);
  await shot('reference-bodies', 'undulation-wrong');

  // ── דאטום ──
  const DG = screen('datum');
  await shot('datum', 'step1');
  const { scale: sDG } = await geometry('datum');
  await page.waitForTimeout(2500); // the 3-D globe
  out.pointer.chipLeaderGap = await page.evaluate(() => {
    const stage = document.querySelector('[data-coordinates1-screen="datum"] [data-station]');
    const gaps = [];
    for (const line of stage.querySelectorAll('line')) {
      if (line.style.opacity !== '1') continue;
      const svg = line.ownerSVGElement;
      const p = svg.createSVGPoint();
      p.x = Number(line.getAttribute('x1'));
      p.y = Number(line.getAttribute('y1'));
      const s = p.matrixTransform(line.getScreenCTM());
      // the nearest chip-like box (a label element) to that end
      let best = Infinity;
      for (const el of stage.querySelectorAll('div,span')) {
        if (!el.textContent || el.children.length > 2) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 30 || r.width > 220 || r.height > 60) continue;
        const dx = Math.max(r.left - s.x, 0, s.x - r.right);
        const dy = Math.max(r.top - s.y, 0, s.y - r.bottom);
        best = Math.min(best, Math.hypot(dx, dy));
      }
      if (best < Infinity) gaps.push(Math.round(best * 10) / 10);
    }
    return gaps;
  });
  const marker = DG.locator('[role="slider"][aria-label="נקודת הבדיקה"]');
  if (await marker.count()) {
    const st = DG.locator('[data-inspect]');
    const i0 = Number(await st.getAttribute('data-inspect'));
    const mb = await marker.boundingBox();
    await drag(mb.x + mb.width / 2, mb.y + mb.height / 2, 0, 40 * sDG);
    await page.waitForTimeout(300);
    const i1 = Number(await st.getAttribute('data-inspect'));
    const mb2 = await marker.boundingBox();
    out.pointer.markerInspectDelta = Math.round((i1 - i0) * 1000) / 1000;
    out.pointer.markerEndVsPointer = Math.round(Math.hypot(mb2.x + mb2.width / 2 - (mb.x + mb.width / 2), mb2.y + mb2.height / 2 - (mb.y + mb.height / 2 + 40 * sDG)));
  }
  await DG.getByRole('button', { name: /מיקום וכיוון/ }).click();
  await page.waitForTimeout(800);
  await shot('datum', 'step2');
  await DG.getByRole('button', { name: 'נסו בעצמכם' }).click();
  await page.waitForTimeout(900);
  await shot('datum', 'step2-experiment');
  {
    const { scale } = await geometry('datum');
    out.pointer.experimentScale = scale;
    const st = DG.locator('[data-pose]');
    const p0 = (await st.getAttribute('data-pose')).split(',').map(Number);
    const sb = await st.boundingBox();
    await drag(sb.x + sb.width * 0.72, sb.y + sb.height * 0.2, 50 * scale, 0);
    await page.waitForTimeout(300);
    const p1 = (await st.getAttribute('data-pose')).split(',').map(Number);
    out.pointer.experimentDragDx = Math.round((p1[0] - p0[0]) * 100) / 100;
  }
  await DG.getByRole('button', { name: /עולמי ומקומי/ }).click();
  await page.waitForTimeout(800);
  await DG.getByRole('radio', { name: 'מקומי' }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  await shot('datum', 'step3-local');
  await shot('datum-parameters', 'cards');

  // ── הדמיה ──
  const DF = screen('datum-field');
  await DF.getByRole('radio', { name: /דאטום B/ }).click();
  await page.waitForTimeout(1200);
  await shot('datum-field', 'compare-B');
  await DF.getByRole('tab', { name: /בודקים את הטעות/ }).click();
  await page.waitForTimeout(600);
  await DF.getByRole('button', { name: 'העתקת המספרים ללא המרה' }).click();
  await page.waitForTimeout(800);
  await shot('datum-field', 'error-raw');
  await DF.getByRole('button', { name: /שינוי הכיתוב/ }).click();
  await page.waitForTimeout(800);
  await shot('datum-field', 'error-relabeled');
  await DF.getByRole('button', { name: /המרת הנתונים/ }).click();
  await page.waitForTimeout(2500);
  await shot('datum-field', 'error-converted');
  await DF.getByRole('tab', { name: /מתרגלים/ }).click();
  await page.waitForTimeout(600);
  await DF.locator('fieldset label').first().click();
  await DF.getByRole('button', { name: 'בדיקת הנתונים' }).click();
  await page.waitForTimeout(700);
  await shot('datum-field', 'practice-checked');
  await shot('summary', 'end');
  out.errors = errors;
  out.hScroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  return out;
}
