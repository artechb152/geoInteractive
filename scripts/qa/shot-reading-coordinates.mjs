// Browser QA for topic-02 "כיצד מפרשים קואורדינטות?" (reading-coordinates/ReadingCoordinates.tsx), in the
// lesson: /lessons/topic-02/#scene-coordinates-2, the screen after the reference-systems map.
//
// Usage (a dev server):
//   QA_BASE=http://localhost:3000 node scripts/qa/shot-reading-coordinates.mjs [outDir]
// (`--lesson` is still accepted; the lesson is the only mode since the standalone review page was removed.)
//
// At 1440 × 1122, the card's top just under the site header; exit code 1 on any failure:
//   sequence   the screen right after the reference-systems map, before the summary; one heading
//   bridge     its readings are the map's bridge (A) exactly: ϕ / λ groups, E / N, zone and hemisphere
//   layout     the whole card (title → check) on screen in every state of the check, the tallest
//              feedback included; no horizontal overflow; each written reading on one line,
//              unclipped; geographic example at inline start (right)
//   copy       no external deck assumed; the note keeps "latitude and longitude are not a projection"
//   rtl        readings are LTR and their glyphs run left → right in written order; the screen is RTL
//   link       each key row marks exactly its glyphs (hover, focus, press) and fades the rest; a
//              pressed row stays marked; pressing again releases it; the WGS84 chip marks both captions
//   check      a wrong answer explains itself before any solution; ✕ on the wrong pick only; a new
//              pick clears the verdict; "הצגת הפתרון" only after a check; the solution marks the right
//              option; a right answer confirms; the many-choice question explains extra picks and hints
//              at missing ones; done; restart
//   keyboard   radio options follow RTL arrows; focus is visible; focus moves to the way forward
//   motion     reduced motion: no transition on the marks
//   text       lesson copy ≥ 16px at the reference scale
//   console    no page errors / console errors from this page's own code
import { chromium } from 'playwright';
import { mkdir, readdir, unlink } from 'node:fs/promises';

const BASE = process.env.QA_BASE || 'http://localhost:3000';
const outDir = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'design/screenshots/reading-coordinates-2026-10-26';
const URL = `${BASE}/lessons/topic-02/#scene-coordinates-2`;
const W = 1440;
const H = 1122;
const SCREEN = '[data-screen="reading-coordinates"]';
const MAP = '[data-activity="reference-systems"]';
const tag = process.env.QA_TAG || 'lesson';

await mkdir(outDir, { recursive: true });
for (const f of await readdir(outDir)) if (new RegExp(`^${tag}-\\d{2}-.*\\.png$`).test(f)) await unlink(`${outDir}/${f}`);

const failures = [];
const expect = (cond, m) => cond || failures.push(m);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const url = m.location()?.url ?? '';
  // other sessions' assets in the shared public/ may 404; only this screen's code counts
  if (/reading-coordinates|ReadingCoordinates|readingModel/.test(url) || !url) errors.push(m.text());
});

await page.goto(URL, { waitUntil: 'networkidle', timeout: 240000 });
await page.waitForSelector(SCREEN, { timeout: 120000 });
await page.waitForTimeout(1500);

let n = 0;
const shot = async (name, el) => {
  const file = `${outDir}/${tag}-${String(++n).padStart(2, '0')}-${name}.png`;
  await page.waitForTimeout(300); // let 200ms colour transitions land
  if (el) await page.locator(el).screenshot({ path: file });
  else await page.screenshot({ path: file });
  return file;
};
/** Scroll so the card's top sits 16px under the site header. */
const toCard = () =>
  page.evaluate((sel) => {
    const card = document.querySelector(`${sel} [data-reading-card]`);
    const headerH = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
    // the site scrolls smoothly; QA needs the final position at once
    window.scrollTo({ top: card.getBoundingClientRect().top + scrollY - headerH - 16, behavior: 'instant' });
  }, SCREEN);
/** The whole card under the header, in the state on screen now. */
const fits = async (label) => {
  await toCard();
  await page.waitForTimeout(150);
  const b = await page.evaluate((sel) => {
    const r = document.querySelector(`${sel} [data-reading-card]`).getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, header: document.querySelector('header')?.getBoundingClientRect().height ?? 0 };
  }, SCREEN);
  expect(b.top >= b.header && b.bottom <= H + 0.5, `${label}: card ${Math.round(b.top)}–${Math.round(b.bottom)} does not fit under the header in ${H}px`);
  return b;
};

