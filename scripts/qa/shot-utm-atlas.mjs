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
// neighbour zone in metres, switching views keeps the point, "מידע נוסף על UTM" closed then
// opened, leaving the sub-topic and coming back, reduced motion, fit at 1440 × 1122, 16 px black
// body text, label overlap.
//
// Practice (map pass 2026-10-26): the map is the tool. A click on either map chooses the zone there
// and its side of the equator (a cell, "54N"); the arrows on the world map do the same by keyboard.
// The choice is drawn in the pick tone and read back in the card — never judged before a check; zone
// numbers and boundaries stay readable on the map; a check marks only the checked choice (✓ / ✕);
// hints grow per wrong part and point at the map; "הצגת התשובה" after two failed checks; a part
// right is locked; the feedback sits under the enlargement, so the maps never move. Greenwich (30
// by click → hint 1, 32 by keyboard → hint 2, 31 right), Tokyo (53S, 53N, then 54N), Buenos Aires
// (21N: zone right + hemisphere wrong, then S by keyboard), Nairobi (the equator in the enlargement;
// two misses, the answer on request), the end count, the reset, back to exploration.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import {
  readUtm, OPENING, PRESETS, TRANSFER, normLon, HEMI_NAME,
} from '../../src/components/lessons/topic-02/utm-atlas/utmAtlas.ts';

