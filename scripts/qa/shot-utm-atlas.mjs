// Browser QA for the topic-02 UTM block — "אטלס הפלחים" (design/mockups/utm-concepts-2026-10-12, חלופה 2):
// the projection explainer and the zone atlas (src/components/lessons/topic-02/utm-atlas).
//
// Usage (dev server running; default http://localhost:3001, or QA_BASE=...):
//   node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-utm-atlas.mjs [outDir]
//
// Every state is checked for ONE point: the pins in both maps sit on the point (≤ 1.5 px), the
// highlighted zone and the answer card match readUtm() of that point. Two views (focus pass
// 2026-10-19): "פלחים" — the world map leads, the card shows only the zone and the hemisphere;
// "מודדים במטרים" — the enlargement and its grid lead, the card shows E and N with the zone,
// the hemisphere and the datum. States: opening (36N), a pick in the same zone, a drag across a
// zone boundary, a click across the equator, every preset (with the Norway exception), a click
// outside coverage, the metric grid with keyboard moves in metres, crossing the equator and a
// neighbour zone in metres, switching views keeps the point, Greenwich practice (30 wrong,
// another wrong, 31 right), the transfer practice (wrong zone + hemisphere, then right) to the
// end, back to exploration with the state kept, "מידע נוסף על UTM" closed then opened, leaving
// the sub-topic and coming back, reduced motion, fit at 1440 × 1122, 16 px black body text,
// label overlap.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import {
  readUtm, OPENING, PRESETS, TRANSFER, normLon, HEMI_NAME,
} from '../../src/components/lessons/topic-02/utm-atlas/utmAtlas.ts';

const outDir = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'design/screenshots/utm-atlas-2026-10-19';
const BASE = process.env.QA_BASE || 'http://localhost:3001';
const URL = `${BASE}/lessons/topic-02/#scene-coordinates-2`;
await mkdir(outDir, { recursive: true });

const failures = [];
const fail = (m) => {
  failures.push(m);
  console.log('FAIL', m);
};
const ok = (m) => console.log('ok  ', m);
const check = (cond, m) => (cond ? ok(m) : fail(m));

const ROOT = '[data-activity="utm-atlas"]';
const browser = await chromium.launch({ channel: 'chrome' });

async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(m.text()));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 240000 });
  await page.waitForSelector(ROOT, { timeout: 120000 });
  await page.waitForSelector('[data-atlas-land]', { timeout: 60000 });
  await align(page, ROOT);
  return { ctx, page, errors };
}

/** An element 16 px under the fixed site header. */
async function align(page, sel) {
  await page.evaluate((sel) => {
    const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    const el = document.querySelector(sel);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header - 16, behavior: 'instant' });
  }, sel);
  await page.waitForTimeout(500);
}

const settle = (page, ms = 450) => page.waitForTimeout(ms);
const shot = (page, name) => page.screenshot({ path: `${outDir}/${name}.png` });

