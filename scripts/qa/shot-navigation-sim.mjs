// Browser QA for lesson 6 › תרגול: the resection practice ("חיתוך לאחור", navigation-sim).
//
// Usage (a dev server serving the page — the shared :3000 by default, or an isolated worktree):
//   node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-navigation-sim.mjs [outDir] [--base=http://localhost:3000]
//
// Checks (exit code 1 on any failure):
//   layout     the step panel at the inline start (right), the map at the end (left); the map is north up and not
//              mirrored (E grows to the right, N upwards, on screen); the same-north note is visible
//   frame      the practice card has the frame of lesson 6's activities (measured on the location check in the learn
//              tab, same run): the lesson's one fit scale, one fit only (no double shrink), the same edges, padding,
//              title and body size on screen
//   fit        the card runs from under the header to above 1122 px in every state at 1440 × 1122, hints and
//              feedback included
//   tabs       practice → knowledge check → practice → learn → practice, and a reload: each tab shows its content,
//              the practice reopens at the demonstration (the tabs keep no state), no page errors
//   demo       080° drawn from the tower leaves it on the wrong side (its probe reads 260°); reversed, the line runs
//              at 260° and every probe on it reads 080°; probes lie on the line
//   no answer  before the learner types a value, checks it, or asks for the solution, no right back azimuth of the
//              scenario is anywhere in the card (text, SVG, attributes) and no line is drawn green; wrong feedback and
//              hints never print the answer
//   geometry   each line on screen points at the value typed in its field; the three right lines of the end state
//              cross at one point; the solution mark sits on the position
//   tolerance  a mark accepted near the crossing (not on it) is told its distance; no text says a line passes
//              through the mark — lines pass through the crossing
//   selection  choosing is neutral: no ✓ on a chosen object, no verdict tone before a check
//   flows      choose (map and buttons, a third choice replaces the earliest); lines — not reversed, another object's
//              measurement, off — each named, then right; mark — on no line, on one line, then right; hints 1–2 and
//              the solution; verify — not reversed, then right; the ideal-measurement close; another scenario (B, then
//              C) with other readings; restart
//   0°/360°    ↓ from an empty field gives 359°, ↑ gives 0° (a line straight up); 370 waits with "subtract 360°"
//   keyboard   the whole task with keys only, focus following each step; Enter on the map checks the mark
//   reduced    with reduced motion the demonstration's line is drawn at once
//   text       map labels ≥ 13 px on screen (the panel text: see frame)
//   console    no page errors
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { OBJECTS, SCENARIOS, SHEET, backAzimuth, crossing } from '../../src/components/lessons/topic-06/navigation-sim/navigationSimModel.ts';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'design/screenshots/navigation-sim';
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

const A = '[data-activity="navigation-sim"]';
const MAP = '[data-panel="navsim-map"] svg';

async function open(browser, { reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|\/reference-assets\//.test(m.location()?.url ?? '')) errors.push(m.text());
  });
  for (let attempt = 1; ; attempt++) {
    try {
      await page.goto(URL, { waitUntil: 'load', timeout: 180000 });
      await page.getByRole('tab', { name: 'תרגול' }).first().click({ timeout: 60000 });
      await page.waitForSelector(A, { timeout: 60000 });
      break;
    } catch (e) {
      if (attempt >= 3) throw e;
      console.log(`retry open (${String(e).split('\n')[0]})`);
    }
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(600);
  return { ctx, page, errors };
}

const top = (page) => page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
let tallest = { bottom: 0, label: '' };
const fits = async (page, label) => {
  await top(page);
  await page.waitForTimeout(200);
  const b = await page.locator(A).boundingBox();
  if (b.y + b.height > tallest.bottom) tallest = { bottom: b.y + b.height, label };
  check(b.y >= 96 && b.y + b.height <= 1122, `fit · ${label}: card ${Math.round(b.y)}–${Math.round(b.y + b.height)} px (under the header, ≤ 1122)`);
};
/** A card's frame on screen: its fit scale (and how many fits hold it), edges, padding, title and body size. */
const frame = (page, sel) =>
  page.locator(sel).first().evaluate((el) => {
    const fits = [];
    for (let p = el.parentElement; p; p = p.parentElement) if (p.hasAttribute('data-fit-scale')) fits.push(Number(p.getAttribute('data-fit-scale')));
    const k = fits.reduce((a, b) => a * b, 1);
    const r = el.getBoundingClientRect();
    const px = (e) => (e ? parseFloat(getComputedStyle(e).fontSize) * k : NaN);
    return { fits, k, x: r.x, right: r.right, pad: parseFloat(getComputedStyle(el).paddingTop) * k, title: px(el.querySelector('h2, h3')), body: px(el.querySelector('p.text-base')) };
  });
