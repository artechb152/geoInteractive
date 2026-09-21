import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] ?? 'design/screenshots/mdo-diorama';
const port = process.argv[3] ?? '3002';
const BASE = `http://localhost:${port}`;
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });

// 1) Reduced motion: confirm no SMIL loops render and state flips are instant.
const ctxRM = await browser.newContext({ viewport: { width: 1440, height: 1122 }, reducedMotion: 'reduce' });
const pageRM = await ctxRM.newPage();
await pageRM.goto(`${BASE}/lessons/topic-01/#scene-mdo`, { waitUntil: 'networkidle' });
await pageRM.evaluate(() => document.getElementById('scene-mdo')?.scrollIntoView({ block: 'start' }));
await pageRM.waitForTimeout(500);
const animCount = await pageRM.evaluate(() => document.querySelectorAll('#scene-mdo animate, #scene-mdo animateMotion').length);
await pageRM.click('button[aria-label^="סייבר"]');
await pageRM.waitForTimeout(150);
await pageRM.click('#mdo-card button:has-text("ניתוק הממד")');
await pageRM.waitForTimeout(150);
const clipRM = await pageRM.evaluate(() => { const el = document.getElementById('scene-mdo'); const r = el.getBoundingClientRect(); return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(1440, r.width), height: Math.min(1122 - Math.max(0, r.y), r.height) }; });
await pageRM.screenshot({ path: `${outDir}/07-reduced-motion-cyber-off.png`, clip: clipRM });
await ctxRM.close();

// 2) Keyboard: tab from the page start until an MDO pill gets focus, then
// operate it (Enter to open, Enter on the card's toggle to disconnect,
// Enter on close) purely via keyboard, screenshotting focus rings.
const ctxKB = await browser.newContext({ viewport: { width: 1440, height: 1122 } });
const pageKB = await ctxKB.newPage();
await pageKB.goto(`${BASE}/lessons/topic-01/#scene-mdo`, { waitUntil: 'networkidle' });
await pageKB.evaluate(() => document.getElementById('scene-mdo')?.scrollIntoView({ block: 'start' }));
await pageKB.waitForTimeout(400);
await pageKB.evaluate(() => {
  const first = document.querySelector('#scene-mdo button[aria-label^="יבשה"]');
  first?.focus();
});
const focusedIsLand = await pageKB.evaluate(() => document.activeElement?.getAttribute('aria-label'));
await pageKB.keyboard.press('Enter');
await pageKB.waitForTimeout(200);
const cardOpenedForLand = await pageKB.evaluate(() => document.getElementById('mdo-card')?.textContent?.includes('יבשה'));
await pageKB.keyboard.press('Tab'); // -> close (x) button
await pageKB.keyboard.press('Tab'); // -> toggle button
const focusedIsToggle = await pageKB.evaluate(() => document.activeElement?.textContent?.trim());
await pageKB.keyboard.press('Enter'); // disconnect land
await pageKB.waitForTimeout(200);
const landDisconnected = await pageKB.evaluate(() => !document.querySelector('#scene-mdo button[aria-label^="יבשה"]').getAttribute('aria-label').includes('לא פעיל') ? 'unexpected' : 'ok');
const clipKB = await pageKB.evaluate(() => { const el = document.getElementById('scene-mdo'); const r = el.getBoundingClientRect(); return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(1440, r.width), height: Math.min(1122 - Math.max(0, r.y), r.height) }; });
await pageKB.screenshot({ path: `${outDir}/08-keyboard-flow.png`, clip: clipKB });
await ctxKB.close();

console.log(JSON.stringify({ animCount, focusedIsLand, cardOpenedForLand, focusedIsToggle, landDisconnected }, null, 2));
await browser.close();
