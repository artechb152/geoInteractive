// QA for topic-02 „זיהוי סוגי תכסית בשטח” (LandCoverMap, realistic render).
//
//   QA_PORT=3001 node scripts/qa/shot-landcover.mjs [outDir]
//
// Checks (exit 1 on any failure): every region is a button whose hit area answers a click
// at its tag position (selection follows); only the active category's regions are in the
// tab order; every render layer loads (no broken <image>); no console errors; no horizontal
// scroll at 1440. Screenshots at 1440 × 1122: each category in winter and summer, a selected
// region, and the whole workspace.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = process.argv[2] ?? 'qa-output/landcover';
const URL = `http://localhost:${process.env.QA_PORT ?? 3000}/lessons/topic-02/#scene-landcover`;
await mkdir(outDir, { recursive: true });
const failures = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
};

const TABS = [
  { id: 'vegetation', label: 'צומח', regions: ['grove', 'garrigue', 'batha', 'planted'] },
  { id: 'human', label: 'פעילות האדם', regions: ['village', 'fields', 'orchard', 'terraces'] },
  { id: 'infra', label: 'תשתיות', regions: ['road', 'track', 'power', 'reservoir', 'fence'] },
];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1122 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
await page.goto(URL, { waitUntil: 'networkidle' });

const map = page.locator('#scene-landcover svg[role="group"]');
const workspace = page.locator('#scene-landcover .surface-elevated').first();
await workspace.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);

// every render layer decodes
const broken = await map.evaluate(async (svg) => {
  const hrefs = [...svg.querySelectorAll('image')].map((i) => i.getAttribute('href'));
  const bad = [];
  await Promise.all(
    hrefs.map(
      (h) =>
        new Promise((res) => {
          const img = new Image();
          img.onload = () => res();
          img.onerror = () => {
            bad.push(h);
            res();
          };
          img.src = h;
        }),
    ),
  );
  return { n: hrefs.length, bad };
});
check(broken.n === 28, `${broken.n} render layers in the map (expected 28)`);
check(broken.bad.length === 0, `broken layers: ${broken.bad.join(', ')}`);

const tab = (label) => page.getByRole('tab', { name: label });
const season = (label) => page.locator('#scene-landcover').getByRole('button', { name: label, exact: true });

for (const t of TABS) {
  await tab(t.label).click();
  await page.waitForTimeout(450);
  const focusable = await map.evaluate((svg) =>
    [...svg.querySelectorAll('[data-region]')].filter((g) => g.getAttribute('tabindex') === '0').map((g) => g.dataset.region),
  );
  check(
    JSON.stringify([...focusable].sort()) === JSON.stringify([...t.regions].sort()),
    `${t.id}: focusable regions ${focusable.join(',')} ≠ ${t.regions.join(',')}`,
  );
  for (const s of ['חורף', 'קיץ']) {
    await season(s).click();
    await page.waitForTimeout(900);
    await workspace.screenshot({ path: `${outDir}/${t.id}-${s === 'חורף' ? 'winter' : 'summer'}.png` });
  }
  await season('חורף').click();
  // a click on each region's tag point selects it (the hull, not the image, takes the click)
  for (const id of t.regions) {
    const g = map.locator(`[data-region="${id}"]`);
    await g.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const pt = await map.evaluate((svg, id) => {
      const path = svg.querySelector(`[data-region="${id}"] path`);
      const len = path.getTotalLength();
      const area = path.getAttribute('fill') === 'transparent';
      const box = path.getBBox();
      const p = area ? { x: box.x + box.width / 2, y: box.y + box.height * 0.72 } : path.getPointAtLength(len * (id === 'road' ? 0.6 : 0.37)); // road at 37% would sit under the power line
      const m = svg.getScreenCTM();
      return { x: p.x * m.a + m.e, y: p.y * m.d + m.f };
    }, id);
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(120);
    const pressed = await g.getAttribute('aria-pressed');
    check(pressed === 'true', `${id}: click at (${Math.round(pt.x)}, ${Math.round(pt.y)}) did not select it`);
  }
}

// a selection, for the record
await tab('צומח').click();
await page.waitForTimeout(400);
await map.locator('[data-region="planted"]').click();
await page.waitForTimeout(500);
await workspace.screenshot({ path: `${outDir}/selected-planted.png` });

// origin cards („תכסית טבעית / מלאכותית”) — both rendered vignettes decode
const originCard = page.locator('#scene-landcover .surface').first();
await originCard.evaluate((el) => el.scrollIntoView({ block: 'center' })); // clear of the sticky header
await page.waitForTimeout(400);
const vignettes = await originCard.evaluate(async (el) =>
  Promise.all(
    [...el.querySelectorAll('svg image')].map(
      (i) =>
        new Promise((res) => {
          const img = new Image();
          img.onload = () => res(img.naturalWidth);
          img.onerror = () => res(0);
          img.src = i.getAttribute('href');
        }),
    ),
  ),
);
check(vignettes.length === 2 && vignettes.every((w) => w === 352), `origin vignettes: ${JSON.stringify(vignettes)}`);
await originCard.screenshot({ path: `${outDir}/origin-cards.png` });

// „תצורות הצומח וגובהן” — the rendered ladder: 11 layers load, grows in, hover dims the other columns
const ladderCard = page.locator('#scene-landcover .surface-elevated').nth(1);
const ladder = ladderCard.locator('svg').first();
await ladderCard.scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
const ladderLayers = await ladder.evaluate((svg) =>
  [...svg.querySelectorAll('image')].map((i) => ({ href: i.getAttribute('href'), ok: i.getBBox().width > 0 })),
);
check(ladderLayers.length === 11, `${ladderLayers.length} ladder layers (expected 11)`);
await ladderCard.screenshot({ path: `${outDir}/ladder.png` });
await ladderCard.locator('li').nth(3).hover();
await page.waitForTimeout(450);
await ladderCard.screenshot({ path: `${outDir}/ladder-hover-grove.png` });

const scrollX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check(scrollX <= 0, `horizontal scroll: ${scrollX}px`);
check(errors.length === 0, `console errors: ${errors.join(' | ')}`);

await browser.close();
if (failures.length) {
  console.error('FAIL\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log(`OK — screenshots in ${outDir}`);
