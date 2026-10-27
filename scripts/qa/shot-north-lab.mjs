// QA for the lesson-6 "שלושה סוגי צפון" reference lab (PrinciplesScene → NorthLab).
//
// Usage (dev server running; default http://localhost:3000):
//   node scripts/qa/shot-north-lab.mjs [outDir] [--base=http://localhost:3000]
//
// Checks (exit code 1 on any failure):
//   copy        title, intro, tab label, the chosen north's definition / use / caveat, the slider's
//               definition and the "במעבר" note are on screen verbatim; the removed duplicates are gone;
//               each explanation appears once
//   opening     magnetic selected, declination −6°, reading 072°, table 066° / 064° / 072°, arc starts at MN,
//               relation line "6° מערבה … גדול ב־6°"
//   choice      true → 066°, grid → 064°; the arc starts at the chosen north; A, B and the slider stay put;
//               the tab panel and the relation line follow; the card height and the reading's position do not change
//   slider      at −10 / −6 / 0 / +2 / +10: MN angle = declination, the magnetic row = 66 − d, the relation
//               line names the side; with true chosen the reading and its line stay; Shift + → adds 5°
//   map labels  Hebrew names as in the tabs (no TN / GN / MN); values only on the main map, names only in
//               the inset; every label's text inside its plate
//   fit         at 1440 × 1122, with the card's top under the site header, the whole card is on screen in
//               every checked state; the controls column ends with the map; no HTML text under 14 px
//               (reference size), and only the slider's scale marks and the reset label under 16 px
//   tabs        roving tabindex; ← next, → previous, Home / End; Tab order tabs → panel → slider → reset
//   reset       back to magnetic / −6°, focus stays on the button
//   overlap     no two map labels overlap and every map text stays inside the map, at every checked state
//   reduced     under prefers-reduced-motion the arc, reading, relation line and panel change immediately
//   console     no page errors
// Screenshots (1440 × 1122, card under the site header): opening, true, grid, −10°, 0°, +2°, +10°, reduced motion.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'design/screenshots/north-lab';
const BASE = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7);
const URL = `${BASE}/lessons/topic-06/`;
await mkdir(outDir, { recursive: true });

const failures = [];
const fail = (m) => {
  failures.push(m);
  console.log('FAIL', m);
};
const ok = (m) => console.log('ok  ', m);
const check = (cond, m) => (cond ? ok(m) : fail(m));
const SEL = '[data-activity="north-lab"]';

const REL = {
  true: 'זה הבסיס להשוואה: הזוויות שעל החצים במפה נמדדות ממנו.',
  grid: 'בדוגמה, צפון הרשת נוטה 2° מזרחה מהצפון האמיתי, ולכן האזימוט קטן ב־2°.',
  magnetic: (d) =>
    d === 0
      ? 'בדוגמה, הצפון המגנטי חופף לצפון האמיתי, ולכן האזימוט זהה.'
      : d < 0
        ? `בדוגמה, הצפון המגנטי נוטה ${-d}° מערבה מהצפון האמיתי, ולכן האזימוט גדול ב־${-d}°.`
        : `בדוגמה, הצפון המגנטי נוטה ${d}° מזרחה מהצפון האמיתי, ולכן האזימוט קטן ב־${d}°.`,
};

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
    const img = document.querySelector('[data-ring-body]');
    return img && img.getBBox().width > 0;
  });
  await align(page);
  return { ctx, page, errors };
}

/** Card top just under the site header (instant: the site scrolls smoothly). */
async function align(page) {
  await page.evaluate((sel) => {
    const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    const el = document.querySelector(sel);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header - 8, behavior: 'instant' });
  }, SEL);
  await page.waitForTimeout(700);
}

