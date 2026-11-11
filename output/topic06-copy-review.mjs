import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const phase = process.argv[2] ?? 'before';
const out = `design/screenshots/topic06-instructions-2026-11-01/${phase}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1122 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const capture = async (selector, name) => {
  await page.locator(selector).evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'instant' }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}.png` });
};
try {
  await page.goto('http://localhost:3000/lessons/topic-06/#scene-tips', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-activity="planning-lab"] [data-map="sheet"]', { timeout: 180000 });
  await page.waitForSelector('[data-activity="planning-lab"] [data-panel="model"][data-ready]', { timeout: 120000 });
  await capture('[data-tips-screen="plan"]', '01-planning');
  await page.locator('[data-activity="planning-lab"] [data-action="example"]').click();
  await page.locator('[data-activity="planning-lab"] [data-tool-switch] [role="radio"]').count().then(async count => {
    if (count) await page.locator('[data-activity="planning-lab"] [data-tool-switch] [role="radio"]').nth(1).click();
    else await page.evaluate(() => window.__pl.dispatch({ type: 'tool', tool: 'checks' }));
  });
  await capture('[data-tips-screen="plan"]', '02-planning-checks');
  await capture('[data-tips-screen="nav"]', '03-replay-start');
  await page.locator('[data-activity="navigation-replay"] [data-action="depart"]').click();
  await capture('[data-tips-screen="nav"]', '04-replay-decision');
  await page.locator('[data-activity="navigation-replay"] [data-choice="continue"]').click();
  await capture('[data-tips-screen="nav"]', '05-replay-reason');
  await page.goto('http://localhost:3000/lessons/topic-06/#scene-combatnav', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('[data-activity="terrain-association"] [data-strip="learn"]', { timeout: 120000 });
  await page.waitForFunction(() => !document.querySelector('[data-activity="terrain-association"] [data-loading]'), null, { timeout: 120000 });
  await capture('[data-activity="terrain-association"]', '06-terrain-learn');
  await page.locator('[data-activity="terrain-association"] [data-mode-switch] [role="radio"]').nth(1).click();
  await capture('[data-activity="terrain-association"]', '07-terrain-practice');
  await page.locator('[data-radio="candidates"] [role="radio"]').first().click();
  await capture('[data-activity="terrain-association"]', '08-terrain-steps');
  await writeFile(`${out}/report.json`, JSON.stringify({ errors }, null, 2));
  console.log(JSON.stringify({ out, errors }));
} finally { await browser.close(); }
