// Layout probe for topic-02 „תבליט ותכסית” (laptop fit task, 2026-10-13).
//   QA_PORT=3000 node scripts/qa/probe-relief-cover-fit.mjs
// Prints, per viewport: the header's height and position, the section's content box, and each
// direct child of the section (top, height, width) plus any LessonViewportFit scales.
import { chromium } from 'playwright';

const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-relief-cover`;
const VIEWPORTS = [
  [1920, 1080],
  [1536, 864],
  [1440, 1122],
  [1366, 768],
];

const browser = await chromium.launch({ channel: 'chrome' });
for (const [width, height] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#scene-relief-cover', { timeout: 90000 });
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => {
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { top: Math.round(b.top + scrollY), h: Math.round(b.height), w: Math.round(b.width), x: Math.round(b.left) };
    };
    const header = document.querySelector('header');
    const hcs = header && getComputedStyle(header);
    const sec = document.querySelector('#scene-relief-cover');
    const scs = getComputedStyle(sec);
    return {
      header: header && { ...r(header), position: hcs.position },
      section: { ...r(sec), padX: scs.paddingLeft, content: sec.clientWidth - parseFloat(scs.paddingLeft) - parseFloat(scs.paddingRight) },
      children: [...sec.children].map((c) => ({ tag: c.tagName, cls: (c.className || '').toString().slice(0, 50), ...r(c) })),
      fits: [...document.querySelectorAll('[data-lesson-viewport-fit]')].map((f) => ({ scale: f.dataset.fitScale, ...r(f) })),
      scrollW: document.documentElement.scrollWidth,
    };
  });
  console.log(`\n=== ${width}x${height}`);
  console.log(JSON.stringify({ header: info.header, section: info.section, fits: info.fits, scrollW: info.scrollW }));
  for (const c of info.children) console.log(c.tag.padEnd(8), String(c.top).padStart(5), String(c.h).padStart(5), c.w, c.x, c.cls);
  await page.close();
}
await browser.close();
