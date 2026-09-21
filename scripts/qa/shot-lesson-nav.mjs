// One-off QA capture for the lesson side-nav refactor.
// Usage: node scripts/qa/shot-lesson-nav.mjs <outDir> [topicId]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] ?? 'design/screenshots/nav-refactor';
const topic = process.argv[3] ?? 'topic-01';
const BASE = 'http://localhost:3000';

await mkdir(outDir, { recursive: true });
// This repo's playwright build has no bundled chromium; use the installed
// Chrome channel (same browser the Playwright MCP drives).
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1122 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const shot = async (name) => {
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${outDir}/${name}.png` });
};
const clickTab = async (key) => {
  await page.evaluate((k) => document.getElementById(`lesson-tab-${k}`)?.click(), key);
};
const probe = () => page.evaluate(() => {
  const aside = document.querySelector('aside[aria-label="ניווט השיעור"]');
  const r = aside?.getBoundingClientRect();
  const sel = document.querySelector('[role="tab"][aria-selected="true"]');
  const step = document.querySelector('[aria-current="step"]');
  return {
    hash: location.hash,
    aside: r ? { x: +r.x.toFixed(1), w: +r.width.toFixed(1), y: r.y, h: r.height } : null,
    activeTab: sel?.textContent?.trim() ?? null,
    activeScene: step?.textContent?.trim() ?? null,
    tablists: document.querySelectorAll('[role="tablist"]').length,
    visibleTablists: [...document.querySelectorAll('[role="tablist"]')]
      .filter((el) => el.getBoundingClientRect().width > 0).length,
    hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    navScrollable: aside ? aside.scrollHeight > aside.clientHeight : null,
  };
});

const report = {};
await page.goto(`${BASE}/lessons/${topic}/#scene-hook`, { waitUntil: 'networkidle' });
await shot('after-01-hook');
report.hook = await probe();

await page.goto(`${BASE}/lessons/${topic}/#scene-levels`, { waitUntil: 'networkidle' });
await shot('after-02-scene');
report.scene = await probe();

await clickTab('practice');
await shot('after-03-practice');
report.practice = await probe();

await clickTab('check');
await shot('after-04-check');
report.check = await probe();

await clickTab('learn');
await page.waitForTimeout(900);
report.backToLearn = await probe();

console.log(JSON.stringify({ topic, report, errors: errors.slice(0, 8) }, null, 2));
await browser.close();
