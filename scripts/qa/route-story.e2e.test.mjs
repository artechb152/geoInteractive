// Browser acceptance tests for lesson 6 „תכנון ציר: בניית סיפור דרך” (task 31) —
// route-story/RouteStoryBuilder + RouteStoryPanel, PlanningRouteMap and PlanningScene's pacing demo,
// on the main lesson page (not a lab page).
// Needs a running dev server. Run:
//   node --test scripts/qa/route-story.e2e.test.mjs                  (QA_BASE defaults to http://localhost:3000)
//   QA_BASE=http://localhost:3041 SHOTS=design/screenshots/route-story-builder/after node --test scripts/qa/route-story.e2e.test.mjs
// SHOTS (optional): folder for 1440×1122 screenshots of the states the tests visit.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE ?? 'http://localhost:3000';
const SHOTS = process.env.SHOTS ?? '';
const URL = `${BASE}/lessons/topic-06/#scene-planning`;
const VIEW = { width: 1440, height: 1122 };
const M_PER_UNIT = 23.5;
const LEGS = [
  { letter: 'א׳', az: 35, m: 500 },
  { letter: 'ב׳', az: 65, m: 700 },
  { letter: 'ג׳', az: 50, m: 500 },
  { letter: 'ד׳', az: 40, m: 600 },
];
const pad3 = (n) => String(n).padStart(3, '0') + '°';

let browser;
let page;
const errors = [];

async function open(p) {
  for (let attempt = 0; ; attempt++) {
    await p.goto(URL, { waitUntil: 'load', timeout: 180000 }).catch(() => {});
    const ok = await p.waitForSelector('#scene-planning [data-qa="route-panel"]', { timeout: 60000 }).then(
      () => true,
      () => false,
    );
    if (ok) break;
    if (attempt >= 3) throw new Error('route builder did not render');
  }
  await p.waitForTimeout(1500);
}

before(async () => {
  if (SHOTS) await mkdir(SHOTS, { recursive: true });
  browser = await chromium.launch({ channel: 'chrome' });
  page = await browser.newPage({ viewport: VIEW });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    // only this page's own errors (other sessions' assets may 404 on a shared server)
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  await open(page);
});

after(async () => {
  await browser?.close();
});

const B = '#scene-planning [data-qa="route-builder"]';
const rows = () => page.locator(`${B} ol button`);

/** Scroll the card's top just under the sticky site header (instant: the site has smooth scroll). */
async function toCard(sel = B) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 104, behavior: 'instant' });
  }, sel);
  await page.waitForTimeout(350);
}

async function shot(name) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** Everything the tests read from one state of the builder. */
const read = () =>
  page.evaluate((B) => {
    const root = document.querySelector(B);
    const svg = root.querySelector('svg[role="img"]');
    const tag = svg.querySelector('[data-tag-leg]');
    const card = root.getBoundingClientRect();
    return {
      stop: svg.getAttribute('data-stop'),
      ariaLabel: svg.getAttribute('aria-label'),
      live: root.querySelector('[data-live]').textContent.trim(),
      label: root.querySelector('[data-stop-label]').textContent.trim(),
      current: [...root.querySelectorAll('ol button')].findIndex((b) => b.getAttribute('aria-current') === 'step'),
      tabbable: [...root.querySelectorAll('ol button')].filter((b) => b.tabIndex === 0).length,
      panel: root.querySelector('[data-panel]')?.getAttribute('data-panel'),
      panelText: root.querySelector('[data-qa="route-panel"]').textContent,
      legs: [...svg.querySelectorAll('[data-leg]')].map((g) => ({ state: g.getAttribute('data-state'), az: +g.getAttribute('data-az'), m: +g.getAttribute('data-m') })),
      markers: [...svg.querySelectorAll('[data-marker]')].map((g) => ({ state: g.getAttribute('data-state'), x: +g.getAttribute('data-x'), y: +g.getAttribute('data-y'), n: g.querySelector('text').textContent })),
      shownLeg: svg.querySelector('[data-shown-leg]')?.getAttribute('data-shown-leg') ?? null,
      line: (() => {
        const l = svg.querySelector('[data-line]');
        return l ? { kind: l.getAttribute('data-line'), dash: getComputedStyle(l).strokeDasharray } : null;
      })(),
      tag: tag ? { leg: tag.getAttribute('data-tag-leg'), hidden: tag.hasAttribute('data-hidden'), text: [...tag.querySelectorAll('text')].map((t) => t.textContent.trim()) } : null,
      halos: [...svg.querySelectorAll('[data-halo]')].map((h) => `${h.getAttribute('data-halo')}:${h.getAttribute('data-role')}`),
      scaleHint: svg.querySelector('[data-scale-bar]').hasAttribute('data-hint'),
      chips: [...root.querySelectorAll('ol [data-stop-row^="leg"]')].map((b) => [...b.querySelectorAll('.rounded-full')].map((c) => c.textContent.trim())),
      done: root.hasAttribute('data-done'),
      card: { top: Math.round(card.top), bottom: Math.round(card.bottom), h: Math.round(card.height) },
    };
  }, B);

