// QA for the lesson-6 "מצפן ומפה" activity (PrinciplesScene → AzimuthExplorer).
//
// Usage (dev server running; default http://localhost:3000):
//   node scripts/qa/shot-compass-map.mjs [outDir] [--base=http://localhost:3000]
//
// Checks (exit code 1 on any failure):
//   one control   the activity has exactly one interactive control: a range input 0–359, step 1,
//                 opening value 47, with an accessible name; no other button/input/tab/[tabindex]
//   removed       no tabs, +/−, number box, reset, back-azimuth toggle or success strip
//   one screen    with the card aligned under the site header at 1440 × 1122, the whole card is in view
//   opening       readouts 047° / 227°, equation "047° + 180° = 227°", compass + map labels the same
//   sync          at 0/90/180/270/359/47 (keyboard Home/End/arrows): readouts, equation, compass
//                 pointer and map ray all show the same bearing; back = (a + 180) % 360;
//                 the compass pointer and the map ray point the same way on screen
//   wrap          359° → 0° turns the pointer +1° (shortest way), never back through the south
//   shift         Shift + → adds 10°
//   overlap       at every checked angle no two texts in the compass / map overlap, and every map
//                 text stays inside the map
//   north up      the compass "N" print is above its centre, "E" to the right; map "N" arrow at the top
//   reduced       under prefers-reduced-motion the pointer is at the target immediately
//   focus         the slider shows a visible focus ring on keyboard focus
//   console       no page errors
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'design/screenshots/compass-map';
const BASE = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7);
const URL = `${BASE}/lessons/topic-06/`;
await mkdir(outDir, { recursive: true });

const failures = [];
const fail = (m) => {
  failures.push(m);
  console.log('FAIL', m);
};
const ok = (m) => console.log('ok  ', m);
const SEL = '[data-activity="compass-map"]';
const pad3 = (n) => `${String(n).padStart(3, '0')}°`;

async function open(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 240000 });
  await page.getByRole('button', { name: /עקרונות הניווט/ }).first().click();
  await page.waitForSelector(SEL, { timeout: 60000 });
  await page.waitForFunction(() => {
    const img = document.querySelector('[data-compass-body]');
    return img && img.getBBox().width > 0;
  });
  await align(page);
  return { ctx, page, errors };
}

/** Card top just under the site header. */
async function align(page) {
  await page.evaluate((sel) => {
    const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    const el = document.querySelector(sel);
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - header - 8);
  }, SEL);
  await page.waitForTimeout(500);
}

const slider = (page) => page.locator(`${SEL} input[type="range"]`);

async function setAngle(page, v) {
  const s = slider(page);
  await s.focus();
  await s.press('Home');
  for (let i = 0; i < v; i += 10) {
    if (v - i >= 10) await s.press('Shift+ArrowRight');
    else for (let k = 0; k < v - i; k++) await s.press('ArrowRight');
  }
  await page.waitForTimeout(900); // spring settles
}

/** Everything the activity shows, read from the DOM. */
function readState(page) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    const t = (q) => root.querySelector(q)?.textContent.trim();
    const center = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    };
    const lineVec = (el) => {
      const m = el.getScreenCTM();
      const p = (x, y) => new DOMPoint(x, y).matrixTransform(m);
      const a = p(+el.getAttribute('x1'), +el.getAttribute('y1'));
      const b = p(+el.getAttribute('x2'), +el.getAttribute('y2'));
      return { x: b.x - a.x, y: b.y - a.y };
    };
    const bearing = (v) => ((Math.atan2(v.x, -v.y) * 180) / Math.PI + 360) % 360;
    const compass = root.querySelector('[data-compass]');
    const map = root.querySelector('[data-map]');
    return {
      value: Number(root.querySelector('input[type="range"]').value),
      readAz: t('[data-readout="azimuth"]'),
      readBack: t('[data-readout="back"]'),
      equation: t('[data-equation]').replace(/\s+/g, ' '),
      compassFwd: t('[data-compass] [data-label="forward"]'),
      compassBack: t('[data-compass] [data-label="back"]'),
      mapFwd: t('[data-map] [data-label="forward"]'),
      mapBack: t('[data-map] [data-label="back"]'),
      compassPointer: bearing(lineVec(compass.querySelector('[data-pointer="forward"]'))),
      compassBackPointer: bearing(lineVec(compass.querySelector('[data-pointer="back"]'))),
      mapRay: bearing(lineVec(map.querySelector('[data-ray="forward"]'))),
      mapBackRay: bearing(lineVec(map.querySelector('[data-ray="back"]'))),
      nAbove: (() => {
        const c = center(compass);
        const texts = [...compass.querySelectorAll('text')];
        const N = texts.find((x) => x.textContent === 'N');
        const E = texts.find((x) => x.textContent === 'E');
        return center(N).y < c.y && center(E).x > c.x;
      })(),
    };
  }, SEL);
}