const outDir = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'design/screenshots/utm-atlas-map-practice-2026-10-26';
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
        return {
          key: c.dataset.chip,
          text: c.textContent.trim(),
          accent: c.classList.contains('border-accent'),
          pick: c.classList.contains('border-brand-dark'),
          left: b.left,
          right: b.right,
          top: b.top,
          bottom: b.bottom,
          fontSize: getComputedStyle(c).fontSize,
        };
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
        focusHemi: f.querySelector('[data-focus-zone]')?.dataset.focusHemisphere ?? null,
        pick: f.querySelector('[data-pick-zone]')?.dataset.pickZone ?? null,
        pickHemi: f.querySelector('[data-pick-zone]')?.dataset.pickHemisphere ?? null,
        hover: f.querySelector('[data-hover-zone]')?.dataset.hoverZone ?? null,
        role: f.getAttribute('role'),
        tabIndex: f.tabIndex,
        boundary: f.querySelector('[data-boundary]')?.dataset.boundary ?? null,
        boundaries: [...f.querySelectorAll('[data-boundary]')].map((b) => b.dataset.boundary).sort((a, b) => a - b),
        linked: f.classList.contains('border-accent/70'),
        equator: f.querySelector('[data-equator]')?.dataset.equator ?? null,
        greenwich: Boolean(f.querySelector('[data-greenwich]')),
        gridLines: f.querySelectorAll('[data-grid-line]').length,
        zoneNumbers: [...f.querySelectorAll('[data-zone-number]')].map((z) => z.dataset.zoneNumber),
        chips,
        top: topRow && topRow.offsetParent ? [...topRow.querySelectorAll('[data-top-label]')].map((t) => t.textContent.trim()) : [],
        topRects: topRow && topRow.offsetParent
          ? [...topRow.querySelectorAll('[data-top-label]')].map((t) => {
              const b = t.getBoundingClientRect();
              return { key: t.dataset.topLabel, left: b.left, right: b.right };
            })
          : [],
        // underlined labels above the frame: orange = verified / crossed, dark = a checked wrong pick
        topMarked: topRow && topRow.offsetParent
          ? [...topRow.querySelectorAll('[data-top-label]')]
              .filter((t) => t.classList.contains('border-accent') || t.classList.contains('border-brand-dark'))
              .map((t) => `${t.classList.contains('border-accent') ? 'accent' : 'pick'}:${t.textContent.trim()}`)
          : [],
      };
    };
    const verdicts = [...root.querySelectorAll('[data-verdict-mark]')].map((m) => `${m.closest('[data-choice]')?.dataset.choice}:${m.dataset.verdictMark}`);
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
      choice: { zone: txt('[data-choice="zone"]'), hemi: txt('[data-choice="hemisphere"]') },
      announce: txt('[data-announce]'),
      verdicts,
      taskState: root.dataset.taskState ?? null,
      taskData: txt('[data-task-data]'),
      hints: Object.fromEntries([...root.querySelectorAll('[data-hint]')].map((h) => [h.dataset.hint, Number(h.dataset.level)])),
      checkEnabled: (() => { const b = [...root.querySelectorAll('button')].find((x) => x.textContent.trim() === 'בדיקת הבחירה'); return Boolean(b && !b.disabled && b.getAttribute('aria-disabled') !== 'true'); })(),
      showAnswer: Boolean(root.querySelector('[data-show-answer]')),
      explain: txt('[data-explain]'),
      feedback: txt('[data-practice-feedback] [data-feedback]') ?? txt('[data-practice="done"] [data-feedback]'),
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
  if (!grid) {
    // the leading world map names the point's hemisphere beside the equator
    const named = s.world.chips.filter((c) => c.key.startsWith('hemi-') && c.accent).map((c) => c.key);
    if (named.join() !== `hemi-${r.hemisphere}`) bad.push(`hemisphere chip ${named}`);
    if (!s.inset.linked) bad.push('enlargement frame not linked (orange) to the locator box');
  }
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
    // the label row above the frame (zone numbers / boundary longitudes)
    const ts = fr.topRects;
    for (let i = 0; i < ts.length; i++)
      for (let j = i + 1; j < ts.length; j++)
        if (Math.min(ts[i].right, ts[j].right) - Math.max(ts[i].left, ts[j].left) > 1) bad.push(`${k} top:${ts[i].key}×${ts[j].key}`);
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
const lead = await page.locator('[data-block="utm"] h3 + p').first().textContent();
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
check(
  s.title === 'באיזה פלח ובאיזה חצי כדור נמצאת הנקודה?' && s.instruction === 'לחצו במפה או גררו את A. הפלח שלה מודגש, וחצי הכדור מסומן ליד קו המשווה.',
  `opening: one question title and one instruction that says where the answer shows on the map (${s.title} / ${s.instruction})`,
);
check(
  s.world.chips.some((c) => c.key === 'hemi-N' && c.accent) && s.world.chips.some((c) => c.key === 'hemi-S' && !c.accent),
  'opening: the world map marks N (the point\'s side) and S beside the equator',
);
check(s.world.rect.width > s.inset.rect.width * 1.6, `zones view: the world map leads (${Math.round(s.world.rect.width)} vs ${Math.round(s.inset.rect.width)} px)`);
check(s.inset.zoneNumbers.join() === '35,36,37', `opening enlargement shows zones 35, 36, 37 (${s.inset.zoneNumbers})`);
check(['24°E', '30°E', '36°E', '42°E'].every((t) => s.inset.top.includes(t)), `the zone's boundaries are on the enlargement, not in a table (${s.inset.top})`);
check(s.explain.includes('30°E') && s.explain.includes('36°E') && s.explain.includes('פלח 36') && s.explain.includes('מצפון לקו המשווה'), `opening explanation: why zone 36 and N (${s.explain})`);
check(!s.world.chips.some((c) => /84°N|80°S/.test(c.text)) && s.world.chips.some((c) => c.text === 'קו המשווה'), 'world map: the equator named; the coverage numbers moved to "מידע נוסף"');
const note = await page.locator(`${ROOT} [data-locator-note]`).textContent();
check(note.includes('מפת איתור') && note.includes('לא מפת') && note.includes('מוגדלת בתקריב'), `the world map is captioned as a locator map, and its orange frame as the enlargement (${note})`);
check(s.inset.linked && !s.world.linked, 'the enlargement wears the locator box\'s orange on its frame');
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
check(s.inset.topMarked.includes('accent:36°E') && !s.inset.chips.some((c) => c.text.includes('גבול')), `crossed boundary named once, above the frame (${s.inset.topMarked})`);
check(s.inset.top.includes('42°E') && s.inset.zoneNumbers.includes('38'), 'enlargement recentred on zone 37 after release');
labelsClear(s, 'crossing');
await shot(page, '05-crossing');

