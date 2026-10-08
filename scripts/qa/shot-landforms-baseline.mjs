// Extraction gate for the terrain-block engine (docs/superpowers/plans/2026-10-08-relief-cover-compare.md).
// Captures the five landform boards ([data-qa="forms-board"]) once settled, with motion and with
// reduced motion, plus a normalized DOM dump; --compare diffs two capture folders pixel by pixel.
//
//   QA_PORT=3100 node scripts/qa/shot-landforms-baseline.mjs qa-output/landforms-extraction/before
//   node scripts/qa/shot-landforms-baseline.mjs --compare qa-output/landforms-extraction/before qa-output/landforms-extraction/after
//
// Exit 1 on any page error, or (compare) on any problem: both folders must hold exactly the 10 expected
// PNGs and the 10 expected .html dumps ({motion,reduced}-{1..5}); any missing/extra file, any differing
// pixel, any differing (normalized) DOM dump, or a PNG that cannot be decoded fails the compare.
//
// Triage note: on a real GPU, Chrome's raster of a settled board can jitter by a handful of anti-aliased
// pixels (1-2 levels) from one page load to the next, even with identical DOM dumps (observed in ~1 of 6
// captures, motion boards only; forcing a repaint or software rendering does NOT remove it). So a DIFF of
// a few px with max channel delta <= 2 and an identical .html dump: capture the "after" folder once more
// before blaming the code. A real regression persists, is larger, or changes the .html dump.
import { chromium } from 'playwright';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

const FORMS = ['כיפה', 'שלוחה', 'גיא', 'אוכף', 'מכתש'];
const TAGS = ['motion', 'reduced'];
const EXPECTED = TAGS.flatMap((t) => FORMS.map((_, i) => `${t}-${i + 1}`)); // base names of the 10 captures
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const args = process.argv.slice(2);

// useId strings differ between builds; data-contour is a QA hook added in Task 3 — neither paints anything
const normalize = (html) =>
  html.replace(/\b[A-Za-z0-9]+-(sky|soft|smooth|tile)\b/g, 'ID-$1').replace(/ data-contour="\d+"/g, '');

if (args[0] === '--compare' && args.length !== 3) {
  console.error('usage: node scripts/qa/shot-landforms-baseline.mjs --compare <dirA> <dirB>');
  process.exit(2);
}
const browser = await chromium.launch({ channel: 'chrome' });

if (args[0] === '--compare') {
  const [a, b] = args.slice(1);
  const page = await (await browser.newContext()).newPage();
  let bad = 0;

  // 1) The file sets: both folders must hold exactly the expected PNGs and DOM dumps.
  const want = new Set(EXPECTED.flatMap((n) => [`${n}.png`, `${n}.html`]));
  const have = {};
  for (const dir of [a, b]) {
    try {
      have[dir] = new Set(await readdir(dir));
    } catch (e) {
      console.log(`DIFF  ${dir}: cannot read folder (${e.code ?? e.message})`);
      bad++;
      continue;
    }
    for (const f of want) {
      if (!have[dir].has(f)) {
        console.log(`MISSING  ${f} in ${dir}`);
        bad++;
      }
    }
    for (const f of have[dir]) {
      if (/\.(png|html)$/.test(f) && !want.has(f)) {
        console.log(`EXTRA  ${f} in ${dir}`);
        bad++;
      }
    }
  }

  // 2) The contents of every expected file present in both folders.
  const both = (f) => have[a]?.has(f) && have[b]?.has(f);
  for (const n of EXPECTED) {
    const png = `${n}.png`;
    if (both(png)) {
      const [pa, pb] = await Promise.all([readFile(`${a}/${png}`), readFile(`${b}/${png}`)]);
      if (![pa, pb].every((p) => p.length > PNG_SIG.length && p.subarray(0, PNG_SIG.length).equals(PNG_SIG))) {
        console.log(`DIFF  ${png}: not a PNG file`);
        bad++;
      } else if (pa.equals(pb)) {
        console.log(`same  ${png}`);
      } else {
        let d;
        try {
          d = await page.evaluate(async ([x, y]) => {
            const load = (b64) =>
              new Promise((res, rej) => {
                const i = new Image();
                i.onload = () => res(i);
                i.onerror = () => rej(new Error('cannot decode PNG'));
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
            let maxDelta = 0;
            for (let i = 0; i < da.length; i += 4) {
              if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) {
                count++;
                for (let c = 0; c < 4; c++) maxDelta = Math.max(maxDelta, Math.abs(da[i + c] - db[i + c]));
              }
            }
            return { count, maxDelta, size: `${ia.width}x${ia.height}` };
          }, [pa.toString('base64'), pb.toString('base64')]);
        } catch (e) {
          console.log(`DIFF  ${png}: ${String(e.message ?? e).split('\n')[0]}`);
          bad++;
          d = null; // counted; still check this board's DOM dump below
        }
        if (d === null) {
          /* already counted */
        } else if (d.count === 0) console.log(`same  ${png} (pixels equal, encoding differs)`);
        else {
          console.log(`DIFF  ${png}: ${d.count < 0 ? 'size ' + d.size : `${d.count} px, max channel delta ${d.maxDelta}`}`);
          bad++;
        }
      }
    }

    const html = `${n}.html`;
    if (both(html)) {
      const [ta, tb] = (await Promise.all([readFile(`${a}/${html}`, 'utf8'), readFile(`${b}/${html}`, 'utf8')])).map(normalize);
      if (ta.length === 0 || tb.length === 0) {
        console.log(`DIFF  ${html}: empty DOM dump`);
        bad++;
      } else if (ta === tb) {
        console.log(`same  ${html}`);
      } else {
        const la = ta.split('\n');
        const lb = tb.split('\n');
        let k = 0;
        while (k < la.length && k < lb.length && la[k] === lb[k]) k++;
        const xa = la[k] ?? '';
        const xb = lb[k] ?? '';
        let c = 0;
        while (c < xa.length && c < xb.length && xa[c] === xb[c]) c++;
        const cut = (s) => s.slice(Math.max(0, c - 40), c + 80);
        console.log(`DIFF  ${html}: first difference at line ${k + 1}, column ${c + 1} (${la.length} vs ${lb.length} lines)`);
        console.log(`        A: …${cut(xa)}`);
        console.log(`        B: …${cut(xb)}`);
        bad++;
      }
    }
  }
  await browser.close();
  console.log(bad ? `compare FAILED: ${bad} problem(s)` : `compare OK: ${EXPECTED.length} PNG + ${EXPECTED.length} HTML identical`);
  process.exit(bad ? 1 : 0);
}

const outDir = args[0] ?? 'qa-output/landforms-extraction/before';
const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-landforms`;
await mkdir(outDir, { recursive: true });
let failed = false;

// Chromium now and then re-rasterizes a single frame one level off (the terrain's sky-gradient dither,
// or one blended edge pixel of the card at its fractional y). Like toHaveScreenshot, keep shooting
// until two consecutive frames are byte-identical; a bad frame is always a lone one between good ones.
const stableShot = async (board, file) => {
  let prev = await board.screenshot({ animations: 'disabled' });
  for (let k = 0; k < 8; k++) {
    const next = await board.screenshot({ animations: 'disabled' });
    if (next.equals(prev)) {
      if (k > 0) console.warn(`stableShot: ${file} needed ${k} retries`);
      return next;
    }
    prev = next;
  }
  throw new Error(`stableShot: ${file} never stabilised: 9 screenshots, no two consecutive frames identical`);
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
    await writeFile(`${outDir}/${tag}-${i + 1}.png`, await stableShot(board, `${tag}-${i + 1}.png`));
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
