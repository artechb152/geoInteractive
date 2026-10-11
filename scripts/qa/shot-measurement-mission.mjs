// QA for the measurement mission in #scene-coordinates ("אליפסואיד, גיאואיד וגליות").
//
// Usage (dev server on :3000):
//   node scripts/qa/shot-measurement-mission.mjs [outDir] [--quick]
//
// Renders the real lesson route at 1440 × 1122 after ordinary navigation: the
// page scrolled so the activity card sits just under the site's fixed header.
// The landscape is the live WebGL model (headless Chrome: SwiftShader); the
// fallback renders are checked with WebGL switched off. Exit code 1 on any failure:
//   layout      the whole card is on screen; no empty band at its foot; all four
//               views share one height, and the task keeps it through every state
//   turning     the landscape turns by drag and by the arrow keys in all three
//               landscape views, its pins move with it, the section does not;
//               a drag that starts on a pin never picks it, a short click does;
//               a point the ground hides gets the hidden pin and a quiet link;
//               "מבט התחלתי" brings back the opening view and nothing else
//   ellipsoid   drag, keys, the side / top buttons (one view state: a drag
//               after "מהצד" keeps it side-on until it tilts), the callout follows
//               the marked area, the section comes into focus when the area is
//               turned to the middle, "מבט התחלתי"
//   geoid       the cut opens by itself, the button closes and reopens it
//   stations    A/B/C picked on the model, on the section or with the buttons
//               pick it everywhere: panel, pin, section, receiver, arrows
//   mission     B opens empty; 148 → h hint; 119.9 wrong; 120.0 correct; next →
//               A; 6 → sign hint; 30 correct; C 220 correct → 3/3; drafts kept;
//               no H value before checking; turning and view resets keep the task;
//               "איפוס המשימה" → B empty
//   keyboard    Enter checks; ←/→/Home/End move between tabs
//   motion      reduced motion: the cut and the task framing switch at once
//   no WebGL    the renders, no turning offered, pins and task work
//   console     no page errors, no failed request for this block's files
// Writes per-state screenshots, a 2 × 2 sheet of the four views, and an
// overlay / diff against the mockup (composition check of the activity card).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('../../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp');

const outDir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'design/screenshots/measurement-mission-interactive/qa';
const QUICK = process.argv.includes('--quick');
const URL = 'http://localhost:3000/lessons/topic-02/#scene-coordinates';
const MOCKUP = 'design/mockups/topic-02-geodesy/03-measurement-mission-v2.png';
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
const STAGE = '#scene-coordinates [data-landscape]';

async function open(opts = {}, b = browser, live = true) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // Resource errors are judged by URL below; other blocks on this page are not this check's business.
  page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(m.text()));
  page.on('response', (r) => {
    if (r.status() < 400) return;
    if (r.url().includes('/reference-assets/measurement-mission/')) errors.push(`${r.status()} ${r.url()}`);
    else warnings.add(`${r.status()} ${r.url()}`);
  });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector(CARD, { timeout: 30000 });
  await scrollCard(page);
  await page.waitForSelector(`${STAGE}[data-landscape="${live ? 'live' : 'renders'}"]`, { timeout: 60000 });
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
/** Card box, the empty band at its foot (inside the padding), and whether anything in it scrolls on its own. */
const layoutOf = (page) =>
  page.evaluate((sel) => {
    const c = document.querySelector(sel).closest('.surface-elevated');
    const panel = c.querySelector('[role="tabpanel"]');
    const cb = c.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(c).paddingBottom);
    const [textCol, stageCol] = panel.children;
    const contentBottom = Math.max(textCol.getBoundingClientRect().bottom, stageCol.getBoundingClientRect().bottom);
    const innerScroll = [...c.querySelectorAll('*')].some((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1);
    return { top: Math.round(cb.top), bottom: Math.round(cb.bottom), height: Math.round(cb.height), footGap: Math.round(cb.bottom - pad - contentBottom), innerScroll };
  }, CARD);
