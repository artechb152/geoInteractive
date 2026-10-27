// Browser QA for the topic-02 "מערכות ייחוס" activity (screen 1: one map, one method switch,
// an explanation panel) and its place before "כיצד מפרשים קואורדינטות?" (screen 2, an activity of
// its own — ./reading-coordinates, checked by shot-reading-coordinates.mjs), after
// design/mockups/topic-02-reference-systems-2026-10-11/claude-reference-systems-single-map.md, and
// the switch / spacing pass (task 21: same point, a different grid, units and numbers).
//
// Usage (dev server running; default http://localhost:3001, or QA_BASE=...):
//   node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-reference-systems.mjs [outDir]
//
// What it verifies (exit code 1 on any failure):
//   structure   one map; one switch above it; the three point buttons under it; no datum line in
//               the activity; screen 2 separate, after it (and still naming the datum, WGS84)
//   spacing     both control rows labelled, on the map's start edge, the same gap from the map; the
//               panel from the method row's top (geographic: to the point row's foot); card, map and
//               rows the same in all six states — nothing moves on a pick or a switch
//   fit         at 1440 × 1122, heading under the fixed header: the whole activity and its panel
//   six states  A / B / C × geographic / UTM: pin, anchor, feature outline, reading lines through
//               the exact pin tip, frame values at the lines' ends, the panel's name and reading;
//               geographic: captioned DMS groups, what ϕ / λ mean, both 0″–60″ bars (fixed range,
//               bridge kept as reference), the per-point sentence; UTM: full grouped values, metres,
//               zone meaning, why the numbers are large, the offset from the bridge
//   keeps       switching keeps the point, the terrain and the crop; picking keeps the method
//   switch      filmed frame by frame: one method on screen at a time (grid, lines, frame values,
//               panel); pin, anchor, name and map box never move; every visible number is a whole,
//               valid reading of the shown point — never part of one, never the other method's;
//               values only after the lines reach the frame; a quick run of switches swaps once,
//               to the last choice; reduced motion: the final state at once
//   carried     overlap, RTL order, motion / reduced motion, keyboard + focus, hover, icons,
//               registration, true-north arrow, palette, image fallback, scene terminology, errors
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { READINGS, NBSP, fx, fy } from '../../src/components/lessons/topic-02/reference-systems/referenceSystemsGeometry.ts';

const outDir = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'design/screenshots/reference-systems-2026-10-12';
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

const ROOT = '[data-activity="reference-systems"]';
const SCREEN2 = '[data-screen="reading-coordinates"]';
const IDS = ['A', 'B', 'C'];
const METHODS = ['geo', 'utm'];

// The brief's wording, verbatim.
const COPY = {
  heading: 'מערכות ייחוס',
  lead: 'אותו מקום יכול להיכתב בשיטות קואורדינטות שונות. החליפו שיטה ובחרו נקודה: המקום נשאר, והרשת, היחידות והמספרים משתנים.',
  names: { A: 'A · גשר', B: 'B · רכס', C: 'C · יישוב' },
  meaning: { lat: 'זווית צפונה או דרומה מקו המשווה. N מציין צפון.', lon: 'זווית מזרחה או מערבה מקו האורך של גריניץ׳. E מציין מזרח.' },
  captions: ['מעלות', 'דקות', 'שניות', 'כיוון'],
  minutes: 'דקות ושניות הן חלקים של מעלה, לא יחידות זמן: מעלה אחת מחולקת ל־60 דקות, ודקה אחת ל־60 שניות.',
  close: 'הנקודות קרובות זו לזו. לכן כאן המעלות והדקות נשארות זהות, והשינוי מופיע בשניות.',
  // task 21: no instruction (the lead gives it), no second "the change is in the seconds" (the notes say it)
  geoChangeTitle: 'השינוי בקריאה ביחס לגשר',
  geoFeedback: {
    A: 'הגשר הוא נקודת ההשוואה: אין שינוי ברוחב או באורך.',
    B: 'הרכס נמצא מצפון־מערב לגשר: הרוחב גדל והאורך קטן.',
    C: 'היישוב נמצא מדרום־מערב לגשר: הרוחב והאורך קטנים יותר.',
  },
  utmWhy: 'אלה ערכי מיקום ברשת רחבה, לא מרחקים משפת המפה. בפלח הצפוני, ערך הצפון נמדד ברשת מקו המשווה; לקו האורך המרכזי של הפלח ניתן ערך מזרח של 500,000 מטרים. לכן גם אזור קטן במפה יכול לקבל מספרי קואורדינטות גדולים.',
  offsetTitle: 'השינוי ברשת ביחס לגשר',
  offset: {
    A: 'הגשר הוא נקודת ההשוואה: אין שינוי במזרח או בצפון.',
    B: 'הרכס נמצא מצפון־מערב לגשר: 695 מטרים מערבה ו־385 מטרים צפונה ברשת.',
    C: 'היישוב נמצא מדרום־מערב לגשר: 555 מטרים מערבה ו־380 מטרים דרומה ברשת.',
  },
  zone: 'פלח 36 · חצי הכדור הצפוני (N)',
  announce: { A: 'נבחרה נקודה A, גשר', B: 'נבחרה נקודה B, רכס', C: 'נבחרה נקודה C, יישוב' },
  announceMethod: { geo: 'שיטה גיאוגרפית. נקודה B, רכס, נשארת במקומה.', utm: 'שיטה UTM. נקודה B, רכס, נשארת במקומה.' },
  rowLabels: ['שיטה:', 'נקודה:'],
};
const SCREEN2_HEADING = 'כיצד מפרשים קואורדינטות?';
// Earlier rounds' structure that must not come back into screen 1.
const RETIRED_SCREEN1 = ['דאטום', 'WGS84', 'המפה הימנית', 'המפה השמאלית', 'מימין', 'משמאל', 'שתי המפות'];
const SCENE_COPY = {
  present: [
    'וכיצד מציינים מיקום בשתי מערכות קואורדינטות מרכזיות: מערכת קואורדינטות גיאוגרפית ומערכת UTM.',
  ],
  retired: ['היטל גיאוגרפי', 'היטל GEO', 'שני ההיטלים המרכזיים', 'השילוב בין הדאטום להיטל', 'בלעדיה אי אפשר לפרש', 'שמשתמשת בהיטל גלילי'],
  summaryRef: 'מערכת ייחוס מגדירה כיצד לפרש קואורדינטות: הדאטום, הצירים והיחידות, ובמערכת מישורית גם ההיטל והפרמטרים שלו.',
};

