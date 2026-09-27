// TEMP QA script for the t02-relief-cover cleanup unit — delete when done.
import { chromium } from 'playwright';

const OUT = process.argv[2];
const BASE = 'http://localhost:3021';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1122 } });
const log = [];
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));

async function open(scene) {
  for (let i = 0; i < 4; i++) {
    await page.goto(`${BASE}/lessons/topic-02/#scene-${scene}`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(2500);
    if (await page.locator(`#scene-${scene}`).count()) return;
    await page.waitForTimeout(5000);
  }
  throw new Error('scene not rendered ' + scene);
}

const shot = async (loc, name) => {
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await loc.screenshot({ path: `${OUT}/int-${name}.png` });
};

// ── relief-cover: layered-terrain workspace ──
await open('relief-cover');
const scene = page.locator('#scene-relief-cover');
const ws = scene.locator('.surface-elevated').first();
await shot(ws, 'ws-default');

const chip = (name) => ws.getByRole('button', { name, exact: true });
await chip('גיא').hover();
await page.waitForTimeout(400);
await shot(ws, 'ws-hover-chip');

await chip('כיפה').click();
log.push('כיפה pressed=' + (await chip('כיפה').getAttribute('aria-pressed')));
await page.mouse.move(5, 5);
await shot(ws, 'ws-selected-relief');

await chip('מטע').click();
log.push('מטע pressed=' + (await chip('מטע').getAttribute('aria-pressed')) + ' כיפה pressed=' + (await chip('כיפה').getAttribute('aria-pressed')));
await page.mouse.move(5, 5);
await shot(ws, 'ws-selected-cover');
log.push('result text: ' + (await ws.locator('[aria-live="polite"]').innerText()).replace(/\s+/g, ' '));

await chip('מטע').click(); // same chip again → back to overview
log.push('after re-click מטע pressed=' + (await chip('מטע').getAttribute('aria-pressed')));

await ws.getByRole('button', { name: 'שכבת תכסית' }).click();
await page.waitForTimeout(900);
log.push('cover toggle pressed=' + (await ws.getByRole('button', { name: 'שכבת תכסית' }).getAttribute('aria-pressed')) + ' חורש disabled=' + (await chip('חורש').isDisabled()));
await shot(ws, 'ws-cover-off');
await ws.getByRole('button', { name: 'שכבת תכסית' }).click();
await ws.getByRole('button', { name: 'שכבת תבליט' }).click();
await page.waitForTimeout(900);
await shot(ws, 'ws-relief-off');
await ws.getByRole('button', { name: 'שכבת תבליט' }).click();
await page.waitForTimeout(700);

// click an object inside the illustration (a relief pin label) → selection syncs to the chip
const svg = ws.locator('svg[role="img"]');
const pin = svg.locator('text', { hasText: 'אוכף' });
await pin.click();
log.push('svg click אוכף → chip pressed=' + (await chip('אוכף').getAttribute('aria-pressed')));
await page.mouse.move(5, 5);
await shot(ws, 'ws-svg-select');

// keyboard focus on a chip
await chip('מישור').focus();
await page.keyboard.press('Enter');
log.push('keyboard Enter מישור pressed=' + (await chip('מישור').getAttribute('aria-pressed')));

// ── relief-cover quiz ──
const quiz = scene.locator('.surface-elevated').filter({ hasText: 'תבליט או תכסית?' });
const answer = async (q, label, opt, force = false) => {
  await q.getByRole('group', { name: `מיון: ${label}` }).getByRole('button', { name: opt, exact: true }).click({ force });
};
await quiz.getByRole('group', { name: 'מיון: גבעה' }).getByRole('button', { name: 'תבליט', exact: true }).hover();
await page.waitForTimeout(300);
await shot(quiz, 'quiz-hover');
await answer(quiz, 'גבעה', 'תכסית'); // wrong
await answer(quiz, 'חורש', 'תכסית'); // right
await answer(quiz, 'בית', 'תבליט'); // wrong
await page.mouse.move(5, 5);
await page.waitForTimeout(700);
await shot(quiz, 'quiz-mid');
log.push('mid counter: ' + (await quiz.locator('[aria-live="polite"]').innerText()));
// click answered item again — must be ignored
await answer(quiz, 'גבעה', 'תבליט', true);
log.push('after re-answer counter: ' + (await quiz.locator('[aria-live="polite"]').innerText()));
for (const [l, o] of [['עמק', 'תבליט'], ['כביש', 'תכסית'], ['מדרון', 'תבליט'], ['מטע זיתים', 'תכסית'], ['אוכף', 'תבליט']]) await answer(quiz, l, o);
await page.waitForTimeout(1200);
await shot(quiz, 'quiz-done-mixed');
log.push('done counter: ' + (await quiz.locator('[aria-live="polite"]').innerText()));
await quiz.getByRole('button', { name: 'התחלה מחדש' }).click();
await page.waitForTimeout(600);
log.push('after reset counter: ' + (await quiz.locator('[aria-live="polite"]').innerText()) +
  ' focused=' + (await page.evaluate(() => document.activeElement?.textContent)));
for (const [l, o] of [['גבעה', 'תבליט'], ['חורש', 'תכסית'], ['בית', 'תכסית'], ['עמק', 'תבליט'], ['כביש', 'תכסית'], ['מדרון', 'תבליט'], ['מטע זיתים', 'תכסית'], ['אוכף', 'תבליט']]) await answer(quiz, l, o);
await page.waitForTimeout(1200);
await page.mouse.move(5, 5);
await shot(quiz, 'quiz-done-perfect');
log.push('perfect counter: ' + (await quiz.locator('[aria-live="polite"]').innerText()));

// ── landcover quiz (same component) ──
await open('landcover');
const lq = page.locator('#scene-landcover .surface-elevated').filter({ hasText: 'טבעית או מלאכותית?' });
await shot(lq, 'lc-quiz-default');
await answer(lq, 'חורש', 'מלאכותית'); // wrong
await answer(lq, 'מטע הדרים', 'מלאכותית'); // right
await page.mouse.move(5, 5);
await page.waitForTimeout(700);
await shot(lq, 'lc-quiz-mid');
for (const [l, o] of [['גריגה', 'טבעית'], ['יער נטוע', 'מלאכותית'], ['טרסות', 'מלאכותית'], ['בתה', 'טבעית'], ['מאגר מים', 'מלאכותית'], ['שדה חיטה', 'מלאכותית']]) await answer(lq, l, o);
await page.waitForTimeout(1200);
await shot(lq, 'lc-quiz-done');
log.push('landcover done counter: ' + (await lq.locator('[aria-live="polite"]').innerText()));

console.log(JSON.stringify({ log, errs: [...new Set(errs)] }, null, 1));
await browser.close();
