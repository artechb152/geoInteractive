/**
 * extract-features.mjs — מחלץ את גאומטריית צורות השטח מתוך מודל הגובה של
 * אזור נתון. אין כאן שום קואורדינטה שנכתבה ביד: כל צורה מאותרת מהשטח עצמו
 * לפי הקריטריון הקרטוגרפי שלה, ולכן אותו קוד עובד על כל אזור.
 *
 *   כיפה   — טבעות קונטור סגורות סביב הפסגה
 *   רכס    — ציר דרך הפסגות, נצמד לגב בפועל
 *   אוכף   — הנקודה הנמוכה על הציר בין שתי הפסגות + ״פרפר״ אמיתי
 *   מדרון  — קונטורים מקבילים באזור התלול ביותר
 *   שלוחה  — קודקוד U (קמירות בכיוון המורד)
 *   גיא    — קודקוד V (קמירות בכיוון המעלה)
 *   קווי גובה — חלון שבו הקווים נקיים ורציפים
 *
 *   node tools/extract-features.mjs --area=gilboa
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, areasFromArgv, groundWidthM, log, isMain } from './lib/geo.mjs';
import {
  loadElevationGrid,
  sampler,
  analyze,
  findCol,
  findBends,
  findCleanSlopeWindow,
} from './lib/dem.mjs';
import {
  findCliff,
  findPlain,
  findBasin,
  findDepression,
  findShoulder,
  findNeck,
  findChannel,
  classifySummits,
} from './lib/landforms.mjs';
import {
  contourAt,
  rdp,
  decimateClosed,
  smooth,
  smoothClosed,
  path,
  clipToBox,
  pointInPoly,
  hull,
  expand,
  offsetBand,
  bounds,
  polyArea,
  dist,
} from './lib/geometry.mjs';

const OUT = resolve(ROOT, 'tools', '.cache', 'features');

/* ------------------------------ עזרי חילוץ ------------------------------ */

/** הטבעת הסגורה הקטנה ביותר ברום L שמקיפה את הנקודה. */
function ringAround(grid, G, L, pt) {
  const rings = contourAt(grid, G, L).filter(
    (c) => c.closed && c.points.length > 6 && pointInPoly(pt, c.points),
  );
  if (!rings.length) return null;
  rings.sort((a, b) => a.points.length - b.points.length);
  return decimateClosed(rings[0].points, 10);
}

/** קטעי קווי גובה בתוך תיבה, מדורגים לפי אורך. */
function linesInBox(grid, G, levels, B, { minLen = 38, nearPt = null, nearD = 90 } = {}) {
  const out = [];
  for (const L of levels) {
    for (const ch of contourAt(grid, G, L)) {
      for (const run of clipToBox(ch, B)) {
        let len = 0;
        for (let i = 1; i < run.length; i++) len += dist(run[i - 1], run[i]);
        if (len < minLen) continue;
        if (nearPt) {
          let md = Infinity;
          for (const p of run) md = Math.min(md, dist(p, nearPt));
          if (md > nearD) continue;
        }
        out.push({ pts: rdp(run, 1.4), len, level: L });
      }
    }
  }
  out.sort((a, b) => b.len - a.len);
  return out;
}

/**
 * מצמצם מצולע לגבולות ה-viewBox.
 *
 * ‎`expand()`‎ מנפח את הקמור ב-10 יחידות לכל כיוון, וקו גובה שנוגע בשפת
 * המפה יוצא בעקבותיו אל מחוץ לתחום. התוצאה: חלק מאזור הלחיצה נחתך ע"י
 * ‎`overflow: hidden`‎ של המסגרת ואינו ניתן ללחיצה, והמתאר נראה קטוע בשפה.
 * נמדד: עד 28 יחידות חריגה במישור החוף וברכס הגלבוע.
 */
const clampPoly = (poly) =>
  poly.map((p) => [Math.max(2, Math.min(998, p[0])), Math.max(2, Math.min(998, p[1]))]);

/** בונה צורת-קו: אזור לחיץ = קמור מורחב סביב הקווים המודגשים. */
function lineFeature(id, lines, labelPoint, extra = {}) {
  const flat = lines.flatMap((l) => l.pts);
  if (flat.length < 4) return null;
  const poly = clampPoly(expand(hull(flat), 10));
  return {
    id,
    showOutline: false,
    hitPath: path(poly, true),
    hitArea: Math.round(polyArea(poly)),
    accentPaths: lines.map((l) => smooth(l.pts)),
    labelPoint,
    ...extra,
  };
}

