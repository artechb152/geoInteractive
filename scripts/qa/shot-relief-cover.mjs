// QA for topic-02 screen 3 „אותה גבעה, שלושה נופים”
// (docs/superpowers/plans/2026-10-08-relief-cover-compare.md, Task 7).
//
//   QA_PORT=3100 node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-relief-cover.mjs [outDir]
//
// Checks (exit 1 on any failure), with motion and with reduced motion:
//   content  each state card shows exactly its cells (spec §5), verbatim from COMPARE_ROWS;
//            the summary opens itself at the quarry and shows every cell verbatim
//   flow     later states locked until predicted; "המשך" opens the question; a wrong answer
//            advances and is corrected; a revisit keeps its result and asks nothing; reset
//   a11y     the live region is mounted and empty at load, holds exactly the visible feedback
//            after a prediction, and is empty after "המשך" and after a revisit; a second click
//            during the answer's exit changes neither the stored answer nor the announcement
//            (Ruling 13); focus is not moved on load, lands on the card after a choice and on
//            the first step after reset
//   map      contour paths identical in states 1–3 and different in state 4; chip and
//            legend per state; disclaimer always
//   layout   both boards the same height; the legend under the map; the chip clear of the map
//            frame; stepper, legend and state card do not move between states; the prediction
//            buttons on one row; no one-word last line in the card's text; tree crowns ≥ 10 px
//   page     no console errors (pageerror, console.error — framer's reduced-motion notice is a
//            warning and is fine); no horizontal scroll at 1440
// Screenshots: every state at 1440 × 1122, plus the open summary.
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { LEGEND, STATE_CELLS, splitExamples } from '../../src/components/lessons/topic-02/reliefCoverCompare.data.ts';