/* ── sequence: after the map, before the summary; one heading ─────────────── */
const seq = await page.evaluate(
  ({ sel, map }) => {
    const screens = [...document.querySelectorAll('#scene-coordinates-2 [data-coordinates2-screen]')].map((e) => e.dataset.coordinates2Screen);
    const wrap = document.querySelector(sel).closest('[data-coordinates2-screen]');
    const n = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
    return {
      screens,
      inMapScreen: !!document.querySelector(map)?.closest('[data-coordinates2-screen="reference-systems"]'),
      headings: [...wrap.querySelectorAll('h1, h2, h3')].map((h) => n(h.textContent)),
      firstHeadingInCard: wrap.querySelector('h1, h2, h3')?.closest('[data-reading-card]') != null,
      text: n(wrap.textContent),
    };
  },
  { sel: SCREEN, map: MAP },
);
const at = seq.screens.indexOf('reading-coordinates');
expect(seq.inMapScreen && at > 0 && seq.screens[at - 1] === 'reference-systems' && seq.screens[at + 1] === 'summary', `sequence: ${seq.screens.join(' → ')}`);
expect(seq.headings.length === 1 && seq.headings[0] === 'כיצד מפרשים קואורדינטות?' && seq.firstHeadingInCard, `one heading, in the card: ${JSON.stringify(seq.headings)}`);
expect(!/מצגת/.test(seq.text), 'copy: the screen refers to a deck the learner does not have');
expect(seq.text.includes('רוחב ואורך אינם היטל'), 'copy: "latitude and longitude are not a projection" is missing');

/* ── bridge: the readings are point A of the map above ─────────────────────── */
{
  const strip = (t) => (t ?? '').replace(/[\s  ]+/g, '');
  const pickOnMap = async (method) => {
    await page.click(`${MAP} [data-method-button="${method}"]`);
    await page.click(`${MAP} [data-point-button="A"]`);
    await page.waitForTimeout(900); // the switch: out, swap, grid, lines, values
  };
  await pickOnMap('geo');
  const geo = await page.evaluate((map) => {
    const groups = (f) => [...document.querySelectorAll(`${map} [data-explain="geo"] [data-value="${f}"] [data-group]`)].map((d) => d.textContent.trim());
    return { lat: groups('lat'), lon: groups('lon') };
  }, MAP);
  await pickOnMap('utm');
  const utm = await page.evaluate((map) => {
    const v = (f) => document.querySelector(`${map} [data-explain="utm"] [data-value="${f}"]`)?.textContent ?? '';
    return { e: v('e'), n: v('n'), panel: document.querySelector(`${map} [data-explain="utm"]`)?.textContent ?? '' };
  }, MAP);
  await pickOnMap('geo'); // leave the map as the learner meets it
  await page.mouse.move(5, 5); // the pointer must not rest on a key row once the card scrolls under it
  const mine = await page.evaluate((sel) => [...document.querySelectorAll(`${sel} [data-reading] .sr-only`)].map((s) => s.textContent), SCREEN);
  const geoMap = `${geo.lat.join(' ')}, ${geo.lon.join(' ')}`.replace(/ /g, ' ');
  const zone = /פלח\s*36/.test(utm.panel) && /\(N\)/.test(utm.panel);
  expect(geo.lat.length === 4 && mine[0] === geoMap, `bridge: geographic reading ${JSON.stringify(mine[0])} ≠ map ${JSON.stringify(geoMap)}`);
  expect(zone && mine[1] === `36N E ${strip(utm.e)} N ${strip(utm.n)}`, `bridge: UTM reading ${JSON.stringify(mine[1])} ≠ map 36N E ${strip(utm.e)} N ${strip(utm.n)}`);
  console.log('bridge', JSON.stringify({ map: { geo: geoMap, e: strip(utm.e), n: strip(utm.n), zone }, screen: mine }));
}