async function select(k) {
  await rows().nth(k).click();
  await page.waitForTimeout(700);
  return read();
}

// ---------------------------------------------------------------- it is in the main lesson

test('the builder renders inside the main lesson page, under the „תכנון ציר” sub-topic', async () => {
  assert.match(page.url(), /\/lessons\/topic-06\/#scene-planning$/);
  const nav = await page.evaluate(() => [...document.querySelectorAll('nav a, nav button, aside a, aside button')].map((e) => e.textContent.trim()));
  assert.ok(nav.some((t) => t.includes('תכנון ציר')), 'side nav lists תכנון ציר');
  assert.equal(await rows().count(), 9, '5 points + 4 legs');
});

// ---------------------------------------------------------------- every point and leg

test('each of the nine stops: list, map, tag, rings and panel agree', async () => {
  await toCard();
  const expected = [
    { stop: 'point:0', panel: 'point', shown: '0', legs: ['next', 'ahead', 'ahead', 'ahead'], halos: [] },
    { stop: 'leg:0', panel: 'leg', shown: '0', legs: ['focus', 'ahead', 'ahead', 'ahead'], halos: ['stream-bend:end'] },
    { stop: 'point:1', panel: 'point', shown: '1', legs: ['walked', 'next', 'ahead', 'ahead'], halos: ['stream-bend:point'] },
    { stop: 'leg:1', panel: 'leg', shown: '1', legs: ['walked', 'focus', 'ahead', 'ahead'], halos: ['stream-crossing:along', 'saddle:end'] },
    { stop: 'point:2', panel: 'point', shown: '2', legs: ['walked', 'walked', 'next', 'ahead'], halos: ['saddle:point'] },
    { stop: 'leg:2', panel: 'leg', shown: '2', legs: ['walked', 'walked', 'focus', 'ahead'], halos: ['road:end'] },
    { stop: 'point:3', panel: 'point', shown: '3', legs: ['walked', 'walked', 'walked', 'next'], halos: ['road:point'] },
    { stop: 'leg:3', panel: 'question', shown: '3', legs: ['walked', 'walked', 'walked', 'focus'], halos: [] },
    { stop: 'point:4', panel: 'point', shown: null, legs: ['walked', 'walked', 'walked', 'walked'], halos: [] },
  ];
  const heights = new Set();
  const tops = new Set();
  let question = null;
  for (let k = 0; k < 9; k++) {
    const s = await select(k);
    const e = expected[k];
    assert.equal(s.stop, e.stop, `stop ${k}`);
    assert.equal(s.current, k, 'aria-current follows');
    assert.equal(s.tabbable, 1, 'one tab stop in the list');
    assert.equal(s.panel, e.panel, `panel ${k}`);
    assert.equal(s.shownLeg, e.shown, `shown leg ${k}`);
    assert.deepEqual(s.legs.map((l) => l.state), e.legs, `leg states ${k}`);
    assert.deepEqual(s.halos, e.halos, `rings ${k}`);
    assert.equal(s.live, s.ariaLabel.replace(/^מפת סיפור הדרך\. /, ''), 'map label = live text');
    if (e.shown !== null) {
      const leg = LEGS[+e.shown];
      // selected leg = solid; the leg leaving a selected point = really dashed (computed style, not just the attribute)
      if (e.panel === 'point') {
        assert.equal(s.line.kind, 'dashed');
        assert.match(s.line.dash, /^1.7(px)?,? 1.3(px)?$/, 'dash ' + s.line.dash);
      } else {
        assert.equal(s.line.kind, 'solid');
      }
      assert.equal(s.tag.leg, e.shown);
      assert.equal(s.tag.text[0], leg.letter, 'tag names its leg');
      if (e.shown === '3') {
        assert.ok(s.tag.hidden);
        assert.deepEqual(s.tag.text.slice(1), ['?°', '? מ׳']);
        assert.ok(s.scaleHint, 'scale bar outlined while leg ד׳ is to be measured');
      } else {
        assert.deepEqual(s.tag.text.slice(1), [pad3(leg.az), `${leg.m} מ׳`], 'tag = the leg’s data');
        assert.ok(!s.scaleHint);
      }
    } else {
      assert.equal(s.tag, null, 'נ.ס has no outgoing leg');
    }
    // a selected point speaks of its OUTGOING leg, by letter
    if (s.stop.startsWith('point') && e.shown !== null) {
      assert.match(s.panelText, new RegExp(`הקטע היוצא.*קטע ${LEGS[+e.shown].letter}`));
      assert.match(s.live, new RegExp(`הקטע היוצא: קטע ${LEGS[+e.shown].letter}`));
    }
    if (e.panel === 'question') question = s.card;
    else heights.add(s.card.h);
    tops.add(s.card.top);
    assert.ok(s.card.bottom <= VIEW.height, `stop ${k} fits: ${JSON.stringify(s.card)}`);
    await shot(`stop${k}-${e.stop.replace(':', '')}`);
  }
  // every point and leg view shares one height; leg ד׳ (the tallest view) only grows the card downward
  assert.equal(heights.size, 1, `card height is the same for every point and leg: ${[...heights]}`);
  assert.equal(tops.size, 1, 'the card never moves up or down');
  assert.ok(question.h >= [...heights][0]);
});

test('נ.ה and leg א׳ are told apart: the numbers at נ.ה belong to the outgoing leg א׳, no other leg repeats them', async () => {
  const p = await select(0);
  assert.match(p.panelText, /כאן מתחיל הציר/);
  assert.match(p.panelText, /הקטע היוצא/);
  assert.match(p.panelText, /שייכים לקטע שמתחיל כאן/);
  const l = await select(1);
  assert.match(l.label, /^קטע א׳ · מנקודה 1 אל נקודה 2$/);
  const shown = l.chips.slice(0, 3).map((c) => c.join(' '));
  assert.equal(new Set(shown).size, 3, `legs show different data: ${shown}`);
});

test('the map is drawn from the list numbers: marker to marker = azimuth and distance of the leg', async () => {
  const s = await read();
  for (let i = 0; i < 4; i++) {
    const a = s.markers[i];
    const b = s.markers[i + 1];
    const az = ((Math.atan2(b.x - a.x, a.y - b.y) * 180) / Math.PI + 360) % 360;
    const m = Math.hypot(b.x - a.x, b.y - a.y) * M_PER_UNIT;
    assert.ok(Math.abs(az - LEGS[i].az) < 0.3, `leg ${i} bearing ${az}`);
    assert.ok(Math.abs(m - LEGS[i].m) < 5, `leg ${i} length ${m}`);
    assert.equal(s.legs[i].az, LEGS[i].az);
    assert.equal(s.legs[i].m, LEGS[i].m);
  }
  assert.deepEqual(s.markers.map((m) => m.n), ['1', '2', '3', '4', '5'], 'map numbers = list numbers');
  // the list shows the same numbers (leg ד׳ hidden until written)
  assert.deepEqual(s.chips.slice(0, 3), LEGS.slice(0, 3).map((l) => [pad3(l.az), `${l.m} מ׳`]));
  assert.deepEqual(s.chips[3], ['?°', '? מ׳']);
});

test('map clicks select points and legs', async () => {
  await toCard();
  for (const [sel, stop] of [
    ['[data-marker="2"]', 'point:2'],
    ['[data-leg-hit="1"]', 'leg:1'],
    ['[data-marker="4"]', 'point:4'],
    ['[data-leg-hit="3"]', 'leg:3'],
    ['[data-marker="0"]', 'point:0'],
  ]) {
    const box = await page.locator(`${B} svg ${sel}`).first().boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);
    assert.equal((await read()).stop, stop, sel);
  }
});

