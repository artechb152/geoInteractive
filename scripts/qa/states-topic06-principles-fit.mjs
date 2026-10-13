// State QA for the topic-06 "עקרונות הניווט" laptop fit: drives every state of the
// three screens inside the scaled LessonViewportFit and checks numbers, directions
// and pointer mapping.
// Usage: node scripts/qa/states-topic06-principles-fit.mjs <outDir> <tag> [base] [WxH]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] ?? 'design/screenshots/topic06-principles-fit';
const tag = process.argv[3] ?? 'states';
const BASE = process.argv[4] ?? 'http://localhost:3061';
const [W, H] = (process.argv[5] ?? '1366x768').split('x').map(Number);

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: W, height: H }, reducedMotion: 'reduce' });
const errors = [];
const fails = [];
page.on('pageerror', (e) => errors.push(String(e)));
const check = (ok, msg) => {
  if (!ok) fails.push(msg);
  console.log(ok ? 'ok  ' : 'FAIL', msg);
};

await page.goto(`${BASE}/lessons/topic-06/#scene-principles`, { waitUntil: 'load', timeout: 180000 });
await page.waitForSelector('#scene-principles [data-activity="location-check"]', { timeout: 120000 });
await page.waitForTimeout(2000);

const scrollTo = async (sel) => {
  await page.evaluate((s) => {
    const el = document.querySelector(s).closest('[data-lesson-viewport-fit]') ?? document.querySelector(s);
    window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 96);
  }, sel);
  await page.waitForTimeout(400);
};

// Screen bearing (clockwise from screen-up) of an SVG line's x1,y1 → x2,y2 after all transforms.
const lineBearing = (sel) =>
  page.evaluate((s) => {
    const l = document.querySelector(s);
    const m = l.getScreenCTM();
    const p = (x, y) => new DOMPoint(x, y).matrixTransform(m);
    const a = p(+l.getAttribute('x1'), +l.getAttribute('y1'));
    const b = p(+l.getAttribute('x2'), +l.getAttribute('y2'));
    return ((Math.atan2(b.x - a.x, a.y - b.y) * 180) / Math.PI + 360) % 360;
  }, sel);
const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const text = (sel) => page.$eval(sel, (el) => el.textContent.trim());
const scaleOf = (sel) => page.$eval(sel, (el) => Number(el.closest('[data-lesson-viewport-fit]').getAttribute('data-fit-scale')));

// ── Screen 1: azimuth / back azimuth ───────────────────────────────────────
const C = '[data-activity="compass-map"]';
await scrollTo(C);
console.log('screen1 scale', await scaleOf(C));
const slider = page.locator(`${C} input[type=range]`);
for (const az of [0, 45, 90, 179, 180, 181, 270, 359]) {
  await slider.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < Math.floor(az / 10); i++) await page.keyboard.press('Shift+ArrowRight');
  for (let i = 0; i < az % 10; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  const back = (az + 180) % 360;
  const fmt = (v) => `${String(v).padStart(3, '0')}°`;
  const a = await text(`${C} [data-readout="azimuth"]`);
  const b = await text(`${C} [data-readout="back"]`);
  const eq = await text(`${C} [data-equation]`);
  const op = az < 180 ? '+' : '−';
  check(a === fmt(az) && b === fmt(back), `az ${az}: readouts ${a} / ${b}`);
  check(eq.replace(/\s+/g, ' ').includes(fmt(back)) && eq.startsWith(fmt(az)), `az ${az}: equation "${eq}" (${op})`);
  const mapFwd = await lineBearing(`${C} [data-ray="forward"]`);
  const mapBack = await lineBearing(`${C} [data-ray="back"]`);
  const cmpFwd = await lineBearing(`${C} [data-pointer="forward"]`);
  check(angDiff(mapFwd, az) < 1.5 && angDiff(cmpFwd, az) < 1.5, `az ${az}: map ray ${mapFwd.toFixed(1)}°, compass pointer ${cmpFwd.toFixed(1)}°`);
  check(angDiff(mapBack, back) < 1.5, `az ${az}: map back ray ${mapBack.toFixed(1)}°`);
  if ([45, 180, 359].includes(az)) await page.screenshot({ path: `${outDir}/${tag}-${W}x${H}-azimuth-${az}.png` });
}
// Pointer on the scaled slider: click at the 270° mark must land on ~270.
const box = await slider.boundingBox();
const thumb = 26 * (await scaleOf(C));
await page.mouse.click(box.x + thumb / 2 + (box.width - thumb) * (270 / 359), box.y + box.height / 2);
await page.waitForTimeout(200);
const clicked = Number(await slider.inputValue());
check(Math.abs(clicked - 270) <= 2, `slider click at 270° mark → ${clicked}`);

