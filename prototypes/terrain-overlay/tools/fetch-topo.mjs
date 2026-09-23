/**
 * fetch-topo.mjs — מוריד את שכבת המפה הטופוגרפית (OpenTopoMap) לאותו תחום
 * בדיוק של התצ״א. אריחי XYZ מורכבים למוזאיקה בדפדפן אמיתי ונחתכים ל-bbox:
 * כך האריחים נטענים עם User-Agent תקין ואין בעיית CORS/taint על canvas.
 *
 * רישוי: OpenTopoMap = CC-BY-SA (נתוני SRTM + © OpenStreetMap contributors).
 * הורדה חד-פעמית של אזורים קטנים לשימוש חינוכי, עם ייחוס מלא בממשק.
 *
 *   node tools/fetch-topo.mjs --area=gilboa
 */
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import {
  ROOT,
  areasFromArgv,
  bboxOf,
  tileRange,
  resolveBrowser,
  flag,
  log,
  isMain,
} from './lib/geo.mjs';

const RAW = resolve(ROOT, 'tools', '.cache', 'raw');
const SUBDOMAINS = ['a', 'b', 'c'];

export async function fetchTopo(area, { force = false } = {}) {
  mkdirSync(RAW, { recursive: true });
  const out = resolve(RAW, `${area.id}-topo.png`);
  if (existsSync(out) && !force) {
    log(`[topo] ${area.id}: קיים במטמון — דילוג`);
    return out;
  }

  const z = area.topoZoom;
  const t = tileRange(bboxOf(area), z);
  const cropW = Math.round(t.cropW);
  const cropH = Math.round(t.cropH);

  let imgs = '';
  let n = 0;
  for (let j = t.tileYmin; j <= t.tileYmax; j++) {
    for (let i = t.tileXmin; i <= t.tileXmax; i++) {
      const s = SUBDOMAINS[n++ % SUBDOMAINS.length];
      const left = (i - t.tileXmin) * 256 - t.offX;
      const top = (j - t.tileYmin) * 256 - t.offY;
      imgs +=
        `<img class="t" src="https://${s}.tile.opentopomap.org/${z}/${i}/${j}.png" ` +
        `style="left:${left}px;top:${top}px">`;
    }
  }

  const html = `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;background:#fff}
    #w{position:relative;width:${cropW}px;height:${cropH}px;overflow:hidden;background:#f7f4ee}
    .t{position:absolute;width:256px;height:256px;image-rendering:auto}
  </style><div id="w">${imgs}</div>`;

  log(`[topo] ${area.id}: ${t.count} אריחי OpenTopoMap z${z} → ${cropW}×${cropH}px`);

  const browser = await chromium.launch({ executablePath: resolveBrowser(), headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: Math.min(cropW, 1600), height: Math.min(cropH, 1600) },
      userAgent: 'terrain-map-simulator-edu/1.0 (educational, one-time area export)',
      deviceScaleFactor: 1,
    });
    await page.setContent(html, { waitUntil: 'load' });
    // המתנה עד שכל האריחים הושלמו — צילום מוקדם מדי מייצר חורים לבנים
    await page.waitForFunction(
      () => Array.from(document.images).every((i) => i.complete),
      undefined,
      { timeout: 120_000 },
    );
    await page.waitForTimeout(600);
    const missing = await page.evaluate(
      () => Array.from(document.images).filter((i) => !i.naturalWidth).length,
    );
    if (missing) log(`[topo] ${area.id}: אזהרה — ${missing} אריחים לא נטענו`);
    const shot = await (await page.$('#w')).screenshot({ type: 'png' });
    await sharp(shot)
      .resize(area.masterWidth, area.masterWidth, { fit: 'fill', kernel: 'lanczos3' })
      .png({ compressionLevel: 9 })
      .toFile(out);
    log(`[topo] ${area.id}: → ${out}`);
  } finally {
    await browser.close();
  }
  return out;
}

if (isMain(import.meta.url)) {
  const force = Boolean(flag('force', false));
  for (const area of areasFromArgv()) await fetchTopo(area, { force });
}
