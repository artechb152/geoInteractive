// QA for the measurement mission in #scene-coordinates ("אליפסואיד, גיאואיד וגליות"),
// as rebuilt on 2026-10-12 (design/mockups/topic-02-geodesy/claude-visual-clarity-followup-2026-10-12.md).
//
// Usage (a dev server; QA_BASE=http://localhost:<port>, default :3000):
//   node scripts/qa/shot-measurement-mission.mjs [outDir]
//
// Renders the real lesson route at 1440 × 1122 after ordinary navigation: the page scrolled so
// the activity card sits just under the site's fixed header. The landscape is the live WebGL
// model (headless Chrome: SwiftShader); the fallback is checked with WebGL switched off.
// Exit code 1 on any failure:
//   layout      every view: the whole card on screen, nothing inside it scrolling on its own;
//               the model at inline-start (right) and the section at inline-end (left), side by
//               side and the same height; the view's text across the card; no "גררו כדי לסובב" tag
//   profile     the surface view opens in profile; a full turn both ways, through the back, runs
//               past ±360 with no stop; "מבט התחלתי" comes back the short way, the task untouched;
//               coming back to a view keeps its angle, entering another opens that one's own
//   ellipsoid   the marked area on the body; "הגדלת האזור" grows the enlargement out of it and
//               links the section (one click, a steady end); "חזרה למבט הכללי" back; a click
//               during the growth cancels it for good; turning and the side / top views go on;
//               no long callout lines between the figures
//   geoid       opens solid; "חשיפת משטחי הייחוס" → see-through + its sentence, the label turns to
//               "החזרת פני השטח" → solid; turning while see-through; leaving and coming back: solid
//   stations    A/B/C picked on the model, on the section or with the buttons: the same station
//               everywhere (buttons, pins, section, receiver, data)
//   mission     no arrows over the model, H/h/N once in the section; B opens empty, no H value
//               before checking; 148 → h hint; 119.9 wrong; drafts kept; 120.0 correct; turning,
//               the reveal, the enlargement and switching views keep the task; A: 6 → sign hint,
//               30; C 220 → 3/3 — on screen throughout; "מבט התחלתי" keeps 3/3, "איפוס המשימה" clears
//   keyboard    the tabs (←/→/Home/End), the model (arrows), Enter checks
//   motion      reduced motion: the enlargement and the reveal switch at once, no flying frame
//   no WebGL    the profile stills, no turning offered, the reveal and the receiver as stills,
//               pins and task work
//   console     no page errors, no failed request for this block's files
// Writes a screenshot per state into outDir.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] || 'design/screenshots/measurement-mission-clarity-2026-10-12/qa';
const URL = `${process.env.QA_BASE || 'http://localhost:3000'}/lessons/topic-02/#scene-coordinates`;
const W = 1440;
const H = 1122;
/** Gap between the site's fixed header and the card's top (the screen fit uses the same). */
const BELOW_HEADER = 12;
await mkdir(outDir, { recursive: true });

const failures = [];
const fail = (m) => failures.push(m);
const expect = (cond, m) => cond || fail(m);
/** Failed requests from elsewhere on the lesson page — reported, not failed. */
const warnings = new Set();
const GL_ARGS = ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ channel: 'chrome', args: GL_ARGS });

const CARD = '#scene-coordinates [aria-label="שכבות החתך"]';
const ILL = '#scene-coordinates [data-land]';
const STAGE = '#scene-coordinates [data-landscape]';
const SECTION = `${ILL} figure:nth-of-type(2) [role="img"][dir="ltr"]`;

async function open(opts = {}, b = browser, live = true) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(m.text()));
  page.on('response', (r) => {
    if (r.status() < 400) return;
    if (r.url().includes('/reference-assets/measurement-mission/')) errors.push(`${r.status()} ${r.url()}`);
    else warnings.add(`${r.status()} ${r.url()}`);
  });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForSelector(CARD, { timeout: 60000 });
  await scrollCard(page);
  await page.waitForSelector(`${STAGE}[data-landscape="${live ? 'live' : 'renders'}"]`, { timeout: 90000 });
  await page.waitForTimeout(800);
  return { ctx, page, errors };
}

