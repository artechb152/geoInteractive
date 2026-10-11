// Browser QA for the topic-02 "מערכות ייחוס — אותה נקודה, שתי שפות" comparison
// (CoordinatesPart2Scene → ReferenceSystemsLinkedComparison).
//
// Usage (dev server running; default http://localhost:3000, or QA_BASE=...):
//   node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-reference-systems.mjs [outDir]
//
// Checks (exit code 1 on any failure):
//   opening     A selected on both maps + the A/B/C group, mode "יחידות", full readings (no dashes)
//   pick        A/B/C from the geographic map, the UTM map and the buttons: both maps and both
//               cards change together, the mode stays
//   hover       previews the feature on both maps, never changes the reading; leaving restores
//   keyboard    focus previews, Enter / Space select; tabs: ← next, → previous, Home / End
//   modes       each tab shows the original row text; emphasis moves, the point does not;
//               36N is on screen in every mode
//   reset       back to A + "יחידות"
//   register    same viewBox / image box on both maps; each pin tip = its data point = its ring centre
//   overlap     no two map overlays overlap, all inside the map, at A, B and C; no clipped reading
//   fallback    with the base image blocked: same box, paper + grid, readings and picking still work
//   reduced     prefers-reduced-motion: no transition on rings / fields
//   copy        every original heading, paragraph, definition and table value is in the block
//   palette     every computed colour in the block is a token colour (or a shared component's)
//   shell       scene id, neighbour blocks and order unchanged; no console / page errors
// Screenshots (1440 × 1122): see SHOTS below.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { READINGS, fx, fy } from '../../src/components/lessons/topic-02/reference-systems/referenceSystemsGeometry.ts';

const outDir = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'design/screenshots/reference-systems';
const BASE = process.env.QA_BASE || 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-02/#scene-coordinates-2`;
await mkdir(outDir, { recursive: true });

const failures = [];
const fail = (m) => {
  failures.push(m);
  console.log('FAIL', m);
};
const ok = (m) => console.log('ok  ', m);
const check = (cond, m) => (cond ? ok(m) : fail(m));

const ROOT = '[data-activity="reference-systems"]';
const MAPS = ['geo', 'utm'];

// The block's original copy (snapshot taken before the redesign) — must all still be there.
const ORIGINAL = {
  heading: 'מערכות ייחוס',
  lead: 'לא ניתן לדבר על קואורדינטות של נקודה בלי שנדע מהו הדאטום ומהו ההיטל שלה. השילוב ביניהם נקרא ״מערכת ייחוס״.',
  terms: [
    ['דאטום', 'מכלול הפרמטרים המגדירים ומעגנים את האליפסואיד ביחס לפני כדור הארץ (ראו קואורדינטות 1).'],
    ['היטל', 'מעבר מעולם תלת־ממדי לדו־ממדי: גיאוגרפי, UTM ועוד.'],
    ['מערכת ייחוס', 'השילוב בין הדאטום להיטל.'],
  ],
  tableHeading: 'שני ההיטלים המרכזיים',
  columns: ['היטל גיאוגרפי', 'היטל UTM'],
  rows: {
    scope: ['היקף', 'גלובלית', 'רשת עולמית של 60 פלחים, 6° כל אחד'],
    units: ['יחידות', 'זוויתיות (מעלות, דקות, שניות)', 'מטריות'],
    what: ['מה מציינים', 'רוחב ואורך', 'הקואורדינטות, הפלח וחצי הכדור'],
  },
};

// Token colours (tailwind.config.ts) allowed inside the block. paper.bright is the shared
// Button's secondary fill (used as-is, per the brief); #000 is text-black.
const TOKENS = ['#F3E9DC', '#FFFFFF', '#F6EFE6', '#DCCDB2', '#ECE4D2', '#C9A56B', '#38432E', '#4A5240', '#8A8873', '#749C75', '#5B7C5C', '#D97E2B', '#E08A38', '#D69051', '#000000', '#FDFBF3'];
const tokenRgb = TOKENS.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(','));

const browser = await chromium.launch({ channel: 'chrome' });

