// QA for topic-02 screen 3 „אותה גבעה, שלושה נופים”
// (docs/superpowers/plans/2026-10-08-relief-cover-compare.md, Task 7).
//
//   QA_PORT=3100 node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-relief-cover.mjs [outDir]
//
// Checks (exit 1 on any failure), with motion and with reduced motion:
//   content  each state card shows exactly its cells (spec §5), verbatim from COMPARE_ROWS;
//            the summary opens itself at the quarry — once its feedback is in, not during the cut —
//            and shows every cell verbatim; while open it takes the place of the state's cells and
//            marks exactly that state's cells (2026-10-27, audit finding ב2)
//   fit      every state, with the table closed and open, fits 1440 × 1122 under the site header
//            (card ≤ 1042 px as shown); no clipped text, no inner scroll
//   loading  the textures held: the "בשטח" board shows ModelLoading („טוען שטח תלת־ממדי…”) and the
//            answers are disabled, with a note on the task's line; a forced click predicts nothing;
//            once the model is drawn the answers open, the note goes, the panel keeps its height
//            (audit ג9). Without WebGL the still stands in, with no loader: the question opens once
//            it has loaded — or failed to (never a permanent lock). No X·Y·Z marker on the model,
//            the drag hint only on the live model once drawn (audit ב3)
//   keyboard the whole loop from the keyboard: Tab order, focus rings, Enter on the answers, the way
//            on, the summary and its toggle
//   flow     the first question is open at load; later states locked until predicted; a wrong
//            answer advances and is corrected; "לשלב הבא" opens the next question in the same panel;
//            a revisit keeps its result, asks nothing and offers the way back; reset
//   a11y     the live region is mounted and empty at load, holds exactly the visible feedback
//            after a prediction, and is empty after "המשך" and after a revisit; a second click
//            during the answer's exit changes neither the stored answer nor the announcement
//            (Ruling 13); focus is not moved on load, lands on the panel after a choice, on the
//            first answer after "לשלב הבא", on the summary after "לטבלת הסיכום" and on the first step
//            after reset
//   map      contour paths identical in states 1–3 and different in state 4; chip per state;
//            no map key and no disclaimer (removed 2026-10-13)
//   layout   both boards the same height, no captions above them; the chip under the map, clear of
//            both frames; the model has no north arrow and no view buttons; the action panel sits
//            right under the boards, above the cells; stepper and panel do not move between states;
//            the prediction buttons on one row; at 1366 × 768 the answers and "לשלב הבא" are on
//            screen without scrolling; no one-word last line in the card's text; the "בשטח" board is the
//            live 3D model (a canvas, drawn), not the old SVG block
//   page     no console errors (pageerror, console.error — framer's reduced-motion notice is a
//            warning and is fine); no horizontal scroll at 1440
// Screenshots: every state at 1440 × 1122, plus the open summary, the loading and the still.
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { STATE_CELLS, splitExamples } from '../../src/components/lessons/topic-02/reliefCoverCompare.data.ts';

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
  question: 'מה ישתנה בשטח בעקבות זה?',
  nextPrefix: 'לשלב הבא',
  backPrefix: 'חזרה לשלב',
  toSummary: 'לטבלת הסיכום',
  answers: { relief: 'תבליט', cover: 'תכסית', both: 'שניהם' },
  correct: 'נכון',
  wrong: 'התשובה הנכונה:',
  chipSame: 'קווי הגובה: ללא שינוי',
  chipChanged: 'קווי הגובה השתנו',
  disclaimer: 'המחשה סכמטית — הסמלים אינם מקרא רשמי',
  legend: { contour: 'קו גובה', index: 'קו גובה ראשי', grove: 'חורש', orchard: 'מטע', houses: 'מבנים', quarry: 'אזור חציבה', before: 'קווי הגובה לפני החציבה' },
  restart: 'התחלה מחדש',
  loading: 'טוען שטח תלת־ממדי…',
  summaryShow: 'הצגת ההשוואה המלאה',
  summaryHide: 'הסתרת ההשוואה המלאה',
  waitModel: 'אפשר לענות כשהדגם יוצג',
};
const STATES_N = { bare: 1, grove: 2, built: 3, quarry: 4 };
const fits = [];