const attr = (page, sel, name) => page.locator(sel).first().getAttribute(name);
const land = async (page) => (await attr(page, '#scene-coordinates [data-land]', 'data-land')).split(',').map(Number);
const ell = async (page) => (await attr(page, '#scene-coordinates [data-ell]', 'data-ell')).split(',').map(Number);
const tab = (page, name) => page.getByRole('tab', { name, exact: true });
const shot = (page, name) => page.screenshot({ path: `${outDir}/${name}.png` });
const visiblePanel = (page) => page.locator('#scene-coordinates [role="tabpanel"] > div:first-child');
const input = (page) => page.getByLabel('מהו הגובה מעל פני הים?');
const feedback = async (page) => (await page.locator('#scene-coordinates [id$="-feedback"][aria-live="polite"]').innerText()).trim();
const check = (page) => page.getByRole('button', { name: 'בדיקת תשובה' }).click();
const pressed = (loc) => loc.getAttribute('aria-pressed');
/** The pins over the model (not the panel's buttons): centre-bottom, opacity, pressed. */
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
const sectionPaths = (page) => page.evaluate(() => [...document.querySelectorAll('#scene-coordinates [role="img"][dir="ltr"] path')].map((p) => p.getAttribute('d')).join('|'));
const stageFocus = (page) => page.locator(`${STAGE} [role="img"][tabindex="0"]`).focus();
async function dragOn(page, sel, dx, dy, from = { fx: 0.5, fy: 0.8 }) {
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
  await page.waitForTimeout(file === 'geoid' ? 1800 : 1100);
  await scrollCard(page);
  await page.waitForTimeout(500);
  layouts[file] = await layoutOf(page);
  await shot(page, `view-${file}`);
}
for (const [v, l] of Object.entries(layouts)) {
  expect(l.bottom <= H, `${v}: the card does not fit the screen (${l.top}–${l.bottom})`);
  expect(l.footGap <= 2, `${v}: empty band at the card's foot (${l.footGap} px)`);
  expect(!l.innerScroll, `${v}: something inside the card scrolls on its own`);
}
expect(new Set(Object.values(layouts).map((l) => l.height)).size === 1, `the views differ in height: ${JSON.stringify(layouts)}`);

// ---------------------------------------------------------------- the task
const panelText = async () => await visiblePanel(page).innerText();
expect((await panelText()).includes('תחנת מדידה B'), 'mission does not open on B');
expect((await input(page).inputValue()) === '', 'B does not open empty');
expect(!/H\s*=\s*120/.test(await page.locator('#scene-coordinates').innerText()), 'H value visible before checking');
expect((await attr(page, STAGE, 'data-open')) === 'true', 'task view: the model is not opened along the line');
expect((await attr(page, STAGE, 'data-tripod')) === 'B' && (await attr(page, STAGE, 'data-arrows')) === 'B', 'task view: the receiver and the heights are not at B');
expect((await attr(page, STAGE, 'data-framing')) === '1.00', 'task view: not framed on the survey line');
await shot(page, 'mission-B-open');

await check(page);
expect((await feedback(page)).includes('הזינו ערך'), 'empty input not rejected');
await input(page).fill('abc');
await input(page).press('Enter');
expect((await feedback(page)).includes('הזינו מספר'), 'non-numeric input not rejected (Enter)');
await input(page).fill('148');
await check(page);
expect((await feedback(page)).includes('מעל האליפסואיד'), 'h-instead-of-H hint missing');
await shot(page, 'mission-B-gave-h');
expect(Math.round((await layoutOf(page)).height) === layouts.undulation.height, 'a hint moved the card height');
await input(page).fill('119.9');
await check(page);
expect((await feedback(page)).startsWith('עדיין לא'), '119.9 accepted');
await page.getByRole('button', { name: 'תחנה C', exact: true }).first().click();
expect((await input(page).inputValue()) === '', 'C does not start empty');
await page.getByRole('button', { name: 'תחנה B', exact: true }).first().click();
expect((await input(page).inputValue()) === '119.9', 'B draft lost after switching stations');