const state = (page) =>
  page.evaluate((sel) => {
    const root = document.querySelector(sel);
    const q = (s) => root.querySelector(s);
    const pt = (n) => {
      const c = q(`[data-point="${n}"]`);
      return { x: +c.getAttribute('cx'), y: +c.getAttribute('cy') };
    };
    const rect = (el) => {
      const b = el.getBoundingClientRect();
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), height: Math.round(b.height) };
    };
    // the visible panel content is the last child (the stacked invisible copies only reserve height)
    const panel = q('[data-info]');
    return {
      reading: q('[data-readout="reading"]').textContent.trim(),
      readingLabel: q('[data-reading] p').textContent.trim(),
      relation: q('[data-relation]').textContent.trim(),
      declination: q('[data-readout="declination"]').textContent.trim(),
      rows: Object.fromEntries([...root.querySelectorAll('[data-value]')].map((td) => [td.dataset.value, td.textContent.trim()])),
      activeRow: root.querySelector('tr[aria-current="true"]')?.dataset.row,
      selectedTab: root.querySelector('[role="tab"][aria-selected="true"]')?.dataset.north,
      tabIndexes: [...root.querySelectorAll('[role="tab"]')].map((t) => t.tabIndex),
      arcFrom: +q('[data-arc-from]').dataset.arcFrom,
      arrows: Object.fromEntries([...root.querySelectorAll('[data-arrow]')].map((g) => [g.dataset.arrow, +g.dataset.angle])),
      selectedArrow: q('[data-arrow][data-selected]')?.dataset.arrow,
      lastArrow: [...root.querySelectorAll('[data-arrow]')].at(-1)?.dataset.arrow,
      labels: Object.fromEntries([...root.querySelectorAll('g[data-label]:not([data-label="arc"])')].map((g) => [g.dataset.label, [...g.querySelectorAll('text')].map((t) => t.textContent.trim())])),
      insetLabels: Object.fromEntries([...root.querySelectorAll('[data-inset-label]')].map((g) => [g.dataset.insetLabel, [...g.querySelectorAll('text')].map((t) => t.textContent.trim())])),
      info: panel.dataset.info,
      panelText: panel.lastElementChild.innerText.replace(/\s+/g, ' ').trim(),
      slider: +q('input[type="range"]').value,
      valuetext: q('input[type="range"]').getAttribute('aria-valuetext'),
      A: pt('A'),
      B: pt('B'),
      cardH: Math.round(root.getBoundingClientRect().height),
      card: rect(root),
      controls: rect(q('[data-controls]')),
      map: rect(q('[data-north-lab-map]')),
      readingBox: rect(q('[data-reading]')),
      header: Math.round(document.querySelector('header')?.getBoundingClientRect().bottom ?? 0),
      vh: innerHeight,
    };
  }, SEL);

/** Label overlap + containment in the live map layer (each label group is one box). */
const overlaps = (page) =>
  page.evaluate((sel) => {
    const svg = document.querySelector(`${sel} [data-map]`);
    const mapBox = svg.getBoundingClientRect();
    const groups = [...svg.querySelectorAll('[data-label], [data-inset-label]')].map((g) => ({
      name: g.dataset.label ?? `inset-${g.dataset.insetLabel}`,
      r: [...g.querySelectorAll('text')].map((t) => t.getBoundingClientRect()).reduce((a, b) => ({
        left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom),
      })),
    }));
    const texts = [...svg.querySelectorAll('text')].map((t) => t.getBoundingClientRect());
    const bad = [];
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const a = groups[i].r;
        const b = groups[j].r;
        if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) bad.push(`${groups[i].name}×${groups[j].name}`);
      }
    }
    const outside = texts.filter((r) => r.left < mapBox.left || r.right > mapBox.right || r.top < mapBox.top || r.bottom > mapBox.bottom).length;
    // each main-map label's text inside its paper plate (the plate is the group's rect)
    const offPlate = [...svg.querySelectorAll('g[data-label]')]
      .filter((g) => {
        const plate = g.querySelector('rect')?.getBoundingClientRect();
        return plate && [...g.querySelectorAll('text')].some((t) => {
          const r = t.getBoundingClientRect();
          return r.left < plate.left - 0.5 || r.right > plate.right + 0.5;
        });
      })
      .map((g) => g.dataset.label);
    return { bad, outside, offPlate };
  }, SEL);

const slider = (page) => page.locator(`${SEL} input[type="range"]`);
async function setDeclination(page, d) {
  const s = slider(page);
  await s.focus();
  await s.press('Home');
  for (let i = -10; i < d; i++) await s.press('ArrowRight');
  await page.waitForTimeout(900); // spring settles
}
const tab = (page, id) => page.locator(`${SEL} [role="tab"][data-north="${id}"]`);
const shot = (page, name) => page.screenshot({ path: `${outDir}/${name}.png` });
/** Wait (≤ 4 s) until the arc start rests on `v` — robust to a busy main thread. */
const waitArc = (page, v) =>
  page.waitForFunction(([sel, want]) => +document.querySelector(`${sel} [data-arc-from]`).dataset.arcFrom === want, [SEL, v], { timeout: 4000 }).catch(() => {});

