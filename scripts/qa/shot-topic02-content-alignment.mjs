// Browser QA for the lesson-2 content alignment (2026-10-27,
// design/docs/claude-topic02-content-alignment-2026-10-27.md): the briefing
// page, the two intros that referred to rock types, the recap, and the
// knowledge checks of lessons 2 and 6 (wrong answer → hint, right answer →
// explanation, "הצג תשובה", finish, reset), at 1440 × 1122.
// Checks the new copy is there and the removed copy is not, that nothing is
// clipped or scrolls sideways, and that no page error is thrown.
// Usage (dev server running):
//   node scripts/qa/shot-topic02-content-alignment.mjs [outDir] [--base=http://localhost:3000]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'design/screenshots/topic02-content-alignment';
const BASE = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7);
const VIEW = { width: 1440, height: 1122 };
const HEADER = 80;

let failures = 0;
const fail = (m) => {
  failures++;
  console.log('FAIL', m);
};
const ok = (m) => console.log('ok  ', m);
const check = (cond, m) => (cond ? ok(m) : fail(m));

// Copy that must be gone from every public lesson-2 surface checked here.
const REMOVED = ['סלעים', 'סלעי', 'מסלע', 'אנדוגני', 'אקסוגני', 'ITM', 'רשת ישראל', 'Datum Shift', 'דו״צ', 'דו"צ', 'GPS', 'נאט״ו', 'עומק'];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];

async function open(path, ready) {
  const ctx = await browser.newContext({ viewport: VIEW });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${path}: ${e.message}`));
  await page.goto('about:blank');
  await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForSelector(ready, { timeout: 150000 });
  await page.waitForTimeout(1200);
  return { ctx, page };
}

// The quiz wraps formulas in LTR isolates (U+2066…U+2069); they are invisible, so text checks ignore them.
const norm = (s) => s.replace(/[⁦-⁩]/g, '').replace(/\s+/g, ' ').trim();
const textOf = async (page, sel) => norm(await page.locator(sel).first().innerText());
const noHScroll = async (page, label) => {
  const d = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(d === 0, `${label}: no horizontal scroll (${d})`);
};
const noneRemoved = (text, label) => {
  for (const w of REMOVED) check(!text.includes(w), `${label}: no "${w}"`);
};
/** Scroll the element's top to just under the site header (as a learner arriving at it). */
const underHeader = (page, loc) =>
  loc.evaluate((el) => {
    const top = el.getBoundingClientRect().top + scrollY - 80 - 16;
    scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  });
/** No text box inside the element is cut by its own overflow. */
const unclipped = async (loc, label) => {
  const cut = await loc.evaluate((root) =>
    [root, ...root.querySelectorAll('*')].filter((el) => {
      const s = getComputedStyle(el);
      const hides = /(hidden|clip)/.test(s.overflowX + s.overflowY);
      return hides && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) && el.innerText.trim().length > 0;
    }).length,
  );
  check(cut === 0, `${label}: no clipped text box (${cut})`);
};

/* ── 1. Briefing page ─────────────────────────────────────────────── */
{
  const { ctx, page } = await open('/lessons/topic-02/overview/', '#objectives-heading');
  const all = norm(await page.locator('main').innerText());
  check(all.includes('טופוגרפיה, קנה מידה, קואורדינטות וקווי גובה'), 'overview: subtitle names coordinates, not ITM/WGS84');
  check(all.includes('12 סצנות'), 'overview: stats bar counts 12 sub-topics');
  const steps = await page.locator('#structure-heading ~ * ol > li').allInnerTexts();
  check(steps.length === 12, `overview: structure lists 12 sub-topics (${steps.length})`);
  check(norm(steps[10] ?? '').includes('משמעות מעשית') && norm(steps[11] ?? '').includes('סיכום'), 'overview: 02.11 משמעות מעשית, 02.12 סיכום');
  const objectives = await page.locator('#objectives-heading ~ div > div').allInnerTexts();
  check(objectives.length === 11, `overview: 11 objectives (${objectives.length})`);
  noneRemoved(objectives.join(' '), 'overview objectives');
  check(!all.includes('ITM'), 'overview: no ITM anywhere');
  await noHScroll(page, 'overview');
  await page.screenshot({ path: `${outDir}/01-overview-top.png` });
  await underHeader(page, page.locator('#objectives-heading'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/02-overview-objectives.png` });
  await ctx.close();
}

