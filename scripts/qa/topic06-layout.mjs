// Layout QA for lesson 6 — one frame and one interface size for every activity, with lesson 2 as the
// reference (interaction widths, 2026-10-27).
//
// Usage (dev server running):
//   node scripts/qa/topic06-layout.mjs [outDir] [--base=http://localhost:3000] [--no-shots]
//
// Checks at 1440 × 1122 (exit code 1 on any failure):
//   reference  lesson 2's fit scale and column edges, measured in the same run
//   frame      every LessonViewportFit of lesson 6 has that scale, a 1344px reference width and the same
//              edges; none is nested in another; no lesson-6 text sits outside a fit (the hook and the recap
//              aside, as in lesson 2)
//   cards      every activity card spans the column edges, has 32px reference padding and lesson 2's title
//              tier (text-2xl sm:text-3xl → 30px reference), measured after the fit's scale
//   type       visual size of every title, body text and button after the scale (reported per card)
//   states     each activity aligned under the site header (y = 96) still ends above 1122 in its tallest
//              states: every onboarding stage, every example, every tip, every answer of the tips question
//              and its reset, the compass slider ends, every north, every route stop, every pace length
//              (terrain navigation, blind navigation and the location check have their own sweeps:
//              shot-dead-reckoning.mjs, shot-location-check.mjs)
//   console    no page errors
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--')) ?? 'design/screenshots/topic06-layout';
const BASE = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:3000').slice(7);
const SHOTS = !args.includes('--no-shots');
await mkdir(outDir, { recursive: true });

const failures = [];
const fail = (m) => {
  failures.push(m);
  console.log('FAIL', m);
};
const ok = (m) => console.log('ok  ', m);
const check = (cond, m) => (cond ? ok(m) : fail(m));
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const HEADER_GAP_TOP = 96; // site header (80) + 16px of air
const VIEW_H = 1122;

/** Lesson-6 activity cards, by sub-topic. `pad`: reference padding (px); `title`: reference size of the card title. */
const CARDS = {
  onboarding: [
    { name: 'four stages', sel: '[data-activity="nav-stages"]', pad: 32, title: null },
    { name: 'historical examples', sel: '#scene-onboarding .shadow-pine-card', pad: 32, title: 30 },
  ],
  tips: [
    { name: 'tips · before leaving', sel: '[data-tips-screen="plan"]', pad: 32, title: 30 },
    { name: 'tips · while navigating', sel: '[data-tips-screen="nav"]', pad: 32, title: 30 },
    { name: 'tips · application question', sel: '[data-activity="tips-question"]', pad: 32, title: 30 },
  ],
  combatnav: [
    { name: 'terrain navigation', sel: '[data-activity="terrain-association"]', pad: 32, title: 30 },
    { name: 'blind navigation', sel: '[data-activity="dead-reckoning"]', pad: 32, title: 30 },
  ],
  principles: [
    { name: 'compass and map', sel: '[data-activity="compass-map"]', pad: 32, title: 30 },
    { name: 'north types', sel: '[data-activity="north-lab"]', pad: 32, title: 30 },
    { name: 'location check', sel: '[data-activity="location-check"]', pad: 32, title: 30 },
  ],
  planning: [
    { name: 'route story', sel: '[data-qa="route-builder"]', pad: 32, title: 30 },
    { name: 'step counting', sel: '[data-qa="pacing"]', pad: 32, title: 30 },
  ],
};
const SECTION = { onboarding: 'scene-onboarding', tips: 'scene-tips', combatnav: 'scene-combat', principles: 'scene-principles', planning: 'scene-planning' };

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: VIEW_H } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

async function openScene(topic, id, sectionId) {
  await page.goto('about:blank');
  await page.goto(`${BASE}/lessons/${topic}/#scene-${id}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForSelector(`#${sectionId}`, { timeout: 150000 });
  await page.waitForTimeout(1500);
  // walk the scene once so whileInView content mounts, then back to the top
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 450) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(90);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(400);
}

const align = (sel) =>
  page.evaluate(
    ([s, top]) => window.scrollTo({ top: document.querySelector(s).getBoundingClientRect().top + window.scrollY - top, behavior: 'instant' }),
    [sel, HEADER_GAP_TOP],
  );
async function fitsOnScreen(sel, label, file) {
  await align(sel);
  await page.waitForTimeout(380);
  const box = await page.evaluate((s) => {
    const b = document.querySelector(s).getBoundingClientRect();
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), x: Math.round(b.x), r: Math.round(b.right) };
  }, sel);
  check(box.top >= 80 && box.bottom <= VIEW_H, `state · ${label}: card ${box.top}–${box.bottom} px, x ${box.x}–${box.r} (inside 80–${VIEW_H})`);
  if (SHOTS && file) await page.screenshot({ path: `${outDir}/${file}` });
  return box;
}