// across the equator, on the world map
const beforeEq = s;
await clickAt(page, 'world', -20, beforeEq.lon);
s = await state(page);
r = consistent(s, 'click south of the equator');
check(r.hemisphere === 'S' && s.world.equator === 'highlight' && s.explain.includes('קו המשווה'), `equator crossed: S, the equator highlighted (${s.explain})`);
check(s.world.chips.some((c) => c.key === 'hemi-S' && c.accent) && !s.world.chips.some((c) => c.key === 'hemi-N' && c.accent), 'equator crossed: the world map now marks S');
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

// ── Practice (map pass 2026-10-26): the map is the tool; a choice before anything is judged ──
/** Nothing in the maps marks an answer: no verified zone, no accent zone number or hemisphere. */
const nothingAnswered = (s) =>
  s.world.focus === null &&
  s.inset.focus === null &&
  !s.world.chips.some((c) => c.key.startsWith('hemi-') && c.accent) &&
  !s.inset.chips.some((c) => (c.key.startsWith('zone') || c.key.startsWith('hemi-')) && c.accent);
const focusWorld = () => page.locator(`${ROOT} [data-frame="world"]`).focus();

// Greenwich
const explorePoint = await state(page);
await clickText(page, 'מצאו את גריניץ׳');
s = await state(page);
check(s.mode === 'greenwich' && s.prompt.includes('הגבול המערבי') && s.prompt.includes('לחצו במפה') && s.taskState === 'open', 'Greenwich practice opens: the question, and that the choice is made on the map');
check(s.world.greenwich && s.inset.greenwich, 'Greenwich meridian marked on both maps');
check(s.inset.zoneNumbers.join() === '29,30,31,32', `zone numbers are read on the map: 29–32 in the enlargement (${s.inset.zoneNumbers})`);
check(['6°W', '0°', '6°E'].every((t) => s.inset.top.includes(t)), `boundary longitudes above the enlargement (${s.inset.top})`);
check(s.inset.chips.some((c) => c.key === 'west') && s.inset.chips.some((c) => c.key === 'east'), 'the enlargement names west and east, which "the western boundary" needs');
check(nothingAnswered(s) && s.world.pick === null && s.choice.zone === '—' && !s.checkEnabled, 'nothing chosen: no choice drawn, nothing answered, "בדיקת הבחירה" disabled');
check(s.world.role === 'application' && s.world.tabIndex === 0, 'the world map takes the keyboard in practice');
labelsClear(s, 'Greenwich open');
await fits(page, 'fit 1440 × 1122, Greenwich open');
await shot(page, '14-greenwich-open');

// hover: where a click would choose — not a choice
const hp = px(s.inset, 52, 3);
await page.mouse.move(hp.x, hp.y);
await settle(page, 300);
s = await state(page);
check(s.inset.hover === '31' && s.world.hover === '31' && s.choice.zone === '—', 'hovering a strip outlines it on both maps; nothing is chosen');
await shot(page, '14b-greenwich-hover');