// Token colours (tailwind.config.ts); #000 is text-black, #FDFBF3 is paper.bright.
const TOKENS = ['#F3E9DC', '#FFFFFF', '#F6EFE6', '#DCCDB2', '#ECE4D2', '#C9A56B', '#38432E', '#4A5240', '#8A8873', '#749C75', '#5B7C5C', '#D97E2B', '#E08A38', '#D69051', '#000000', '#FDFBF3'];
const tokenRgb = TOKENS.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(','));

const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
const dmsGroups = (d) => [`${d.deg}°`, `${String(d.min).padStart(2, '0')}′`, `${d.sec.toFixed(2).padStart(5, '0')}″`, d.hemi];
const expectedChosen = (m, id) => {
  const r = READINGS[id];
  return m === 'geo' ? { top: dmsGroups(r.lonDms).slice(0, 3).join(NBSP), right: dmsGroups(r.latDms).slice(0, 3).join(NBSP) } : { top: group(r.point.e), right: group(r.point.n) };
};

const browser = await chromium.launch({ channel: 'chrome' });

async function open(opts = {}, { blockImage = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));
  if (blockImage) await page.route('**/linked-terrain-base.webp', (r) => r.abort());
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 240000 });
  await page.waitForSelector(ROOT, { timeout: 90000 });
  if (!blockImage) await page.waitForFunction(() => document.querySelector('[data-base-image]')?.getBBox().width > 0);
  await align(page, COPY.heading);
  return { ctx, page, errors };
}

async function align(page, heading) {
  await page.evaluate((heading) => {
    const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    const h3 = [...document.querySelectorAll('#scene-coordinates-2 h3')].find((h) => h.textContent.trim() === heading);
    window.scrollTo({ top: h3.getBoundingClientRect().top + window.scrollY - header - 16, behavior: 'instant' });
  }, heading);
  await page.waitForTimeout(600);
}

/** Everything screen 1 shows, measured on the rendered page. */
const state = (page) =>
  page.evaluate(
    ({ root }) => {
      const r = document.querySelector(root);
      const n = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
      const keep = (t) => (t ?? '').replace(/[ \t\n]+/g, ' ').trim(); // keeps NBSP
      const onScreen = (el, x, y) => {
        const p = el.ownerSVGElement.createSVGPoint();
        p.x = x;
        p.y = y;
        return p.matrixTransform(el.getScreenCTM());
      };
      const screenLine = (poly) => [...poly.points].map((pt) => onScreen(poly, pt.x, pt.y));
      const distToLine = (pts, q) => {
        let best = Infinity;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1];
          const b = pts[i];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const t = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / (dx * dx + dy * dy)));
          best = Math.min(best, Math.hypot(a.x + t * dx - q.x, a.y + t * dy - q.y));
        }
        return best;
      };
      const cross = (pts, axis, c) => {
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1];
          const b = pts[i];
          if ((a[axis] - c) * (b[axis] - c) <= 0 && a[axis] !== b[axis]) {
            const t = (c - a[axis]) / (b[axis] - a[axis]);
            const o = axis === 'x' ? 'y' : 'x';
            return a[o] + t * (b[o] - a[o]);
          }
        }
        return null;
      };
      const map = r.querySelector('[data-map]');
      const mb = map.getBoundingClientRect();
      const dot = map.querySelector('[data-pin][data-active]')?.lastElementChild.getBoundingClientRect();
      const tip = dot && { x: dot.left + dot.width / 2, y: dot.top + dot.height / 2 };
      const lines = Object.fromEntries([...map.querySelectorAll('[data-reading-line]')].map((g) => [g.dataset.readingLine, screenLine(g.querySelector('polyline.stroke-accent'))]));
      const chosen = Object.fromEntries(
        [...map.querySelectorAll('[data-chosen-label]')].map((l) => {
          const b = l.getBoundingClientRect();
          return [l.dataset.chosenLabel, { text: keep(l.textContent), cx: b.left + b.width / 2, cy: b.top + b.height / 2, w: b.width, h: b.height }];
        }),
      );
      const panel = r.querySelector('[data-explain]');
      const reading = (f) => {
        const el = panel.querySelector(`[data-reading="${f}"]`);
        if (!el) return null;
        const groups = [...el.querySelectorAll('[data-value] dd')].map((d) => ({ text: keep(d.textContent), x: d.getBoundingClientRect().left, caption: n(d.parentElement.querySelector('dt').textContent) }));
        const bar = el.querySelector('[data-seconds-bar]');
        const tb = bar.querySelector('.rounded-full.bg-border').getBoundingClientRect();
        const marks = Object.fromEntries(
          [...bar.querySelectorAll('[data-bar-mark]')].map((m) => {
            const stem = m.lastElementChild.getBoundingClientRect();
            return [m.dataset.barMark, { at: +m.dataset.barAt, drawn: (stem.left + stem.width / 2 - tb.left) / tb.width }];
          }),
        );
        return {
          title: n(el.querySelector('h5').textContent),
          meaning: n(el.querySelector('[data-meaning]').textContent),
          groups,
          context: keep(bar.firstElementChild.textContent),
          ticks: [...bar.querySelectorAll('.text-fg-muted > span')].map((s) => ({ t: n(s.textContent), x: s.getBoundingClientRect().left })),
          marks,
        };
      };
      return {
        method: map.dataset.map,
        grid: map.querySelector('[data-grid]')?.dataset.grid,
        mapBox: [mb.left, mb.top + window.scrollY, mb.width, mb.height].map((v) => Math.round(v * 10) / 10),
        viewBox: map.querySelector('svg').getAttribute('viewBox'),
        pressedMethod: [...r.querySelectorAll('[data-method-button]')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.methodButton),
        pressed: [...r.querySelectorAll('[data-point-button]')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.pointButton),
        pins: [...map.querySelectorAll('[data-pin][data-active]')].map((p) => p.dataset.pin),
        previews: [...map.querySelectorAll('[data-pin][data-preview]')].map((p) => p.dataset.pin),
        anchor: map.querySelector('[data-anchor]')?.dataset.anchor,
        outline: map.querySelector('[data-feature-outline]')?.dataset.featureOutline,
        linesFor: map.querySelector('[data-reading-lines]')?.dataset.readingLines,
        tipToLine: tip ? Object.fromEntries(Object.entries(lines).map(([k, pts]) => [k, distToLine(pts, tip)])) : {},
        lineEnds: { top: lines.along && cross(lines.along, 'y', mb.top), right: lines.across && cross(lines.across, 'x', mb.right) },
        chosen,
        panelKind: panel.dataset.explain,
        feature: n(panel.querySelector('[data-feature]')?.textContent),
        feedback: n(panel.querySelector('[data-feedback]')?.textContent),
        lat: reading('lat'),
        lon: reading('lon'),
        notes: [...panel.querySelectorAll('[data-geo-notes] p')].map((p) => n(p.textContent)),
        utm: Object.fromEntries(
          [...panel.querySelectorAll('[data-utm-reading] [data-field]')].map((f) => [
            f.dataset.field,
            { label: n(f.querySelector('dt').textContent), value: keep(f.querySelector('[data-value]').textContent), unit: n(f.querySelector('[data-value]').nextElementSibling?.textContent) },
          ]),
        ),
        zone: n(panel.querySelector('[data-zone-meaning]')?.textContent),
        why: n(panel.querySelector('[data-utm-why]')?.textContent),
        offsetTitle: n(panel.querySelector('[data-change] h5')?.textContent),
        announce: n(r.querySelector('[data-announce]')?.textContent),
      };
    },
    { root: ROOT },
  );

