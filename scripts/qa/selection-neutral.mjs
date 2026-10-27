// Browser QA: a choice is neutral until it is checked — lesson 6's radio groups (terrain-nav/RadioRow.tsx and the
// location check's area choice) and the practice's object buttons.
//
// Usage (a dev server serving the page; the shared :3000 by default):
//   node scripts/qa/selection-neutral.mjs [outDir] [--base=http://localhost:3000]
//
// Checks (exit code 1 on any failure), at 1440 × 1122:
//   arrival    no option of any radio group is chosen on arrival (the step-length calculator excepted: it opens on the
//              example's 1.5 m, not an answer) and nothing inside an activity takes focus on arrival
//   neutral    a chosen option has no ✓ (no svg, no "✓") and no right/wrong tone (orange border and tint only)
//   focus      a focused, unchosen option (e.g. 800, the first pace option and the right one) does not look chosen:
//              thin border, no tint, the focus ring stands off the border
//   verdict    after a check, a wrong choice keeps its neutral look; the ✓ / ✗ is in the feedback only
//   change     a new choice clears the old verdict (pace, location check)
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'design/screenshots/selection-neutral';
const BASE = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7);
await mkdir(outDir, { recursive: true });

const failures = [];
const check = (cond, m) => {
  if (cond) console.log('ok  ', m);
  else {
    failures.push(m);
    console.log('FAIL', m);
  }
};

/** How each option of a group looks: chosen, a ✓ inside it, its border width, tint and focus ring offset. */
const looks = (page, sel) =>
  page.locator(sel).evaluateAll((els) =>
    els.map((el) => {
      const cs = getComputedStyle(el);
      return {
        label: el.textContent.trim(),
        checked: el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-pressed') === 'true',
        tick: el.querySelectorAll('svg').length > 0 || el.textContent.includes('✓'),
        border: parseFloat(cs.borderTopWidth),
        tint: cs.backgroundColor,
        tone: /brand|accent-hot|green|red/.test(el.className),
        focused: document.activeElement === el,
        ringOffset: cs.getPropertyValue('--tw-ring-offset-width').trim(),
        shadow: cs.boxShadow,
      };
    }),
  );
const neutralChosen = (opts) => opts.filter((o) => o.checked).every((o) => !o.tick && !o.tone && o.border >= 2);

async function open(browser, hash, ready) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (let attempt = 1; ; attempt++) {
    try {
      await page.goto(`${BASE}/lessons/topic-06/${hash}`, { waitUntil: 'load', timeout: 180000 });
      await page.waitForSelector(ready, { timeout: 90000 });
      break;
    } catch (e) {
      if (attempt >= 3) throw e;
      console.log(`retry ${hash} (${String(e).split('\n')[0]})`);
    }
  }
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}
const scrollTo = (page, sel) =>
  page.locator(sel).first().evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: 'instant' }));
const focusInside = (page, sel) => page.evaluate((s) => !!document.activeElement?.closest(s), sel);

