// QA for the topic-02 topography scene redesign
// (docs/superpowers/plans/2026-09-28-topography-scene-redesign.md, Task 6).
//
// Usage (dev server on :3000):
//   node --experimental-strip-types scripts/qa/shot-topography.mjs [outDir] [--quick]
//
// Checks, exit code 1 on any failure:
//   fit           tablist top → card bottom ≤ 760 px at 1440 wide; at 1440×1122
//                 the whole scene is on screen; at 1440×900 the card fits once
//                 the tablist is scrolled just under the site nav
//   registration  photo view: camera projection of the summit and all six
//                 buildings vs the map sheet's neatline (sheetRect) ≤ 2 px
//   console       no page errors
// Screenshots: every state, two mid-transition frames, reduced motion.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { sheetRect } from '../../src/components/lessons/topic-02/topographyLayout.ts';
import { TOPO } from '../../src/components/lessons/topic-02/topographyTerrain.data.ts';

const outDir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'design/screenshots/topography-redesign';
const QUICK = process.argv.includes('--quick');
const URL = 'http://localhost:3000/lessons/topic-02/#scene-topography';
const NAV_OFFSET = 88;
const MAX_BLOCK = 760;
await mkdir(outDir, { recursive: true });

const failures = [];
const report = {};
const fail = (msg) => failures.push(msg);

const browser = await chromium.launch({ channel: 'chrome' });

async function open(width, height, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#scene-topography canvas', { timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes('טוען שטח תלת־ממדי'), null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  return { ctx, page, errors };
}

const tab = (page, name) => page.getByRole('tab', { name: new RegExp(name) });
const shot = (page, name) => page.screenshot({ path: `${outDir}/${name}.png` });

