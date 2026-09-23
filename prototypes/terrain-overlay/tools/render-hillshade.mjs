/**
 * render-hillshade.mjs — מרנדר שכבת הצללה (shaded relief) מאותו מודל גובה
 * שממנו חולצו הצורות.
 *
 * למה שכבה שלישית: התצ״א מראה **מה** יש בשטח (צמחייה, דרכים, מבנים) והמפה
 * מראה **את הגובה** בשפה מופשטת של קווים. ההצללה היא הגשר: היא מראה את
 * הגובה בשפה שהעין קוראת ישירות — אור וצל. לומד שמתקשה לתרגם קווי גובה
 * לתלת-ממד רואה כאן את אותו רכס בדיוק, מואר מצפון-מערב.
 *
 *   node tools/render-hillshade.mjs --area=gilboa
 */
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { ROOT, areasFromArgv, groundWidthM, flag, log, isMain } from './lib/geo.mjs';
import { loadElevationGrid } from './lib/dem.mjs';

const RAW = resolve(ROOT, 'tools', '.cache', 'raw');

/** רזולוציית הרינדור, קרובה לרזולוציה הטבעית של ה-DEM ברמת הזום הגבוהה. */
const G = 700;

/**
 * ההצללה נשלפת ברמת זום גבוהה יותר מזו ששימשה לחילוץ הצורות.
 *
 * לחילוץ הצורות רשת גסה היא יתרון: היא מחליקה רעש דגימה, וכך הפסגות והאוכפים
 * שנמצאים הם אמיתיים. להצללה היא אסון — ‎z14‎ נותן כ-8 מ׳ לתא, כלומר כ-290
 * דגימות אמיתיות לרוחב האזור, וכל הגדלה מהן מייצרת עננה מטושטשת במקום תבליט.
 * ‎z15‎ מכפיל את הרזולוציה, וזו הרמה הגבוהה ביותר ש-terrarium מספק.
 */
const MAX_DEM_ZOOM = 15;

/**
 * זוויות האור. הכיוון הראשי הוא 315° (צפון-מערב) — המוסכמה הקרטוגרפית, ולא
 * שרירותית: אור שמגיע מלמטה־ימין גורם ל״היפוך תבליט״, והמוח מפרש עמקים כרכסים.
 *
 * ארבעה כיוונים ולא אחד (hillshade רב-כיווני): מקור הגובה החופשי היחיד שמכסה
 * את האזור הוא SRTM ברזולוציית 30 מ׳ — כלומר כ-80 דגימות אמיתיות לרוחב האזור,
 * בלי קשר לרמת האריחים שנבקש. תאורה מכיוון יחיד על נתונים כאלה מייצרת עננה
 * אפורה. שילוב כיוונים מוציא גם את השלוחות שניצבות לכיוון האור הראשי.
 */
const LIGHTS = [
  { az: 315, w: 0.45 },
  { az: 270, w: 0.25 },
  { az: 360, w: 0.2 },
  { az: 225, w: 0.1 },
];
const ALTITUDE_DEG = 42;

/**
 * הגזמה אנכית. ‎1‎ נותן שטח שטוח לחלוטין ברזולוציה הזו — הגזמה בהצללה היא
 * נוהג קרטוגרפי מקובל ולא זיוף, כי המטרה היא לקרוא את **צורת** התבליט.
 */
const Z_FACTOR = 2.4;

/**
 * החלקה בינומית 3×3. הרשת נדגמה בילינארית מ-DEM גס יותר, ולכן היא מורכבת
 * ממשטחים שטוחים עם שברים חדים בגבולות. חישוב שיפוע ישירות עליה מייצר רשת
 * מלבנים גלויה — הפריט החזותי היחיד שההצללה לא אמורה להראות.
 */
function smooth(src, n, passes) {
  let a = src;
  for (let p = 0; p < passes; p++) {
    const b = new Float32Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let s = 0;
        let w = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const yy = Math.min(n - 1, Math.max(0, y + dy));
            const xx = Math.min(n - 1, Math.max(0, x + dx));
            const k = (dx === 0 ? 2 : 1) * (dy === 0 ? 2 : 1);
            s += a[yy * n + xx] * k;
            w += k;
          }
        }
        b[y * n + x] = s / w;
      }
    }
    a = b;
  }
  return a;
}