const state = (page) =>
  page.evaluate((ROOT) => {
    const root = document.querySelector(ROOT);
    const txt = (sel) => root.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim() ?? null;
    const frame = (k) => {
      const f = root.querySelector(`[data-frame="${k}"]`);
      const r = f.getBoundingClientRect();
      const [lon0, lat0, w, h] = f.dataset.view.split(',').map(Number);
      const pin = f.querySelector('[data-pin]');
      let tip = null;
      if (pin) {
        const pr = pin.getBoundingClientRect();
        tip = { x: pr.left + pr.width / 2, y: pr.bottom - 3, label: pin.dataset.pin };
      }
      const chips = [...f.querySelectorAll('[data-chip]')].map((c) => {
        const b = c.getBoundingClientRect();
        return { key: c.dataset.chip, text: c.textContent.trim(), left: b.left, right: b.right, top: b.top, bottom: b.bottom, fontSize: getComputedStyle(c).fontSize };
      });
      // map furniture the labels must also clear
      for (const o of f.querySelectorAll('[data-scale-bar], [data-axes]')) {
        const b = o.getBoundingClientRect();
        chips.push({ key: o.hasAttribute('data-axes') ? 'axes' : 'scale-bar', furniture: true, text: '', left: b.left, right: b.right, top: b.top, bottom: b.bottom });
      }
      const topRow = f.parentElement.querySelector('[data-top-label]')?.parentElement;
      return {
        rect: { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom },
        view: { lon0, lat0, w, h },
        tip,
        focus: f.querySelector('[data-focus-zone]')?.dataset.focusZone ?? null,
        boundary: f.querySelector('[data-boundary]')?.dataset.boundary ?? null,
        equator: f.querySelector('[data-equator]')?.dataset.equator ?? null,
        greenwich: Boolean(f.querySelector('[data-greenwich]')),
        gridLines: f.querySelectorAll('[data-grid-line]').length,
        zoneNumbers: [...f.querySelectorAll('[data-zone-number]')].map((z) => z.dataset.zoneNumber),
        chips,
        top: topRow && topRow.offsetParent ? [...topRow.querySelectorAll('[data-top-label]')].map((t) => t.textContent.trim()) : [],
      };
    };
    return {
      mode: root.dataset.mode,
      lead: root.dataset.lead,
      lat: Number(root.dataset.lat),
      lon: Number(root.dataset.lon),
      zone: Number(root.dataset.zone),
      hemisphere: root.dataset.hemisphere,
      event: root.dataset.event,
      insetKind: root.dataset.inset,
      title: txt('[data-title]'),
      instruction: txt('[data-instruction]'),
      values: {
        zone: txt('[data-value="zone"]'),
        hemisphere: txt('[data-value="hemisphere"]'),
        e: txt('[data-value="e"]'),
        n: txt('[data-value="n"]'),
        datum: txt('[data-value="datum"]'),
        range: txt('[data-value="range"]'),
        latlon: txt('[data-value="latlon"]'),
      },
      rowPressed: root.querySelector('[data-zone-row] [aria-pressed="true"]')?.textContent.trim() ?? null,
      explain: txt('[data-explain]'),
      feedback: txt('[data-feedback]:not([data-feedback="info"])'),
      prompt: txt('[data-prompt]'),
      world: frame('world'),
      inset: frame('inset'),
    };
  }, ROOT);

/** Where a lat/lon falls in a frame, from the frame's own window. */
const px = (fr, lat, lon) => {
  const { lon0, lat0, w, h } = fr.view;
  return {
    x: fr.rect.left + ((normLon(lon - lon0) + w / 2) / w) * fr.rect.width,
    y: fr.rect.top + ((lat0 + h / 2 - lat) / h) * fr.rect.height,
  };
};

/** One point, everywhere: pins, highlight, the answer card of the view. */
function consistent(s, label, { grid = false } = {}) {
  const r = readUtm({ lat: s.lat, lon: s.lon });
  const bad = [];
  if (s.zone !== r.zone) bad.push(`zone ${s.zone}≠${r.zone}`);
  if (s.hemisphere !== r.hemisphere) bad.push('hemisphere');
  if (s.values.zone !== String(r.zone)) bad.push(`zone value ${s.values.zone}`);
  if (!s.values.hemisphere?.includes(HEMI_NAME[r.hemisphere]) || !s.values.hemisphere.includes(r.hemisphere)) bad.push(`hemisphere value ${s.values.hemisphere}`);
  if (grid) {
    if (!s.values.e?.startsWith(r.eText) || !s.values.e.endsWith('מ׳')) bad.push(`E ${s.values.e} ≠ ${r.eText}`);
    if (!s.values.n?.startsWith(r.nText) || !s.values.n.endsWith('מ׳')) bad.push(`N ${s.values.n} ≠ ${r.nText}`);
    if (s.values.datum !== 'WGS84') bad.push('datum');
    if (s.lead !== 'inset') bad.push(`lead ${s.lead}`);
  } else {
    // the zones view states only the zone and the hemisphere — no E/N, datum or lat/lon row
    for (const k of ['e', 'n', 'datum', 'range', 'latlon']) if (s.values[k] != null) bad.push(`zones view shows ${k}`);
    if (s.lead !== 'world') bad.push(`lead ${s.lead}`);
  }
  if (s.world.focus !== String(r.zone)) bad.push(`world highlight ${s.world.focus}`);
  if (!grid && s.inset.focus !== String(r.zone)) bad.push(`inset highlight ${s.inset.focus}`);
  for (const k of ['world', 'inset']) {
    const fr = s[k];
    const want = px(fr, s.lat, s.lon);
    if (!fr.tip) bad.push(`${k} pin missing`);
    else if (Math.hypot(fr.tip.x - want.x, fr.tip.y - want.y) > 1.5) bad.push(`${k} pin off by ${Math.hypot(fr.tip.x - want.x, fr.tip.y - want.y).toFixed(1)} px`);
  }
  if (bad.length) fail(`${label}: ${bad.join('; ')}`);
  else ok(`${label}: zone ${r.zone}${r.hemisphere}${grid ? `, E ${r.eText}, N ${r.nText}` : ''}, pins on the point in both maps`);
  return r;
}

