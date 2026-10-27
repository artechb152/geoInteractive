// Browser QA for the lesson-6 copy cleanup (2026-10-27,
// design/docs/claude-topic06-copy-cleanup-2026-10-27.md): every screen and
// state whose text changed, at 1440 × 1122 with the activity's card scrolled
// under the site header. Checks the new copy is there and the removed copy is
// not, that the card fits the view in each state, keyboard access to what moved
// behind a disclosure, and no horizontal scroll or page error.
// The activities' own suites cover the rest (planning-tips, terrain-nav,
// dead-reckoning, north-lab, location-check, route-story).
// Usage (dev server running):
//   node scripts/qa/shot-topic06-copy-cleanup.mjs [outDir] [--base=http://localhost:3000]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'design/screenshots/topic06-copy-cleanup/after';
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

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];

async function openScene(hash, ready, { reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport: VIEW, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${hash}: ${e.message}`));
  await page.goto('about:blank');
  await page.goto(`${BASE}/lessons/topic-06/#scene-${hash}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForSelector(ready, { timeout: 150000 });
  await page.waitForTimeout(1500);
  return { ctx, page };
}

/** Scroll the element's top to just under the site header (as a learner arriving at it). */
const underHeader = (page, sel) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const top = el.getBoundingClientRect().top + scrollY - 80 - 24;
    scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  }, sel);

/** The element sits whole between the site header and the bottom of the view. */
async function fits(page, sel, label) {
  const r = await page.evaluate((sel) => {
    const b = document.querySelector(sel).getBoundingClientRect();
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  }, sel);
  check(r.top >= HEADER - 1 && r.bottom <= VIEW.height, `${label}: fits (${r.top}–${r.bottom})`);
  check(r.hScroll === 0, `${label}: no horizontal scroll`);
  return r;
}
const text = (page, sel) => page.locator(sel).first().innerText();
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const shot = (page, name) => page.screenshot({ path: `${outDir}/${name}.png` });

// ───────────────────────────── 1 · the four stages + the examples
{
  const { ctx, page } = await openScene('onboarding', '#scene-onboarding [aria-controls="step-panel-plan"]');
  const S = '#scene-onboarding';
  check(norm(await text(page, `${S} header p`)) === 'איך מגיעים ליעד בשטח לא מוכר? בחרו שלב וראו מה עושים בו.', 'stages: one framing question and one instruction');
  const all = await text(page, S);
  for (const gone of ['הפעולה בשלב זה', 'חשיבות הפעולה', '8 ק״מ', '90 מטר', 'זווית הנמדדת במעלות']) check(!all.includes(gone), `stages: "${gone}" is gone`);
  check(all.includes('משימה: מנקודה A לנקודה B'), 'stages: the task line keeps A → B');
  // tag the two screens so each can be scrolled to and measured on its own
  await page.evaluate((S) => document.querySelectorAll(`${S} [data-lesson-viewport-fit]`).forEach((el, i) => el.setAttribute('data-qa-screen', String(i + 1))), S);
  const fit1 = `${S} [data-qa-screen="1"]`;
  const ids = ['plan', 'start', 'travel', 'arrive'];
  for (const id of ids) {
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    const btn = page.locator(`button[aria-controls="step-panel-${id}"]`);
    if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click();
    await page.waitForTimeout(500);
    const ps = await page.locator(`#step-panel-${id} p`).allInnerTexts();
    check(ps.length === 2 && ps.every((p) => p.length > 15), `stage ${id}: an action and a reason (${ps.length} sentences)`);
    await underHeader(page, fit1);
    await page.waitForTimeout(250);
    await fits(page, fit1, `stage ${id}`);
    await shot(page, `01-stages-${id}`);
  }
  await page.locator('button[aria-controls="step-panel-arrive"]').click();
  await page.waitForTimeout(500);
  await fits(page, fit1, 'stages all closed');
  // Unscaled heights of both screens at the reference width (LessonViewportFit lays them out at 1344).
  const heights = await page.evaluate((S) => [...document.querySelectorAll(`${S} [data-lesson-viewport-fit] > div`)].map((d) => d.offsetHeight), S);
  console.log('info unscaled screen heights, stages closed / examples:', heights.join(', '));

  // the historical examples: same component as lesson 2, lesson-6 text only
  const fit2 = `${S} [data-qa-screen="2"]`;
  const cases = page.locator('#navigation-history-detail-panel');
  const cards = page.locator(`${S} [aria-controls="navigation-history-detail-panel"]`);
  const n = await cards.count();
  check(n === 4, `examples: four cards (${n})`);
  for (let i = 0; i < n; i++) {
    await cards.nth(i).click();
    await page.waitForTimeout(450);
    const t = norm(await cases.innerText());
    check(t.includes('עיקרון מרכזי:') && t.includes('המשמעות לתכנון:'), `example ${i + 1}: context, one principle, one application`);
    if (i === 0) check(t.includes('בקו רוחב נתון'), 'stars: the latitude qualifier stays');
    if (i === 3) check(t.includes('דוגמה מומצאת'), 'junctions: still marked as invented');
    await underHeader(page, fit2);
    await page.waitForTimeout(250);
    await fits(page, fit2, `example ${i + 1}`);
    await shot(page, `02-example-${i + 1}`);
  }
  check(norm(await text(page, fit2)).includes('בחלק הבא, דגשים לתכנון ולניווט: מה מכינים'), 'examples: one transition line to the tips');
  await ctx.close();
}

