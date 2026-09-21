// One-off QA capture for the MDO five-dimensions diorama interaction.
// Usage: node scripts/qa/shot-mdo-scene.mjs <outDir> [port]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] ?? 'design/screenshots/mdo-diorama';
const port = process.argv[3] ?? '3002';
const BASE = `http://localhost:${port}`;

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1122 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`${BASE}/lessons/topic-01/#scene-mdo`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.getElementById('scene-mdo')?.scrollIntoView({ block: 'start' }));
await page.waitForTimeout(700);

async function clip() {
  return page.evaluate(() => {
    const el = document.getElementById('scene-mdo');
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(1440, r.width), height: Math.min(1122 - Math.max(0, r.y), r.height) };
  });
}

await page.screenshot({ path: `${outDir}/01-initial.png`, clip: await clip() });

// Select each domain in turn to check marker alignment + card placement.
for (const id of ['land', 'air', 'sea', 'space', 'cyber']) {
  await page.click(`button[aria-label^="${{ land: 'יבשה', air: 'אוויר', sea: 'ים', space: 'חלל', cyber: 'סייבר' }[id]}"]`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/02-selected-${id}.png`, clip: await clip() });
  // close it again
  await page.click(`button[aria-label^="${{ land: 'יבשה', air: 'אוויר', sea: 'ים', space: 'חלל', cyber: 'סייבר' }[id]}"]`);
  await page.waitForTimeout(300);
}

// Disconnect a few, reset, check.
await page.click('button[aria-label^="חלל"]');
await page.waitForTimeout(300);
await page.click('#mdo-card button:has-text("ניתוק הממד")');
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/03-space-disconnected.png`, clip: await clip() });

await page.click('button[aria-label^="סייבר"]');
await page.waitForTimeout(300);
await page.click('#mdo-card button:has-text("ניתוק הממד")');
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/04-space-and-cyber-disconnected.png`, clip: await clip() });
await page.click('#mdo-card button[aria-label="סגירת ההסבר"]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/05-two-disconnected-card-closed.png`, clip: await clip() });

await page.click('#scene-mdo button:has-text("הפעלת כל הממדים")');
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/06-after-reset.png`, clip: await clip() });

console.log(JSON.stringify({ errors }, null, 2));
await browser.close();