const measureSection = (sectionId) =>
  page.evaluate((sid) => {
    const section = document.getElementById(sid);
    const R = (el) => {
      const b = el.getBoundingClientRect();
      return { x: +b.x.toFixed(1), r: +b.right.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
    };
    const fits = [...section.querySelectorAll('[data-lesson-viewport-fit]')].map((fit) => {
      const inner = fit.firstElementChild?.firstElementChild;
      return {
        scale: +fit.getAttribute('data-fit-scale'),
        refW: inner ? parseFloat(inner.style.width) : null,
        nested: !!fit.parentElement?.closest('[data-lesson-viewport-fit]'),
        rect: R(fit),
      };
    });
    const unfitted = [...section.querySelectorAll('h1,h2,h3,h4,p,li,button,label')]
      .filter((e) => e.offsetParent && !e.closest('[data-lesson-viewport-fit]') && (e.textContent || '').trim().length > 1)
      .map((e) => `${e.tagName} "${(e.textContent || '').trim().slice(0, 36)}" ${getComputedStyle(e).fontSize}`);
    return { fits, unfitted };
  }, sectionId);

const measureCard = (sel) =>
  page.evaluate((s) => {
    const card = document.querySelector(s);
    if (!card) return null;
    const b = card.getBoundingClientRect();
    const scale = b.width / card.offsetWidth;
    const cs = getComputedStyle(card);
    const vis = (el) => +(parseFloat(getComputedStyle(el).fontSize) * scale).toFixed(1);
    const shown = (el) => el.offsetParent && (el.textContent || '').trim().length > 1;
    const title = [...card.querySelectorAll('h2,h3')].find(shown);
    // every text-bearing leaf, grouped by visual size
    const sizes = {};
    for (const el of card.querySelectorAll('p,li,span,div,button,label,h3,h4,strong,a,dt,dd,th,td')) {
      if (!shown(el)) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (!own) continue;
      const v = vis(el);
      sizes[v] = (sizes[v] ?? 0) + 1;
    }
    // an extra scale inside the card: an element whose layout box is shrunk relative to the card's scale
    const extra = [];
    for (const el of card.querySelectorAll('div,section')) {
      if (!el.offsetWidth || el.offsetWidth < 60 || el.closest('svg,canvas')) continue;
      const t = getComputedStyle(el).transform;
      if (t && t !== 'none') {
        const m = t.match(/matrix\(([^,]+),/);
        if (m && Math.abs(parseFloat(m[1]) - 1) > 0.02) extra.push(`${el.className.toString().slice(0, 40)} ${t.slice(0, 40)}`);
      }
    }
    return {
      rect: { x: +b.x.toFixed(1), r: +b.right.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) },
      scale: +scale.toFixed(4),
      pad: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].map((k) => +(parseFloat(cs[k]) * scale).toFixed(1)),
      title: title ? { vis: vis(title), text: title.textContent.trim().slice(0, 40) } : null,
      sizes,
      extra: extra.slice(0, 5),
      nestedFit: !!card.querySelector('[data-lesson-viewport-fit]'),
    };
  }, sel);