async function open(opts = {}, { blockImage = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(m.text()));
  // failed requests are reported with their URL (the console line has none)
  page.on('response', (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));
  if (blockImage) await page.route('**/linked-terrain-base.webp', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 240000 });
  await page.waitForSelector(ROOT, { timeout: 60000 });
  if (!blockImage) {
    await page.waitForFunction(() => {
      const imgs = [...document.querySelectorAll('[data-base-image]')];
      return imgs.length === 2 && imgs.every((i) => i.getBBox().width > 0);
    });
  }
  await align(page);
  return { ctx, page, errors };
}

/** Section heading "מערכות ייחוס" just under the site header (the card follows it). */
async function align(page, offset = 0) {
  await page.evaluate(
    ({ root, offset }) => {
      const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
      const block = document.querySelector(root).parentElement;
      // instant: the page has scroll-behavior: smooth
      window.scrollTo({ top: block.getBoundingClientRect().top + window.scrollY - header - 16 + offset, behavior: 'instant' });
    },
    { root: ROOT, offset },
  );
  await page.waitForTimeout(700);
}

const state = (page) =>
  page.evaluate((root) => {
    const r = document.querySelector(root);
    const text = (sel) => r.querySelector(sel)?.textContent.trim();
    const fields = Object.fromEntries([...r.querySelectorAll('[data-field]')].map((f) => [f.dataset.field, f.querySelector('dd').textContent.trim()]));
    const pressed = [...r.querySelectorAll('[data-point-button]')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.pointButton);
    const pins = Object.fromEntries(
      ['geo', 'utm'].map((m) => [m, [...r.querySelectorAll(`[data-map="${m}"] [data-pin]`)].filter((b) => b.dataset.active === 'true').map((b) => b.dataset.pin)]),
    );
    const rings = Object.fromEntries(
      ['geo', 'utm'].map((m) => [m, Object.fromEntries([...r.querySelectorAll(`[data-map="${m}"] [data-ring]`)].map((e) => [e.dataset.ring, e.dataset.ringState]))]),
    );
    const tab = r.querySelector('[role="tab"][aria-selected="true"]')?.dataset.mode;
    const tabIndexes = [...r.querySelectorAll('[role="tab"]')].map((t) => t.tabIndex);
    const visiblePanel = [...r.querySelectorAll('[data-mode-panel]')].filter((p) => getComputedStyle(p).visibility === 'visible').map((p) => p.dataset.modePanel);
    const panelText = Object.fromEntries([...r.querySelectorAll('[data-mode-panel]')].map((p) => [p.dataset.modePanel, [...p.querySelectorAll('dd')].map((d) => d.textContent.trim())]));
    const live = r.querySelector('[aria-live="polite"]')?.textContent.trim();
    const emph = (el) => !!el && el.className.includes('bg-accent/10');
    return {
      fields,
      pressed,
      pins,
      rings,
      tab,
      tabIndexes,
      visiblePanel,
      panelText,
      live,
      unitsEmph: [...r.querySelectorAll('[data-unit]')].map(emph),
      fieldEmph: [...r.querySelectorAll('[data-field]')].map(emph),
      metaEmph: [...r.querySelectorAll('[data-meta]')].map(emph),
      zoneChipEmph: r.querySelector('[data-zone-chip]')?.className.includes('ring-accent') ?? false,
      labelEmph: [...r.querySelectorAll('[data-map-label]')].every((l) => l.className.includes('ring-accent')),
      zoneVisible: (() => {
        const z = r.querySelector('[data-field="zone"]');
        const b = z.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && getComputedStyle(z).visibility === 'visible' && z.textContent.includes('36N');
      })(),
    };
  }, ROOT);

const expectReading = (s, id, label) => {
  const r = READINGS[id];
  check(
    s.fields.lat === r.latText && s.fields.lon === r.lonText && s.fields.e === r.eText && s.fields.n === r.nText && s.fields.zone === '36N',
    `${label}: both cards read ${id} (${r.latText} ${r.lonText} | ${r.eText} ${r.nText} 36N) — got ${JSON.stringify(s.fields)}`,
  );
  check(s.pressed.join() === id && s.pins.geo.join() === id && s.pins.utm.join() === id, `${label}: ${id} pressed in the group and on both maps`);
  check(MAPS.every((m) => s.rings[m][id] === 'selected' && Object.entries(s.rings[m]).every(([k, v]) => k === id || v === 'off')), `${label}: ${id}'s feature outlined on both maps`);
  check(s.live?.startsWith(`נקודה ${id}:`), `${label}: announced "${s.live}"`);
};