// ───────────────────────────── 2 · tips: eight states, the question, the transition
{
  const { ctx, page } = await openScene('tips', '[data-tips-screen="question"]');
  const all = await text(page, '#scene-tips');
  for (const gone of ['מה עושים', 'למה זה מועיל', 'מהתכנון לבדיקה בשטח', 'נבחן את שניהם']) check(!all.includes(gone), `tips: "${gone}" is gone`);
  check(all.split('דוגמה לימודית').length - 1 === 1, 'tips: the example note once');
  for (const id of ['plan', 'nav']) {
    const sel = `[data-tips-screen="${id}"]`;
    const n = await page.locator(`${sel} button[aria-expanded]`).count();
    for (let i = 0; i < n; i++) {
      await page.locator(`${sel} button[aria-expanded]`).nth(i).click();
      await page.waitForTimeout(500);
      const ps = await page.locator(`${sel} [role="region"] p`).allInnerTexts();
      const cap = norm(await text(page, `${sel} [data-tips-caption]`));
      check(ps.length === 2, `tip ${id} ${i + 1}: action + reason`);
      check(cap.startsWith('במפה') && cap.length < 140, `tip ${id} ${i + 1}: the caption says what the map shows (${cap.length} chars)`);
      await underHeader(page, sel);
      await page.waitForTimeout(250);
      await fits(page, sel, `tip ${id} ${i + 1}`);
      await shot(page, `03-tip-${id}-${i + 1}`);
    }
  }
  const Q = '[data-activity="tips-question"]';
  await underHeader(page, '[data-tips-screen="question"]');
  await page.locator(`${Q} [data-option="continue"]`).click();
  await page.waitForTimeout(500);
  check((await page.locator('[data-tips-feedback="wrong"]').count()) === 1, 'question: a wrong answer gets its feedback');
  await underHeader(page, '[data-tips-screen="question"]');
  await page.waitForTimeout(250);
  await fits(page, '[data-tips-screen="question"]', 'question with wrong feedback');
  await shot(page, '04-question-wrong');
  await page.locator(`${Q} [data-option="recheck"]`).click();
  await page.waitForTimeout(500);
  check((await page.locator('[data-tips-feedback="correct"]').count()) === 1, 'question: the right answer');
  await underHeader(page, '[data-tips-screen="question"]');
  await page.waitForTimeout(250);
  await fits(page, '[data-tips-screen="question"]', 'question right');
  await shot(page, '04-question-right');
  await page.locator('[data-tips-reset]').click();
  await page.waitForTimeout(500);
  check((await page.locator('[data-tips-feedback]').count()) === 0, 'question: reset clears the feedback');
  await ctx.close();
}