/** Pairs of overlapping text boxes inside the compass and inside the map; map texts outside the map. */
function overlaps(page) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    const out = [];
    for (const svgSel of ['[data-compass]', '[data-map]']) {
      const svg = root.querySelector(svgSel);
      const frame = svg.getBoundingClientRect();
      const boxes = [...svg.querySelectorAll('text')].map((el) => ({ el, r: el.getBoundingClientRect(), t: el.textContent }));
      for (let i = 0; i < boxes.length; i++) {
        const a = boxes[i].r;
        if (svgSel === '[data-map]' && (a.left < frame.left || a.right > frame.right || a.top < frame.top || a.bottom > frame.bottom))
          out.push(`${svgSel} "${boxes[i].t}" outside the map`);
        for (let j = i + 1; j < boxes.length; j++) {
          const b = boxes[j].r;
          const inter = Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
          if (inter) out.push(`${svgSel} "${boxes[i].t}" × "${boxes[j].t}"`);
        }
      }
    }
    // compass labels vs the map frame and the card edge (they may reach into the gap / padding)
    const card = root.getBoundingClientRect();
    const mapR = root.querySelector('[data-map]').getBoundingClientRect();
    for (const el of root.querySelectorAll('[data-compass] [data-label]')) {
      const r = el.getBoundingClientRect();
      if (r.right > card.right - 4 || r.left < card.left + 4) out.push(`compass label "${el.textContent}" at the card edge`);
      if (r.left < mapR.right + 4 && r.right > mapR.left && r.bottom > mapR.top && r.top < mapR.bottom) out.push(`compass label "${el.textContent}" on the map`);
      for (const other of [root.querySelector('[data-readouts]'), root.querySelector('p')]) {
        const o = other.getBoundingClientRect();
        if (r.left < o.right && r.right > o.left && r.top < o.bottom + 2 && r.bottom > o.top - 2) out.push(`compass label "${el.textContent}" touches "${other.textContent.slice(0, 20)}"`);
      }
    }
    return out;
  }, SEL);
}

const angleDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

async function checkAngle(page, v, label) {
  const s = await readState(page);
  const back = (v + 180) % 360;
  const problems = [];
  if (s.value !== v) problems.push(`slider ${s.value}`);
  if (s.readAz !== pad3(v)) problems.push(`readout ${s.readAz}`);
  if (s.readBack !== pad3(back)) problems.push(`back readout ${s.readBack}`);
  const eq = `${pad3(v)} ${v < 180 ? '+' : '−'} 180° = ${pad3(back)}`;
  if (s.equation !== eq) problems.push(`equation "${s.equation}" ≠ "${eq}"`);
  for (const [k, want] of [['compassFwd', pad3(v)], ['mapFwd', pad3(v)], ['compassBack', pad3(back)], ['mapBack', pad3(back)]])
    if (s[k] !== want) problems.push(`${k} ${s[k]} ≠ ${want}`);
  for (const [k, want] of [['compassPointer', v], ['mapRay', v], ['compassBackPointer', back], ['mapBackRay', back]])
    if (angleDiff(s[k], want) > 0.6) problems.push(`${k} points ${s[k].toFixed(1)}° ≠ ${want}°`);
  if (!s.nAbove) problems.push('compass not north-up / east-right');
  const ov = await overlaps(page);
  problems.push(...ov);
  if (problems.length) fail(`${label} ${v}°: ${problems.join('; ')}`);
  else ok(`${label} ${v}°: readouts, equation, compass, map in sync (back ${pad3(back)}), no overlaps`);
}

