// Screen-height captures of the measurement mission in #scene-coordinates
// ("אליפסואיד, גיאואיד וגליות"): the four views, the surface view turned to
// the back, the ellipsoid's area enlarged and the geoid view see-through (where
// the version has them), and the completed task, at
// 1440 × 1122, 1440 × 900, 1440 × 800 and the 1920 × 855 desktop window it was reviewed in.
//
// Usage (dev server on :3000, or QA_BASE=http://localhost:<port>):
//   node scripts/qa/shot-measurement-heights.mjs <label> [outDir]
//     label   before | after — the sub-folder the shots go to
//
// Each shot is taken after ordinary navigation: the lesson route, then the
// page scrolled so the activity card sits just below the site's fixed header
// (as a reader brings it into view). Nothing on the page is hidden and the zoom
// is not changed. Reports, per height, every view's card height and whether the
// whole card — tabs, illustration, text, task buttons — is on screen.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const label = process.argv[2] || 'after';
const outDir = `${process.argv[3] || 'design/screenshots/measurement-mission-clarity-2026-10-12'}/${label}`;
const URL = `${process.env.QA_BASE || 'http://localhost:3000'}/lessons/topic-02/#scene-coordinates`;
const SIZES = [
  [1440, 1122],
  [1440, 900],
  [1440, 800],
  [1920, 855],
];
/** Gap kept between the site's fixed header and the card's top. */
const BELOW_HEADER = 12;
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
const CARD = '#scene-coordinates [aria-label="שכבות החתך"]';
const report = {};

for (const [W, H] of SIZES) {
  const tag = W === 1440 ? `h${H}` : `${W}x${H}`;
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector(CARD, { timeout: 30000 });
  const place = () =>
    page.evaluate(
      ({ sel, gap }) => {
        const c = document.querySelector(sel).closest('.surface-elevated');
        const header = document.querySelector('header');
        const top = (header ? header.getBoundingClientRect().bottom : 0) + gap;
        window.scrollTo(0, c.getBoundingClientRect().top + window.scrollY - top);
      },
      { sel: CARD, gap: BELOW_HEADER },
    );
  const measure = () =>
    page.evaluate((sel) => {
      const c = document.querySelector(sel).closest('.surface-elevated');
      const r = c.getBoundingClientRect();
      // any element inside the card that scrolls on its own
      const inner = [...c.querySelectorAll('*')].some((e) => {
        const s = getComputedStyle(e);
        return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1;
      });
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), fits: r.bottom <= innerHeight, innerScroll: inner };
    }, CARD);
  await place();
  // the live model, where there is one (the renders before it existed)
  await page.waitForSelector('#scene-coordinates [data-landscape="live"]', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const rows = {};
  for (const [tab, name] of [
    ['פני השטח', 'surface'],
    ['אליפסואיד', 'ellipsoid'],
    ['גיאואיד', 'geoid'],
    ['גליות וגובה', 'undulation'],
  ]) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await place();
    await page.waitForTimeout(1600);
    rows[name] = await measure();
    await page.screenshot({ path: `${outDir}/${tag}-view-${name}.png` });
  }
  // the states this version offers: the back of the model, the enlarged area, the see-through ground
  const extra = async (name, run) => {
    await run();
    await place();
    await page.waitForTimeout(1500);
    rows[name] = await measure();
    await page.screenshot({ path: `${outDir}/${tag}-${name}.png` });
  };
  const has = async (label) => (await page.getByRole('button', { name: label, exact: true }).count()) > 0;
  await page.getByRole('tab', { name: 'פני השטח', exact: true }).click();
  await page.waitForTimeout(900);
  await extra('surface-back', async () => {
    await page.locator('#scene-coordinates [data-landscape] [role="img"][tabindex="0"]').focus();
    for (let i = 0; i < 18; i++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
  });
  await page.getByRole('tab', { name: 'אליפסואיד', exact: true }).click();
  await page.waitForTimeout(900);
  if (await has('הגדלת האזור')) await extra('ellipsoid-zoomed', () => page.getByRole('button', { name: 'הגדלת האזור', exact: true }).click());
  await page.getByRole('tab', { name: 'גיאואיד', exact: true }).click();
  await page.waitForTimeout(1200);
  if (await has('חשיפת משטחי הייחוס')) await extra('geoid-clear', () => page.getByRole('button', { name: 'חשיפת משטחי הייחוס', exact: true }).click());
  await page.getByRole('tab', { name: 'גליות וגובה', exact: true }).click();
  await page.waitForTimeout(1200);
  // the task, solved through: B → A → C
  const input = page.getByLabel(/^מהו הגובה מעל פני הים בתחנה [ABC]\?$/);
  const check = page.getByRole('button', { name: 'בדיקת תשובה' });
  for (const [id, answer] of [
    ['B', '120'],
    ['A', '6'],
    ['A', '30'],
    ['C', '220'],
  ]) {
    await page.getByRole('group', { name: 'בחירת תחנה' }).getByRole('button', { name: new RegExp(`^תחנה ${id}`) }).click();
    await input.fill(answer);
    await check.click();
    await page.waitForTimeout(300);
    if (answer === '6') {
      await place();
      await page.waitForTimeout(600);
      rows['mission-A-wrong'] = await measure();
      await page.screenshot({ path: `${outDir}/${tag}-mission-A-wrong.png` });
    }
  }
  await place();
  await page.waitForTimeout(1200);
  rows['mission-complete'] = await measure();
  await page.screenshot({ path: `${outDir}/${tag}-mission-complete.png` });
  report[tag] = rows;
  await ctx.close();
}
await browser.close();
await writeFile(`${outDir}/heights.json`, JSON.stringify(report, null, 2));
for (const [H, rows] of Object.entries(report)) {
  console.log(`\n${H}  (card top = header + ${BELOW_HEADER})`);
  for (const [k, v] of Object.entries(rows))
    console.log(`  ${k.padEnd(17)} height ${String(v.height).padStart(4)}  bottom ${String(v.bottom).padStart(5)}  ${v.fits ? 'fits' : 'DOES NOT FIT'}${v.innerScroll ? '  inner scroll!' : ''}`);
}