// ── Screen 2: three norths × declination ───────────────────────────────────
const N = '[data-activity="north-lab"]';
await scrollTo(N);
console.log('screen2 scale', await scaleOf(N));
const declSlider = page.locator(`${N} input[type=range]`);
const infoH = new Set();
for (const decl of [-10, -6, 0, 10]) {
  await declSlider.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < decl + 10; i++) await page.keyboard.press('ArrowRight');
  for (const id of ['true', 'grid', 'magnetic']) {
    await page.click(`${N} [data-north="${id}"]`);
    await page.waitForTimeout(350);
    const reading = await text(`${N} [data-readout="reading"]`);
    const row = await text(`${N} [data-value="${id}"]`);
    const selected = await page.$eval(`${N} [data-north="${id}"]`, (el) => el.getAttribute('aria-selected'));
    const arc = await page.$eval(`${N} [data-arc-from]`, (el) => +el.getAttribute('data-arc-from'));
    const arrow = await page.$eval(`${N} [data-arrow="${id}"]`, (el) => +el.getAttribute('data-angle'));
    const info = await page.$eval(`${N} [data-info]`, (el) => [el.getAttribute('data-info'), el.getBoundingClientRect().height]);
    infoH.add(Math.round(info[1]));
    check(reading === row && selected === 'true' && info[0] === id && angDiff(arc, arrow) < 0.2,
      `decl ${decl} ${id}: reading ${reading}, table ${row}, arc ${arc} vs arrow ${arrow}`);
  }
  if (decl === -6 || decl === 10) await page.screenshot({ path: `${outDir}/${tag}-${W}x${H}-north-decl${decl}.png` });
}
check(infoH.size === 1, `info strip height steady across states: ${[...infoH]}`);
await page.click(`${N} [data-north="grid"]`);
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/${tag}-${W}x${H}-north-grid.png` });
await page.getByRole('button', { name: 'איפוס' }).first().click();
await page.waitForTimeout(300);
check((await text(`${N} [data-readout="declination"]`)).includes('6'), 'north reset → −6°');

// ── Screen 3: location check without GPS ───────────────────────────────────
const L = '[data-activity="location-check"]';
await scrollTo(L);
await page.waitForTimeout(3000);
console.log('screen3 scale', await scaleOf(L));
const canvas = await page.$eval(`${L} [data-panel="observation"]`, (el) => {
  const c = el.querySelector('canvas');
  const f = el.getBoundingClientRect();
  return { frameW: f.width, frameLayoutW: el.offsetWidth, canvasCss: c ? c.style.width : null, canvasW: c?.width ?? null };
});
console.log('observation', JSON.stringify(canvas));
if (canvas.canvasCss) check(Math.abs(parseFloat(canvas.canvasCss) - canvas.frameLayoutW) <= 2, `canvas css width ${canvas.canvasCss} = layout width ${canvas.frameLayoutW}`);
// Click area 2 on the (scaled) map via its marker position.
const hit = await page.$eval(`${L} [data-candidate="area-2"], ${L} [data-candidate]:last-of-type`, (g) => {
  const r = g.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: g.getAttribute('data-candidate') };
}).catch(() => null);
if (hit) {
  await page.mouse.click(hit.x, hit.y);
  await page.waitForTimeout(300);
  const pressed = await page.$$eval(`${L} [data-choice="area"] [role=radio]`, (bs) => bs.map((b) => b.getAttribute('aria-checked')));
  check(pressed.includes('true'), `map click on ${hit.id} selects an area: ${pressed}`);
}
await page.getByRole('button', { name: 'בדקו את הבחירה' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/${tag}-${W}x${H}-location-checked-a.png` });
await page.click(`${L} [data-choice="area"] [role=radio] >> nth=0`);
await page.getByRole('button', { name: 'בדקו את הבחירה' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/${tag}-${W}x${H}-location-checked-b.png` });
// Legend popover
await page.getByRole('button', { name: /מקרא/ }).first().click().catch(() => {});
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/${tag}-${W}x${H}-location-legend.png` });
await page.keyboard.press('Escape');
// Drag the observation: a drag of 100 screen px should turn the view by the same angle at any scale.
const frame = await page.$eval(`${L} [data-panel="observation"]`, (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
if (canvas.canvasCss) {
  const yawBefore = await page.evaluate(() => window.__lc?.look.getTarget().yawDeg);
  await page.mouse.move(frame.x + frame.w / 2, frame.y + frame.h / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(frame.x + frame.w / 2 + i * 10, frame.y + frame.h / 2);
  await page.mouse.up();
  const yawAfter = await page.evaluate(() => window.__lc?.look.getTarget().yawDeg);
  console.log('drag 100 screen px: yaw', yawBefore, '→', yawAfter, 'frame screen width', frame.w.toFixed(0));
}
const finalHeights = await page.$$eval('#scene-principles [data-lesson-viewport-fit]', (els) =>
  els.map((el) => {
    const inner = el.firstElementChild.firstElementChild;
    return { scale: el.getAttribute('data-fit-scale'), outer: Math.round(el.getBoundingClientRect().height), scaledInner: Math.round(inner.getBoundingClientRect().height) };
  }),
);
for (const f of finalHeights) check(Math.abs(f.outer - f.scaledInner) <= 1, `wrapper height ${f.outer} = scaled content ${f.scaledInner} (scale ${f.scale})`);
console.log(fails.length ? `${fails.length} FAILS` : 'ALL OK');
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