/** ניסוח מניין בעברית — "פסגה אחת" / "שתי פסגות" / "4 פסגות". */
const fem = (n, one, many) => (n === 1 ? `${one} אחת` : n === 2 ? `שתי ${many}` : `${n} ${many}`);
const masc = (n, one, many) => (n === 1 ? `${one} אחד` : n === 2 ? `שני ${many}` : `${n} ${many}`);

const clampPoint = (p) => ({
  x: Math.max(60, Math.min(940, Math.round(p.x ?? p[0]))),
  y: Math.max(60, Math.min(940, Math.round(p.y ?? p[1]))),
});

/* ------------------------------- החילוץ ------------------------------- */

export async function extractFeatures(area) {
  const G = 300;
  const { grid } = await loadElevationGrid(area, G);
  const stats = analyze(grid, G);
  const { elevAt, gradAt, downAngle } = sampler(grid, G);
  const gw = groundWidthM(area);
  const unitToM = gw / 1000; // יחידת viewBox → מטרים בקרקע

  log(
    `[extract] ${area.id}: גובה ${stats.min}–${stats.max} מ׳ (תבליט ${stats.relief}), ` +
      `מרווח ${stats.interval} מ׳, ${stats.peaks.length} פסגות, ${stats.saddles.length} אוכפים`,
  );

  const I = stats.interval;
  const features = [];
  const anchors = [];
  const facts = {
    interval: I,
    min: stats.min,
    max: stats.max,
    relief: stats.relief,
    peakCount: stats.peaks.length,
    saddleCount: stats.saddles.length,
    peaksText: fem(stats.peaks.length, 'פסגה', 'פסגות'),
    headsText: masc(stats.peaks.length, 'ראש', 'ראשים'),
    groundWidthM: gw,
  };

  /* --- כיפה: טבעות סגורות סביב פסגה --- */
  {
    /**
     * פסגה על שפת המפה אינה מועמדת: קווי הגובה סביבה נחתכים בגבול התחום
     * ולכן לעולם אינם נסגרים לטבעת — וטבעת סגורה היא בדיוק מה שהלומד אמור
     * לזהות. לכן מחפשים את הפסגה הגבוהה ביותר שנמצאת בתוך התחום.
     */
    const inside = (p) => p.x > 105 && p.x < 895 && p.y > 105 && p.y < 895;
    // גיבוי אחרון: הנקודה הגבוהה ביותר בתוך התחום, גם אם אינה מקסימום מקומי
    // חד — באזור שכל פסגותיו על השוליים זה המועמד היחיד שנותר.
    let top = null;
    for (let y = 150; y <= 850; y += 10) {
      for (let x = 150; x <= 850; x += 10) {
        const e = elevAt(x, y);
        if (!top || e > top.elev) top = { x, y, elev: Math.round(e) };
      }
    }
    const candidates = [
      ...stats.peaks.filter(inside),
      ...(stats.allPeaks ?? []).filter((p) => inside(p) && !stats.peaks.includes(p)),
      ...(top ? [top] : []),
    ];
    for (const summit of candidates) {
      const rings = [];
      const levels = [];
      for (let k = 1; k <= 14 && rings.length < 3; k++) {
        const L = Math.round((summit.elev - k * I) / I) * I;
        if (L <= stats.min) break;
        const r = ringAround(grid, G, L, [summit.x, summit.y]);
        if (!r || r.length < 6) continue;
        const b = bounds(r);
        if (b[2] - b[0] > 460 || b[3] - b[1] > 460) break; // טבעת רחבה מדי = כבר לא כיפה
        rings.unshift(r); // הגדולה ראשונה
        levels.unshift(L);
      }
      if (!rings.length) continue;
      const outer = rings[0];
      features.push({
        id: 'dome',
        showOutline: true,
        hitPath: smoothClosed(clampPoly(outer)),
        hitArea: Math.round(polyArea(outer)),
        accentPaths: rings.slice(1).map(smoothClosed),
        labelPoint: clampPoint({ x: summit.x, y: summit.y }),
        elevation: summit.elev,
      });
      anchors.push({ x: summit.x, y: summit.y });
      facts.domeElev = summit.elev;
      facts.domeAboveMin = Math.max(I, summit.elev - stats.min);
      // בולטוּת: כמה צריך לרדת מהראש כדי להגיע אל שטח גבוה ממנו
      facts.domeProminence = Math.max(I, summit.prominence ?? summit.elev - levels[0]);
      break;
    }
    if (facts.domeElev === undefined) log(`[extract] ${area.id}: לא נמצאה כיפה עם טבעות סגורות`);
  }

  /* --- קו רכס: ציר דרך הפסגות, נצמד לגב בפועל --- */
  const chain = [];
  if (stats.peaks.length >= 2) {
    const pool = stats.peaks.slice(0, 4).map((p) => ({ ...p }));
    chain.push(pool.shift());
    for (;;) {
      let best = null;
      for (const p of pool) {
        const a = chain[chain.length - 1];
        const d = Math.hypot(p.x - a.x, p.y - a.y);
        // הקטע חייב לרוץ על שטח גבוה — אחרת אלו שני רכסים נפרדים
        let low = Infinity;
        for (let s = 0; s <= 1; s += 0.05) {
          low = Math.min(low, elevAt(a.x + (p.x - a.x) * s, a.y + (p.y - a.y) * s));
        }
        const floor = Math.min(a.elev, p.elev) - 0.4 * stats.relief;
        if (low < floor) continue;
        if (!best || d < best.d) best = { p, d };
      }
      if (!best) break;
      chain.push(best.p);
      pool.splice(pool.indexOf(best.p), 1);
    }
  }
  if (chain.length >= 2) {
    // דגימה צפופה + הצמדה מקומית לגב (החיפוש בניצב לציר)
    const crest = [];
    for (let i = 0; i < chain.length - 1; i++) {
      const a = chain[i];
      const b = chain[i + 1];
      const steps = Math.max(3, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 28));
      const nx = -(b.y - a.y);
      const ny = b.x - a.x;
      const nl = Math.hypot(nx, ny) || 1;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const px = a.x + (b.x - a.x) * t;
        const py = a.y + (b.y - a.y) * t;
        let bx = px;
        let by = py;
        let be = elevAt(px, py);
        for (let o = -34; o <= 34; o += 4) {
          const qx = px + (nx / nl) * o;
          const qy = py + (ny / nl) * o;
          const e = elevAt(qx, qy);
          if (e > be) {
            be = e;
            bx = qx;
            by = qy;
          }
        }
        crest.push([bx, by]);
      }
    }
    crest.push([chain[chain.length - 1].x, chain[chain.length - 1].y]);
    const simple = rdp(crest, 3);
    const band = clampPoly(offsetBand(simple, 16));
    let len = 0;
    for (let i = 1; i < simple.length; i++) len += dist(simple[i - 1], simple[i]);
    const mid = simple[Math.floor(simple.length / 2)];
    features.push({
      id: 'ridge',
      showOutline: true,
      hitPath: path(band, true),
      hitArea: Math.round(polyArea(band)),
      accentPaths: [smooth(simple)],
      labelPoint: clampPoint({ x: mid[0], y: mid[1] - 22 }),
    });
    anchors.push({ x: mid[0], y: mid[1] });
    facts.ridgeLenM = Math.round((len * unitToM) / 10) * 10;
    facts.ridgePeaksText = fem(chain.length, 'פסגה', 'פסגות');
  }

  /* --- אוכף: הנקודה הנמוכה על הציר בין שתי הפסגות --- */
  if (chain.length >= 2) {
    const a = chain[0];
    const b = chain[1];
    const col = findCol(grid, G, a, b);
    const bowLevel = Math.round((col.elev + I) / I) * I;
    const box = [col.x - 62, col.y - 58, col.x + 62, col.y + 58];
    const bow = linesInBox(grid, G, [bowLevel, bowLevel + I], box, {
      minLen: 20,
      nearPt: [col.x, col.y],
      nearD: 72,
    }).slice(0, 2);
    /* מרכז האליפסה נדחף פנימה כך שכולה נשארת בתחום: אוכף שיושב סמוך לשפה
       ייצר אחרת אזור לחיצה שחלקו נחתך ע"י מסגרת המפה. */
    const rx = 44;
    const ry = 33;
    const cx = Math.max(rx + 2, Math.min(998 - rx, col.x));
    const cy = Math.max(ry + 2, Math.min(998 - ry, col.y));
    const hit =
      `M${cx - rx},${cy} A${rx},${ry} 0 1,0 ${cx + rx},${cy} ` +
      `A${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`;
    features.push({
      id: 'saddle',
      showOutline: true,
      hitPath: hit,
      hitArea: Math.round(Math.PI * rx * ry),
      accentPaths:
        bow.length >= 2
          ? bow.map((l) => smooth(l.pts))
          : [
              `M${col.x - 30},${col.y - 24} Q${col.x},${col.y + 3} ${col.x + 30},${col.y - 24}`,
              `M${col.x - 30},${col.y + 24} Q${col.x},${col.y - 3} ${col.x + 30},${col.y + 24}`,
            ],
      labelPoint: clampPoint(col),
      elevation: col.elev,
    });
    anchors.push({ x: col.x, y: col.y });
    facts.saddleElev = col.elev;
    facts.peakA = a.elev;
    facts.peakB = b.elev;
    facts.saddleDrop = Math.max(1, a.elev - col.elev);
  }

  /* --- מדרון: המשטח המשופע האחיד ביותר --- */
  {
    const w =
      findCleanSlopeWindow(grid, G, anchors, { magPower: 2, radius: 90, gap: 130 }) ??
      stats.steepest;
    const s = { x: w.x, y: w.y, elev: Math.round(elevAt(w.x, w.y)) };
    const box = [s.x - 105, s.y - 105, s.x + 105, s.y + 105];
    const levels = [];
    for (let k = -3; k <= 3; k++) levels.push(Math.round((s.elev + k * I) / I) * I);
    const lines = linesInBox(grid, G, levels, box, { minLen: 55 }).slice(0, 3);
    const f = lines.length
      ? lineFeature('slope', lines, clampPoint({ x: s.x, y: s.y }), {
          flowArrow: { x: s.x, y: s.y, angle: downAngle(s.x, s.y) },
        })
      : null;
    if (f) {
      features.push(f);
      anchors.push({ x: s.x, y: s.y });
      // השיפוע נמדד מהגרדיאנט הממוצע של ה-DEM על פני כל הקטע המודגש
      // (מטר ירידה לכל מטר שטח), ולא מהמרחק בין שני קווים מצוירים —
      // מדידה על הקווים תלויה באורכם ובעיקוליהם ולכן אינה יציבה.
      let acc = 0;
      let n = 0;
      for (let dy = -80; dy <= 80; dy += 20) {
        for (let dx = -80; dx <= 80; dx += 20) {
          const g = gradAt(s.x + dx, s.y + dy);
          acc += Math.hypot(g[0], g[1]);
          n++;
        }
      }
      const frac = acc / n / unitToM; // מטר ירידה לכל מטר שטח
      const spread = lines.map((l) => l.level);
      const drop = Math.max(I, Math.max(...spread) - Math.min(...spread));
      facts.slopeDrop = Math.round(drop);
      facts.slopePct = Math.max(1, Math.round(frac * 100));
      facts.slopeRunM = Math.max(5, Math.round(drop / frac / 5) * 5);
    }
  }

  /* --- שלוחה וגיא: קודקודי U/V מובהקים --- */
  const bends = findBends(grid, G, stats);
  for (const [id, list] of [
    ['spur', bends.spurs],
    ['valley', bends.valleys],
  ]) {
    const pick = list.find((c) => !anchors.some((a) => Math.hypot(a.x - c.x, a.y - c.y) < 95));
    if (!pick) {
      log(`[extract] ${area.id}: לא נמצא מופע מובהק ל-${id}`);
      continue;
    }
    const box = [pick.x - 95, pick.y - 82, pick.x + 95, pick.y + 88];
    const levels = [pick.level - I, pick.level, pick.level + I, pick.level + 2 * I];
    const lines = linesInBox(grid, G, levels, box, {
      minLen: 34,
      nearPt: [pick.x, pick.y],
      nearD: 82,
    }).slice(0, 3);
    const dy = id === 'spur' ? -8 : 10;
    const f = lineFeature('__', lines, clampPoint({ x: pick.x, y: pick.y + dy }), {
      flowArrow: { x: pick.x, y: pick.y, angle: downAngle(pick.x, pick.y) },
    });
    if (!f) continue;
    f.id = id;
    f.elevation = pick.level;
    features.push(f);
    anchors.push({ x: pick.x, y: pick.y });
    facts[id === 'spur' ? 'spurElev' : 'valleyElev'] = pick.level;
  }

  /* --- קווי גובה: חלון נקי ורציף --- */
  {
    const w = findCleanSlopeWindow(grid, G, anchors, { magPower: 0.5, radius: 100 });
    if (w) {
      const base = Math.round(elevAt(w.x, w.y) / I) * I;
      const levels = [];
      for (let k = -3; k <= 3; k++) levels.push(base + k * I);
      const box = [w.x - 130, w.y - 118, w.x + 130, w.y + 118];
      const lines = linesInBox(grid, G, levels, box, { minLen: 60 }).slice(0, 4);
      const f = lines.length
        ? lineFeature('contours', lines, clampPoint({ x: w.x, y: w.y + 110 }))
        : null;
      if (f) features.push(f);
    }
  }

  /* ======================= תשע הצורות הנוספות (L-05) ======================= */

  /** בונה צורת-שטח סביב נקודה: קווי הגובה שסביבה + אזור לחיצה קמור. */
  const areaFeature = (id, pt, { box = 105, levels = 3, minLen = 40, dy = 0, extra = {} } = {}) => {
    const base = Math.round(elevAt(pt.x, pt.y) / I) * I;
    const ls = [];
    for (let k = -levels; k <= levels; k++) ls.push(base + k * I);
    const B = [pt.x - box, pt.y - box, pt.x + box, pt.y + box];
    const lines = linesInBox(grid, G, ls, B, { minLen, nearPt: [pt.x, pt.y], nearD: box }).slice(
      0,
      4,
    );
    const f = lineFeature(id, lines, clampPoint({ x: pt.x, y: pt.y + dy }), extra);
    if (f) {
      features.push(f);
      anchors.push({ x: pt.x, y: pt.y });
    }
    return f;
  };

  /* --- גבעה והר: אותה חתימה ככיפה, בסולם אחר --- */
  {
    const summits = (stats.allPeaks ?? stats.peaks).filter(
      (p) => p.x > 120 && p.x < 880 && p.y > 120 && p.y < 880,
    );
    const roles = classifySummits(summits, stats.relief);
    const domeFeature = features.find((f) => f.id === 'dome');
    const near = (a, b) => a && b && Math.hypot(a.x - b.x, a.y - b.y) < 150;

    /**
     * הראש שכבר נבחר ככיפה עשוי להיות, לפי הסולם, **הר**.
     * במקרה כזה משנים לו את התפקיד במקום לוותר עליו: הר תבור הוא הר, ותיוגו
     * ככיפה בלבד מסתיר מהלומד בדיוק את ההבחנה שהוא בא ללמוד. הכיפה עוברת
     * אז לראש המשני, אם יש כזה.
     */
    if (roles.mountain && domeFeature && near(domeFeature.labelPoint, roles.mountain)) {
      domeFeature.id = 'mountain';
      facts.mountainElev = roles.mountain.elev;
      facts.mountainProminence = Math.round(roles.mountain.prominence ?? 0);
      delete roles.mountain;
    }

    /**
     * ההתנגשות נבדקת מול ראשים שכבר תויגו בלבד, ולא מול כל עוגן.
     *
     * `anchors` מכיל גם צורות-קו — קו הרכס, השלוחה, האוכף — וקו רכס עובר
     * מעצם הגדרתו דרך הפסגות. בדיקה מולו פסלה כל גבעה שיושבת על הרכס,
     * כלומר כמעט כל גבעה. אומת: עמק יזרעאל, שבו ראש של 74 מ׳ בולטוּת נפסל
     * מפני שקו הרכס עובר דרכו.
     */
    const summitAnchors = features
      .filter((f) => ['dome', 'mountain', 'hill'].includes(f.id))
      .map((f) => f.labelPoint);

    for (const [id, summit] of Object.entries(roles)) {
      if (features.some((f) => f.id === id)) continue;
      if (summitAnchors.some((a) => near(a, summit))) continue;
      // טבעת סגורה סביב הראש: יורדים מרווח־מרווח עד שנמצאת אחת
      let ring = null;
      for (let k = 1; k <= 6 && !ring; k++) {
        const L = Math.round((summit.elev - k * I) / I) * I;
        if (L <= stats.min) break;
        const r = ringAround(grid, G, L, [summit.x, summit.y]);
        if (!r || r.length < 6) continue;
        const b = bounds(r);
        if (b[2] - b[0] > 520 || b[3] - b[1] > 520) break;
        ring = r;
      }
      if (!ring) {
        log(`[extract] ${area.id}: אין טבעת סגורה סביב ה-${id}`);
        continue;
      }
      const feature = {
        id,
        showOutline: true,
        hitPath: smoothClosed(clampPoly(ring)),
        hitArea: Math.round(polyArea(ring)),
        labelPoint: clampPoint({ x: summit.x, y: summit.y }),
        elevation: summit.elev,
      };
      features.push(feature);
      summitAnchors.push(feature.labelPoint);
      anchors.push({ x: summit.x, y: summit.y });
      facts[`${id}Elev`] = summit.elev;
      facts[`${id}Prominence`] = Math.round(summit.prominence ?? 0);
    }
  }

  /* --- מצוק --- */
  {
    const c = findCliff(grid, G, unitToM, anchors);
    if (c) {
      const f = areaFeature('cliff', c, { box: 90, levels: 4, minLen: 34, dy: 0 });
      if (f) {
        f.elevation = c.elev;
        facts.cliffPct = c.slopePct;
        facts.cliffDeg = c.degrees;
      }
    } else {
      log(`[extract] ${area.id}: אין מצוק — אין מדרון שעובר את סף ההתלכדות`);
    }
  }

  /* --- מישור --- */
  {
    const p = findPlain(grid, G, unitToM, anchors);
    if (p) {
      const f = areaFeature('plain', p, { box: 140, levels: 2, minLen: 70 });
      if (f) {
        f.elevation = p.elev;
        facts.plainPct = p.slopePct;
      }
    }
  }

  /* --- בקעה / עמק --- */
  {
    const b = findBasin(grid, G, unitToM, stats.relief, anchors);
    if (b) {
      const f = areaFeature('basin', b, { box: 135, levels: 2, minLen: 55 });
      if (f) {
        f.elevation = b.elev;
        facts.basinElev = b.elev;
        facts.basinRise = b.rise;
      }
    }
  }

  /* --- שקע / קער סגור --- */
  {
    const d = findDepression(grid, G, I, anchors);
    if (d) {
      features.push({
        id: 'depression',
        showOutline: true,
        hitPath: smoothClosed(clampPoly(d.ring)),
        hitArea: Math.round(polyArea(d.ring)),
        labelPoint: clampPoint({ x: d.x, y: d.y }),
        elevation: d.elev,
      });
      anchors.push({ x: d.x, y: d.y });
      facts.depressionDepth = d.depth;
    }
  }

  /* --- כתף / מדף --- */
  {
    const s = findShoulder(grid, G, unitToM, anchors);
    if (s) {
      const f = areaFeature('shoulder', s, { box: 95, levels: 3, minLen: 40 });
      if (f) {
        f.elevation = s.elev;
        facts.shoulderPct = s.shelfPct;
        facts.shoulderWallPct = s.wallPct;
      }
    }
  }

  /* --- צוואר --- */
  {
    const n = findNeck(grid, G, unitToM, stats.saddles, I, anchors);
    if (n) {
      const f = areaFeature('neck', n, { box: 80, levels: 3, minLen: 30 });
      if (f) {
        f.elevation = n.elev;
        facts.neckWidthM = n.widthM;
      }
    }
  }

  /* --- ערוץ / אפיק --- */
  {
    const ch = findChannel(grid, G, unitToM, bends.valleys, I, anchors);
    if (ch) {
      const f = areaFeature('channel', ch, {
        box: 85,
        levels: 3,
        minLen: 30,
        dy: 10,
        extra: { flowArrow: { x: ch.x, y: ch.y, angle: downAngle(ch.x, ch.y) } },
      });
      if (f) {
        f.elevation = ch.level;
        facts.channelWidthM = ch.widthM;
        facts.channelWallPct = ch.wallPct;
      }
    }
  }

  // סדר הצגה לימודי: המושג קודם, אחר כך קמורות, מעברים, קעורות, משטחים, מצוק
  const order = [
    'contours',
    'ridge',
    'mountain',
    'dome',
    'hill',
    'spur',
    'shoulder',
    'saddle',
    'neck',
    'valley',
    'channel',
    'basin',
    'depression',
    'slope',
    'plain',
    'cliff',
  ];
  features.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  const result = {
    areaId: area.id,
    generatedFrom: 'AWS Terrain Tiles (terrarium) z' + area.demZoom,
    stats: { ...stats, groundWidthM: gw },
    facts,
    features,
  };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, `${area.id}.json`), JSON.stringify(result, null, 2));
  log(`[extract] ${area.id}: ${features.map((f) => f.id).join(', ')}`);
  return result;
}

if (isMain(import.meta.url)) {
  for (const area of areasFromArgv()) await extractFeatures(area);
}