const browser = await chromium.launch();
try {
  const { ctx, page, errors } = await open(browser);

  // one control, removed controls
  const controls = await page.evaluate((sel) => {
    const root = document.querySelector(sel);
    const els = [...root.querySelectorAll('button, input, select, textarea, [role="tab"], [role="switch"], [role="slider"], [tabindex]')];
    return els.map((e) => `${e.tagName.toLowerCase()}${e.type ? `[${e.type}]` : ''}${e.getAttribute('role') ? `[role=${e.getAttribute('role')}]` : ''}`);
  }, SEL);
  if (controls.length === 1 && controls[0] === 'input[range]') ok('exactly one control: the degree slider');
  else fail(`controls in the activity: ${controls.join(', ')}`);
  const s0 = slider(page);
  const attrs = await s0.evaluate((e) => ({ min: e.min, max: e.max, step: e.step, value: e.value, name: e.getAttribute('aria-label'), dir: getComputedStyle(e).direction }));
  if (attrs.min === '0' && attrs.max === '359' && attrs.step === '1' && attrs.value === '47' && attrs.name && attrs.dir === 'ltr')
    ok(`slider 0–359 step 1, opens at 47, named "${attrs.name}", LTR`);
  else fail(`slider attributes ${JSON.stringify(attrs)}`);
  const text = await page.locator(SEL).innerText();
  const banned = ['חקירה', 'איפוס', 'הצגת אזימוט חוזר', 'הסתרת'];
  const found = banned.filter((w) => text.includes(w));
  if (found.length) fail(`removed controls still present: ${found.join(', ')}`);
  else ok('no exploration tabs, reset, toggle or success strip text');
  if (text.includes('הזיזו את המחוון וצפו בשינוי הכיוון.')) ok('instruction present');
  else fail('instruction missing');

  // one screen
  const fit = await page.evaluate((sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, h: r.height };
  }, SEL);
  if (fit.bottom <= 1122 && fit.top >= 60) ok(`card fits the 1440 × 1122 screen (${Math.round(fit.top)}–${Math.round(fit.bottom)} px)`);
  else fail(`card ${Math.round(fit.top)}–${Math.round(fit.bottom)} px does not fit 1122`);

  await page.screenshot({ path: `${outDir}/compass-map-047.png` });
  await checkAngle(page, 47, 'opening');

  for (const v of [0, 90, 180, 270, 359, 135, 225, 315, 203, 47]) {
    await setAngle(page, v);
    await checkAngle(page, v, 'angle');
    if ([0, 90, 180, 270, 359].includes(v)) await page.screenshot({ path: `${outDir}/compass-map-${String(v).padStart(3, '0')}.png` });
  }

  // wrap 359 → 0: the pointer passes through north (+1°), never back through the south
  await setAngle(page, 359);
  const seen = [];
  const sampler = page.evaluate(
    () =>
      new Promise((resolve) => {
        const out = [];
        const el = document.querySelector('[data-compass] [data-pointer="forward"]');
        const t0 = performance.now();
        const tick = () => {
          const x = +el.getAttribute('x2');
          const y = +el.getAttribute('y2');
          out.push(((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360);
          if (performance.now() - t0 < 700) requestAnimationFrame(tick);
          else resolve(out);
        };
        requestAnimationFrame(tick);
      }),
  );
  await slider(page).press('Home');
  seen.push(...(await sampler));
  const wentSouth = seen.some((a) => a > 2 && a < 358);
  if (!wentSouth) ok(`359° → 0° turns through north only (${seen.length} frames, max excursion ${Math.max(...seen.map((a) => Math.min(a, 360 - a))).toFixed(2)}°)`);
  else fail(`359° → 0° swept the long way: ${seen.filter((a) => a > 2 && a < 358).slice(0, 5).map((a) => a.toFixed(1)).join(', ')}`);
  await page.waitForTimeout(600);
  await checkAngle(page, 0, 'wrap');

  // shift step
  await slider(page).press('Shift+ArrowRight');
  await page.waitForTimeout(800);
  const v10 = Number(await slider(page).inputValue());
  if (v10 === 10) ok('Shift + → adds 10°');
  else fail(`Shift + → gave ${v10}`);

  // focus ring on keyboard focus — the thumb is a pseudo-element, so count ring pixels on screen
  const inkAroundThumb = async () => {
    const box = await slider(page).boundingBox();
    const v = Number(await slider(page).inputValue());
    const cx = box.x + 13 + ((box.width - 26) * v) / 359;
    const cy = box.y + box.height / 2;
    const png = await page.screenshot({ clip: { x: cx - 22, y: cy - 22, width: 44, height: 44 } });
    return page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 56) < 18 && Math.abs(d[i + 1] - 67) < 18 && Math.abs(d[i + 2] - 46) < 18) n++;
      return n;
    }, png.toString('base64'));
  };
  await page.mouse.click(5, 5); // blur
  const before = await inkAroundThumb();
  await slider(page).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  const focused = await slider(page).evaluate((e) => e === document.activeElement && e.matches(':focus-visible'));
  const after = await inkAroundThumb();
  if (focused && after > before + 60) ok(`keyboard focus draws the ink ring around the thumb (${before} → ${after} ink px)`);
  else fail(`focus ring: focused=${focused}, ink px ${before} → ${after}`);
  await setAngle(page, 47);
  await slider(page).focus();
  await page.screenshot({ path: `${outDir}/compass-map-focus.png` });

  if (errors.length) fail(`console errors: ${errors.slice(0, 3).join(' | ')}`);
  else ok('no console errors');
  await ctx.close();

  // reduced motion: the pointer is at the target at once
  const rm = await open(browser, { reducedMotion: 'reduce' });
  await slider(rm.page).focus();
  await slider(rm.page).press('End');
  await rm.page.waitForTimeout(60);
  const r = await readState(rm.page);
  if (angleDiff(r.compassPointer, 359) < 0.6 && angleDiff(r.mapRay, 359) < 0.6 && r.readAz === '359°') ok('reduced motion: pointer and map jump straight to 359°');
  else fail(`reduced motion: pointer ${r.compassPointer.toFixed(1)}°, map ${r.mapRay.toFixed(1)}°, readout ${r.readAz}`);
  await rm.ctx.close();
} finally {
  await browser.close();
}

console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