// turning in the task view keeps the task and the data
const dataBefore = await page.locator('#scene-coordinates [role="tabpanel"] dl').innerText();
const secBefore = await sectionPaths(page);
const pinsBefore = await pins(page);
await dragOn(page, STAGE, 120, 40);
const pinsTurned = await pins(page);
expect(Math.abs(pinsTurned.B.x - pinsBefore.B.x) + Math.abs(pinsTurned.B.y - pinsBefore.B.y) > 8, 'task view: the model does not turn');
expect((await sectionPaths(page)) === secBefore, 'task view: turning moved the section');
expect((await page.locator('#scene-coordinates [role="tabpanel"] dl').innerText()) === dataBefore, 'task view: turning changed the station data');
expect((await input(page).inputValue()) === '119.9', 'task view: turning lost the draft');
await shot(page, 'mission-B-turned');
await page.getByRole('button', { name: 'מבט התחלתי' }).first().click();
await page.waitForTimeout(900);
const back = await land(page);
expect(near(back[0], 4) && near(back[1], 55), `"מבט התחלתי" did not bring back the opening view: ${back}`);
expect((await input(page).inputValue()) === '119.9' && (await feedback(page)).startsWith('עדיין לא'), '"מבט התחלתי" touched the task');

await input(page).fill('120.0');
await input(page).press('Enter');
const fbB = await feedback(page);
expect(fbB.includes('נכון') && fbB.includes('148 − 28 = 120'), `B correct feedback wrong: ${fbB}`);
await page.waitForTimeout(400);
await shot(page, 'mission-B-correct');

// views keep the mission
await tab(page, 'פני השטח').click();
await tab(page, 'גליות וגובה').click();
await page.waitForTimeout(500);
expect((await feedback(page)).includes('נכון'), 'switching views erased the mission');

await page.getByRole('button', { name: 'לתחנה הבאה' }).click();
await page.waitForTimeout(900);
expect((await panelText()).includes('תחנת מדידה A'), 'next after B is not A');
expect((await attr(page, STAGE, 'data-tripod')) === 'A', 'the receiver did not move to A');
await input(page).fill('6');
await check(page);
expect((await feedback(page)).includes('סימן הפעולה'), 'h+N hint missing at A');
await input(page).fill('−30');
await check(page);
expect((await feedback(page)).startsWith('עדיין לא'), '−30 accepted at A');
await shot(page, 'mission-A-wrong');
await input(page).fill('30');
await check(page);
expect((await feedback(page)).includes('18 − (−12) = 30'), 'A worked sum missing');
await page.waitForTimeout(600);
await shot(page, 'mission-A-correct');
await page.getByRole('button', { name: 'לתחנה הבאה' }).click();
await page.waitForTimeout(900);
expect((await panelText()).includes('תחנת מדידה C'), 'next after A is not C');
await input(page).fill('220');
await check(page);
const fbC = await feedback(page);
expect(fbC.includes('220 − 0 = 220') && fbC.includes('3/3'), `C / completion feedback wrong: ${fbC}`);
expect((await page.getByRole('button', { name: 'לתחנה הבאה' }).count()) === 0, '"next" offered after 3/3');
await page.waitForTimeout(600);
await scrollCard(page);
await shot(page, 'mission-complete');
const done = await layoutOf(page);
expect(done.height === layouts.undulation.height && done.bottom <= H, `card height moved during the mission or left the screen: ${layouts.undulation.height} → ${done.height}`);

// a view reset after 3/3 keeps 3/3
await dragOn(page, STAGE, -90, 0);
await page.getByRole('button', { name: 'מבט התחלתי' }).first().click();
await page.waitForTimeout(900);
expect((await feedback(page)).includes('3/3'), '"מבט התחלתי" reset the task');

