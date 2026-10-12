// QA for the 2026-10-12 sixth pass on "אליפסואיד, גיאואיד וגליות" (#scene-coordinates), at 1440 × 1122:
//
//   load      first load and reloads reach the live model; fast tab switching; leaving the sub-topic
//             and the lesson and coming back; a slow ground image (the stills + a short note meanwhile,
//             never an empty stage); a failed image, heights file or model code (the stills, a plain
//             sentence and "ניסיון נוסף", which brings the model back); a lost WebGL context (the stills,
//             then the model again once the context is back); a model remounted by the dev server
//             (Fast Refresh) stays live; no WebGL (the stills and their sentence, no retry, nothing to turn)
//   heights   in the three landscape views' opening angles the model's drawn height and the section's
//             agree (pixel extent of each figure), and the survey line is as long in both
//   ellipsoid drag, arrows and the side / top buttons move one view state; the pressed button shows a
//             check; a drag after "מהצד" goes on from there (no jump back); a click on the marked area
//             enlarges it like "הגדלת האזור"; "חזרה למבט הכללי" keeps the reader's angle
//   geoid     the new definition; the reveal names the geoid; a picked station shows H from the geoid in
//             the model and in the section, the same station in both; nothing of it outside the view
//   task      the question, the formula, the field and its actions in the left column, the readings in
//             the right one (separate grid cells, one row); the feedback right under the field; the card
//             does not change height between empty, wrong and right; A shows N as −12
//   motion    reduced motion: the reveal and its H line at once
//
// Usage: QA_BASE=http://localhost:<port> node scripts/qa/measurement-round6.mjs [outDir] [--touch <file>]
//   --touch <file>  a source file of the model to append a comment to (and restore) for the remount check —
//                   only on a server whose files are yours.
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('../../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp');
const BASE = process.env.QA_BASE || 'http://localhost:3000';
const URL = `${BASE}/lessons/topic-02/#scene-coordinates`;
const outDir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'qa-output/measurement-round6';
const touchAt = process.argv.indexOf('--touch');
const TOUCH = touchAt > 0 ? process.argv[touchAt + 1] : null;
await mkdir(outDir, { recursive: true });

const CARD = '#scene-coordinates [aria-label="שכבות החתך"]';
const STAGE = '#scene-coordinates [data-landscape]';
const ILL = '#scene-coordinates [data-land]';
const failures = [];
const notes = [];
const expect = (c, m) => c || failures.push(m);
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function open({ route, ctxOpts = {}, b = browser, wait = 'live' } = {}) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1122 }, ...ctxOpts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  if (route) await route(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(CARD, { timeout: 90000 });
  await scroll(page);
  if (wait) await page.waitForSelector(`${STAGE}[data-landscape-status="${wait}"]`, { timeout: 60000 }).catch(() => {});
  return { ctx, page, errors };
}
const scroll = (page) =>
  page.evaluate((sel) => {
    const c = document.querySelector(sel).closest('.surface-elevated');
    const header = document.querySelector('header.fixed');
    window.scrollTo(0, c.getBoundingClientRect().top + window.scrollY - (header ? header.getBoundingClientRect().bottom : 0) - 12);
  }, CARD);
const status = (page) => page.locator(STAGE).getAttribute('data-landscape-status');
const note = (page) => page.locator('#scene-coordinates [data-model-note]').textContent();
const tab = async (page, name, ms = 1300) => {
  await page.locator(`${CARD} [role="tab"]`, { hasText: name }).click();
  await page.waitForTimeout(ms);
};
const button = (page, name) => page.locator('#scene-coordinates button', { hasText: name }).first();
const ell = async (page) => (await page.locator(ILL).getAttribute('data-ell')).split(',').map(Number);
const shot = (page, name) => page.screenshot({ path: `${outDir}/${name}.png` });

