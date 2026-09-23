/**
 * landforms.mjs — גלאי תשע צורות השטח הנוספות (L-05).
 *
 * העיקרון שמנחה את כל הקובץ: **צורה שאין לה מופע מובהק באזור פשוט אינה
 * מיוצרת.** כל גלאי מחזיר `null` כשהקריטריון הקרטוגרפי אינו מתקיים, ולא
 * "משהו קרוב". מצוק מזויף במישור החוף גרוע בהרבה מהיעדר מצוק: הלומד ילמד
 * ממנו שמצוק הוא כל מדרון, וזו בדיוק הטעות שהוא בא לתקן.
 *
 * הספים כאן הם קרטוגרפיים ולא שרירותיים — ראו הערה לצד כל אחד.
 */
import { sampler } from './dem.mjs';
import { contourAt, pointInPoly, decimateClosed, bounds, dist } from './geometry.mjs';

/** שיפוע ממוצע בחלון, ביחידות של מטר ירידה לכל מטר שטח. */
function windowSlope(gradAt, unitToM, cx, cy, radius, step = 12) {
  let sum = 0;
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let dy = -radius; dy <= radius; dy += step) {
    for (let dx = -radius; dx <= radius; dx += step) {
      const g = gradAt(cx + dx, cy + dy);
      const m = Math.hypot(g[0], g[1]);
      sum += m;
      const inv = m || 1;
      sx += g[0] / inv;
      sy += g[1] / inv;
      n++;
    }
  }
  return {
    slope: sum / n / unitToM,
    coherence: Math.hypot(sx, sy) / n,
  };
}