// stations: picked on the section, on the model or with the buttons — the same station everywhere
/** A station's point in the section (a pointer-only button inside the station's group). */
const sectionPoint = async (id) => {
  const all = await page.evaluate(() =>
    [...document.querySelectorAll('#scene-coordinates [role="img"][dir="ltr"] button')].map((x) => {
      const r = x.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: x.parentElement.textContent.trim() };
    }),
  );
  return all.find((p) => p.t === id);
};
const pA = await sectionPoint('A');
await page.mouse.click(pA.x, pA.y);
await page.waitForTimeout(400);
expect((await panelText()).includes('תחנת מדידה A'), 'section: clicking A in the section does not pick A');
expect((await pins(page)).A.pressed === 'true' && (await attr(page, STAGE, 'data-tripod')) === 'A', 'section: picking A there does not move the pin highlight and the receiver');
await page.locator(`${STAGE} button[aria-label^="תחנה C"]`).click();
await page.waitForTimeout(400);
expect((await panelText()).includes('תחנת מדידה C') && (await attr(page, STAGE, 'data-arrows')) === 'C', 'model: pin C does not pick C everywhere');

await page.getByRole('button', { name: 'איפוס המשימה' }).click();
await page.waitForTimeout(600);
expect((await panelText()).includes('תחנת מדידה B') && (await input(page).inputValue()) === '' && (await feedback(page)) === '', 'reset did not return to an empty B');