/** Labels inside each frame never overlap each other or leave the frame, and keep their 13 px. */
function labelsClear(s, label) {
  const bad = [];
  for (const k of ['world', 'inset']) {
    const fr = s[k];
    const cs = fr.chips;
    for (const c of cs) {
      if (c.left < fr.rect.left - 1 || c.right > fr.rect.right + 1 || c.top < fr.rect.top - 1 || c.bottom > fr.rect.bottom + 1) bad.push(`${k}:${c.key} leaves the frame`);
      if (!c.furniture && c.fontSize !== '13px' && c.fontSize !== '16px') bad.push(`${k}:${c.key} ${c.fontSize}`);
    }
    for (let i = 0; i < cs.length; i++)
      for (let j = i + 1; j < cs.length; j++) {
        const a = cs[i];
        const b = cs[j];
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 2 && oy > 2 && !(a.furniture && b.furniture)) bad.push(`${k}:${a.key}×${b.key}`);
      }
  }
  if (bad.length) fail(`${label} labels: ${bad.join(', ')}`);
  else ok(`${label}: no label overlaps, all inside their frames`);
}

/** Click a lat/lon on a map. */
async function clickAt(page, k, lat, lon) {
  const s = await state(page);
  const p = px(s[k], lat, lon);
  await page.mouse.click(p.x, p.y);
  await settle(page);
}

/** Drag a map's pin (grabbed by its head) to a lat/lon, in steps; returns the state before release. */
async function dragPin(page, k, lat, lon) {
  const s = await state(page);
  const from = s[k].tip;
  const to = px(s[k], lat, lon);
  const grab = { x: from.x, y: from.y - 26 * (s[k].rect.width / 800) };
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(grab.x + ((to.x - from.x) * i) / 12, grab.y + ((to.y - from.y) * i) / 12);
  await page.waitForTimeout(120);
  const during = await state(page);
  await page.mouse.up();
  await settle(page, 600);
  return during;
}

const clickText = async (page, text) => {
  await page.locator(`${ROOT} button`, { hasText: text }).first().click();
  await settle(page);
};
const view = async (page, name) => {
  await page.locator(`${ROOT} [role="radio"]`, { hasText: name }).click();
  await settle(page, 700);
};

/** The default state's essentials inside the view under the site header, and no inner scrolling. */
async function fits(page, label) {
  const f = await page.evaluate((ROOT) => {
    const root = document.querySelector(ROOT);
    const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    const box = (sel) => root.querySelector(sel)?.getBoundingClientRect();
    const scrollers = [...root.querySelectorAll('*')].filter((e) => {
      const cs = getComputedStyle(e);
      return /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1;
    }).length;
    const parts = {
      title: box('[data-title]'),
      instruction: box('[data-instruction]'),
      leading: box('[data-map-role="main"]'),
      answer: box('[data-panel]'),
      action: box('[data-map-role="main"] [data-frame]'),
      card: root.getBoundingClientRect(),
    };
    return { header, vh: innerHeight, scrollers, parts: Object.fromEntries(Object.entries(parts).map(([k, r]) => [k, r && { top: Math.round(r.top), bottom: Math.round(r.bottom) }])) };
  }, ROOT);
  const out = Object.entries(f.parts).filter(([, r]) => !r || r.top < f.header || r.bottom > f.vh);
  check(!out.length && !f.scrollers, `${label}: title, instruction, leading map, answer and the whole card (${f.parts.card.top}–${f.parts.card.bottom} px) inside ${f.header}–${f.vh} px, no inner scroll${out.length ? ` — out: ${out.map(([k]) => k)}` : ''}${f.scrollers ? ` — ${f.scrollers} scrollers` : ''}`);
  return f;
}

