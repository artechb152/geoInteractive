// Acceptance run for topic-02 „תרגול: סיווג מרכיבי השטח” (illustrated SortQuiz stage, 2026-10-19).
//
//   QA_PORT=3117 node scripts/qa/terrain-classification.test.mjs
//
// Drives the quiz at 1440×1122 (and once with prefers-reduced-motion) and checks: the opening state,
// all ten illustrations (WebP + PNG source) load, right / wrong answers and their copy, the first
// answer can't be overwritten, review of an answered item, „next” skipping answered items, image and
// feedback always belonging to the same item, keyboard navigation along the strip, completion,
// restart, no counters / score / „בהמשך השיעור” in any state, a constant screen height, and that the
// other SortQuiz (grid layout) on the page is unchanged. Screenshots of each state go to
// design/screenshots/terrain-classification/.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = `http://localhost:${process.env.QA_PORT ?? 3000}`;
const outDir = 'design/screenshots/terrain-classification';
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

const failures = [];
const check = (ok, msg) => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${msg}`);
  if (!ok) failures.push(msg);
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
  const settle = () => page.waitForTimeout(500); // ≥ the 450 ms double-click guard after an auto-advance
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

  // ── pick בית, answer right → moves on at once to עמק (the next unanswered)
  await tokens.nth(2).click();
  await settle();
  await stageIs(2, 'pick בית');
  await option('cover').click();
  await settle();
  await stageIs(3, 'auto-advance after בית');
  check((await tokens.nth(2).innerText()).includes('נכון') && !(await tokens.nth(2).innerText()).includes('לא נכון'), 'בית token shows a right result');
  check((await quiz.locator('[aria-live="polite"] .sr-only').innerText()) === 'בית: נכון.', 'the result of בית is announced to screen readers');
  check(await quiz.locator('[data-qa="sq-option"]').first().evaluate((b) => b === document.activeElement), 'after auto-advance, focus is on the first choice of the new item');
  check((await feedback.count()) === 0 && (await quiz.locator('[data-qa="sq-hint"]').count()) === 1, 'new item opens unanswered (hint, no feedback)');
  await noCounters('after a right answer');
  await shot('02-after-house');

  // ── עמק: a double click answers עמק only — the second click must not answer כביש
  await option('cover').dblclick();
  await settle();
  await stageIs(4, 'auto-advance after עמק');
  check((await tokens.nth(3).innerText()).includes('לא נכון'), 'עמק token shows a wrong result');
  check(!(await tokens.nth(4).innerText()).includes('נכון'), 'double click did not answer the next item (כביש)');
  check((await quiz.locator('[aria-live="polite"] .sr-only').innerText()) === 'עמק: לא בדיוק. הסיווג הנכון: תבליט.', 'wrong result announced with the correct category');

  // ── review עמק and בית: saved answer and explanation; nothing changes; „next” skips answered items
  await tokens.nth(3).click();
  await settle();
  await stageIs(3, 'review עמק');
  const wrongText = await feedback.innerText();
  check(wrongText.startsWith('לא בדיוק. הסיווג הנכון: תבליט. עמק הוא אזור נמוך'), `review עמק: explicit correct category (${wrongText.slice(0, 40)}…)`);
  check((await quiz.locator('[aria-live="polite"] .sr-only').count()) === 0, 'manual navigation clears the auto-advance announcement');
  await shot('03-review-valley-wrong');
  await tokens.nth(2).click();
  await settle();
  await stageIs(2, 'review בית');
  check((await option('cover').getAttribute('aria-pressed')) === 'true' && (await feedback.innerText()).startsWith('נכון. בית הוא מבנה'), 'review בית: saved choice + explanation');
  check((await option('relief').getAttribute('aria-disabled')) === 'true', 'review: answered choices are locked (aria-disabled, still focusable)');
  await option('relief').click({ force: true });
  await settle();
  await stageIs(2, 'click on a locked choice');
  check((await option('cover').getAttribute('aria-pressed')) === 'true', 'בית: first answer kept after another click');
  await shot('04-review-house');
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

  // ── answer the rest, all as „תבליט” → exactly the 4 relief items come out right; next skips answered ones
  // on stage: גבעה (0). Unanswered: 0,1,4,5,6,7 (2,3 answered).
  const order = [];
  for (let n = 0; n < 6; n++) {
    const cur = await quiz.locator('[data-qa="sq-token"]').evaluateAll((ts) => ts.findIndex((t) => t.getAttribute('aria-current') === 'step'));
    order.push(cur);
    await stageIs(cur, `run ${n}`);
    if (ITEMS[cur][0] === 'אוכף') {
      await option('cover').click(); // longest explanation, wrong
    } else await option('relief').click();
    await settle();
    if (ITEMS[cur][0] === 'אוכף') {
      check((await feedback.innerText()).startsWith('לא בדיוק. הסיווג הנכון: תבליט. אוכף'), 'אוכף wrong: longest explanation');
      const slot = await feedback.evaluate((f) => {
        const s = f.parentElement;
        return { slot: s.getBoundingClientRect().height, fb: f.getBoundingClientRect().height };
      });
      check(slot.fb <= slot.slot + 0.5, `longest feedback fits its reserved slot (${slot.fb.toFixed(0)} ≤ ${slot.slot.toFixed(0)})`);
      await shot('05-saddle-wrong-longest');
    }
  }
  check(order.join() === '0,1,4,5,6,7', `auto-advance visits unanswered items only, wrapping (${order.join()})`);
  const marks = await tokens.evaluateAll((ts) => ts.map((t) => (t.innerText.includes('לא נכון') ? 'x' : t.innerText.includes('נכון') ? 'v' : '-')));
  // answers given: 0..7 → relief except בית/עמק/אוכף = cover → right = relief items answered relief (0,5) + בית (cover✓)
  check(marks.join('') === 'vxvxxvxx', `answer map (4 relief / 4 cover) gives the expected marks (${marks.join('')})`);

  // ── completion
  check((await next.count()) === 0, 'done: no „לפריט הבא”');
  check((await quiz.locator('[data-qa="sq-done"]').innerText()) === 'סיימתם את סיווג מרכיבי השטח. אפשר לבחור רכיב כדי לעיין שוב בהסבר.', 'done: completion line');
  check((await feedback.count()) === 1, 'done: last feedback stays visible');
  await noCounters('done');
  await shot('06-done');
  await tokens.nth(7).click();
  await settle();
  const slotDone = await quiz.locator('[data-qa="sq-done"]').evaluate((d) => {
    const s = d.parentElement.getBoundingClientRect();
    return d.getBoundingClientRect().bottom <= s.bottom + 0.5 && s.height;
  });
  check(slotDone !== false, `done + longest feedback still inside the reserved slot`);
  await shot('07-done-review-saddle');
  const hDone = await fitHeight();
  check(Math.abs(hDone - h0) <= 1, `screen height constant across states (${h0} → ${hDone})`);

  // ── restart
  await quiz.locator('[data-qa="sq-reset"]').click();
  await settle();
  await stageIs(0, 'restart');
  check((await quiz.locator('[data-qa="sq-token"] .sr-only').count()) === 0 && (await feedback.count()) === 0, 'restart: all answers and marks cleared');
  check((await quiz.locator('[data-qa="sq-done"]').count()) === 0, 'restart: completion cleared');
  check(await quiz.locator('[data-qa="sq-option"]').first().evaluate((b) => b === document.activeElement), 'restart: focus on the first choice');

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