const outDir = process.argv[2] ?? 'qa-output/relief-cover-compare';
const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-relief-cover`;
await mkdir(outDir, { recursive: true });
const failures = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
};

// the source of truth for the cells: COMPARE_ROWS in the scene file
const src = await readFile('src/components/lessons/topic-02/ReliefCoverIntroScene.tsx', 'utf8');
const start = src.indexOf('const COMPARE_ROWS');
const ROWS = [...src.slice(start, src.indexOf('];', start)).matchAll(/\{\s*label:\s*'([^']*)',\s*relief:\s*'([^']*)',\s*cover:\s*'([^']*)'\s*\}/g)].map(
  (m) => ({ label: m[1], relief: m[2], cover: m[3] }),
);
check(ROWS.length === 5, `parsed ${ROWS.length} COMPARE_ROWS (expected 5)`);
const cellText = (c) => {
  const t = ROWS.find((r) => r.label === c.row)[c.layer];
  return c.part === undefined ? t : splitExamples(t)[c.part];
};
const COPY = {
  next: 'המשך',
  question: 'מה ישתנה במעבר מהמצב הנוכחי למצב הבא?',
  answers: { relief: 'תבליט', cover: 'תכסית', both: 'שניהם' },
  correct: 'נכון',
  wrong: 'התשובה הנכונה:',
  chipSame: 'קווי הגובה: ללא שינוי',
  chipChanged: 'קווי הגובה השתנו',
  disclaimer: 'המחשה סכמטית — הסמלים אינם מקרא רשמי',
  legend: { contour: 'קו גובה', index: 'קו גובה ראשי', grove: 'חורש', orchard: 'מטע', houses: 'מבנים', quarry: 'אזור חציבה', before: 'קווי הגובה לפני החציבה' },
  restart: 'התחלה מחדש',
};

const browser = await chromium.launch({ channel: 'chrome' });

async function settle(page) {
  await page.waitForFunction(() => !document.querySelector('[data-qa="rc-block"] canvas'), null, { timeout: 15000 });
  await page.waitForTimeout(1300); // object fades + delayed feedback
}

/** Page-side layout probes (one evaluate per state). */
function probe() {
  const q = (s) => document.querySelector(s);
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height, r: r.right, b: r.bottom + window.scrollY };
  };
  const root = q('[data-qa="relief-cover-compare"]');
  const frames = [...root.querySelectorAll('[data-view-frame]')].map(box);
  const mapFrame = q('[data-qa="rc-map"]')?.closest('[data-view-frame]');
  // a "one-word last line": the last two words of a text block sit on different lines
  const orphans = [];
  // (the key's lines one by one: its contour line and its symbol line are meant to be two lines)
  const blocks = root.querySelectorAll(
    '[data-qa="rc-cell"] dd, [data-qa="rc-feedback"] p, [data-qa="rc-question"] p, [data-qa="rc-legend"] > span, [data-qa="rc-legend"] > div > div',
  );
  for (const el of blocks) {
    const words = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      for (const m of n.data.matchAll(/\S+/g)) words.push([n, m.index, m.index + m[0].length]);
    }
    if (words.length < 2) continue;
    const top = ([n, s, e]) => {
      const r = document.createRange();
      r.setStart(n, s);
      r.setEnd(n, e);
      const rs = r.getClientRects();
      return rs.length ? rs[rs.length - 1].top : NaN;
    };
    if (Math.abs(top(words.at(-1)) - top(words.at(-2))) > 4) {
      orphans.push({ question: !!el.closest('[data-qa="rc-question"]'), text: el.textContent.trim().slice(-40) });
    }
  }
  // tree crowns on the block (TreeArt: ellipse, trunk, crown circle, highlight circle)
  const objSvg = q('[data-qa="rc-block"] svg[aria-hidden]');
  let crownMin = null;
  if (objSvg) {
    const k = objSvg.getBoundingClientRect().width / objSvg.viewBox.baseVal.width;
    const rs = [...objSvg.querySelectorAll('g > line + circle')].map((c) => 2 * c.r.baseVal.value * k);
    if (rs.length) crownMin = Math.min(...rs);
  }
  const answers = [...root.querySelectorAll('[data-qa="rc-question"] [role="group"] button')].map(box);
  // clipped = cut by its own overflow, or sticking out of the component's box
  const rb = root.getBoundingClientRect();
  const clipped = [...root.querySelectorAll('button, [data-qa="rc-chip"], [data-qa="rc-legend"] > *, dt, dd, [data-qa="rc-feedback"] p, svg')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const own =
        el.tagName !== 'svg' &&
        getComputedStyle(el).overflow !== 'visible' &&
        (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
      return own || r.left < rb.left - 1 || r.right > rb.right + 1;
    })
    .map((el) => (el.textContent.trim() || el.tagName).slice(0, 30));
  return {
    steps: [...root.querySelectorAll('ol[aria-label] button')].map(box),
    frames,
    map: box(mapFrame),
    legend: box(q('[data-qa="rc-legend"]')),
    card: box(q('[data-qa="rc-state-card"]')),
    chip: box(q('[data-qa="rc-chip"]')),
    orphans,
    crownMin,
    answers,
    clipped,
    status: q('[data-qa="rc-status"]')?.textContent ?? null,
    active: document.activeElement === document.body ? 'body' : document.activeElement?.getAttribute('data-qa') ?? document.activeElement?.tagName,
    focusInside: !!(root.contains(document.activeElement) || q('[data-qa="rc-summary"]')?.contains(document.activeElement)),
    firstStepFocused: document.activeElement === root.querySelector('ol[aria-label] button'),
  };
}

async function walk(reduced) {
  const tag = reduced ? 'reduced' : 'motion';
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(URL, { waitUntil: 'networkidle' });
  const root = page.locator('[data-qa="relief-cover-compare"]');
  await root.waitFor({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await root.scrollIntoViewIfNeeded();
  await settle(page);
  // frame the component under the sticky header for the screenshots
  const frame = () =>
    page.evaluate(() => window.scrollBy(0, document.querySelector('[data-qa="relief-cover-compare"]').getBoundingClientRect().top - 96));
  const shot = async (name) => {
    await frame();
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${outDir}/${tag}-${name}.png` });
  };

  const steps = root.locator('ol[aria-label] button');
  const status = root.locator('[data-qa="rc-status"]');
  const contours = {};
  const layout = {};
  const expectCells = async (s) => {
    const got = await root.locator('[data-qa="rc-cell"] dd').allInnerTexts();
    const want = STATE_CELLS[s].map(cellText);
    check(JSON.stringify(got) === JSON.stringify(want), `${tag} ${s}: state-card cells\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
  };
  const expectMap = async (s, chip) => {
    const legend = await root.locator('[data-qa="rc-legend"]').innerText();
    for (const k of LEGEND[s]) check(legend.includes(COPY.legend[k]), `${tag} ${s}: legend lists "${COPY.legend[k]}"`);
    for (const k of Object.keys(COPY.legend)) {
      if (!LEGEND[s].includes(k)) check(!legend.includes(COPY.legend[k]), `${tag} ${s}: legend omits "${COPY.legend[k]}"`);
    }
    check(legend.includes(COPY.disclaimer), `${tag} ${s}: disclaimer shown`);
    const chipEl = root.locator('[data-qa="rc-chip"]');
    if (chip) check((await chipEl.count()) === 1 && (await chipEl.innerText()).trim() === chip, `${tag} ${s}: chip "${chip}"`);
    else check((await chipEl.count()) === 0, `${tag} ${s}: no chip`);
    contours[s] = await root.locator('[data-qa="rc-map"] path[data-contour]').evaluateAll((ps) => ps.map((p) => p.getAttribute('d')).join('|'));
  };
  /** Layout of a settled state: per-state checks now, cross-state stability at the end. */
  const expectLayout = async (s) => {
    const p = await page.evaluate(probe);
    layout[s] = p;
    check(p.frames.length === 2 && Math.abs(p.frames[0].h - p.frames[1].h) <= 1, `${tag} ${s}: boards differ in height ${p.frames.map((f) => f.h.toFixed(1)).join(' / ')}`);
    check(
      p.legend && p.map && p.legend.y >= p.map.b - 1 && p.legend.x >= p.map.x - 1 && p.legend.r <= p.map.r + 1,
      `${tag} ${s}: legend not under the map (legend ${JSON.stringify(p.legend)}, map ${JSON.stringify(p.map)})`,
    );
    if (p.chip) {
      const hit = p.frames.some((f) => p.chip.x < f.r && p.chip.r > f.x && p.chip.y < f.b && p.chip.b > f.y);
      check(!hit, `${tag} ${s}: the chip overlaps a board (chip ${JSON.stringify(p.chip)})`);
    }
    check(p.orphans.length === 0, `${tag} ${s}: one-word last line in ${JSON.stringify(p.orphans)}`);
    check(p.clipped.length === 0, `${tag} ${s}: clipped text ${JSON.stringify(p.clipped)}`);
    if (s !== 'bare') check(p.crownMin !== null && p.crownMin >= 10, `${tag} ${s}: smallest tree crown ${p.crownMin?.toFixed(1)} px (< 10)`);
  };
  /** The announcement must say exactly what the visible feedback says. */
  const expectAnnounced = async (s) => {
    const parts = await root.locator('[data-qa="rc-feedback"] p').evaluateAll((ps) => ps.map((p) => p.textContent.trim()));
    const want = `${parts[0]}. ${parts.slice(1).join(' ')}`;
    const got = await status.textContent();
    check(got === want, `${tag} ${s}: live region\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
  };
  /** "המשך", then an answer; `then` = a second answer clicked during the first one's exit (Ruling 13). */
  const predict = async (answer, then) => {
    await root.getByRole('button', { name: COPY.next, exact: true }).click();
    check(await root.getByText(COPY.question).isVisible(), `${tag}: the question opens after "המשך"`);
    check((await status.textContent()) === '', `${tag}: live region empty after "המשך"`);
    const p = await page.evaluate(probe);
    check(p.answers.length === 3 && p.answers.every((b) => Math.abs(b.y - p.answers[0].y) < 1), `${tag}: prediction buttons on one row`);
    const qo = p.orphans.filter((o) => o.question);
    check(qo.length === 0, `${tag}: one-word last line in the question ${JSON.stringify(qo)}`);
    if (!then) {
      await root.getByRole('button', { name: COPY.answers[answer], exact: true }).click();
    } else {
      // DOM clicks: the second lands on the exiting buttons (gap > 0) or before React re-renders (gap 0)
      await page.evaluate(
        async ([a, b, gap]) => {
          const btn = (t) => [...document.querySelectorAll('[data-qa="rc-question"] button')].find((x) => x.textContent.trim() === t);
          const second = btn(b);
          btn(a).click();
          if (gap) await new Promise((r) => setTimeout(r, gap));
          second.click();
        },
        [COPY.answers[answer], COPY.answers[then.answer], then.gap],
      );
    }
    await settle(page);
    const q = await page.evaluate(probe);
    check(q.active === 'rc-state-card', `${tag}: focus on the state card after a choice (got ${q.active})`);
  };
  const feedback = () => root.locator('[data-qa="rc-feedback"]').innerText();

  // load: nothing announced, focus untouched
  const p0 = await page.evaluate(probe);
  check(p0.status === '', `${tag}: live region mounted and empty at load (got ${JSON.stringify(p0.status)})`);
  check(!p0.focusInside, `${tag}: focus moved into the component on load (${p0.active})`);
  check(await status.getAttribute('aria-live') === 'polite' && (await status.getAttribute('role')) === 'status', `${tag}: live region is role=status, polite`);

  check((await steps.count()) === 4, `${tag}: stepper has 4 states`);
  for (const i of [1, 2, 3]) check(await steps.nth(i).isDisabled(), `${tag}: state ${i + 1} locked at start`);
  await expectCells('bare');
  await expectMap('bare', null);
  await expectLayout('bare');
  await shot('1-bare');

  // wrong on purpose; "תכסית" clicked 60 ms later lands on the exiting buttons and must change nothing
  await predict('relief', { answer: 'cover', gap: 60 });
  check((await feedback()).includes(`${COPY.wrong} ${COPY.answers.cover}`), `${tag} grove: wrong answer corrected`);
  await expectAnnounced('grove');
  await expectCells('grove');
  await expectMap('grove', COPY.chipSame);
  await expectLayout('grove');
  await shot('2-grove');

  // right; "תבליט" clicked in the same task, before React re-renders, must change nothing
  await predict('cover', { answer: 'relief', gap: 0 });
  check((await feedback()).includes(COPY.correct) && !(await feedback()).includes(COPY.wrong), `${tag} built: right answer confirmed`);
  await expectAnnounced('built');
  await expectCells('built');
  await expectMap('built', COPY.chipSame);
  await expectLayout('built');
  await shot('3-built');

  await predict('both');
  check((await feedback()).includes(COPY.correct), `${tag} quarry: right answer confirmed`);
  await expectAnnounced('quarry');
  await expectCells('quarry');
  await expectMap('quarry', COPY.chipChanged);
  await expectLayout('quarry');
  await shot('4-quarry');

  check(contours.bare === contours.grove && contours.grove === contours.built, `${tag}: contours identical in states 1–3`);
  check(contours.quarry !== contours.built, `${tag}: contours change in state 4`);

  // nothing above the boards or in the map key moves between states
  const L = Object.values(layout);
  const same = (f, what) => check(L.every((p) => JSON.stringify(f(p)) === JSON.stringify(f(L[0]))), `${tag}: ${what} moves between states ${L.map((p) => JSON.stringify(f(p))).join(' | ')}`);
  same((p) => p.steps.map((b) => [Math.round(b.x), Math.round(b.y), Math.round(b.w)]), 'stepper');
  same((p) => [Math.round(p.legend.y), Math.round(p.legend.h)], 'legend');
  same((p) => Math.round(p.card.y), 'state card');

  const summary = page.locator('[data-qa="rc-summary"]');
  await page.waitForTimeout(500);
  const sum = await summary.innerText();
  for (const r of ROWS) for (const t of [r.label, r.relief, r.cover]) check(sum.includes(t), `${tag}: summary shows "${t.slice(0, 40)}…"`);
  await summary.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${outDir}/${tag}-5-summary.png` });

  await root.scrollIntoViewIfNeeded();
  await steps.nth(1).click();
  await settle(page);
  await expectCells('grove');
  check((await feedback()).includes(COPY.wrong), `${tag}: a revisit keeps the stored result`);
  check((await status.textContent()) === '', `${tag}: live region empty after a revisit`);
  check((await root.getByRole('button', { name: COPY.next, exact: true }).count()) === 0, `${tag}: no question on a revisited state`);
  const pv = await page.evaluate(probe);
  check(pv.active !== 'rc-state-card', `${tag}: a revisit does not pull focus to the card`);

  await root.getByRole('button', { name: COPY.restart }).click();
  await settle(page);
  await expectCells('bare');
  for (const i of [1, 2, 3]) check(await steps.nth(i).isDisabled(), `${tag}: state ${i + 1} locked after reset`);
  const pr = await page.evaluate(probe);
  check(pr.firstStepFocused, `${tag}: focus on the first step after reset (got ${pr.active})`);
  check(pr.status === '', `${tag}: live region empty after reset`);
  check(JSON.stringify(pr.steps.map((b) => Math.round(b.w))) === JSON.stringify(layout.bare.steps.map((b) => Math.round(b.w))), `${tag}: stepper reflows after reset`);

  const hScroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(hScroll <= 0, `${tag}: horizontal scroll ${hScroll}px`);
  check(errors.length === 0, `${tag}: console errors — ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

await walk(false);
await walk(true);
await browser.close();
if (failures.length) {
  console.error(`relief-cover QA: ${failures.length} failure(s)\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`relief-cover QA: all checks passed → ${outDir}`);
