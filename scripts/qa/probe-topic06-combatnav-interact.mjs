// Focused interaction check for the topic-06 combatnav laptop fit:
// map candidate click through the scaled SVG, eye-view drag 1:1, orbit drag, model pick.
// Usage: node scripts/qa/probe-topic06-combatnav-interact.mjs <outDir> [base] [WxH]
import { chromium } from 'playwright';
const outDir = process.argv[2] ?? 'design/screenshots/topic06-combatnav-fit';
const BASE = process.argv[3] ?? 'http://localhost:3117';
const [W, H] = (process.argv[4] ?? '1366x768').split('x').map(Number);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(`${BASE}/lessons/topic-06/#scene-combatnav`, { waitUntil: 'load', timeout: 120000 });
for (let i = 0; i < 60; i++) {
  try { if (await page.evaluate(() => !!document.querySelector('#scene-combat [data-panel="map"] svg'))) break; } catch {}
  await page.waitForTimeout(1000);
}
await page.evaluate(() => {
  const el = document.querySelector('#combatnav-handrail').closest('[data-lesson-viewport-fit]');
  scrollTo(0, el.getBoundingClientRect().top + scrollY - 104 + 260);
});
await page.waitForTimeout(3000);
const out = { scale: await page.evaluate(() => document.querySelector('#combatnav-handrail').closest('[data-lesson-viewport-fit]').dataset.fitScale) };
const st = () => page.evaluate(() => { const s = window.__tn?.state; return s && { mode: s.mode, learnFeature: s.learnFeature, sel: s.selections ?? s.sel ?? null, leg: s.leg }; });
const look = () => page.evaluate(() => window.__tn?.view?.get?.());

// Orbit drag in the overview: the camera must move.
const model = page.locator('[data-activity="terrain-association"] [data-panel="model"]');
const mb = await model.boundingBox();
const camBefore = await page.evaluate(() => JSON.stringify(window.__tn?.view?.get?.()));
await page.mouse.move(mb.x + mb.width * 0.5, mb.y + mb.height * 0.5);
await page.mouse.down();
await page.mouse.move(mb.x + mb.width * 0.5 + 60, mb.y + mb.height * 0.5, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(800);
out.orbitChanged = camBefore !== (await page.evaluate(() => JSON.stringify(window.__tn?.view?.get?.())));

// Map pick in learn mode: click the centre of feature H2's checkpoint mark.
const pt = await page.evaluate(() => {
  const g = document.querySelector('[data-panel="map"] [data-checkpoint="H2"]');
  const b = g?.getBoundingClientRect();
  return b && { x: b.x + b.width / 2, y: b.y + b.height / 2 };
});
if (pt) { await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(500); }
out.mapPickLearn = (await st())?.learnFeature;

// Practice: candidate click on the map.
await page.locator('[data-activity="terrain-association"] [role="radio"]', { hasText: 'תרגול' }).click();
await page.waitForTimeout(2500);
const cands = await page.evaluate(() => [...document.querySelectorAll('[data-panel="map"] [data-candidate]')].map((g) => { const b = g.getBoundingClientRect(); return { id: g.dataset.candidate, x: b.x + b.width / 2, y: b.y + b.height / 2 }; }));
out.candidates = cands.map((c) => c.id);
if (cands[1]) { await page.mouse.click(cands[1].x, cands[1].y); await page.waitForTimeout(600); }
out.candidatePicked = { wanted: cands[1]?.id, state: (await st())?.sel };
await page.screenshot({ path: `${outDir}/interact-${W}x${H}-candidate.png` });

// Eye drag: 100 screen px → yaw change should equal (100 / scale) * hfov / panelWidth.
const m2 = await model.boundingBox();
const before = await look();
await page.mouse.move(m2.x + m2.width * 0.5, m2.y + m2.height * 0.5);
await page.mouse.down();
await page.mouse.move(m2.x + m2.width * 0.5 + 100, m2.y + m2.height * 0.5, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(600);
const after = await look();
const cw = await page.evaluate(() => document.querySelector('[data-panel="model"] [role="application"]').clientWidth);
out.eyeDrag = { yawBefore: before?.look?.yawDeg, yawAfter: after?.look?.yawDeg, hfov: before?.look?.hfovDeg, clientWidth: cw, expected: before && +((100 / Number(out.scale)) * before.look.hfovDeg / cw).toFixed(2) };
await page.screenshot({ path: `${outDir}/interact-${W}x${H}-eyedrag.png` });
console.log(JSON.stringify(out, null, 1));
await browser.close();
