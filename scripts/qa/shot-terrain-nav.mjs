// Browser QA for the lesson-6 terrain-association activity ("ניווט לפי השטח").
//
// Usage (dev server running):
//   node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-terrain-nav.mjs [outDir] [--base=http://localhost:3001] [--capture-fallback]
//
// Checks (exit code 1 on any failure):
//   layout        model and map side by side in one workspace (model at the inline start, ≈ 60 / 40, one height),
//                 the route legend under both, the task in a column beside the map;
//                 at 1440 × 1122 with the card under the site header, the practice check button is on screen
//   copy          every approved text of both techniques is visible (nothing folded away); terrain association
//                 comes first, dead reckoning below it
//   registration  the model's labels sit on the canvas' own projection of A, כיפה 1–3 and B (≤ 2 px); the map
//                 draws the same points at worldToMap()
//   linking       a feature chosen in the list, on the map or in the model is the same id in both views
//   practice      eye-level view; no label, pin or map mark names the point being checked; a drag turns the
//                 look without moving the eye
//   flows         wrong point, partial, two hints (+ highlight), explanation, verified, four legs, summary, restart
//   keyboard      the point, the evidence, the comparison and the check — keys only
//   persistence   scrolling to the dead-reckoning part and back keeps the practice state
//   reduced       with reduced motion the walk to the next leg is a cut
//   no WebGL      the static picture rendered from this model, with the map and every action still working
//   console       no page errors
// --capture-fallback writes public/assets/lessons/topic06/terrain-nav/{overview,leg-1…4}.jpg from the live canvas.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { SQUARE_CENTER, START, WATER_TOWER } from '../../src/components/lessons/topic-06/terrain-nav/terrainNavScenario.ts';
import { worldToMap } from '../../src/components/lessons/topic-06/terrain-nav/terrainNavGeometry.ts';
import { summitOf, heightAt } from '../../src/components/lessons/topic-06/terrain-nav/terrainNavTerrain.ts';
import { LEGS } from '../../src/components/lessons/topic-06/terrain-nav/terrainNavPractice.ts';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'design/screenshots/terrain-nav';
const BASE = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3001').slice(7);
const CAPTURE = args.includes('--capture-fallback');
const URL = `${BASE}/lessons/topic-06/#scene-combatnav`;
await mkdir(outDir, { recursive: true });

const failures = [];
const fail = (m) => {
  failures.push(m);
  console.log('FAIL', m);
};
const ok = (m) => console.log('ok  ', m);
const check = (cond, m) => (cond ? ok(m) : fail(m));

// The shortened copy of 2026-10-27 (lesson-6 copy cleanup).
const APPROVED = [
  'בוחרים סימנים שאפשר לזהות במפה ובשטח',
  'השיטה מתאימה כשיש סימנים בולטים לאורך הדרך והראות מאפשרת להשוות אותם למפה.',
  'הציר עובר בשלוש כיפות ומסתיים בכיכר המרכזית בכפר (B).',
  'כיפה — צורת קרקע בולטת (תבליט)',
  'כפר — מבנים על הקרקע (תכסית)',
  'הציר — מסימן לסימן',
  'נקודת מוצא (A)',
  'היעד — הכיכר המרכזית בכפר (B)',
  'ניווט עיוור מתבסס על נקודת מוצא ידועה ועל אזימוט ומרחק שנקבעו מראש.',
  'השיטה מתאימה כשהראות מוגבלת או שיש מעט סימנים מובחנים, ובתנאי שנקודת המוצא ידועה.',
  'במפת התכנון רואים את כל הדרך, ובשטח רק כ־30 מ׳ סביבכם. ההליכה מוצגת ללא סטייה.',
];