async function measure(page) {
  return page.evaluate(() => {
    const list = document.querySelector('#scene-topography [role="tablist"]').getBoundingClientRect();
    const card = document.querySelector('#scene-topography [role="tabpanel"]').getBoundingClientRect();
    const viewer = document.querySelector('#scene-topography [role="img"]').getBoundingClientRect();
    const next = document.querySelector('#scene-topography [aria-label="התצוגה הבאה"]').getBoundingClientRect();
    return {
      block: Math.round(card.bottom - list.top),
      cardBottom: Math.round(card.bottom),
      nextBottom: Math.round(next.bottom),
      innerHeight: window.innerHeight,
      viewer: { w: Math.round(viewer.width), h: Math.round(viewer.height) },
      hScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

async function scrollTablistUnderNav(page) {
  await page.evaluate((off) => {
    const top = document.querySelector('#scene-topography [role="tablist"]').getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - off);
  }, NAV_OFFSET);
  await page.waitForTimeout(600);
}

// ---------------------------------------------------------------- 1440 × 1122: fit + every state
{
  const { ctx, page, errors } = await open(1440, 1122);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const m = await measure(page);
  report.fit1122 = m;
  if (m.block > MAX_BLOCK) fail(`interactive block ${m.block}px > ${MAX_BLOCK}px`);
  if (m.cardBottom > m.innerHeight) fail(`1122: card bottom ${m.cardBottom} below the fold`);
  if (m.hScroll > 0) fail(`horizontal scroll ${m.hScroll}px`);
  await shot(page, '1440x1122-3d');

  await tab(page, 'תצ״א').click();
  await page.waitForTimeout(500);
  await shot(page, '1440x1122-mid-3d-to-photo');
  await page.waitForTimeout(2600);
  await shot(page, '1440x1122-photo');

  // Registration: the camera must put every building and the summit exactly
  // where the map sheet draws them.
  const probes = await page.evaluate(
    (pts) => pts.map(([x, y, h]) => window.__topoProbe?.(x, y, h) ?? null),
    [[TOPO.summit.x, TOPO.summit.y, TOPO.summit.heightM], ...TOPO.buildings.map((b) => [b.x, b.y, b.heightM])],
  );
  const r = sheetRect(m.viewer.w, m.viewer.h);
  const expect = [[TOPO.summit.x, TOPO.summit.y], ...TOPO.buildings.map((b) => [b.x, b.y])].map(([x, y]) => [
    r.x + (x / 100) * r.w,
    r.y + (y / 75) * r.h,
  ]);
  if (probes.some((p) => !p)) fail('registration probe unavailable (window.__topoProbe)');
  else {
    const err = Math.max(...probes.map((p, i) => Math.hypot(p[0] - expect[i][0], p[1] - expect[i][1])));
    report.registrationPx = +err.toFixed(2);
    if (err > 2) fail(`registration error ${err.toFixed(2)}px > 2px`);
  }

  await tab(page, 'מפה טופוגרפית').click();
  await page.waitForTimeout(600);
  await shot(page, '1440x1122-mid-photo-to-topo');
  await page.waitForTimeout(2400);
  await shot(page, '1440x1122-topo');

  if (!QUICK) {
    await page.getByRole('button', { name: 'כל התצוגות יחד' }).click();
    await page.waitForTimeout(450);
    await shot(page, '1440x1122-mid-stack');
    await page.waitForTimeout(2600);
    await shot(page, '1440x1122-stack-topo');

    // Hover linking: point at the map layer → the same spot lights up on the
    // photo and on the 3D model, with its elevation. The map slab's top face
    // sits at world y ≈ 0.0175, i.e. "height" 283.06 m in __topoProbe terms.
    const box = await page.locator('#scene-topography [role="img"]').boundingBox();
    for (const [name, x, y, want] of [
      ['summit', TOPO.summit.x - 1.2, TOPO.summit.y + 1.2, [395, 412]],
      ['sw-cluster', TOPO.guides[1].x, TOPO.guides[1].y, [295, 315]],
    ]) {
      const p = await page.evaluate(([sx, sy]) => window.__topoProbe?.(sx, sy, 283.06) ?? null, [x, y]);
      if (!p) {
        fail('probe unavailable for hover');
        break;
      }
      await page.mouse.move(box.x + p[0], box.y + p[1]);
      await page.waitForTimeout(500);
      const chip = await page.evaluate(() => {
        const el = [...document.querySelectorAll('#scene-topography span')].find((s) => /^\d{3} מ׳$/.test(s.textContent ?? '') && s.style.opacity === '1');
        return el ? el.textContent : null;
      });
      report[`hover-${name}`] = chip;
      const m = chip ? parseInt(chip, 10) : NaN;
      if (!(m >= want[0] && m <= want[1])) fail(`hover ${name}: elevation chip "${chip}" not in ${want[0]}–${want[1]}`);
      await shot(page, `1440x1122-stack-hover-${name}`);
    }
    await page.mouse.move(5, 5);

    // "All together" holds only the model and the map.
    const layerButtons = await page.locator('#scene-topography button[aria-pressed]', { hasText: /^\d\d/ }).allInnerTexts();
    report.stackLayers = layerButtons.map((t) => t.replace(/\s+/g, ' ').trim());
    if (layerButtons.length !== 2 || layerButtons.some((t) => t.includes('תצ״א'))) fail(`stack layers: ${JSON.stringify(report.stackLayers)}`);

    // Choosing a layer leaves the stack and shows just that view.
    const toggle = page.getByRole('button', { name: 'כל התצוגות יחד' });
    await page.locator('#scene-topography button[aria-pressed]', { hasText: 'מודל תלת־ממדי' }).click();
    await page.waitForTimeout(2600);
    if ((await toggle.getAttribute('aria-pressed')) !== 'false') fail('choosing the 3D layer did not leave the stack');
    if ((await tab(page, 'מודל תלת־ממדי').getAttribute('aria-selected')) !== 'true') fail('choosing the 3D layer did not select the 3D view');
    await shot(page, '1440x1122-stack-pick-3d');

    // …and so does a tab.
    await toggle.click();
    await page.waitForTimeout(1500);
    await tab(page, 'תצ״א').click();
    await page.waitForTimeout(2600);
    if ((await toggle.getAttribute('aria-pressed')) !== 'false') fail('choosing a tab did not leave the stack');
    await shot(page, '1440x1122-stack-tab-photo');
  }
  if (errors.length) fail(`console errors: ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

// ---------------------------------------------------------------- 1440 × 900: the card fits under the nav
{
  const { ctx, page, errors } = await open(1440, 900);
  await scrollTablistUnderNav(page);
  const m = await measure(page);
  report.fit900 = m;
  if (m.nextBottom > m.innerHeight) fail(`900: pager ends at ${m.nextBottom}px, below the fold (${m.innerHeight})`);
  if (m.cardBottom > m.innerHeight) fail(`900: card bottom ${m.cardBottom} below the fold`);
  await shot(page, '1440x900-3d');
  await tab(page, 'מפה טופוגרפית').click();
  await page.waitForTimeout(3200);
  await shot(page, '1440x900-topo');
  if (errors.length) fail(`console errors: ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

// ---------------------------------------------------------------- reduced motion: instant cuts
if (!QUICK) {
  const { ctx, page } = await open(1440, 1122, { reducedMotion: 'reduce' });
  await tab(page, 'מפה טופוגרפית').click();
  await page.waitForTimeout(250);
  await shot(page, '1440x1122-reduced-topo-250ms');
  await page.getByRole('button', { name: 'כל התצוגות יחד' }).click();
  await page.waitForTimeout(250);
  await shot(page, '1440x1122-reduced-stack-250ms');
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
if (failures.length) {
  console.log('FAIL\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('PASS');