/* ── layout ─────────────────────────────────────────────────────────────── */
await toCard();
await page.waitForTimeout(400);
const layout = await page.evaluate((sel) => {
  const root = document.querySelector(sel);
  const card = root.querySelector('[data-reading-card]').getBoundingClientRect();
  const headerH = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
  const fit = root.closest('[data-lesson-viewport-fit]');
  const readings = [...root.querySelectorAll('[data-reading]')].map((p) => {
    const lh = parseFloat(getComputedStyle(p).lineHeight);
    return { dir: getComputedStyle(p).direction, h: p.getBoundingClientRect().height, lh: lh * (p.getBoundingClientRect().height / p.offsetHeight || 1), clipped: p.scrollWidth > p.clientWidth + 1 };
  });
  const geo = root.querySelector('[data-example="geo"]').getBoundingClientRect();
  const utm = root.querySelector('[data-example="utm"]').getBoundingClientRect();
  // glyph order inside each reading
  const order = [...root.querySelectorAll('[data-reading]')].map((p) => {
    const spans = [...p.querySelectorAll(':scope > span[aria-hidden]')];
    return spans.every((s, i) => i === 0 || s.getBoundingClientRect().left >= spans[i - 1].getBoundingClientRect().left - 0.5);
  });
  // smallest visible text at reference scale
  const scale = fit ? Number(fit.dataset.fitScale) : 1;
  let minPx = Infinity;
  let minText = '';
  for (const el of root.querySelectorAll('p, span, button, h3, h4, li, figcaption')) {
    // the shared Button's md label is 15px by design (ui/Button.tsx); lesson copy is checked
    if (el.closest('.sr-only, [data-action], [data-focus="restart"]') || !el.textContent.trim() || el.children.length) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px < minPx) {
      minPx = px;
      minText = el.textContent.trim().slice(0, 30);
    }
  }
  return {
    scale,
    headerH,
    cardTop: card.top,
    cardBottom: card.bottom,
    cardH: card.height,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rootDir: getComputedStyle(root).direction,
    readings,
    order,
    geoRight: geo.left > utm.left,
    minPx,
    minText,
  };
}, SCREEN);
console.log('layout', JSON.stringify(layout));
expect(layout.overflowX <= 0, `horizontal overflow ${layout.overflowX}px`);
expect(layout.rootDir === 'rtl', 'screen is not RTL');
expect(layout.readings.length === 2 && layout.readings.every((r) => r.dir === 'ltr'), 'readings are not LTR');
expect(layout.readings.every((r) => !r.clipped), 'a reading is clipped');
expect(layout.readings.every((r) => r.h < r.lh * 1.6), `a reading wraps: ${JSON.stringify(layout.readings)}`);
expect(layout.order.every(Boolean), 'reading glyphs are not left → right in written order');
expect(layout.geoRight, 'geographic example is not at inline start (right)');
expect(layout.minPx >= 16, `text below 16px at reference: ${layout.minPx}px ("${layout.minText}")`);
expect(layout.cardBottom <= H + 0.5, `card does not fit under the header: bottom ${Math.round(layout.cardBottom)} > ${H}`);
await shot('opening');
await shot('card-opening', `${SCREEN} [data-reading-card]`);

/* ── link: rows ↔ glyphs ───────────────────────────────────────────────── */
const EXPECT = {
  lat: ['31', '°', '48', '′', '27.98', '″', 'N'],
  lon: ['35', '°', '07', '′', '28.83', '″', 'E'],
  dir: ['N', 'E'],
  units: ['°', '′', '″', '°', '′', '″'],
  zone: ['36'],
  hemi: ['N'],
  east: ['E', '701125'],
  north: ['N', '3521095'],
  metres: ['701125', '3521095'],
};
const marked = () =>
  page.evaluate((sel) => {
    const root = document.querySelector(sel);
    const on = [...root.querySelectorAll('[data-reading] [data-on]')].map((s) => s.textContent);
    const faded = [...root.querySelectorAll('[data-reading] > span[aria-hidden]')].filter((s) => !s.dataset.on && s.textContent !== ',' && getComputedStyle(s).opacity < 0.6).length;
    const total = [...root.querySelectorAll('[data-reading] > span[aria-hidden]')].filter((s) => !s.dataset.on && s.textContent !== ',').length;
    const datum = [...root.querySelectorAll('figcaption [data-glyph-part="datum"]')].map((s) => getComputedStyle(s).textDecorationLine.includes('underline'));
    return { on, faded, total, datum };
  }, SCREEN);
