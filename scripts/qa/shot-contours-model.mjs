// QA for the first contours screen (topic-02, #scene-contours): the 3D
// "layer cake" mountain and the contour map linked to it.
//
// Usage (private dev server, e.g. NEXT_DIST_DIR=.next-x next dev -p 3123):
//   QA_PORT=3123 node scripts/qa/shot-contours-model.mjs <label> [WxH]
// Screenshots go to design/screenshots/contours-model-<label>/.
//
// Per view (whole / sliced / top) it records the caption and the action line
// under the model, then checks the map ↔ model link both ways:
//   map → model  hover a band on the map: the band and its number light on the
//                map, the matching height chip lights in the model;
//   model → map  hover a slice in the model: the same height lights on the map.
// Plus: dragging a layer in the sliced view, and the copy shown in each view.
// Exit code 1 on any failure.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const label = process.argv[2] ?? 'after';
const [W, H] = (process.argv[3] ?? '1440x1122').split('x').map(Number);
const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-contours`;
const outDir = `design/screenshots/contours-model-${label}`;
await mkdir(outDir, { recursive: true });

const failures = [];
const report = { viewport: `${W}x${H}` };
const fail = (msg) => failures.push(msg);
const ACCENT = 'rgb(217, 126, 43)';

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

const card = page.locator('#scene-contours .surface-elevated').first();
const mapSvg = page.locator('#scene-contours svg[role="img"]').first();
const canvas = page.locator('#scene-contours canvas').first();

/** All visible text of screen 1 (header + card), split per block. */
const screenText = () =>
  page.evaluate(() => {
    const scene = document.querySelector('#scene-contours');
    const header = scene.querySelector('header');
    const c = scene.querySelector('.surface-elevated');
    const strip = (el) => (el?.innerText ?? '').replace(/\s+\n/g, '\n').trim();
    return { header: strip(header), card: strip(c) };
  });

/** What is lit right now: the map's active chip / band, and the model's outlined height chip. */
const litState = () =>
  page.evaluate((accent) => {
    const svg = document.querySelector('#scene-contours svg[role="img"]');
    const band = svg.querySelectorAll('path[fill-rule="evenodd"]').length > 0;
    const mapChip = [...svg.querySelectorAll('text')].find((t) => t.getAttribute('fill') === '#D97E2B');
    const modelChip = [...document.querySelectorAll('#scene-contours span')].find(
      (s) => getComputedStyle(s).outlineStyle !== 'none' && getComputedStyle(s).color === accent,
    );
    const announce = document.querySelector('#scene-contours [data-qa="contour-link"]');
    return {
      band,
      map: mapChip?.textContent?.trim() ?? null,
      model: modelChip?.textContent?.replace(/[^\d]/g, '') || null,
      announce: announce?.innerText?.trim() ?? null,
    };
  }, ACCENT);

const shotCard = async (name) => {
  await page.screenshot({ path: `${outDir}/${name}.png` });
  await card.screenshot({ path: `${outDir}/${name}-card.png` });
};

await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.waitForTimeout(400);

const VIEWS = ['הר שלם', 'פריסה לשכבות', 'מבט מלמעלה'];
report.views = {};
for (const [i, name] of VIEWS.entries()) {
  await page.getByRole('button', { name, exact: false }).first().click();
  await page.waitForTimeout(2000);
  await page.mouse.move(2, H - 2);
  await page.waitForTimeout(300);
  const pressed = await page.getByRole('button', { name, exact: false }).first().getAttribute('aria-pressed');
  if (pressed !== 'true') fail(`view ${name}: button not pressed`);
  const t = await screenText();
  const box = await card.boundingBox();
  if (box.y + box.height > H) fail(`view ${name}: card bottom ${Math.round(box.y + box.height)} > viewport ${H}`);
  report.views[name] = { card: t.card, cardBox: `${Math.round(box.width)}×${Math.round(box.height)} @y${Math.round(box.y)}` };
  if (i === 0) report.header = t.header;
  await shotCard(`${i + 1}-${['whole', 'sliced', 'top'][i]}`);
}

/** Hover the map from its summit outward until a band lights; returns the lit state. */
async function hoverMapBand(frac) {
  const mb = await mapSvg.boundingBox();
  await page.mouse.move(mb.x + mb.width * frac[0], mb.y + mb.height * frac[1]);
  await page.waitForTimeout(400);
  return litState();
}

/** Hover the canvas at a grid of points until a slice lights (model → map). */
async function hoverModelSlice() {
  const cb = await canvas.boundingBox();
  for (const fy of [0.5, 0.55, 0.45, 0.6, 0.4, 0.65]) {
    for (const fx of [0.5, 0.42, 0.58, 0.35, 0.65]) {
      await page.mouse.move(cb.x + cb.width * fx, cb.y + cb.height * fy);
      await page.waitForTimeout(350);
      const s = await litState();
      if (s.map) return s;
    }
  }
  return litState();
}

report.link = {};
for (const [i, name] of VIEWS.entries()) {
  await page.getByRole('button', { name, exact: false }).first().click();
  await page.waitForTimeout(2000);
  const key = ['whole', 'sliced', 'top'][i];

  // map → model: three bands, from the outer ring inward
  const probes = { outer: [0.5, 0.86], mid: [0.5, 0.7], inner: [0.44, 0.5] };
  report.link[key] = {};
  for (const [p, frac] of Object.entries(probes)) {
    const s = await hoverMapBand(frac);
    report.link[key][`map→model ${p}`] = s;
    if (!s.band || !s.map) fail(`${key}: hovering the map (${p}) lit no band/number`);
    else if (s.model !== s.map) fail(`${key}: map lit ${s.map} m but the model lit ${s.model ?? 'nothing'}`);
    else if (s.announce !== null && !s.announce.endsWith(`קו הגובה ${s.map}`))
      fail(`${key}: the link line names another contour than the lit ${s.map} m ("${s.announce}")`);
    if (p === 'mid') await shotCard(`${i + 1}-${key}-hover-map`);
  }
  await page.mouse.move(2, H - 2);
  await page.waitForTimeout(400);
  const cleared = await litState();
  if (cleared.band || cleared.map || cleared.model) fail(`${key}: highlight stayed after leaving the map`);
  report.link[key].idle = cleared.announce;

  // model → map
  const m = await hoverModelSlice();
  report.link[key]['model→map'] = m;
  if (!m.map) fail(`${key}: hovering the model lit nothing on the map`);
  else if (m.model && m.model !== m.map) fail(`${key}: model lit ${m.model} m but the map lit ${m.map}`);
  await shotCard(`${i + 1}-${key}-hover-model`);
  await page.mouse.move(2, H - 2);
  await page.waitForTimeout(400);
}

// sliced view: drag a layer up → the reset button appears
await page.getByRole('button', { name: 'פריסה לשכבות', exact: false }).first().click();
await page.waitForTimeout(2200);
const cb = await canvas.boundingBox();
let dragged = false;
for (const [fx, fy] of [[0.5, 0.45], [0.5, 0.5], [0.45, 0.55], [0.5, 0.6], [0.55, 0.5], [0.5, 0.4]]) {
  const x = cb.x + cb.width * fx;
  const y = cb.y + cb.height * fy;
  await page.mouse.move(x, y);
  await page.waitForTimeout(250);
  await page.mouse.down();
  await page.mouse.move(x, y - cb.height * 0.06, { steps: 6 });
  await page.mouse.move(x, y - cb.height * 0.12, { steps: 6 });
  const during = await litState();
  await page.mouse.up();
  await page.waitForTimeout(500);
  if (await page.getByRole('button', { name: /איפוס שכבות/ }).count()) {
    dragged = true;
    report.dragLit = during;
    break;
  }
}
report.drag = dragged;
if (!dragged) fail('sliced: dragging a layer did nothing');
await shotCard('2-sliced-dragged');
if (dragged) {
  await page.getByRole('button', { name: /איפוס שכבות/ }).click();
  await page.waitForTimeout(400);
}

// keyboard: the view buttons are reachable and togglable
await page.getByRole('button', { name: 'הר שלם', exact: false }).first().focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
report.keyboardWhole = await page.getByRole('button', { name: 'הר שלם', exact: false }).first().getAttribute('aria-pressed');

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