/* ───────────────────────────── run ───────────────────────────── */

const { ctx, page, errors } = await open();

// the block: heading, lead, explainer
await align(page, '[data-block="utm"] h3');
await shot(page, '00-block-top');
const lead = await page.locator('[data-block="utm"] > p').first().textContent();
check(lead.includes('מרקטור רוחבי') && lead.includes('60 פלחים') && lead.includes('במטרים'), 'lead: transverse Mercator, 60 zones, metres');
check(!lead.includes('גלילי הפוך'), 'lead: no unexplained "גלילי הפוך"');

// explainer steps, by keyboard
await align(page, '[data-activity="utm-projection"]');
await page.locator('[data-step="globe"]').focus();
await page.keyboard.press('ArrowDown');
await settle(page, 400);
check((await page.locator('[data-step="cylinder"]').getAttribute('aria-selected')) === 'true', 'explainer: ArrowDown moves to step 2 (cylinder)');
check(await page.locator('[data-touch-line]').count() === 1, 'explainer step 2: the cylinder touches along the central meridian');
await page.screenshot({ path: `${outDir}/01-explainer-cylinder.png`, clip: await page.locator('[data-activity="utm-projection"]').boundingBox() });
await page.keyboard.press('ArrowDown');
await settle(page, 400);
const scales = await page.$$eval('[data-scale-label]', (els) => els.map((e) => [Number(e.dataset.scaleLabel), Number(e.textContent.replace('×', ''))]));
check(scales.length === 5 && scales.find(([d]) => d === 0)[1] === 1 && scales.every(([d, k]) => d === 0 || k > 1), `explainer step 3: equal ground circles grow away from the central meridian ${JSON.stringify(scales)}`);
const sym = scales.filter(([d]) => d !== 0);
check(sym.every(([d, k]) => Math.abs(k - sym.find(([d2]) => d2 === -d)[1]) < 0.011), 'explainer step 3: symmetric about the central meridian');
const figOverlaps = await page.$$eval('[data-activity="utm-projection"] figure [aria-hidden] > span', (els) => {
  const r = els.map((e) => [e.textContent.trim(), e.getBoundingClientRect()]);
  const out = [];
  for (let i = 0; i < r.length; i++)
    for (let j = i + 1; j < r.length; j++) {
      const [ta, a] = r[i];
      const [tb, b] = r[j];
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) out.push(ta + ' × ' + tb);
    }
  return out;
});
check(!figOverlaps.length, `explainer step 3: labels clear of each other${figOverlaps.length ? ' — ' + figOverlaps.join(', ') : ''}`);
await page.screenshot({ path: `${outDir}/02-explainer-map.png`, clip: await page.locator('[data-activity="utm-projection"]').boundingBox() });
await page.locator('[data-step="globe"]').click();

