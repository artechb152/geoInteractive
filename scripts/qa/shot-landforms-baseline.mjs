// Extraction gate for the terrain-block engine (docs/superpowers/plans/2026-10-08-relief-cover-compare.md).
// Captures the five landform boards ([data-qa="forms-board"]) once settled, with motion and with
// reduced motion, plus a normalized DOM dump; --compare diffs two capture folders pixel by pixel.
//
//   QA_PORT=3100 node scripts/qa/shot-landforms-baseline.mjs qa-output/landforms-extraction/before
//   node scripts/qa/shot-landforms-baseline.mjs --compare qa-output/landforms-extraction/before qa-output/landforms-extraction/after
//
// Exit 1 on any page error, or (compare) on any differing pixel.
import { chromium } from 'playwright';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

const FORMS = ['כיפה', 'שלוחה', 'גיא', 'אוכף', 'מכתש'];
const args = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });

if (args[0] === '--compare') {
  const [a, b] = args.slice(1);
  const page = await (await browser.newContext()).newPage();
  let bad = 0;
  for (const f of (await readdir(a)).filter((n) => n.endsWith('.png')).sort()) {
    const [pa, pb] = await Promise.all([readFile(`${a}/${f}`), readFile(`${b}/${f}`)]);
    if (pa.equals(pb)) {
      console.log(`same  ${f}`);
      continue;
    }
    const d = await page.evaluate(async ([x, y]) => {
      const load = (b64) =>
        new Promise((res) => {
          const i = new Image();
          i.onload = () => res(i);
          i.src = `data:image/png;base64,${b64}`;
        });
      const [ia, ib] = await Promise.all([load(x), load(y)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { count: -1, size: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
      const px = (img) => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, c.width, c.height).data;
      };
      const da = px(ia);
      const db = px(ib);
      let count = 0;
      for (let i = 0; i < da.length; i += 4) {
        if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) count++;
      }
      return { count, size: `${ia.width}x${ia.height}` };
    }, [pa.toString('base64'), pb.toString('base64')]);
    if (d.count === 0) console.log(`same  ${f} (pixels equal, encoding differs)`);
    else {
      console.log(`DIFF  ${f}: ${d.count < 0 ? 'size ' + d.size : d.count + ' px'}`);
      bad++;
    }
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
}

const outDir = args[0] ?? 'qa-output/landforms-extraction/before';
const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-landforms`;
await mkdir(outDir, { recursive: true });
let failed = false;
// useId strings differ between builds; data-contour is a QA hook added in Task 3 — neither paints anything
const normalize = (html) =>
  html.replace(/\b[A-Za-z0-9]+-(sky|soft|smooth|tile)\b/g, 'ID-$1').replace(/ data-contour="\d+"/g, '');

// Chromium now and then re-rasterizes a single frame one level off (the terrain's sky-gradient dither,
// or one blended edge pixel of the card at its fractional y). Like toHaveScreenshot, keep shooting
// until two consecutive frames are byte-identical; a bad frame is always a lone one between good ones.
const stableShot = async (board) => {
  let prev = await board.screenshot({ animations: 'disabled' });
  for (let k = 0; k < 8; k++) {
    const next = await board.screenshot({ animations: 'disabled' });
    if (next.equals(prev)) return next;
    prev = next;
  }
  throw new Error('board never stabilised: 9 screenshots, no two consecutive frames identical');
};

for (const reduced of [false, true]) {
  const tag = reduced ? 'reduced' : 'motion';
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1122 },
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: 'networkidle' });
  const board = page.locator('[data-qa="forms-board"]');
  await board.waitFor({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await board.scrollIntoViewIfNeeded();
  for (const [i, name] of FORMS.entries()) {
    await page.getByRole('tab', { name: new RegExp(name) }).first().click();
    // settled = the moving canvas is gone; then the marks' fade (0.45 s delay + 0.3 s)
    await page.waitForFunction(() => !document.querySelector('[data-qa="forms-board"] canvas'), null, { timeout: 15000 });
    await page.waitForTimeout(2000);
    await writeFile(`${outDir}/${tag}-${i + 1}.png`, await stableShot(board));
    const html = await board.locator('svg').evaluateAll((svgs) => svgs.map((s) => s.outerHTML).join('\n'));
    await writeFile(`${outDir}/${tag}-${i + 1}.html`, normalize(html));
  }
  if (errors.length) {
    console.error(`${tag}: page errors`, errors.slice(0, 3));
    failed = true;
  }
  await ctx.close();
}
await browser.close();
console.log(`captured → ${outDir}`);
process.exit(failed ? 1 : 0);