function expectState(s, id, m, label) {
  const tag = `${label} [${m} · ${id}]`;
  check(s.method === m && s.grid === (m === 'geo' ? 'graticule' : 'utm') && s.pressedMethod.join() === m && s.panelKind === m, `${tag}: switch, grid and panel agree`);
  check(s.pressed.join() === id && s.pins.join() === id && s.anchor === id && s.outline === id && s.linesFor === id, `${tag}: button, pin, anchor, feature outline and reading lines on ${id}`);
  check(s.tipToLine.along < 1.5 && s.tipToLine.across < 1.5, `${tag}: both reading lines through the pin tip (${s.tipToLine.along?.toFixed(2)} / ${s.tipToLine.across?.toFixed(2)} px)`);
  const want = expectedChosen(m, id);
  check(
    s.chosen.top?.text === want.top && s.chosen.right?.text === want.right && Math.abs(s.chosen.top.cx - s.lineEnds.top) <= s.chosen.top.w / 2 - 2 && Math.abs(s.chosen.right.cy - s.lineEnds.right) <= s.chosen.right.h / 2,
    `${tag}: frame values "${want.top}" / "${want.right}" at the lines' ends`,
  );
  check(s.feature === COPY.names[id], `${tag}: panel names "${s.feature}"`);
  const r = READINGS[id];
  if (m === 'geo') {
    for (const [f, dms, title] of [['lat', r.latDms, 'רוחב ϕ'], ['lon', r.lonDms, 'אורך λ']]) {
      const x = s[f];
      const groups = dmsGroups(dms);
      check(x && x.title === title && x.meaning === COPY.meaning[f], `${tag}: ${title} — what it measures`);
      check(
        x.groups.map((g) => g.text).join('|') === groups.join('|') && x.groups.map((g) => g.caption).join('|') === COPY.captions.join('|') && x.groups.every((g, i) => i === 0 || g.x > x.groups[i - 1].x),
        `${tag}: ${title} ${groups.join(' ')} — each group captioned, left → right`,
      );
      const refAt = (f === 'lat' ? READINGS.A.latDms : READINGS.A.lonDms).sec / 60;
      const marks = x.marks;
      check(
        x.context === groups.slice(0, 2).join(NBSP) &&
          x.ticks.map((t) => t.t).join('|') === '0″|30″|60″' &&
          x.ticks[0].x < x.ticks[2].x &&
          Math.abs(marks[id].at - dms.sec / 60) < 1e-4 &&
          Math.abs(marks[id].drawn - dms.sec / 60) < 0.01 &&
          (id === 'A' ? Object.keys(marks).length === 1 : Math.abs(marks.A.drawn - refAt) < 0.01),
        `${tag}: ${title} bar — "${x.context.replaceAll(NBSP, ' ')}" + ${dms.sec.toFixed(2)}″ on a fixed 0″–60″${id === 'A' ? '' : ', the bridge kept as reference'}`,
      );
    }
    check(s.offsetTitle === COPY.geoChangeTitle && s.feedback === COPY.geoFeedback[id], `${tag}: "${COPY.geoChangeTitle}" — "${s.feedback.slice(0, 40)}…"`);
    check(s.notes.join('|') === `${COPY.minutes}|${COPY.close}`, `${tag}: minutes / seconds are parts of a degree; why only the seconds change`);
  } else {
    check(
      s.utm.e?.label === 'מזרח E' && s.utm.n?.label === 'צפון N' && s.utm.e.value === group(r.point.e) && s.utm.n.value === group(r.point.n) && s.utm.e.unit === 'מטרים' && s.utm.n.unit === 'מטרים',
      `${tag}: full values ${group(r.point.e).replaceAll(NBSP, ' ')} / ${group(r.point.n).replaceAll(NBSP, ' ')} m, grouped, nothing removed`,
    );
    check(s.zone === COPY.zone && s.why === COPY.utmWhy, `${tag}: zone meaning and why the numbers are large`);
    check(s.offsetTitle === COPY.offsetTitle && s.feedback === COPY.offset[id], `${tag}: "${COPY.offsetTitle}" — "${s.feedback.slice(0, 40)}…"`);
  }
}

const overlapReport = (page) =>
  page.evaluate((root) => {
    const out = [];
    const map = document.querySelector(`${root} [data-map]`);
    const mb = map.getBoundingClientRect();
    const items = [
      ...[...map.querySelectorAll('[data-map-label]')].map((e) => ({ name: `label ${e.textContent}`, b: e.getBoundingClientRect() })),
      ...['[data-north]', '[data-scale-bar]'].map((s) => ({ name: s, b: map.querySelector(s).getBoundingClientRect() })),
      ...[...map.querySelectorAll('[data-pin]')].map((e) => ({ name: `pin ${e.dataset.pin}`, b: e.firstElementChild.getBoundingClientRect() })),
    ];
    for (const it of items) if (it.b.left < mb.left - 0.5 || it.b.top < mb.top - 0.5 || it.b.right > mb.right + 0.5 || it.b.bottom > mb.bottom + 0.5) out.push(`${it.name} leaves the map`);
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i].b;
        const b = items[j].b;
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) out.push(`${items[i].name} × ${items[j].name}`);
      }
    const edge = { top: 0, right: 0 };
    for (const l of map.querySelectorAll('[data-map-label]')) edge[Math.abs(l.getBoundingClientRect().top - mb.top) < 12 ? 'top' : 'right']++;
    if (edge.top > 3 || edge.right > 3) out.push(`${edge.top} top / ${edge.right} right labels (max 3)`);
    // the bar marks: inside their bar, not on each other
    for (const bar of document.querySelectorAll(`${root} [data-seconds-bar]`)) {
      const bb = bar.getBoundingClientRect();
      const ms = [...bar.querySelectorAll('[data-bar-mark] > span:first-child')].map((e) => e.getBoundingClientRect());
      for (const b of ms) if (b.left < bb.left - 14 || b.right > bb.right + 14) out.push(`bar mark outside ${bar.dataset.secondsBar}`);
      if (ms.length === 2 && ms[0].left < ms[1].right && ms[1].left < ms[0].right) out.push(`bar marks overlap on ${bar.dataset.secondsBar}`);
    }
    for (const f of document.querySelectorAll(`${root} [data-explain] dd, ${root} [data-explain] dt, ${root} [data-explain] h4, ${root} [data-explain] h5`)) {
      if (f.scrollWidth > f.clientWidth + 1) out.push(`clipped "${f.textContent}"`);
    }
    return out;
  }, ROOT);