const report = { reference: null, scenes: {} };
try {
  // ---------------------------------------------------------------- reference: lesson 2
  await openScene('topic-02', 'landforms', 'scene-landforms');
  const l2 = await measureSection('scene-landforms');
  const S = l2.fits[0].scale;
  const EDGE = { x: l2.fits[0].rect.x, r: l2.fits[0].rect.r };
  const l2card = await measureCard('[data-qa="slope-analyzer"]');
  report.reference = { scale: S, edges: EDGE, slopeCard: l2card };
  ok(`reference (lesson 2 · landforms): scale ${S}, column ${EDGE.x}–${EDGE.r}, card padding ${l2card.pad[0]} px, title ${l2card.title?.vis} px`);

  // ---------------------------------------------------------------- lesson 6
  for (const [scene, sid] of Object.entries(SECTION)) {
    await openScene('topic-06', scene, sid);
    const sec = await measureSection(sid);
    report.scenes[scene] = { fits: sec.fits, unfitted: sec.unfitted, cards: {} };
    sec.fits.forEach((f, i) => {
      check(near(f.scale, S, 0.0006) && f.refW === 1344 && !f.nested, `${scene} · fit ${i + 1}: scale ${f.scale}, reference width ${f.refW}${f.nested ? ', NESTED' : ''}`);
      check(near(f.rect.x, EDGE.x, 1) && near(f.rect.r, EDGE.r, 1), `${scene} · fit ${i + 1}: edges ${f.rect.x}–${f.rect.r}`);
    });
    check(sec.unfitted.length === 0, `${scene}: no text outside a fit${sec.unfitted.length ? `: ${sec.unfitted.join(' | ')}` : ''}`);

    for (const c of CARDS[scene]) {
      const m = await measureCard(c.sel);
      if (!m) {
        fail(`${c.name}: card ${c.sel} not found`);
        continue;
      }
      report.scenes[scene].cards[c.name] = m;
      check(near(m.rect.x, EDGE.x, 1) && near(m.rect.r, EDGE.r, 1), `${c.name}: card edges ${m.rect.x}–${m.rect.r}`);
      check(near(m.scale, S, 0.001) && !m.nestedFit, `${c.name}: one scale ${m.scale}${m.nestedFit ? ' (nested fit!)' : ''}`);
      check(m.pad.every((p) => near(p, c.pad * S, 0.3)), `${c.name}: padding ${m.pad.join('/')} px (${c.pad}px reference)`);
      if (c.title) check(m.title && near(m.title.vis, c.title * S, 0.3), `${c.name}: title ${m.title?.vis} px — "${m.title?.text}"`);
      check(m.extra.length === 0, `${c.name}: no extra scale inside the card${m.extra.length ? `: ${m.extra.join(' | ')}` : ''}`);
      const sizes = Object.entries(m.sizes).sort((a, b) => +b[0] - +a[0]).map(([v, n]) => `${v}×${n}`).join(' ');
      ok(`${c.name}: visual text sizes ${sizes}`);
    }
  }

  // ---------------------------------------------------------------- tallest states
  // onboarding — every stage open, every example
  await openScene('topic-06', 'onboarding', 'scene-onboarding');
  const stages = page.locator('[data-activity="nav-stages"] button[aria-expanded]');
  const nStages = await stages.count();
  for (let i = 0; i < nStages; i++) {
    if ((await stages.nth(i).getAttribute('aria-expanded')) !== 'true') await stages.nth(i).click();
    await page.waitForTimeout(450);
    await fitsOnScreen('[data-activity="nav-stages"]', `four stages · stage ${i + 1} open`, `onboarding-stage-${i + 1}.png`);
  }
  const examples = page.locator('button[aria-controls="navigation-history-detail-panel"]');
  for (let i = 0; i < (await examples.count()); i++) {
    await examples.nth(i).click();
    await page.waitForTimeout(600);
    await fitsOnScreen('#scene-onboarding .shadow-pine-card', `examples · example ${i + 1}`, `examples-${i + 1}.png`);
  }

  // tips — every tip on both screens, every answer, reset
  await openScene('topic-06', 'tips', 'scene-tips');
  for (const screen of ['plan', 'nav']) {
    const sel = `[data-tips-screen="${screen}"]`;
    const tips = page.locator(`${sel} button[aria-expanded]`);
    for (let i = 0; i < (await tips.count()); i++) {
      await tips.nth(i).click();
      await page.waitForTimeout(450);
      await fitsOnScreen(sel, `tips · ${screen} · tip ${i + 1}`, `tips-${screen}-${i + 1}.png`);
    }
  }
  const Q = '[data-activity="tips-question"]';
  const options = page.locator(`${Q} [data-option]`);
  for (let i = 0; i < (await options.count()); i++) {
    await options.nth(i).click();
    await page.waitForTimeout(450);
    const id = await options.nth(i).getAttribute('data-option');
    await fitsOnScreen(Q, `tips question · answer ${id}`, `tips-question-${id}.png`);
  }
  await page.locator(`${Q} [data-tips-reset]`).click();
  await page.waitForTimeout(450);
  await fitsOnScreen(Q, 'tips question · after reset', 'tips-question-reset.png');

  // principles — compass slider ends, every north
  await openScene('topic-06', 'principles', 'scene-principles');
  const slider = page.locator('[data-activity="compass-map"] input[type="range"], [data-activity="compass-map"] [role="slider"]').first();
  for (const key of ['Home', 'End']) {
    await slider.focus();
    await page.keyboard.press(key);
    await page.waitForTimeout(700);
    await fitsOnScreen('[data-activity="compass-map"]', `compass · slider ${key}`, `compass-${key.toLowerCase()}.png`);
  }
  const NL = '[data-activity="north-lab"]';
  const norths = page.locator(`${NL} [role="radio"], ${NL} [role="tab"], ${NL} button[aria-pressed]`);
  for (let i = 0; i < (await norths.count()); i++) {
    await norths.nth(i).click();
    await page.waitForTimeout(500);
    await fitsOnScreen(NL, `north types · choice ${i + 1}`, `north-${i + 1}.png`);
  }
  await fitsOnScreen('[data-activity="location-check"]', 'location check · opening', 'location-opening.png');

  // planning — every route stop, every pace length
  await openScene('topic-06', 'planning', 'scene-planning');
  const RB = '[data-qa="route-builder"]';
  const stops = page.locator(`${RB} ol button`);
  for (let i = 0; i < (await stops.count()); i++) {
    await stops.nth(i).click();
    await page.waitForTimeout(450);
    await fitsOnScreen(RB, `route story · item ${i + 1}`, `route-${i + 1}.png`);
  }
  const PC = '[data-qa="pacing"]';
  const paces = page.locator(`${PC} [role="radio"]`);
  for (let i = 0; i < (await paces.count()); i++) {
    await paces.nth(i).click();
    await page.waitForTimeout(300);
    await fitsOnScreen(PC, `step counting · pace ${i + 1}`, i === 0 ? 'pacing.png' : null);
  }

  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} finally {
  await writeFile(`${outDir}/layout-report.json`, JSON.stringify(report, null, 1));
  await browser.close();
}

console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