/* ── 2. Onboarding: "בהמשך השיעור" ─────────────────────────────────── */
{
  const { ctx, page } = await open('/lessons/topic-02/#scene-onboarding', '#scene-onboarding');
  const callout = page.locator('#scene-onboarding section', { hasText: 'בהמשך השיעור' }).last();
  await underHeader(page, callout);
  await page.waitForTimeout(400);
  const t = norm(await callout.innerText());
  check(t.includes('נכיר את התבליט, את התכסית ואת תבניות הנוף'), 'onboarding: names relief, cover and landforms');
  noneRemoved(t, 'onboarding callout');
  await unclipped(callout, 'onboarding callout');
  await noHScroll(page, 'onboarding');
  await page.screenshot({ path: `${outDir}/03-onboarding-next.png` });
  await ctx.close();
}

/* ── 3. Land cover intro ───────────────────────────────────────────── */
{
  const { ctx, page } = await open('/lessons/topic-02/#scene-landcover', '#scene-landcover');
  const head = page.locator('#scene-landcover header').first();
  await underHeader(page, page.locator('#scene-landcover'));
  await page.waitForTimeout(400);
  const t = norm(await head.innerText());
  check(t.includes('לאחר שהכרנו את מבנה הקרקע ואת תבניות הנוף'), 'landcover: intro follows landforms');
  noneRemoved(t, 'landcover intro');
  await unclipped(head, 'landcover intro');
  await noHScroll(page, 'landcover');
  await page.screenshot({ path: `${outDir}/04-landcover-intro.png` });
  await ctx.close();
}