// ───────────────────────────── 3 · techniques: opening, terrain association, dead reckoning
{
  const { ctx, page } = await openScene('combatnav', '[data-activity="terrain-association"]');
  // On arrival nothing is focused for the learner — a focus ring on the first pace option would mark 800, the answer.
  await page.waitForSelector('[data-activity="dead-reckoning"] [data-radio="pace"]');
  const active = await page.evaluate(() => (document.activeElement?.closest('[data-radio]') ? document.activeElement.getAttribute('data-option') : null));
  check(active === null, `dead reckoning: no pace option holds focus on arrival (${active})`);
  const all = await text(page, '#scene-combat');
  for (const gone of ['כל שיטה מוצגת בהמשך', 'נתרגל בהמשך השיעור', 'מתי משתמשים בשיטה', 'בהמחשה, המסלול עובר', 'בהמחשה, היעד נמצא', 'מסימן לסימן בשטח', 'סובבו את המודל', 'עקרונות לבחירת שיטת הניווט'])
    check(!all.includes(gone), `techniques: "${gone}" is gone`);
  check(all.includes('יכול לשמש ״מעקה״') && all.includes('ניווט לפי השטח'), 'techniques: the handrail is one case of terrain association');
  check(all.includes('ההליכה מוצגת ללא סטייה'), 'dead reckoning: the no-deviation caveat stays');

  const T = '[data-activity="terrain-association"]';
  await page.waitForFunction(() => !document.querySelector('[data-panel="map"] [data-loading]'), null, { timeout: 120000 });
  await underHeader(page, T);
  await page.waitForTimeout(400);
  await fits(page, T, 'terrain learn');
  check((await page.locator('[data-feature]').count()) === 5, 'terrain learn: the route features first');
  await shot(page, '05-terrain-learn');
  await page.locator('[data-feature-more]').click();
  await page.waitForTimeout(250);
  await fits(page, T, 'terrain learn, all features');
  await shot(page, '05-terrain-learn-all');

  // practice: the waiting line says only what is still missing
  await page.locator(`${T} [data-mode-switch] [role="radio"]`).nth(1).click();
  await page.waitForTimeout(800);
  await underHeader(page, T);
  const fb = () => page.locator(`${T} [data-feedback]`).innerText().then(norm);
  check((await fb()) === 'נשאר להשלים: נקודה (א), שתי ראיות (ב) והשוואה לתכנון (ג).', 'practice: all three missing');
  await shot(page, '06-terrain-practice-empty');
  await page.locator(`${T} [data-radio="candidates"] [role="radio"]`).first().click();
  await page.waitForTimeout(250);
  check((await fb()) === 'נשאר להשלים: שתי ראיות (ב) והשוואה לתכנון (ג).', 'practice: a point marked');
  await page.locator(`${T} [data-evidence] button`).first().click();
  await page.waitForTimeout(250);
  check((await fb()) === 'נשאר להשלים: ראיה נוספת (ב) והשוואה לתכנון (ג).', 'practice: one piece of evidence');
  await page.locator(`${T} [data-evidence] button`).nth(1).click();
  await page.locator(`${T} [data-radio="comparison"] [role="radio"]`).first().click();
  await page.waitForTimeout(250);
  check((await fb()) === 'אפשר ללחוץ ״בדיקת המיקום״.', 'practice: ready to check');
  await fits(page, T, 'terrain practice');
  await shot(page, '06-terrain-practice-ready');

  const D = '[data-activity="dead-reckoning"]';
  await underHeader(page, D);
  await page.waitForTimeout(400);
  await fits(page, D, 'dead reckoning, opening');
  check(norm(await text(page, `${D} [data-legend="dead-reckoning"] p`)) === 'במפת התכנון רואים את כל הדרך, ובשטח רק כ־30 מ׳ סביבכם. ההליכה מוצגת ללא סטייה.', 'dead reckoning: the caption tells field from map');
  await shot(page, '07-dead-opening');
  await ctx.close();
}