const browser = await chromium.launch({ channel: 'chrome' });
const AVAILABLE = 1122 - 80; // the viewport under the fixed site header
const TABLE_MS = 1500; // the table's 0.35 s open / close, with room for a slow dev frame

async function settle(page) {
  // the live model has drawn its first frame (or, without WebGL, shows its still)
  await page.waitForFunction(
    () => {
      const m = document.querySelector('[data-qa="rc-block"] [data-renderer]');
      return m && (m.hasAttribute('data-ready') || m.getAttribute('data-renderer') === 'static');
    },
    null,
    { timeout: 60000 },
  );
  await page.waitForTimeout(1900); // the ground sweep, objects growing / sinking (1.65 s), the quarry morph, delayed feedback
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
  const blocks = root.querySelectorAll('[data-qa="rc-cell"] dd, [data-qa="rc-feedback"] p, [data-qa="rc-question"] p');
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
  // the "בשטח" board: the live model (a canvas) or its still, never the old SVG block
  const model = q('[data-qa="rc-block"] [data-renderer]');
  const renderer = model?.getAttribute('data-renderer') ?? null;
  const hasCanvas = !!model?.querySelector('canvas');
  const answers = [...root.querySelectorAll('[data-qa="rc-task"] [role="group"] button')].map(box);
  // clipped = cut by its own overflow, or sticking out of the component's box
  const rb = root.getBoundingClientRect();
  const clipped = [...root.querySelectorAll('button, [data-qa="rc-chip"], dt, dd, [data-qa="rc-feedback"] p, [data-qa="rc-table-cell"], svg')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const own =
        el.tagName !== 'svg' &&
        getComputedStyle(el).overflow !== 'visible' &&
        (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
      return own || r.left < rb.left - 1 || r.right > rb.right + 1;
    })
    .map((el) => (el.textContent.trim() || el.tagName).slice(0, 30));
  // nothing in the card scrolls inside itself
  const innerScroll = [...root.querySelectorAll('*')]
    .filter((el) => /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1)
    .map((el) => el.getAttribute('data-qa') ?? el.tagName);
  return {
    cardH: rb.height,
    innerScroll,
    summaryOpen: q('[data-qa="rc-summary"] button[aria-expanded]')?.getAttribute('aria-expanded') === 'true',
    tableRows: root.querySelectorAll('[data-qa="rc-table-cell"]').length,
    marked: [...root.querySelectorAll('[data-qa="rc-table-cell"][data-marked]')].map((el) => el.textContent.trim()),
    // anything drawn over the middle of the model (the canvas, its wrappers and the transparent
    // role="img" name layer aside) — where the X·Y·Z marker used to sit, over the quarry
    overCenter: (() => {
      if (!model) return [];
      const r = model.getBoundingClientRect();
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      const canvas = model.querySelector('canvas');
      return [...model.querySelectorAll('*')]
        .filter((el) => {
          if (canvas && (el === canvas || el.contains(canvas))) return false;
          if (el.getAttribute('role') === 'img' && !el.children.length) return false;
          const b = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0 && cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom;
        })
        .map((el) => el.getAttribute('data-qa') ?? el.tagName);
    })(),
    dragHint: !!model && model.innerText.includes('גררו לסיבוב'),
    steps: [...root.querySelectorAll('ol[aria-label] button')].map(box),
    frames,
    map: box(mapFrame),
    legend: !!q('[data-qa="rc-legend"]'),
    captions: root.querySelectorAll('figcaption').length,
    north: !!model?.querySelector('[data-north]'),
    modelButtons: model?.querySelectorAll('button').length ?? 0,
    cells: box(q('[data-qa="rc-cells"]')),
    boardsBottom: Math.max(...frames.map((f) => f.b)),
    card: box(q('[data-qa="rc-task"]')),
    chip: box(q('[data-qa="rc-chip"]')),
    orphans,
    renderer,
    hasCanvas,
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
  /** The state's cells: in their own block, or — while the table is open, which takes the block's
   *  place — marked in the table (whole cells, in table order). */
  const expectCells = async (s) => {
    const p = await page.evaluate(probe);
    if (!p.summaryOpen) {
      const got = await root.locator('[data-qa="rc-cell"] dd').allInnerTexts();
      const want = STATE_CELLS[s].map(cellText);
      check(JSON.stringify(got) === JSON.stringify(want), `${tag} ${s}: state-card cells\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
      check(p.marked.length === 0 && p.tableRows === 0, `${tag} ${s}: the table is closed, nothing of it on show`);
      return;
    }
    check((await root.locator('[data-qa="rc-cells"]').count()) === 0, `${tag} ${s}: the open table replaces the state's cells (both on show)`);
    const want = ROWS.flatMap((r) => ['relief', 'cover'].filter((l) => STATE_CELLS[s].some((c) => c.row === r.label && c.layer === l)).map((l) => r[l]));
    check(JSON.stringify(p.marked) === JSON.stringify(want), `${tag} ${s}: marked table cells\n  got  ${JSON.stringify(p.marked)}\n  want ${JSON.stringify(want)}`);
  };
  const toggle = root.locator('[data-qa="rc-summary"] button[aria-expanded]');
  /** This state fits under the site header with the table as it is, and with it toggled; the table
   *  is left as it was found. */
  const expectFits = async (s) => {
    for (let k = 0; k < 2; k++) {
      const p = await page.evaluate(probe);
      const what = `${tag} ${s} (table ${p.summaryOpen ? 'open' : 'closed'})`;
      check(p.cardH <= AVAILABLE, `${what}: card ${p.cardH.toFixed(0)} px > ${AVAILABLE} under the header`);
      check(p.innerScroll.length === 0, `${what}: inner scroll in ${JSON.stringify(p.innerScroll)}`);
      check(p.clipped.length === 0, `${what}: clipped text ${JSON.stringify(p.clipped)}`);
      fits.push(`${s}/${p.summaryOpen ? 'open' : 'closed'} ${p.cardH.toFixed(0)}`);
      await expectCells(s);
      if (p.summaryOpen) {
        check(p.tableRows === ROWS.length * 2, `${what}: the table shows every cell (${p.tableRows})`);
        await shot(`${STATES_N[s]}-${s}-table`);
      }
      await toggle.click();
      await page.waitForTimeout(TABLE_MS);
    }
  };
  const expectMap = async (s, chip) => {
    check((await root.locator('[data-qa="rc-legend"]').count()) === 0, `${tag} ${s}: no map key`);
    check(!(await root.innerText()).includes(COPY.disclaimer), `${tag} ${s}: no disclaimer`);
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
    check(p.captions === 0, `${tag} ${s}: captions above the boards (${p.captions})`);
    check(!p.north && p.modelButtons === 0, `${tag} ${s}: the model shows a north arrow (${p.north}) or view buttons (${p.modelButtons})`);
    if (p.chip) {
      const hit = p.frames.some((f) => p.chip.x < f.r && p.chip.r > f.x && p.chip.y < f.b && p.chip.b > f.y);
      check(!hit, `${tag} ${s}: the chip overlaps a board (chip ${JSON.stringify(p.chip)})`);
      check(p.map && p.chip.y >= p.map.b - 1 && p.chip.x >= p.map.x - 1 && p.chip.r <= p.map.r + 1, `${tag} ${s}: the chip is not under the map`);
    }
    // the action panel right under the boards (only the chip's row between them), the cells after it
    check(p.card && p.card.y > p.boardsBottom && p.card.y - p.boardsBottom < 64, `${tag} ${s}: the action panel is not right under the boards (panel ${JSON.stringify(p.card)}, boards end ${p.boardsBottom})`);
    check(p.summaryOpen ? !p.cells : p.cells && p.cells.y >= p.card.b, `${tag} ${s}: the cells are not below the action panel (or not replaced by the open table)`);
    check(p.orphans.length === 0, `${tag} ${s}: one-word last line in ${JSON.stringify(p.orphans)}`);
    check(p.clipped.length === 0, `${tag} ${s}: clipped text ${JSON.stringify(p.clipped)}`);
    check(p.renderer === 'live' && p.hasCanvas, `${tag} ${s}: the "בשטח" board is the live 3D model (renderer ${p.renderer}, canvas ${p.hasCanvas})`);
    check(p.overCenter.length === 0, `${tag} ${s}: something covers the middle of the model ${JSON.stringify(p.overCenter)}`);
    check(p.dragHint, `${tag} ${s}: the drag hint in the model's corner`);
  };
  /** The announcement must say exactly what the visible feedback says. */
  const expectAnnounced = async (s) => {
    const head = (await root.locator('[data-qa="rc-head"]').textContent()).trim();
    const verdicts = (await root.locator('[data-qa="rc-verdict"]').allTextContents()).map((t) => t.trim()).join(', ');
    const body = await root.locator('[data-qa="rc-feedback"] p:not([data-qa="rc-head"])').evaluateAll((ps) => ps.map((p) => p.textContent.trim()).join(' '));
    const want = `${head}. ${verdicts}. ${body}`;
    const got = await status.textContent();
    check(got === want, `${tag} ${s}: live region\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
  };
  /** "לשלב הבא" (after the first state), then an answer; `then` = a second answer clicked during the
   *  first one's exit (Ruling 13). */
  const predict = async (answer, then, whileCut) => {
    const next = root.getByRole('button', { name: new RegExp(`^${COPY.nextPrefix}`) });
    if (await next.count()) {
      await next.click();
      await page.waitForTimeout(450);
      const a = await page.evaluate(probe);
      check(a.active === 'BUTTON', `${tag}: focus on the first answer after "לשלב הבא" (got ${a.active})`);
      check((await status.textContent()) === '', `${tag}: live region empty after "לשלב הבא"`);
    }
    check(await root.getByText(COPY.question).isVisible(), `${tag}: the question is open`);
    const p = await page.evaluate(probe);
    check(p.answers.length === 3 && p.answers.every((b) => Math.abs(b.y - p.answers[0].y) < 1), `${tag}: prediction buttons on one row`);
    const qo = p.orphans.filter((o) => o.question);
    check(qo.length === 0, `${tag}: one-word last line in the question ${JSON.stringify(qo)}`);
    if (!then) {
      await root.locator(`[data-qa="rc-task"] [data-answer="${answer}"]`).click();
    } else {
      // DOM clicks: the second lands on the exiting buttons (gap > 0) or before React re-renders (gap 0)
      await page.evaluate(
        async ([a, b, gap]) => {
          const btn = (t) => document.querySelector(`[data-qa="rc-task"] [data-answer="${t}"]`);
          const second = btn(b);
          btn(a).click();
          if (gap) await new Promise((r) => setTimeout(r, gap));
          second.click();
        },
        [answer, then.answer, then.gap],
      );
    }
    if (whileCut) await whileCut();
    await settle(page);
    const q = await page.evaluate(probe);
    check(q.active === 'rc-task', `${tag}: focus on the action panel after a choice (got ${q.active})`);
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
  await expectFits('bare');

  // wrong on purpose; "תכסית" clicked 60 ms later lands on the exiting buttons and must change nothing
  await predict('relief', { answer: 'cover', gap: 60 });
  check((await feedback()).includes(`${COPY.wrong} ${COPY.answers.cover}`), `${tag} grove: wrong answer corrected`);
  await expectAnnounced('grove');
  await expectCells('grove');
  await expectMap('grove', COPY.chipSame);
  await expectLayout('grove');
  await shot('2-grove');
  await expectFits('grove');

  // right; "תבליט" clicked in the same task, before React re-renders, must change nothing
  await predict('cover', { answer: 'relief', gap: 0 });
  check((await feedback()).includes(COPY.correct) && !(await feedback()).includes(COPY.wrong), `${tag} built: right answer confirmed`);
  await expectAnnounced('built');
  await expectCells('built');
  await expectMap('built', COPY.chipSame);
  await expectLayout('built');
  await shot('3-built');
  await expectFits('built');

  // the quarry: the table opens itself — after the cut has played (with motion), at once without
  let openDuringCut = null;
  await predict('both', undefined, async () => {
    await page.waitForTimeout(250);
    openDuringCut = (await toggle.getAttribute('aria-expanded')) === 'true';
  });
  check(openDuringCut === !!reduced, `${tag} quarry: the table ${reduced ? 'opens at once' : 'waits for the cut'} (open 0.25 s after the answer: ${openDuringCut})`);
  await page.waitForTimeout(TABLE_MS);
  check((await toggle.getAttribute('aria-expanded')) === 'true', `${tag} quarry: the summary table opened itself`);
  check((await feedback()).includes(COPY.correct), `${tag} quarry: right answer confirmed`);
  await expectAnnounced('quarry');
  await expectCells('quarry');
  await expectMap('quarry', COPY.chipChanged);
  await expectLayout('quarry');
  await shot('4-quarry');
  await expectFits('quarry');

  check(contours.bare === contours.grove && contours.grove === contours.built, `${tag}: contours identical in states 1–3`);
  check(contours.quarry !== contours.built, `${tag}: contours change in state 4`);

  // nothing above the boards, nor the state card, moves between states
  const L = Object.values(layout);
  const same = (f, what) => check(L.every((p) => JSON.stringify(f(p)) === JSON.stringify(f(L[0]))), `${tag}: ${what} moves between states ${L.map((p) => JSON.stringify(f(p))).join(' | ')}`);
  same((p) => p.steps.map((b) => [Math.round(b.x), Math.round(b.y), Math.round(b.w)]), 'stepper');
  same((p) => Math.round(p.card.y), 'action panel');

  const summary = page.locator('[data-qa="rc-summary"]');
  await page.waitForTimeout(500);
  // closed by the learner, "לטבלת הסיכום" opens it again
  await toggle.click();
  await page.waitForTimeout(TABLE_MS);
  check((await toggle.getAttribute('aria-expanded')) === 'false', `${tag}: the summary toggle closes the table`);
  await root.getByRole('button', { name: COPY.toSummary }).click();
  await page.waitForTimeout(TABLE_MS);
  check((await toggle.getAttribute('aria-expanded')) === 'true', `${tag}: "לטבלת הסיכום" opens a closed table`);
  const ps = await page.evaluate(() => ({ focus: document.activeElement?.tagName, top: Math.round(document.querySelector('[data-qa="rc-summary"]').getBoundingClientRect().top) }));
  check(ps.focus === 'H4' && ps.top >= 0 && ps.top < 400, `${tag}: "לטבלת הסיכום" brings the summary into view and focus (${JSON.stringify(ps)})`);
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
  check((await root.locator('[data-qa="rc-task"] [role="group"]').count()) === 0, `${tag}: no question on a revisited state`);
  const pv = await page.evaluate(probe);
  check(pv.active !== 'rc-task', `${tag}: a revisit does not pull focus to the panel`);
  // a step back with the table open: it stays open and marks the revisited state's cells
  check(pv.summaryOpen, `${tag}: the table stays open on a revisit`);
  await expectFits('grove');
  // the way back to the frontier
  await root.getByRole('button', { name: new RegExp(`^${COPY.backPrefix} 4`) }).click();
  await settle(page);
  await expectCells('quarry');
  check((await steps.nth(3).getAttribute('aria-current')) === 'step', `${tag}: "חזרה לשלב 4" returns to the quarry`);

  await root.getByRole('button', { name: COPY.restart }).click();
  await settle(page);
  await expectCells('bare');
  for (const i of [1, 2, 3]) check(await steps.nth(i).isDisabled(), `${tag}: state ${i + 1} locked after reset`);
  check(await root.getByText(COPY.question).isVisible(), `${tag}: the first question is open again after reset`);
  const pr = await page.evaluate(probe);
  check(pr.firstStepFocused, `${tag}: focus on the first step after reset (got ${pr.active})`);
  check(pr.status === '', `${tag}: live region empty after reset`);
  check(!pr.summaryOpen, `${tag}: reset closes the table`);
  check(JSON.stringify(pr.steps.map((b) => Math.round(b.w))) === JSON.stringify(layout.bare.steps.map((b) => Math.round(b.w))), `${tag}: stepper reflows after reset`);

  const hScroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(hScroll <= 0, `${tag}: horizontal scroll ${hScroll}px`);
  check(errors.length === 0, `${tag}: console errors — ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

/** Open the page at 1440 × 1122 and frame the comparison under the sticky header. */
async function openCompare(b, { reduced = false, route } = {}) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1122 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  if (route) await page.route(route.url, route.handler);
  await page.goto(URL, { waitUntil: 'load' });
  const root = page.locator('[data-qa="relief-cover-compare"]');
  await root.waitFor({ timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollBy(0, document.querySelector('[data-qa="relief-cover-compare"]').getBoundingClientRect().top - 96));
  return { ctx, page, root, errors };
}
/** A request held until `release()`; `fail` aborts it then instead of letting it through. */
function hold(url, fail = false) {
  let release;
  const held = new Promise((r) => (release = r));
  return {
    release: () => release(),
    route: { url, handler: async (r) => { await held; await (fail ? r.abort() : r.continue()); } },
  };
}

/** Slow load (audit ג9): the model's textures held — the question waits for the model. */
async function loading(reduced) {
  const tag = `loading ${reduced ? 'reduced' : 'motion'}`;
  const h = hold('**/relief-cover-model/*.webp');
  const { ctx, page, root, errors } = await openCompare(browser, { reduced, route: h.route });
  const loader = root.locator('[data-qa="rc-block"] [data-loading]');
  await loader.waitFor({ timeout: 60000 });
  await page.waitForTimeout(800);
  const answers = root.locator('[data-qa="rc-task"] [data-answer]');
  const wait = root.locator('[data-qa="rc-wait"]');
  const steps = root.locator('ol[aria-label] button');
  check((await loader.innerText()).trim() === COPY.loading && (await loader.getAttribute('role')) === 'status', `${tag}: ModelLoading "${(await loader.innerText()).trim()}" (role=status)`);
  const sheen = await loader.evaluate((l) => getComputedStyle(l.querySelector('[dir="ltr"] > div')).animationName);
  check(reduced ? sheen === 'none' : sheen !== 'none', `${tag}: the loading sheen ${reduced ? 'is still' : 'runs'} (${sheen})`);
  check(await answers.evaluateAll((bs) => bs.length === 3 && bs.every((b) => b.disabled)), `${tag}: the answers are disabled while the model loads`);
  check((await wait.isVisible()) && (await wait.innerText()).includes(COPY.waitModel), `${tag}: the task's line says the answers wait for the model`);
  const describedBy = await root.locator('[data-qa="rc-task"] [role="group"]').getAttribute('aria-describedby');
  check(describedBy.split(' ').includes(await wait.getAttribute('id')), `${tag}: the answers group is described by the note (${describedBy})`);
  check(!(await root.locator('[data-qa="rc-block"]').innerText()).includes('גררו לסיבוב'), `${tag}: no drag hint before the model is drawn`);
  const panel0 = await root.locator('[data-qa="rc-task"]').boundingBox();
  await answers.nth(1).click({ force: true });
  await page.waitForTimeout(400);
  check((await steps.nth(1).isDisabled()) && (await root.locator('[data-qa="rc-task"]').getAttribute('data-mode')) === 'ask', `${tag}: a forced click on a disabled answer predicts nothing`);
  await page.screenshot({ path: `${outDir}/${tag.replace(' ', '-')}-held.png` });

  h.release();
  await page.waitForFunction(() => document.querySelector('[data-qa="rc-block"] [data-ready]'), null, { timeout: 120000 });
  await page.waitForTimeout(500);
  check((await loader.count()) === 0, `${tag}: the loader goes once the model is drawn`);
  check(await answers.evaluateAll((bs) => bs.every((b) => !b.disabled)), `${tag}: the answers open once the model is drawn`);
  check((await wait.count()) === 0, `${tag}: the note goes`);
  const panel1 = await root.locator('[data-qa="rc-task"]').boundingBox();
  check(Math.abs(panel1.height - panel0.height) < 1 && Math.abs(panel1.y - panel0.y) < 1, `${tag}: the panel keeps its place and height (${panel0.height.toFixed(1)} → ${panel1.height.toFixed(1)})`);
  check((await root.locator('[data-qa="rc-block"]').innerText()).includes('גררו לסיבוב'), `${tag}: the drag hint appears with the model`);
  await page.screenshot({ path: `${outDir}/${tag.replace(' ', '-')}-released.png` });
  await answers.nth(1).click();
  await settle(page);
  check(!(await steps.nth(1).isDisabled()) && (await root.locator('[data-qa="rc-task"]').getAttribute('data-mode')) === 'result', `${tag}: the question works once open`);
  check(errors.length === 0, `${tag}: page errors — ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

/** Without WebGL: the still stands in (no loader); the question opens once the still is in — or once
 *  it has failed, so a missing file never locks the activity. */
async function noWebGL() {
  const nb = await chromium.launch({ channel: 'chrome', args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
  for (const fail of [false, true]) {
    const tag = `no-webgl ${fail ? 'still failing' : 'still held'}`;
    const h = hold('**/relief-cover-compare/*.jpg', fail);
    const { ctx, page, root, errors } = await openCompare(nb, { route: h.route });
    await page.waitForFunction(() => document.querySelector('[data-qa="rc-block"] [data-renderer="static"]'), null, { timeout: 60000 });
    await page.waitForTimeout(600);
    const answers = root.locator('[data-qa="rc-task"] [data-answer]');
    check((await root.locator('[data-qa="rc-block"] [data-loading]').count()) === 0, `${tag}: no loader over the still`);
    check(await answers.evaluateAll((bs) => bs.every((b) => b.disabled)), `${tag}: the answers wait for the still`);
    if (!fail) await page.screenshot({ path: `${outDir}/no-webgl-held.png` });
    h.release();
    await page.waitForFunction(() => document.querySelector('[data-qa="rc-block"] [data-ready]'), null, { timeout: 60000 });
    await page.waitForTimeout(300);
    check(await answers.evaluateAll((bs) => bs.every((b) => !b.disabled)), `${tag}: the answers open`);
    check(!(await root.locator('[data-qa="rc-block"]').innerText()).includes('גררו לסיבוב'), `${tag}: no drag hint on the still`);
    if (!fail) {
      const img = root.locator('[data-qa="rc-block"] img[data-fallback]');
      check((await img.getAttribute('src')).endsWith('/bare.jpg'), `${tag}: the bare still`);
      await answers.nth(1).click();
      await settle(page);
      check((await img.getAttribute('src')).endsWith('/grove.jpg'), `${tag}: the still follows the state (${await img.getAttribute('src')})`);
      await page.screenshot({ path: `${outDir}/no-webgl-grove.png` });
    }
    check(errors.length === 0, `${tag}: page errors — ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
  await nb.close();
}

/** The whole loop from the keyboard, with a focus ring on every stop. */
async function keyboard() {
  const tag = 'keyboard';
  const { ctx, page, root, errors } = await openCompare(browser);
  await settle(page);
  const steps = root.locator('ol[aria-label] button');
  const toggle = root.locator('[data-qa="rc-summary"] button[aria-expanded]');
  const active = () =>
    page.evaluate(() => {
      const a = document.activeElement;
      return { qa: a?.getAttribute('data-qa') ?? null, answer: a?.getAttribute('data-answer') ?? null, text: (a?.textContent ?? '').trim(), tag: a?.tagName, ring: !!a?.matches(':focus-visible') };
    });
  const press = async (key, wait = 120) => {
    await page.keyboard.press(key);
    await page.waitForTimeout(wait);
    return active();
  };
  await steps.first().focus();
  let a = await press('Tab');
  check(a.answer === 'relief' && a.ring, `${tag}: Tab from step 1 lands on the first answer, ringed — locked steps and the hidden reset are skipped (${JSON.stringify(a)})`);
  a = await press('Tab');
  check(a.answer === 'cover' && a.ring, `${tag}: Tab → the second answer`);
  a = await press('Tab');
  check(a.answer === 'both' && a.ring, `${tag}: Tab → the third answer`);
  await page.screenshot({ path: `${outDir}/keyboard-answer-focus.png` });
  a = await press('Tab');
  check(a.text === COPY.summaryShow && a.ring, `${tag}: Tab → the summary toggle (${a.text})`);
  await press('Shift+Tab');
  a = await press('Shift+Tab');
  check(a.answer === 'cover', `${tag}: Shift+Tab back to "תכסית"`);
  await page.keyboard.press('Enter');
  await settle(page);
  a = await active();
  check(a.qa === 'rc-task' && a.ring, `${tag}: Enter on an answer → focus on the feedback panel, ringed (${JSON.stringify(a)})`);
  a = await press('Tab');
  check(a.text.startsWith(COPY.nextPrefix) && a.ring, `${tag}: Tab → "${a.text}"`);
  a = await press('Enter', 600);
  check(a.answer === 'relief' && a.ring, `${tag}: Enter on "לשלב הבא" → the first answer`);
  await press('Tab');
  await page.keyboard.press(' ');
  await settle(page);
  check((await root.locator('[data-qa="rc-task"]').getAttribute('data-mode')) === 'result', `${tag}: Space answers too`);
  await press('Tab');
  await press('Enter', 600);
  await press('Tab');
  a = await press('Tab');
  check(a.answer === 'both', `${tag}: the quarry's "שניהם"`);
  await page.keyboard.press('Enter');
  await settle(page);
  await page.waitForTimeout(TABLE_MS);
  a = await press('Tab');
  check(a.text === COPY.toSummary && a.ring, `${tag}: Tab → "לטבלת הסיכום" (${a.text})`);
  a = await press('Enter', 900);
  check(a.tag === 'H4', `${tag}: Enter → the summary's heading`);
  a = await press('Tab');
  check(a.text === COPY.summaryHide && a.ring, `${tag}: Tab → the toggle (${a.text})`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(TABLE_MS);
  check((await toggle.getAttribute('aria-expanded')) === 'false' && (await root.locator('[data-qa="rc-cells"]').count()) === 1, `${tag}: Enter closes the table, the state's cells return`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(TABLE_MS);
  check((await toggle.getAttribute('aria-expanded')) === 'true' && (await root.locator('[data-qa="rc-cells"]').count()) === 0, `${tag}: Enter opens it again`);
  await page.screenshot({ path: `${outDir}/keyboard-toggle-focus.png` });
  for (let i = 0; i < 12 && a.text !== COPY.restart; i++) a = await press('Shift+Tab');
  check(a.text === COPY.restart && a.ring, `${tag}: Shift+Tab reaches "התחלה מחדש"`);
  await page.keyboard.press('Enter');
  await settle(page);
  a = await active();
  check(a.ring && (await steps.first().evaluate((b) => b === document.activeElement)), `${tag}: Enter on reset → the first step, ringed`);
  for (const i of [1, 2, 3]) check(await steps.nth(i).isDisabled(), `${tag}: state ${i + 1} locked after reset`);
  check(errors.length === 0, `${tag}: page errors — ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

/** At a common laptop size, framed as a learner arrives (the title under the sticky header), the
 *  question's answers and — after an answer — "לשלב הבא" are on screen without scrolling. */
async function laptop() {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  const root = page.locator('[data-qa="relief-cover-compare"]');
  await root.waitFor({ timeout: 30000 });
  await page.locator('h3', { hasText: 'השוואה בין תבליט לתכסית' }).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 104));
  await settle(page);
  const onScreen = (sel) =>
    page.evaluate((q) => [...document.querySelectorAll(q)].every((b) => b.getBoundingClientRect().bottom <= innerHeight && b.getBoundingClientRect().top >= 0), sel);
  check(await onScreen('[data-qa="rc-task"] [role="group"] button'), 'laptop 1366×768: the answers are not all on screen');
  const y0 = await page.evaluate(() => scrollY);
  await root.locator('[data-qa="rc-task"] [data-answer="cover"]').click();
  await settle(page);
  check(await onScreen('[data-qa="rc-task"] button'), 'laptop 1366×768: "לשלב הבא" is not on screen after an answer');
  check((await page.evaluate(() => scrollY)) === y0, 'laptop 1366×768: answering scrolled the page');
  await page.screenshot({ path: `${outDir}/laptop-1366x768-grove.png` });
  await ctx.close();
}

await walk(false);
await walk(true);
await loading(false);
await loading(true);
await noWebGL();
await keyboard();
await laptop();
await browser.close();
console.log(`card heights as shown (≤ ${AVAILABLE}): ${fits.join(' · ')}`);
if (failures.length) {
  console.error(`relief-cover QA: ${failures.length} failure(s)\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`relief-cover QA: all checks passed → ${outDir}`);