async function open(browser, { reduced = false, name = 'main', scale = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1122 }, reducedMotion: reduced ? 'reduce' : 'no-preference', deviceScaleFactor: scale });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForSelector('[data-activity="terrain-association"]', { timeout: 150000 });
  await alignCard(page);
  await page.waitForFunction(() => !document.querySelector('[data-panel="map"] [data-loading]'), null, { timeout: 120000 });
  return { ctx, page, errors, name };
}
const alignCard = (page) => page.locator('[data-activity="terrain-association"]').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 96));
const modelReady = (page) => page.waitForFunction(() => !document.querySelector('[data-panel="model"] [data-loading]') && window.__tnProbe, null, { timeout: 120000 });
const state = (page) => page.evaluate(() => window.__tn.state);
const view = (page) => page.evaluate(() => window.__tn.view.get());
const shot = (page, file) => page.screenshot({ path: `${outDir}/${file}` });
const mode = (page, m) => page.locator('[data-mode-switch] [role="radio"]').nth(m === 'learn' ? 0 : 1).click();
const pickChoice = async (page, leg, sel) => {
  await page.locator('[data-radio="candidates"] [role="radio"]').nth(leg.candidates.indexOf(sel.candidate)).click();
  for (const id of sel.evidence) await page.locator(`[data-evidence-id="${id}"]`).click();
  if (sel.comparison) await page.locator(`[data-radio="comparison"] [data-option="${sel.comparison}"]`).click();
};
const checkBtn = (page) => page.getByRole('button', { name: 'בדיקת המיקום' });
const nextBtn = (page) => page.locator('[data-strip="practice"] button', { hasText: /המשך לקטע הדרך הבא|לסיכום הציר/ });
const feedback = async (page) => page.locator('[data-feedback]').getAttribute('data-feedback');

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  const { page, errors, ctx } = await open(browser);
  await modelReady(page);
  await page.waitForTimeout(1200);

  // ---- layout
  const model = await page.locator('[data-panel="model"]').boundingBox();
  const map = await page.locator('[data-panel="map"]').boundingBox();
  check(model.x > map.x, 'model at the inline start (right), map at the end (left)');
  // Laptop fit (2026-10-28): the map panel is the sheet alone, the route legend runs under both views
  // and the task sits in a column beside the map.
  const share = model.width / (model.width + map.width);
  check(share > 0.55 && share < 0.65, `model ≈ 60 % of the two views (the map panel is the sheet alone) (${(share * 100).toFixed(1)} %)`);
  const legendBox = await page.locator('[data-activity="terrain-association"] [data-legend="route"]').boundingBox();
  check(legendBox && legendBox.y >= map.y + map.height && legendBox.x < map.x + map.width && legendBox.x + legendBox.width > model.x, 'the route legend runs under both views');
  const taskBox = await page.locator('[data-strip]').boundingBox();
  check(taskBox && taskBox.x + taskBox.width <= map.x + 1 && taskBox.y < map.y, 'the task sits in a column beside the map (inline end)');
  check(Math.abs(model.height - map.height) < 1, 'model and map share one height');
  check(Math.abs(model.y - map.y) < 1, 'side by side');
  await shot(page, '01-learn.png');

  // ---- copy
  for (const t of APPROVED) {
    const loc = page.getByText(t, { exact: false }).first();
    check(await loc.isVisible().catch(() => false), `visible: ${t.slice(0, 38)}…`);
  }
  const terrainTop = (await page.locator('#combatnav-handrail').boundingBox()).y;
  const deadTop = (await page.locator('#combatnav-dead').boundingBox()).y;
  check(terrainTop < deadTop, 'terrain association first, dead reckoning below');
  // The only disclosures: the map key (symbols, not lesson text) and the feature list's "more" toggle (buttons, not lesson text).
  check((await page.locator('#scene-combat [aria-expanded]:not([aria-label="מקרא המפה"]):not([data-feature-more])').count()) === 0, 'no accordion in the sub-topic');

  // ---- registration (labels on the canvas' own projection) and the map's marks
  const panel = model;
  // The probe projects in the canvas' own CSS px; the lesson's laptop fit scales the card on screen.
  const fit = await page.locator('[data-panel="model"]').evaluate((el) => el.getBoundingClientRect().width / el.offsetWidth);
  const points = { A: { ...START, lift: 34 }, H1: { ...summitOf('H1'), lift: 34 }, H2: { ...summitOf('H2'), lift: 34 }, H3: { ...summitOf('H3'), lift: 34 }, B: { ...SQUARE_CENTER, lift: 34 } };
  for (const [id, p] of Object.entries(points)) {
    const [x, y] = await page.evaluate(([E, N, h]) => window.__tnProbe(E, N, h), [p.E, p.N, heightAt(p.E, p.N) + p.lift]);
    const box = await page.locator(`[data-model-label="${id}"]`).boundingBox();
    const dx = box.x - panel.x + box.width / 2 - x * fit;
    const dy = box.y - panel.y + box.height / 2 - y * fit;
    check(Math.hypot(dx, dy) <= 2, `model label ${id} on its point (${dx.toFixed(1)}, ${dy.toFixed(1)} px)`);
  }
  for (const id of ['H1', 'H2', 'H3']) {
    const s = summitOf(id);
    const m = worldToMap(s);
    const c = page.locator(`[data-checkpoint="${id}"] circle`).first();
    const cx = Number(await c.getAttribute('cx'));
    const cy = Number(await c.getAttribute('cy'));
    check(Math.abs(cx - m.x) < 0.01 && Math.abs(cy - m.y) < 0.01, `map mark ${id} at worldToMap(summit)`);
  }

  // ---- the feature list (2026-10-27 copy cleanup): the route first, the other 10 on request, from the keyboard too
  const more = page.locator('[data-feature-more]');
  check((await page.locator('[data-feature]').count()) === 5 && (await more.getAttribute('aria-expanded')) === 'false', 'list: the 5 route features first, the rest closed');
  await more.focus();
  await page.keyboard.press('Enter');
  check((await page.locator('[data-feature]').count()) === 15 && (await more.getAttribute('aria-expanded')) === 'true', 'list: Enter on the toggle opens all 15');
  check(await more.evaluate((el) => document.activeElement === el), 'list: focus stays on the toggle');
  await page.keyboard.press('Enter');
  check((await page.locator('[data-feature]').count()) === 5, 'list: Enter again closes it');
  {
    const svgEl = page.locator('[data-panel="map"] svg[data-map-mode]');
    const t = worldToMap(WATER_TOWER);
    const at = await svgEl.evaluate((el, [x, y]) => {
      const q = new DOMPoint(x, y).matrixTransform(el.getScreenCTM());
      return [q.x, q.y];
    }, [t.x, t.y]);
    await page.mouse.click(at[0], at[1]);
    await page.waitForTimeout(200);
    check((await state(page)).learnFeature === 'tower', 'map click on the water tower → tower');
    check((await page.locator('[data-feature="tower"]').getAttribute('aria-pressed').catch(() => null)) === 'true', 'a hidden feature picked on the map opens the list, pressed');
  }
  await shot(page, '01b-learn-list-open.png');

  // ---- linking: list → both views; map → both; model → both
  await page.locator('[data-feature="G1"]').click();
  check((await state(page)).learnFeature === 'G1' && (await page.locator('[data-highlight="G1"]').count()) === 1, 'list: G1 selected and highlighted on the map');
  await page.waitForTimeout(500);
  await shot(page, '02-learn-grove.png');
  const svg = page.locator('[data-panel="map"] svg[data-map-mode]');
  const h2 = worldToMap(summitOf('H2'));
  const h2Screen = await svg.evaluate((el, [x, y]) => {
    const p = new DOMPoint(x, y).matrixTransform(el.getScreenCTM());
    return [p.x, p.y];
  }, [h2.x, h2.y]);
  await page.mouse.click(h2Screen[0], h2Screen[1]);
  check((await state(page)).learnFeature === 'H2', 'map click on כיפה 2 → H2');
  check((await page.locator('[data-feature="H2"]').getAttribute('aria-pressed')) === 'true', 'the list follows the map');
  const s3 = summitOf('H3');
  const [mx, my, inFront] = await page.evaluate(([E, N, h]) => window.__tnProbe(E, N, h), [s3.E, s3.N, s3.heightM]);
  if (inFront) {
    await page.mouse.click(panel.x + mx * fit, panel.y + my * fit);
    await page.waitForTimeout(200);
    check((await state(page)).learnFeature === 'H3', 'model click on כיפה 3 → H3 (the map highlights the same id)');
    check((await page.locator('[data-highlight="H3"]').count()) === 1, 'map highlight follows the model');
  } else fail('H3 not in the opening view');

  // ---- practice: eye level, nothing gives the place away
  await mode(page, 'practice');
  await page.waitForTimeout(800);
  check((await view(page)).mode === 'eye', 'practice opens at the navigator\'s eye');
  const leg0 = LEGS[0];
  check((await page.locator(`[data-model-label="${leg0.to}"]`).count()) === 0, 'no model label at the point being checked');
  check((await page.locator(`[data-checkpoint="${leg0.to}"]`).count()) === 0, 'no map mark at the point being checked');
  check(!(await page.locator('[data-strip="practice"]').innerText()).includes('כיפה 1'), 'the task does not name כיפה 1 on leg 1');
  check((await page.locator('[data-candidate]').count()) === leg0.candidates.length, 'the leg\'s points are on the map, by letter');
  const eyeAt = (await view(page)).eyeAt;
  const yaw0 = (await view(page)).look.yawDeg;
  await page.mouse.move(panel.x + panel.width / 2, panel.y + panel.height / 2);
  await page.mouse.down();
  await page.mouse.move(panel.x + panel.width / 2 - 150, panel.y + panel.height / 2, { steps: 6 });
  await page.mouse.up();
  const v1 = await view(page);
  check(Math.abs(v1.look.yawDeg - yaw0) > 5 && v1.eyeAt.E === eyeAt.E && v1.eyeAt.N === eyeAt.N, 'a drag turns the look; the eye stays put');
  await page.locator('[data-panel="model"] [role="application"]').focus();
  await page.keyboard.press('Home');
  await alignCard(page);
  await shot(page, '03-practice-open.png');
  const checkBox = await checkBtn(page).boundingBox();
  check(checkBox && checkBox.y + checkBox.height <= 1122, 'the check button is on screen at 1440 × 1122');

  // ---- flows
  const wrong = leg0.candidates.find((c) => c !== leg0.answer);
  await pickChoice(page, leg0, { candidate: wrong, evidence: [], comparison: 'mismatch' });
  await checkBtn(page).click();
  check((await feedback(page)) === 'wrong', 'a wrong point: concrete mismatch');
  check(/נקודה [א-ת]׳/.test(await page.locator('[data-feedback]').innerText()), 'the feedback names the marked point');
  await alignCard(page);
  await shot(page, '04-wrong.png');
  await page.locator('[data-radio="candidates"] [role="radio"]').nth(leg0.candidates.indexOf(leg0.answer)).click();
  check((await feedback(page)) === 'stale', 'a changed answer: "בדקו שוב"');
  await checkBtn(page).click();
  check((await feedback(page)) === 'partial', 'the right point alone: no full credit');
  const falseId = leg0.evidence.find((e) => !leg0.correctEvidence.includes(e.id)).id;
  await page.locator(`[data-evidence-id="${falseId}"]`).click();
  await checkBtn(page).click();
  check((await feedback(page)) === 'partial' && (await page.locator(`[data-evidence-id="${falseId}"][data-wrong]`).count()) === 1, 'a false statement is marked ✕ in the list; the feedback says why');
  await alignCard(page);
  await shot(page, '05-partial.png');
  await page.locator(`[data-evidence-id="${falseId}"]`).click();
  await page.locator('[data-strip="practice"] button', { hasText: 'רמז' }).first().click();
  check((await state(page)).hint === 1 && (await page.locator('[data-hint="1"]').count()) === 1, 'first hint: the kind of evidence');
  await page.locator('[data-strip="practice"] button', { hasText: 'רמז' }).first().click();
  check((await page.locator(`[data-highlight="${leg0.hint2.feature}"]`).count()) === 1, 'second hint: the feature lit on the map (and in the model)');
  await shot(page, '06-hint2.png');
  for (const id of leg0.correctEvidence) await page.locator(`[data-evidence-id="${id}"]`).click();
  await page.locator('[data-radio="comparison"] [data-option="match"]').click();
  await checkBtn(page).click();
  check((await feedback(page)) === 'verified', 'point, two pieces of evidence and the comparison: verified');
  check((await page.locator(`[data-model-label="${leg0.to}"]`).count()) === 0, 'no marker underfoot once verified (only the map names it)');
  await page.waitForTimeout(400);
  await alignCard(page);
  await shot(page, '07-verified.png');
  await nextBtn(page).click();
  await page.waitForTimeout(2200);
  const s2 = await state(page);
  check(s2.leg === 1 && s2.outcomes[0] === 'verified', 'on to leg 2');
  check((await page.locator('[data-checkpoint="H1"]').count()) === 1, 'the verified point is now named on the map');
  await shot(page, '08-leg2.png');
  check(await page.getByRole('button', { name: 'הצגת הסבר' }).isDisabled(), 'no explanation before a first check: moving on takes a decision');
  await checkBtn(page).click();
  check((await feedback(page)) === 'missing', 'an empty check asks for a point');
  await page.getByRole('button', { name: 'הצגת הסבר' }).click();
  check((await feedback(page)) === 'explained', 'הצגת הסבר shows the answer and says so');
  await shot(page, '09-explained.png');
  await nextBtn(page).click();
  await page.waitForTimeout(2200);

  // ---- keyboard only (leg 3)
  const leg2 = LEGS[2];
  const radios = page.locator('[data-radio="candidates"] [role="radio"]');
  await radios.first().focus();
  const target = leg2.candidates.indexOf(leg2.answer);
  for (let k = 0; k < target; k++) await page.keyboard.press('ArrowLeft');
  check((await state(page)).sel.candidate === leg2.answer, 'keys: arrows choose the point');
  for (const id of leg2.correctEvidence) {
    await page.locator(`[data-evidence-id="${id}"]`).focus();
    await page.keyboard.press('Space');
  }
  await page.locator('[data-radio="comparison"] [data-option="match"]').focus();
  await page.keyboard.press('Space');
  await checkBtn(page).focus();
  await page.keyboard.press('Enter');
  check((await feedback(page)) === 'verified', 'keys: evidence, comparison and check');

  // ---- persistence across scrolling
  await page.locator('#combatnav-dead').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await alignCard(page);
  const s3b = await state(page);
  check(s3b.leg === 2 && s3b.outcomes[2] === 'verified', 'scrolling to the dead-reckoning part keeps the progress');
  await nextBtn(page).click();
  await page.waitForTimeout(2200);
  const leg3 = LEGS[3];
  await pickChoice(page, leg3, { candidate: leg3.answer, evidence: [...leg3.correctEvidence], comparison: 'match' });
  await alignCard(page);
  await shot(page, '10-leg4-square.png');
  await checkBtn(page).click();
  check((await feedback(page)) === 'verified', 'leg 4: the square (B), not just "the village"');
  await nextBtn(page).click();
  await page.waitForTimeout(800);
  check((await page.locator('[data-strip="summary"]').count()) === 1, 'summary after the four legs');
  await alignCard(page);
  await shot(page, '11-summary.png');
  await page.locator('#combatnav-handrail').getByRole('button', { name: 'התחלה מחדש' }).click();
  const s4 = await state(page);
  check(s4.leg === 0 && s4.outcomes.every((o) => o === null), 'restart: back to leg 1, progress cleared');

  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await ctx.close();

  // ---- fallback pictures from the live canvas (2×, overlays and labels hidden)
  if (CAPTURE) {
    const c = await open(browser, { scale: 2, name: 'capture' });
    await modelReady(c.page);
    await mkdir('public/assets/lessons/topic06/terrain-nav', { recursive: true });
    await c.page.addStyleTag({ content: '[data-panel="model"] [data-overlay], [data-panel="model"] [role="application"], [data-model-label] { visibility: hidden !important; }' });
    await c.page.waitForTimeout(1500);
    const model = c.page.locator('[data-panel="model"]');
    await model.screenshot({ path: 'public/assets/lessons/topic06/terrain-nav/overview.jpg', type: 'jpeg', quality: 82 });
    await mode(c.page, 'practice');
    for (let k = 0; k < LEGS.length; k++) {
      await c.page.waitForTimeout(k ? 2400 : 1500);
      await model.screenshot({ path: `public/assets/lessons/topic06/terrain-nav/leg-${k + 1}.jpg`, type: 'jpeg', quality: 82 });
      if (k < LEGS.length - 1) {
        await checkBtn(c.page).click();
        await c.page.getByRole('button', { name: 'הצגת הסבר' }).click();
        await nextBtn(c.page).click();
      }
    }
    ok('fallback pictures written');
    await c.ctx.close();
  }

  // ---- reduced motion: the walk is a cut
  {
    const r = await open(browser, { reduced: true });
    await modelReady(r.page);
    await mode(r.page, 'practice');
    await checkBtn(r.page).click();
    await r.page.getByRole('button', { name: 'הצגת הסבר' }).click();
    await nextBtn(r.page).click();
    await r.page.waitForTimeout(150);
    check((await view(r.page)).walk === null, 'reduced motion: the walk to the next leg is a cut');
    await r.ctx.close();
  }
} finally {
  await browser.close();
}

// ---- no WebGL: the static picture, the map and the actions
{
  const b = await chromium.launch({ args: ['--disable-3d-apis', '--disable-gpu'] });
  try {
    const r = await open(b, { name: 'nogl' });
    await r.page.waitForSelector('[data-panel="model"][data-renderer="static"]', { timeout: 30000 });
    const img = r.page.locator('[data-panel="model"] img[data-fallback]');
    check(await img.isVisible(), 'no WebGL: the static picture of the model');
    await r.page.waitForFunction(() => {
      const i = document.querySelector('[data-panel="model"] img[data-fallback]');
      return i && i.complete;
    });
    check((await img.evaluate((i) => i.naturalWidth)) > 0, 'no WebGL: the picture loads');
    await mode(r.page, 'practice');
    const leg = LEGS[0];
    await pickChoice(r.page, leg, { candidate: leg.answer, evidence: [...leg.correctEvidence], comparison: 'match' });
    await checkBtn(r.page).click();
    check((await feedback(r.page)) === 'verified', 'no WebGL: the practice still works');
    await shot(r.page, '12-no-webgl.png');
    await r.ctx.close();
  } finally {
    await b.close();
  }
}

console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