function scrollCard(page) {
  return page.evaluate(
    ({ sel, gap }) => {
      const c = document.querySelector(sel).closest('.surface-elevated');
      const header = document.querySelector('header.fixed');
      window.scrollTo(0, c.getBoundingClientRect().top + window.scrollY - (header ? header.getBoundingClientRect().bottom : 0) - gap);
    },
    { sel: CARD, gap: BELOW_HEADER },
  );
}
/** The card on screen, inner scrolling, and the two figures: side by side, model at inline-start. */
const layoutOf = (page) =>
  page.evaluate(
    ({ sel, ill }) => {
      const c = document.querySelector(sel).closest('.surface-elevated');
      const cb = c.getBoundingClientRect();
      const [model, section] = document.querySelectorAll(`${ill} > figure`);
      const m = model.getBoundingClientRect();
      const s = section.getBoundingClientRect();
      const text = c.querySelector('[role="tabpanel"] > div:first-child').getBoundingClientRect();
      const innerScroll = [...c.querySelectorAll('*')].some((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1);
      return {
        top: Math.round(cb.top),
        bottom: Math.round(cb.bottom),
        height: Math.round(cb.height),
        innerScroll,
        sideBySide: Math.abs(m.top - s.top) < 2 && m.left > s.right - 1,
        sameHeight: Math.abs(m.height - s.height) < 2,
        textAcross: text.width > cb.width * 0.8,
        model: { w: Math.round(m.width), h: Math.round(m.height) },
        section: { w: Math.round(s.width), h: Math.round(s.height) },
      };
    },
    { sel: CARD, ill: ILL },
  );
const attr = (page, sel, name) => page.locator(sel).first().getAttribute(name);
const land = async (page) => (await attr(page, ILL, 'data-land')).split(',').map(Number);
const ell = async (page) => (await attr(page, ILL, 'data-ell')).split(',').map(Number);
const phase = (page) => attr(page, ILL, 'data-phase');
const tab = (page, name) => page.getByRole('tab', { name, exact: true });
const shot = (page, name) => page.screenshot({ path: `${outDir}/${name}.png` });
const button = (page, name) => page.getByRole('button', { name, exact: true }).first();
const stationButton = (page, id) => page.getByRole('group', { name: 'בחירת תחנה' }).getByRole('button', { name: new RegExp(`^תחנה ${id}`) });
const input = (page) => page.getByLabel('מהו הגובה מעל פני הים?');
const feedback = async (page) => (await page.locator('#scene-coordinates [id$="-feedback"][aria-live="polite"]').innerText()).trim();
const check = (page) => page.getByRole('button', { name: 'בדיקת תשובה' }).click();
/** The pins over the model: centre-bottom, opacity, pressed. */
const pins = (page) =>
  page.evaluate((sel) => {
    const stage = document.querySelector(sel);
    return Object.fromEntries(
      [...stage.querySelectorAll('button[aria-label^="תחנה"], span.absolute.flex.flex-col')]
        .filter((b) => /^[ABC]$/.test(b.textContent.trim()))
        .map((b) => {
          const r = b.getBoundingClientRect();
          return [b.textContent.trim(), { x: Math.round(r.x + r.width / 2), y: Math.round(r.bottom), o: Number(getComputedStyle(b).opacity), pressed: b.getAttribute('aria-pressed') }];
        }),
    );
  }, STAGE);
/** The section's station pins: which one is the orange (picked) one. */
const sectionPicked = (page) =>
  page.evaluate((sel) => {
    const heads = [...document.querySelectorAll(`${sel} span.rounded-full`)].filter((s) => /^[ABC]$/.test(s.textContent.trim()));
    return heads.filter((s) => s.className.includes('bg-accent')).map((s) => s.textContent.trim());
  }, SECTION);
const sectionPaths = (page) => page.evaluate((sel) => [...document.querySelectorAll(`${sel} path`)].map((p) => p.getAttribute('d')).join('|'), SECTION);
const stageFocus = (page) => page.locator(`${STAGE} [role="img"][tabindex="0"]`).focus();
async function keys(page, ...ks) {
  for (const k of ks) {
    await page.keyboard.press(k);
    await page.waitForTimeout(40);
  }
}
async function dragOn(page, sel, dx, dy, from = { fx: 0.5, fy: 0.6 }) {
  const b = await page.locator(sel).first().boundingBox();
  const x = b.x + b.width * from.fx;
  const y = b.y + b.height * from.fy;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 6 });
  await page.mouse.move(x + dx, y + dy, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}