await clickAt(page, 'inset', 50, -3);
s = await state(page);
check(s.choice.zone === '30' && s.inset.pick === '30' && s.world.pick === '30' && s.inset.pickHemi === null, 'a click in the enlargement chooses zone 30: drawn on both maps, read back in the card');
check(s.inset.chips.some((c) => c.key === 'zone30' && c.pick) && s.world.topMarked.includes('pick:30'), "the chosen zone's number is marked on the map (pick tone)");
check(nothingAnswered(s) && !s.verdicts.length && s.feedback === null && s.checkEnabled, 'the choice is not judged before the check: no ✓ / ✕, no feedback, the answer not drawn');
check(s.lat === explorePoint.lat && s.lon === explorePoint.lon, 'a practice click does not move the exploration point');
const insetBefore = s.inset.rect;
await shot(page, '15-greenwich-choice');
await clickText(page, 'בדיקת הבחירה');
s = await state(page);
check(s.taskState === 'tried' && s.verdicts.join() === 'zone:wrong' && s.hints.zone === 1, `zone 30 checked: ✕ on the choice, hint 1 (${s.verdicts})`);
check(
  s.feedback?.includes('ממערב לקו גריניץ׳') && s.feedback.includes('המזרחי') && s.feedback.includes('השמאלי'),
  `hint 1 for 30: Greenwich is its EASTERN edge; a western edge is the strip's left side on the map (${s.feedback})`,
);
check(s.inset.boundaries.includes('0') && s.inset.focus === null && s.inset.pick === '30', 'hint 1: the Greenwich line pointed at; the answer still not drawn');
check(Math.abs(s.inset.rect.top - insetBefore.top) < 0.5 && Math.abs(s.inset.rect.left - insetBefore.left) < 0.5, 'the feedback appears under the enlargement: the maps do not move');
check(!s.checkEnabled && !s.showAnswer, 'the same choice cannot be checked again; no answer offered after one try');
check((await page.evaluate(() => document.activeElement?.textContent?.trim())) === 'בדיקת הבחירה', 'after a wrong check the keyboard focus stays on the check button');
await page.waitForTimeout(600);
check((await page.locator(`${ROOT} [data-verdict]`).textContent()).includes('לא נכון'), 'zone 30: a short verdict for screen readers');
labelsClear(s, 'Greenwich 30');
await fits(page, 'fit 1440 × 1122, Greenwich hint 1');
await shot(page, '16-greenwich-30-hint1');

// keyboard: → → on the world map, from 30 to 32
await focusWorld();
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight');
await settle(page, 700);
s = await state(page);
check(s.choice.zone === '32' && s.world.pick === '32' && !s.verdicts.length, `keyboard: → → on the world map chooses 32; the ✕ drops until the next check (${s.choice.zone})`);
check(s.announce?.includes('בחרתם: פלח 32') && s.announce.includes('6°E') && s.announce.includes('12°E'), `the keyboard choice is announced with the zone's longitudes (${s.announce})`);
const ring = await page.locator(`${ROOT} [data-frame="world"]`).evaluate((e) => getComputedStyle(e).boxShadow);
check(ring !== 'none', 'the keyboard focus on the map is visible (focus ring)');
await shot(page, '16b-greenwich-keyboard');
await clickText(page, 'בדיקת הבחירה');
s = await state(page);
check(
  s.hints.zone === 2 && s.feedback.includes('רמז') && s.feedback.includes('הקו השמאלי שלה') && !/פלח 31/.test(s.feedback),
  `zone 32: hint 2 points at the map — the strip whose left line is Greenwich — without naming 31 (${s.feedback})`,
);
check(s.inset.topMarked.includes('accent:0°') && s.showAnswer, 'hint 2: 0° underlined above the enlargement; "הצגת התשובה" offered after two failed checks');
labelsClear(s, 'Greenwich hint 2');
await shot(page, '17-greenwich-32-hint2');
await focusWorld();
await page.keyboard.press('ArrowLeft');
await settle(page, 300);
await clickText(page, 'בדיקת הבחירה');
s = await state(page);
check(
  s.taskState === 'solved' && s.feedback?.includes('נכון') && s.feedback.includes('6°E') && s.feedback.includes('המערבי') && s.inset.focus === '31',
  'zone 31: right — Greenwich is its western (left) edge, it runs to 6°E; drawn as verified',
);
check(s.verdicts.join() === 'zone:right' && s.inset.pick === null, 'zone 31: ✓ on the choice; the verified zone replaces the pick tone');
await page.waitForTimeout(300);
const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
check(focused === 'לנקודות חדשות', `after a right answer focus moves to the next action (${focused})`);
check((await page.locator(`${ROOT} [data-verdict]`).textContent()).startsWith('נכון'), 'zone 31: verdict announced');
await clickAt(page, 'inset', 50, -3);
s = await state(page);
check(s.choice.zone === '31', 'a verified task takes no new choice from the map');
await shot(page, '18-greenwich-right');

