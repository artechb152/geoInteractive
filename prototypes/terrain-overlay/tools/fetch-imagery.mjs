/**
 * fetch-imagery.mjs — מוריד את שכבת התצ״א (Esri World Imagery) לתחום של אזור.
 * שירות ArcGIS MapServer עם bbox ב-EPSG:3857 — אותו bbox בדיוק שבו משתמשים
 * fetch-topo ו-dem, ולכן שלוש השכבות חופפות פיקסל-אל-פיקסל.
 *
 *   node tools/fetch-imagery.mjs --area=gilboa
 *   node tools/fetch-imagery.mjs --all
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, areasFromArgv, bboxOf, fetchRetry, flag, log, isMain } from './lib/geo.mjs';

const RAW = resolve(ROOT, 'tools', '.cache', 'raw');

export async function fetchImagery(area, { force = false } = {}) {
  mkdirSync(RAW, { recursive: true });
  const out = resolve(RAW, `${area.id}-aerial.png`);
  if (existsSync(out) && !force) {
    log(`[aerial] ${area.id}: קיים במטמון — דילוג (‎--force‎ כדי להוריד מחדש)`);
    return out;
  }
  const b = bboxOf(area);
  const bbox = [b.xmin, b.ymin, b.xmax, b.ymax].join(',');
  const size = `${area.masterWidth},${area.masterWidth}`;
  const url =
    'https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export' +
    `?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=${size}&format=png&transparent=false&f=image`;

  const res = await fetchRetry(url);
  const ct = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  if (!ct.includes('image')) {
    throw new Error(
      `[aerial] ${area.id}: תשובה שאינה תמונה (${ct}) — ${buf.toString('utf8').slice(0, 200)}`,
    );
  }
  writeFileSync(out, buf);
  log(`[aerial] ${area.id}: ${(buf.length / 1024).toFixed(0)}KB → ${out}`);
  return out;
}

if (isMain(import.meta.url)) {
  const force = Boolean(flag('force', false));
  for (const area of areasFromArgv()) await fetchImagery(area, { force });
}