// opening — the zones view
await align(page, ROOT);
let s = await state(page);
check(s.lat === OPENING.lat && s.lon === OPENING.lon, 'opening point 32°N 33°E');
let r = consistent(s, 'opening');
check(r.zone === 36 && r.hemisphere === 'N' && s.insetKind === 'zones', 'opening: zone 36, N, the zones view');
check(s.title === 'באיזה פלח ובאיזה חצי כדור נמצאת הנקודה?' && s.instruction === 'בחרו נקודה במפה ובדקו באיזה פלח היא נמצאת.', `opening: one question title and one instruction (${s.title} / ${s.instruction})`);
check(s.world.rect.width > s.inset.rect.width * 1.6, `zones view: the world map leads (${Math.round(s.world.rect.width)} vs ${Math.round(s.inset.rect.width)} px)`);
check(s.inset.zoneNumbers.join() === '35,36,37', `opening enlargement shows zones 35, 36, 37 (${s.inset.zoneNumbers})`);
check(['24°E', '30°E', '36°E', '42°E'].every((t) => s.inset.top.includes(t)), `the zone's boundaries are on the enlargement, not in a table (${s.inset.top})`);
check(s.explain.includes('30°E') && s.explain.includes('36°E') && s.explain.includes('פלח 36') && s.explain.includes('מצפון לקו המשווה'), `opening explanation: why zone 36 and N (${s.explain})`);
check(!s.world.chips.some((c) => /84°N|80°S/.test(c.text)) && s.world.chips.some((c) => c.text === 'קו המשווה'), 'world map: the equator named; the coverage numbers moved to "מידע נוסף"');
check((await page.locator(`${ROOT} [data-locator-note]`).textContent()).includes('מפת איתור'), 'the world map is captioned as a locator map');
const more = page.locator(`${ROOT} [data-more]`);
check((await more.getAttribute('data-state')) === 'closed' && !(await page.locator(`${ROOT} [data-more] li`).count()), '"מידע נוסף על UTM" is closed');
check((await page.locator(`${ROOT} [data-secondary] button`).count()) === 2 && (await page.locator(`${ROOT} .bg-cta-ember`).count()) === 0, 'zones view: two secondary actions, no competing primary button');
labelsClear(s, 'opening');
await fits(page, 'fit 1440 × 1122, zones view');
await shot(page, '03-opening-zones');

// same zone
await clickAt(page, 'inset', 30.6, 34.6);
s = await state(page);
r = consistent(s, 'pick in the same zone');
check(s.event === 'pick' && s.explain.includes('עדיין') && s.explain.includes('פלח 36'), 'same zone: still zone 36, between its boundaries');
await shot(page, '04-same-zone');

// across a boundary, by dragging the enlargement's pin
const during = await dragPin(page, 'inset', 31.2, 36.9);
check(during.zone === 37 && during.inset.boundary === '36', 'drag across 36°E: zone 37 and the crossed boundary highlighted while dragging');
s = await state(page);
r = consistent(s, 'after crossing 36°E');
check(s.inset.boundary === '36' && s.world.boundary === '36', 'crossed boundary stays marked in both maps');
check(s.explain.includes('36°E') && s.explain.includes('לפלח 37'), `crossing explanation: 36°E, into zone 37 (${s.explain})`);
check(s.inset.top.includes('42°E') && s.inset.zoneNumbers.includes('38'), 'enlargement recentred on zone 37 after release');
labelsClear(s, 'crossing');
await shot(page, '05-crossing');

// across the equator, on the world map
const beforeEq = s;
await clickAt(page, 'world', -20, beforeEq.lon);
s = await state(page);
r = consistent(s, 'click south of the equator');
check(r.hemisphere === 'S' && s.world.equator === 'highlight' && s.explain.includes('קו המשווה'), `equator crossed: S, the equator highlighted (${s.explain})`);
await shot(page, '06-south');

// presets
for (let i = 0; i <= PRESETS.length; i++) {
  await clickText(page, 'נסו נקודה אחרת');
  s = await state(page);
  const want = i < PRESETS.length ? PRESETS[i] : OPENING;
  check(s.lat === want.lat && s.lon === want.lon, `preset ${i + 1}: ${want.id}`);
  consistent(s, `preset ${want.id}`);
  if (want.id === 'cape-town') {
    labelsClear(s, 'Cape Town');
    await shot(page, '07-preset-cape-town');
  }
  if (want.id === 'bergen') {
    check(s.zone === 32 && s.explain.includes('נורווגיה') && s.explain.includes('31') && s.explain.includes('3°E') && s.explain.includes('12°E'), `Bergen: zone 32, 3°E – 12°E, the exception explained (${s.explain})`);
    await shot(page, '08-preset-bergen');
  }
}

// outside coverage
const beforeOut = await state(page);
await clickAt(page, 'world', 87.5, 10);
s = await state(page);
check(s.lat === beforeOut.lat && s.lon === beforeOut.lon && s.event === 'outside', 'click beyond 84°N: rejected, point unchanged');
check(s.explain.includes('84°N') && s.explain.includes('80°S'), 'outside explanation names the coverage');