// transfer 1 — Tokyo: 53S (both parts wrong), 53N (zone again, hemisphere right), then 54N
await clickText(page, 'לנקודות חדשות');
const tokyo = readUtm(TRANSFER[0]);
s = await state(page);
check(s.mode === 'transfer' && s.world.tip?.label === 'B' && s.inset.tip?.label === 'B' && s.taskState === 'open', 'transfer: the new point is B, pinned on both maps');
check(s.taskData === 'נקודה B · טוקיו', `the task names the place; where it is is read on the map (${s.taskData})`);
check(
  s.inset.zoneNumbers.join() === '53,54,55' && ['132°E', '138°E', '144°E'].every((t) => s.inset.top.includes(t)),
  `zone numbers and boundaries readable in the enlargement (${s.inset.zoneNumbers} / ${s.inset.top})`,
);
check(nothingAnswered(s) && s.choice.zone === '—' && s.choice.hemi === '—', 'before a choice: nothing answered, the card shows no choice');
check(
  s.world.chips.some((c) => c.key === 'hemi-N' && !c.accent && !c.pick) && s.world.chips.some((c) => c.key === 'hemi-S' && !c.accent && !c.pick),
  'which side of the equator is N / S stays on the map, unmarked',
);
labelsClear(s, 'transfer open');
await fits(page, 'fit 1440 × 1122, transfer open');
await shot(page, '19-transfer-open');
await clickAt(page, 'world', 20, 135);
s = await state(page);
check(
  s.choice.zone === '53' && s.choice.hemi?.includes('צפוני') && s.world.pick === '53' && s.world.pickHemi === 'N' && s.inset.pick === '53',
  'a click on the world map chooses a cell: zone 53 north of the equator (53N), drawn on both maps',
);
check(s.world.chips.some((c) => c.key === 'hemi-N' && c.pick) && nothingAnswered(s) && !s.verdicts.length, 'the chosen side is marked beside the equator in the pick tone; nothing is judged');
await shot(page, '20-transfer-choice');
await clickAt(page, 'world', -20, 135);
s = await state(page);
check(s.world.pickHemi === 'S' && s.inset.pickHemi === 'S' && s.choice.hemi?.includes('דרומי'), 'clicking south of the equator chooses 53S: the south half, outside the enlargement window, drawn on the world map');
await clickText(page, 'בדיקת הבחירה');
s = await state(page);
check(s.hints.zone === 1 && s.hints.hemi === 1 && s.verdicts.sort().join() === 'hemisphere:wrong,zone:wrong', `53S checked: ✕ on both parts, hint 1 for each (${s.verdicts})`);
check(
  s.feedback.includes('132°E') && s.feedback.includes('138°E') && !s.feedback.includes('144°E') && s.feedback.includes('קווים מקווקווים'),
  `hint 1, zone: the chosen zone's own boundaries, and where to look in the enlargement (${s.feedback})`,
);
check(
  s.feedback.includes('מעל הקו המודגש או מתחתיו') && !s.feedback.includes('מצפון לקו המשווה') && s.world.equator === 'highlight' && s.inset.equator === 'highlight',
  'hint 1, hemisphere: look at B against the highlighted equator — not which side',
);
check(s.world.boundaries.length === 0 && s.world.focus === null, 'hint 1: no boundary of B and no answer drawn');
labelsClear(s, 'transfer hint 1');
await fits(page, 'fit 1440 × 1122, transfer hint 1 (two hints)');
await shot(page, '21-transfer-hint1');
await clickAt(page, 'inset', 38, 133);
await clickText(page, 'בדיקת הבחירה');
s = await state(page);
check(
  s.hints.zone === 2 && s.feedback.includes('רמז') && s.feedback.includes('138°E') && s.feedback.includes('144°E') && !s.feedback.includes(String(tokyo.zone)),
  `hint 2, zone: B between the marked 138°E and 144°E; the number is read on the map, not given (${s.feedback})`,
);
check(
  s.world.boundaries.join() === '138,144' && s.inset.boundaries.join() === '138,144' && s.inset.topMarked.includes('accent:138°E') && s.inset.topMarked.includes('accent:144°E'),
  'hint 2: 138°E and 144°E marked on both maps',
);
check(
  s.hints.hemi === 0 && s.feedback.includes('חצי הכדור נכון') && s.verdicts.includes('hemisphere:right') && s.world.chips.some((c) => c.key === 'hemi-N' && c.accent),
  'the hemisphere checked right: ✓, locked, named on the map',
);
check(s.showAnswer, 'two failed checks: "הצגת התשובה" offered');
labelsClear(s, 'transfer hint 2');
await fits(page, 'fit 1440 × 1122, transfer hint 2');
await shot(page, '22-transfer-hint2');
await clickAt(page, 'world', -30, 141); // south of the equator: the locked hemisphere stays N
s = await state(page);
check(s.choice.zone === '54' && s.choice.hemi?.includes('צפוני'), 'with the hemisphere locked, a click changes only the zone (54, still N)');
await clickText(page, 'בדיקת הבחירה');
s = await state(page);
check(
  s.taskState === 'solved' && s.feedback?.includes('נכון') && s.feedback.includes('54N') && s.feedback.includes('139.69°E') && s.feedback.includes('138°E') && s.feedback.includes('144°E') && s.feedback.includes('35.68°N') && s.feedback.includes('מצפון לקו המשווה'),
  `right: the point, the zone's boundaries and the equator explain 54N (${s.feedback})`,
);
check(s.feedback.includes(tokyo.eText) && s.feedback.includes(tokyo.nText), 'right: then its E / N in that zone');
check(
  s.world.focus === '54' && s.world.focusHemi === 'N' && s.inset.focus === '54' && s.verdicts.sort().join() === 'hemisphere:right,zone:right',
  'right: the cell 54N drawn as verified; ✓ on both parts',
);
await shot(page, '23-transfer-right');

