// QA for the topic-02 slope workspace ("ארבעה סוגי מדרונות וזיהוים במפה").
//
// Usage (dev server on :3000, or set QA_PORT for a private one):
//   node scripts/qa/shot-slopes.mjs [outDir]
//
// Fit check, exit code 1 on failure: with the workspace scrolled just under the
// site nav, its whole card — tabs, both drawings and the description/map-cue
// text — ends above the fold at every desktop viewport below (1440 target plus
// common laptop browser viewports), with no horizontal scroll.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] ?? 'design/screenshots/slopes-fit';
const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-landforms`;
const NAV_OFFSET = 88;
await mkdir(outDir, { recursive: true });

const failures = [];
const report = {};
const browser = await chromium.launch({ channel: 'chrome' });

for (const [w, h] of [
  [1440, 900],
  [1440, 1122],
  [1440, 790],
  [1536, 730],
  [1366, 650],
  [1920, 960],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-qa="slope-analyzer"]', { timeout: 30000 });
  // Measure with the real web fonts — a fallback face wraps the text differently.
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some((f) => f.family.includes('Heebo') && f.status === 'loaded');
  });
  if (!fonts) fail(`${w}x${h}: Heebo did not load — measurements use a fallback font`);
  await page.evaluate((off) => {
    const top = document.querySelector('[data-qa="slope-analyzer"]').getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - off);
  }, NAV_OFFSET);
  await page.waitForTimeout(1500);

  for (const name of ['קצוב', 'קמור', 'קעור', 'כתף']) {
    await page.getByRole('tab', { name: new RegExp(name) }).click();
    await page.waitForTimeout(900);
    const m = await page.evaluate(() => {
      const card = document.querySelector('[data-qa="slope-analyzer"]').getBoundingClientRect();
      const fig = document.querySelector('#lf-slope-figure').getBoundingClientRect();
      const side = document.querySelector('#lf-slope-panel').getBoundingClientRect();
      return {
        top: Math.round(card.top),
        bottom: Math.round(card.bottom),
        height: Math.round(card.height),
        figure: `${Math.round(fig.width)}×${Math.round(fig.height)}`,
        textBottom: Math.round(side.bottom),
        innerHeight: window.innerHeight,
        hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    report[`${w}x${h}-${name}`] = m;
    if (m.bottom > m.innerHeight) fail(`${w}x${h} ${name}: card bottom ${m.bottom} > ${m.innerHeight}`);
    if (m.hScroll > 0) fail(`${w}x${h}: horizontal scroll ${m.hScroll}px`);
    await page.screenshot({ path: `${outDir}/${w}x${h}-${name}.png` });
  }
  if (errors.length) fail(`${w}x${h} console errors: ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

function fail(msg) {
  failures.push(msg);
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
if (failures.length) {
  console.log('FAIL\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('PASS');