/** Overlay boxes inside each map: labels, north arrow, scale bar, zone tag, pin heads. */
const overlapReport = (page) =>
  page.evaluate((root) => {
    const out = [];
    for (const map of document.querySelectorAll(`${root} [data-map]`)) {
      const mb = map.getBoundingClientRect();
      const items = [
        ...[...map.querySelectorAll('[data-map-label]')].map((e) => ({ name: `label ${e.textContent}`, b: e.getBoundingClientRect() })),
        ...['[data-north]', '[data-scale-bar]', '[data-zone-chip]'].flatMap((s) => [...map.querySelectorAll(s)].map((e) => ({ name: s, b: e.getBoundingClientRect() }))),
        ...[...map.querySelectorAll('[data-pin]')].map((e) => ({ name: `pin ${e.dataset.pin}`, b: e.firstElementChild.getBoundingClientRect() })),
      ];
      for (const it of items) {
        const b = it.b;
        if (b.left < mb.left - 0.5 || b.top < mb.top - 0.5 || b.right > mb.right + 0.5 || b.bottom > mb.bottom + 0.5) out.push(`${map.dataset.map}: ${it.name} leaves the map`);
      }
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i].b;
          const b = items[j].b;
          if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) out.push(`${map.dataset.map}: ${items[i].name} × ${items[j].name}`);
        }
      }
    }
    for (const f of document.querySelectorAll(`${root} [data-field] dd, ${root} [data-field] dt`)) {
      if (f.scrollWidth > f.clientWidth + 1) out.push(`clipped reading "${f.textContent}"`);
    }
    return out;
  }, ROOT);

