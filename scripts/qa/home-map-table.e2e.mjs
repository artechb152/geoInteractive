import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));
const base = process.env.HOME_QA_BASE || 'http://127.0.0.1:3017';
const out = process.env.HOME_QA_OUT || 'design/screenshots/home-map-table';
const CHAPTERS = [['topic-02', 'תבליט, תכסית וטופוגרפיה'], ['topic-02b', 'קרטוגרפיה וקריאת מפות'], ['topic-06', 'ניווטים']];

// Expected sub-chapters straight from the course data (lesson-scenes.ts minus the framing scenes),
// so the test follows the content rather than a copy of it.
const scenesSource = await readFile('src/lib/lesson-scenes.ts', 'utf8');
const subChapters = id => {
  const block = scenesSource.match(new RegExp(`'${id}':\\s*\\[([\\s\\S]*?)\\]`))?.[1] ?? '';
  return [...block.matchAll(/\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)'\s*\}/g)].filter(([, sid]) => !['hook', 'onboarding', 'recap'].includes(sid)).map(([, , label]) => label);
};

// The art keeps every card's number + title zone blank card stock (home_map_table_card_zones.json).
const zones = JSON.parse(await readFile('scripts/blender/home_map_table_card_zones.json', 'utf8'));
const faces = { 'topic-02': 'chapter-terrain', 'topic-02b': 'chapter-cartography', 'topic-06': 'chapter-navigation' };
for (const [id, file] of Object.entries(faces)) {
  const { data, info } = await sharp(`public/assets/home/map-table/${file}.webp`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const lum = (x, y) => { const i = (y * info.width + x) * 3; return (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255; };
  for (const [x0, y0, x1, y1] of zones.cards[id]) {
    const values = [];
    for (let y = Math.floor(y0 * info.height); y < y1 * info.height; y += 2) for (let x = Math.floor(x0 * info.width); x < x1 * info.width; x += 2) values.push(lum(x, y));
    const median = values.sort((a, b) => a - b)[values.length >> 1];
    const marks = values.filter(v => v < median - 0.1).length / values.length;
    assert.ok(marks < 0.002, `${file}: the copy zone ${[x0, y0, x1, y1]} is blank card stock (${(marks * 100).toFixed(2)}% marked)`);
  }
}

// The map sheet's print keeps blank paper behind the brand row, the headline and 'פרקי הקורס'
// (a flat valley floor in home_map_table_sheet_ink.cjs). Boxes are the live copy, in frame units.
const sheetSpec = JSON.parse(await readFile('scripts/blender/home_map_table_sheets.json', 'utf8'));
const copyBoxes = (v) => {
  const colR = v.w - (v.w - 3 * sheetSpec.card - 2 * sheetSpec.gap) / 2;
  return { brand: [v.w / 2 + 10, 76, v.w / 2 + 343, 109], continue: [v.w / 2 - 300, 68, v.w / 2 - 40, 118], h1: [colR - 534, v.heroTop - 9, colR - 4, v.heroTop + 161], h2: [colR - 318, v.titleTop, colR, v.titleTop + 54] };
};
for (const [key, v] of Object.entries(sheetSpec.variants)) {
  const { data, info } = await sharp(`public/assets/home/map-table/sheet-${key}.webp`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const k = info.width / v.w;
  const lum = (x, y) => { const i = (y * info.width + x) * 3; return (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255; };
  for (const [name, [x0, y0, x1, y1]] of Object.entries(copyBoxes(v))) {
    const values = [];
    for (let y = Math.floor(y0 * k); y < y1 * k; y += 2) for (let x = Math.floor(x0 * k); x < x1 * k; x += 2) values.push(lum(x, y));
    const median = values.sort((a, b) => a - b)[values.length >> 1];
    const marks = values.filter(val => val < median - 0.06).length / values.length;
    assert.ok(marks < 0.003, `sheet-${key}: blank paper behind the ${name} (${(marks * 100).toFixed(2)}% marked)`);
  }
}

const browser = await chromium.launch({ executablePath: process.env.HOME_QA_CHROME });
await mkdir(out, { recursive: true });
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1122 } });
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const cards = page.locator('[data-chapter-id]');
const open = async () => {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.locator('[data-home="map-table"]').waitFor({ timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-home="map-table"] img').evaluateAll(images => Promise.all(images.filter(image => image.currentSrc).map(image => image.decode().catch(() => {}))));
  await page.waitForTimeout(1600); // arrival animation
};
const partsOpacity = id => page.locator(`[data-chapter-id="${id}"] [data-chapter-parts]`).evaluate(node => +getComputedStyle(node).opacity);
try {
  await open();
  assert.equal(await cards.count(), 3, 'Exactly three public chapter links');
  assert.deepEqual(await cards.evaluateAll(nodes => nodes.map(node => node.dataset.chapterId)), CHAPTERS.map(([id]) => id));
  assert.equal(await page.getByRole('heading', { level: 1 }).innerText(), 'כל מסע מתחיל\nבקריאת השטח.');
  // all chapters fit: no carousel arrows, dots or paging region
  assert.equal(await page.locator('[data-home] nav').count(), 0, 'No paging controls while every chapter is visible');
  assert.equal(await page.locator('[data-home] button').count(), 0, 'No arrow or dot buttons');
  assert.equal(await page.locator('[data-home] [aria-roledescription]').count(), 0, 'Not announced as a carousel');
  for (const [id, title] of CHAPTERS) {
    const card = page.locator(`[data-chapter-id="${id}"]`);
    assert.equal(await card.getAttribute('href'), `/lessons/${id}/`);
    assert.ok((await card.locator('h3').innerText()).replace(/\s+/g, ' ').includes(title));
    assert.ok(await card.isVisible());
    // the card's own geometry is 1:1; only the resting perspective changes its silhouette
    const size = await card.evaluate(node => [node.offsetWidth, node.offsetHeight]);
    assert.ok(Math.abs(size[0] - size[1]) <= 1, 'Chapter cards are square');
    assert.notEqual(await card.evaluate(node => getComputedStyle(node).transform), 'none', 'Cards rest at the designed angle');
    // sub-chapters: the course's own scene list for this chapter, hidden at rest
    const expected = subChapters(id);
    assert.ok(expected.length > 1, `${id} has sub-chapters in lesson-scenes.ts`);
    assert.deepEqual(await card.locator('[data-chapter-parts] li').allInnerTexts(), expected, `${id} lists its own sub-chapters`);
    assert.equal(await partsOpacity(id), 0, `${id} sub-chapters are hidden at rest`);
    assert.ok((await card.getAttribute('aria-describedby'))?.length, `${id} sub-chapters are exposed as the link's description`);
    // the whole tilted card takes the pointer — including its far (upper) half with the number and title
    const hit = await card.locator('[class*=number]').evaluate(node => {
      const r = node.getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('[data-chapter-id]')?.dataset.chapterId;
    });
    assert.equal(hit, id, `${id}: pointing at the chapter number hits the chapter link`);
  }
  // one screen, the map sheet dominant, and the printed copy clear of the folds, at every desktop size
  for (const [w, h] of [[1920, 910], [1440, 1122], [1440, 900], [1366, 768]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(200);
    const boxes = await page.evaluate(() => [...document.querySelectorAll('[data-home] header a, [data-home] h1, [data-home] h2, [data-chapter-id]')].map(n => { const r = n.getBoundingClientRect(); return [n.textContent?.trim().slice(0, 12) || n.getAttribute('aria-label'), r.left, r.top, r.right, r.bottom]; }));
    for (const [name, l, t, r, b] of boxes) assert.ok(l >= 0 && t >= 0 && r <= w + 0.5 && b <= h + 0.5, `${name} visible at ${w}x${h}`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth), `No scrolling at ${w}x${h}`);
    const geo = await page.evaluate(() => {
      const sheet = document.querySelector('[data-home] picture').getBoundingClientRect();
      const box = sel => document.querySelector(sel).getBoundingClientRect();
      return { sheet: [sheet.left, sheet.top, sheet.width, sheet.height], h2: box('[data-home] h2'), h1: box('[data-home] h1'), brand: box('[data-home] header a'), cont: box('[data-continue]') };
    });
    const [sx, sy, sw, sh] = geo.sheet;
    assert.ok(sw * sh >= 0.85 * w * h, `The map sheet covers most of the window at ${w}x${h} (${((sw * sh) / (w * h) * 100).toFixed(0)}%)`);
    // the folds as rendered (home_map_table_sheets.json): the frame the CSS picked has this aspect
    const frame = Object.values(sheetSpec.variants).find(v => Math.abs(v.w / v.h - sw / sh) < 0.01);
    assert.ok(frame, `A sheet frame matches the shown sheet at ${w}x${h}`);
    const foldX = sx + (frame.w / 2 + sheetSpec.foldXOffset) / frame.w * sw, foldY = sy + frame.foldY / frame.h * sh;
    assert.ok(foldY - geo.h2.bottom >= 0.15 * sh, `"פרקי הקורס" sits far above the horizontal fold at ${w}x${h} (${((foldY - geo.h2.bottom) / sh * 100).toFixed(0)}% of the sheet)`);
    for (const [name, r] of [['h1', geo.h1], ['h2', geo.h2]]) assert.ok(r.left - foldX >= 0.04 * sw, `${name} is clear of the vertical fold at ${w}x${h}`);
    // the vertical fold runs through the gap in the brand row, clear of both
    assert.ok(geo.brand.left - foldX >= 0.01 * sw && foldX - geo.cont.right >= 0.01 * sw, `The vertical fold passes between the brand and "המשך ללמוד" at ${w}x${h}`);
    for (const [name, r] of [['h1', geo.h1], ['h2', geo.h2], ['brand', geo.brand]]) assert.ok(r.bottom < foldY, `${name} is above the horizontal fold at ${w}x${h}`);
    await page.screenshot({ path: `${out}/00-fit-${w}x${h}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 1122 });
  await page.waitForTimeout(200);
  const positions = await cards.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().x));
  assert.ok(positions[0] > positions[1] && positions[1] > positions[2], 'Initial chapter order is RTL');
  assert.ok(await page.getByRole('link', { name: 'המשך ללמוד' }).getAttribute('href') === '/lessons/topic-02/');
  await page.screenshot({ path: `${out}/01-default.png` });
  if (process.argv.includes('--capture-only')) process.exitCode = 0;
  else {
    // hover: depth on top of the resting pose + the sub-chapters slip in; leaving restores both
    const card = page.locator('[data-chapter-id="topic-02b"]');
    const resting = await card.evaluate(node => getComputedStyle(node).transform);
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.3);
    await page.waitForTimeout(450);
    assert.notEqual(await card.evaluate(node => getComputedStyle(node).transform), resting, 'Hover adds depth to the resting pose');
    assert.equal(await partsOpacity('topic-02b'), 1, 'Hover reveals the sub-chapters');
    const slip = await card.locator('[data-chapter-parts]').boundingBox();
    const title = await card.locator('h3').boundingBox();
    assert.ok(slip.y > title.y + title.height, 'The sub-chapter slip stays below the chapter title');
    await page.screenshot({ path: `${out}/02-hover-subchapters.png` });
    await page.mouse.move(40, 40);
    await page.waitForTimeout(450);
    assert.equal(await card.evaluate(node => getComputedStyle(node).transform), resting, 'Leaving the card returns it to its resting pose');
    assert.equal(await partsOpacity('topic-02b'), 0, 'Leaving the card hides the sub-chapters');
    // keyboard focus reveals the same list
    await page.locator('[data-continue]').focus();
    for (let i = 0; i < 5 && !(await page.evaluate(() => document.activeElement?.dataset.chapterId)); i++) await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.dataset.chapterId);
    assert.equal(focused, 'topic-02', 'Tab reaches the first chapter after „המשך ללמוד”');
    await page.waitForTimeout(450);
    assert.equal(await partsOpacity('topic-02'), 1, 'Keyboard focus reveals the sub-chapters');
    await page.screenshot({ path: `${out}/03-focus-subchapters.png` });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(450);
    assert.equal(await partsOpacity('topic-02'), 0, 'Moving focus on hides them again');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.chapterId), 'topic-02b');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
    // remembered position for „המשך ללמוד”
    await page.evaluate(() => localStorage.setItem('geo-course:last-visit:v1', JSON.stringify({ topicId: 'topic-06', topicNumber: 3, topicShortTitle: 'ניווטים', sceneId: 'principles', ts: Date.now() })));
    await open();
    await page.waitForFunction(() => document.querySelector('[data-continue]')?.getAttribute('href') === '/lessons/topic-06/#scene-principles');
    // reduced motion: same pose and the same reveal, no tilt and no movement
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.mouse.move(40, 40);
    const still = page.locator('[data-chapter-id="topic-06"]');
    const stillRest = await still.evaluate(node => getComputedStyle(node).transform);
    assert.notEqual(stillRest, 'none', 'Reduced motion keeps the designed resting pose');
    await still.hover();
    await page.waitForTimeout(100);
    assert.equal(await still.evaluate(node => getComputedStyle(node).transform), stillRest, 'Reduced motion disables tilt');
    assert.equal(await partsOpacity('topic-06'), 1, 'Reduced motion still reveals the sub-chapters (instantly)');
    await page.screenshot({ path: `${out}/04-reduced-motion.png` });
    // one click — on the sub-chapter slip itself — opens the chapter directly
    const stillBox = await still.locator('[data-chapter-parts]').boundingBox();
    await page.mouse.click(stillBox.x + stillBox.width / 2, stillBox.y + stillBox.height / 2);
    await page.waitForURL(url => url.pathname.replace(/\/$/, '') === '/lessons/topic-06', { waitUntil: 'commit', timeout: 120000 });
    assert.equal(new URL(page.url()).pathname.replace(/\/$/, ''), '/lessons/topic-06', 'One click on a card opens its chapter');
    assert.deepEqual(errors, [], 'No runtime page errors');
    console.log('PASS: three square chapters at rest pose with no paging controls, copy zones blank, map sheet ≥85% of the window, blank sheet paper behind the copy and copy off the folds at 1920x910/1440x1122/1440x900/1366x768, RTL order, links, sub-chapters from lesson-scenes on hover and keyboard focus, one-click entry, remembered continue, depth, reduced motion and page errors.');
  }
} finally {
  await browser.close();
}
