// QA probe for the topic-06 "טכניקות ניווט" (combatnav) laptop fit.
// Usage: node scripts/qa/probe-topic06-combatnav-fit.mjs <outDir> <tag> [base] [--sizes=1920x1080,1366x768] [--interact]
//   Measures every block of the sub-topic, screenshots each screen scrolled
//   under the site header, and the full page. --interact also drives the
//   terrain lab (feature pick from the list and in the 3D model, practice
//   mode) and the dead-reckoning replay.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const INTERACT = process.argv.includes('--interact');
const sizesArg = process.argv.find((a) => a.startsWith('--sizes='));
const outDir = args[0] ?? 'design/screenshots/topic06-combatnav-fit';
const tag = args[1] ?? 'probe';
const BASE = args[2] ?? 'http://localhost:3117';
const VIEWPORTS = sizesArg
  ? sizesArg.slice(8).split(',').map((s) => s.split('x').map(Number))
  : [
      [1920, 1080],
      [1536, 864],
      [1440, 1122],
      [1366, 768],
    ];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];

const probe = (page) =>
  page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom + scrollY) };
    };
    const section = document.getElementById('scene-combat');
    const terrain = document.getElementById('combatnav-handrail');
    const dead = document.getElementById('combatnav-dead');
    const lab = section?.querySelector('[data-activity="terrain-association"]');
    const nav = section?.querySelector('nav');
    const next = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'תת הנושא הבא');
    const canvas = lab?.querySelector('canvas');
    const board = dead?.querySelector('[role="group"]');
    const overflowing = [...(section?.querySelectorAll('*') ?? [])]
      .filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'hidden' && el.clientWidth > 0)
      .slice(0, 6)
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 40)} ${el.scrollWidth}>${el.clientWidth}`);
    return {
      vw: innerWidth,
      vh: innerHeight,
      siteHeader: r(document.querySelector('body header')),
      docH: document.documentElement.scrollHeight,
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      fits: [...(section?.querySelectorAll('[data-lesson-viewport-fit]') ?? [])].map((el) => ({ screen: el.getAttribute('data-combatnav-screen'), scale: el.getAttribute('data-fit-scale'), rect: r(el) })),
      section: r(section),
      sceneHeader: r(section?.querySelector('header')),
      terms: r(section?.querySelector('.grid')),
      nav: r(nav),
      terrain: r(terrain),
      terrainTitle: r(terrain?.querySelector('h3')),
      lab: r(lab),
      model: r(lab?.querySelector('[data-panel="model"]')),
      map: r(lab?.querySelector('[data-panel="map"]')),
      canvas: canvas ? { css: r(canvas), px: [canvas.width, canvas.height] } : null,
      terrainCards: r(terrain?.lastElementChild),
      dead: r(dead),
      board: r(board),
      conclusion: r(section?.lastElementChild),
      next: r(next),
      overflowing,
    };
  });

/** Scroll so the element's top sits 24px under the site header. */
const scrollToEl = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const hh = document.querySelector('body header')?.getBoundingClientRect().height ?? 0;
    const y = el.getBoundingClientRect().top + scrollY - hh - 24;
    scrollTo(0, y);
    return Math.round(y);
  }, selector);

const report = {};
async function runViewport(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errors.push(`${w}x${h} ${e}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${w}x${h} ${m.text()}`);
  });
  await page.goto(`${BASE}/lessons/topic-06/#scene-combatnav`, { waitUntil: 'load', timeout: 120000 });
  // Other sessions' edits can trigger a Fast Refresh full reload: poll until the scene is up.
  for (let i = 0; i < 60; i++) {
    try {
      if (await page.evaluate(() => !!document.querySelector('#scene-combat [data-panel="map"] svg'))) break;
    } catch {}
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(3000);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(400);
  const key = `${w}x${h}`;
  report[key] = { initial: await probe(page) };
  await page.screenshot({ path: `${outDir}/${tag}-${key}-screen1.png` });

  const fitSel = (i, fallback) => `#scene-combat [data-combatnav-screen="${i}"], ${fallback}`;
  const screens = [
    ['screen2', fitSel('terrain', '#combatnav-handrail')],
    ['screen3', fitSel('dead', '#combatnav-dead')],
  ];
  for (const [name, sel] of screens) {
    const first = await page.evaluate((s) => document.querySelector(s.split(', ')[0]) ? s.split(', ')[0] : s.split(', ')[1], sel);
    report[key][name] = { scrolledTo: await scrollToEl(page, first) };
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${outDir}/${tag}-${key}-${name}.png` });
  }
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/${tag}-${key}-end.png` });
  report[key].afterScroll = await probe(page);
  await page.screenshot({ path: `${outDir}/${tag}-${key}-full.png`, fullPage: true, timeout: 180000 });

  if (INTERACT) {
    const it = {};
    const first = (await page.$('#scene-combat [data-combatnav-screen="terrain"]')) ? '#scene-combat [data-combatnav-screen="terrain"]' : '#combatnav-handrail';
    await scrollToEl(page, first);
    await page.waitForTimeout(800);
    // 1 · learn: pick a feature from the list
    const listBtn = page.locator('[data-activity="terrain-association"] button', { hasText: 'כיפה 2' }).first();
    if (await listBtn.count()) {
      await listBtn.click();
      await page.waitForTimeout(500);
      it.learnFeature = await page.evaluate(() => window.__tn?.state?.learnFeature ?? null);
    }
    // 2 · learn: the map's screen CTM must include the CSS scale (ctmA tracks rectOverViewBox)
    it.mapClick = await page.evaluate(() => {
      const svg = document.querySelector('[data-activity="terrain-association"] [data-panel="map"] svg');
      if (!svg) return 'no-svg';
      const ctm = svg.getScreenCTM();
      const b = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      return { ctmA: +ctm.a.toFixed(4), rectOverViewBox: +(b.width / vb.width).toFixed(4) };
    });
    await page.screenshot({ path: `${outDir}/${tag}-${key}-learn-pick.png` });
    // 3 · model: a click in the 3D view picks the ground under it
    const model = page.locator('[data-activity="terrain-association"] [data-panel="model"]');
    const mb = await model.boundingBox();
    if (mb) {
      await page.mouse.click(mb.x + mb.width * 0.5, mb.y + mb.height * 0.55);
      await page.waitForTimeout(700);
      it.modelPick = await page.evaluate(() => window.__tn?.state?.learnFeature ?? null);
    }
    // 4 · practice mode, then a candidate pick
    await page.locator('[data-activity="terrain-association"] [role="radio"]', { hasText: 'תרגול' }).click();
    await page.waitForTimeout(1500);
    it.mode = await page.evaluate(() => window.__tn?.state?.mode);
    await page.screenshot({ path: `${outDir}/${tag}-${key}-practice.png` });
    // (Map candidate picks and the eye drag are checked by probe-topic06-combatnav-interact.mjs.)
    report[key].practice = await probe(page);
    // 5 · dead reckoning replay
    const deadSel = (await page.$('#scene-combat [data-combatnav-screen="dead"]')) ? '#scene-combat [data-combatnav-screen="dead"]' : '#combatnav-dead';
    await scrollToEl(page, deadSel);
    await page.waitForTimeout(9500);
    await page.screenshot({ path: `${outDir}/${tag}-${key}-dead-done.png` });
    await page.locator('button[aria-label="הפעלה חוזרת של ההדגמה"]').click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${outDir}/${tag}-${key}-dead-replay.png` });
    it.paceAfterReplay = await page.evaluate(() => document.querySelector('#combatnav-dead svg text[direction="ltr"] tspan')?.textContent);
    report[key].interact = it;
  }
  await page.close();
}

// Another session's edit can Fast-Refresh the dev page mid-run: retry the viewport.
for (const [w, h] of VIEWPORTS) {
  for (let attempt = 1; ; attempt++) {
    try {
      await runViewport(w, h);
      break;
    } catch (e) {
      if (attempt >= 4) throw e;
      console.error(`retry ${w}x${h} (${String(e).split('\n')[0]})`);
      for (const p of browser.contexts().flatMap((c) => c.pages())) await p.close().catch(() => {});
    }
  }
}
console.log(JSON.stringify(report, null, 1));
if (errors.length) console.log('ERRORS', errors.slice(0, 12));
await browser.close();