test('keyboard: arrows move along the story (← / ↓ forward in RTL), Home / End, prev / next buttons', async () => {
  await select(0);
  await rows().nth(0).focus();
  await page.keyboard.press('ArrowDown');
  assert.equal((await read()).stop, 'leg:0');
  await page.keyboard.press('ArrowLeft');
  assert.equal((await read()).stop, 'point:1');
  await page.keyboard.press('ArrowRight');
  assert.equal((await read()).stop, 'leg:0');
  await page.keyboard.press('End');
  assert.equal((await read()).stop, 'point:4');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-stop-row')), 'point:4', 'focus follows');
  await page.keyboard.press('Home');
  assert.equal((await read()).stop, 'point:0');
  await page.getByRole('button', { name: 'לנקודה או לקטע הבא' }).click();
  assert.equal((await read()).stop, 'leg:0');
  await page.getByRole('button', { name: 'לנקודה או לקטע הקודם' }).click();
  assert.equal((await read()).stop, 'point:0');
  assert.ok(await page.getByRole('button', { name: 'לנקודה או לקטע הקודם' }).isDisabled());
});

// ---------------------------------------------------------------- the application step

const panel = '#scene-planning [data-qa="route-panel"]';
const choose = (field, label) => page.locator(`${panel} [data-radio="${field}"] [role="radio"]`, { hasText: label }).first().click();
const feedback = () =>
  page.evaluate((panel) => Object.fromEntries([...document.querySelectorAll(`${panel} [data-feedback]`)].map((f) => [f.getAttribute('data-feedback'), { verdict: f.getAttribute('data-verdict'), text: f.textContent.trim() }])), panel);