// the metres view: the same point, the grid leads
const beforeGrid = await state(page);
await view(page, 'מודדים במטרים');
s = await state(page);
check(s.lat === beforeGrid.lat && s.lon === beforeGrid.lon, 'switching to metres keeps the point');
r = consistent(s, 'metres view', { grid: true });
check(s.title === 'כיצד מתארים את הנקודה במטרים בתוך הפלח?', `metres view title (${s.title})`);
check(s.inset.rect.width > s.world.rect.width * 1.6, `metres view: the enlargement leads (${Math.round(s.inset.rect.width)} vs ${Math.round(s.world.rect.width)} px)`);
check(s.inset.gridLines >= 6, `metres view draws the zone grid (${s.inset.gridLines} lines)`);
check(s.inset.chips.some((c) => c.key === 'chosenE' && c.text === r.eText) && s.inset.chips.some((c) => c.key === 'chosenN' && c.text === r.nText), 'metres view: the point read off the grid edges');
check(s.explain.includes('לא זזה'), 'metres view: the point did not move — only how it is written');
check(s.world.top.length === 0 && s.world.chips.length === 0, 'metres view: the small locator carries no labels');
check((await page.locator(`${ROOT} [data-secondary] button`).count()) === 1, 'metres view: one secondary action (another point); zone steps sit on the zone');
labelsClear(s, 'metres');
await fits(page, 'fit 1440 × 1122, metres view');
await shot(page, '09-metres');

// keyboard in metres
await page.locator('[data-frame="inset"] [data-pin]').focus();
await page.keyboard.press('ArrowRight');
await settle(page, 600);
const outline = await page.locator('[data-frame="inset"] [data-pin] > span').first().evaluate((e) => getComputedStyle(e).outlineStyle);
check(outline !== 'none', `keyboard focus on the pin is visible (outline ${outline})`);
let s2 = await state(page);
let r2 = readUtm(s2);
check(Number(r2.eText) - Number(r.eText) === 10000 && r2.nText === r.nText, `→ in the grid: E +10000 m, N unchanged (${r.eText}→${r2.eText})`);
await page.keyboard.press('ArrowUp');
await settle(page, 600);
s2 = await state(page);
const r3 = readUtm(s2);
check(Number(r3.nText) - Number(r2.nText) === 10000 && r3.eText === r2.eText, `↑ in the grid: N +10000 m, E unchanged (${r2.nText}→${r3.nText})`);
consistent(s2, 'after keyboard moves', { grid: true });
check(s2.explain.includes('גדל'), 'keyboard move explained');
await shot(page, '10-metres-moved');

// neighbour zone, from the zone in the context row: same E/N, another place
const beforeZone = readUtm(await state(page));
const east = (beforeZone.zone % 60) + 1;
await page.locator(`${ROOT} [data-zone-step="${east}"]`).click();
await settle(page, 600);
s = await state(page);
r = consistent(s, `neighbour zone ${east}`, { grid: true });
check(r.zone === east && r.eText === beforeZone.eText && r.nText === beforeZone.nText, 'neighbour: the point moved 6° east, E/N repeat');
check(s.explain.includes('לא השתנו') && s.explain.includes('מקום אחר'), 'neighbour explanation: same numbers, another place');
await shot(page, '11-metres-neighbour');

// crossing the equator in metres, on the small locator
await clickAt(page, 'world', -25, s.lon);
s = await state(page);
r = consistent(s, 'metres, south of the equator', { grid: true });
check(r.hemisphere === 'S' && s.explain.includes('10000000'), `metres: N measured from 10 000 000 m south of the equator (${s.explain})`);
check(Math.abs(readUtm(s).n - Number(s.values.n.replace(/\D/g, ''))) < 1, 'N computed in the south, not relabelled');
await shot(page, '12-metres-south');

// back to zones: the same point
const beforeZones = await state(page);
await view(page, 'פלחים');
s = await state(page);
check(s.lat === beforeZones.lat && s.lon === beforeZones.lon, 'switching back to zones keeps the point');
consistent(s, 'zones view again');
const exploreKept = s;