const near = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;
const shot = async (page, file) => {
  await top(page);
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${outDir}/${file}` });
};
const state = (page) => page.evaluate(() => window.__navsim.state);
const feedback = (page) => page.locator(`${A} [data-navsim-feedback]`).getAttribute('data-navsim-feedback');
const feedbackText = (page) => page.locator(`${A} [data-navsim-feedback]`).innerText();
const btn = (page, name) => page.locator(A).getByRole('button', { name, exact: true });
const input = (page, id) => page.locator(`${A} [data-line-input="${id}"]`);
const m = (p) => [p.E, SHEET.height - p.N];
const toScreen = (page, pts) =>
  page.locator(MAP).evaluate((svg, ps) => {
    const ctm = svg.getScreenCTM();
    return ps.map(([x, y]) => {
      const p = new DOMPoint(x, y).matrixTransform(ctm);
      return [p.x, p.y];
    });
  }, pts);
const clickWorld = async (page, P) => {
  const [[x, y]] = await toScreen(page, [m(P)]);
  await page.mouse.click(x, y);
};
const screenBearing = ([x1, y1], [x2, y2]) => ((Math.atan2(x2 - x1, -(y2 - y1)) * 180) / Math.PI + 360) % 360;
const angd = (a, b) => {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
};
/** Every drawn line: its object, its value, its tone, and its bearing on screen. */
const drawnLines = (page) =>
  page.locator(`${MAP} [data-map-line]`).evaluateAll((gs) =>
    gs.map((g) => {
      const path = g.querySelector('path');
      const n = path.getAttribute('d').match(/-?\d+(\.\d+)?/g).map(Number);
      const ctm = path.ownerSVGElement.getScreenCTM();
      const a = new DOMPoint(n[0], n[1]).matrixTransform(ctm);
      const b = new DOMPoint(n[2], n[3]).matrixTransform(ctm);
      return { id: g.getAttribute('data-map-line'), deg: Number(g.getAttribute('data-deg')), tone: g.getAttribute('data-tone'), a: [a.x, a.y], b: [b.x, b.y] };
    }),
  );
const linesPointRight = async (page, label) => {
  const ls = await drawnLines(page);
  const bad = ls.filter((l) => angd(screenBearing(l.a, l.b), l.deg) > 0.3);
  check(ls.length > 0 && bad.length === 0, `${label}: ${ls.length} line(s), each on screen at its value (${ls.map((l) => `${l.id} ${l.deg}°`).join(', ')})`);
  return ls;
};

/** Every place a scenario's right back azimuth could leak: visible or hidden text, SVG text, attributes. */
const answerLeaks = (page, values) =>
  page.locator(A).evaluate((root, vals) => {
    const pads = vals.map((v) => String(v).padStart(3, '0'));
    const res = vals.map((v, k) => new RegExp(`(?<![\\d.,])(${v}|${pads[k]})°`));
    const hits = [];
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t; (t = walk.nextNode()); ) if (res.some((r) => r.test(t.textContent))) hits.push(t.textContent.trim().slice(0, 60));
    for (const el of root.querySelectorAll('*')) {
      for (const a of ['aria-label', 'aria-valuetext', 'title', 'data-deg', 'value', 'placeholder'])
        if (el.hasAttribute(a) && vals.some((v, k) => res[k].test(el.getAttribute(a)) || (a === 'data-deg' && Number(el.getAttribute(a)) === v))) hits.push(`${a}=${el.getAttribute(a)}`);
      if (el.tagName === 'INPUT' && vals.includes(Number(el.value)) && el.value !== '') hits.push(`input=${el.value}`);
    }
    return hits;
  }, values);
const noLeak = async (page, scenario, label, except = []) => {
  const vals = ['tower', 'antenna', 'summit'].map((id) => backAzimuth(scenario.readings[id])).filter((v, k) => !except.includes(['tower', 'antenna', 'summit'][k]));
  const hits = await answerLeaks(page, vals);
  check(hits.length === 0, `no answer · ${label}${hits.length ? `: ${JSON.stringify(hits)}` : ''}`);
  // Lines the learner already checked right (`except`) are theirs; any other green line would give an answer away.
  const green = await page.locator(`${MAP} [data-map-line][data-tone="right"]`).evaluateAll((gs) => gs.map((g) => g.getAttribute('data-map-line')));
  const given = green.filter((id) => !except.includes(id));
  check(given.length === 0, `no answer · ${label}: no line is drawn as right${except.length ? ` beyond the learner's own (${except.join(', ')})` : ''}${given.length ? `: ${given.join(', ')}` : ''}`);
};

const browser = await chromium.launch({ channel: 'chrome' });
try {
  // ================================================================ frame: against a lesson-6 activity; tabs and reload
  {
    const { page, errors, ctx } = await open(browser);
    const sim = await frame(page, A);
    // tabs: practice → check → practice → learn → practice; the practice keeps no state across tabs (the shell remounts each tab)
    await page.getByRole('tab', { name: 'בדיקת ידע' }).first().click();
    await page.waitForTimeout(500);
    check((await page.locator('#lesson-panel-check').count()) === 1 && (await page.locator(A).count()) === 0, 'tabs: the knowledge check shows its panel, not the practice');
    await page.getByRole('tab', { name: 'תרגול' }).first().click();
    await page.waitForSelector(A, { timeout: 60000 });
    await btn(page, 'הפכו את הכיוון').click();
    check((await state(page)).step === 'demo-2', 'tabs: the practice works after the knowledge check');
    await page.getByRole('tab', { name: 'לימוד' }).first().click();
    await page.waitForTimeout(500);
    check((await page.locator('#lesson-panel-learn').count()) === 1 && (await page.locator(A).count()) === 0, 'tabs: back to the learn tab');
    await page.getByRole('tab', { name: 'תרגול' }).first().click();
    await page.waitForSelector(A, { timeout: 60000 });
    check((await state(page)).step === 'demo-1', 'tabs: the practice reopens at the demonstration (no state kept, as the other tabs)');
    await page.reload({ waitUntil: 'load', timeout: 180000 });
    await page.waitForTimeout(800);
    check((await page.locator('#lesson-panel-learn').count()) === 1, 'reload: the lesson opens on the learn tab (the tab is not in the URL)');
    await page.getByRole('tab', { name: 'תרגול' }).first().click();
    await page.waitForSelector(A, { timeout: 60000 });
    check((await state(page)).step === 'demo-1' && (await page.locator(`${A} [data-map-demo-line="unreversed"]`).count()) === 1, 'reload: the practice opens again, at the demonstration');
    // the frame of a lesson-6 activity in the learn tab, same run (a hash-only goto would keep the practice tab)
    await page.goto('about:blank');
    await page.goto(`${URL}#scene-principles`, { waitUntil: 'load', timeout: 180000 });
    await page.waitForSelector('[data-activity="location-check"]', { timeout: 90000 });
    await page.waitForTimeout(600);
    const ref = await frame(page, '[data-activity="location-check"]');
    check(sim.fits.length === 1 && ref.fits.length === 1, `frame: one fit holds the card (no double shrink): practice ${JSON.stringify(sim.fits)}, lesson ${JSON.stringify(ref.fits)}`);
    check(near(sim.k, ref.k, 0.0005), `frame: the lesson's scale (practice ${sim.k}, location check ${ref.k})`);
    check(near(sim.x, ref.x) && near(sim.right, ref.right), `frame: the same edges (${Math.round(sim.x)}–${Math.round(sim.right)} vs ${Math.round(ref.x)}–${Math.round(ref.right)})`);
    check(near(sim.pad, ref.pad, 0.2) && near(sim.title, ref.title, 0.2) && near(sim.body, ref.body, 0.2), `frame: padding ${sim.pad.toFixed(1)} / title ${sim.title.toFixed(1)} / body ${sim.body.toFixed(1)} px on screen, as the location check (${ref.pad.toFixed(1)} / ${ref.title.toFixed(1)} / ${ref.body.toFixed(1)})`);
    check(errors.length === 0, `frame and tabs: no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
    await ctx.close();
  }

  const { page, errors, ctx } = await open(browser);
  const [SA, SB, SC] = SCENARIOS;

  // ================================================================ layout, demo
  const panel = await page.locator('[data-panel="navsim-step"]').boundingBox();
  const mapBox = await page.locator('[data-panel="navsim-map"]').boundingBox();
  check(panel.x > mapBox.x, 'the step panel at the inline start (right), the map at the end (left)');
  const [o, e, n] = await toScreen(page, [m({ E: 0, N: 0 }), m({ E: 1000, N: 0 }), m({ E: 0, N: 1000 })]);
  check(e[0] > o[0] && Math.abs(e[1] - o[1]) < 0.5 && n[1] < o[1] && Math.abs(n[0] - o[0]) < 0.5, 'on screen: east to the right, north up — the map is not mirrored');
  check(await page.locator(`${A} [data-north-note]`).isVisible(), 'the note: every direction is measured from the same north');
  check((await page.locator(`${A} [data-map="north"]`).count()) === 1 && (await page.locator(`${A} [data-map="scale"]`).count()) === 1, 'the map has a north arrow and a scale bar');
  for (const id of ['tower', 'antenna', 'summit']) check((await page.locator(`${MAP} [data-map-object="${id}"]`).count()) === 1, `the map shows ${id}`);
  for (const sc of SCENARIOS) await noLeak(page, sc, `opening (scenario ${sc.id})`);
  await fits(page, 'demo · measurement');
  // text sizes
  const minLabel = await page.locator(MAP).evaluate((svg) => {
    const k = svg.getScreenCTM().a;
    return Math.min(...[...svg.querySelectorAll('text')].map((t) => Number(t.getAttribute('font-size')) * k));
  });
  check(minLabel >= 13, `map labels ≥ 13 px on screen (smallest ${minLabel.toFixed(1)} px)`);

  const T = OBJECTS.tower.pos;
  const demoLine = async (kind) => {
    const d = await page.locator(`${MAP} [data-map-demo-line="${kind}"]`).getAttribute('d');
    const nn = d.match(/-?\d+(\.\d+)?/g).map(Number);
    const [a, b] = await toScreen(page, [[nn[0], nn[1]], [nn[2], nn[3]]]);
    return screenBearing(a, b);
  };
  check(Math.abs((await demoLine('unreversed')) - 80) < 0.3, 'demo 1: the un-reversed line leaves the tower at 080° on screen');
  check((await page.locator(`${MAP} [data-map-probe="wrong"][data-to="260"]`).count()) === 1, 'demo 1: from the point on it, the tower reads 260°');
  await page.waitForTimeout(900);
  await shot(page, '01-demo-measure.png');
  await btn(page, 'הפכו את הכיוון').click();
  await page.waitForTimeout(1300);
  check(Math.abs((await demoLine('reversed')) - 260) < 0.3, 'demo 2: the reversed line leaves the tower at 260° on screen');
  const probes = await page.locator(`${MAP} [data-map-probe="right"]`).evaluateAll((gs) => gs.map((g) => ({ to: Number(g.getAttribute('data-to')), cx: Number(g.querySelector('circle').getAttribute('cx')), cy: Number(g.querySelector('circle').getAttribute('cy')) })));
  const onLine = probes.every((p) => {
    const E = p.cx;
    const N = SHEET.height - p.cy;
    const b = ((Math.atan2(E - T.E, N - T.N) * 180) / Math.PI + 360) % 360;
    return p.to === 80 && Math.abs(b - 260) < 0.1;
  });
  check(probes.length === 3 && onLine, 'demo 2: three points on the reversed line, each reading the tower at 080°');
  check((await page.locator(`${A} [data-controls="demo-2"] h3`).innerText()).includes('080° + 180° = 260°'), 'demo 2: the working 080° + 180° = 260°');
  await fits(page, 'demo · reversed');
  await shot(page, '02-demo-reversed.png');

  // ================================================================ choose
  await btn(page, 'לתרגול').click();
  await page.waitForTimeout(300);
  check((await page.locator(`${A} [data-map-demo-line]`).count()) === 0, 'the demonstration line is gone in the practice');
  check(await btn(page, 'מדידה במצפן').isDisabled(), 'no measurement before two objects are chosen');
  await fits(page, 'choose');
  await shot(page, '03-choose.png');
  const hit = (id) => page.locator(`${MAP} [data-map-hit="${id}"]`).click();
  await hit('tower');
  await hit('antenna');
  await page.locator(`${A} [data-object="summit"]`).click();
  check(JSON.stringify((await state(page)).chosen) === '["antenna","summit"]', 'a third choice replaces the earliest (map clicks and buttons)');
  await page.locator(`${A} [data-object="summit"]`).click();
  await page.locator(`${A} [data-object="tower"]`).click();
  const pressed = await page.locator(`${A} [data-object]`).evaluateAll((bs) => bs.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.object));
  check(JSON.stringify(pressed.sort()) === '["antenna","tower"]', 'clicking a chosen object clears it; the buttons show the choice (aria-pressed)');
  check((await page.locator(`${MAP} [data-map-object][data-chosen]`).count()) === 2, 'the map rings the two chosen objects (neutral, no verdict)');
  check((await page.locator(`${A} [data-object] svg`).count()) === 0, 'selection: no ✓ on the chosen objects (a choice is not a verdict)');
  await noLeak(page, SA, 'chosen');
  await shot(page, '04-chosen.png');
  await btn(page, 'מדידה במצפן').click();

  // ================================================================ lines (scenario A: tower 056°, antenna 284°)
  const readings = await page.locator(`${A} [data-line-row]`).evaluateAll((rs) => rs.map((r) => [r.getAttribute('data-line-row'), r.querySelector('bdi').textContent]));
  check(JSON.stringify(readings) === JSON.stringify([['antenna', '284°'], ['tower', '056°']]), `the measurements to the chosen objects: ${JSON.stringify(readings)}`);
  await noLeak(page, SA, 'lines · empty');
  check((await page.locator(`${MAP} [data-map-line]`).count()) === 0, 'no line before a value is typed');
  // the measurements themselves: not reversed
  await input(page, 'tower').fill('56');
  await input(page, 'antenna').fill('284');
  await page.locator(`${A} h3`).click();
  await linesPointRight(page, 'typed');
  check((await page.locator(`${MAP} [data-map-line][data-tone="draft"]`).count()) === 2 && (await feedback(page)) === 'lines-live', 'typed lines are neutral until checked');
  await noLeak(page, SA, 'lines · typed (not reversed)');
  await shot(page, '05-lines-typed.png');
  await btn(page, 'בדיקה').click();
  check((await feedback(page)) === 'lines-reverse+reverse', 'not reversed: both lines named (lines-reverse)');
  check((await feedbackText(page)).includes('המדידה עצמה') && (await page.locator(`${MAP} [data-map-line][data-tone="wrong"]`).count()) === 2, 'not reversed: "the measurement itself", the lines red');
  await noLeak(page, SA, 'lines · reverse feedback');
  await fits(page, 'lines · reverse');
  await shot(page, '06-lines-wrong-reverse.png');
  // another object's measurement (swapped)
  await input(page, 'tower').fill('104');
  check((await page.locator(`${A} [data-line-row="tower"]`).getAttribute('data-verdict')) === null, 'a changed value clears its verdict');
  await input(page, 'antenna').fill('236');
  await btn(page, 'בדיקה').click();
  check((await feedback(page)) === 'lines-other-object+other-object', 'swapped: each line named as another object’s measurement');
  check((await feedbackText(page)).includes('מתאים למדידה אל האנטנה'), 'swapped: names the object whose measurement it is');
  await fits(page, 'lines · other object');
  await shot(page, '07-lines-wrong-other-object.png');
  // off by one, the other right: the right line locks
  await input(page, 'tower').fill('235');
  await input(page, 'antenna').fill('104');
  await btn(page, 'בדיקה').click();
  check((await feedback(page)) === 'lines-off', 'off: one wrong line (lines-off)');
  check((await input(page, 'antenna').getAttribute('readonly')) !== null && (await page.locator(`${MAP} [data-map-line="antenna"]`).getAttribute('data-tone')) === 'right', 'the right line locks and turns green');
  await noLeak(page, SA, 'lines · off feedback', ['antenna']);
  await btn(page, 'רמז').click();
  await btn(page, 'רמז נוסף').click();
  const hints = await page.locator(`${A} [data-hint]`).allInnerTexts();
  check(hints.length === 2 && hints[1].includes('056° + 180° = ?'), 'hints 1–2: the idea, then the rule worked on this measurement with the result left open');
  check(await btn(page, 'הצגת הפתרון').isVisible(), 'the solution is offered after the hints');
  await noLeak(page, SA, 'lines · hints', ['antenna']);
  await fits(page, 'lines · two hints');
  await shot(page, '08-lines-hints.png');
  await input(page, 'tower').fill('236');
  await btn(page, 'בדיקה').click();
  const right = await feedbackText(page);
  check((await feedback(page)) === 'lines-right' && right.includes('056° + 180° = 236°') && right.includes('284° − 180° = 104°'), 'right: the working of both lines');
  await linesPointRight(page, 'right lines');
  check((await page.locator(`${A} [data-help]`).count()) === 0, 'right: the hints and the solution offer close');
  await fits(page, 'lines · right');
  await shot(page, '09-lines-right.png');

  // ================================================================ mark
  await btn(page, 'המשך: סימון המיקום').click();
  await page.waitForTimeout(200);
  check(await page.evaluate(() => document.activeElement?.hasAttribute('data-map-focus')), 'the mark step puts focus on the map');
  check(await btn(page, 'בדיקה').isDisabled(), 'no check before a mark');
  check((await page.locator(`${MAP} [data-map="mark"]`).count()) === 0, 'no mark is drawn before the learner places one');
  await clickWorld(page, { E: 1000, N: 1350 });
  check((await page.locator(`${MAP} [data-map="mark"]`).getAttribute('data-tone')) === 'draft', 'a placed mark is neutral');
  await btn(page, 'בדיקה').click();
  check((await feedback(page)) === 'mark-no-line', 'off both lines (mark-no-line)');
  await fits(page, 'mark · no line');
  await shot(page, '10-mark-wrong.png');
  // on the tower's line, 450 m short of the crossing
  const P = SA.position;
  const towerLine = backAzimuth(SA.readings.tower);
  const dTP = Math.hypot(P.E - OBJECTS.tower.pos.E, P.N - OBJECTS.tower.pos.N);
  const onTower = { E: OBJECTS.tower.pos.E + Math.sin((towerLine * Math.PI) / 180) * (dTP - 450), N: OBJECTS.tower.pos.N + Math.cos((towerLine * Math.PI) / 180) * (dTP - 450) };
  await clickWorld(page, onTower);
  check((await feedback(page)) === 'mark-placed', 'a moved mark has no verdict until checked');
  await btn(page, 'בדיקה').click();
  check((await feedback(page)) === 'mark-one-line' && (await feedbackText(page)).includes('על הקו ממגדל המים'), 'on one line: names the line it is on and the one it is off');
  await btn(page, 'רמז').click();
  await btn(page, 'רמז נוסף').click();
  await fits(page, 'mark · one line + two hints');
  await shot(page, '11-mark-one-line-hints.png');
  await clickWorld(page, { E: P.E + 25, N: P.N - 20 });
  await btn(page, 'בדיקה').click();
  check((await feedback(page)) === 'mark-right' && (await page.locator(`${MAP} [data-map="mark"]`).getAttribute('data-tone')) === 'right', 'within 60 m of the crossing: right');
  const nearText = await feedbackText(page);
  check(nearText.includes('כ־30 מ׳ מהחיתוך') && nearText.includes('עד 60 מ׳') && !nearText.includes('בחיתוך הקווים'), `tolerance: a mark ~32 m off is accepted and told its distance ("${nearText.split('\n')[0]}")`);
  await fits(page, 'mark · right');
  await shot(page, '12-mark-right.png');

  // ================================================================ verify (summit 190°)
  await btn(page, 'המשך: אימות').click();
  await page.waitForTimeout(200);
  check(await page.evaluate(() => document.activeElement?.getAttribute('data-line-input') === 'summit'), 'verify: focus on the third object’s field');
  const verifyText = await page.locator(`${A} [data-controls="verify"]`).innerText();
  check(verifyText.includes('190°') && verifyText.includes('בחיתוך של שני הקווים') && !verifyText.includes('דרך הסימון'), 'verify: the measurement to the third object (190°); its line is to pass through the crossing, not "through the mark"');
  await noLeak(page, SA, 'verify · empty', ['tower', 'antenna']);
  await input(page, 'summit').fill('190');
  await btn(page, 'בדיקה').click();
  check((await feedback(page)) === 'verify-reverse' && (await feedbackText(page)).includes('לא תואם את המדידה') && (await feedbackText(page)).includes('המדידה עצמה'), 'verify, not reversed: named (verify-reverse), no claim about the mark');
  await input(page, 'summit').fill('11');
  check((await feedback(page)) === 'verify-live' && (await page.locator(`${A} [data-line-row="summit"]`).getAttribute('data-verdict')) === null, 'verify: a changed value clears the old feedback');
  await input(page, 'summit').fill('190');
  await btn(page, 'בדיקה').click();
  await fits(page, 'verify · wrong');
  await shot(page, '13-verify-wrong.png');
  await input(page, 'summit').fill('10');
  await btn(page, 'בדיקה').click();
  await page.waitForTimeout(250);
  check((await state(page)).step === 'done' && (await feedback(page)) === 'verify-right', 'verify, 010°: done');
  const done = await page.locator(`${A} [data-controls="done"]`).innerText();
  check(done.includes('190° − 180° = 010°') && done.includes('אידאליות') && done.includes('2°') && done.includes('אזור'), 'the close: the working, ideal measurements, a 2° error, a position area');
  check(done.includes('נפגשים בנקודה אחת') && done.includes('הסימון שלכם כ־30 מ׳ ממנה') && !done.includes('דרך הסימון'), 'tolerance: the close says the lines meet at one point and the mark is ~30 m from it');
  check((await page.locator(`${MAP} [data-map-wedge]`).count()) === 3, 'the close draws a ±2° band on each line');
  const ls = await linesPointRight(page, 'done');
  // the three lines meet at one point on screen
  const meet = (l1, l2) => {
    const [x1, y1] = l1.a, [x2, y2] = l1.b, [x3, y3] = l2.a, [x4, y4] = l2.b;
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
  };
  const X1 = meet(ls[0], ls[1]);
  const X2 = meet(ls[0], ls[2]);
  const [[px, py]] = await toScreen(page, [m(P)]);
  check(Math.hypot(X1[0] - X2[0], X1[1] - X2[1]) < 0.5 && Math.hypot(X1[0] - px, X1[1] - py) < 0.5, 'the three lines on screen cross at one point — the position');
  await fits(page, 'done');
  await shot(page, '14-done.png');

  // ================================================================ another scenario (B), by hints and solutions
  await btn(page, 'תרחיש נוסף').click();
  await page.waitForTimeout(250);
  const sB = await state(page);
  check(sB.scenario === 1 && sB.step === 'choose' && sB.chosen.length === 0 && !sB.marker, 'another scenario: B, from the choice, nothing carried over');
  check((await page.locator(`${A} [data-scenario-label]`).innerText()).includes('תרחיש 2 מתוך 3'), 'scenario label: 2 of 3');
  check((await page.locator(`${MAP} [data-map-line], ${MAP} [data-map="mark"], ${MAP} [data-map-wedge]`).count()) === 0, 'the map is clear of the last scenario');
  await shot(page, '15-scenario-b-choose.png');
  await page.locator(`${A} [data-object="antenna"]`).click();
  await page.locator(`${A} [data-object="summit"]`).click();
  await btn(page, 'מדידה במצפן').click();
  const bReadings = await page.locator(`${A} [data-line-row] bdi`).allInnerTexts();
  check(JSON.stringify(bReadings) === JSON.stringify(['304°', '238°']), `B has other readings: ${bReadings.join(', ')}`);
  await noLeak(page, SB, 'B · lines empty');
  await input(page, 'antenna').fill('304');
  await input(page, 'summit').fill('238');
  await btn(page, 'בדיקה').click();
  check(!(await btn(page, 'הצגת הפתרון').isVisible()), 'no solution right after the first wrong check');
  await btn(page, 'רמז').click();
  await btn(page, 'הצגת הפתרון').click();
  check((await feedback(page)) === 'lines-solved' && (await input(page, 'antenna').inputValue()) === '124' && (await input(page, 'summit').inputValue()) === '58', 'the solution fills 124° and 058°');
  await shot(page, '16-b-lines-solved.png');
  await btn(page, 'המשך: סימון המיקום').click();
  await clickWorld(page, { E: 600, N: 1500 });
  await btn(page, 'בדיקה').click();
  await clickWorld(page, { E: 300, N: 1600 });
  await btn(page, 'בדיקה').click();
  await btn(page, 'הצגת הפתרון').click();
  const markAt = await page.locator(`${MAP} [data-map="mark"]`).getAttribute('transform');
  const [mx, my] = markAt.match(/-?\d+(\.\d+)?/g).map(Number);
  check(Math.hypot(mx - SB.position.E, SHEET.height - my - SB.position.N) < 0.2 && (await feedback(page)) === 'mark-solved', 'the solution puts the mark on the position, at the crossing');
  const bCross = crossing(OBJECTS.antenna.pos, 124, OBJECTS.summit.pos, 58);
  check(Math.hypot(bCross.E - SB.position.E, bCross.N - SB.position.N) < 0.01, 'B: the lines 124° and 058° cross on the position');
  await fits(page, 'B · mark solved');
  await shot(page, '17-b-mark-solved.png');
  await btn(page, 'המשך: אימות').click();
  await input(page, 'tower').fill('13');
  await btn(page, 'בדיקה').click();
  check((await feedback(page)) === 'verify-reverse', 'B verify, 013° (not reversed): named');
  await input(page, 'tower').fill('193');
  await btn(page, 'בדיקה').click();
  check((await state(page)).step === 'done', 'B verify, 193°: done');
  await shot(page, '18-b-done.png');
  // C, the third position
  await btn(page, 'תרחיש נוסף').click();
  check((await state(page)).scenario === 2, 'another scenario: C');
  await page.locator(`${A} [data-object="tower"]`).click();
  await page.locator(`${A} [data-object="summit"]`).click();
  await btn(page, 'מדידה במצפן').click();
  await noLeak(page, SC, 'C · lines empty');
  await input(page, 'tower').fill(String(backAzimuth(SC.readings.tower)));
  await input(page, 'summit').fill(String(backAzimuth(SC.readings.summit)));
  await btn(page, 'בדיקה').click();
  await btn(page, 'המשך: סימון המיקום').click();
  await clickWorld(page, SC.position);
  await btn(page, 'בדיקה').click();
  const cMark = (await state(page)).marker;
  check((await feedbackText(page)).includes('בחיתוך הקווים'), `tolerance: a mark on the crossing is "on" it (${Math.round(Math.hypot(cMark.E - SC.position.E, cMark.N - SC.position.N))} m)`);
  await btn(page, 'המשך: אימות').click();
  await input(page, 'antenna').fill(String(backAzimuth(SC.readings.antenna)));
  await btn(page, 'בדיקה').click();
  check((await state(page)).step === 'done' && !(await page.locator(`${A} [data-controls="done"]`).innerText()).includes('הסימון שלכם'), 'C: done with tower + summit, verified by the antenna; a mark on the crossing gets no distance');
  await fits(page, 'C · done');
  await shot(page, '19-c-done.png');
  // restart
  await btn(page, 'התחלה מחדש').click();
  const r = await state(page);
  check(r.scenario === 2 && r.step === 'choose' && r.chosen.length === 0 && !r.marker && Object.keys(r.entries).length === 0, 'restart: the same scenario, back to the choice, cleared');
  check(await btn(page, 'התחלה מחדש').isDisabled(), 'restart is off when there is nothing to clear');
  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  console.log(`     tallest state: ${tallest.label}, card ends at ${Math.round(tallest.bottom)} px`);
  await ctx.close();

  // ================================================================ keyboard only, reduced motion
  {
    const { page, errors, ctx } = await open(browser, { reduced: true });
    const focused = () => page.evaluate(() => {
      const el = document.activeElement;
      return el?.getAttribute('data-line-input') ?? el?.getAttribute('data-object') ?? (el?.hasAttribute('data-map-focus') ? 'map' : el?.textContent?.trim().slice(0, 24));
    });
    await btn(page, 'הפכו את הכיוון').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    const dash = await page.locator(`${MAP} [data-map-demo-line="reversed"]`).evaluate((p) => p.style.strokeDasharray || p.getAttribute('stroke-dasharray') || '');
    check(dash === '', `reduced motion: the reversed line is drawn at once (no draw-on dash: "${dash}")`);
    check((await focused()) === 'לתרגול', 'keys: focus moves to "לתרגול"');
    await page.keyboard.press('Enter');
    check((await focused()) === 'tower', 'keys: focus on the first object');
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    check((await focused()) === 'summit', 'keys: Tab moves through the objects');
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    check((await state(page)).step === 'lines' && (await focused()) === 'tower', 'keys: measured; focus on the first line field');
    await page.keyboard.type('236');
    await page.keyboard.press('Tab');
    check((await focused()) === 'summit', 'keys: Tab to the second field');
    await page.keyboard.press('ArrowDown');
    check((await input(page, 'summit').inputValue()) === '359', '0°/360°: ↓ from an empty field gives 359');
    await linesPointRight(page, '0°/360°: 359°');
    await page.keyboard.press('ArrowUp');
    check((await input(page, 'summit').inputValue()) === '0', '0°/360°: ↑ from 359 gives 0');
    const north = (await drawnLines(page)).find((l) => l.id === 'summit');
    check(Math.abs(north.a[0] - north.b[0]) < 0.5 && north.b[1] < north.a[1], '0°/360°: the 0° line runs straight up the map');
    await shot(page, '20-keyboard-north.png');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('370');
    check((await page.locator(`${A} [data-line-row="summit"]`).innerText()).includes('מפחיתים') && (await btn(page, 'בדיקה').isDisabled()), '0°/360°: 370 asks to subtract 360°; the check waits');
    await fits(page, 'keys · over 360');
    await shot(page, '21-keyboard-over-360.png');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('10');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    check((await feedback(page)) === 'lines-right' && (await focused()) === 'המשך: סימון המיקום', 'keys: Enter checks; right; focus on "continue"');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    check((await focused()) === 'map', 'keys: focus on the map');
    // first arrow puts the mark at the sheet's centre (1200, 900); then +220 E, +220 N → (1420, 1120), 10 m from A
    await page.keyboard.press('ArrowRight');
    for (let k = 0; k < 2; k++) await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('ArrowRight');
    for (let k = 0; k < 2; k++) await page.keyboard.press('Shift+ArrowUp');
    await page.keyboard.press('ArrowUp');
    const mk = (await state(page)).marker;
    check(mk.E === 1420 && mk.N === 1120, `keys: arrows move the mark (→ east, ↑ north): ${JSON.stringify(mk)}`);
    await shot(page, '22-keyboard-mark.png');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    check((await feedback(page)) === 'mark-right' && (await focused()) === 'המשך: אימות', 'keys: Enter on the map checks; right; focus on "continue"');
    check((await feedbackText(page)).includes('בחיתוך הקווים'), 'keys: a mark 10 m from the crossing (the centre dot) is "on" it');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    check((await focused()) === 'antenna', 'keys: focus on the third field');
    await page.keyboard.type('104');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    check((await state(page)).step === 'done' && (await focused()) === 'תרחיש נוסף', 'keys: done; focus on "another scenario"');
    check(errors.length === 0, `keyboard run: no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log(failures.length ? `\n${failures.length} FAILED` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