const statusText = () => page.locator(`${panel} [role="status"]`).textContent();

test('leg ד׳: wrong answers get feedback that explains without revealing; correction finishes; reset clears', async () => {
  await toCard();
  await select(7);
  const check = page.locator(panel).getByRole('button', { name: 'בדיקה' });
  assert.ok(await check.isDisabled(), 'check waits for all three');
  assert.match(await statusText(), /בחרו תשובה בכל אחת/);
  await shot('q0-open');

  await choose('az', '220°');
  await choose('m', '1,200');
  await choose('end', 'חורשה');
  await check.click();
  await page.waitForTimeout(400);
  let fb = await feedback();
  assert.deepEqual(Object.keys(fb).sort(), ['az', 'end', 'm']);
  for (const f of Object.values(fb)) assert.equal(f.verdict, 'wrong');
  assert.doesNotMatch(fb.az.text, /040/);
  assert.doesNotMatch(fb.m.text, /600/);
  assert.doesNotMatch(fb.end.text, /אורנים|סלע/);
  assert.match(fb.az.text, /הכיוון ההפוך/);
  assert.match(fb.end.text, /באמצע הקטע/);
  assert.match(await statusText(), /0 מתוך 3 תשובות תואמות/);
  // nothing marks the right option
  const marked = await page.locator(`${panel} [role="radio"][aria-checked="true"]`).allTextContents();
  assert.deepEqual(marked.map((t) => t.trim()), ['220°', '1,200 מ׳', 'חורשה']);
  // tallest state: the whole card still fits 1440 × 1122 under the header
  await toCard();
  let s = await read();
  assert.ok(s.card.top >= 96 && s.card.bottom <= VIEW.height, `card ${JSON.stringify(s.card)}`);
  await shot('q1-all-wrong');
  // still hidden on the map
  assert.ok(s.tag.hidden);
  assert.deepEqual(s.halos, []);

  // change one answer: only its feedback clears
  await choose('az', '320°');
  fb = await feedback();
  assert.equal(fb.az, undefined);
  assert.equal(fb.m.verdict, 'wrong');
  assert.match(await statusText(), /שיניתם תשובה/);
  await check.click();
  await page.waitForTimeout(300);
  fb = await feedback();
  assert.match(fb.az.text, /נגד כיוון השעון/);

  // partial: two right, one wrong
  await choose('az', '040°');
  await choose('m', '600');
  await check.click();
  await page.waitForTimeout(300);
  fb = await feedback();
  assert.equal(fb.az.verdict, 'right');
  assert.equal(fb.m.verdict, 'right');
  assert.equal(fb.end.verdict, 'wrong');
  assert.match(await statusText(), /2 מתוך 3/);
  assert.equal((await read()).done, false);
  await shot('q2-two-right');

  // correct the last one → done
  await choose('end', 'אורנים בקרקע סלעית');
  await check.click();
  await page.waitForTimeout(800);
  s = await read();
  assert.ok(s.done);
  fb = await feedback();
  for (const f of Object.values(fb)) assert.equal(f.verdict, 'right');
  assert.match(await statusText(), /סיפור הדרך הושלם: 4 קטעים ו־2,300 מ׳/);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('role')), 'status', 'focus moves to the result');
  assert.deepEqual(s.tag.text, ['ד׳', '040°', '600 מ׳']);
  assert.deepEqual(s.chips[3], ['040°', '600 מ׳']);
  assert.deepEqual(s.halos, ['grove:along', 'pines-rocks:end']);
  assert.ok(!s.scaleHint);
  assert.ok(s.card.bottom <= VIEW.height);
  await shot('q3-done');
  // radios are locked once done
  assert.equal(await page.locator(`${panel} [role="radiogroup"][aria-disabled="true"]`).count(), 3);
  // נ.ס now names its sign
  const p5 = await select(8);
  assert.match(p5.panelText, /קבוצת אורנים בקרקע סלעית/);
  assert.deepEqual(p5.halos, ['pines-rocks:point']);
  await shot('q4-point5-done');

  // reset
  await select(7);
  await page.locator(panel).getByRole('button', { name: 'איפוס' }).click();
  await page.waitForTimeout(500);
  s = await read();
  assert.ok(!s.done);
  assert.ok(s.tag.hidden);
  assert.deepEqual(s.chips[3], ['?°', '? מ׳']);
  assert.deepEqual(await feedback(), {});
  assert.equal(await page.locator(`${panel} [role="radio"][aria-checked="true"]`).count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('role')), 'radio', 'focus back on the first choice');
});

