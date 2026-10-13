// Laptop-fit QA for topic-02 „תבליט ותכסית” (#scene-relief-cover), 2026-10-13.
//
//   QA_PORT=3117 node scripts/qa/shot-relief-cover-fit.mjs <label> [--states]
//
// For every viewport (1920×1080, 1536×864, 1440×1122, 1366×768) it saves
//   design/screenshots/relief-cover-fit/<label>-<w>x<h>-full.png        the whole section
//   design/screenshots/relief-cover-fit/<label>-<w>x<h>-screen<N>.png    each screen scrolled
//                                                                        to just under the header
// and prints, per screen: the LessonViewportFit scale, its top/bottom in the viewport, whether it
// fits above the fold, horizontal overflow, and overlap between consecutive screens.
// With --states it also drives every interaction (layer toggles, feature selection from the
// list and from the illustration, all four comparison states with a right and a wrong answer,
// the summary table, a 3D drag, the quiz) and screenshots each state.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const label = process.argv[2] ?? 'after';
const withStates = process.argv.includes('--states');
const outDir = 'design/screenshots/relief-cover-fit';
const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-relief-cover`;
const HEADER = 80; // fixed site header
const GAP = 24; // breathing room under the header when a screen is scrolled into view
const VIEWPORTS = [
  [1920, 1080],
  [1536, 864],
  [1440, 1122],
  [1366, 768],
];
await mkdir(outDir, { recursive: true });

const failures = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
};

/** First element of each screen: the LessonViewportFit wrappers, or (before the fit) the header + h3s. */
const SCREENS_JS = () => {
  const sec = document.querySelector('#scene-relief-cover');
  const fits = [...sec.querySelectorAll(':scope > [data-lesson-viewport-fit]')];
  if (fits.length) return fits;
  return [...sec.children].filter((c) => c.tagName === 'HEADER' || c.tagName === 'H3');
};

async function settle(page) {
  // the live model starts only near the viewport
  await page.locator('[data-qa="rc-block"]').scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => {
      const m = document.querySelector('[data-qa="rc-block"] [data-renderer]');
      return m && (m.hasAttribute('data-ready') || m.getAttribute('data-renderer') === 'static');
    },
    null,
    { timeout: 90000 },
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
}

async function scrollToScreen(page, i) {
  await page.evaluate(
    ([i, top, screensSrc]) => {
      const screens = new Function(`return (${screensSrc})()`)();
      const el = screens[i];
      window.scrollTo(0, el.getBoundingClientRect().top + scrollY - top);
    },
    [i, HEADER + GAP, SCREENS_JS.toString()],
  );
  await page.waitForTimeout(400);
}

async function metrics(page) {
  return page.evaluate((screensSrc) => {
    const screens = new Function(`return (${screensSrc})()`)();
    return {
      scrollW: document.documentElement.scrollWidth,
      innerW: innerWidth,
      screens: screens.map((el) => {
        // a fit wrapper's footprint is the scaled composition; before the fit, a screen runs to the next title
        const r = el.getBoundingClientRect();
        let bottom = r.bottom;
        if (!el.hasAttribute('data-lesson-viewport-fit')) {
          let n = el.nextElementSibling;
          while (n && n.tagName !== 'H3') {
            bottom = n.getBoundingClientRect().bottom;
            n = n.nextElementSibling;
          }
        }
        return {
          scale: el.dataset.fitScale ?? '-',
          top: Math.round(r.top + scrollY),
          height: Math.round(bottom - r.top),
          width: Math.round(r.width),
          left: Math.round(r.left),
          right: Math.round(r.right),
        };
      }),
    };
  }, SCREENS_JS.toString());
}

const browser = await chromium.launch({ channel: 'chrome' });
for (const [w, h] of VIEWPORTS) {
  // the dev server occasionally reloads the page (another session's edit): retry the viewport
  for (let attempt = 1; ; attempt++) {
    try {
      await runViewport(w, h);
      break;
    } catch (e) {
      if (attempt >= 3) throw e;
      console.log(`  (${w}x${h} attempt ${attempt} failed: ${String(e).split('\n')[0]}; retrying)`);
    }
  }
}
await browser.close();

async function runViewport(w, h) {
  const tag = `${label}-${w}x${h}`;
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('#scene-relief-cover', { timeout: 90000 });
  await settle(page);

  const m = await metrics(page);
  console.log(`\n=== ${tag}  scrollWidth ${m.scrollW}/${m.innerW}`);
  check(m.scrollW <= m.innerW, `${tag}: horizontal scroll (${m.scrollW} > ${m.innerW})`);
  m.screens.forEach((s, i) => {
    const avail = h - HEADER - GAP - GAP;
    const fits = s.height <= avail;
    console.log(
      `screen${i + 1}  scale ${String(s.scale).padEnd(6)} top ${String(s.top).padStart(5)}  height ${String(s.height).padStart(4)}  width ${s.width}  x ${s.left}..${s.right}  ${fits ? 'fits' : `TALLER than ${avail}`}`,
    );
    if (i > 0) check(s.top >= m.screens[i - 1].top + m.screens[i - 1].height, `${tag}: screen${i + 1} overlaps screen${i}`);
  });

  await page.screenshot({ path: `${outDir}/${tag}-full.png`, fullPage: true });
  for (let i = 0; i < m.screens.length; i++) {
    await scrollToScreen(page, i);
    await page.screenshot({ path: `${outDir}/${tag}-screen${i + 1}.png` });
  }

  if (withStates) await states(page, tag);
  check(errors.length === 0, `${tag}: console errors: ${errors.join(' | ').slice(0, 400)}`);
  await page.close();
}

async function states(page, tag) {
  const sec = page.locator('#scene-relief-cover');
  const shot = (name) => page.screenshot({ path: `${outDir}/${tag}-state-${name}.png` });

  // ── screen 2: layers and selection
  await scrollToScreen(page, 1);
  await sec.getByRole('button', { name: 'מטע', exact: true }).first().click();
  await page.waitForTimeout(500);
  check((await sec.getByRole('button', { name: 'מטע', exact: true }).first().getAttribute('aria-pressed')) === 'true', `${tag}: list selection`);
  check((await sec.locator('[aria-live="polite"] h3').first().textContent())?.trim() === 'מטע', `${tag}: info inset shows the list selection`);
  await shot('s2-select-list');
  // select from the illustration: the "כיפה" callout inside the SVG
  const svg = sec.locator('svg[aria-label^="חתך צד"]');
  await svg.locator('g.cursor-pointer', { hasText: 'אוכף' }).first().click();
  await page.waitForTimeout(500);
  check((await sec.locator('[aria-live="polite"] h3').first().textContent())?.trim() === 'אוכף', `${tag}: click in the illustration selects`);
  await shot('s2-select-svg');
  await sec.getByRole('button', { name: /שכבת תכסית/ }).click();
  await page.waitForTimeout(500);
  check((await sec.getByRole('button', { name: /שכבת תכסית/ }).getAttribute('aria-pressed')) === 'false', `${tag}: cover layer toggles off`);
  await shot('s2-cover-off');
  await sec.getByRole('button', { name: /שכבת תבליט/ }).click();
  await page.waitForTimeout(500);
  await shot('s2-both-off');
  await sec.getByRole('button', { name: /שכבת תבליט/ }).click();
  await sec.getByRole('button', { name: /שכבת תכסית/ }).click();
  await page.waitForTimeout(400);

  // ── screen 3: the comparison flow
  await scrollToScreen(page, 2);
  const card = page.locator('[data-qa="rc-state-card"]');
  const answer = async (name) => {
    await page.locator('[data-qa="rc-question"]').getByRole('button', { name, exact: true }).click();
    await page.waitForTimeout(2000);
  };
  const cont = async () => {
    await card.getByRole('button', { name: 'המשך', exact: true }).click();
    await page.waitForTimeout(500);
  };
  // drag the live model a little; it must not throw and the page must not scroll sideways
  const model = page.locator('[data-qa="rc-block"] canvas').first();
  await page.locator('[data-qa="rc-block"] [data-ready]').waitFor({ timeout: 60000 }).catch(() => {});
  if (await model.count()) {
    const b = await model.boundingBox({ timeout: 10000 });
    check(Math.abs(b.width / b.height - 518 / 352) < 0.02, `${tag}: canvas keeps the board's aspect (${b.width}×${b.height})`);
    const size = await model.evaluate((c) => ({ w: c.width, cw: c.clientWidth, dpr: devicePixelRatio }));
    check(Math.abs(size.w - size.cw * size.dpr) <= 2, `${tag}: canvas backing store matches its untransformed size (${size.w} vs ${size.cw}×${size.dpr})`);
    await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.62, b.y + b.height * 0.5, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(600);
  }
  await shot('s3-bare');
  await cont(); // the first state opens with its cells; "המשך" asks the first question
  await shot('s3-bare-question');
  await answer('תכסית'); // grove: right
  check((await page.locator('[data-qa="rc-feedback"]').textContent())?.includes('נכון'), `${tag}: grove right feedback`);
  await shot('s3-grove-right');
  await cont();
  await answer('תבליט'); // built: wrong
  check((await page.locator('[data-qa="rc-feedback"]').textContent())?.includes('התשובה הנכונה'), `${tag}: built wrong feedback`);
  await shot('s3-built-wrong');
  await cont();
  await answer('שניהם'); // quarry: right
  await page.waitForTimeout(600);
  check((await page.locator('[data-qa="rc-summary"] [id$="-table"] .surface').count()) === 1, `${tag}: summary opens at the quarry`);
  await shot('s3-quarry');
  await page.locator('[data-qa="rc-summary"]').scrollIntoViewIfNeeded();
  await shot('s3-summary');
  // revisit a step
  await page.locator('[data-qa="relief-cover-compare"] ol button').nth(1).click();
  await page.waitForTimeout(800);
  await scrollToScreen(page, 2);
  await shot('s3-revisit-grove');

  // ── screen 4: the quiz
  await scrollToScreen(page, 3);
  const items = page.locator('#scene-relief-cover ul > li');
  await items.nth(0).getByRole('button', { name: 'תבליט', exact: true }).click(); // גבעה: right
  await items.nth(1).getByRole('button', { name: 'תבליט', exact: true }).click(); // חורש: wrong
  await page.waitForTimeout(700);
  await shot('s4-quiz-feedback');
}

if (failures.length) {
  console.log(`\n${failures.length} failure(s):\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log('\nall checks passed');