// ---------------------------------------------------------------- load
{
  for (let i = 0; i < 3; i++) {
    const { ctx, page, errors } = await open();
    expect((await status(page)) === 'live', `load ${i + 1}: not live (${await status(page)})`);
    expect(errors.length === 0, `load ${i + 1}: page errors ${errors.join(' | ')}`);
    if (i === 0) {
      // fast tab switching, then back to the landscape
      for (let k = 0; k < 3; k++) for (const n of ['אליפסואיד', 'גיאואיד', 'גליות וגובה', 'פני השטח']) await tab(page, n, 90);
      await page.waitForTimeout(1500);
      expect((await status(page)) === 'live', `fast tab switching: not live (${await status(page)})`);
      // the sub-topic left and entered again, twice
      for (let k = 0; k < 2; k++) {
        await page.locator('button[aria-label="תת הנושא הבא"]').click();
        await page.waitForTimeout(1200);
        await page.locator('button[aria-label="תת הנושא הקודם"]').click();
        await page.waitForSelector(CARD, { timeout: 30000 });
        await scroll(page);
        await page.waitForSelector(`${STAGE}[data-landscape-status="live"]`, { timeout: 30000 }).catch(() => {});
        expect((await status(page)) === 'live', `sub-topic re-entered (${k + 1}): not live`);
      }
      // the lesson left (client navigation home) and entered again with the back button
      await page.evaluate(() => [...document.querySelectorAll('a[href]')].find((a) => a.getAttribute('href') === '/')?.click());
      await page.waitForTimeout(2500);
      await page.goBack();
      await page.waitForSelector(CARD, { timeout: 30000 });
      await scroll(page);
      await page.waitForSelector(`${STAGE}[data-landscape-status="live"]`, { timeout: 30000 }).catch(() => {});
      expect((await status(page)) === 'live', 'lesson left and re-entered: not live');
      // a lost context: the stills and a sentence; back to the model once the context returns
      await page.evaluate(() => {
        const gl = document.querySelector('#scene-coordinates [data-landscape] canvas').getContext('webgl2');
        window.__lc = gl.getExtension('WEBGL_lose_context');
        window.__lc.loseContext();
      });
      await page.waitForTimeout(600);
      expect((await status(page)) === 'lost', `context lost: status ${await status(page)}`);
      expect(/נקטעה/.test(await note(page)), 'context lost: no sentence under the stills');
      await shot(page, 'load-context-lost');
      await page.evaluate(() => window.__lc.restoreContext());
      await page.waitForSelector(`${STAGE}[data-landscape-status="live"]`, { timeout: 15000 }).catch(() => {});
      expect((await status(page)) === 'live', 'context restored: the model did not come back');
    }
    expect(errors.length === 0, `load ${i + 1}: page errors after the flows: ${errors.join(' | ')}`);
    await ctx.close();
  }
  // a slow ground image: the stills meanwhile, with the note after a moment, then the model
  {
    const { ctx, page } = await open({
      wait: null,
      route: (p) => p.route('**/model-albedo.webp', async (r) => {
        await new Promise((res) => setTimeout(res, 5000));
        await r.continue().catch(() => {});
      }),
    });
    await page.waitForTimeout(2500);
    const still = await page.locator(`${STAGE} img`).first().evaluate((i) => i.complete && i.naturalWidth > 0 && getComputedStyle(i).opacity === '1');
    expect((await status(page)) === 'loading', `slow image: status ${await status(page)} while it loads`);
    expect(still, 'slow image: no still shown while loading (an empty stage)');
    expect(/נטען/.test(await note(page)), 'slow image: no loading note');
    expect((await page.locator('#scene-coordinates button', { hasText: 'מבט התחלתי' }).count()) === 0, 'slow image: turning is offered over the still');
    await shot(page, 'load-slow');
    await page.waitForSelector(`${STAGE}[data-landscape-status="live"]`, { timeout: 30000 }).catch(() => {});
    expect((await status(page)) === 'live', 'slow image: never live');
    expect((await note(page)).trim() === '', 'slow image: the note stays after the model is up');
    await ctx.close();
  }
  // failures: a file or the code — the stills, a sentence and a retry that works
  for (const [what, pattern] of [
    ['image', '**/model-albedo.webp'],
    ['heights', '**/model-height.bin'],
    ['code', '**/_next/static/chunks/**'],
  ]) {
    let fail = true;
    const { ctx, page, errors } = await open({
      wait: 'failed',
      route: (p) =>
        p.route(pattern, async (r) => {
          if (!fail) return r.continue();
          if (what !== 'code') return r.abort('failed');
          // the model's own chunk (hashed in a build): known by a string only its code holds
          const resp = await r.fetch();
          const body = await resp.text();
          return body.includes('[measurement] the 3-D model stopped') ? r.abort('failed') : r.fulfill({ response: resp, body });
        }),
    });
    expect((await status(page)) === 'failed', `${what} failed: status ${await status(page)}`);
    expect((await page.locator(STAGE).getAttribute('data-landscape-failure')) === what, `${what} failed: reported as ${await page.locator(STAGE).getAttribute('data-landscape-failure')}`);
    expect(/לא ניתן לטעון/.test(await note(page)), `${what} failed: no sentence`);
    expect(errors.length === 0, `${what} failed: page errors ${errors.join(' | ')}`);
    await shot(page, `load-failed-${what}`);
    fail = false;
    await button(page, 'ניסיון נוסף').click();
    await page.waitForSelector(`${STAGE}[data-landscape-status="live"]`, { timeout: 30000 }).catch(() => {});
    expect((await status(page)) === 'live', `${what} failed: "ניסיון נוסף" did not bring the model`);
    expect((await button(page, 'ניסיון נוסף').count()) === 0, `${what}: the retry stays after the model is up`);
    await ctx.close();
  }
  // a remount by the dev server (Fast Refresh) — on your own server only
  if (TOUCH) {
    const { ctx, page } = await open();
    const src = await readFile(TOUCH, 'utf8');
    await writeFile(TOUCH, `${src}\n// qa remount probe\n`);
    await page.waitForTimeout(9000);
    await writeFile(TOUCH, src);
    await page.waitForTimeout(9000);
    expect((await status(page)) === 'live', `remounted by Fast Refresh: status ${await status(page)}`);
    await ctx.close();
  }
  // no WebGL
  {
    const nb = await chromium.launch({ channel: 'chrome', args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
    const { ctx, page } = await open({ b: nb, wait: 'no-webgl' });
    expect((await status(page)) === 'no-webgl', `no WebGL: status ${await status(page)}`);
    expect(/אינו מציג תלת־ממד/.test(await note(page)), 'no WebGL: no sentence');
    expect((await button(page, 'ניסיון נוסף').count()) === 0, 'no WebGL: a retry is offered');
    expect((await page.locator('#scene-coordinates button', { hasText: 'מבט התחלתי' }).count()) === 0, 'no WebGL: turning is offered');
    await tab(page, 'גיאואיד');
    await button(page, 'חשיפת משטחי הייחוס').click();
    await page.waitForTimeout(1500);
    expect((await page.locator('[data-geoid-label]').evaluate((e) => getComputedStyle(e).opacity)) === '1', 'no WebGL: the geoid is not named on the see-through still');
    expect((await page.locator('[data-geoid-height]').count()) === 1, 'no WebGL: no H line on the still');
    await shot(page, 'nowebgl-geoid-revealed');
    await tab(page, 'גליות וגובה');
    await page.locator('#scene-coordinates input[inputmode="decimal"]').fill('120');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    expect(/נכון/.test(await page.locator('[data-task="feedback"]').innerText()), 'no WebGL: the task does not work');
    await ctx.close();
    await nb.close();
  }
}

// ---------------------------------------------------------------- heights, ellipsoid, geoid, task
const { ctx, page, errors } = await open();
/** Drawn rows inside a box of a screenshot (pixels unlike the paper at its corner). */
async function extent(buf, b) {
  const { data, info } = await sharp(buf).extract({ left: Math.round(b.x), top: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) }).raw().toBuffer({ resolveWithObject: true });
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y++) {
    let n = 0;
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (Math.abs(data[i] - data[0]) + Math.abs(data[i + 1] - data[1]) + Math.abs(data[i + 2] - data[2]) > 40) n++;
    }
    if (n > info.width * 0.04) {
      if (top < 0) top = y;
      bottom = y;
    }
  }
  return bottom - top + 1;
}
for (const [name, label] of [['surface', 'פני השטח'], ['geoid', 'גיאואיד'], ['undulation', 'גליות וגובה']]) {
  await tab(page, label, 1600);
  const stage = await page.locator(STAGE).boundingBox();
  const section = await page.locator(`${ILL} figure`).nth(1).locator('[dir="ltr"]').first().boundingBox();
  const buf = await page.screenshot();
  const m = await extent(buf, stage);
  const s = await extent(buf, section);
  notes.push(`${name}: model ${m} px, section ${s} px`);
  // the opening (profile) view and the task's comparison view must agree; the geoid view looks in obliquely on purpose
  // (the sheets inside read as surfaces), so its top's depth adds height — reported, not judged
  if (name !== 'geoid') expect(Math.abs(m / s - 1) < 0.25, `${name}: the model (${m} px) and the section (${s} px) differ in height`);
  await shot(page, `view-${name}`);
}

