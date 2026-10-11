// Screen-height captures of the measurement mission in #scene-coordinates
// ("אליפסואיד, גיאואיד וגליות"): the four views and the completed task, at
// 1440 × 1122, 1440 × 900 and 1440 × 800.
//
// Usage (dev server on :3000):
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
const outDir = `${process.argv[3] || 'design/screenshots/measurement-mission-interactive'}/${label}`;
const URL = 'http://localhost:3000/lessons/topic-02/#scene-coordinates';
const W = 1440;
const HEIGHTS = [1122, 900, 800];
/** Gap kept between the site's fixed header and the card's top. */
const BELOW_HEADER = 12;
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
const CARD = '#scene-coordinates [aria-label="שכבות החתך"]';
const report = {};

for (const H of HEIGHTS) {
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
    await page.screenshot({ path: `${outDir}/h${H}-view-${name}.png` });
  }
  // the task, solved through: B → A → C
  const input = page.getByLabel('מהו הגובה מעל פני הים?');
  const check = page.getByRole('button', { name: 'בדיקת תשובה' });
  for (const [id, answer] of [
    ['B', '120'],
    ['A', '30'],
    ['C', '220'],
  ]) {
    await page.getByRole('group', { name: 'בחירת תחנה' }).getByRole('button', { name: new RegExp(`^תחנה ${id}`) }).click();
    await input.fill(answer);
    await check.click();
    await page.waitForTimeout(300);
  }
  await place();
  await page.waitForTimeout(1200);
  rows['mission-complete'] = await measure();
  await page.screenshot({ path: `${outDir}/h${H}-mission-complete.png` });
  report[H] = rows;
  await ctx.close();
}
await browser.close();
await writeFile(`${outDir}/heights.json`, JSON.stringify(report, null, 2));
for (const [H, rows] of Object.entries(report)) {
  console.log(`\n1440 × ${H}  (card top = header + ${BELOW_HEADER})`);
  for (const [k, v] of Object.entries(rows))
    console.log(`  ${k.padEnd(17)} height ${String(v.height).padStart(4)}  bottom ${String(v.bottom).padStart(5)}  ${v.fits ? 'fits' : 'DOES NOT FIT'}${v.innerScroll ? '  inner scroll!' : ''}`);
}