// The reveal rect ends 60 m past the view on each side (REVEAL_TO in the component). framer-motion
// writes its width as a CSS property (SVG 2 geometry), so it is read from the computed style.
const REVEAL_FULL_W = 2000 + 120;
const opacities = (page, ms) =>
  page.evaluate(
    ({ root, ms, full }) =>
      new Promise((res) =>
        setTimeout(() => {
          const r = document.querySelector(root);
          const op = (sel) => +getComputedStyle(r.querySelector(sel)).opacity;
          res({
            lines: op('[data-reading-lines]'),
            reveal: (parseFloat(getComputedStyle(r.querySelector('[data-reveal]')).width) || 0) / full,
            outline: op('[data-feature-outline]'),
            label: op('[data-chosen-label]'),
            sentence: op('[data-feedback]'),
          });
        }, ms),
      ),
    { root: ROOT, ms, full: REVEAL_FULL_W },
  );

/** Boxes that must not move between states: card, method row, map, point row (page coordinates). */
const boxes = (page) =>
  page.evaluate((root) => {
    const r = document.querySelector(root);
    const b = (el) => {
      const x = el.getBoundingClientRect();
      return [x.left, x.top + scrollY, x.width, x.height].map((v) => Math.round(v * 10) / 10).join();
    };
    return { card: b(r), method: b(r.querySelector('[data-method-switch]')), map: b(r.querySelector('[data-map]')), points: b(r.querySelector('[data-point-row]')) };
  }, ROOT);

/** Films the activity every animation frame for `ms`, clicking `clicks` ([ms, selector]) on the way —
    in-page, so the timing of a quick run of switches is exact. Each frame is read after it is painted
    (a task queued from requestAnimationFrame), so it records what was on screen — not a state some
    other frame callback is about to overwrite before the paint. */
const film = (page, ms, clicks = []) =>
  page.evaluate(
    ({ root, ms, clicks, full }) =>
      new Promise((res) => {
        const r = document.querySelector(root);
        const keep = (t) => (t ?? '').replace(/[ \t\n]+/g, ' ').trim();
        const op = (el) => {
          let o = 1;
          for (let e = el; e && e !== r.parentElement; e = e.parentElement) o *= +getComputedStyle(e).opacity;
          return Math.round(o * 1000) / 1000;
        };
        const frames = [];
        const t0 = performance.now();
        for (const [at, sel] of clicks) setTimeout(() => r.querySelector(sel).click(), at);
        const post = new MessageChannel();
        const tick = () => post.port2.postMessage(0);
        post.port1.onmessage = () => {
          const map = r.querySelector('[data-map]');
          const mb = map.getBoundingClientRect();
          const pin = map.querySelector('[data-pin][data-active]');
          const tip = pin?.lastElementChild.getBoundingClientRect();
          const body = r.querySelector('[data-explain-body]');
          frames.push({
            t: Math.round(performance.now() - t0),
            pressed: [...r.querySelectorAll('[data-method-button][aria-pressed="true"]')].map((b) => b.dataset.methodButton).join(),
            kind: map.dataset.map,
            map: [mb.left, mb.top, mb.width, mb.height].map((v) => Math.round(v * 10) / 10).join(),
            pin: pin ? `${pin.dataset.pin}@${Math.round(tip.left * 10) / 10},${Math.round(tip.top * 10) / 10}` : '',
            anchor: map.querySelector('[data-anchor]')?.dataset.anchor,
            name: keep(r.querySelector('[data-feature]')?.textContent),
            grids: [...map.querySelectorAll('[data-grid]')].map((g) => ({ kind: g.dataset.grid === 'graticule' ? 'geo' : 'utm', op: op(g) })),
            gridLabels: [...map.querySelectorAll('[data-grid-labels]')].map((g) => ({ kind: g.dataset.gridLabels, op: op(g) })),
            lines: [...map.querySelectorAll('[data-reading-lines]')].map((g) => ({
              kind: g.dataset.linesKind,
              id: g.dataset.readingLines,
              op: op(g),
              reveal: (parseFloat(getComputedStyle(g.querySelector('[data-reveal]')).width) || 0) / full,
            })),
            chosen: [...map.querySelectorAll('[data-chosen-label]')].map((l) => ({ text: keep(l.textContent), op: op(l) })),
            panel: body && { kind: body.dataset.explainBody, op: op(body) },
            values: body ? [...body.querySelectorAll('.inline-block')].map((v) => ({ text: keep(v.textContent), op: op(v) })) : [],
            context: [...r.querySelectorAll('[data-seconds-bar] > span:first-child')].map((c) => ({ text: keep(c.textContent), op: op(c) })),
            sentence: (() => {
              const p = r.querySelector('[data-feedback]');
              return p && { text: keep(p.textContent), op: op(p) };
            })(),
          });
          if (performance.now() - t0 < ms) requestAnimationFrame(tick);
          else {
            post.port1.close();
            res(frames);
          }
        };
        requestAnimationFrame(tick);
      }),
    { root: ROOT, ms, clicks, full: REVEAL_FULL_W },
  );

/** What a frame may show for the point `id`: per method, every whole value and sentence. */
const valid = (m, id) => {
  const r = READINGS[id];
  const chosen = expectedChosen(m, id);
  return {
    chosen: [chosen.top, chosen.right],
    values: m === 'geo' ? [...dmsGroups(r.latDms), ...dmsGroups(r.lonDms)] : [group(r.point.e), group(r.point.n)],
    context: m === 'geo' ? [dmsGroups(r.latDms).slice(0, 2).join(NBSP), dmsGroups(r.lonDms).slice(0, 2).join(NBSP)] : [],
    sentence: m === 'geo' ? COPY.geoFeedback[id] : COPY.offset[id],
  };
};

/** Checks one film: everything on screen at once is one method's; nothing that stays moves; every
    visible number is a whole, valid reading of `id`; values never before the lines reach the frame. */