async function overlapCheck(page, label) {
  const o = await overlaps(page);
  check(o.bad.length === 0 && o.outside === 0, `overlap @ ${label}: ${o.bad.join(', ') || 'none'}; texts outside map: ${o.outside}`);
  check(o.offPlate.length === 0, `labels on their plates @ ${label}${o.offPlate.length ? `: ${o.offPlate.join(', ')}` : ''}`);
}

/** The whole card on screen under the header, and the controls column ending with the map. */
function fitCheck(s, label) {
  check(s.card.top >= s.header && s.card.bottom <= s.vh, `fit @ ${label}: card ${s.card.top}–${s.card.bottom} inside ${s.header}–${s.vh}`);
  check(s.controls.bottom <= s.map.bottom + 1, `fit @ ${label}: controls end ${s.controls.bottom} ≤ map end ${s.map.bottom}`);
}

const browser = await chromium.launch();
try {
  const { ctx, page, errors } = await open(browser);

  // copy
  const text = await page.locator(SEL).innerText();
  const COPY = [
    'שלושה סוגי צפון',
    'הכיוון מ־A אל B לא משתנה. משתנה רק הצפון שממנו מודדים — ואיתו ערך האזימוט.',
    'מאיזה צפון מודדים?',
    'צפון מגנטי (Magnetic North)',
    'הכיוון שמורה הקצה הצפוני של מחט המצפן, בהתאם לשדה המגנטי המקומי של כדור הארץ. ממנו מודדים כיוון במצפן.',
    'דגש לשימוש: מתכות ושדות מגנטיים סמוכים עלולים לשבש את הקריאה.',
    'נטייה מגנטית לדוגמה',
    'הזווית בין הצפון האמיתי לצפון המגנטי. היא משתנה לפי המקום והזמן.',
    'השוואת אזימוטים לאותו יעד',
    'במעבר בין מפה למצפן: בודקים את ההפרש בין צפון הרשת לצפון המגנטי ומתקנים את האזימוט בהתאם לנתונים העדכניים לאזור.',
  ];
  for (const c of COPY) check(text.includes(c), `copy: "${c.slice(0, 32)}…"`);
  const GONE = [
    'בחרו בכל סוג כדי לראות את ההגדרה ואת השימוש בו',
    'שנו את נקודת הייחוס',
    'הזיזו את המחוון וצפו בשינוי המדידה',
    'הזוויות בדוגמה הן להמחשה בלבד',
    'בחלונית ההפרדה המוגדלת המרווחים בין החצים אינם בקנה מידה',
    'נסו בעצמכם',
    'סטייה',
    'שימוש עיקרי', // folded into each definition (2026-10-27 copy cleanup)
  ];
  for (const g of GONE) check(!text.includes(g), `removed: "${g.slice(0, 32)}…"`);
  const once = (s) => text.split(s).length - 1;
  for (const s of ['משתנה לפי המקום והזמן', 'במעבר בין מפה למצפן', 'לנתונים העדכניים', 'מתכות ושדות מגנטיים']) {
    check(once(s) === 1, `once: "${s}" ×${once(s)}`);
  }
  const mapNote = await page.evaluate((sel) => document.querySelector(`${sel} [data-map]`).textContent.includes('הנתונים להמחשה בלבד'), SEL);
  check(mapNote, 'the map marks its data as illustrative ("הנתונים להמחשה בלבד")');

  // text sizes (reference px = rendered px / fit scale)
  const sizes = await page.evaluate((sel) => {
    const root = document.querySelector(sel);
    const scale = Number(root.closest('[data-lesson-viewport-fit]')?.getAttribute('data-fit-scale') ?? 1);
    const els = [...root.querySelectorAll('p, h3, h4, span, td, th, button, strong')].filter(
      (el) => el.closest('svg') == null && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()),
    );
    const px = (el) => parseFloat(getComputedStyle(el).fontSize);
    return {
      scale,
      min: Math.min(...els.map(px)),
      small: [...new Set(els.filter((el) => px(el) < 16).map((el) => el.textContent.trim()))],
    };
  }, SEL);
  check(sizes.min >= 14, `text floor: smallest HTML text ${sizes.min}px (reference) ≥ 14`);
  // the slider's scale marks and the shared Button's sm label (14 px) are the only text under 16 px
  check(sizes.small.every((t) => /^[−+]?\d+°$/.test(t) || t === 'איפוס'), `under 16px: only scale marks and the reset label (${sizes.small.join(' · ') || 'none'})`);

  // terrain asset: served, terrain only (no text / grid marks baked in), drawn under the grid
  const terrainSrc = await page.evaluate((sel) => document.querySelector(`${sel} [data-terrain]`)?.getAttribute('href'), SEL);
  const terrain = terrainSrc ? await page.request.get(`${BASE}${terrainSrc}`) : null;
  const terrainBody = terrain ? await terrain.text() : '';
  check(terrain?.status() === 200 && !/<text|<image/.test(terrainBody), `terrain asset ${terrainSrc}: ${terrain?.status()}, terrain only`);
  const order = await page.evaluate((sel) => {
    const els = [...document.querySelector(`${sel} [data-north-lab-map] svg`).querySelectorAll('[data-terrain], [data-grid], [data-ring-body]')];
    return els.map((e) => (e.hasAttribute('data-terrain') ? 'terrain' : e.hasAttribute('data-grid') ? 'grid' : 'ring'));
  }, SEL);
  check(order.join('>') === 'terrain>grid>ring', `drawing order: ${order.join(' → ')}`);
  await page.evaluate((sel) => {
    document.querySelector(`${sel} [data-terrain]`).__probe = 1;
  }, SEL);

  // opening
  const s0 = await state(page);
  check(s0.selectedTab === 'magnetic' && s0.activeRow === 'magnetic' && s0.selectedArrow === 'magnetic' && s0.lastArrow === 'magnetic', 'opening: magnetic selected (tab, row, arrow drawn last)');
  check(s0.declination === '−6°' && s0.slider === -6 && s0.valuetext === '6 מעלות מערבה', `opening: declination ${s0.declination} / ${s0.valuetext}`);
  check(s0.reading === '072°' && s0.readingLabel === 'האזימוט ביחס לצפון מגנטי', `opening: reading ${s0.reading} (${s0.readingLabel})`);
  check(s0.relation === REL.magnetic(-6), `opening: relation "${s0.relation}"`);
  check(s0.rows.true === '066°' && s0.rows.grid === '064°' && s0.rows.magnetic === '072°', `opening: table ${JSON.stringify(s0.rows)}`);
  check(s0.arcFrom === -6 && s0.arrows.magnetic === -6 && s0.arrows.true === 0 && s0.arrows.grid === 2, `opening: arc from ${s0.arcFrom}, arrows ${JSON.stringify(s0.arrows)}`);
  check(s0.tabIndexes.filter((t) => t === 0).length === 1, 'roving tabindex: one tab in the tab order');
  check(
    JSON.stringify(s0.labels) === JSON.stringify({ magnetic: ['מגנטי', '−6°'], true: ['אמיתי', '0°'], grid: ['רשת', '+2°'] }),
    `map labels: Hebrew name + angle from TN ${JSON.stringify(s0.labels)}`,
  );
  check(
    JSON.stringify(s0.insetLabels) === JSON.stringify({ magnetic: ['מגנטי'], true: ['אמיתי'], grid: ['רשת'] }),
    `inset labels: names only ${JSON.stringify(s0.insetLabels)}`,
  );
  check(!/\b(TN|GN|MN)\b/.test(await page.locator(`${SEL} [data-map]`).textContent()), 'no TN / GN / MN abbreviations on the map');
  check(s0.panelText.startsWith('צפון מגנטי (Magnetic North)'), `opening: panel "${s0.panelText.slice(0, 40)}…"`);
  fitCheck(s0, 'opening');
  await overlapCheck(page, 'opening');
  await shot(page, '01-opening-magnetic');

  // choice
  await tab(page, 'true').click();
  await waitArc(page, 0);
  await page.waitForTimeout(400); // panel cross-fade
  const sT = await state(page);
  check(sT.reading === '066°' && sT.readingLabel === 'האזימוט ביחס לצפון אמיתי' && sT.arcFrom === 0, `true: reading ${sT.reading}, arc from ${sT.arcFrom}`);
  check(sT.relation === REL.true, `true: relation "${sT.relation}"`);
  check(sT.info === 'true' && sT.activeRow === 'true' && sT.lastArrow === 'true', 'true: tab panel, row and arrow follow');
  check(JSON.stringify(sT.A) === JSON.stringify(s0.A) && JSON.stringify(sT.B) === JSON.stringify(s0.B) && sT.slider === -6, 'true: A, B and slider unchanged');
  check(sT.cardH === s0.cardH && sT.readingBox.top === s0.readingBox.top, `true: card height ${sT.cardH} = ${s0.cardH}; reading box stays at ${sT.readingBox.top}`);
  check(
    sT.panelText === 'צפון אמיתי (True North) הכיוון אל הקוטב הצפוני הגאוגרפי לאורך קו האורך המקומי. משמש כייחוס גאוגרפי למדידת כיוונים. דגש לשימוש: מצפן מגנטי אינו מורה בהכרח לכיוון זה.',
    `true: panel "${sT.panelText}"`,
  );
  fitCheck(sT, 'true');
  await overlapCheck(page, 'true');
  await shot(page, '02-true-north');

  await tab(page, 'grid').click();
  await waitArc(page, 2);
  await page.waitForTimeout(400);
  const sG = await state(page);
  check(sG.reading === '064°' && sG.readingLabel === 'האזימוט ביחס לצפון רשת' && sG.arcFrom === 2, `grid: reading ${sG.reading}, arc from ${sG.arcFrom}`);
  check(sG.relation === REL.grid, `grid: relation "${sG.relation}"`);
  check(sG.cardH === s0.cardH && JSON.stringify(sG.B) === JSON.stringify(s0.B) && sG.readingBox.top === s0.readingBox.top, 'grid: card height, reading position and B unchanged');
  check(
    sG.panelText === 'צפון רשת (Grid North) כיוון הצפון לאורך הקווים האנכיים של רשת הקואורדינטות במפה. לפיו מודדים כיוונים במפה. דגש לשימוש: עשוי להיות שונה מצפון אמיתי ומצפון מגנטי.',
    `grid: panel "${sG.panelText}"`,
  );
  fitCheck(sG, 'grid');
  await overlapCheck(page, 'grid');
  await shot(page, '03-grid-north');

  // slider — with true chosen the reading and its line stay
  await tab(page, 'true').click();
  await setDeclination(page, 4);
  const sTrueSlider = await state(page);
  check(
    sTrueSlider.reading === '066°' && sTrueSlider.rows.magnetic === '062°' && sTrueSlider.arrows.magnetic === 4 && sTrueSlider.relation === REL.true,
    `true + slider +4°: reading ${sTrueSlider.reading}, magnetic row ${sTrueSlider.rows.magnetic}, relation unchanged`,
  );
  await tab(page, 'magnetic').click();
  const TABLE = { '-10': '076°', 0: '066°', 2: '064°', 10: '056°' };
  for (const d of [-10, 0, 2, 10]) {
    await setDeclination(page, d);
    const s = await state(page);
    check(s.arrows.magnetic === d && s.rows.magnetic === TABLE[d] && s.reading === TABLE[d] && s.arcFrom === d && s.rows.true === '066°' && s.rows.grid === '064°',
      `declination ${d}: MN ${s.arrows.magnetic}, magnetic ${s.rows.magnetic}, reading ${s.reading}, arc from ${s.arcFrom}`);
    check(s.relation === REL.magnetic(d), `declination ${d}: relation "${s.relation}"`);
    check(s.labels.magnetic[1] === (d === 0 ? '0°' : `${d < 0 ? '−' : '+'}${Math.abs(d)}°`), `declination ${d}: MN label ${s.labels.magnetic.join(' ')}`);
    fitCheck(s, `declination ${d}`);
    await overlapCheck(page, `declination ${d}`);
    const name = d < 0 ? `04-declination-minus${-d}` : d === 0 ? '05-declination-0' : d === 2 ? '06-declination-plus2' : '07-declination-plus10';
    await shot(page, name);
  }
  check(
    await page.evaluate((sel) => document.querySelector(`${sel} [data-terrain]`).__probe === 1, SEL),
    'terrain is static: the same node through every choice and slider move (never re-created)',
  );
  // valuetext at 0 and +2
  await setDeclination(page, 0);
  check((await state(page)).valuetext === '0 מעלות', 'valuetext at 0: "0 מעלות"');
  await setDeclination(page, 2);
  check((await state(page)).valuetext === '2 מעלות מזרחה', 'valuetext at +2: "2 מעלות מזרחה"');
  await slider(page).press('Shift+ArrowRight');
  await page.waitForTimeout(900);
  check((await state(page)).slider === 7, 'Shift + → adds 5°');

  // tabs keyboard (RTL row: ← next, → previous)
  await tab(page, 'magnetic').focus();
  await page.keyboard.press('ArrowRight');
  let s = await state(page);
  check(s.selectedTab === 'grid' && (await page.evaluate(() => document.activeElement?.dataset.north)) === 'grid', 'tabs: → moves to the previous choice (grid)');
  await page.keyboard.press('ArrowLeft');
  check((await state(page)).selectedTab === 'magnetic', 'tabs: ← moves to the next choice');
  await page.keyboard.press('Home');
  check((await state(page)).selectedTab === 'true', 'tabs: Home → first');
  await page.keyboard.press('End');
  check((await state(page)).selectedTab === 'magnetic', 'tabs: End → last');
  // Tab order: the selected tab → its panel → the slider → reset
  const stops = [];
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Tab');
    stops.push(await page.evaluate(() => {
      const a = document.activeElement;
      return a?.getAttribute('role') ?? (a?.tagName === 'INPUT' ? a.type : a?.textContent?.trim());
    }));
  }
  check(stops.join(' → ') === 'tabpanel → range → איפוס', `Tab order after the tabs: ${stops.join(' → ')}`);

  // rapid switching: mid-animation the reading always equals the drawn arc; at rest it lands on the target
  await setDeclination(page, -6);
  await tab(page, 'magnetic').click();
  await page.waitForTimeout(600);
  const hBefore = (await state(page)).cardH;
  let agree = true;
  for (const id of ['true', 'grid', 'magnetic', 'true', 'magnetic']) {
    await tab(page, id).click();
    await page.waitForTimeout(40);
    const m = await state(page);
    const expected = `${String(Math.round(((66 - m.arcFrom) % 360 + 360) % 360) % 360).padStart(3, '0')}°`;
    if (m.reading !== expected) agree = false;
  }
  await page.waitForTimeout(800);
  s = await state(page);
  check(agree, 'rapid switching: reading = 66° − drawn arc start at every mid-animation sample');
  check(s.arcFrom === -6 && s.reading === '072°' && s.cardH === hBefore && s.relation === REL.magnetic(-6), `rapid switching: settles on magnetic (arc from ${s.arcFrom}, ${s.reading}), card height ${s.cardH} = ${hBefore}`);

  // reset
  await tab(page, 'grid').click();
  await setDeclination(page, 9);
  const resetBtn = page.locator(SEL).getByRole('button', { name: 'איפוס' });
  await resetBtn.click();
  await page.waitForTimeout(900);
  s = await state(page);
  const focusIsReset = await page.evaluate(() => document.activeElement?.textContent?.trim() === 'איפוס');
  check(
    s.selectedTab === 'magnetic' && s.slider === -6 && s.reading === '072°' && s.relation === REL.magnetic(-6) && s.info === 'magnetic' && focusIsReset,
    `reset: ${s.selectedTab}, ${s.slider}, ${s.reading}, panel ${s.info}, focus on reset ${focusIsReset}`,
  );

  check(errors.length === 0, `console: ${errors.length ? errors.join(' | ') : 'no errors'}`);
  await ctx.close();

  // reduced motion
  const rm = await open(browser, { reducedMotion: 'reduce' });
  await tab(rm.page, 'true').click();
  const r1 = await state(rm.page);
  check(r1.arcFrom === 0 && r1.reading === '066°' && r1.relation === REL.true, `reduced: instant choice (arc from ${r1.arcFrom}, ${r1.reading})`);
  check(r1.info === 'true' && r1.panelText.startsWith('צפון אמיתי'), 'reduced: the panel switches without a fade');
  await tab(rm.page, 'magnetic').click();
  const s2 = slider(rm.page);
  await s2.focus();
  await s2.press('ArrowRight');
  const r2 = await state(rm.page);
  check(r2.arrows.magnetic === -5 && r2.reading === '071°' && r2.relation === REL.magnetic(-5), `reduced: instant slider (MN ${r2.arrows.magnetic}, ${r2.reading})`);
  fitCheck(r2, 'reduced motion');
  await shot(rm.page, '08-reduced-motion');
  check(rm.errors.length === 0, `reduced: console ${rm.errors.length ? rm.errors.join(' | ') : 'no errors'}`);
  await rm.ctx.close();
} finally {
  await browser.close();
}

console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