/** נוסחת Horn — התקן שבו משתמשים GDAL ו-ArcGIS. */
function hillshade(grid, n, cellSizeM) {
  const zen = ((90 - ALTITUDE_DEG) * Math.PI) / 180;
  const lights = LIGHTS.map((l) => ({ ...l, rad: ((360 - l.az + 90) * Math.PI) / 180 }));
  const raw = new Float32Array(n * n);
  const at = (x, y) => grid[Math.min(n - 1, Math.max(0, y)) * n + Math.min(n - 1, Math.max(0, x))];

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const a = at(x - 1, y - 1);
      const b = at(x, y - 1);
      const c = at(x + 1, y - 1);
      const d = at(x - 1, y);
      const f = at(x + 1, y);
      const g = at(x - 1, y + 1);
      const h = at(x, y + 1);
      const i = at(x + 1, y + 1);

      const dzdx = (c + 2 * f + i - (a + 2 * d + g)) / (8 * cellSizeM);
      const dzdy = (g + 2 * h + i - (a + 2 * b + c)) / (8 * cellSizeM);

      const slope = Math.atan(Z_FACTOR * Math.hypot(dzdx, dzdy));
      const aspect = Math.atan2(dzdy, -dzdx);

      let v = 0;
      for (const l of lights) {
        v +=
          l.w *
          Math.max(
            0,
            Math.cos(zen) * Math.cos(slope) +
              Math.sin(zen) * Math.sin(slope) * Math.cos(l.rad - aspect),
          );
      }
      raw[y * n + x] = v;
    }
  }
  return stretch(raw, n);
}

/**
 * מתיחת ניגודיות לאחוזונים 2–98.
 *
 * בלעדיה כל התמונה מצטופפת סביב הערך של "מישור מואר" והתוצאה אפורה אחידה:
 * הטווח התיאורטי של הנוסחה הוא 0..1, אבל שטח אמיתי משתמש בחלק קטן ממנו.
 * חיתוך באחוזונים ולא במינימום/מקסימום — פיקסל חריג יחיד היה גורר את כל
 * המתיחה אליו.
 */
function stretch(raw, n) {
  const sorted = Float32Array.from(raw).sort();
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)];
  const span = hi - lo || 1;
  const out = new Uint8Array(n * n);
  for (let i = 0; i < raw.length; i++) {
    /* רצפה של 0.1 במקום 0: צל שחור לגמרי בולע את הפרטים בצד המוצל, והצד
       המוצל הוא בדיוק הצד שממנו לומדים היכן המדרון תלול. */
    const t = 0.1 + 0.9 * Math.min(1, Math.max(0, (raw[i] - lo) / span));
    out[i] = Math.round(255 * t);
  }
  return out;
}

export async function renderHillshade(area, { force = false } = {}) {
  mkdirSync(RAW, { recursive: true });
  const out = resolve(RAW, `${area.id}-hillshade.png`);
  if (!force && existsSync(out)) {
    log(`[hillshade] ${area.id}: קיים — מדולג`);
    return out;
  }

  const fine = { ...area, demZoom: Math.min(MAX_DEM_ZOOM, area.demZoom + 1) };
  const { grid } = await loadElevationGrid(fine, G);
  const cell = groundWidthM(area) / G;
  /**
   * שני מעברי החלקה — כיול בין שני ארטיפקטים מנוגדים:
   * בלי החלקה, הקוונטיזציה האנכית של SRTM (מדרגות של מטר) מופיעה כרשת קווקוו
   * דקה שהמתיחה מגבירה; עם החלקה כבדה, השלוחות והגאיות הצרים — כלומר בדיוק מה
   * שהשכבה נועדה להראות — נמחקים יחד איתה.
   */
  const shaded = hillshade(smooth(grid, G, 2), G, cell);

  /* גווני אפור קרירים במקום אפור נייטרלי: השכבה יושבת בין תצ״א ירקרקה למפה
     חומה, וגוון קר מבדיל אותה משתיהן בלי להתחרות בהן. */
  const rgb = Buffer.alloc(G * G * 3);
  for (let i = 0; i < shaded.length; i++) {
    const v = shaded[i];
    rgb[i * 3] = Math.round(v * 0.97);
    rgb[i * 3 + 1] = Math.round(v * 0.99);
    rgb[i * 3 + 2] = Math.min(255, Math.round(v * 1.02 + 3));
  }

  await sharp(rgb, { raw: { width: G, height: G, channels: 3 } })
    .resize(area.masterWidth, area.masterWidth, { fit: 'fill', kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toFile(out);

  log(`[hillshade] ${area.id}: ${G}×${G} → ${area.masterWidth}px · תא ${cell.toFixed(1)} מ׳`);
  return out;
}

if (isMain(import.meta.url)) {
  const force = Boolean(flag('force', false));
  for (const area of areasFromArgv()) await renderHillshade(area, { force });
}
