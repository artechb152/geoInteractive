/**
 * gen-elevation.mjs — מייצא את רשת הגבהים של כל אזור למודול נפרד, לשימוש
 * כלי חתך הגובה (L-11).
 *
 * שלוש החלטות שנבעו מהמדידה, לא מהעדפה:
 *
 * 1. **מודול נפרד לכל אזור** ולא שדה בתוך `src/data/areas/<id>.ts` — הרשת
 *    שוקלת פי כמה מכל שאר נתוני האזור, והיא דרושה רק ללומד שפתח את כלי
 *    החתך. ייבוא דינמי מפצל אותה לחתיכה משלה שנטענת לפי דרישה.
 *
 * 2. **128×128** — מרווח של כ-18 מ׳ בשטח. רשת גסה יותר "מיישרת" ערוץ צר,
 *    שהוא בדיוק מה שהחתך אמור להראות; רשת צפופה יותר משלמת במשקל בלי להוסיף
 *    מידע, כי ה-DEM עצמו הוא ברזולוציית 8–10 מ׳.
 *
 * 3. **Uint16 מקוונטט על טווח האזור** ולא Float32 — דיוק של relief/65535,
 *    כלומר פחות מסנטימטר בכל אזור שיש כאן. חצי מהמשקל, בלי הפסד מדיד.
 *
 *   node tools/gen-elevation.mjs --area=gilboa
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, areasFromArgv, groundWidthM, log, isMain } from './lib/geo.mjs';
import { loadElevationGrid } from './lib/dem.mjs';

const OUT = resolve(ROOT, 'src', 'data', 'elevation');
const N = 128;

export async function genElevation(areaCfg) {
  const { grid } = await loadElevationGrid(areaCfg, N);

  let min = Infinity;
  let max = -Infinity;
  for (const v of grid) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;

  const buf = Buffer.alloc(N * N * 2);
  for (let i = 0; i < grid.length; i++) {
    buf.writeUInt16LE(Math.round(((grid[i] - min) / span) * 65535), i * 2);
  }

  mkdirSync(OUT, { recursive: true });
  const payload = {
    size: N,
    min: Number(min.toFixed(2)),
    span: Number(span.toFixed(2)),
    groundWidthM: groundWidthM(areaCfg),
    data: buf.toString('base64'),
  };

  const src =
    `/* eslint-disable */\n` +
    `/**\n * רשת גבהים ${N}×${N} של ${areaCfg.id} — נוצר אוטומטית ע"י tools/gen-elevation.mjs.\n` +
    ` * אין לערוך ידנית. מיובא דינמית ע"י כלי חתך הגובה בלבד.\n */\n` +
    `import type { ElevationGridData } from '../types';\n\n` +
    `const grid: ElevationGridData = ${JSON.stringify(payload)};\n\n` +
    `export default grid;\n`;

  writeFileSync(resolve(OUT, `${areaCfg.id}.ts`), src, 'utf8');
  log(
    `[elev] ${areaCfg.id}: ${N}×${N} · ${min.toFixed(0)}–${max.toFixed(0)} מ׳ · ` +
      `${(payload.data.length / 1024).toFixed(0)}KB base64`,
  );
  return payload;
}

if (isMain(import.meta.url)) {
  for (const area of areasFromArgv()) await genElevation(area);
}
