// Acceptance run for topic-02 „תרגול: סיווג מרכיבי השטח” (illustrated SortQuiz stage, 2026-10-19).
//
//   QA_PORT=3117 node scripts/qa/terrain-classification.test.mjs [outDir]
//
// Drives the quiz at 1440×1122 (and once with prefers-reduced-motion) and checks: the opening state,
// all ten illustrations (WebP + PNG source) load, right / wrong answers and their copy, the first
// answer can't be overwritten, review of an answered item, „next” skipping answered items, image and
// feedback always belonging to the same item, keyboard navigation along the strip, completion,
// restart, no counters / score / „בהמשך השיעור” in any state, a constant screen height, and that the
// other SortQuiz (grid layout) on the page is unchanged. Screenshots of each state go to
// design/screenshots/terrain-classification/ (or [outDir]).
// Since 2026-10-27 (audit finding א2) an answer no longer moves on by itself: the item stays on stage
// with its result, the correct category and the scene's own explanation, and only „לפריט הבא” moves
// on — the same loop as „סיווג התכסית לפי מקור”. Every item's explanation is checked against
// QUIZ_ITEMS in the scene file, and the answer → „next” loop is also run from the keyboard alone.
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';

const BASE = `http://localhost:${process.env.QA_PORT ?? 3000}`;
const outDir = process.argv[2] ?? 'design/screenshots/terrain-classification';
await mkdir(outDir, { recursive: true });

const ITEMS = [
  ['גבעה', 'relief', 'item-hill'],
  ['חורש', 'cover', 'item-grove'],
  ['בית', 'cover', 'item-house'],
  ['עמק', 'relief', 'item-valley'],
  ['כביש', 'cover', 'item-road'],
  ['מדרון', 'relief', 'item-slope'],
  ['מטע זיתים', 'cover', 'item-olive-orchard'],
  ['אוכף', 'relief', 'item-saddle'],
];
const LABEL = { relief: 'תבליט', cover: 'תכסית' };
const other = (k) => (k === 'relief' ? 'cover' : 'relief');

// the explanations: QUIZ_ITEMS in the scene file is their single source
const sceneSrc = await readFile('src/components/lessons/topic-02/ReliefCoverIntroScene.tsx', 'utf8');
const quizSrc = sceneSrc.slice(sceneSrc.indexOf('const QUIZ_ITEMS'), sceneSrc.indexOf('];', sceneSrc.indexOf('const QUIZ_ITEMS')));
const WHY = Object.fromEntries(
  [...quizSrc.matchAll(/label:\s*'([^']*)',\s*answer:\s*'(\w+)',\s*why:\s*'([^']*)'/g)].map((m) => [m[1], { answer: m[2], why: m[3] }]),
);