const browser = await chromium.launch({ channel: 'chrome' });
try {
  // ================================================================ blind navigation (dead-reckoning): the pace question
  {
    const { page, errors, ctx } = await open(browser, '#scene-combatnav', '[data-activity="dead-reckoning"]');
    const DR = '[data-activity="dead-reckoning"]';
    const PACE = `${DR} [data-radio="pace"] [role="radio"]`;
    await scrollTo(page, DR);
    await page.waitForTimeout(400);
    let o = await looks(page, PACE);
    check(o.length === 4 && o.every((x) => !x.checked), `pace: nothing chosen on arrival (${o.map((x) => x.label).join(', ')})`);
    check(!(await focusInside(page, DR)), 'pace: nothing in the activity takes focus on arrival');
    // keyboard focus on the first option (800, the right one) is not a choice
    await page.locator(PACE).first().focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    o = await looks(page, PACE);
    const f = o.find((x) => x.focused);
    check(!!f && f.label === '800' && !f.checked && f.border < 2 && f.ringOffset === '2px' && f.shadow !== 'none', 'pace: Tab focuses 800 with a ring off the border, thin border, not chosen');
    await page.screenshot({ path: `${outDir}/01-pace-focus-800.png`, clip: await page.locator(DR).boundingBox() });
    await page.locator(`${PACE}[data-option="1200"]`).click();
    o = await looks(page, PACE);
    check(neutralChosen(o) && o.filter((x) => x.checked).map((x) => x.label).join() === '1,200', 'pace: 1,200 chosen — orange border and tint, no ✓');
    await page.locator(DR).getByRole('button', { name: 'בדיקה', exact: true }).click();
    await page.waitForTimeout(300);
    o = await looks(page, PACE);
    const fb = page.locator(`${DR} [data-dr-feedback]`);
    const kind = await fb.getAttribute('data-dr-feedback');
    check(neutralChosen(o) && (await fb.locator('svg.lucide-x').count()) > 0, `pace, wrong (1,200): the choice stays neutral; the ✗ is in the feedback (${kind})`);
    await page.screenshot({ path: `${outDir}/02-pace-wrong.png`, clip: await page.locator(DR).boundingBox() });
    await page.locator(`${PACE}[data-option="1600"]`).click();
    await page.waitForTimeout(200);
    const after = (await fb.count()) ? await fb.getAttribute('data-dr-feedback') : null;
    check(after !== kind && (await page.locator(`${DR} [data-dr-feedback] svg.lucide-x`).count()) === 0, `pace: a new choice clears the old verdict (${kind} → ${after})`);
    await page.locator(`${PACE}[data-option="800"]`).click();
    await page.locator(DR).getByRole('button', { name: 'בדיקה', exact: true }).click();
    await page.waitForTimeout(300);
    o = await looks(page, PACE);
    check(neutralChosen(o) && (await page.locator(`${DR} [data-dr-feedback] svg.lucide-check`).count()) > 0, 'pace, right (800): the ✓ is in the feedback, not on the option');
    await page.screenshot({ path: `${outDir}/03-pace-right.png`, clip: await page.locator(DR).boundingBox() });
    check(errors.length === 0, `blind navigation: no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);

    // ================================================================ terrain navigation: the point and the comparison
    const TA = '[data-activity="terrain-association"]';
    await scrollTo(page, TA);
    await page.waitForTimeout(400);
    // the point question is in the practice mode (the mode switch is a segmented control, no ✓)
    await page.locator(`${TA} [data-mode-switch] [role="radio"]`).nth(1).click();
    await page.waitForSelector(`${TA} [data-radio="candidates"]`, { timeout: 60000 });
    await page.waitForTimeout(600);
    const CAND = `${TA} [data-radio="candidates"] [role="radio"]`;
    o = await looks(page, CAND);
    check(o.length > 0 && o.every((x) => !x.checked), `terrain: no point chosen when the practice opens (${o.map((x) => x.label).join(', ')})`);
    await page.locator(CAND).nth(1).click();
    await page.waitForTimeout(200);
    o = await looks(page, CAND);
    check(neutralChosen(o) && o.some((x) => x.checked), `terrain: point ${o.find((x) => x.checked)?.label} chosen — neutral, no ✓`);
    const CMP = `${TA} [data-radio="comparison"] [role="radio"]`;
    await page.locator(CMP).first().click();
    o = await looks(page, CMP);
    check(neutralChosen(o) && o.some((x) => x.checked), 'terrain: the comparison chosen — neutral, no ✓');
    // check whatever was chosen: right or wrong, the options stay neutral; the verdict is in the feedback
    await page.locator(TA).getByRole('button', { name: 'בדיקת המיקום' }).click();
    await page.waitForTimeout(400);
    const tVerdict = await page.locator(`${TA} [data-feedback]`).first().getAttribute('data-feedback');
    o = [...(await looks(page, CAND)), ...(await looks(page, CMP))];
    check(neutralChosen(o) && o.every((x) => !x.tick), `terrain, checked (${tVerdict}): the chosen options stay neutral, no ✓ / ✗ on them`);
    await page.screenshot({ path: `${outDir}/04-terrain-checked.png`, clip: await page.locator(TA).boundingBox() });
    if (tVerdict !== 'right') {
      await page.locator(CAND).nth(0).click();
      await page.waitForTimeout(200);
      const t2 = await page.locator(`${TA} [data-feedback]`).first().getAttribute('data-feedback');
      check(t2 !== tVerdict, `terrain: a new choice replaces the old verdict (${tVerdict} → ${t2})`);
    }
    check(errors.length === 0, `terrain navigation: no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
    await ctx.close();
  }

  // ================================================================ step length (planning): the calculator's pace
  {
    const { page, errors, ctx } = await open(browser, '#scene-planning', '#scene-planning [data-radio="pace"]');
    const PACE = '#scene-planning [data-radio="pace"] [role="radio"]';
    let o = await looks(page, PACE);
    check(o.filter((x) => x.checked).map((x) => x.label).join() === '1.5 מ׳', `step length: opens on the example's 1.5 m (a calculator setting, not an answer): ${o.map((x) => `${x.label}${x.checked ? '*' : ''}`).join(', ')}`);
    await page.locator(`${PACE}[data-option="1.6"]`).click();
    o = await looks(page, PACE);
    check(neutralChosen(o), 'step length: 1.6 m chosen — neutral, no ✓');
    check(errors.length === 0, `step length: no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
    await ctx.close();
  }

  // ================================================================ location check: the area
  {
    const { page, errors, ctx } = await open(browser, '#scene-principles', '[data-activity="location-check"]');
    const LC = '[data-activity="location-check"]';
    const AREA = `${LC} [data-choice="area"] [role="radio"]`;
    await scrollTo(page, LC);
    await page.waitForTimeout(400);
    let o = await looks(page, AREA);
    check(o.length > 0 && o.every((x) => !x.checked), `area: nothing chosen on arrival (${o.map((x) => x.label).join(', ')})`);
    check(!(await focusInside(page, LC)), 'area: nothing in the activity takes focus on arrival');
    await page.locator(AREA).nth(1).click();
    o = await looks(page, AREA);
    check(neutralChosen(o), `area: ${o.find((x) => x.checked)?.label} chosen — neutral, no ✓`);
    await page.locator(LC).getByRole('button', { name: 'בדקו את הבחירה' }).click();
    await page.waitForTimeout(400);
    o = await looks(page, AREA);
    const ticks = await page.locator(`${LC} svg.lucide-x, ${LC} svg.lucide-check`).count();
    check(neutralChosen(o) && ticks > 0, `area, checked: the choice stays neutral; the verdict marks are in the feedback (${ticks})`);
    await page.screenshot({ path: `${outDir}/05-area-checked.png`, clip: await page.locator(LC).boundingBox() });
    await page.locator(AREA).nth(0).click();
    await page.waitForTimeout(300);
    const left = await page.locator(`${LC} svg.lucide-x, ${LC} svg.lucide-check`).count();
    check(left === 0, `area: a new choice clears the old verdict (verdict marks left: ${left})`);
    check(errors.length === 0, `location check: no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log(failures.length ? `\n${failures.length} FAILED` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
