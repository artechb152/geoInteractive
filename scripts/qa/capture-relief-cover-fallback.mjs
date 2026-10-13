// Stills of the live "בשטח" model of topic-02 screen 3 („אותה גבעה, שלושה נופים”), one per state,
// for browsers without WebGL (ReliefCoverModel shows them instead of the canvas).
// Taken from the model itself at its opening view, overlays hidden, 2× for sharp screens.
//
//   QA_PORT=3000 node scripts/qa/capture-relief-cover-fallback.mjs
//
// Writes public/assets/lessons/topic02/relief-cover-compare/{bare,grove,built,quarry}.jpg
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const OUT = 'public/assets/lessons/topic02/relief-cover-compare';
const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-relief-cover`;
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
const root = page.locator('[data-qa="relief-cover-compare"]');
await root.waitFor({ state: 'attached', timeout: 120000 });
await page.evaluate(() => document.querySelector('[data-qa="relief-cover-compare"]').scrollIntoView({ block: 'start' }));
await page.addStyleTag({ content: '[data-qa="rc-block"] [data-overlay] { visibility: hidden !important; }' });
const model = page.locator('[data-qa="rc-block"] [data-renderer]');
await page.waitForFunction(() => document.querySelector('[data-qa="rc-block"] [data-renderer]')?.hasAttribute('data-ready'), null, { timeout: 90000 });

const shot = async (state) => {
  await page.waitForTimeout(1200); // reduced motion: objects and ground change at once; let the frame settle
  await model.screenshot({ path: `${OUT}/${state}.jpg`, type: 'jpeg', quality: 82 });
  console.log(`${OUT}/${state}.jpg`);
};
const step = async (answer) => {
  await root.getByRole('button', { name: 'המשך' }).click();
  await root.locator('[data-qa="rc-question"]').getByRole('button', { name: answer, exact: true }).click();
};

await shot('bare');
await step('תכסית');
await shot('grove');
await step('תכסית');
await shot('built');
await step('שניהם');
await shot('quarry');
await browser.close();