const failures = [];
const check = (ok, msg) => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${msg}`);
  if (!ok) failures.push(msg);
};

check(
  Object.keys(WHY).length === ITEMS.length && ITEMS.every(([label, k]) => WHY[label]?.answer === k),
  `QUIZ_ITEMS parsed: ${Object.keys(WHY).length} items, answers match`,
);
/** The feedback the item must show after `picked`: result, the correct category when wrong, its explanation. */
const expectedFeedback = (label, picked) => {
  const { answer, why } = WHY[label];
  return `${picked === answer ? 'נכון. ' : `לא בדיוק. הסיווג הנכון: ${LABEL[answer]}. `}${why}`;
};

const browser = await chromium.launch({ channel: 'chrome' });

for (const reduced of [false, true]) {
  const tag = reduced ? 'reduced' : 'motion';
  console.log(`\n=== 1440x1122 ${tag}`);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1122 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  await page.goto(`${BASE}/lessons/topic-02/#scene-relief-cover`, { waitUntil: 'networkidle', timeout: 180000 });
  const quiz = page.locator('#scene-relief-cover [data-qa="sort-quiz"]');
  await quiz.waitFor({ timeout: 120000 });
  await page.evaluate(() => {
    const fit = document.querySelector('#scene-relief-cover [data-qa="sort-quiz"]').closest('[data-lesson-viewport-fit]');
    window.scrollTo(0, fit.getBoundingClientRect().top + scrollY - 104);
  });
  await page.waitForTimeout(1200);

  const tokens = quiz.locator('[data-qa="sq-token"]');
  const option = (k) => quiz.locator('[data-qa="sq-option"]').filter({ hasText: LABEL[k] });
  const feedback = quiz.locator('[data-qa="sq-feedback"]');
  const next = quiz.locator('[data-qa="sq-next"]');
  const img = quiz.locator('[data-qa="sq-illustration"] img');
  const shot = (name) => page.screenshot({ path: `${outDir}/state-${tag}-${name}.png` });
  const settle = () => page.waitForTimeout(500); // the stage's entrance (0.25 s) has run
  /** The feedback text without the „לפריט הבא” button's label. */
  const feedbackText = () => feedback.locator('p').innerText();
  const focused = (loc) => loc.evaluate((b) => b === document.activeElement);
  const fitHeight = () =>
    quiz.evaluate((q) => Math.round(q.closest('[data-lesson-viewport-fit]').getBoundingClientRect().height));
  const stageIs = async (i, why) => {
    const [label, , file] = ITEMS[i];
    const cur = await quiz.locator('[data-qa="sq-token"][aria-current="step"]').innerText();
    const src = await img.getAttribute('src');
    const alt = await img.getAttribute('alt');
    const groupLabel = await quiz.locator('[role="group"]').getAttribute('aria-label');
    check(
      cur.startsWith(label) && src.includes(`/${file}.`) && groupLabel === `מיון: ${label}` && !/תבליט|תכסית/.test(alt),
      `${why}: stage shows ${label} (token "${cur.split('\n')[0]}", ${src.split('/').pop()}, alt free of the answer)`,
    );
  };
  const noCounters = async (when) => {
    const text = await page.locator('#scene-relief-cover').innerText();
    check(!/מתוך|\d+\s*\/\s*\d+|בהמשך השיעור/.test(text), `${when}: no item counter, score or „בהמשך השיעור” in the section`);
  };

  // ── opening state
  const h0 = await fitHeight();
  await stageIs(0, 'open');
  check((await quiz.locator('[data-qa="sq-token"] .sr-only').count()) === 0, 'open: no token carries a result');
  check((await feedback.count()) === 0, 'open: no feedback');
  check((await quiz.locator('[data-qa="sq-hint"]').innerText()) === 'בחרו תבליט או תכסית', 'open: quiet hint under the choices');
  check((await quiz.locator('[data-qa="sq-reset"]').count()) === 1, 'open: restart available before any answer');
  check(
    (await quiz.locator('[data-qa="sq-option"]').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-pressed')))).join() === 'false,false',
    'open: both choices are aria-pressed=false buttons',
  );
  check(
    (await quiz.locator('[data-qa="sq-option"] img').evaluateAll((is) => is.map((i) => i.getAttribute('alt')))).join('|') === '|',
    'open: choice illustrations are decorative (alt="")',
  );
  await noCounters('open');
  await img.evaluate((i) => i.complete || new Promise((r) => (i.onload = r)));
  await shot('01-open');

  // ── all ten assets, WebP and PNG source
  if (!reduced) {
    const names = [...ITEMS.map((x) => x[2]), 'choice-relief', 'choice-cover'];
    const res = await page.evaluate(
      async (names) =>
        Promise.all(
          names.flatMap((n) =>
            ['webp', 'png'].map(async (ext) => {
              const r = await fetch(`/assets/lessons/topic02/terrain-classification/${n}.${ext}`);
              const blob = await r.blob();
              const bmp = await createImageBitmap(blob);
              const c = new OffscreenCanvas(bmp.width, bmp.height);
              const ctx = c.getContext('2d');
              ctx.drawImage(bmp, 0, 0);
              const corner = ctx.getImageData(0, 0, 1, 1).data[3];
              return `${n}.${ext} ${r.status} ${bmp.width}x${bmp.height} cornerAlpha=${corner}`;
            }),
          ),
        ),
      names,
    );
    const bad = res.filter((s) => !/ 200 1536x1024 cornerAlpha=0$/.test(s));
    check(bad.length === 0, `assets: 20 files load 200, 1536×1024, transparent corner${bad.length ? ' — ' + bad.join('; ') : ''}`);
  }

  // ── centered choices: the two cards share the illustration's vertical center
  const centers = await quiz.evaluate((q) => {
    const c = (el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
    return { frame: c(q.querySelector('[data-qa="sq-illustration"]')), choices: c(q.querySelector('[data-qa="sq-choices"]')) };
  });
  check(Math.abs(centers.frame - centers.choices) <= 1, `choices centered on the illustration (Δ ${(centers.choices - centers.frame).toFixed(1)} px)`);

  // ── the first item, answered wrong (the audit's repro: גבעה → „תכסית”): it stays on stage with the
  //    correct category and its explanation; only „לפריט הבא” moves on
  await option('cover').click();
  await settle();
  await stageIs(0, 'גבעה answered wrong: the item stays');
  check((await feedbackText()) === expectedFeedback('גבעה', 'cover'), `גבעה wrong: correct category + explanation on screen (${(await feedbackText()).slice(0, 50)}…)`);
  check(await feedback.isVisible(), 'גבעה wrong: the feedback is visible, not only in a live region');
  check((await option('relief').innerText()).trim() === 'תבליט' && /(^|\s)border-brand(\s|$)/.test(await option('relief').getAttribute('class')), 'גבעה wrong: the right choice („תבליט”) is marked');
  check((await option('cover').getAttribute('aria-pressed')) === 'true', 'גבעה wrong: the learner\'s choice stays pressed');
  check((await tokens.nth(0).innerText()).includes('לא נכון'), 'גבעה token shows a wrong result');
  check(await next.isVisible(), 'גבעה wrong: „לפריט הבא” is offered');
  check(await focused(next), 'after an answer, focus is on „לפריט הבא”');
  check(await feedback.evaluate((f) => !!f.closest('[aria-live="polite"]')), 'the feedback is inside the polite live region (announced as it appears)');
  await page.waitForTimeout(1500);
  await stageIs(0, 'גבעה, 2 s later: no auto-advance');
  await noCounters('after a wrong answer');
  await shot('02-hill-wrong');
  await next.click();
  await settle();
  await stageIs(1, '„לפריט הבא” after גבעה');
  check(await focused(quiz.locator('[data-qa="sq-option"]').first()), 'after „next”, focus is on the first choice of the new item');
  check((await feedback.count()) === 0 && (await quiz.locator('[data-qa="sq-hint"]').count()) === 1, 'new item opens unanswered (hint, no feedback)');

  // ── pick בית, answer right → stays, with „נכון” and the explanation
  await tokens.nth(2).click();
  await settle();
  await stageIs(2, 'pick בית');
  await option('cover').click();
  await settle();
  await stageIs(2, 'בית answered right: the item stays');
  check((await feedbackText()) === expectedFeedback('בית', 'cover'), 'בית right: „נכון.” + explanation');
  check((await tokens.nth(2).innerText()).includes('נכון') && !(await tokens.nth(2).innerText()).includes('לא נכון'), 'בית token shows a right result');
  await shot('03-house-right');
  await next.click();
  await settle();
  await stageIs(3, '„לפריט הבא” after בית → עמק (the next unanswered)');

  // ── עמק: a double click answers עמק once — the second click neither changes it nor moves on
  await option('cover').dblclick();
  await settle();
  await stageIs(3, 'double click on עמק: the item stays');
  check((await tokens.nth(3).innerText()).includes('לא נכון'), 'עמק token shows a wrong result');
  check(!(await tokens.nth(4).innerText()).includes('נכון'), 'double click did not answer the next item (כביש)');
  check((await feedbackText()) === expectedFeedback('עמק', 'cover'), 'עמק wrong: correct category + explanation');

  // ── review עמק and בית: saved answer and explanation; nothing changes; „next” skips answered items
  await tokens.nth(0).click();
  await settle();
  await tokens.nth(3).click();
  await settle();
  await stageIs(3, 'review עמק');
  const wrongText = await feedbackText();
  check(wrongText.startsWith('לא בדיוק. הסיווג הנכון: תבליט. עמק הוא אזור נמוך'), `review עמק: explicit correct category (${wrongText.slice(0, 40)}…)`);
  await shot('04-review-valley-wrong');
  await tokens.nth(2).click();
  await settle();
  await stageIs(2, 'review בית');
  check((await option('cover').getAttribute('aria-pressed')) === 'true' && (await feedback.innerText()).startsWith('נכון. בית הוא מבנה'), 'review בית: saved choice + explanation');
  check((await option('relief').getAttribute('aria-disabled')) === 'true', 'review: answered choices are locked (aria-disabled, still focusable)');
  await option('relief').click({ force: true });
  await settle();
  await stageIs(2, 'click on a locked choice');
  check((await option('cover').getAttribute('aria-pressed')) === 'true', 'בית: first answer kept after another click');
  await shot('05-review-house');
  await next.click();
  await settle();
  await stageIs(4, '„next” from בית skips answered עמק');
  check(await quiz.locator('[data-qa="sq-option"]').first().evaluate((b) => b === document.activeElement), 'after „next”, focus is on the first choice');

  // ── fast navigation: image and feedback always belong to the item on stage
  for (const i of [5, 1, 7, 3, 0, 6, 2]) await tokens.nth(i).click();
  await settle();
  await stageIs(2, 'after rapid navigation');
  check((await feedback.innerText()).includes('בית הוא מבנה'), 'after rapid navigation: feedback is בית\'s');

  // ── keyboard along the strip (RTL: ArrowLeft = forward)
  await tokens.nth(2).focus();
  await page.keyboard.press('ArrowLeft');
  await settle();
  await stageIs(3, 'ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await settle();
  await stageIs(1, 'ArrowRight ×2');
  await page.keyboard.press('End');
  await settle();
  await stageIs(7, 'End');
  check(await tokens.nth(7).evaluate((b) => b === document.activeElement && b.tabIndex === 0), 'End: focus follows, roving tabindex');
  await page.keyboard.press('Home');
  await settle();
  await stageIs(0, 'Home');
  check((await tokens.evaluateAll((ts) => ts.filter((t) => t.tabIndex === 0).length)) === 1, 'strip is a single Tab stop');

  // ── answer the rest, all as „תבליט” except אוכף (→ „תכסית”, the longest explanation, wrong). Each
  //    item stays with its own feedback until „לפריט הבא”, which visits unanswered items only.
  // on stage: גבעה (0, answered). Unanswered: 1,4,5,6,7 (0,2,3 answered).
  check(await next.isVisible(), 'a reviewed item offers „לפריט הבא” while items remain');
  await next.click();
  await settle();
  const order = [];
  for (let n = 0; n < 5; n++) {
    const cur = await quiz.locator('[data-qa="sq-token"]').evaluateAll((ts) => ts.findIndex((t) => t.getAttribute('aria-current') === 'step'));
    order.push(cur);
    const [label] = ITEMS[cur];
    await stageIs(cur, `run ${n}`);
    const picked = label === 'אוכף' ? 'cover' : 'relief';
    await option(picked).click();
    await settle();
    await stageIs(cur, `run ${n}: ${label} stays after its answer`);
    check((await feedbackText()) === expectedFeedback(label, picked), `${label} (${LABEL[picked]}): result, correct category and explanation shown`);
    if (label === 'אוכף') {
      const slot = await feedback.evaluate((f) => {
        const s = f.parentElement;
        return { slot: s.getBoundingClientRect().height, fb: f.getBoundingClientRect().height };
      });
      check(slot.fb <= slot.slot + 0.5, `longest feedback fits its reserved slot (${slot.fb.toFixed(0)} ≤ ${slot.slot.toFixed(0)})`);
      await shot('06-saddle-wrong-longest');
    }
    if (n < 4) {
      check(await next.isVisible() && (await focused(next)), `${label}: „לפריט הבא” offered and focused`);
      await next.click();
      await settle();
    }
  }
  check(order.join() === '1,4,5,6,7', `„לפריט הבא” visits unanswered items only (${order.join()})`);
  const marks = await tokens.evaluateAll((ts) => ts.map((t) => (t.innerText.includes('לא נכון') ? 'x' : t.innerText.includes('נכון') ? 'v' : '-')));
  // first answers: גבעה תכסית✗ · חורש תבליט✗ · בית תכסית✓ · עמק תכסית✗ · כביש תבליט✗ · מדרון תבליט✓ · מטע זיתים תבליט✗ · אוכף תכסית✗
  check(marks.join('') === 'xxvxxvxx', `the first answers give the expected marks (${marks.join('')})`);

  // ── completion
  check((await next.count()) === 0, 'done: no „לפריט הבא”');
  check((await quiz.locator('[data-qa="sq-done"]').innerText()) === 'סיימתם את סיווג מרכיבי השטח. אפשר לבחור רכיב כדי לעיין שוב בהסבר.', 'done: completion line');
  check((await feedback.count()) === 1, 'done: last feedback stays visible');
  await noCounters('done');
  await shot('07-done');
  await tokens.nth(7).click();
  await settle();
  const slotDone = await quiz.locator('[data-qa="sq-done"]').evaluate((d) => {
    const s = d.parentElement.getBoundingClientRect();
    return d.getBoundingClientRect().bottom <= s.bottom + 0.5 && s.height;
  });
  check(slotDone !== false, `done + longest feedback still inside the reserved slot`);
  await shot('08-done-review-saddle');
  const hDone = await fitHeight();
  check(Math.abs(hDone - h0) <= 1, `screen height constant across states (${h0} → ${hDone})`);
  check(hDone <= 1122 - 80, `the quiz fits under the site header (${hDone} ≤ 1042)`);
  // back to a wrong item after finishing: its first answer, the correct category and the explanation
  await tokens.nth(0).click();
  await settle();
  await stageIs(0, 'done: back to גבעה');
  check((await feedbackText()) === expectedFeedback('גבעה', 'cover'), 'done: גבעה keeps its first answer and explanation');
  check((await option('cover').getAttribute('aria-pressed')) === 'true', 'done: גבעה still shows the learner\'s first choice');
  check((await next.count()) === 0 && (await quiz.locator('[data-qa="sq-done"]').count()) === 1, 'done: no „next”, the completion line stays');
  await shot('09-done-review-hill');

  // ── restart
  await quiz.locator('[data-qa="sq-reset"]').click();
  await settle();
  await stageIs(0, 'restart');
  check((await quiz.locator('[data-qa="sq-token"] .sr-only').count()) === 0 && (await feedback.count()) === 0, 'restart: all answers and marks cleared');
  check((await quiz.locator('[data-qa="sq-done"]').count()) === 0, 'restart: completion cleared');
  check(await quiz.locator('[data-qa="sq-option"]').first().evaluate((b) => b === document.activeElement), 'restart: focus on the first choice');

  // ── keyboard only, all eight right: a restart from the keyboard, then choice (Enter / Space) →
  //    focus on „לפריט הבא” → Enter → the next item's first choice, each with a visible focus ring
  await quiz.locator('[data-qa="sq-reset"]').focus();
  await page.keyboard.press('Enter');
  await settle();
  for (let i = 0; i < ITEMS.length; i++) {
    const [label, answer] = ITEMS[i];
    await stageIs(i, `keyboard: ${label}`);
    check((await page.evaluate(() => document.activeElement?.getAttribute('data-qa'))) === 'sq-option', `keyboard: ${label} opens with focus on its first choice`);
    if (answer === 'cover') await page.keyboard.press('Tab'); // the second choice
    check(await page.evaluate(() => document.activeElement.matches(':focus-visible')), `keyboard: ${label} — focus ring on the choice`);
    await page.keyboard.press(i % 2 ? ' ' : 'Enter');
    await settle();
    check((await feedbackText()) === expectedFeedback(label, answer), `keyboard: ${label} answered right, explanation shown`);
    if (i < ITEMS.length - 1) {
      check(await focused(next), `keyboard: ${label} — focus on „לפריט הבא”`);
      check(await page.evaluate(() => document.activeElement.matches(':focus-visible')), `keyboard: ${label} — focus ring on „לפריט הבא”`);
      await page.keyboard.press('Enter');
      await settle();
    }
  }
  const kbMarks = await tokens.evaluateAll((ts) => ts.map((t) => (t.innerText.includes('לא נכון') ? 'x' : t.innerText.includes('נכון') ? 'v' : '-')));
  check(kbMarks.join('') === 'vvvvvvvv', `keyboard: all eight right (${kbMarks.join('')})`);
  check((await quiz.locator('[data-qa="sq-done"]').count()) === 1, 'keyboard: completion line');
  await shot('10-keyboard-done');

  // ── the other SortQuiz on the page (grid layout) is unchanged
  const grid = page.locator('[data-qa="sort-quiz"][data-layout="grid"]');
  if (await grid.count()) {
    check(/0\/\d+ נכון/.test(await grid.first().innerText()), 'grid SortQuiz keeps its live score');
    check((await grid.first().locator('img').count()) === 0, 'grid SortQuiz has no illustrations');
  } else console.log('  (no grid SortQuiz on this page)');

  check(errors.length === 0, `no page errors / 4xx-5xx (${errors.join(' | ').slice(0, 300)})`);
  await page.close();
}
await browser.close();

if (failures.length) {
  console.log(`\n${failures.length} failure(s):\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log('\nall checks passed');