for (const [id, glyphs] of Object.entries(EXPECT)) {
  await page.hover(`${SCREEN} [data-key="${id}"]`);
  await page.waitForTimeout(260);
  const m = await marked();
  expect(JSON.stringify(m.on) === JSON.stringify(glyphs), `hover ${id}: marks ${JSON.stringify(m.on)}, expected ${JSON.stringify(glyphs)}`);
  expect(m.faded === m.total, `hover ${id}: ${m.total - m.faded} unmarked glyphs not faded`);
  if (id === 'dir') await shot('link-direction');
  if (id === 'hemi') await shot('link-hemisphere');
}
await page.mouse.move(5, 5);
await page.waitForTimeout(260);
expect((await marked()).on.length === 0, 'marks stay after the pointer leaves');
// press keeps; press again releases
await page.click(`${SCREEN} [data-key="units"]`);
await page.mouse.move(5, 5);
await page.waitForTimeout(260);
expect(JSON.stringify((await marked()).on) === JSON.stringify(EXPECT.units), 'a pressed row does not stay marked');
expect((await page.getAttribute(`${SCREEN} [data-key="units"]`, 'aria-pressed')) === 'true', 'pressed row lacks aria-pressed');
await shot('link-units-pressed');
await page.click(`${SCREEN} [data-key="units"]`);
await page.mouse.move(5, 5);
await page.locator(`${SCREEN} [data-key="units"]`).blur();
await page.waitForTimeout(260);
expect((await marked()).on.length === 0, 'pressing again does not release the mark');
// datum chip
await page.hover(`${SCREEN} [data-key="datum"]`);
await page.waitForTimeout(260);
{
  const m = await marked();
  expect(m.datum.length === 2 && m.datum.every(Boolean), 'the WGS84 chip does not mark both captions');
  expect(m.faded === m.total, 'the WGS84 chip does not fade the readings');
  await shot('link-datum');
}
await page.mouse.move(5, 5);
// keyboard focus marks too
await page.focus(`${SCREEN} [data-key="east"]`);
await page.keyboard.press('Tab');
await page.waitForTimeout(260);
{
  const m = await marked();
  expect(JSON.stringify(m.on) === JSON.stringify(EXPECT.north), `Tab to north: marks ${JSON.stringify(m.on)}`);
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
  expect(ring && ring !== 'none', 'focused key row has no visible ring');
}
await page.locator(`${SCREEN} [data-key="north"]`).blur();

/* ── check ─────────────────────────────────────────────────────────────── */
const C = `${SCREEN} [data-check]`;
const state = () =>
  page.evaluate((sel) => {
    const c = document.querySelector(sel);
    const fb = c.querySelector('[data-feedback]');
    return {
      q: c.dataset.check,
      feedback: fb?.dataset.feedback ?? null,
      text: fb?.textContent ?? '',
      notes: fb?.querySelectorAll('li').length ?? 0,
      reveal: !!c.querySelector('[data-action="reveal"]'),
      next: !!c.querySelector('[data-action="next"]'),
      checkDisabled: c.querySelector('[data-action="check"]')?.disabled ?? null,
      verdicts: Object.fromEntries([...c.querySelectorAll('[data-option]')].filter((o) => o.dataset.verdict).map((o) => [o.dataset.option, o.dataset.verdict])),
      checked: [...c.querySelectorAll('[data-option][aria-checked="true"]')].map((o) => o.dataset.option),
      status: c.querySelector('[data-verdict]')?.textContent ?? '',
      progress: c.querySelector('[data-progress]')?.textContent ?? '',
    };
  }, C);
const opt = (id) => page.click(`${C} [data-option="${id}"]`);
const press = (a) => page.click(`${C} [data-action="${a}"]`);