// ── main run ───────────────────────────────────────────────────────────────
{
  const { ctx, page, errors } = await open();
  const pin = (map, id) => page.locator(`${ROOT} [data-map="${map}"] [data-pin="${id}"]`);
  const btn = (id) => page.locator(`${ROOT} [data-point-button="${id}"]`);
  const tab = (m) => page.locator(`${ROOT} [role="tab"][data-mode="${m}"]`);

  // opening
  let s = await state(page);
  expectReading(s, 'A', 'opening');
  check(s.tab === 'units' && s.visiblePanel.join() === 'units', 'opening: mode "יחידות"');
  check(s.unitsEmph.length === 4 && s.unitsEmph.every(Boolean), 'opening: units lines emphasised');
  check(!Object.values(s.fields).some((v) => /^[-–—]+$/.test(v) || v === ''), 'opening: no placeholder dashes');
  await page.screenshot({ path: `${outDir}/01-opening-A-units.png` });

  // registration: same viewBox / image box; pin tip = data point = ring centre, on both maps
  const reg = await page.evaluate((root) => {
    const maps = [...document.querySelectorAll(`${root} [data-map]`)];
    return maps.map((m) => {
      const svg = m.querySelector('svg');
      const img = m.querySelector('[data-base-image]');
      const mb = m.getBoundingClientRect();
      const pins = Object.fromEntries(
        [...m.querySelectorAll('[data-pin]')].map((p) => {
          const dot = p.lastElementChild.getBoundingClientRect();
          return [p.dataset.pin, { fx: (dot.left + dot.width / 2 - mb.left) / mb.width, fy: (dot.top + dot.height / 2 - mb.top) / mb.height }];
        }),
      );
      const rings = Object.fromEntries([...m.querySelectorAll('[data-ring]')].map((r) => [r.dataset.ring, { cx: +r.getAttribute('cx'), cy: +r.getAttribute('cy') }]));
      return { map: m.dataset.map, viewBox: svg.getAttribute('viewBox'), img: ['x', 'y', 'width', 'height', 'href'].map((a) => img.getAttribute(a)).join(' '), ratio: mb.width / mb.height, w: mb.width, pins, rings };
    });
  }, ROOT);
  check(reg[0].viewBox === reg[1].viewBox && reg[0].img === reg[1].img, `register: same viewBox (${reg[0].viewBox}) and image box on both maps`);
  check(Math.abs(reg[0].ratio - 1.25) < 0.01 && Math.abs(reg[1].ratio - 1.25) < 0.01 && Math.abs(reg[0].w - reg[1].w) < 0.5, `register: both maps 5:4 and equal size (${reg[0].w.toFixed(1)} px)`);
  for (const id of ['A', 'B', 'C']) {
    const r = READINGS[id];
    const tol = 1.5 / reg[0].w; // 1.5 px
    const okPins = reg.every((m) => Math.abs(m.pins[id].fx - fx(r.x)) < tol && Math.abs(m.pins[id].fy - fy(r.y)) < (tol * 5) / 4);
    const okRings = reg.every((m) => m.rings[id].cx === r.x && m.rings[id].cy === r.y);
    check(okPins && okRings, `register: ${id} pin tip and ring centre on (${r.x}, ${r.y}) m on both maps`);
  }

  let ov = await overlapReport(page);
  check(ov.length === 0, `overlap at A: ${ov.join('; ') || 'none'}`);

  // pick from the geographic map, from the UTM map, from the buttons
  await pin('geo', 'B').click();
  await page.waitForTimeout(300);
  s = await state(page);
  expectReading(s, 'B', 'geo map → B');
  check(s.tab === 'units', 'geo map → B: mode unchanged');
  ov = await overlapReport(page);
  check(ov.length === 0, `overlap at B: ${ov.join('; ') || 'none'}`);
  await page.mouse.move(5, 600);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/02-point-B.png` });

  await pin('utm', 'C').click();
  await page.waitForTimeout(300);
  s = await state(page);
  expectReading(s, 'C', 'UTM map → C');
  ov = await overlapReport(page);
  check(ov.length === 0, `overlap at C: ${ov.join('; ') || 'none'}`);
  await page.mouse.move(5, 600);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/03-point-C.png` });

  await pin('utm', 'A').click();
  await page.waitForTimeout(250);
  expectReading(await state(page), 'A', 'UTM map → A');
  await btn('B').click();
  await page.waitForTimeout(250);
  expectReading(await state(page), 'B', 'button → B');
  await pin('geo', 'C').click();
  await page.waitForTimeout(250);
  expectReading(await state(page), 'C', 'geo map → C');
  await btn('A').click();
  await page.waitForTimeout(250);
  expectReading(await state(page), 'A', 'button → A');

  // hover: preview on both maps, reading unchanged; leaving restores
  await pin('utm', 'C').hover();
  await page.waitForTimeout(300);
  s = await state(page);
  check(MAPS.every((m) => s.rings[m].C === 'preview' && s.rings[m].A === 'dimmed'), 'hover C (UTM map): C previewed on both maps, A dimmed');
  check(s.fields.e === READINGS.A.eText && s.fields.lat === READINGS.A.latText && s.live.startsWith('נקודה A:'), 'hover C: readings and announcement still A');
  await page.screenshot({ path: `${outDir}/04-hover-preview-C.png` });
  await page.mouse.move(5, 600);
  await page.waitForTimeout(300);
  s = await state(page);
  check(MAPS.every((m) => s.rings[m].A === 'selected' && s.rings[m].C === 'off'), 'hover out: A outlined again');

  // keyboard: focus previews; Enter / Space select
  check((await btn('B').evaluate((b) => b.tabIndex)) === 0, 'keyboard: point buttons are in the tab order');
  await btn('A').focus();
  await page.keyboard.press('Tab');
  check((await page.evaluate(() => document.activeElement?.dataset.pointButton)) === 'B', 'keyboard: Tab moves A → B');
  s = await state(page);
  check(MAPS.every((m) => s.rings[m].B === 'preview') && s.fields.e === READINGS.A.eText, 'keyboard: focus on B previews it on both maps, reading still A');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  expectReading(await state(page), 'B', 'keyboard Enter → B');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  expectReading(await state(page), 'C', 'keyboard Space → C');

  // modes: original text, emphasis moves, point stays
  const pointBefore = (await state(page)).fields;
  for (const [m, file] of [
    ['scope', '05-mode-scope'],
    ['what', '06-mode-what'],
    ['units', null],
  ]) {
    await tab(m).click();
    await page.waitForTimeout(300);
    s = await state(page);
    const [label, geo, utm] = ORIGINAL.rows[m];
    check(s.tab === m && s.visiblePanel.join() === m, `mode ${label}: selected and the only visible panel`);
    check(s.panelText[m].join('|') === `${geo}|${utm}`, `mode ${label}: shows "${geo}" | "${utm}"`);
    check(JSON.stringify(s.fields) === JSON.stringify(pointBefore), `mode ${label}: point and readings unchanged`);
    check(s.zoneVisible, `mode ${label}: 36N on screen`);
    if (m === 'scope') check(s.metaEmph.every(Boolean) && s.zoneChipEmph && !s.unitsEmph.some(Boolean), 'mode היקף: system meta + 36N tag emphasised');
    if (m === 'what') check(s.fieldEmph.every(Boolean) && !s.unitsEmph.some(Boolean), 'mode מה מציינים: ϕ/λ and E/N/36N emphasised');
    if (m === 'units') check(s.unitsEmph.every(Boolean) && s.labelEmph && !s.fieldEmph.some(Boolean), 'mode יחידות: units and grid labels emphasised');
    if (file) {
      await page.mouse.move(5, 600);
      await page.screenshot({ path: `${outDir}/${file}.png` });
    }
  }
  // tabs keyboard (RTL: ← next, → previous)
  await tab('units').focus();
  await page.keyboard.press('ArrowLeft');
  s = await state(page);
  check(s.tab === 'what' && (await page.evaluate(() => document.activeElement?.dataset.mode)) === 'what', 'tabs: ← moves to the next tab (מה מציינים) with focus');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  s = await state(page);
  check(s.tab === 'scope', 'tabs: → → back to היקף');
  await page.keyboard.press('End');
  check((await state(page)).tab === 'what', 'tabs: End');
  await page.keyboard.press('Home');
  s = await state(page);
  check(s.tab === 'scope' && s.tabIndexes.filter((t) => t === 0).length === 1, 'tabs: Home; one tab stop (roving tabindex)');

  // reset
  const reset = page.getByRole('button', { name: 'איפוס' });
  await reset.click();
  await page.waitForTimeout(300);
  s = await state(page);
  expectReading(s, 'A', 'reset');
  check(s.tab === 'units', 'reset: mode back to יחידות');
  check((await page.evaluate(() => document.activeElement?.textContent?.trim())) === 'איפוס', 'reset: focus stays on the button');

  // copy
  const copy = await page.evaluate((root) => {
    const block = document.querySelector(root).parentElement;
    const norm = (t) => t.replace(/\s+/g, ' ').trim();
    return { text: norm(block.textContent), h3: norm(block.querySelector('h3').textContent), lead: norm(block.querySelector('h3 + p').textContent) };
  }, ROOT);
  check(copy.h3 === ORIGINAL.heading, 'copy: heading "מערכות ייחוס"');
  check(copy.lead === ORIGINAL.lead, 'copy: lead paragraph verbatim');
  const needles = [ORIGINAL.tableHeading, ...ORIGINAL.columns, ...ORIGINAL.terms.flat(), ...Object.values(ORIGINAL.rows).flat()];
  const missing = needles.filter((n) => !copy.text.includes(n));
  check(missing.length === 0, `copy: all ${needles.length} original strings present${missing.length ? ' — missing: ' + missing.join(' / ') : ''}`);

  // shell: scene, neighbour blocks, order
  const shell = await page.evaluate(() => {
    const scene = document.getElementById('scene-coordinates-2');
    return { scene: !!scene, h3: [...(scene?.querySelectorAll('h3') ?? [])].map((h) => h.textContent.replace(/\s+/g, ' ').trim()) };
  });
  check(shell.scene, 'shell: #scene-coordinates-2 present');
  const iUtm = shell.h3.findIndex((h) => h === 'היטל UTM');
  const iRef = shell.h3.indexOf('מערכות ייחוס');
  check(iUtm >= 0 && iRef === iUtm + 1 && iRef === shell.h3.length - 1, `shell: order ${shell.h3.join(' → ')}`);
  check(await page.evaluate((root) => !!document.querySelector(root).parentElement.nextElementSibling?.textContent.includes('סיכום: היטלים ומערכות קואורדינטות'), ROOT), 'shell: the summary follows the block');

  // palette: computed colours in the block
  const colours = await page.evaluate((root) => {
    const block = document.querySelector(root).parentElement;
    const seen = new Map();
    const parse = (v) => {
      const m = v.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      if (p.length === 4 && p[3] === 0) return null;
      return p.slice(0, 3).join(',');
    };
    for (const el of [block, ...block.querySelectorAll('*')]) {
      const cs = getComputedStyle(el);
      const props = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'fill', 'stroke', 'outlineColor'];
      for (const p of props) {
        if (p.startsWith('border') && parseFloat(cs[p.replace('Color', 'Width')]) === 0) continue;
        if (p === 'outlineColor' && cs.outlineStyle === 'none') continue;
        if ((p === 'fill' || p === 'stroke') && !(el instanceof SVGElement)) continue;
        const c = parse(cs[p]);
        if (c) seen.set(c, `${el.tagName.toLowerCase()}.${p}`);
      }
    }
    return [...seen.entries()];
  }, ROOT);
  const foreign = colours.filter(([c]) => !tokenRgb.includes(c));
  check(foreign.length === 0, `palette: ${colours.length} distinct colours, all tokens${foreign.length ? ' — foreign: ' + foreign.map(([c, w]) => `rgb(${c}) @ ${w}`).join('; ') : ''}`);

  // remaining shots
  await align(page, 0);
  await page.locator(`${ROOT}`).screenshot({ path: `${outDir}/07-card-after-reset.png` });
  await page.evaluate((root) => document.querySelector(root).parentElement.lastElementChild.scrollIntoView({ block: 'center', behavior: 'instant' }), ROOT);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/10-definitions.png` });

  check(errors.length === 0, `console/page errors: ${errors.join(' | ') || 'none'}`);
  await ctx.close();
}

// ── image blocked → fallback ───────────────────────────────────────────────
{
  const { ctx, page, errors } = await open({}, { blockImage: true });
  await page.waitForTimeout(800);
  const fb = await page.evaluate((root) => {
    const maps = [...document.querySelectorAll(`${root} [data-map]`)];
    return maps.map((m) => {
      const b = m.getBoundingClientRect();
      return { ratio: b.width / b.height, image: !!m.querySelector('[data-base-image]'), paper: !!m.querySelector('pattern') };
    });
  }, ROOT);
  check(fb.every((m) => Math.abs(m.ratio - 1.25) < 0.01 && m.paper), 'fallback: both maps keep 5:4 with the paper grid');
  check(fb.every((m) => !m.image), 'fallback: the failed image is dropped');
  let s = await state(page);
  expectReading(s, 'A', 'fallback opening');
  await page.locator(`${ROOT} [data-map="utm"] [data-pin="B"]`).click();
  await page.waitForTimeout(250);
  expectReading(await state(page), 'B', 'fallback pick');
  await page.mouse.move(5, 600);
  await page.screenshot({ path: `${outDir}/08-image-fallback.png` });
  const other = errors.filter((e) => !e.includes('linked-terrain-base'));
  check(other.length === 0, `fallback: no errors besides the blocked image${other.length ? ' — ' + other.join(' | ') : ''}`);
  await ctx.close();
}

// ── reduced motion ──────────────────────────────────────────────────────────
{
  const { ctx, page, errors } = await open({ reducedMotion: 'reduce' });
  const durations = await page.evaluate(
    (root) =>
      [...document.querySelectorAll(`${root} [data-ring], ${root} [data-field], ${root} [data-unit], ${root} [data-mode-panel]`)].map(
        (e) => {
          const cs = getComputedStyle(e);
          return cs.transitionProperty === 'none' || cs.transitionDuration.split(',').every((x) => parseFloat(x) === 0) ? 'off' : `${cs.transitionProperty} ${cs.transitionDuration}`;
        },
      ),
    ROOT,
  );
  check(durations.every((d) => d === 'off'), `reduced motion: no transitions (${[...new Set(durations)].join(' / ')})`);
  await page.locator(`${ROOT} [data-point-button="C"]`).click();
  const s = await state(page);
  expectReading(s, 'C', 'reduced motion → C (immediate)');
  await page.mouse.move(5, 600);
  await page.screenshot({ path: `${outDir}/09-reduced-motion-C.png` });
  check(errors.length === 0, `reduced motion: no errors`);
  await ctx.close();
}

await browser.close();
console.log(failures.length ? `\n${failures.length} FAILURE(S)` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