function checkFilm(frames, id, label) {
  const bad = [];
  const first = frames[0];
  const VIS = 0.02;
  let swaps = 0;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const at = `${f.t} ms`;
    if (i && f.kind !== frames[i - 1].kind) swaps++;
    if (f.map !== first.map || f.pin !== first.pin || f.anchor !== id || f.name !== COPY.names[id]) bad.push(`${at}: map / pin / anchor / name moved`);
    const kinds = new Set([...f.grids, ...f.gridLabels, ...f.lines, f.panel].filter((x) => x && x.op > VIS).map((x) => x.kind));
    if (kinds.size > 1 || (kinds.size === 1 && !kinds.has(f.kind))) bad.push(`${at}: two methods on screen (${[...kinds].join(' + ')})`);
    if (f.grids.length !== 1 || f.lines.length !== 1 || f.lines[0].id !== id) bad.push(`${at}: ${f.grids.length} grids / ${f.lines.length} line sets`);
    const ok = valid(f.kind, id);
    for (const c of f.chosen) if (c.op > VIS && !ok.chosen.includes(c.text)) bad.push(`${at}: frame value "${c.text}" is not ${f.kind} · ${id}`);
    for (const v of f.values) if (v.op > VIS && !ok.values.includes(v.text)) bad.push(`${at}: panel value "${v.text}" is not ${f.kind} · ${id}`);
    for (const c of f.context) if (c.op > VIS && !ok.context.includes(c.text)) bad.push(`${at}: bar context "${c.text}" is not ${f.kind} · ${id}`);
    if (f.sentence && f.sentence.op > VIS && f.sentence.text !== ok.sentence) bad.push(`${at}: sentence of another point / method`);
    // whole readings only: every group of a reading (and its bar context) at one opacity
    const ops = [...f.values, ...f.context].map((v) => v.op);
    if (ops.length && Math.max(...ops) - Math.min(...ops) > 0.02) bad.push(`${at}: a reading shown in part (${ops.map((o) => o.toFixed(2)).join(' ')})`);
    // values follow the lines: none visible while the lines are still short of the frame
    const valuesOn = Math.max(0, ...f.chosen.map((c) => c.op), ...f.values.map((v) => v.op)) > VIS;
    if (valuesOn && f.lines[0] && f.lines[0].reveal < 0.8 && f.lines[0].op > VIS) bad.push(`${at}: values before the lines reach the frame (reveal ${f.lines[0].reveal.toFixed(2)})`);
  }
  const last = frames.at(-1);
  const settled = last.kind === last.pressed && last.panel?.op === 1 && last.chosen.every((c) => c.op === 1) && last.values.every((v) => v.op === 1) && last.lines[0]?.reveal >= 0.999;
  return { bad: [...new Set(bad)], swaps, settled, last };
}
const runningAnimations = (page) =>
  page.evaluate((root) => document.getAnimations().filter((a) => a.playState === 'running' && document.querySelector(root).contains(a.effect?.target)).length, ROOT);
