// Acceptance checks for the shared lesson 2 / lesson 6 historical-cases component.
// Run with a ready dev server: node scripts/qa/shot-topic06-examples.mjs
// Browser review in this round was performed through Codex browser, not this script.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = process.argv[2] || 'design/screenshots/topic06-examples-shared';
const base = process.env.QA_BASE || 'http://localhost:3000';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1122 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${base}/lessons/topic-06/#scene-onboarding`);
  const panel = page.locator('#navigation-history-detail-panel');
  await panel.waitFor();
  const buttons = page.locator('button[aria-controls="navigation-history-detail-panel"]');
  assert.equal(await buttons.count(), 4);
  const titles = ['ניווט לפי כוכבים', 'ניווט ביער צפוף', 'ניווט בתנאי שיבוש', 'שני צמתים דומים'];
  for (let i = 0; i < 4; i++) {
    if (i === 2) await buttons.nth(i).press('Enter');
    else if (i === 3) await buttons.nth(i).press('Space');
    else await buttons.nth(i).click();
    await panel.getByRole('heading', { name: titles[i], exact: true }).waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('#scene-onboarding .shadow-pine-card img')].every(i => i.complete && i.naturalWidth > 0));
    await page.waitForTimeout(550);
    const measured = await panel.evaluate(el => {
      const band = el.closest('.shadow-pine-card');
      const fit = band.parentElement;
      const callout = fit.querySelector(':scope > section');
      const b = band.getBoundingClientRect();
      const end = callout?.getBoundingClientRect().bottom ?? b.bottom;
      window.scrollTo({ top: window.scrollY + b.top - 96, behavior: 'instant' });
      return { width: b.width, height: end - b.top, images: band.querySelectorAll('img').length };
    });
    assert.equal(measured.images, 5);
    assert.ok(measured.height <= 1026, `example ${i + 1} does not fit`);
    assert.ok(Math.abs(measured.width - 1052) < 2);
    assert.equal(await buttons.nth(i).getAttribute('aria-expanded'), 'true');
    await page.screenshot({ path: `${out}/example-${i + 1}.png` });
  }
  assert.equal(await page.getByRole('button', { name: 'דגשים לתכנון ולניווט', exact: true }).count(), 1);
  await page.goto(`${base}/lessons/topic-02/#scene-practice`);
  await page.locator('#history-detail-panel').waitFor();
  assert.equal(await page.locator('button[aria-controls="history-detail-panel"]').count(), 4);
  assert.deepEqual(errors, []);
  console.log('PASS: 4 examples, all images, fit, keyboard activation, restored navigation, lesson 2 defaults.');
} finally {
  await browser.close();
}