// ───────────────────────────── 4 · principles: azimuth beside the compass, GPS beside the location check
{
  const { ctx, page } = await openScene('principles', '[data-activity="compass-map"]');
  const all = await text(page, '#scene-principles');
  check(!all.includes('ניווט ללא GPS זמין') && !all.includes('כאן תופיע תוצאת הבדיקה') && !all.includes('עקרונות מרכזיים'), 'principles: the opening columns, the placeholder and the repeated heading are gone');
  check(all.includes('נמדד בשטח') && all.includes('043°') && all.includes('כ־300 מ׳'), 'location check: 043° and ~300 m before the check');
  const def = page.locator('[data-azimuth-definition]');
  check(await def.isVisible(), 'compass: the azimuth definition sits in the compass column');
  await underHeader(page, '[data-activity="compass-map"]');
  await page.waitForTimeout(300);
  await fits(page, '[data-activity="compass-map"]', 'compass + map');
  await shot(page, '08-compass');
  const L = '[data-activity="location-check"]';
  await underHeader(page, L);
  await page.waitForTimeout(600);
  await fits(page, L, 'location check');
  const panel = await page.locator(`${L} [data-feedback="empty"]`).evaluate((el) => ({ h: el.getBoundingClientRect().height, t: el.innerText.trim() }));
  check(panel.t === '' && panel.h > 100, `location check: an empty result panel keeps its height (${panel.h.toFixed(0)} px)`);
  await shot(page, '09-location-check');
  await ctx.close();
}

// ───────────────────────────── 5 · route planning: one definition; pacing with the measurement on request
{
  const { ctx, page } = await openScene('planning', '[data-qa="route-builder"]');
  const all = await text(page, '#scene-planning');
  for (const gone of ['תכנון מראש ובקרה בתנועה', 'סיכום התכנון', 'המצפן מכוון לאזימוט, והמרחק נספר', 'רק כשהסימן תואם למפה, ממשיכים'])
    check(!all.includes(gone), `planning: "${gone}" is gone`);
  check(all.split('Route Description').length - 1 === 1, 'planning: one definition of the route story');
  await underHeader(page, '[data-qa="route-builder"]');
  await page.waitForTimeout(400);
  await fits(page, '[data-qa="route-builder"]', 'route builder');
  await shot(page, '10-route-builder');
  const P = '[data-qa="pacing"]';
  await underHeader(page, P);
  await page.waitForTimeout(300);
  const pace = norm(await text(page, P));
  check(pace.includes('צעד כפול') && pace.includes('שונה מאדם לאדם') && pace.includes('שיפוע') && pace.includes('הספירה אינה הוכחת הגעה'), 'pacing: double vs single step, person and conditions, not proof');
  check(!(await page.locator(`${P} [data-qa="pace-measure"] p`).isVisible()), 'pacing: how to measure is closed at first');
  await fits(page, P, 'pacing closed');
  await page.locator(`${P} [data-qa="pace-measure"] summary`).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  check(await page.locator(`${P} [data-qa="pace-measure"] p`).isVisible(), 'pacing: Enter opens how to measure');
  check(norm(await text(page, `${P} [data-qa="pace-measure"] p`)).includes('67 צעדים כפולים ב־100 מ׳'), 'pacing: the measurement method is all there');
  await fits(page, P, 'pacing open');
  await shot(page, '11-pacing-open');
  await ctx.close();
}

// ───────────────────────────── 6 · recap: the terms, no second heading
{
  const { ctx, page } = await openScene('recap', '#scene-recap');
  const all = await text(page, '#scene-recap');
  check(!all.includes('מכאן ממשיכים לתרגול ולבדיקת הידע'), 'recap: the second big heading is gone');
  check(all.includes('ניווט לפי השטח (טופוגרפיה)') && all.includes('יכול לשמש כ״מעקה״'), 'recap: terrain association named as in the lesson, handrail as one case');
  check((await page.locator('#scene-recap .surface').count()) === 10, 'recap: all ten terms');
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);
  await fits(page, '#scene-recap', 'recap');
  await shot(page, '12-recap');
  await ctx.close();
}

// ───────────────────────────── reduced motion: the stages and the pacing disclosure still work
{
  const { ctx, page } = await openScene('onboarding', '#scene-onboarding [aria-controls="step-panel-start"]', { reduced: true });
  await page.locator('button[aria-controls="step-panel-start"]').click();
  await page.waitForTimeout(400);
  check((await page.locator('#step-panel-start p').count()) === 2, 'reduced motion: a stage opens');
  await ctx.close();
}

if (errors.length) fail(`page errors: ${errors.slice(0, 5).join(' | ')}`);
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
await browser.close();
process.exit(failures ? 1 : 0);