const shot = async (page, name) => {
  await page.mouse.move(5, 600);
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${outDir}/${name}` });
};

// ── main run ───────────────────────────────────────────────────────────────
{
  const { ctx, page, errors } = await open();
  const btn = (id) => page.locator(`${ROOT} [data-point-button="${id}"]`);
  const pin = (id) => page.locator(`${ROOT} [data-pin="${id}"]`);
  const sw = (m) => page.locator(`${ROOT} [data-method-button="${m}"]`);

  // opening
  let s = await state(page);
  expectState(s, 'A', 'geo', 'opening');

  // structure + fit
  const layout = await page.evaluate(
    ({ root, screen2 }) => {
      const r = document.querySelector(root);
      const s2 = document.querySelector(screen2);
      const b = (el) => el.getBoundingClientRect();
      const n = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
      const map = r.querySelector('[data-map]');
      const switches = r.querySelectorAll('[data-method-switch]');
      const points = r.querySelector('[data-point-button]').parentElement;
      const header = document.querySelector('header').getBoundingClientRect().bottom;
      const h3 = r.parentElement.querySelector('h3');
      return {
        maps: r.querySelectorAll('[data-map]').length,
        switches: switches.length,
        switchAbove: b(switches[0]).bottom <= b(map).top,
        pointsBelow: b(points).top >= b(map).bottom,
        header,
        heading: b(h3).top,
        lead: n(h3.nextElementSibling.textContent),
        card: b(r).bottom,
        panel: b(r.querySelector('[data-explain]')).bottom,
        map: [b(map).width, b(map).height, b(map).bottom],
        vh: innerHeight,
        text: n(r.parentElement.textContent),
        inCard: r.querySelectorAll('table, [data-differences], [data-conclusion], [data-definitions]').length,
        s2After: !!s2 && !!(r.compareDocumentPosition(s2) & Node.DOCUMENT_POSITION_FOLLOWING) && !r.contains(s2),
        s2Datum: n(s2.textContent).includes('WGS84') && n(s2.textContent).includes('דאטום'),
        icons: [...r.parentElement.querySelectorAll('svg.lucide'), ...s2.querySelectorAll('svg')].length,
        stray: [...r.querySelectorAll('svg')].filter((v) => !v.closest('[data-map]')).length,
        ids: [...document.querySelectorAll('#scene-coordinates-2 [id]')].map((e) => e.id),
        h3: [...document.querySelectorAll('#scene-coordinates-2 h3')].map((h) => n(h.textContent)),
        live: [...r.querySelectorAll('[aria-live]')].map((e) => e.dataset.announce !== undefined),
      };
    },
    { root: ROOT, screen2: SCREEN2 },
  );
  console.log('     fit @1440×1122:', JSON.stringify({ heading: layout.heading, map: layout.map, panel: layout.panel, card: layout.card }));
  check(layout.maps === 1 && layout.switches === 1 && layout.switchAbove && layout.pointsBelow, 'structure: one map, one switch above it, the point buttons under it');
  check(layout.lead === COPY.lead && layout.heading >= layout.header, "structure: heading under the header, the brief's lead");
  check(layout.card <= layout.vh, `fit: the whole activity and its panel on one screen (card ends ${Math.round(layout.card)} / ${layout.vh}); map ${Math.round(layout.map[0])}×${Math.round(layout.map[1])}`);
  const back = RETIRED_SCREEN1.filter((t) => layout.text.includes(t));
  check(back.length === 0, `structure: no datum line, no two-map wording on screen 1${back.length ? ' — still there: ' + back.join(' / ') : ''}`);
  check(layout.inCard === 0 && layout.s2After && layout.s2Datum, 'screen 2: separate, after the card, still names the datum (WGS84)');
  const iUtm = layout.h3.indexOf('היטל UTM');
  const iRef = layout.h3.indexOf(COPY.heading);
  check(iUtm >= 0 && iRef > iUtm && layout.h3[iRef + 1] === SCREEN2_HEADING && layout.h3.length === iRef + 2, `shell: … היטל UTM … → ${layout.h3.slice(iRef).join(' → ')}, last`);
  check(layout.icons === 0 && layout.stray === 0, 'icons: none outside the map; no glyphs on screen 2');
  check(new Set(layout.ids).size === layout.ids.length, `a11y: ${layout.ids.length} ids in the scene, all unique`);
  check(layout.live.length === 1 && layout.live[0], 'a11y: one live region (the short pick / switch announcement); the panel is not live');

  // spacing: the two labelled control rows on the map's start (right) edge, one gap each side of
  // the map; the panel from the method row's top to the point row's foot (geographic)
  const rows = await page.evaluate((root) => {
    const r = document.querySelector(root);
    const b = (el) => el.getBoundingClientRect();
    const n = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
    const method = r.querySelector('[data-method-switch]').parentElement;
    const points = r.querySelector('[data-point-row]').parentElement;
    const map = b(r.querySelector('[data-map]'));
    const panel = b(r.querySelector('[data-explain]'));
    return {
      labels: [method, points].map((row) => n(row.firstElementChild.textContent)),
      rights: [b(method).right, map.right, b(points).right],
      gaps: [map.top - b(method).bottom, b(points).top - map.bottom],
      panelTop: panel.top - b(method).top,
      panelFoot: panel.bottom - b(points).bottom,
      panelGap: map.left - panel.right,
    };
  }, ROOT);
  check(
    rows.labels.join('|') === COPY.rowLabels.join('|') && Math.max(...rows.rights) - Math.min(...rows.rights) < 1,
    `spacing: "${rows.labels.join('" / "')}" rows on the map's start edge (${rows.rights.map((v) => v.toFixed(1)).join(' / ')})`,
  );
  check(Math.abs(rows.gaps[0] - rows.gaps[1]) < 1 && rows.gaps[0] > 8, `spacing: method row → map = map → point row (${rows.gaps.map((v) => v.toFixed(1)).join(' / ')} px)`);
  check(Math.abs(rows.panelTop) < 1 && Math.abs(rows.panelFoot) < 1, `spacing: geographic panel from the method row's top to the point row's foot (${rows.panelTop.toFixed(1)} / ${rows.panelFoot.toFixed(1)})`);
  const openingBoxes = await boxes(page);

  // registration + north (geographic opening)
  const reg = await page.evaluate((root) => {
    const m = document.querySelector(`${root} [data-map]`);
    const mb = m.getBoundingClientRect();
    return Object.fromEntries(
      [...m.querySelectorAll('[data-pin]')].map((p) => {
        const d = p.lastElementChild.getBoundingClientRect();
        return [p.dataset.pin, { fx: (d.left + d.width / 2 - mb.left) / mb.width, fy: (d.top + d.height / 2 - mb.top) / mb.height, w: mb.width }];
      }),
    );
  }, ROOT);
  for (const id of IDS) {
    const tol = 1.5 / reg[id].w;
    check(Math.abs(reg[id].fx - fx(READINGS[id].x)) < tol && Math.abs(reg[id].fy - fy(READINGS[id].y)) < (tol * 5) / 4, `register: ${id} pin tip on (${READINGS[id].x}, ${READINGS[id].y}) m`);
  }
  const northGeo = await page.evaluate((root) => {
    const m = document.querySelector(`${root} [data-map]`);
    const onScreen = (el, x, y) => {
      const p = el.ownerSVGElement.createSVGPoint();
      p.x = x;
      p.y = y;
      return p.matrixTransform(el.getScreenCTM());
    };
    const box = m.getBoundingClientRect();
    const mer = [...m.querySelectorAll('polyline[data-meridian]')]
      .map((el) => [onScreen(el, el.points[0].x, el.points[0].y), onScreen(el, el.points[el.points.length - 1].x, el.points[el.points.length - 1].y)])
      .sort((a, b) => Math.abs((a[0].x + a[1].x) / 2 - box.x - box.width / 2) - Math.abs((b[0].x + b[1].x) / 2 - box.x - box.width / 2))[0];
    const [lo, hi] = [mer[0], mer[1]].sort((p, q) => q.y - p.y);
    const t = new DOMMatrix(getComputedStyle(m.querySelector('[data-north-arrow]')).transform);
    return { meridian: (Math.atan2(hi.x - lo.x, lo.y - hi.y) * 180) / Math.PI, arrow: (Math.atan2(t.b, t.a) * 180) / Math.PI };
  }, ROOT);
  check(Math.abs(northGeo.arrow - northGeo.meridian) < 0.05 && northGeo.arrow < -1, `north: arrow ${northGeo.arrow.toFixed(2)}° = drawn meridian ${northGeo.meridian.toFixed(2)}° (true north, not grid north)`);

  // RTL: every number / letter isolated LTR and drawn left → right
  const rtl = await page.evaluate((root) => {
    const r = document.querySelector(root);
    const order = (el) => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (w.nextNode()) if (w.currentNode.textContent.trim()) nodes.push(w.currentNode);
      const range = document.createRange();
      range.setStart(nodes[0], 0);
      range.setEnd(nodes[0], 1);
      const a = range.getBoundingClientRect();
      const last = nodes.at(-1);
      range.setStart(last, last.length - 1);
      range.setEnd(last, last.length);
      return a.left < range.getBoundingClientRect().left;
    };
    return [...r.querySelectorAll('[data-explain] bdi[dir="ltr"], [data-seconds-bar] > span')].map((el) => ({ name: el.textContent, ok: getComputedStyle(el).direction === 'ltr' && (el.textContent.trim().length < 2 || order(el)) }));
  }, ROOT);
  const badRtl = rtl.filter((x) => !x.ok).map((x) => x.name);
  check(rtl.length >= 4 && badRtl.length === 0, `rtl: ${rtl.length} numbers / letters isolated LTR, in order${badRtl.length ? ' — bad: ' + badRtl.join(', ') : ''}`);

  // motion on a pick: the lines grow out of the new point; the numbers wait for them; the final state stays
  await btn('B').click();
  const early = await opacities(page, 40);
  const late = await opacities(page, 450);
  check(
    early.lines === 1 && early.reveal < 0.95 && early.outline < 0.9 && early.label < 0.5 && early.sentence < 0.5,
    `motion: pick B — lines growing from the point (${early.reveal.toFixed(2)} of the way), outline fading in, numbers and sentence not yet (${early.label.toFixed(2)} / ${early.sentence.toFixed(2)} at 40 ms)`,
  );
  check(Object.values(late).every((v) => v === 1), 'motion: final state fully shown by 450 ms and kept');
  await page.waitForTimeout(800);
  check((await runningAnimations(page)) === 0, 'motion: nothing still animating (no loop)');
  check((await state(page)).announce === COPY.announce.B, 'a11y: one short announcement per pick');

  // the switch, filmed: geographic → UTM → geographic with B kept
  for (const [m, from] of [['utm', 'geo'], ['geo', 'utm']]) {
    const frames = await film(page, 900, [[30, `[data-method-button="${m}"]`]]);
    const f = checkFilm(frames, 'B', `switch ${from} → ${m}`);
    const swapAt = frames.find((x) => x.kind === m)?.t ?? NaN;
    const valuesAt = frames.find((x) => x.kind === m && x.chosen.some((c) => c.op > 0.02))?.t ?? NaN;
    const out = frames.filter((x) => x.kind === from && x.pressed === m).map((x) => x.panel.op);
    check(f.bad.length === 0, `switch ${from} → ${m}: one method on screen at a time; pin, map and name still; every number a whole ${'B'} reading${f.bad.length ? ' — ' + f.bad.slice(0, 4).join('; ') : ''}`);
    check(f.swaps === 1 && f.settled, `switch ${from} → ${m}: swapped once, settled on ${f.last.kind} (${frames.length} frames)`);
    check(
      out.length > 2 && out.every((o, i) => i === 0 || o <= out[i - 1] + 0.001) && swapAt > 100 && swapAt < 260 && valuesAt - swapAt >= 100,
      `switch ${from} → ${m}: ${from} leaves first (${out.length} frames, ${out.map((o) => o.toFixed(2)).join(" ")}), swap at ${swapAt} ms, numbers at ${valuesAt} ms`,
    );
    check((await state(page)).announce === COPY.announceMethod[m], `a11y: the switch is announced — "${COPY.announceMethod[m]}"`);
  }

  // a quick run of switches (every 40 ms, ending on UTM): one swap, to the last choice, never a mix
  {
    const run = ['utm', 'geo', 'utm', 'geo', 'utm'].map((m, i) => [30 + i * 40, `[data-method-button="${m}"]`]);
    const frames = await film(page, 1100, run);
    const f = checkFilm(frames, 'B', 'quick switches');
    const kinds = frames.map((x) => x.kind).filter((k, i, a) => i === 0 || k !== a[i - 1]);
    check(f.bad.length === 0, `quick switches: never a mix, never a partial or foreign number${f.bad.length ? ' — ' + f.bad.slice(0, 4).join('; ') : ''}`);
    check(kinds.join(' → ') === 'geo → utm' && f.settled && f.last.pressed === 'utm', `quick switches: shown ${kinds.join(' → ')}, settled on the last choice (UTM)`);
    // and back to the geographic method for the six states below
    await sw('geo').click();
    await page.waitForTimeout(700);
  }

  // mid-switch frames for the report (geographic → UTM, C): the old method leaving, the lines
  // growing from the unmoved point, the numbers arriving
  await btn('C').click();
  await page.waitForTimeout(700);
  for (const [ms, name] of [[90, 'r5-11-switch-to-utm-C-leaving'], [230, 'r5-12-switch-to-utm-C-lines'], [600, 'r5-13-switch-to-utm-C-settled']]) {
    await sw('geo').click();
    await page.waitForTimeout(700);
    await page.evaluate((root) => document.querySelector(`${root} [data-method-button="utm"]`).click(), ROOT);
    await page.waitForTimeout(ms);
    await page.screenshot({ path: `${outDir}/${name}.png` });
  }
  await sw('geo').click();
  await btn('B').click();
  await page.waitForTimeout(700);

  // the six states, picking from the map pins and from the buttons; switching keeps the point
  const before = await state(page);
  for (const m of METHODS) {
    const kept = (await state(page)).pressed.join();
    await sw(m).click();
    await page.waitForTimeout(600);
    s = await state(page);
    check(s.pressed.join() === kept && s.viewBox === before.viewBox && s.mapBox.join() === before.mapBox.join(), `switch → ${m}: point ${kept}, terrain crop and map box unchanged`);
    for (const [id, how] of [['A', 'pin'], ['B', 'button'], ['C', 'pin']]) {
      await (how === 'pin' ? pin(id) : btn(id)).click();
      await page.waitForTimeout(450);
      s = await state(page);
      expectState(s, id, m, `${how} → ${id}`);
      check(s.method === m, `${m} · ${id}: picking keeps the method`);
      const ov = await overlapReport(page);
      check(ov.length === 0, `overlap, ${m} · ${id}: ${ov.join('; ') || 'none'}`);
      const bx = await boxes(page);
      const moved = Object.keys(bx).filter((k) => bx[k] !== openingBoxes[k]);
      check(moved.length === 0, `no shift, ${m} · ${id}: card, method row, map and point row where they opened${moved.length ? ' — moved: ' + moved.join(', ') : ''}`);
      if (m === 'utm') {
        const p = await page.evaluate((root) => {
          const r = document.querySelector(root);
          const b = (sel) => r.querySelector(sel).getBoundingClientRect();
          return { top: b('[data-explain]').top - b('[data-method-switch]').top, foot: b('[data-point-row]').top - b('[data-explain]').bottom };
        }, ROOT);
        check(Math.abs(p.top) < 1 && p.foot > 0, `spacing, utm · ${id}: panel from the method row's top, as tall as its content (${p.foot.toFixed(0)} px clear of the point row)`);
      }
      await align(page, COPY.heading);
      await shot(page, `r5-0${IDS.indexOf(id) + (m === 'geo' ? 1 : 4)}-${m === 'geo' ? 'geographic' : 'utm'}-${id}.png`);
    }
  }
  // UTM north: the arrow still true north on the straight grid
  const northUtm = await page.evaluate((root) => {
    const t = new DOMMatrix(getComputedStyle(document.querySelector(`${root} [data-north-arrow]`)).transform);
    return (Math.atan2(t.b, t.a) * 180) / Math.PI;
  }, ROOT);
  check(Math.abs(northUtm - northGeo.meridian) < 0.05, `north: UTM map arrow ${northUtm.toFixed(2)}° — true north, not the grid's 0°`);

  // hover highlights only
  await sw('geo').click();
  await btn('A').click();
  await page.waitForTimeout(400);
  const hb = await state(page);
  await pin('C').hover();
  await page.waitForTimeout(300);
  s = await state(page);
  check(
    s.previews.join() === 'C' && s.pins.join() === 'A' && s.linesFor === 'A' && s.feedback === hb.feedback && JSON.stringify(s.lat.marks) === JSON.stringify(hb.lat.marks),
    'hover C: highlighted only; lines, readings, bars and sentence stay on A',
  );
  await page.mouse.move(5, 600);
  await page.waitForTimeout(300);
  check((await state(page)).previews.length === 0, 'hover out: no highlight left');

  // keyboard: switch then points in the tab order, visible focus, Enter / Space
  await sw('geo').focus();
  await page.keyboard.press('Tab');
  let f = await page.evaluate(() => ({ m: document.activeElement?.dataset.methodButton, ring: getComputedStyle(document.activeElement).boxShadow, visible: document.activeElement?.matches(':focus-visible') }));
  check(f.m === 'utm' && f.visible && /217, 126, 43/.test(f.ring), 'keyboard: Tab geographic → UTM, visible accent focus ring');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
  s = await state(page);
  check(s.method === 'utm' && s.pressed.join() === 'A', 'keyboard: Enter switches to UTM, A kept');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  f = await page.evaluate(() => ({ id: document.activeElement?.dataset.pointButton, visible: document.activeElement?.matches(':focus-visible') }));
  check(f.id === 'B' && f.visible, 'keyboard: then the point buttons under the map (A → B)');
  await page.keyboard.press('Space');
  await page.waitForTimeout(350);
  s = await state(page);
  check(s.pressed.join() === 'B' && s.method === 'utm', 'keyboard: Space selects B, UTM kept');
  await page.screenshot({ path: `${outDir}/r5-08-keyboard-focus-B-utm.png` });

  // scene terminology (round 2)
  const scene = await page.evaluate(() => {
    const el = document.getElementById('scene-coordinates-2');
    const n = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
    const sum = [...el.querySelectorAll('div')].find((d) => d.textContent.trim() === 'סיכום: היטלים ומערכות קואורדינטות');
    return { text: n(el.textContent), summary: [...(sum?.nextElementSibling?.querySelectorAll('li') ?? [])].map((li) => n(li.lastElementChild.textContent)) };
  });
  for (const t of SCENE_COPY.present) check(scene.text.includes(t), `scene copy: "${t.slice(0, 52)}…"`);
  const sceneBack = SCENE_COPY.retired.filter((t) => scene.text.includes(t));
  check(sceneBack.length === 0 && scene.summary[3] === SCENE_COPY.summaryRef, `scene copy: retired terminology gone; summary item 4 kept${sceneBack.length ? ' — ' + sceneBack.join(' / ') : ''}`);

  // palette, both screens, in both methods
  const coloursIn = () =>
    page.evaluate(
      ({ root, screen2 }) => {
        const seen = new Map();
        const parse = (v) => {
          const m = v.match(/rgba?\(([^)]+)\)/);
          if (!m) return null;
          const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
          if (p.length === 4 && p[3] === 0) return null;
          return p.slice(0, 3).join(',');
        };
        for (const scope of [document.querySelector(root).parentElement, document.querySelector(screen2)])
          for (const el of [scope, ...scope.querySelectorAll('*')]) {
            const cs = getComputedStyle(el);
            for (const p of ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'fill', 'stroke', 'outlineColor']) {
              if (p.startsWith('border') && parseFloat(cs[p.replace('Color', 'Width')]) === 0) continue;
              if (p === 'outlineColor' && cs.outlineStyle === 'none') continue;
              if ((p === 'fill' || p === 'stroke') && !(el instanceof SVGElement)) continue;
              const c = parse(cs[p]);
              if (c) seen.set(c, `${el.tagName.toLowerCase()}.${p}`);
            }
          }
        return [...seen.entries()];
      },
      { root: ROOT, screen2: SCREEN2 },
    );
  const utmColours = await coloursIn();
  await sw('geo').click();
  await btn('C').click();
  await page.waitForTimeout(400);
  const colours = [...utmColours, ...(await coloursIn())];
  const foreign = colours.filter(([c]) => !tokenRgb.includes(c));
  check(foreign.length === 0, `palette: all tokens in both methods${foreign.length ? ' — foreign: ' + foreign.map(([c, w]) => `rgb(${c}) @ ${w}`).join('; ') : ''}`);

  await align(page, SCREEN2_HEADING);
  await shot(page, 'r5-07-screen2-reading-coordinates.png');
  check(errors.length === 0, `console/page errors: ${errors.join(' | ') || 'none'}`);
  await ctx.close();
}

