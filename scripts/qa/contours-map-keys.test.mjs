// Keyboard QA for the contour map on the first contours screen (topic-02,
// #scene-contours): the map is one tab stop, a slider over the layers.
//
// Usage (private dev server, e.g. NEXT_DIST_DIR=.next-x next dev -p 3157):
//   QA_PORT=3157 node scripts/qa/contours-map-keys.test.mjs [WxH]
// Screenshots go to design/screenshots/contours-map-keys/.
//
// Checks:
//   reach   the card's tab stops are the model's buttons, the three views and
//           the map — one stop for the whole map, no Tab per contour;
//   focus   keyboard focus rings the map, shows the key line and lights the
//           lowest layer in the map AND the model;
//   keys    ↑/↓/Home/End/Esc walk the layers; at each one the map band and
//           number, the model's chip, the link line and the slider's
//           aria-valuetext agree, and the link line reads exactly as on hover;
//   exit    Tab and Shift+Tab leave (no trap) and clear the highlight;
//   views   the keys light the model in all three views;
//   mouse   hover map → model, hover model → map, a click on the map shows no
//           ring, slice drag + reset, drag-to-rotate still work;
//   fit     the card stays inside the viewport in every state.
// Exit code 1 on any failure.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const [W, H] = (process.argv[2] ?? '1440x1122').split('x').map(Number);
const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-contours`;
const outDir = 'design/screenshots/contours-map-keys';
await mkdir(outDir, { recursive: true });

const failures = [];
const report = { viewport: `${W}x${H}` };
const fail = (msg) => failures.push(msg);
const check = (ok, msg) => ok || fail(msg);
const ACCENT = 'rgb(217, 126, 43)';
const HEIGHTS = ['10', '20', '30', '40', '50'];
const IDLE = 'העבירו את הסמן על שכבה במודל או על המפה, והיא תודגש בשניהם';

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error' && /contour|ContourCake|ContoursScene/i.test(m.location().url ?? '')) errors.push(m.text());
});

await page.goto(URL, { waitUntil: 'load', timeout: 240000 });
await page.waitForSelector('#scene-contours .surface-elevated', { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForSelector('#scene-contours canvas', { timeout: 120000 });
await page.waitForFunction(() => !document.querySelector('#scene-contours')?.innerText.includes('טוען הר'), null, { timeout: 120000 });
await page.waitForTimeout(2500);
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.waitForTimeout(400);

const card = page.locator('#scene-contours .surface-elevated').first();
const slider = page.locator('#scene-contours [data-qa="contour-map-keys"]');
const mapSvg = slider.locator('svg[role="img"]');
const canvas = page.locator('#scene-contours canvas').first();

/** Everything that shows the current layer: map band/number, model chip, link line, key line, slider state, focus ring. */
const state = () =>
  page.evaluate((accent) => {
    const scene = document.querySelector('#scene-contours');
    const sl = scene.querySelector('[data-qa="contour-map-keys"]');
    const svg = sl.querySelector('svg');
    const mapChip = [...svg.querySelectorAll('text')].find((t) => t.getAttribute('fill') === '#D97E2B');
    const modelChip = [...scene.querySelectorAll('span')].find(
      (s) => getComputedStyle(s).outlineStyle !== 'none' && getComputedStyle(s).color === accent,
    );
    const hint = scene.querySelector('[data-qa="contour-map-keys-hint"]');
    const hb = hint.getBoundingClientRect();
    const cs = getComputedStyle(sl);
    return {
      focused: document.activeElement === sl,
      ring: cs.boxShadow.includes(accent),
      boxShadow: cs.boxShadow,
      band: svg.querySelectorAll('path[fill-rule="evenodd"]').length > 0,
      map: mapChip?.textContent?.trim() ?? null,
      model: modelChip?.textContent?.replace(/[^\d]/g, '') || null,
      link: scene.querySelector('[data-qa="contour-link"]').innerText.trim(),
      hintShown: hb.width > 20 && hb.height > 8,
      hint: hint.textContent.replace(/\s+/g, ' ').trim(),
      valuenow: sl.getAttribute('aria-valuenow'),
      valuetext: sl.getAttribute('aria-valuetext'),
    };
  }, ACCENT);

const fits = async (label) => {
  const b = await card.boundingBox();
  check(b.y >= 0 && b.y + b.height <= H, `${label}: card ${Math.round(b.y)}–${Math.round(b.y + b.height)} leaves the ${H}px viewport`);
  return `${Math.round(b.width)}×${Math.round(b.height)} @y${Math.round(b.y)}`;
};
const shot = async (name) => {
  await page.screenshot({ path: `${outDir}/${name}.png` });
  await card.screenshot({ path: `${outDir}/${name}-card.png` });
};
const press = async (key) => {
  await page.keyboard.press(key);
  await page.waitForTimeout(350);
  return state();
};
const viewButton = (name) => page.getByRole('button', { name, exact: false }).first();
const park = async () => {
  await page.mouse.move(2, H - 2);
  await page.waitForTimeout(350);
};

report.idleFit = await fits('idle');
const idle = await state();
check(idle.link === IDLE, `idle link line changed: "${idle.link}"`);
check(!idle.hintShown, 'key line visible before the map has focus');

// ── mouse first: the link line per layer, as hover writes it ──────────────
/** One screen point per band: the topmost hit path under it is that band's. */
const bandPoints = await page.evaluate(() => {
  const svg = document.querySelector('#scene-contours [data-qa="contour-map-keys"] svg');
  const hits = [...svg.querySelectorAll('path[fill="transparent"]')];
  const r = svg.getBoundingClientRect();
  const found = {};
  for (let fy = 0.05; fy < 0.95; fy += 0.02) {
    for (let fx = 0.05; fx < 0.95; fx += 0.02) {
      const x = r.left + r.width * fx;
      const y = r.top + r.height * fy;
      const i = hits.indexOf(document.elementFromPoint(x, y));
      if (i >= 0 && !(i in found)) found[i] = [x, y];
    }
  }
  return found;
});
check(Object.keys(bandPoints).length === 5, `found hover points for ${Object.keys(bandPoints).length}/5 bands`);
const hoverText = {};
for (const [i, [x, y]] of Object.entries(bandPoints)) {
  await page.mouse.move(x, y);
  await page.waitForTimeout(350);
  const s = await state();
  hoverText[i] = s.link;
  check(s.map === HEIGHTS[i] && s.model === HEIGHTS[i], `hover band ${i}: map ${s.map}, model ${s.model} (want ${HEIGHTS[i]})`);
}
await park();
report.hoverText = hoverText;

// ── reach: the card's tab stops ──────────────────────────────────────────
await page.locator('#scene-contours button[aria-label="מסך מלא"]').focus();
const stops = [];
for (let k = 0; k < 8; k++) {
  const here = await page.evaluate(() => {
    const el = document.activeElement;
    const inCard = !!el.closest('#scene-contours .surface-elevated');
    return inCard ? (el.getAttribute('aria-label') ?? el.innerText.trim()).replace(/\s+/g, ' ') : null;
  });
  if (here === null) break;
  stops.push(here);
  if (await slider.evaluate((el) => el === document.activeElement)) break;
  await page.keyboard.press('Tab');
  await page.waitForTimeout(150);
}
report.tabStops = stops;
check(stops.length === 5 && stops[4].startsWith('שכבת גובה'), `tab stops in the card: ${JSON.stringify(stops)}`);

// ── focus: Tab onto the map (from the last view button) ──────────────────
let s = await state();
report.onFocus = s;
check(s.focused, 'map not focused after Tab');
check(s.ring, `no focus ring on the map (box-shadow: ${s.boxShadow})`);
check(s.hintShown, 'key line hidden while the map has keyboard focus');
check(s.map === '10' && s.model === '10' && s.band, `keyboard focus lit map ${s.map} / model ${s.model} (want the 10 m layer)`);
check(s.link === hoverText[0], `focus link line "${s.link}" ≠ hover "${hoverText[0]}"`);
check(s.valuenow === '1' && s.valuetext === s.link, `slider value ${s.valuenow} / "${s.valuetext}"`);
report.focusFit = await fits('keyboard focus');

// ── keys: walk up, past the top, then down past the bottom ───────────────
const expectLayer = (s, i, how) => {
  if (i < 0) {
    check(!s.band && !s.map && !s.model, `${how}: something stayed lit (${s.map}/${s.model})`);
    check(s.link === IDLE && s.valuenow === '0' && s.valuetext === 'אין שכבה מודגשת', `${how}: cleared state wrong (${s.valuenow}, "${s.link}")`);
    return;
  }
  check(s.band && s.map === HEIGHTS[i] && s.model === HEIGHTS[i], `${how}: map ${s.map} / model ${s.model}, want ${HEIGHTS[i]}`);
  check(s.link === hoverText[i], `${how}: link line "${s.link}" ≠ hover "${hoverText[i]}"`);
  check(s.valuenow === String(i + 1) && s.valuetext === s.link, `${how}: slider ${s.valuenow} / "${s.valuetext}"`);
  check(s.focused && s.ring && s.hintShown, `${how}: lost focus, ring or key line`);
};
report.keys = [];
for (let i = 1; i <= 4; i++) {
  s = await press('ArrowUp');
  expectLayer(s, i, `ArrowUp → layer ${i}`);
  report.keys.push(['ArrowUp', s.map, s.link]);
  if (i === 2) await shot('1-keyboard-whole-30');
}
s = await press('ArrowUp');
expectLayer(s, 4, 'ArrowUp at the top');
for (let i = 3; i >= -1; i--) {
  s = await press('ArrowDown');
  expectLayer(s, i, `ArrowDown → ${i < 0 ? 'none' : `layer ${i}`}`);
  report.keys.push(['ArrowDown', s.map, s.link]);
}
s = await press('ArrowDown');
expectLayer(s, -1, 'ArrowDown below the bottom');
s = await press('End');
expectLayer(s, 4, 'End');
s = await press('Home');
expectLayer(s, 0, 'Home');
s = await press('Escape');
expectLayer(s, -1, 'Escape');
check(s.hintShown && s.ring, 'Escape dropped the ring or key line (focus should stay)');
await shot('2-keyboard-cleared');
// Esc with nothing lit is not swallowed
const escPrevented = await slider.evaluate((el) => {
  let prevented = null;
  const spy = (e) => (prevented = e.defaultPrevented);
  window.addEventListener('keydown', spy, { once: true });
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  return prevented;
});
check(escPrevented === false, 'Esc with nothing lit was swallowed');
s = await press('ArrowUp');
expectLayer(s, 0, 'ArrowUp after Esc');

// ── exit: Tab out, Shift+Tab back, Shift+Tab out the other way ───────────
s = await press('Tab');
report.afterTab = await page.evaluate(() => (document.activeElement?.innerText ?? document.activeElement?.tagName ?? '').slice(0, 60));
check(!s.focused, 'Tab did not leave the map (trap)');
check(!s.band && !s.map && !s.model && s.link === IDLE, `leaving by Tab kept the highlight (${s.map}/${s.model})`);
check(!s.hintShown && !s.ring, 'key line or ring stayed after leaving');
s = await press('Shift+Tab');
check(s.focused && s.map === '10' && s.model === '10', `Shift+Tab back: focused ${s.focused}, lit ${s.map}/${s.model}`);
s = await press('Shift+Tab');
const back = await page.evaluate(() => document.activeElement?.innerText?.trim());
check(!s.focused && /מבט מלמעלה/.test(back ?? ''), `Shift+Tab from the map went to "${back}"`);
check(!s.band && !s.map, 'Shift+Tab out kept the highlight');

// ── views: keyboard only — pick a view with Enter, Tab to the map, ↑ ────
report.views = {};
for (const [k, name, file] of [
  [0, 'פריסה לשכבות', '3-keyboard-sliced-20'],
  [1, 'מבט מלמעלה', '4-keyboard-top-40'],
  [2, 'הר שלם', null],
]) {
  await viewButton(name).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2200);
  check((await viewButton(name).getAttribute('aria-pressed')) === 'true', `${name}: Enter did not select the view`);
  let tabs = 0;
  while (!(await slider.evaluate((el) => el === document.activeElement)) && tabs < 4) {
    await page.keyboard.press('Tab');
    tabs++;
  }
  await page.waitForTimeout(350);
  const ups = name === 'מבט מלמעלה' ? 3 : 1;
  for (let u = 0; u < ups; u++) s = await press('ArrowUp');
  expectLayer(s, ups, `${name}: keys`);
  report.views[name] = { tabsToMap: tabs, lit: s.map, model: s.model, fit: await fits(`${name} + keyboard`) };
  if (file) await shot(file);
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(300);
}

// ── mouse still works ────────────────────────────────────────────────────
await park();
// a click on the map: focus, but no ring or key line (the pointer drives it)
const [cx, cy] = bandPoints[2];
await page.mouse.click(cx, cy);
await page.waitForTimeout(350);
s = await state();
report.click = s;
check(s.focused && !s.ring && !s.hintShown, `mouse click on the map: ring ${s.ring}, key line ${s.hintShown}`);
check(s.map === '30' && s.model === '30', `click lit ${s.map}/${s.model}, want 30`);
await park();
s = await state();
check(!s.band && !s.map && !s.model, 'highlight stayed after the pointer left the map');
// …and keys work straight after that click
s = await press('ArrowUp');
check(s.map === '10' && s.ring && s.hintShown, `ArrowUp after a click: lit ${s.map}, ring ${s.ring}, key line ${s.hintShown}`);
await page.mouse.click(W - 4, H - 4); // click away (blank page edge)
await page.waitForTimeout(350);
s = await state();
check(!s.focused && !s.band && !s.hintShown, 'clicking away left the map focused or lit');

// hover model → map
async function hoverModelSlice() {
  const cb = await canvas.boundingBox();
  for (const fy of [0.5, 0.55, 0.45, 0.6, 0.4, 0.65]) {
    for (const fx of [0.5, 0.42, 0.58, 0.35, 0.65]) {
      await page.mouse.move(cb.x + cb.width * fx, cb.y + cb.height * fy);
      await page.waitForTimeout(300);
      const st = await state();
      if (st.map) return st;
    }
  }
  return state();
}
const m = await hoverModelSlice();
report.hoverModel = { map: m.map, model: m.model, link: m.link };
check(!!m.map && m.model === m.map && m.link === hoverText[HEIGHTS.indexOf(m.map)], `hover model lit map ${m.map} / model ${m.model}, link "${m.link}"`);
await park();

// rotate: drag the background in the whole view changes the picture
const cb = await canvas.boundingBox();
const before = await canvas.screenshot();
await page.mouse.move(cb.x + cb.width * 0.12, cb.y + cb.height * 0.12);
await page.mouse.down();
await page.mouse.move(cb.x + cb.width * 0.4, cb.y + cb.height * 0.14, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(900);
const after = await canvas.screenshot();
report.rotated = !before.equals(after);
check(report.rotated, 'dragging the model did not rotate it');

// sliced: drag a layer → reset appears → reset
await viewButton('פריסה לשכבות').click();
await page.waitForTimeout(2200);
let dragged = false;
for (const [fx, fy] of [[0.5, 0.45], [0.5, 0.5], [0.45, 0.55], [0.5, 0.6], [0.55, 0.5], [0.5, 0.4]]) {
  const x = cb.x + cb.width * fx;
  const y = cb.y + cb.height * fy;
  await page.mouse.move(x, y);
  await page.waitForTimeout(250);
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
check(dragged, 'sliced: dragging a layer did nothing');
if (dragged) {
  await page.getByRole('button', { name: /איפוס שכבות/ }).click();
  await page.waitForTimeout(400);
  check((await page.getByRole('button', { name: /איפוס שכבות/ }).count()) === 0, 'reset button stayed after reset');
}
await park();
await viewButton('הר שלם').click();
await page.waitForTimeout(1500);
report.finalFit = await fits('final');

if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
await ctx.close();
await browser.close();
await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
if (failures.length) {
  console.log('FAIL\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('PASS');