// ---------------------------------------------------------------- surface: turn the bare landscape; pick on it
await tab(page, 'פני השטח').click();
await page.waitForTimeout(900);
await scrollCard(page);
expect((await attr(page, STAGE, 'data-open')) === 'false' && (await attr(page, STAGE, 'data-framing')) === '0.00', 'surface: the model is not whole and closed');
for (const name of ['הרים', 'גיא', 'ים']) {
  expect((await page.locator('#scene-coordinates span', { hasText: new RegExp(`^${name}$`) }).count()) >= 1, `surface: place name ${name} missing`);
}
const s0 = await pins(page);
const sec0 = await sectionPaths(page);
// a drag that starts on pin C turns the model and does not pick C
const pc = await page.locator(`${STAGE} button[aria-label^="תחנה C"]`).boundingBox();
await page.mouse.move(pc.x + pc.width / 2, pc.y + 10);
await page.mouse.down();
await page.mouse.move(pc.x + pc.width / 2 + 50, pc.y + 14, { steps: 6 });
await page.mouse.move(pc.x + pc.width / 2 + 110, pc.y + 20, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(400);
const s1 = await pins(page);
expect(Math.abs(s1.C.x - s0.C.x) + Math.abs(s1.C.y - s0.C.y) > 8, 'surface: dragging does not turn the model');
expect((await visiblePanel(page).innerText()).includes('תחנת מדידה B'), 'surface: a drag from pin C picked C');
expect((await sectionPaths(page)) === sec0, 'surface: turning moved the section');
const az1 = (await land(page))[0];
await stageFocus(page);
await page.keyboard.press('ArrowLeft');
await page.keyboard.press('ArrowUp');
await page.waitForTimeout(300);
const k = await land(page);
expect(!near(k[0], az1, 1), 'surface: the arrow keys do not turn the model');
await shot(page, 'surface-turned');
// the land view is shared: the geoid view opens at the same angle
await tab(page, 'גיאואיד').click();
await page.waitForTimeout(300);
expect((await land(page)).join() === k.join(), 'geoid: the landscape view was not kept between views');
await tab(page, 'פני השטח').click();
await page.waitForTimeout(500);
// a low angle from the left: the ground hides A
await page.getByRole('button', { name: 'מבט התחלתי' }).first().click();
await page.waitForTimeout(900);
await stageFocus(page);
for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');
for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
await page.getByRole('group', { name: 'בחירת תחנה' }).getByRole('button', { name: 'תחנה A' }).click();
await page.waitForTimeout(400);
const low = await pins(page);
expect(low.A.o < 0.9 && low.B.o === 1, `surface: the hidden station is not drawn as hidden (${JSON.stringify(low)})`);
expect((await page.locator('#scene-coordinates svg line[stroke-dasharray="2 4"]').count()) === 1, 'surface: the link to a hidden station is not quiet');
await shot(page, 'surface-A-hidden');
// a short click picks
await page.locator(`${STAGE} button[aria-label^="תחנה C"]`).click();
await page.waitForTimeout(300);
expect((await visiblePanel(page).innerText()).includes('תחנת מדידה C'), 'surface: the pin does not pick C');
await page.getByRole('button', { name: 'מבט התחלתי' }).first().click();
await page.waitForTimeout(900);
const s2 = await pins(page);
expect(Math.abs(s2.B.x - s0.B.x) <= 1 && Math.abs(s2.B.y - s0.B.y) <= 1, 'surface: "מבט התחלתי" does not bring the pins back');
await shot(page, 'surface-C');
await page.getByRole('group', { name: 'בחירת תחנה' }).getByRole('button', { name: 'תחנה B' }).click();
expect((await visiblePanel(page).innerText()).includes('תחנת מדידה B'), 'surface: the station row does not pick B');

// ---------------------------------------------------------------- ellipsoid: one view state
await tab(page, 'אליפסואיד').click();
await page.waitForTimeout(800);
const body = page.locator('#scene-coordinates [role="img"][aria-label^="אליפסואיד:"]');
expect((await body.count()) === 1, 'ellipsoid: the body is not on the stage');
const callout = () => page.evaluate(() => [...document.querySelectorAll('#scene-coordinates svg line[stroke="#D97E2B"]')].map((l) => l.getAttribute('x1') + ',' + l.getAttribute('y1')).join('|'));
const focus = async () => Number(await attr(page, '#scene-coordinates [data-focus]', 'data-focus'));
const c0 = await callout();
const f0 = await focus();
expect(f0 < 0.3, `ellipsoid: the opening view is already in focus (${f0})`);
await dragOn(page, '#scene-coordinates [role="img"][aria-label^="אליפסואיד:"]', -80, 0, { fx: 0.5, fy: 0.5 });
expect((await callout()) !== c0, 'ellipsoid: the callout does not follow the turning body');
// turn the area to the middle: the section comes into focus
await body.focus();
for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
const e1 = await ell(page);
for (let i = 0; i < 40 && (await focus()) < 0.97; i++) await page.keyboard.press(e1[0] > -52 ? 'ArrowLeft' : 'ArrowRight');
await page.waitForTimeout(300);
expect((await focus()) >= 0.97, `ellipsoid: the area never comes into focus (${await focus()})`);
const secOpacity = await page.evaluate(() => Number(document.querySelector('#scene-coordinates [role="img"][dir="ltr"] > div').style.opacity));
expect(secOpacity > 0.97, `ellipsoid: the section does not come into focus (${secOpacity})`);
await shot(page, 'ellipsoid-focus');
const top = page.getByRole('button', { name: 'מלמעלה' });
await top.click();
await page.waitForTimeout(900);
expect((await pressed(top)) === 'true' && near((await ell(page))[1], 90), 'ellipsoid: "from above" not pressed / not straight down');
await shot(page, 'ellipsoid-top');
const side = page.getByRole('button', { name: 'מהצד' });
await side.click();
await page.waitForTimeout(900);
expect((await pressed(side)) === 'true' && (await pressed(top)) === 'false' && near((await ell(page))[1], 0), 'ellipsoid: "from the side" not pressed');
await shot(page, 'ellipsoid-side');
// a sideways drag carries on from the button's view: still side-on
const sAz = (await ell(page))[0];
await dragOn(page, '#scene-coordinates [role="img"][aria-label^="אליפסואיד:"]', 70, 0, { fx: 0.5, fy: 0.5 });
const afterSide = await ell(page);
expect(!near(afterSide[0], sAz, 2) && near(afterSide[1], 0) && (await pressed(side)) === 'true', `ellipsoid: a drag after "מהצד" did not carry on from it (${afterSide})`);
await body.focus();
await page.keyboard.press('ArrowUp');
await page.waitForTimeout(200);
expect((await pressed(side)) === 'false', 'ellipsoid: tilting does not let go of "מהצד"');
await page.getByRole('button', { name: 'מבט התחלתי' }).first().click();
await page.waitForTimeout(900);
const e2 = await ell(page);
expect(near(e2[1], 16) && near((((e2[0] % 360) + 540) % 360) - 180, 0), `ellipsoid: "מבט התחלתי" did not bring back the opening view (${e2})`);

// ---------------------------------------------------------------- geoid: the cut
await tab(page, 'גיאואיד').click();
await page.waitForTimeout(1800);
const cutBtn = page.getByRole('button', { name: 'פתיחת חתך' });
expect((await pressed(cutBtn)) === 'true' && (await attr(page, STAGE, 'data-open')) === 'true', 'geoid: the cut did not open on entering');
for (const name of ['גיאואיד · פני הים', 'אליפסואיד']) {
  expect((await page.locator(`${STAGE} span`, { hasText: new RegExp(`^${name}$`) }).count()) >= 1, `geoid: the cut face's line ${name} is not named`);
}
await dragOn(page, STAGE, -100, -50);
await shot(page, 'geoid-turned');
await cutBtn.click();
await page.waitForTimeout(1000);
expect((await pressed(cutBtn)) === 'false' && (await attr(page, STAGE, 'data-open')) === 'false', 'geoid: closing the cut does not close the model');
await page.getByRole('button', { name: 'מבט התחלתי' }).first().click();
await page.waitForTimeout(900);
await scrollCard(page);
await shot(page, 'geoid-closed');
await cutBtn.click();
await page.waitForTimeout(1000);
expect((await attr(page, STAGE, 'data-open')) === 'true', 'geoid: the cut does not reopen');

// ---------------------------------------------------------------- keyboard on tabs
await tab(page, 'פני השטח').click();
await page.keyboard.press('ArrowLeft');
expect((await tab(page, 'אליפסואיד').getAttribute('aria-selected')) === 'true', 'ArrowLeft does not go to the next view');
await page.keyboard.press('End');
expect((await tab(page, 'גליות וגובה').getAttribute('aria-selected')) === 'true', 'End does not go to the last view');
await page.keyboard.press('Home');
expect((await tab(page, 'פני השטח').getAttribute('aria-selected')) === 'true', 'Home does not go to the first view');

expect(errors.length === 0, `page errors: ${errors.join(' | ')}`);
await ctx.close();

// ---------------------------------------------------------------- reduced motion
if (!QUICK) {
  const r = await open({ reducedMotion: 'reduce' });
  await tab(r.page, 'גיאואיד').click();
  await r.page.waitForTimeout(150);
  expect((await attr(r.page, STAGE, 'data-open')) === 'true', 'reduced motion: the cut does not open at once');
  await tab(r.page, 'גליות וגובה').click();
  await r.page.waitForTimeout(150);
  expect((await attr(r.page, STAGE, 'data-framing')) === '1.00', 'reduced motion: the task framing glides instead of switching');
  await dragOn(r.page, STAGE, 80, 0);
  expect(!near((await land(r.page))[0], 4, 1), 'reduced motion: dragging no longer turns the model');
  await r.page.getByRole('button', { name: 'מבט התחלתי' }).first().click();
  await r.page.waitForTimeout(80);
  const v = await land(r.page);
  expect(near(v[0], 4) && near(v[1], 55), 'reduced motion: "מבט התחלתי" is not immediate');
  await r.page.getByRole('button', { name: 'תחנה C', exact: true }).first().click();
  await r.page.waitForTimeout(400);
  await scrollCard(r.page);
  await r.page.screenshot({ path: `${outDir}/reduced-motion-C.png` });
  expect(r.errors.length === 0, `reduced-motion page errors: ${r.errors.join(' | ')}`);
  await r.ctx.close();
}
await browser.close();

// ---------------------------------------------------------------- no WebGL
// The renders stand in for the model; nothing offers to turn the landscape; pins and task work.
if (!QUICK) {
  const noGl = await chromium.launch({ channel: 'chrome', args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
  const p = await open({}, noGl, false);
  expect((await p.page.locator('#scene-coordinates canvas').count()) === 0, 'no-WebGL: a canvas was mounted');
  expect((await p.page.getByRole('button', { name: 'מבט התחלתי' }).count()) === 0, 'no-WebGL: "מבט התחלתי" offered for a landscape that does not turn');
  expect((await p.page.locator(`${STAGE} span`, { hasText: /^גררו כדי לסובב$/ }).count()) === 0, 'no-WebGL: the drag hint is shown');
  await tab(p.page, 'גליות וגובה').click();
  await p.page.waitForTimeout(500);
  expect((await p.page.locator('#scene-coordinates button[aria-label^="תחנה"][aria-pressed]').count()) === 6, 'no-WebGL: 3 pins + 3 panel buttons expected');
  await p.page.locator(`${STAGE} button[aria-label="תחנה A"]`).click();
  await p.page.getByLabel('מהו הגובה מעל פני הים?').fill('30');
  await p.page.getByRole('button', { name: 'בדיקת תשובה' }).click();
  expect((await p.page.locator('#scene-coordinates [id$="-feedback"]').innerText()).includes('18 − (−12) = 30'), 'no-WebGL: the task does not work');
  await scrollCard(p.page);
  await p.page.screenshot({ path: `${outDir}/no-webgl-A.png` });
  // the ellipsoid is SVG: it still turns
  await tab(p.page, 'אליפסואיד').click();
  await p.page.waitForTimeout(500);
  expect((await p.page.getByRole('button', { name: 'מבט התחלתי' }).count()) === 1, 'no-WebGL: the ellipsoid (SVG) lost its controls');
  expect(p.errors.length === 0, `no-WebGL page errors: ${p.errors.join(' | ')}`);
  await noGl.close();
}

// ---------------------------------------------------------------- the four views side by side
{
  const cardTop = 80 + BELOW_HEADER;
  const crop = { left: 64, top: cardTop - 8, width: 1060, height: Math.min(H - cardTop + 8, layouts.surface.height + 16) };
  const tiles = await Promise.all(VIEWS.map(([, f]) => sharp(`${outDir}/view-${f}.png`).extract(crop).resize(700).toBuffer()));
  const { width: tw, height: th } = await sharp(tiles[0]).metadata();
  await sharp({ create: { width: tw * 2 + 16, height: th * 2 + 16, channels: 3, background: '#ffffff' } })
    .composite(tiles.map((t, i) => ({ input: t, left: (i % 2) * (tw + 16), top: Math.floor(i / 2) * (th + 16) })))
    .png()
    .toFile(`${outDir}/views-2x2.png`);
}

// ---------------------------------------------------------------- overlay / diff vs the mockup
// Working copy of the mockup at the frame size (1421 × 1107 → 1440 × 1122,
// ×1.0134 both ways); the original file is never touched. The mockup frames the
// card lower (title and lead above it): this compares composition, not position.
const ref = await sharp(MOCKUP).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer();
for (const name of ['mission-B-correct', 'view-surface']) {
  const cur = await sharp(`${outDir}/${name}.png`).removeAlpha().resize(W, H, { fit: 'fill' }).raw().toBuffer();
  const over = Buffer.alloc(W * H * 3);
  const diff = Buffer.alloc(W * H * 3);
  let differing = 0;
  for (let i = 0; i < W * H; i++) {
    let d = 0;
    for (let c = 0; c < 3; c++) {
      over[i * 3 + c] = (ref[i * 3 + c] + cur[i * 3 + c]) >> 1;
      d = Math.max(d, Math.abs(ref[i * 3 + c] - cur[i * 3 + c]));
    }
    const g = (cur[i * 3] + cur[i * 3 + 1] + cur[i * 3 + 2]) / 3;
    if (d > 48) {
      differing++;
      diff[i * 3] = 230;
      diff[i * 3 + 1] = 60;
      diff[i * 3 + 2] = 40;
    } else {
      diff[i * 3] = diff[i * 3 + 1] = diff[i * 3 + 2] = Math.round(200 + g / 5);
    }
  }
  await sharp(over, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${outDir}/${name}-overlay.png`);
  await sharp(diff, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${outDir}/${name}-diff.png`);
  console.log(`${name}: ${((differing / (W * H)) * 100).toFixed(1)}% of pixels differ by > 48`);
}

console.log(JSON.stringify({ layouts }, null, 1));
if (warnings.size) console.log('WARN (outside this block): ' + [...warnings].join(' | '));
if (failures.length) {
  console.error('FAIL\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('PASS');
