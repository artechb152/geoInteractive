// Acceptance run for topic-02 „תרגול: סיווג התכסית לפי מקור” (illustrated SortQuiz stage, 2026-10-19).
//
//   QA_PORT=3000 node scripts/qa/landcover-origin-classification.test.mjs
//
// Drives the quiz at 1440×1122 (and once with prefers-reduced-motion) and checks: the opening state,
// all ten illustrations (WebP + PNG source) load, right / wrong answers and their copy, the first
// answer can't be overwritten, review of an answered item, „next” skipping answered items and
// wrapping, image and feedback always belonging to the same item, keyboard navigation along the strip,
// the id → label → art → category → explanation map of all eight items (3 natural / 5 artificial),
// completion, restart, no counters / score in any state, a constant screen height, full token labels,
// and that answers here never reach „סיווג מרכיבי השטח” (same item ids, its own state). Screenshots of
// each state go to design/screenshots/landcover-origin-classification/.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = `http://localhost:${process.env.QA_PORT ?? 3000}`;
const outDir = 'design/screenshots/landcover-origin-classification';
await mkdir(outDir, { recursive: true });

/** label, answer, file, opening words of the explanation */
const ITEMS = [
  ['חורש', 'natural', 'item-grove', 'העצים והשיחים בחורש גדלו באופן טבעי'],
  ['מטע הדרים', 'artificial', 'item-citrus-orchard', 'עצי המטע ניטעו בידי אדם'],
  ['גריגה', 'natural', 'item-garrigue', 'גריגה היא תצורת שיחים שגדלו באופן טבעי'],
  ['יער נטוע', 'artificial', 'item-planted-forest', 'היער נוצר בנטיעה בידי אדם'],
  ['טרסות', 'artificial', 'item-terraces', 'הטרסות נבנו בידי אדם לצורך עיבוד חקלאי'],
  ['בתה', 'natural', 'item-batha', 'בני־השיח בבתה גדלו באופן טבעי'],
  ['מאגר מים', 'artificial', 'item-reservoir', 'המאגר המוצג הוקם בידי אדם לצורכי השקיה'],
  ['שדה חיטה', 'artificial', 'item-wheat-field', 'החיטה נזרעה בשטח שהאדם מעבד'],
];
const LABEL = { natural: 'טבעית', artificial: 'מלאכותית' };
const other = (k) => (k === 'natural' ? 'artificial' : 'natural');

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
  const quiz = page.locator('#scene-landcover [data-qa="sort-quiz"]');
  const sibling = page.locator('#scene-relief-cover [data-qa="sort-quiz"]');
  const scrollTo = (sel) =>
    page.evaluate((sel) => {
      const fit = document.querySelector(sel).closest('[data-lesson-viewport-fit]');
      window.scrollTo(0, fit.getBoundingClientRect().top + scrollY - 104);
    }, sel);

  // ── isolation, part 1: answer „חורש” in the sibling quiz (same id q-grove, other answer space) first,
  //    then page over to this one (the lesson mounts one sub-topic at a time)
  await page.goto(`${BASE}/lessons/topic-02/#scene-relief-cover`, { waitUntil: 'networkidle', timeout: 180000 });
  await sibling.waitFor({ timeout: 120000 });
  await scrollTo('#scene-relief-cover [data-qa="sort-quiz"]');
  await page.waitForTimeout(600);
  await sibling.locator('[data-qa="sq-token"]').nth(1).click();
  await sibling.locator('[data-qa="sq-option"]').filter({ hasText: 'תבליט' }).click();
  await page.evaluate(() => (location.hash = '#scene-landcover'));
  await quiz.waitFor({ timeout: 120000 });
  await page.waitForTimeout(800);
  await scrollTo('#scene-landcover [data-qa="sort-quiz"]');
  await page.waitForTimeout(1200);

  const tokens = quiz.locator('[data-qa="sq-token"]');
  const option = (k) => quiz.locator('[data-qa="sq-option"]').filter({ hasText: LABEL[k] });
  const feedback = quiz.locator('[data-qa="sq-feedback"]');
  const next = quiz.locator('[data-qa="sq-next"]');
  const img = quiz.locator('[data-qa="sq-illustration"] img');
  const shot = (name) => page.screenshot({ path: `${outDir}/state-${tag}-${name}.png` });
  const settle = () => page.waitForTimeout(reduced ? 120 : 450);
  const fitHeight = () =>
    quiz.evaluate((q) => Math.round(q.closest('[data-lesson-viewport-fit]').getBoundingClientRect().height));
  const curIdx = () => tokens.evaluateAll((ts) => ts.findIndex((t) => t.getAttribute('aria-current') === 'step'));
  const stageIs = async (i, why) => {
    const [label, , file] = ITEMS[i];
    const cur = await quiz.locator('[data-qa="sq-token"][aria-current="step"]').innerText();
    const src = await img.getAttribute('src');
    const alt = await img.getAttribute('alt');
    const groupLabel = await quiz.locator('[role="group"]').getAttribute('aria-label');
    check(
      cur.startsWith(label) && src.includes(`/${file}.webp`) && groupLabel === `מיון: ${label}` && !/טבעי|מלאכותי/.test(alt),
      `${why}: stage shows ${label} (token "${cur.split('\n')[0]}", ${src.split('/').pop()}, alt free of the answer)`,
    );
  };
  const noCounters = async (when) => {
    const text = await quiz.evaluate((q) => q.closest('[data-lesson-viewport-fit]').innerText);
    check(!/מתוך|\d|%|בהמשך השיעור/.test(text), `${when}: no item counter, score, number or „בהמשך השיעור” on the quiz screen`);
    check((await quiz.locator('[role="progressbar"]').count()) === 0, `${when}: no progress bar in the quiz`);
  };

  // ── opening state
  const h0 = await fitHeight();
  await stageIs(0, 'open');
  check((await quiz.locator('[data-qa="sq-token"] .sr-only').count()) === 0, 'open: no token carries a result (isolated from the sibling quiz)');
  check((await feedback.count()) === 0, 'open: no feedback');
  check((await quiz.locator('[data-qa="sq-hint"]').innerText()) === 'בחרו טבעית או מלאכותית', 'open: quiet hint under the choices');
  check((await quiz.locator('[data-qa="sq-reset"]').innerText()).trim() === 'התחלה מחדש', 'open: restart available before any answer');
  check((await page.locator('#scene-landcover h3', { hasText: 'תרגול: סיווג התכסית לפי מקור' }).count()) === 1, 'open: outer title');
  check((await quiz.locator('h4').innerText()) === 'טבעית או מלאכותית?', 'open: card title');
  check(
    (await quiz.locator('h4 + p').innerText()) === 'סווגו כל רכיב כתכסית טבעית או מלאכותית לפי מקורו. לאחר הבחירה יוצג הסבר לסיווג.',
    'open: exact instruction',
  );
  check((await tokens.allInnerTexts()).map((t) => t.trim()).join('|') === ITEMS.map((x) => x[0]).join('|'), 'open: strip lists the eight names in reading order');
  check(
    (await tokens.evaluateAll((ts) => ts.filter((t) => { const s = t.querySelector('.truncate'); return s.scrollWidth > s.clientWidth + 0.5; }).length)) === 0,
    'open: no token label is truncated',
  );
  check(
    (await quiz.locator('[data-qa="sq-option"]').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-pressed')))).join() === 'false,false',
    'open: both choices are aria-pressed=false buttons',
  );
  check(
    (await quiz.locator('[data-qa="sq-option"]').evaluateAll((bs) => bs.map((b) => b.innerText.trim()))).join() === 'טבעית,מלאכותית',
    'open: טבעית first (right in RTL), מלאכותית second',
  );
  check(
    (await quiz.locator('[data-qa="sq-option"] img').evaluateAll((is) => is.map((i) => i.getAttribute('alt')))).join('|') === '|',
    'open: choice illustrations are decorative (alt="")',
  );
  await noCounters('open');
  await img.evaluate((i) => i.complete || new Promise((r) => (i.onload = r)));
  const sizes = await quiz.evaluate((q) => {
    const s = +q.closest('[data-lesson-viewport-fit]').dataset.fitScale;
    const r = (el) => el.getBoundingClientRect();
    const opt = q.querySelector('[data-qa="sq-option"]');
    return {
      scale: s,
      illo: Math.round(r(q.querySelector('[data-qa="sq-illustration"]')).width),
      choiceH: Math.round(r(opt).height),
      choiceArtH: Math.round(r(opt.querySelector('img')).height),
      choiceFont: Math.round(parseFloat(getComputedStyle(opt).fontSize) * s),
    };
  });
  console.log('        at 1440:', JSON.stringify(sizes));
  check(sizes.illo >= 350 && sizes.illo <= 430, `main illustration ${sizes.illo}px wide (350–430)`);
  check(sizes.choiceH >= 170 && sizes.choiceH <= 190, `choice cards ${sizes.choiceH}px tall (170–190)`);
  check(sizes.choiceArtH >= 105 && sizes.choiceArtH <= 125, `choice art ${sizes.choiceArtH}px tall (105–125)`);
  await shot('01-open');

  // ── all ten assets, WebP and PNG source
  if (!reduced) {
    const names = [...ITEMS.map((x) => x[2]), 'choice-natural', 'choice-artificial'];
    const res = await page.evaluate(
      async (names) =>
        Promise.all(
          names.flatMap((n) =>
            ['webp', 'png'].map(async (ext) => {
              const r = await fetch(`/assets/lessons/topic02/landcover-origin-classification/${n}.${ext}`);
              const bmp = await createImageBitmap(await r.blob());
              const c = new OffscreenCanvas(bmp.width, bmp.height);
              const ctx = c.getContext('2d');
              ctx.drawImage(bmp, 0, 0);
              const corners = [[0, 0], [bmp.width - 1, 0], [0, bmp.height - 1], [bmp.width - 1, bmp.height - 1]].map(
                ([x, y]) => ctx.getImageData(x, y, 1, 1).data[3],
              );
              return `${n}.${ext} ${r.status} ${bmp.width}x${bmp.height} cornerAlpha=${Math.max(...corners)}`;
            }),
          ),
        ),
      names,
    );
    const bad = res.filter((s) => !/ 200 1536x1024 cornerAlpha=[012]$/.test(s));
    check(bad.length === 0, `assets: 20 files load 200, 1536×1024, transparent corners${bad.length ? ' — ' + bad.join('; ') : ''}`);
  }

  // ── חורש, answer right; extra clicks never overwrite
  await option('natural').click();
  await settle();
  check(await next.evaluate((b) => b === document.activeElement), 'after answering, focus is on „לפריט הבא”');
  await option('natural').click({ force: true });
  await option('artificial').click({ force: true });
  await settle();
  check((await option('natural').getAttribute('aria-pressed')) === 'true' && (await option('artificial').getAttribute('aria-pressed')) === 'false', 'חורש: first answer kept after extra clicks');
  check((await feedback.innerText()).startsWith(`נכון. ${ITEMS[0][3]}`), 'חורש right: „נכון.” + why');
  check((await tokens.nth(0).innerText()).includes('נכון'), 'חורש token announces its result');
  check((await tokens.nth(0).getAttribute('aria-current')) === 'step', 'חורש: answered and still current');
  await noCounters('after a right answer');

  // ── next → מטע הדרים, before answering (the mockup's state)
  await next.click();
  await settle();
  await stageIs(1, 'next from חורש');
  check(await quiz.locator('[data-qa="sq-option"]').first().evaluate((b) => b === document.activeElement), 'after „next”, focus is on the first choice');
  await img.evaluate((i) => i.complete || new Promise((r) => (i.onload = r)));
  await page.mouse.move(0, 0);
  await shot('02-citrus-before-answer');
  await option('artificial').click();
  await settle();

  // ── יער נטוע, answered wrong (double click)
  await tokens.nth(3).click();
  await settle();
  await stageIs(3, 'pick יער נטוע');
  await option('natural').dblclick();
  await settle();
  const wrongText = await feedback.innerText();
  check(wrongText.startsWith(`לא בדיוק. הסיווג הנכון: תכסית מלאכותית. ${ITEMS[3][3]}`), `יער נטוע wrong: explicit correct category (${wrongText.slice(0, 48)}…)`);
  check((await tokens.nth(3).innerText()).includes('לא נכון'), 'יער נטוע token announces a wrong result');
  check((await option('artificial').innerText()).includes('מלאכותית') && (await option('natural').getAttribute('aria-pressed')) === 'true', 'יער נטוע: the wrong pick stays pressed');
  await page.mouse.move(0, 0);
  await shot('03-planted-wrong');

  // ── review חורש: saved answer and its explanation, nothing changes
  await tokens.nth(0).click();
  await settle();
  await stageIs(0, 'review חורש');
  check((await option('natural').getAttribute('aria-pressed')) === 'true' && (await feedback.innerText()).startsWith('נכון. העצים'), 'review חורש: saved choice + explanation');
  check((await option('artificial').getAttribute('aria-disabled')) === 'true', 'review: answered choices are locked (aria-disabled, still focusable)');

  // ── fast navigation: image and feedback always belong to the item on stage
  for (const i of [5, 1, 7, 3, 2, 6, 0]) await tokens.nth(i).click();
  await settle();
  await stageIs(0, 'after rapid navigation');
  check((await feedback.innerText()).includes(ITEMS[0][3]), 'after rapid navigation: feedback is חורש\'s');

  // ── keyboard along the strip (RTL: ArrowLeft = forward)
  await tokens.nth(0).focus();
  await page.keyboard.press('ArrowLeft');
  await settle();
  await stageIs(1, 'ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await settle();
  await stageIs(0, 'ArrowRight');
  await page.keyboard.press('End');
  await settle();
  await stageIs(7, 'End');
  check(await tokens.nth(7).evaluate((b) => b === document.activeElement && b.tabIndex === 0), 'End: focus follows, roving tabindex');
  check((await tokens.evaluateAll((ts) => ts.filter((t) => t.tabIndex === 0).length)) === 1, 'strip is a single Tab stop');
  await page.keyboard.press('Home');
  await settle();
  await stageIs(0, 'Home');
  await page.keyboard.press('End');
  await settle();

  // ── answer the rest from שדה חיטה: next skips answered items and wraps (7 → 2 → 4 → 5 → 6)
  const plan = { 7: 'artificial', 2: 'artificial', 4: 'artificial', 5: 'natural', 6: 'natural' };
  const order = [];
  for (let n = 0; n < 5; n++) {
    const cur = await curIdx();
    order.push(cur);
    await stageIs(cur, `run ${n}`);
    await option(plan[cur] ?? 'natural').click();
    await settle();
    if (n < 4) {
      await next.click();
      await settle();
    }
  }
  check(order.join() === '7,2,4,5,6', `„next” visits unanswered items only, wrapping (${order.join()})`);
  const marks = await tokens.evaluateAll((ts) => ts.map((t) => (t.innerText.includes('לא נכון') ? 'x' : t.innerText.includes('נכון') ? 'v' : '-')));
  check(marks.join('') === 'vvxxvvxv', `answers give the expected marks (${marks.join('')})`);

  // ── completion
  check((await next.count()) === 0, 'done: no „לפריט הבא”');
  check((await quiz.locator('[data-qa="sq-done"]').innerText()) === 'סיימתם את סיווג התכסית לפי מקור. אפשר לבחור רכיב כדי לעיין שוב בהסבר.', 'done: completion line');
  check((await feedback.count()) === 1, 'done: last feedback stays visible');
  check(await page.evaluate(() => document.activeElement && document.activeElement !== document.body), 'done: focus is still on an element (none removed under it)');
  await noCounters('done');
  await page.mouse.move(0, 0);
  await shot('04-done');

  // ── the full map: each item's art, category and explanation; 3 natural / 5 artificial
  const given = { 0: 'natural', 1: 'artificial', 3: 'natural', ...plan };
  const derived = [];
  let slotOk = true;
  for (let i = 0; i < ITEMS.length; i++) {
    await tokens.nth(i).click();
    await settle();
    await stageIs(i, `review ${ITEMS[i][0]}`);
    const t = await feedback.innerText();
    const right = t.startsWith('נכון.');
    const ans = right ? given[i] : other(given[i]);
    derived.push(ans);
    const expectStart = right ? `נכון. ${ITEMS[i][3]}` : `לא בדיוק. הסיווג הנכון: תכסית ${LABEL[ans]}. ${ITEMS[i][3]}`;
    check(ans === ITEMS[i][1] && t.startsWith(expectStart), `map ${ITEMS[i][0]} → ${LABEL[ans]} + its explanation`);
    slotOk &&= await quiz.locator('[data-qa="sq-done"]').evaluate((d) => d.getBoundingClientRect().bottom <= d.parentElement.getBoundingClientRect().bottom + 0.5);
  }
  check(derived.filter((a) => a === 'natural').length === 3 && derived.filter((a) => a === 'artificial').length === 5, 'map: 3 natural, 5 artificial');
  check(slotOk, 'done + each item\'s feedback stay inside the reserved slot');
  await tokens.nth(6).click();
  await settle();
  await page.mouse.move(0, 0);
  await shot('05-done-review-reservoir');
  const hDone = await fitHeight();
  check(Math.abs(hDone - h0) <= 1, `screen height constant across states (${h0} → ${hDone})`);

  // ── restart
  await quiz.locator('[data-qa="sq-reset"]').click();
  await settle();
  await stageIs(0, 'restart');
  check((await quiz.locator('[data-qa="sq-token"] .sr-only').count()) === 0 && (await feedback.count()) === 0, 'restart: all answers and marks cleared');
  check((await quiz.locator('[data-qa="sq-done"]').count()) === 0, 'restart: completion cleared');
  check(await quiz.locator('[data-qa="sq-option"]').first().evaluate((b) => b === document.activeElement), 'restart: focus on the first choice');
  await page.mouse.move(0, 0);
  await shot('06-reset');

  // ── isolation, part 2: eight answers here leave the sibling quiz with at most its own „חורש” answer
  await page.evaluate(() => (location.hash = '#scene-relief-cover'));
  await sibling.waitFor({ timeout: 120000 });
  await page.waitForTimeout(800);
  const sibMarks = await sibling.locator('[data-qa="sq-token"]').evaluateAll((ts) => ts.map((t) => (t.querySelector('.sr-only') ? 'm' : '-')).join(''));
  check(/^-[m-]------$/.test(sibMarks), `sibling quiz shows none of this quiz's answers (${sibMarks})`);

  check(errors.length === 0, `no page errors / 4xx-5xx (${errors.join(' | ').slice(0, 300)})`);
  await page.close();
}
await browser.close();

if (failures.length) {
  console.log(`\n${failures.length} failure(s):\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log('\nall checks passed');