// transfer 2 — Buenos Aires: 21N → the zone locks, the hemisphere is hinted; ↓ by keyboard
await clickText(page, 'לנקודה הבאה');
const ba = readUtm(TRANSFER[1]);
s = await state(page);
check(
  s.world.tip?.label === 'C' && s.taskState === 'open' && !s.verdicts.length && s.choice.zone === '—' && s.feedback === null && s.world.boundaries.length === 0,
  'next point C: a fresh task (no choice, verdict, hint or feedback)',
);
await clickAt(page, 'world', 20, TRANSFER[1].lon);
await clickText(page, 'בדיקת הבחירה');
s = await state(page);
check(
  s.feedback?.includes(`הפלח נכון: ${ba.zone}`) && s.hints.hemi === 1 && s.world.focus === String(ba.zone) && s.world.focusHemi === null && s.world.pickHemi === 'N',
  `${ba.zone}N: the zone verified (its whole strip), the chosen north half still the learner's (${s.feedback})`,
);
check(!s.world.chips.some((c) => c.key.startsWith('hemi-') && c.accent), 'the hemisphere stays unnamed until it is verified');
labelsClear(s, 'zone right, hemisphere wrong');
await shot(page, '24-transfer-zone-right-hemi-wrong');
await focusWorld();
await page.keyboard.press('ArrowLeft');
await settle(page, 700);
s = await state(page);
check(s.choice.zone === String(ba.zone) && s.announce?.includes('הפלח כבר נכון'), `keyboard: the verified zone does not move, and says so (${s.announce})`);
await page.keyboard.press('ArrowDown');
await settle(page, 300);
await clickText(page, 'בדיקת הבחירה');
s = await state(page);
check(s.taskState === 'solved' && s.world.chips.some((c) => c.key === 'hemi-S' && c.accent) && s.world.focusHemi === 'S', `↓ chooses the south: ${ba.zone}${ba.hemisphere} accepted`);