const near = (a, b, t = 0.6) => Math.abs(a - b) <= t;
/** An angle on the circle (0 … 360). */
const circ = (a) => ((a % 360) + 360) % 360;
const sameAz = (a, b, t = 0.6) => Math.min(circ(a - b), 360 - circ(a - b)) <= t;
const cardText = (page) => page.locator(CARD).locator('xpath=ancestor::div[contains(@class,"surface-elevated")][1]').innerText();

// ---------------------------------------------------------------- views and layout
const { ctx, page, errors } = await open();
const layouts = {};
const VIEWS = [
  ['פני השטח', 'surface'],
  ['אליפסואיד', 'ellipsoid'],
  ['גיאואיד', 'geoid'],
  ['גליות וגובה', 'undulation'],
];
for (const [name, file] of VIEWS) {
  await tab(page, name).click();
  await page.waitForTimeout(1300);
  await scrollCard(page);
  await page.waitForTimeout(400);
  layouts[file] = await layoutOf(page);
  await shot(page, `view-${file}`);
}
for (const [v, l] of Object.entries(layouts)) {
  expect(l.bottom <= H, `${v}: the card does not fit the screen (${l.top}–${l.bottom})`);
  expect(!l.innerScroll, `${v}: something inside the card scrolls on its own`);
  expect(l.sideBySide, `${v}: the model is not at inline-start beside the section`);
  expect(l.sameHeight, `${v}: the two figures differ in height (${JSON.stringify(l.model)} / ${JSON.stringify(l.section)})`);
  expect(l.textAcross, `${v}: the view's text is not across the card`);
}
expect(!(await cardText(page)).includes('גררו כדי לסובב'), 'the "גררו כדי לסובב" tag is still shown');

// ---------------------------------------------------------------- the profile, the full turn, the reset
await tab(page, 'פני השטח').click();
await page.waitForTimeout(1200);
let v = await land(page);
expect(near(v[0], 0) && near(v[1], 9), `the surface view does not open in profile: ${v}`);
await shot(page, 'surface-profile');
const sec0 = await sectionPaths(page);
const pins0 = await pins(page);
await stageFocus(page);
// a full turn to the left (arrow keys, 10° a step), through the back, and on past 360
await keys(page, ...Array(18).fill('ArrowLeft'));
v = await land(page);
expect(near(v[0], 180), `half a turn by keys did not reach the back: ${v}`);
await page.waitForTimeout(500);
await shot(page, 'surface-back');
const pinsBack = await pins(page);
expect(pinsBack.A.x < pinsBack.C.x, 'from behind, A is not on the left of C (the model is not seen from behind)');
await keys(page, ...Array(22).fill('ArrowLeft'));
v = await land(page);
expect(near(v[0], 400), `the turn stopped or folded instead of running on past 360: ${v}`);
// and the other way, by drag, far past −360
for (let i = 0; i < 6; i++) await dragOn(page, STAGE, 600, 0);
v = await land(page);
expect(v[0] < -700, `dragging the other way did not keep turning past −360: ${v}`);
for (const [deg, file] of [
  [0, 'walls-front'],
  [90, 'walls-right'],
  [180, 'walls-back'],
  [270, 'walls-left'],
]) {
  // to each side, a little raised
  await button(page, 'מבט התחלתי').click();
  await page.waitForTimeout(900);
  await stageFocus(page);
  await keys(page, ...Array(deg / 10).fill('ArrowLeft'), 'ArrowUp', 'ArrowUp');
  await page.waitForTimeout(500);
  if (deg === 180) {
    const p = await pins(page);
    expect(Object.values(p).some((q) => q.o < 0.9), 'from behind, no station is drawn as hidden by the ground');
  }
  await page.locator(`${ILL} figure`).first().screenshot({ path: `${outDir}/${file}.png` });
}
expect((await sectionPaths(page)) === sec0, 'turning moved the section');
// "מבט התחלתי" comes back the short way
await stageFocus(page);
await keys(page, ...Array(35).fill('ArrowLeft'));
v = await land(page);
await button(page, 'מבט התחלתי').click();
await page.waitForTimeout(900);
const back = await land(page);
expect(sameAz(back[0], 0) && near(back[1], 9), `"מבט התחלתי" did not bring back the profile: ${back}`);
expect(Math.abs(back[0] - v[0]) <= 180.5, `"מבט התחלתי" went the long way round: ${v} → ${back}`);
const pinsAgain = await pins(page);
expect(Math.abs(pinsAgain.B.x - pins0.B.x) < 2 && Math.abs(pinsAgain.B.y - pins0.B.y) < 2, 'the profile pins are not back');

