// Geometry probe for the topic-02 contours scene (#scene-contours).
//
// Usage: QA_PORT=3137 node scripts/qa/measure-contours-fit.mjs [WxH ...]
// Prints, per viewport: the site header, the scene column, both learning
// screens (3D model + map card, density section) and the prev/next row.
import { chromium } from 'playwright';

const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-contours`;
const sizes = (process.argv.slice(2).length ? process.argv.slice(2) : ['1920x1080']).map((s) => s.split('x').map(Number));
const browser = await chromium.launch({ channel: 'chrome' });

for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load', timeout: 240000 });
  await page.waitForSelector('#scene-contours [data-qa="density-section"]', { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const m = await page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY), left: Math.round(b.left), width: Math.round(b.width), height: Math.round(b.height) };
    };
    const scene = document.querySelector('#scene-contours');
    const cs = getComputedStyle(scene);
    const header = document.querySelector('header');
    const fits = [...scene.querySelectorAll('[data-lesson-viewport-fit]')].map((f) => ({ scale: f.dataset.fitScale, box: r(f) }));
    const nextBtn = document.querySelector('[aria-label="תת הנושא הבא"]');
    return {
      siteHeader: r(header),
      siteHeaderPos: header && getComputedStyle(header).position,
      scene: r(scene),
      scenePadding: [cs.paddingTop, cs.paddingInlineStart, cs.paddingBottom],
      sceneContentWidth: scene.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      sceneHeader: r(scene.querySelector(':scope header, :scope > * header')),
      card: r(scene.querySelector('.surface-elevated')),
      h3: r(scene.querySelector('h3')),
      density: r(scene.querySelector('[data-qa="density-section"]')),
      nextRow: r(nextBtn?.parentElement?.parentElement ?? null),
      fits,
      docHeight: document.documentElement.scrollHeight,
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  console.log(`${w}x${h}`, JSON.stringify(m, null, 1));
  await ctx.close();
}
await browser.close();