// the ellipsoid
await tab(page, 'אליפסואיד');
const ellStage = page.getByRole('img', { name: /^אליפסואיד:/ });
const e0 = await ell(page);
await ellStage.focus();
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowUp');
const e1 = await ell(page);
expect(e1[0] !== e0[0] && e1[1] !== e0[1], `ellipsoid: the arrow keys do not turn it (${e0} → ${e1})`);
await button(page, 'מהצד').click();
await page.waitForTimeout(900);
let e = await ell(page);
expect(Math.abs(e[1]) < 0.5, `ellipsoid: "מהצד" is not side-on (${e})`);
expect((await button(page, 'מהצד').getAttribute('aria-pressed')) === 'true', 'ellipsoid: "מהצד" not pressed');
expect((await button(page, 'מהצד').locator('svg').count()) === 1, 'ellipsoid: the pressed button has no check');
await shot(page, 'ellipsoid-side');
// a drag goes on from here: only round, continuously
const box = await ellStage.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
const trail = [];
for (let k = 1; k <= 8; k++) {
  await page.mouse.move(box.x + box.width / 2 + k * 12, box.y + box.height / 2);
  trail.push(await ell(page));
}
await page.mouse.up();
expect(trail.every((t) => Math.abs(t[1]) < 0.5), `ellipsoid: a level drag after "מהצד" changed the tilt (${trail.map((t) => t[1])})`);
const steps = trail.slice(1).map((t, i) => t[0] - trail[i][0]);
expect(steps.every((d) => d > 0 && d < 12), `ellipsoid: the drag jumps (${steps.map((d) => d.toFixed(1))})`);
await button(page, 'מלמעלה').click();
await page.waitForTimeout(900);
e = await ell(page);
expect(Math.abs(e[1] - 90) < 0.5, `ellipsoid: "מלמעלה" is not from above (${e})`);
await shot(page, 'ellipsoid-top');
await button(page, 'מבט התחלתי').click();
await page.waitForTimeout(900);
// the marked area, clicked
const before = await ell(page);
const area = await page.locator('[data-marked-area] path').nth(1).boundingBox();
await page.mouse.click(area.x + area.width / 2, area.y + area.height / 2);
await page.waitForTimeout(1600);
expect((await page.locator(ILL).getAttribute('data-phase')) === 'linked', `ellipsoid: a click on the marked area did not enlarge it (${await page.locator(ILL).getAttribute('data-phase')})`);
await shot(page, 'ellipsoid-zoomed-by-click');
// turn while enlarged, then back: the reader's angle stays
await ellStage.focus();
await page.keyboard.press('ArrowLeft');
const turned = await ell(page);
await button(page, 'חזרה למבט הכללי').click();
await page.waitForTimeout(500);
const after = await ell(page);
expect((await page.locator(ILL).getAttribute('data-phase')) === 'identify', 'ellipsoid: "חזרה למבט הכללי" did not go back');
expect(after[0] === turned[0] && after[1] === turned[1], `ellipsoid: going back changed the angle (${turned} → ${after}, opened at ${before})`);
expect((await page.locator('#scene-coordinates').innerText()).includes('הפחיסות הוגדלה לצורך ההמחשה'), 'ellipsoid: the exaggeration note is gone');