// transfer 3 — Nairobi, near the equator: the enlargement names it and its sides; two misses, the answer on request
await clickText(page, 'לנקודה הבאה');
const nb = readUtm(TRANSFER[2]);
s = await state(page);
check(
  s.inset.chips.some((c) => c.key === 'eq' && c.text === 'קו המשווה') && s.inset.chips.some((c) => c.key === 'hemi-N') && s.inset.chips.some((c) => c.key === 'hemi-S'),
  'D is near the equator: the enlargement names it and its N / S sides',
);
check(s.inset.zoneNumbers.includes('36') && s.inset.zoneNumbers.includes('37'), `D's neighbourhood: 36 and 37 readable (${s.inset.zoneNumbers})`);
labelsClear(s, 'transfer near the equator');
await shot(page, '25-transfer-equator');
await clickAt(page, 'inset', 1.5, 35);
s = await state(page);
check(s.inset.pick === '36' && s.inset.pickHemi === 'N' && s.inset.chips.some((c) => c.key === 'hemi-N' && c.pick), 'in the enlargement a click north of the equator chooses 36N; the enlargement marks the chosen side');
await clickText(page, 'בדיקת הבחירה');
await clickAt(page, 'inset', 2, 44);
await clickText(page, 'בדיקת הבחירה');
s = await state(page);
check(s.showAnswer && s.hints.zone === 2 && s.inset.boundaries.join() === '36,42', 'two misses on D (36N, 38N): zone hint 2 (36°E and 42°E marked) and the answer on request');
check(
  s.hints.hemi === 2 && s.feedback.includes('מתחת לקו המשווה') && s.feedback.includes('מדרום לו') && s.inset.chips.some((c) => c.key === 'eq' && c.accent),
  `hemisphere hint 2: on the map D is below the equator, i.e. south of it (${s.feedback})`,
);
labelsClear(s, 'D hint 2');
await fits(page, 'fit 1440 × 1122, D with both hints at level 2');
await page.locator(`${ROOT} [data-show-answer]`).click();
await settle(page);
s = await state(page);
check(
  s.taskState === 'shown' && s.feedback?.includes(`התשובה: ${nb.zone}${nb.hemisphere}`) && s.world.focus === String(nb.zone) && s.world.focusHemi === nb.hemisphere,
  `shown: the answer (${nb.zone}${nb.hemisphere}) in the feedback and on the maps`,
);
check(s.inset.pick === '38' && s.inset.pickHemi === 'N' && s.verdicts.sort().join() === 'hemisphere:wrong,zone:wrong', "shown: the learner's own last choice (38N) stays drawn as theirs (✕), apart from the answer");
await page.waitForTimeout(300);
check((await page.evaluate(() => document.activeElement?.textContent?.trim())) === 'לסיום התרגול', 'shown: focus moves to the way forward');
labelsClear(s, 'shown');
await shot(page, '26-transfer-shown');
await clickText(page, 'לסיום התרגול');
s = await state(page);
check(s.mode === 'done' && s.title === 'סיימתם את התרגול' && s.feedback?.includes('3 מתוך 4'), `practice ends with an honest count (${s.feedback})`);
await shot(page, '27-done');

// reset: practice again starts clean
await clickText(page, 'תרגול מחדש');
s = await state(page);
check(
  s.mode === 'greenwich' && s.taskState === 'open' && s.choice.zone === '—' && !s.verdicts.length && s.feedback === null && s.inset.pick === null && s.world.boundaries.length === 0,
  'reset ("תרגול מחדש"): task 1 again, no choice, verdict, hint or mark left',
);
await focusWorld();
await page.keyboard.press('ArrowRight');
await settle(page, 300);
s = await state(page);
check(s.choice.zone === '29', `keyboard from nothing: → starts at the enlargement's west edge (29), not at the answer (${s.choice.zone})`);
await clickText(page, 'בדיקת הבחירה');
s = await state(page);
check(s.hints.zone === 1 && !s.showAnswer, 'after the reset the hints start again from 1');

// back to exploration, from the practice header
await clickText(page, 'חזרה לחקירה');
s = await state(page);
check(s.mode === 'explore' && s.lat === exploreKept.lat && s.lon === exploreKept.lon && s.insetKind === 'zones', 'back to exploration: point and view kept');
consistent(s, 'exploration after practice');
check(s.world.pick === null && s.world.hover === null && s.world.role === 'group', "exploration: no practice marks; clicks place the point again");
await clickText(page, 'מצאו את גריניץ׳');
s = await state(page);
check(s.taskState === 'open' && s.feedback === null && s.choice.zone === '—', 'entering practice again starts it clean');
await clickText(page, 'חזרה לחקירה');

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