// "מידע נוסף על UTM"
await page.locator(`${ROOT} [data-more] button`).click();
await settle(page, 500);
const moreText = (await page.locator(`${ROOT} [data-more]`).textContent()).replace(/\s+/g, ' ');
check(['180°W', '80°S', '84°N', 'נורווגיה', 'סבאלברד'].every((t) => moreText.includes(t)), '"מידע נוסף על UTM": numbering, coverage and exceptions');
await page.locator(`${ROOT} [data-more]`).scrollIntoViewIfNeeded();
await shot(page, '13-more-open');
await page.locator(`${ROOT} [data-more] button`).click();
await settle(page, 400);
await align(page, ROOT);

// Greenwich practice
await clickText(page, 'מצאו את גריניץ׳');
s = await state(page);
check(s.mode === 'greenwich' && s.prompt.includes('גבולו המערבי הוא קו גריניץ׳'), 'Greenwich practice opens with the unambiguous prompt');
check(s.world.greenwich && s.inset.greenwich, 'Greenwich meridian marked on both maps');
await page.locator(`${ROOT} [data-zone-button="30"]`).click();
await clickText(page, 'בדיקת הבחירה');
s = await state(page);
check(s.feedback?.includes('מסתיים') && s.inset.boundary === '0', 'zone 30: it ends at 0°, the boundary marked');
await page.waitForTimeout(600);
check((await page.locator('[data-verdict]').textContent()).includes('לא נכון'), 'zone 30: a short verdict for screen readers');
labelsClear(s, 'Greenwich 30');
await shot(page, '14-greenwich-30');
await page.locator(`${ROOT} [data-zone-button="33"]`).click();
await clickText(page, 'בדיקת הבחירה');
s = await state(page);
check(s.feedback?.includes('12°E') && s.feedback.includes('18°E') && s.inset.focus === '33', 'zone 33: its range shown, another try');
await page.locator(`${ROOT} [data-zone-button="31"]`).click();
await clickText(page, 'בדיקת הבחירה');
s = await state(page);
check(s.feedback?.includes('נכון') && s.feedback.includes('6°E') && s.inset.focus === '31', 'zone 31: right, 0°–6°E explained');
await page.waitForTimeout(300);
const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
check(focused === 'לנקודות חדשות', `after a right answer focus moves to the next action (${focused})`);
check((await page.locator('[data-verdict]').textContent()).startsWith('נכון'), 'zone 31: verdict announced');
await shot(page, '15-greenwich-right');

// transfer practice
await clickText(page, 'לנקודות חדשות');
s = await state(page);
check(s.mode === 'transfer' && s.inset.zoneNumbers.length === 0 && s.world.focus === null, 'transfer: no zone numbers or highlight before the answer');
check(s.world.tip?.label === 'B', 'transfer: the new point is B');
const tokyo = readUtm(TRANSFER[0]);
await clickAt(page, 'world', 20, 135); // zone 53
await page.locator(`${ROOT} [data-practice] [role="radio"]`, { hasText: 'דרומי' }).click();
await clickText(page, 'בדיקת הבחירה');
s = await state(page);
check(s.feedback?.includes('53') && s.feedback.includes('138°E') && s.feedback.includes('מצפון לקו המשווה'), 'transfer wrong: the boundary and the equator explained');
check(s.world.boundary === '138' && s.world.equator === 'highlight', 'transfer wrong: boundary 138°E and the equator marked');
labelsClear(s, 'transfer wrong');
await shot(page, '16-transfer-wrong');
await page.locator(`${ROOT} [data-zone-button="54"]`).click();
await page.locator(`${ROOT} [data-practice] [role="radio"]`, { hasText: 'צפוני' }).click();
await clickText(page, 'בדיקת הבחירה');
s = await state(page);
check(s.feedback?.includes('נכון') && s.feedback.includes(tokyo.eText) && s.feedback.includes(tokyo.nText), 'transfer right: E/N revealed');
check(s.world.focus === '54' && s.inset.zoneNumbers.includes('54'), 'transfer right: the zone revealed on both maps');
await shot(page, '17-transfer-right');
for (const [i, place] of TRANSFER.entries()) {
  if (i === 0) continue;
  await clickText(page, 'לנקודה הבאה');
  const rr = readUtm(place);
  if (!(await page.locator(`${ROOT} [data-zone-button="${rr.zone}"]`).count())) await clickAt(page, 'world', place.lat, place.lon);
  if (await page.locator(`${ROOT} [data-zone-button="${rr.zone}"]`).count()) await page.locator(`${ROOT} [data-zone-button="${rr.zone}"]`).click();
  await page.locator(`${ROOT} [data-practice] [role="radio"]`, { hasText: rr.hemisphere === 'N' ? 'צפוני' : 'דרומי' }).click();
  await clickText(page, 'בדיקת הבחירה');
  s = await state(page);
  check(s.feedback?.includes('נכון') && s.world.tip?.label === ['B', 'C', 'D'][i], `transfer ${place.id}: zone ${rr.zone}${rr.hemisphere} accepted`);
}
await clickText(page, 'לסיום התרגול');
s = await state(page);
check(s.mode === 'done' && s.title === 'סיימתם את התרגול', 'practice ends');
await shot(page, '18-done');