/* ── 4. Recap ──────────────────────────────────────────────────────── */
{
  const { ctx, page } = await open('/lessons/topic-02/#scene-recap', '#scene-recap');
  const recap = page.locator('#scene-recap');
  const t = norm(await recap.innerText());
  const cards = await recap.locator('.grid > .surface').count();
  check(cards === 22, `recap: 22 term cards (${cards})`);
  check(t.includes('סיכום השיעור: 22 מושגים מרכזיים'), 'recap: title counts 22');
  for (const term of ['אליפסואיד וגיאואיד', 'גליות (N)', 'דאטום', 'רוחב ואורך', 'מעלות, דקות ושניות', 'UTM: פלח וחצי כדור', 'WGS84', 'נ״צ ומערכת ייחוס'])
    check(t.includes(term), `recap: has "${term}"`);
  check(t.includes('במעלות עשרוניות או במעלות, דקות ושניות') && t.includes('וקריאת UTM במטרים'), 'recap: WGS84 covers both readings taught');
  check(t.includes('המשך לבדיקת ידע') && t.includes('חזרו לפעילויות שבתתי־הנושאים'), 'recap: points to the activities and the check');
  check(!t.includes('עברו לאזור תרגול') && !t.includes('המעבר לתרגול'), 'recap: no longer sends to the תרגול tab');
  noneRemoved(t, 'recap');
  // the formula reads left to right: "H" sits left of "=" sits left of "h"
  const order = await recap.locator('bdi', { hasText: 'H = h − N' }).first().evaluate((el) => {
    const r = document.createRange();
    const node = el.firstChild;
    const at = (i) => (r.setStart(node, i), r.setEnd(node, i + 1), r.getBoundingClientRect().left);
    return [at(0), at(2), at(4)];
  });
  check(order[0] < order[1] && order[1] < order[2], 'recap: H = h − N renders left to right');
  await unclipped(recap, 'recap');
  await noHScroll(page, 'recap');
  await underHeader(page, recap);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/05-recap-top.png` });
  await underHeader(page, recap.locator('.grid > .surface').nth(10));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/06-recap-coordinates.png` });
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/07-recap-end.png` });
  await recap.screenshot({ path: `${outDir}/08-recap-whole.png` });
  await ctx.close();
}

/* ── 5. Knowledge checks ───────────────────────────────────────────── */
// The lesson tabs: the top bar is hidden from xl up, so take the one on screen.
const TAB = (name) => `[role="tab"]:visible:has-text("${name}")`;
async function openCheck(topic) {
  const { ctx, page } = await open(`/lessons/${topic}/`, TAB('בדיקת ידע'));
  await page.click(TAB('בדיקת ידע'));
  await page.waitForSelector('text=בדקו את עצמכם.', { timeout: 60000 });
  await page.waitForTimeout(500);
  return { ctx, page };
}
const item = (page, n) => page.locator('#lesson-panel-check ol > li.surface').nth(n - 1);
const pick = (page, n, label) => item(page, n).locator('button', { hasText: label }).first().click();

/* lesson 2 */
{
  const { ctx, page } = await openCheck('topic-02');
  const all = norm(await page.locator('#lesson-panel-check').innerText());
  check((await page.locator('#lesson-panel-check ol > li.surface').count()) === 7, 'check 2: still 7 questions');
  noneRemoved(all, 'check 2 (before answering)');
  check(!/פונה למעלה|פונה למטה/.test(all), 'check 2: no up/down-the-page V wording');
  check(all.includes('נתוני גובה (קווי גובה)'), 'check 2 q1: height, not depth');
  check(all.includes('פונה אל השטח הנמוך') && all.includes('פונה אל השטח הגבוה'), 'check 2 q7: V by high/low ground');
  // q3's formula stem reads left to right
  const stemOrder = await item(page, 3).locator('p').first().evaluate((p) => {
    const text = p.textContent;
    const i = text.indexOf('h = 50');
    const node = p.firstChild;
    const r = document.createRange();
    const at = (k) => (r.setStart(node, k), r.setEnd(node, k + 1), r.getBoundingClientRect().left);
    return [at(i), at(i + 4)];
  });
  check(stemOrder[0] < stemOrder[1], 'check 2 q3: "h = 50" renders left to right');
  await page.screenshot({ path: `${outDir}/10-check2-start.png` });

  // first pass: q3, q5, q7 wrong (one misconception each), the rest right → 4/7, below the pass mark
  await pick(page, 1, 'נתוני גובה');
  await pick(page, 2, '1:10,000');
  await pick(page, 3, '30 מ׳');
  await pick(page, 4, 'מדרון תלול');
  await pick(page, 5, 'משנים את שם הדאטום');
  await pick(page, 6, 'רוחב ואורך הם זוויות');
  await pick(page, 7, 'שהקודקוד שלהם פונה אל השטח הגבוה');
  await page.click('text=שליחת תשובות');
  await page.waitForTimeout(800);
  const score1 = norm(await page.locator('#lesson-panel-check').locator('text=/^\\d+$/').last().locator('..').innerText());
  check(score1.startsWith('4') && score1.endsWith('/7'), `check 2: wrong answers scored (${score1})`);
  check(norm(await item(page, 3).innerText()).includes('אבל N שלילי'), 'check 2 q3: sign-error hint');
  check(norm(await item(page, 5).innerText()).includes('החלפת שם הדאטום אינה ממירה'), 'check 2 q5: label-change hint');
  check(norm(await item(page, 7).innerText()).includes('זהו גיא'), 'check 2 q7: valley hint');
  check(norm(await item(page, 1).innerText()).includes('מתצלום אוויר בודד קשה להעריך גבהים ושיפועים'), 'check 2 q1: explanation on a right answer');
  await underHeader(page, item(page, 3));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/11-check2-wrong-hints.png` });
  await unclipped(page.locator('#lesson-panel-check ol').first(), 'check 2 after submit');

  // recover: q3 right, q5 revealed, q7 right → 6/7, passes
  await pick(page, 3, '70 מ׳');
  await page.waitForTimeout(500);
  check(norm(await item(page, 3).innerText()).includes('H = h − N = 50 − (−20) = 70'), 'check 2 q3: explanation after the right answer');
  await item(page, 5).locator('button', { hasText: 'הצג תשובה' }).click();
  await page.waitForTimeout(500);
  check(norm(await item(page, 5).innerText()).includes('המרה מתאימה מחשבת את המספרים מחדש'), 'check 2 q5: explanation after "הצג תשובה"');
  await pick(page, 7, 'שהקודקוד שלהם פונה אל השטח הנמוך');
  await page.waitForTimeout(500);
  await underHeader(page, item(page, 3));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/12-check2-right-and-revealed.png` });
  await underHeader(page, item(page, 6));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/13-check2-q6-q7.png` });
  const score2 = norm(await page.locator('#lesson-panel-check').locator('text=/^\\d+$/').last().locator('..').innerText());
  check(score2.startsWith('6') && score2.endsWith('/7'), `check 2: finished score (${score2})`);
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/14-check2-finish.png` });
  noneRemoved(norm(await page.locator('#lesson-panel-check').innerText()), 'check 2 (all feedback open)');
  await noHScroll(page, 'check 2');

  await page.click('text=ניסיון נוסף');
  await page.waitForTimeout(600);
  const footer = norm(await page.locator('#lesson-panel-check').innerText());
  check(footer.includes('0/7 שאלות נענו') && (await page.locator('button:has-text("שליחת תשובות")').isDisabled()), 'check 2: reset clears answers');
  await page.screenshot({ path: `${outDir}/15-check2-reset.png` });
  await ctx.close();
}

/* lesson 6 */
{
  const { ctx, page } = await openCheck('topic-06');
  const q4 = item(page, 4);
  const t4 = norm(await q4.innerText());
  check(t4.includes('מה מאפיין ניווט לפי השטח (טופוגרפיה)?') && !t4.includes('לאורך מעקה'), 'check 6 q4: names the method, not the handrail');
  await pick(page, 1, '255°');
  await pick(page, 2, 'צפון מגנטי');
  await pick(page, 3, 'צומת דרכים שזיהיתם במפה ובשטח');
  await pick(page, 4, 'הליכה צמודה לדרך או לערוץ בלבד');
  await pick(page, 5, '400');
  await page.click('text=שליחת תשובות');
  await page.waitForTimeout(800);
  check(norm(await q4.innerText()).includes('מקרה אחד של ניווט לפי השטח, לא השיטה כולה'), 'check 6 q4: handrail-only hint');
  await underHeader(page, q4);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/20-check6-q4-wrong.png` });
  await pick(page, 4, 'זיהוי תבליט ותכסית לאורך הדרך');
  await page.waitForTimeout(500);
  const right = norm(await q4.innerText());
  check(right.includes('יכול לשמש ״מעקה״: זהו מקרה אחד של השיטה'), 'check 6 q4: explanation after the right answer');
  await unclipped(page.locator('#lesson-panel-check ol').first(), 'check 6');
  await page.screenshot({ path: `${outDir}/21-check6-q4-right.png` });
  const score = norm(await page.locator('#lesson-panel-check').locator('text=/^\\d+$/').last().locator('..').innerText());
  check(score.startsWith('5') && score.endsWith('/5'), `check 6: finished score (${score})`);
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/22-check6-finish.png` });
  await page.click('text=ניסיון נוסף');
  await page.waitForTimeout(600);
  check(norm(await page.locator('#lesson-panel-check').innerText()).includes('0/5 שאלות נענו'), 'check 6: reset clears answers');
  await noHScroll(page, 'check 6');
  await ctx.close();
}

/* ── 6. The תרגול tab, unchanged (documented, not edited) ──────────── */
{
  const { ctx, page } = await open('/lessons/topic-02/', TAB('תרגול'));
  await page.click(TAB('תרגול'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/30-practice-tab-unchanged.png` });
  await ctx.close();
}

await browser.close();
check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
console.log(failures ? `\n${failures} FAILED` : '\nALL OK');
process.exit(failures ? 1 : 0);