// ── image blocked → fallback ───────────────────────────────────────────────
{
  const { ctx, page, errors } = await open({}, { blockImage: true });
  await page.waitForTimeout(800);
  const fb = await page.evaluate((root) => {
    const m = document.querySelector(`${root} [data-map]`);
    const b = m.getBoundingClientRect();
    return { ratio: b.width / b.height, image: !!m.querySelector('[data-base-image]'), paper: !!m.querySelector('pattern') };
  }, ROOT);
  check(Math.abs(fb.ratio - 1.25) < 0.01 && fb.paper && !fb.image, 'fallback: 5:4 with the paper grid, the failed image dropped');
  await page.locator(`${ROOT} [data-method-button="utm"]`).click();
  await page.locator(`${ROOT} [data-pin="B"]`).click();
  await page.waitForTimeout(450);
  expectState(await state(page), 'B', 'utm', 'fallback');
  await shot(page, 'r5-09-image-fallback-utm-B.png');
  const other = errors.filter((e) => !e.includes('linked-terrain-base'));
  check(other.length === 0, `fallback: no errors besides the blocked image${other.length ? ' — ' + other.join(' | ') : ''}`);
  await ctx.close();
}

// ── reduced motion ──────────────────────────────────────────────────────────
{
  const { ctx, page, errors } = await open({ reducedMotion: 'reduce' });
  await page.locator(`${ROOT} [data-point-button="C"]`).click();
  const at30 = await opacities(page, 30);
  check(Object.values(at30).every((v) => v === 1), 'reduced motion: lines, outline, frame value and sentence at the final state immediately');
  const barTransition = await page.evaluate((root) => getComputedStyle(document.querySelector(`${root} [data-bar-mark]`)).transitionDuration, ROOT);
  check(barTransition.split(',').every((d) => parseFloat(d) === 0), `reduced motion: bar marks jump, no slide (${barTransition})`);
  expectState(await state(page), 'C', 'geo', 'reduced motion');
  check((await runningAnimations(page)) === 0, 'reduced motion: no running animations');
  await shot(page, 'r5-10-reduced-motion-geographic-C.png');
  // a switch is the final state at once: no leaving, no growing lines, no waiting numbers
  const frames = await film(page, 300, [[20, '[data-method-button="utm"]']]);
  const f = checkFilm(frames, 'C', 'reduced motion switch');
  const after = frames.filter((x) => x.pressed === 'utm');
  check(
    f.bad.length === 0 && after.length > 0 && after.every((x) => x.kind === 'utm' && x.panel.op === 1 && x.lines[0].reveal >= 0.999 && x.chosen.every((c) => c.op === 1) && x.values.every((v) => v.op === 1)),
    `reduced motion: a switch shows the final UTM state on its first frame${f.bad.length ? ' — ' + f.bad.slice(0, 3).join('; ') : ''}`,
  );
  check((await runningAnimations(page)) === 0, 'reduced motion: no running animations after a switch');
  check(errors.length === 0, `reduced motion: no errors${errors.length ? ' — ' + errors.join(' | ') : ''}`);
  await ctx.close();
}

await browser.close();
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