// the geoid
await tab(page, 'גיאואיד');
const text = await page.getByRole('tabpanel', { name: 'גיאואיד' }).innerText();
expect(text.includes('הגיאואיד הוא משטח ייחוס לגובה, הקרוב לפני הים הממוצעים וממשיך מתחת ליבשות. הוא נקבע לפי שדה הכבידה.'), 'geoid: the definition is not the agreed sentence');
expect(!/עוצמת הכבידה זהה|כבידה שווה/.test(text), 'geoid: explained as equal gravity');
expect((await page.locator('[data-geoid-height]').count()) === 0, 'geoid: the H line shows on solid ground');
await button(page, 'חשיפת משטחי הייחוס').click();
await page.waitForTimeout(2600);
expect((await page.locator(STAGE).getAttribute('data-clear')) === 'true', 'geoid: not see-through');
const label = page.locator('#scene-coordinates [data-landscape] [data-geoid-label]');
expect((await label.innerText()).includes('גיאואיד — משטח הייחוס לגובה'), 'geoid: not named');
expect((await label.evaluate((el) => getComputedStyle(el).opacity)) === '1', 'geoid: its name is not shown');
expect((await page.locator('#scene-coordinates [data-landscape] [data-geoid-height]').count()) === 1, 'geoid: no H line in the model');
expect((await page.locator('#scene-coordinates [data-geoid-h]').count()) === 1, 'geoid: no H arrow in the section');
await shot(page, 'geoid-revealed-B');
// pick A on the model: the same station everywhere
await page.locator(`${STAGE} button[aria-label^="תחנה A"]`).click();
await page.waitForTimeout(800);
expect((await page.locator(`${STAGE} button[aria-label^="תחנה A"]`).getAttribute('aria-pressed')) === 'true', 'geoid: A not picked on the model');
expect((await page.locator('[role="group"][aria-label="בחירת תחנה"] button[aria-pressed="true"]').innerText()).trim() === 'A', 'geoid: the buttons do not follow');
await shot(page, 'geoid-revealed-A');
await tab(page, 'גליות וגובה');
expect((await page.locator('[data-geoid-height]').count()) === 0, 'task: the geoid view’s H line is left over the model');
await button(page, 'B').click().catch(() => {});