// the views keep their own angle: the geoid view opens at its own, the surface keeps the reader's
await stageFocus(page);
await keys(page, 'ArrowLeft', 'ArrowLeft', 'ArrowUp');
const kept = await land(page);
await tab(page, 'גיאואיד').click();
await page.waitForTimeout(1200);
const geoOpen = await land(page);
expect(sameAz(geoOpen[0], -20) && near(geoOpen[1], 25), `the geoid view does not open at its own angle: ${geoOpen}`);
await tab(page, 'פני השטח').click();
await page.waitForTimeout(1200);
const keptBack = await land(page);
expect(sameAz(keptBack[0], kept[0]) && near(keptBack[1], kept[1]), `coming back to the surface view lost its angle: ${kept} → ${keptBack}`);

// a drag that starts on a pin turns, never picks; a short click picks
const pinsNow = await pins(page);
await page.mouse.move(pinsNow.A.x, pinsNow.A.y - 22);
await page.mouse.down();
await page.mouse.move(pinsNow.A.x + 60, pinsNow.A.y - 16, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(300);
expect((await stationButton(page, 'B').getAttribute('aria-pressed')) === 'true', 'a drag that started on pin A picked it');
await button(page, 'מבט התחלתי').click();
await page.waitForTimeout(900);

// ---------------------------------------------------------------- stations: model, section, buttons
for (const [how, id, act] of [
  ['the model', 'A', async () => page.locator(`${STAGE} button[aria-label^="תחנה A"]`).click()],
  ['the section', 'C', async () => page.locator(`${SECTION} button`).filter({ hasText: 'C' }).click()],
  ['the buttons', 'B', async () => stationButton(page, 'B').click()],
]) {
  await act();
  await page.waitForTimeout(250);
  expect((await stationButton(page, id).getAttribute('aria-pressed')) === 'true', `${how}: ${id} not picked on the buttons`);
  expect((await pins(page))[id].pressed === 'true', `${how}: ${id} not picked on the model`);
  expect(JSON.stringify(await sectionPicked(page)) === JSON.stringify([id]), `${how}: the section does not mark ${id}`);
}

// ---------------------------------------------------------------- the ellipsoid: identify → enlarge → linked
await tab(page, 'אליפסואיד').click();
await page.waitForTimeout(900);
expect((await phase(page)) === 'identify', 'the ellipsoid view does not open on the plain section');
const longLines = await page.evaluate((sel) => {
  const g = document.querySelector(sel).getBoundingClientRect();
  return [...document.querySelectorAll(`${sel} svg line`)].filter((l) => l.getBoundingClientRect().width > g.width * 0.45).length;
}, ILL);
expect(longLines === 0, 'a long callout line still crosses between the figures');
await shot(page, 'ellipsoid-identify');
await button(page, 'הגדלת האזור').click();
await page.waitForTimeout(120);
expect((await phase(page)) === 'zooming', 'one click did not start the enlargement');
expect((await page.locator(`${ILL} > span.border-2`).count()) === 1, 'no frame flies from the marked area');
await page.waitForTimeout(250);
await shot(page, 'ellipsoid-growing');
await page.waitForTimeout(1100);
expect((await phase(page)) === 'linked', 'the enlargement did not settle linked to the section');
await shot(page, 'ellipsoid-zoomed');
await page.getByRole('img', { name: /^אליפסואיד:/ }).focus();
await keys(page, 'ArrowLeft', 'ArrowLeft');
expect((await phase(page)) === 'linked', 'turning the body undid the enlargement');
await button(page, 'מהצד').click();
await page.waitForTimeout(800);
expect(near((await ell(page))[1], 0), 'side view: wrong tilt');
await button(page, 'מלמעלה').click();
await page.waitForTimeout(800);
expect(near((await ell(page))[1], 90), 'top view: wrong tilt');
await shot(page, 'ellipsoid-zoomed-top');
await button(page, 'חזרה למבט הכללי').click();
await page.waitForTimeout(400);
expect((await phase(page)) === 'identify', '"חזרה למבט הכללי" did not return to the plain section');
// "back" in the middle of the growth cancels it for good
await button(page, 'הגדלת האזור').click();
await page.waitForTimeout(200);
await button(page, 'חזרה למבט הכללי').click();
await page.waitForTimeout(1400);
expect((await phase(page)) === 'identify', 'a "back" during the growth did not cancel it');
await button(page, 'מבט התחלתי').click();
await page.waitForTimeout(900);

// ---------------------------------------------------------------- the geoid: solid → see-through → solid
await tab(page, 'גיאואיד').click();
await page.waitForTimeout(1200);
expect((await attr(page, STAGE, 'data-clear')) === 'false', 'the geoid view does not open on solid ground');
await shot(page, 'geoid-solid');
await button(page, 'חשיפת משטחי הייחוס').click();
await page.waitForTimeout(1300);
expect((await attr(page, STAGE, 'data-clear')) === 'true', 'the reveal did not make the ground see-through');
expect((await page.getByRole('button', { name: 'החזרת פני השטח', exact: true }).count()) === 1, 'the reveal button does not offer the next action');
expect((await cardText(page)).includes('הקרקע שקופה כדי להציג את משטחי הייחוס שמתחתיה.'), 'the see-through sentence is missing');
await shot(page, 'geoid-clear');
await stageFocus(page);
await keys(page, 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowUp');
await page.waitForTimeout(500);
await shot(page, 'geoid-clear-turned');
expect(Object.values(await pins(page)).every((p) => p.o > 0.9), 'see-through: a station is still drawn as hidden');
await button(page, 'החזרת פני השטח').click();
await page.waitForTimeout(900);
expect((await attr(page, STAGE, 'data-clear')) === 'false', '"החזרת פני השטח" did not bring the ground back');
expect(!(await cardText(page)).includes('הקרקע שקופה'), 'the see-through sentence stays on solid ground');
await button(page, 'חשיפת משטחי הייחוס').click();
await page.waitForTimeout(300);
await tab(page, 'פני השטח').click();
await tab(page, 'גיאואיד').click();
await page.waitForTimeout(600);
expect((await attr(page, STAGE, 'data-clear')) === 'false', 'coming back to the geoid view did not start on solid ground');

// ---------------------------------------------------------------- the task
await tab(page, 'גליות וגובה').click();
await page.waitForTimeout(1300);
await scrollCard(page);
expect((await layoutOf(page)).bottom <= H, 'task: the card does not fit');
expect((await attr(page, STAGE, 'data-tripod')) === 'B', 'task view: the receiver is not at B');
expect((await input(page).inputValue()) === '', 'B does not open empty');
expect(!/\b120\b/.test(await cardText(page)), 'an H value is visible before checking');
const letters = await page.evaluate(
  ({ stage, section }) => ({
    model: [...document.querySelectorAll(`${stage} *`)].filter((e) => e.children.length === 0 && /^[HhN]$/.test(e.textContent.trim())).length,
    section: [...document.querySelectorAll(`${section} *`)].filter((e) => e.children.length === 0 && /^[HhN]$/.test(e.textContent.trim())).map((e) => e.textContent.trim()),
  }),
  { stage: STAGE, section: SECTION },
);
expect(letters.model === 0, 'height letters are drawn over the model');
expect(JSON.stringify(letters.section.sort()) === JSON.stringify(['H', 'N', 'h']), `the section's height letters: ${letters.section}`);
await shot(page, 'mission-B-open');

await check(page);
expect((await feedback(page)).includes('הזינו ערך'), 'empty input not rejected');
await input(page).fill('148');
await input(page).press('Enter');
expect((await feedback(page)).includes('מעל האליפסואיד'), 'h-instead-of-H hint missing (Enter)');
await scrollCard(page);
expect((await layoutOf(page)).bottom <= H, 'the hint pushed the card off screen');
await shot(page, 'mission-B-gave-h');
await input(page).fill('119.9');
await check(page);
expect((await feedback(page)).startsWith('עדיין לא'), '119.9 accepted');
await stationButton(page, 'C').click();
expect((await input(page).inputValue()) === '', 'C does not start empty');
expect((await attr(page, STAGE, 'data-tripod')) === 'C', 'the receiver did not follow the pick');
await stationButton(page, 'B').click();
expect((await input(page).inputValue()) === '119.9', 'B draft lost after switching stations');

// turning, the reveal, the enlargement and the other views keep the task
const dataBefore = await page.locator('#scene-coordinates [role="tabpanel"] dl').innerText();
const secBefore = await sectionPaths(page);
await dragOn(page, STAGE, 140, 30);
expect((await sectionPaths(page)) === secBefore, 'task view: turning moved the section');
expect((await page.locator('#scene-coordinates [role="tabpanel"] dl').innerText()) === dataBefore, 'task view: turning changed the data');
await tab(page, 'גיאואיד').click();
await button(page, 'חשיפת משטחי הייחוס').click();
await tab(page, 'אליפסואיד').click();
await button(page, 'הגדלת האזור').click();
await page.waitForTimeout(1400);
await tab(page, 'גליות וגובה').click();
await page.waitForTimeout(900);
expect((await input(page).inputValue()) === '119.9' && (await feedback(page)).startsWith('עדיין לא'), 'the reveal / the enlargement / switching views touched the task');
await button(page, 'מבט התחלתי').click();
await page.waitForTimeout(900);
expect((await input(page).inputValue()) === '119.9', '"מבט התחלתי" touched the task');

await input(page).fill('120.0');
await input(page).press('Enter');
const fbB = await feedback(page);
expect(fbB.includes('נכון') && fbB.includes('148 − 28 = 120'), `B correct feedback wrong: ${fbB}`);
await scrollCard(page);
await shot(page, 'mission-B-correct');
await button(page, 'לתחנה הבאה').click();
await page.waitForTimeout(700);
expect((await stationButton(page, 'A').getAttribute('aria-pressed')) === 'true', 'next after B is not A');
await input(page).fill('6');
await check(page);
expect((await feedback(page)).includes('סימן הפעולה'), 'h+N hint missing at A');
await scrollCard(page);
expect((await layoutOf(page)).bottom <= H, 'the A hint pushed the card off screen');
await shot(page, 'mission-A-wrong');
await input(page).fill('30');
await check(page);
expect((await feedback(page)).includes('18 − (−12) = 30'), 'A worked sum missing');
await button(page, 'לתחנה הבאה').click();
await page.waitForTimeout(700);
await input(page).fill('220');
await check(page);
const fbC = await feedback(page);
expect(fbC.includes('220 − 0 = 220') && fbC.includes('3/3'), `C / completion feedback wrong: ${fbC}`);
await page.waitForTimeout(500);
await scrollCard(page);
const done = await layoutOf(page);
expect(done.bottom <= H && !done.innerScroll, `the completed task left the screen: ${done.bottom}`);
await shot(page, 'mission-complete');
await dragOn(page, STAGE, -90, 0);
await button(page, 'מבט התחלתי').click();
await page.waitForTimeout(900);
expect((await feedback(page)).includes('3/3'), '"מבט התחלתי" reset the task');
await page.getByRole('button', { name: 'איפוס המשימה' }).click();
await page.waitForTimeout(300);
expect((await stationButton(page, 'B').getAttribute('aria-pressed')) === 'true' && (await input(page).inputValue()) === '', '"איפוס המשימה" did not clear the task');

// ---------------------------------------------------------------- keyboard
await tab(page, 'גליות וגובה').focus();
await page.keyboard.press('Home');
expect((await tab(page, 'פני השטח').getAttribute('aria-selected')) === 'true', 'Home did not go to the first tab');
await page.keyboard.press('ArrowLeft');
expect((await tab(page, 'אליפסואיד').getAttribute('aria-selected')) === 'true', '← did not go to the next tab');
await page.keyboard.press('End');
expect((await tab(page, 'גליות וגובה').getAttribute('aria-selected')) === 'true', 'End did not go to the last tab');

expect(errors.length === 0, `console / request errors: ${errors.slice(0, 5).join(' | ')}`);
await ctx.close();

// ---------------------------------------------------------------- reduced motion
{
  const r = await open({ reducedMotion: 'reduce' });
  await tab(r.page, 'אליפסואיד').click();
  await button(r.page, 'הגדלת האזור').click();
  await r.page.waitForTimeout(60);
  expect((await phase(r.page)) === 'linked', 'reduced motion: the enlargement does not switch at once');
  expect((await r.page.locator(`${ILL} > span.border-2`).count()) === 0, 'reduced motion: a frame still flies');
  await shot(r.page, 'reduced-motion-zoomed');
  await tab(r.page, 'גיאואיד').click();
  await r.page.waitForTimeout(60);
  const g = await land(r.page);
  expect(sameAz(g[0], -20) && near(g[1], 25), `reduced motion: the view does not switch at once (${g})`);
  await button(r.page, 'חשיפת משטחי הייחוס').click();
  expect((await attr(r.page, STAGE, 'data-clear')) === 'true', 'reduced motion: the reveal does not switch');
  await r.page.waitForTimeout(400);
  await shot(r.page, 'reduced-motion-clear');
  expect(r.errors.length === 0, `reduced motion: errors: ${r.errors.slice(0, 3).join(' | ')}`);
  await r.ctx.close();
}

// ---------------------------------------------------------------- without WebGL
{
  const nb = await chromium.launch({ channel: 'chrome', args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
  const r = await open({}, nb, false);
  expect((await r.page.getByRole('button', { name: 'מבט התחלתי', exact: true }).count()) === 0, 'no WebGL: "מבט התחלתי" offered for a landscape that cannot turn');
  expect((await r.page.locator(`${STAGE} img`).count()) >= 5, 'no WebGL: the stills are missing');
  await shot(r.page, 'no-webgl-surface');
  await r.page.locator(`${STAGE} button[aria-label^="תחנה A"]`).click();
  expect((await stationButton(r.page, 'A').getAttribute('aria-pressed')) === 'true', 'no WebGL: a pin does not pick');
  const shownIn = (p) => p.evaluate((sel) => [...document.querySelectorAll(`${sel} img`)].filter((i) => getComputedStyle(i).opacity === '1').map((i) => i.getAttribute('src').split('/').pop()), STAGE);
  await tab(r.page, 'גיאואיד').click();
  await button(r.page, 'חשיפת משטחי הייחוס').click();
  await r.page.waitForTimeout(700);
  const shown = await shownIn(r.page);
  expect(JSON.stringify(shown) === JSON.stringify(['fallback-clear.webp']), `no WebGL: the reveal shows ${shown}`);
  await shot(r.page, 'no-webgl-clear');
  await tab(r.page, 'גליות וגובה').click();
  await r.page.waitForTimeout(700);
  const task = await shownIn(r.page);
  expect(JSON.stringify(task) === JSON.stringify(['fallback-task-A.webp']), `no WebGL: the task shows ${task}`);
  await input(r.page).fill('30');
  await check(r.page);
  expect((await feedback(r.page)).includes('נכון'), 'no WebGL: the task does not work');
  await shot(r.page, 'no-webgl-task');
  expect(r.errors.length === 0, `no WebGL: errors: ${r.errors.slice(0, 3).join(' | ')}`);
  await r.ctx.close();
  await nb.close();
}

await browser.close();
console.log('layouts', JSON.stringify(layouts));
if (warnings.size) console.log(`warnings (other blocks): ${[...warnings].slice(0, 5).join(' | ')}`);
if (failures.length) {
  console.log(`FAIL (${failures.length})`);
  for (const f of failures) console.log(' -', f);
  process.exit(1);
}
console.log('PASS');