/** סורק חלונות ברשת ומחזיר את המועמדים המדורגים לפי ציון. */
function scanWindows(score, { from = 140, to = 860, step = 30 } = {}) {
  const out = [];
  for (let y = from; y <= to; y += step) {
    for (let x = from; x <= to; x += step) {
      const s = score(x, y);
      if (s !== null && Number.isFinite(s)) out.push({ x, y, score: s });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

const away = (taken, gap) => (p) => !taken.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < gap);

/* =========================== מצוק =========================== */

/**
 * מצוק — הקטע שבו קווי הגובה מתלכדים.
 *
 * הסף: שיפוע ממוצע של 45% (כ-24°) על חלון של 60 יחידות. מתחת לזה מדובר
 * במדרון תלול, וההבחנה בין השניים היא בדיוק מה שהצורה הזו מלמדת. הדרישה
 * ללכידות (coherence) מוציאה שטח משונן שבו השיפוע גבוה אך הכיוון מתחלף —
 * שם אין "פני מצוק" אחד שאפשר להצביע עליו.
 */
export function findCliff(grid, G, unitToM, taken = []) {
  const { gradAt, elevAt } = sampler(grid, G);
  const R = 60;
  const cands = scanWindows((x, y) => {
    const w = windowSlope(gradAt, unitToM, x, y, R);
    if (w.slope < 0.45 || w.coherence < 0.55) return null;
    return w.slope * w.coherence;
  }).filter(away(taken, 130));

  if (!cands.length) return null;
  const best = cands[0];
  const w = windowSlope(gradAt, unitToM, best.x, best.y, R);
  return {
    x: best.x,
    y: best.y,
    elev: Math.round(elevAt(best.x, best.y)),
    slopePct: Math.round(w.slope * 100),
    /* זווית המדרון במעלות — המספר שמדריך שטח מדבר בו */
    degrees: Math.round((Math.atan(w.slope) * 180) / Math.PI),
  };
}

/* =========================== מישור =========================== */

/**
 * מישור — היעדר קווי גובה הוא בעצמו מידע.
 *
 * הסף: שיפוע ממוצע מתחת ל-3% (כ-1.7°) על חלון רחב של 110 יחידות. חלון צר
 * יותר היה מוצא "מישור" על כל מדף קטן בתוך מדרון.
 */
export function findPlain(grid, G, unitToM, taken = []) {
  const { gradAt, elevAt } = sampler(grid, G);
  const R = 110;
  const cands = scanWindows((x, y) => {
    const w = windowSlope(gradAt, unitToM, x, y, R, 18);
    if (w.slope > 0.03) return null;
    return 1 / (w.slope + 0.001);
  }).filter(away(taken, 150));

  if (!cands.length) return null;
  const best = cands[0];
  const w = windowSlope(gradAt, unitToM, best.x, best.y, R, 18);
  return {
    x: best.x,
    y: best.y,
    elev: Math.round(elevAt(best.x, best.y)),
    slopePct: Math.max(0, Math.round(w.slope * 1000) / 10),
  };
}

/* =========================== בקעה / עמק =========================== */

/**
 * בקעה — שטח נמוך **רחב** בין גבהים, עם רצפה שטוחה.
 *
 * שני תנאים יחד, וזה מה שמפריד אותה מגיא: הרצפה שטוחה (שיפוע < 6%),
 * והסביבה במרחק 200 יחידות גבוהה ממנה לפחות ב-8 מרווחי קונטור. גיא הוא
 * צר ומשופע; בקעה היא רחבה ושטוחה.
 */
export function findBasin(grid, G, unitToM, relief, taken = []) {
  const { gradAt, elevAt } = sampler(grid, G);
  const R = 90;

  /**
   * שני הפרמטרים כאן נמדדו, לא נבחרו.
   *
   * **רדיוס הבדיקה 290 יחידות** ולא 170: סריקת מרחב הפרמטרים על עמק יזרעאל
   * הראתה 25% כיוונים מתרוממים ברדיוס 170 מול 50% ברדיוס 290. הסיבה פשוטה —
   * בקעה היא צורה רחבה, ובדיקה קרובה מדי עדיין נמצאת בתוך הרצפה שלה עצמה.
   *
   * **סף העלייה נגזר מהתבליט ולא ממרווח הקונטור.** המרווח עצמו נגזר מהתבליט,
   * ולכן שימוש בו הוא מעגלי: במישור החוף (תבליט 43 מ׳, מרווח 2 מ׳) הסף היה
   * יורד ל-6 מ׳, ורכס כורכר בודד היה הופך את כל המישור ל״בקעה״.
   */
  const RISE = Math.max(20, relief * 0.12);
  const PROBE = 290;

  const cands = scanWindows(
    (x, y) => {
      const w = windowSlope(gradAt, unitToM, x, y, R, 18);
      if (w.slope > 0.06) return null;
      const here = elevAt(x, y);
      // כמה מכיווני המצפן עולים משמעותית מעל הרצפה
      let higher = 0;
      let total = 0;
      for (let a = 0; a < 360; a += 30) {
        const rad = (a * Math.PI) / 180;
        const px = x + Math.cos(rad) * PROBE;
        const py = y + Math.sin(rad) * PROBE;
        if (px < 20 || px > 980 || py < 20 || py > 980) continue;
        total++;
        if (elevAt(px, py) - here > RISE) higher++;
      }
      /* לפחות מחצית הכיוונים מתרוממים. בקעה אמיתית פתוחה בכיוון אחד או שניים —
         שם יוצאים ממנה המים — ולכן דרישה להיקף סגור לגמרי פוסלת כל בקעה קיימת. */
      if (total < 5 || higher / total < 0.45) return null;
      return higher / total / (w.slope + 0.01);
    },
    { from: 170, to: 830, step: 35 },
  ).filter(away(taken, 130));

  if (!cands.length) return null;
  const best = cands[0];
  return { x: best.x, y: best.y, elev: Math.round(elevAt(best.x, best.y)), rise: RISE };
}

/* =========================== שקע / קער סגור =========================== */

/**
 * קער סגור — טבעות סגורות שיורדות פנימה. ההפך המדויק מכיפה, ולכן גם
 * הצורה שהכי קל לטעות בה: במפה שתיהן טבעות, וההבדל היחיד הוא כיוון הירידה.
 *
 * החיפוש הוא אחר מינימום מקומי שיש סביבו טבעת קונטור סגורה ברום **גבוה**
 * ממנו — כלומר גומה אמיתית, לא סתם נקודה נמוכה על מדרון.
 */
export function findDepression(grid, G, interval, taken = []) {
  const { elevAt } = sampler(grid, G);
  const Sc = 1000 / (G - 1);

  // מינימומים מקומיים בתוך התחום
  const mins = [];
  for (let i = 6; i < G - 6; i++) {
    for (let j = 6; j < G - 6; j++) {
      const c = grid[i * G + j];
      let isMin = true;
      for (let di = -3; di <= 3 && isMin; di++) {
        for (let dj = -3; dj <= 3; dj++) {
          if ((di || dj) && grid[(i + di) * G + (j + dj)] <= c) {
            isMin = false;
            break;
          }
        }
      }
      if (!isMin) continue;
      const x = Math.round(j * Sc);
      const y = Math.round(i * Sc);
      if (x < 130 || x > 870 || y < 130 || y > 870) continue;
      mins.push({ x, y, elev: c });
    }
  }
  mins.sort((a, b) => a.elev - b.elev);

  for (const m of mins.filter(away(taken, 120))) {
    for (let k = 1; k <= 4; k++) {
      const L = Math.ceil((m.elev + k * interval) / interval) * interval;
      const rings = contourAt(grid, G, L).filter(
        (c) => c.closed && c.points.length > 8 && pointInPoly([m.x, m.y], c.points),
      );
      if (!rings.length) continue;
      rings.sort((a, b) => a.points.length - b.points.length);
      const ring = decimateClosed(rings[0].points, 10);
      const b = bounds(ring);
      // גומה ולא אגן ענק שממלא את כל המפה
      if (b[2] - b[0] > 430 || b[3] - b[1] > 430) continue;
      /* אימות הכיוון: מרכז הטבעת חייב להיות **נמוך** מהטבעת עצמה. בלי
         הבדיקה הזו טבעת שמקיפה פסגה שכנה הייתה עוברת בתור שקע. */
      if (elevAt(m.x, m.y) >= L) continue;
      return {
        x: m.x,
        y: m.y,
        elev: Math.round(m.elev),
        ring,
        level: L,
        depth: Math.round(L - m.elev),
      };
    }
  }
  return null;
}

/* =========================== כתף / מדף =========================== */

/**
 * כתף — מדרגה מתונה בתוך מדרון תלול.
 *
 * הסימן במפה הוא ריווח: הקווים צפופים, פתאום מתרווחים, ושוב מצטופפים.
 * המדידה כאן היא בדיוק זו — יחס בין השיפוע בנקודה לשיפוע מעליה ומתחתיה
 * לאורך כיוון המורד. דורש שהמדרון מסביב יהיה תלול באמת (>20%), אחרת כל
 * גבשושית במישור נספרת ככתף.
 */
export function findShoulder(grid, G, unitToM, taken = []) {
  const { gradAt, elevAt } = sampler(grid, G);

  const cands = scanWindows(
    (x, y) => {
      const here = windowSlope(gradAt, unitToM, x, y, 34, 10);
      if (here.slope > 0.11) return null; // הכתף עצמה מתונה

      const g = gradAt(x, y);
      const m = Math.hypot(g[0], g[1]) || 1;
      // כיוון המורד, מנורמל
      const dx = (-g[0] / m) * 85;
      const dy = (-g[1] / m) * 85;
      const below = { x: x + dx, y: y + dy };
      const above = { x: x - dx, y: y - dy };
      if ([below, above].some((p) => p.x < 60 || p.x > 940 || p.y < 60 || p.y > 940)) return null;

      const sBelow = windowSlope(gradAt, unitToM, below.x, below.y, 34, 10).slope;
      const sAbove = windowSlope(gradAt, unitToM, above.x, above.y, 34, 10).slope;
      if (sBelow < 0.2 || sAbove < 0.2) return null; // מדרון תלול משני צדדיה
      return Math.min(sBelow, sAbove) / (here.slope + 0.01);
    },
    { from: 160, to: 840, step: 25 },
  ).filter(away(taken, 130));

  if (!cands.length) return null;
  const best = cands[0];

  /* השיפוע בכתף ובמדרון שמעליה נמדדים ומוחזרים: בלעדיהם הטקסט של הכתף היה
     הצורה היחידה מתשע החדשות בלי מספר שנגזר מהאזור — כלומר הערה זהה בכל
     שמונת האזורים. */
  const here = windowSlope(gradAt, unitToM, best.x, best.y, 34, 10);
  const g = gradAt(best.x, best.y);
  const m = Math.hypot(g[0], g[1]) || 1;
  const above = { x: best.x + (g[0] / m) * 85, y: best.y + (g[1] / m) * 85 };
  const wall = windowSlope(gradAt, unitToM, above.x, above.y, 34, 10);

  return {
    x: best.x,
    y: best.y,
    elev: Math.round(elevAt(best.x, best.y)),
    shelfPct: Math.max(1, Math.round(here.slope * 100)),
    wallPct: Math.max(1, Math.round(wall.slope * 100)),
  };
}

/* =========================== צוואר =========================== */

/**
 * צוואר — מעבר **צר** בין שני גבהים. ההבחנה מאוכף היא ברוחב בלבד, ולכן
 * הרוחב נמדד ולא מוערך: הליכה לשני הכיוונים הניצבים לציר המעבר עד שהגובה
 * עולה במרווח קונטור אחד. מתחת ל-90 יחידות (כ-200 מ׳ בשטח) זה צוואר.
 */
export function findNeck(grid, G, unitToM, saddles, interval, taken = []) {
  const { elevAt } = sampler(grid, G);

  const measure = (p) => {
    const base = elevAt(p.x, p.y);
    let best = Infinity;
    let bestAngle = 0;
    for (let a = 0; a < 180; a += 15) {
      const rad = (a * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const reach = (sign) => {
        for (let d = 8; d <= 220; d += 6) {
          const x = p.x + cos * d * sign;
          const y = p.y + sin * d * sign;
          if (x < 10 || x > 990 || y < 10 || y > 990) return d;
          if (elevAt(x, y) - base > interval) return d;
        }
        return Infinity;
      };
      const w = reach(1) + reach(-1);
      if (w < best) {
        best = w;
        bestAngle = a;
      }
    }
    return { width: best, angle: bestAngle };
  };

  const scored = saddles
    .filter(away(taken, 110))
    .filter((p) => p.x > 130 && p.x < 870 && p.y > 130 && p.y < 870)
    .map((p) => ({ ...p, ...measure(p) }))
    .filter((p) => Number.isFinite(p.width) && p.width < 90)
    .sort((a, b) => a.width - b.width);

  if (!scored.length) return null;
  const best = scored[0];
  return {
    x: best.x,
    y: best.y,
    elev: Math.round(elevAt(best.x, best.y)),
    widthM: Math.round(best.width * unitToM),
    angle: best.angle,
  };
}

/* =========================== ערוץ / אפיק =========================== */

/**
 * ערוץ — גיא **צר וחד**. שתי הצורות הן אותו קודקוד V במפה, וההבדל הוא
 * ברוחב הרצפה ובתלילות הדפנות. הערוץ נבחר מבין קודקודי ה-V שנותרו כזה
 * שדפנותיו התלולות ביותר ורוחבו הקטן ביותר.
 */
export function findChannel(grid, G, unitToM, valleys, interval, taken = []) {
  const { elevAt, gradAt } = sampler(grid, G);

  const width = (p) => {
    const base = elevAt(p.x, p.y);
    let best = Infinity;
    for (let a = 0; a < 180; a += 15) {
      const rad = (a * Math.PI) / 180;
      const reach = (sign) => {
        for (let d = 6; d <= 160; d += 4) {
          const x = p.x + Math.cos(rad) * d * sign;
          const y = p.y + Math.sin(rad) * d * sign;
          if (x < 10 || x > 990 || y < 10 || y > 990) return d;
          if (elevAt(x, y) - base > interval) return d;
        }
        return Infinity;
      };
      best = Math.min(best, reach(1) + reach(-1));
    }
    return best;
  };

  const scored = valleys
    .filter(away(taken, 100))
    .map((v) => {
      const w = width(v);
      const g = gradAt(v.x, v.y);
      return { ...v, width: w, wall: Math.hypot(g[0], g[1]) / unitToM };
    })
    /* רצפה צרה מ-70 יחידות (כ-160 מ׳) ודפנות תלולות מ-25% — מתחת לזה
       מדובר בגיא רחב, שכבר מיוצג בנפרד. */
    .filter((v) => Number.isFinite(v.width) && v.width < 70 && v.wall > 0.25)
    .sort((a, b) => b.wall / b.width - a.wall / a.width);

  if (!scored.length) return null;
  const best = scored[0];
  return {
    x: best.x,
    y: best.y,
    level: best.level,
    widthM: Math.round(best.width * unitToM),
    wallPct: Math.round(best.wall * 100),
  };
}

/* =========================== גבעה והר =========================== */

/**
 * מיון פסגות לפי **סולם**, לא לפי צורה.
 *
 * כיפה, גבעה והר חולקים אותה חתימה במפה — טבעות סגורות — וההבדל ביניהן הוא
 * גודל והקשר. לכן הן אינן שלוש בדיקות נפרדות אלא חלוקה אחת של אותה רשימת
 * פסגות, וכל פסגה מקבלת תפקיד אחד בלבד. באזור עם ראש בודד תיווצר "כיפה"
 * ותו לא — וזו התנהגות נכונה, לא חסר.
 *
 * הסף בין גבעה להר הוא 300 מ׳ בולטוּת: זו האמת-מידה המקובלת בעברית
 * גאוגרפית, והיא גם מה שעונה על שאלת המבחן "מתי גבעה הופכת להר".
 */
export function classifySummits(summits, relief = 0) {
  const sorted = summits.slice().sort((a, b) => (b.prominence ?? 0) - (a.prominence ?? 0));
  const roles = {};
  const used = [];
  const far = (p) => !used.some((q) => dist([q.x, q.y], [p.x, p.y]) < 150);
  const prom = (p) => p.prominence ?? 0;

  /**
   * סדר ההקצאה: הר → גבעה → כיפה, ולא הפוך.
   *
   * "הר" ו"גבעה" מוגדרים לפי סולם מדיד (בולטוּת), ואילו "כיפה" היא הצורה
   * הגנרית — ראש מעוגל. לכן שתי הראשונות תופסות ראשונות את מה שמתאים להן,
   * והכיפה מקבלת את מה שנותר. הסדר ההפוך גרם לכיפה לבלוע את הראש השני
   * ולא להשאיר לגבעה דבר — אומת על עמק יזרעאל, שבו ראש של 74 מ׳ בולטוּת
   * (גבעה מובהקת) סווג ככיפה.
   */
  const HILL_MIN = Math.max(20, relief * 0.04);

  const take = (id, pick) => {
    const p = sorted.find((c) => !used.includes(c) && far(c) && pick(c));
    if (!p) return;
    used.push(p);
    roles[id] = p;
  };

  take('mountain', (p) => prom(p) >= 300);
  take('hill', (p) => prom(p) >= HILL_MIN && prom(p) < 300);
  take('dome', () => true);

  return roles;
}
