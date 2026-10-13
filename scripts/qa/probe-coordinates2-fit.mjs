// Geometry probe for "קואורדינטות 2" (topic-02 #scene-coordinates-2): per viewport, the
// header height, the side-nav inset, the section's content width and every screen's box.
// Usage: QA_BASE=http://localhost:3000 node scripts/qa/probe-coordinates2-fit.mjs [WxH ...]
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE || 'http://localhost:3000';
const sizes = (process.argv.slice(2).length ? process.argv.slice(2) : ['1920x1080']).map((s) => s.split('x').map(Number));
const browser = await chromium.launch({ channel: 'chrome' });
for (const [width, height] of sizes) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`${BASE}/lessons/topic-02/#scene-coordinates-2`, { waitUntil: 'networkidle', timeout: 240000 });
  await page.waitForSelector('#scene-coordinates-2', { timeout: 120000 });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const sec = document.querySelector('#scene-coordinates-2');
    const cs = getComputedStyle(document.documentElement);
    const box = (el) => {
      const b = el.getBoundingClientRect();
      return { top: Math.round(b.top + scrollY), h: Math.round(b.height), w: Math.round(b.width), x: Math.round(b.left) };
    };
    const header = document.querySelector('header');
    return {
      headerH: cs.getPropertyValue('--header-h'), inset: getComputedStyle(sec.closest('[class*="lesson-content-inset"]') ?? sec).paddingInlineStart,
      headerBox: header ? box(header) : null,
      section: box(sec), contentW: sec.clientWidth - parseFloat(getComputedStyle(sec).paddingLeft) - parseFloat(getComputedStyle(sec).paddingRight),
      children: [...sec.children].map((c) => ({ tag: c.tagName, cls: c.className.slice(0, 50), data: Object.keys(c.dataset).join(','), fit: c.dataset.fitScale, ...box(c), kids: c.dataset.block === 'utm' || c.dataset.lessonViewportFit !== undefined ? [...(c.dataset.lessonViewportFit !== undefined ? c.firstElementChild.firstElementChild.firstElementChild?.children ?? [] : c.children)].map((k) => ({ tag: k.tagName, data: Object.keys(k.dataset).join(','), ...box(k) })) : undefined })),
      docH: document.documentElement.scrollHeight,
    };
  });
  console.log(`${width}x${height}`, JSON.stringify(r, null, 1));
  await page.close();
}
await browser.close();