test('the question works from the keyboard alone', async () => {
  await select(7);
  await page.locator(`${panel} [data-radio="az"] [role="radio"]`).first().focus();
  // ← moves to the next option in RTL and selects it
  await page.keyboard.press('ArrowLeft');
  assert.equal((await page.locator(`${panel} [data-radio="az"] [aria-checked="true"]`).textContent()).trim(), '220°');
  await page.keyboard.press('ArrowRight');
  assert.equal((await page.locator(`${panel} [data-radio="az"] [aria-checked="true"]`).textContent()).trim(), '040°');
  await page.keyboard.press('Tab'); // → distance group
  await page.keyboard.press('ArrowLeft'); // 600
  await page.keyboard.press('Tab'); // → sign group
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft'); // pines
  await page.keyboard.press('Tab'); // → check
  assert.equal((await page.evaluate(() => document.activeElement?.textContent ?? '')).trim(), 'בדיקה');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  assert.ok((await read()).done);
  await page.locator(panel).getByRole('button', { name: 'איפוס' }).click();
  await page.waitForTimeout(300);
});

// ---------------------------------------------------------------- pacing demo

test('pacing: distance, single steps and double steps; the count depends on the personal pace; end of count ≠ arrival', async () => {
  await toCard('#scene-planning [data-qa="pacing"]');
  const P = '#scene-planning [data-qa="pacing"]';
  const readPace = () =>
    page.evaluate((P) => {
      const r = document.querySelector(P);
      return {
        value: r.querySelector('input[type=range]').value,
        steps: r.querySelector('[data-qa="pace-steps"]').textContent.trim(),
        calc: r.querySelector('[data-qa="pace-calc"]').textContent.trim(),
        live: r.querySelector('[aria-live]').textContent.trim(),
        diagram: r.querySelector('[data-qa="pace-length"] svg[role="img"]').getAttribute('aria-label'),
        card: (() => {
          const b = r.getBoundingClientRect();
          return { top: Math.round(b.top), bottom: Math.round(b.bottom) };
        })(),
      };
    }, P);
  let s = await readPace();
  assert.equal(s.value, '500');
  assert.match(s.calc, /500 מ׳ ÷ 1\.5 מ׳ ≈ 333/);
  assert.match(s.steps, /667 צעדים/);
  assert.match(s.diagram, /צעד: .*0\.75 מ׳.*צעד כפול: .*1\.5 מ׳/);
  await shot('pacing-1.5');
  await page.locator(`${P} [data-radio="pace"] [role="radio"]`, { hasText: '1.6' }).click();
  await page.waitForTimeout(500);
  s = await readPace();
  assert.match(s.calc, /500 מ׳ ÷ 1\.6 מ׳ ≈ 313/);
  assert.match(s.steps, /625 צעדים/);
  assert.match(s.diagram, /0\.8 מ׳.*1\.6 מ׳/);
  // slider by keyboard: +10 steps of 50 m
  await page.locator(`${P} input[type=range]`).focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(700);
  s = await readPace();
  assert.equal(s.value, '1000');
  assert.match(s.calc, /1,000 מ׳ ÷ 1\.6 מ׳ ≈ 625/);
  assert.match(s.live, /כ־625 צעדים כפולים, שהם כ־1250 צעדים/);
  assert.match(s.steps, /1,250 צעדים/);
  const notProof = await page.locator(`${P} [data-qa="pace-not-proof"]`).textContent();
  assert.match(notProof, /הספירה אינה הוכחת הגעה/);
  assert.match(notProof, /סימן השטח של סוף הקטע/);
  assert.ok(s.card.top >= 96 && s.card.bottom <= VIEW.height, `pacing card ${JSON.stringify(s.card)}`);
  await shot('pacing-1.6-1000');
  // back to the defaults for later tests
  await page.locator(`${P} [data-radio="pace"] [role="radio"]`, { hasText: '1.5' }).click();
});

// ---------------------------------------------------------------- reduced motion, errors

test('reduced motion: no pulsing ring, tag and rings appear at once', async () => {
  const ctx = await browser.newContext({ viewport: VIEW, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await open(p);
  await p.locator(`${B} ol button`).nth(3).click();
  await p.waitForTimeout(60);
  const r = await p.evaluate((B) => {
    const svg = document.querySelector(`${B} svg[role="img"]`);
    const tag = svg.querySelector('[data-tag-leg] g g');
    return {
      animates: svg.querySelectorAll('animate').length,
      tagOpacity: tag ? getComputedStyle(tag).opacity : null,
      halos: svg.querySelectorAll('[data-halo]').length,
    };
  }, B);
  assert.equal(r.animates, 0);
  assert.equal(r.tagOpacity, '1');
  assert.equal(r.halos, 2);
  await ctx.close();
});

test('no page errors', () => {
  assert.deepEqual(errors, []);
});