let s = await state();
expect(s.q === 'order' && s.progress.includes('1') && s.progress.includes('3'), `opens on question 1 of 3: ${JSON.stringify(s)}`);
expect(s.checkDisabled === true && !s.reveal && s.feedback === 'info' && s.text.includes('תשובה שגויה תקבל כאן הסבר'), 'before a pick: no check, no solution; the flow explained');
await fits('q1 open');
await shot('check-q1-open');
await opt('lon');
await press('check');
await page.waitForTimeout(200);
s = await state();
expect(s.feedback === 'wrong' && s.text.includes('אינה אות של אורך'), `q1 wrong: explanation missing (${s.text})`);
expect(!s.text.includes('דרומית לקו המשווה'), 'q1 wrong feedback gives the answer away');
expect(JSON.stringify(s.verdicts) === '{"lon":"wrong"}', `q1 wrong: marks ${JSON.stringify(s.verdicts)}`);
expect(s.reveal, 'q1 wrong: no "הצגת הפתרון" after the explaining feedback');
expect(s.status.startsWith('לא נכון'), 'q1 wrong: no status for screen readers');
await fits('q1 wrong');
await shot('check-q1-wrong-feedback');
await opt('zone');
s = await state();
expect(s.feedback === 'info' && Object.keys(s.verdicts).length === 0 && s.reveal, 'a new pick does not clear the verdict (or drops the solution offer)');
await press('check');
s = await state();
expect(s.feedback === 'wrong' && s.text.includes('קריאה גיאוגרפית'), 'q1 second wrong: explanation missing');
await fits('q1 second wrong');
await press('reveal');
await page.waitForTimeout(200);
s = await state();
expect(s.feedback === 'info' && s.text.startsWith('הפתרון'), `q1 reveal: ${s.text}`);
expect(JSON.stringify(s.verdicts) === '{"lat":"right"}' && JSON.stringify(s.checked) === '["lat"]', 'q1 reveal: right option not shown');
expect(s.next && !s.reveal, 'q1 reveal: no way forward');
expect(await page.evaluate(() => document.activeElement?.dataset.action === 'next'), 'focus does not move to the way forward');
await fits('q1 solution');
await shot('check-q1-solution');
await press('next');
await page.waitForTimeout(150);
// keyboard: radios follow RTL arrows (ArrowLeft = next in RTL)
await page.focus(`${C} [data-option="hemi"]`);
await page.keyboard.press('ArrowLeft');
s = await state();
expect(JSON.stringify(s.checked) === '["northing"]', `RTL arrow: ${JSON.stringify(s.checked)}`);
await press('check');
s = await state();
expect(s.feedback === 'wrong' && s.text.includes('ערך הצפון הוא המספר'), `q2 wrong: explanation missing (${s.text})`);
await fits('q2 wrong');
await page.focus(`${C} [data-option="northing"]`);
await page.keyboard.press('ArrowRight');
s = await state();
expect(JSON.stringify(s.checked) === '["hemi"]', `RTL arrow back: ${JSON.stringify(s.checked)}`);
await press('check');
s = await state();
expect(s.q === 'hemisphere' && s.feedback === 'right' && s.text.startsWith('נכון'), `q2 right: ${JSON.stringify(s)}`);
expect(!s.reveal && s.next, 'q2 right: solution offered after a right answer');
await fits('q2 right');
await shot('check-q2-right');
await press('next');
await opt('zone');
await opt('units');
await press('check');
s = await state();
expect(s.q === 'missing' && s.feedback === 'wrong', 'q3 wrong');
expect(s.text.includes('היחידות ידועות') && s.text.includes('מאיפה נמדד ערך הצפון') && s.text.includes('גוף ייחוס'), `q3 notes: ${s.text}`);
expect(JSON.stringify(s.verdicts) === '{"units":"wrong"}', `q3 marks only the wrong pick: ${JSON.stringify(s.verdicts)}`);
await fits('q3 wrong');
await shot('check-q3-wrong-feedback');
// the tallest feedback: both wrong options, all three right ones left out — five notes
await opt('zone');
await opt('order');
await press('check');
s = await state();
expect(s.feedback === 'wrong' && s.notes === 5 && JSON.stringify(s.verdicts) === '{"units":"wrong","order":"wrong"}', `q3 worst: ${s.notes} notes, ${JSON.stringify(s.verdicts)}`);
await fits('q3 worst (five notes)');
await shot('check-q3-worst-feedback');
await opt('units');
await opt('order');
await opt('zone');
await opt('hemi');
await opt('datum');
await press('check');
s = await state();
expect(s.feedback === 'right', 'q3 right');
await fits('q3 right');
await shot('check-q3-right');
await press('next');
s = await state();
expect(s.q === 'done' && s.feedback === 'right', 'done state');
await fits('done');
await shot('check-done');
await page.click(`${C} [data-focus="restart"]`);
s = await state();
expect(s.q === 'order' && s.feedback === 'info' && s.checked.length === 0 && !s.reveal && s.checkDisabled === true, 'restart');
expect(await page.evaluate(() => document.activeElement?.dataset.focus === 'option'), 'restart: focus does not return to the first option');
await fits('restart');
await shot('check-restart');

/* ── reduced motion ────────────────────────────────────────────────────── */
await page.emulateMedia({ reducedMotion: 'reduce' });
{
  const d = await page.evaluate((sel) => [...document.querySelectorAll(`${sel} [data-reading] > span[aria-hidden], ${sel} [data-key], ${sel} [data-option]`)].map((e) => getComputedStyle(e).transitionProperty), SCREEN);
  expect(d.every((x) => x === 'none'), `reduced motion keeps transitions: ${[...new Set(d)].join(' | ')}`);
}

expect(errors.length === 0, `console: ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
console.log(failures.length ? `FAIL (${failures.length})\n- ${failures.join('\n- ')}` : `PASS — ${n} shots in ${outDir}`);
process.exit(failures.length ? 1 : 0);