// back to exploration
await clickText(page, 'חזרה לחקירה');
s = await state(page);
check(s.mode === 'explore' && s.lat === exploreKept.lat && s.lon === exploreKept.lon && s.insetKind === 'zones', 'back to exploration: point and view kept');
consistent(s, 'exploration after practice');

// text: 16 px black body copy
const body = await page.$$eval(`[data-block="utm"] p, [data-block="utm"] li`, (ps) =>
  ps.filter((p) => !p.classList.contains('sr-only') && p.offsetParent).map((p) => [getComputedStyle(p).fontSize, getComputedStyle(p).color, p.textContent.slice(0, 30)]),
);
const notBlack = body.filter(([fs, c], i) => fs !== '16px' || (i > 0 && c !== 'rgb(0, 0, 0)'));
check(!notBlack.length, `body copy is 16 px black${notBlack.length ? ` — ${JSON.stringify(notBlack)}` : ''}`);
check(
  await page.$$eval('[data-block="utm"] svg text', (ts) => ts.every((t) => t.getAttribute('text-anchor'))),
  'every SVG <text> sets text-anchor',
);
check(await page.$$eval('[data-frame]', (fs) => fs.every((f) => f.getAttribute('dir') === 'ltr')), 'map frames are dir="ltr" (never mirrored)');

// leave the sub-topic and come back
await page.goto(`${BASE}/lessons/topic-02/#scene-coordinates`, { waitUntil: 'networkidle' });
await page.waitForSelector('#scene-coordinates', { timeout: 60000 });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-atlas-land]', { timeout: 60000 });
await align(page, ROOT);
s = await state(page);
check(s.mode === 'explore', 'after leaving the sub-topic and returning, the atlas renders');
consistent(s, 'after returning');

check(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await ctx.close();

// reduced motion: the enlargement moves without a tween; the explainer cross-fade is off
{
  const { ctx: c2, page: p2, errors: e2 } = await open({ reducedMotion: 'reduce' });
  await view(p2, 'מודדים במטרים');
  await p2.locator(`${ROOT} [data-zone-step="37"]`).click();
  await p2.waitForTimeout(40);
  const early = await state(p2);
  await p2.waitForTimeout(500);
  const late = await state(p2);
  check(JSON.stringify(early.inset.view) === JSON.stringify(late.inset.view), 'reduced motion: the enlargement jumps to its new window (no tween)');
  const t = await p2.$eval('[data-activity="utm-projection"] svg > g', (g) => getComputedStyle(g).transitionProperty);
  check(t === 'none', `reduced motion: explainer steps switch without a fade (${t})`);
  consistent(late, 'reduced motion, zone 37', { grid: true });
  check(!e2.length, 'reduced motion: no console errors');
  await c2.close();
}

await browser.close();
console.log(failures.length ? `\n${failures.length} FAILED` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
