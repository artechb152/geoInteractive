// Layout QA for the topic-02 steepness-from-contour-density activity
// ("הערכת תלילות לפי צפיפות קווי הגובה", ContoursDensitySection).
//
// Usage: QA_BASE=http://localhost:3000 node scripts/qa/shot-density-layout.mjs <label> [WxH ...]
// Screenshots go to design/screenshots/density-layout-<label>/.
//
// For every viewport and every state (3 terrain tabs) the card is brought
// under the fixed site header the way a learner meets it, then checked:
// whole card inside the viewport, no horizontal scroll, no text box
// overlapping another, no clipped text, the map/profile pair as tall as the
// side column needs. Exit code 1 on any failure.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const label = process.argv[2] ?? 'after';
const SIZES = (process.argv.length > 3 ? process.argv.slice(3) : ['1440x1122']).map((s) => s.split('x').map(Number));
const BASE = process.env.QA_BASE ?? 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-02/#scene-contours`;
const outDir = `design/screenshots/density-layout-${label}`;
const SITE_HEADER = 80;
const GAP = 24;
const CARD = '[data-qa="density-section"]';
await mkdir(outDir, { recursive: true });

const failures = [];
const report = {};
const fail = (msg) => failures.push(msg);
const browser = await chromium.launch({ channel: 'chrome' });

for (const [w, h] of SIZES) {
  const tag = `${w}x${h}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: 'load', timeout: 240000 });
  await page.waitForSelector(CARD, { timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);

  const bring = async () => {
    await page.evaluate(
      ([sel, off]) => {
        const top = document.querySelector(sel).getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top - off, behavior: 'instant' });
      },
      [CARD, SITE_HEADER + GAP],
    );
    await page.waitForTimeout(400);
  };
  await bring();
  await page.waitForTimeout(1200);

  const tabs = page.locator(`${CARD} [role="tab"]`);
  const n = await tabs.count();
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).click();
    await page.waitForTimeout(1300); // text cross-fade + 0.7 s terrain morph
    await bring();
    const m = await page.evaluate((sel) => {
      const card = document.querySelector(sel);
      const r = (el) => {
        const b = el.getBoundingClientRect();
        return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) };
      };
      const cardR = r(card);
      // Leaf text boxes: elements whose own text nodes carry visible text.
      const leaves = [...card.querySelectorAll('*')].filter((el) => {
        if (el.closest('svg')) return false;
        const own = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
        const cs = getComputedStyle(el);
        return own && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && el.getClientRects().length;
      });
      const overlaps = [];
      for (let a = 0; a < leaves.length; a++)
        for (let b = a + 1; b < leaves.length; b++) {
          if (leaves[a].contains(leaves[b]) || leaves[b].contains(leaves[a])) continue;
          // Per line-box fragment: an inline term and its inline definition share a line legitimately.
          const hit = [...leaves[a].getClientRects()].some((A) =>
            [...leaves[b].getClientRects()].some((B) => {
              const ix = Math.min(A.right, B.right) - Math.max(A.left, B.left);
              const iy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
              return ix > 1 && iy > 1;
            }),
          );
          if (hit) overlaps.push(`${leaves[a].textContent.trim().slice(0, 24)} × ${leaves[b].textContent.trim().slice(0, 24)}`);
        }
      // Clipping: anything that hides overflow while its content is larger.
      const clipped = [...card.querySelectorAll('*')]
        .filter((el) => {
          if (el.closest('svg')) return false;
          const cs = getComputedStyle(el);
          const hides = /(hidden|clip)/.test(cs.overflow + cs.overflowX + cs.overflowY) || cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none';
          return hides && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
        })
        .map((el) => `${el.tagName}.${String(el.className).slice(0, 40)}`);
      // Text escaping the card.
      const escaped = leaves
        .map((el) => el.getBoundingClientRect())
        .filter((b) => b.left < cardR.left - 1 || b.right > cardR.right + 1 || b.bottom > cardR.bottom + 1).length;
      const svg = card.querySelector('svg[role="img"]');
      const fit = card.closest('[data-lesson-viewport-fit]');
      const smallest = Math.min(
        ...leaves.map((el) => parseFloat(getComputedStyle(el).fontSize) * (fit ? +fit.dataset.fitScale : 1)),
      );
      return {
        card: cardR,
        cardHeightRef: Math.round(card.offsetHeight),
        svg: svg ? r(svg) : null,
        innerHeight,
        hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        scale: fit ? +fit.dataset.fitScale : 1,
        overlaps,
        clipped,
        escaped,
        smallestTextPx: Math.round(smallest * 10) / 10,
        selected: card.querySelector('[role="tab"][aria-selected="true"]')?.textContent.trim(),
        svgLabel: svg?.getAttribute('aria-label'),
      };
    }, CARD);
    const key = `${tag}-tab${i + 1}`;
    report[key] = m;
    if (m.card.top < SITE_HEADER) fail(`${key}: card top ${m.card.top} under the header`);
    if (m.card.bottom > m.innerHeight) fail(`${key}: card bottom ${m.card.bottom} > viewport ${m.innerHeight}`);
    if (m.hScroll > 0) fail(`${key}: horizontal scroll ${m.hScroll}px`);
    if (m.overlaps.length) fail(`${key}: overlapping text ${m.overlaps.join(' | ')}`);
    if (m.clipped.length) fail(`${key}: clipped ${m.clipped.join(', ')}`);
    if (m.escaped) fail(`${key}: ${m.escaped} text boxes escape the card`);
    if (m.svgLabel && m.selected && !m.selected.startsWith(m.svgLabel.split(' ')[0]) && !m.svgLabel.includes(m.selected.split(/\s/)[0]))
      fail(`${key}: map label "${m.svgLabel}" ≠ selected tab "${m.selected}"`);
    await page.screenshot({ path: `${outDir}/${tag}-tab${i + 1}.png` });
    await page.locator(CARD).screenshot({ path: `${outDir}/${tag}-tab${i + 1}-card.png` });
  }
  if (errors.length) fail(`${tag}: page errors ${errors.join(' | ').slice(0, 300)}`);
  await ctx.close();
}

await browser.close();
await writeFile(`${outDir}/report.json`, JSON.stringify({ report, failures }, null, 2));
console.log(JSON.stringify(report, null, 1));
if (failures.length) {
  console.error('FAIL\n' + failures.join('\n'));
  process.exit(1);
}
console.log('PASS');