// the task: two columns, the feedback under the field, one height
const input = page.locator('#scene-coordinates input[inputmode="decimal"]');
await page.getByRole('group', { name: 'בחירת תחנה' }).getByRole('button', { name: /^תחנה B/ }).click();
await page.waitForTimeout(400);
const cardH = async () => Math.round((await page.locator(CARD).evaluate((t) => t.closest('.surface-elevated').getBoundingClientRect().height)));
const layout = await page.evaluate(() => {
  const r = (s) => document.querySelector(s).getBoundingClientRect();
  const readings = document.querySelector('[data-task="readings"]');
  const answer = document.querySelector('[data-task="answer"]');
  return {
    sameGrid: readings.parentElement === answer.parentElement && getComputedStyle(readings.parentElement).display === 'grid',
    readings: r('[data-task="readings"]'),
    answer: r('[data-task="answer"]'),
    field: document.querySelector('#scene-coordinates input[inputmode="decimal"]').getBoundingClientRect(),
    question: [...document.querySelectorAll('[data-task="answer"] label')].map((l) => l.textContent),
  };
});
expect(layout.sameGrid, 'task: the readings and the question are not two cells of one grid');
expect(layout.answer.right <= layout.readings.left + 1, 'task: the question is not left of the readings');
expect(Math.abs(layout.answer.top - layout.readings.top) < 4, 'task: the two columns do not start on one row');
expect(layout.question.some((q) => q.includes('מהו הגובה מעל פני הים?')), 'task: the question is not in the left column');
const h0 = await cardH();
const fieldTop0 = (await input.boundingBox()).y;
await shot(page, 'task-empty');
await input.fill('148');
await input.press('Enter');
await page.waitForTimeout(500);
const fb = await page.locator('[data-task="feedback"]').boundingBox();
const field = await input.boundingBox();
expect(fb.y >= field.y + field.height && fb.y - (field.y + field.height) < 24, 'task: the feedback is not right under the field');
expect(Math.abs((await input.boundingBox()).y - fieldTop0) < 1, 'task: the field moved when the feedback came');
const h1 = await cardH();
await shot(page, 'task-wrong');
await input.fill('120');
await input.press('Enter');
await page.waitForTimeout(500);
const h2 = await cardH();
await shot(page, 'task-correct');
notes.push(`task card height: empty ${h0}, wrong ${h1}, correct ${h2}`);
expect(h0 === h1 && h1 === h2, `task: the card changes height (${h0} / ${h1} / ${h2})`);
// A: negative N shown signed; drafts per station; the next station
await button(page, 'לתחנה הבאה').click();
await page.waitForTimeout(500);
expect((await page.locator('[data-task="readings"]').innerText()).includes('−12'), 'task: A does not show N = −12');
await input.fill('6');
await page.getByRole('group', { name: 'בחירת תחנה' }).getByRole('button', { name: /^תחנה B/ }).click();
await page.waitForTimeout(300);
expect((await input.inputValue()) === '120', 'task: B lost its answer');
await page.getByRole('group', { name: 'בחירת תחנה' }).getByRole('button', { name: /^תחנה A/ }).click();
await page.waitForTimeout(300);
expect((await input.inputValue()) === '6', 'task: A lost its draft');
// focus order in the task: the field, the check, the reset
await input.focus();
await page.keyboard.press('Tab');
expect((await page.evaluate(() => document.activeElement.textContent.trim())) === 'בדיקת תשובה', 'task: Tab from the field does not reach the check');
await page.keyboard.press('Tab');
expect((await page.evaluate(() => document.activeElement.textContent.trim())) === 'איפוס המשימה', 'task: the reset does not follow the check');
expect(errors.length === 0, `page errors: ${errors.join(' | ')}`);
await ctx.close();

// ---------------------------------------------------------------- reduced motion
{
  const { ctx: rc, page: rp } = await open({ ctxOpts: { reducedMotion: 'reduce' } });
  await tab(rp, 'גיאואיד');
  await button(rp, 'חשיפת משטחי הייחוס').click();
  await rp.waitForTimeout(120);
  expect((await rp.locator('[data-geoid-height]').count()) === 1, 'reduced motion: the H line does not come at once');
  const op = await rp.locator('#scene-coordinates [data-landscape] [data-geoid-height]').evaluate((el) => getComputedStyle(el).opacity);
  expect(Number(op) > 0.95, `reduced motion: the H line fades (${op})`);
  await shot(rp, 'reduced-motion-geoid');
  await rc.close();
}

await browser.close();
console.log(notes.join('\n'));
if (failures.length) {
  console.log(`FAIL (${failures.length})\n - ${failures.join('\n - ')}`);
  process.exit(1);
}
console.log('PASS');
