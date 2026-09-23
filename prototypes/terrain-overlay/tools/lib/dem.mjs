/**
 * dem.mjs — שליפת מודל גובה (DEM) לתחום של אזור, וניתוח טופוגרפי שממנו
 * נגזרות הצורות: פסגות, אוכפים, המדרון התלול, וקודקודי U/V (שלוחה/גיא).
 *
 * מקור: AWS Terrain Tiles (terrarium) — קוד פתוח, ללא אימות.
 *   elevation = (R*256 + G + B/256) − 32768  [מטרים]
 *
 * האריחים נשמרים ב-tools/.cache כדי שהרצה חוזרת של ה-pipeline לא תוריד שוב.
 */
import { PNG } from 'pngjs';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, bboxOf, tileRange, fetchRetry, log } from './geo.mjs';
import { contourAt, norm, dist } from './geometry.mjs';

const CACHE = resolve(ROOT, 'tools', '.cache', 'terrarium');

/** מוריד את אריחי ה-DEM ובונה רשת גבהים G×G במרחב ה-viewBox. */
export async function loadElevationGrid(area, G = 300) {
  const box = bboxOf(area);
  const z = area.demZoom;
  const t = tileRange(box, z);
  mkdirSync(CACHE, { recursive: true });

  const bigW = (t.tileXmax - t.tileXmin + 1) * 256;
  const bigH = (t.tileYmax - t.tileYmin + 1) * 256;
  const elev = new Float32Array(bigW * bigH);

  log(`[dem] ${area.id}: ${t.count} אריחי terrarium z${z}`);
  for (let ty = t.tileYmin; ty <= t.tileYmax; ty++) {
    for (let tx = t.tileXmin; tx <= t.tileXmax; tx++) {
      const file = resolve(CACHE, `${z}_${tx}_${ty}.png`);
      let buf;
      if (existsSync(file)) {
        buf = readFileSync(file);
      } else {
        const res = await fetchRetry(
          `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${tx}/${ty}.png`,
        );
        buf = Buffer.from(await res.arrayBuffer());
        writeFileSync(file, buf);
      }
      const png = PNG.sync.read(buf);
      const ox = (tx - t.tileXmin) * 256;
      const oy = (ty - t.tileYmin) * 256;
      for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 256; x++) {
          const i = (y * png.width + x) * 4;
          elev[(oy + y) * bigW + ox + x] =
            png.data[i] * 256 + png.data[i + 1] + png.data[i + 2] / 256 - 32768;
        }
      }
    }
  }

  repairNoData(elev, bigW, bigH, area.id);

  const samp = (fx, fy) => {
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, bigW - 1);
    const y1 = Math.min(y0 + 1, bigH - 1);
    const dx = fx - x0;
    const dy = fy - y0;
    return (
      elev[y0 * bigW + x0] * (1 - dx) * (1 - dy) +
      elev[y0 * bigW + x1] * dx * (1 - dy) +
      elev[y1 * bigW + x0] * (1 - dx) * dy +
      elev[y1 * bigW + x1] * dx * dy
    );
  };

  const grid = new Float32Array(G * G);
  for (let v = 0; v < G; v++) {
    for (let u = 0; u < G; u++) {
      grid[v * G + u] = samp(
        t.offX + ((u + 0.5) / G) * t.cropW,
        t.offY + ((v + 0.5) / G) * t.cropH,
      );
    }
  }
  return { grid, G };
}

/**
 * תיקון תאי "אין נתונים" באריחי terrarium. אריח תקין לחלוטין יכול להכיל
 * כתם ערכי-סרק (למשל ‎-7636‎ מ׳ בהר מירון) — ובלי טיפול, טווח הגבהים הפיקטיבי
 * מוביל לבחירת מרווח קווי גובה אבסורדית ולצורות ריקות.
 * התיקון: סימון תאים לא-סבירים ומילוי איטרטיבי משכנים תקינים.
 */
function repairNoData(elev, w, h, id) {
  const MIN_OK = -500; // ים המלח, השפל שביבשה, כ-‎-430‎ מ׳
  const MAX_OK = 9000;
  const bad = [];
  for (let i = 0; i < elev.length; i++) {
    if (!(elev[i] > MIN_OK && elev[i] < MAX_OK)) bad.push(i);
  }
  if (!bad.length) return;
  log(`[dem] ${id}: תוקנו ${bad.length} תאי "אין נתונים"`);
  const isBad = new Uint8Array(elev.length);
  for (const i of bad) isBad[i] = 1;
  for (let pass = 0; pass < 24 && bad.length; pass++) {
    const still = [];
    for (const i of bad) {
      const x = i % w;
      const y = (i / w) | 0;
      let s = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (isBad[j]) continue;
          s += elev[j];
          n++;
        }
      }
      if (n) elev[i] = s / n;
      else still.push(i);
    }
    const stillSet = new Set(still);
    for (const i of bad) if (!stillSet.has(i)) isBad[i] = 0;
    bad.length = 0;
    bad.push(...still);
  }
  // אם נותר כתם מבודד — משטחים אותו לערך החציוני של האריח
  if (bad.length) {
    const ok = [];
    for (let i = 0; i < elev.length; i += 97) if (!isBad[i]) ok.push(elev[i]);
    ok.sort((a, b) => a - b);
    const med = ok[Math.floor(ok.length / 2)] || 0;
    for (const i of bad) elev[i] = med;
  }
}

/* ------------------------------ דגימה ------------------------------ */

export function sampler(grid, G) {
  const Sc = 1000 / (G - 1);
  const clamp = (v, hi) => Math.max(0, Math.min(hi, v));
  const elevAt = (x, y) =>
    grid[clamp(Math.round(y / Sc), G - 1) * G + clamp(Math.round(x / Sc), G - 1)];
  const gradAt = (x, y) => {
    const u = Math.max(1, Math.min(G - 2, Math.round(x / Sc)));
    const v = Math.max(1, Math.min(G - 2, Math.round(y / Sc)));
    return [
      (grid[v * G + u + 1] - grid[v * G + u - 1]) / (2 * Sc),
      (grid[(v + 1) * G + u] - grid[(v - 1) * G + u]) / (2 * Sc),
    ];
  };
  /** זווית המורד במעלות (מערכת צירי SVG: y גדל כלפי מטה). */
  const downAngle = (x, y) => {
    const g = gradAt(x, y);
    return Math.round((Math.atan2(-g[1], -g[0]) * 180) / Math.PI);
  };
  return { Sc, elevAt, gradAt, downAngle };
}

/* ------------------------- בחירת מרווח קווי גובה ------------------------- */

const NICE = [1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200];

/**
 * מרווח קווי גובה "נחמד" שמייצר ~18–30 קווים על טווח הגבהים של האזור.
 * אזור מישורי יקבל מרווח קטן (למשל 2 מ׳) ואזור הררי מרווח גדול (50 מ׳) —
 * בלי זה, אזור בעל תבליט נמוך יוצא ריק לגמרי מקווי גובה.
 */
export function chooseInterval(relief) {
  const target = relief / 22;
  let best = NICE[0];
  for (const n of NICE) if (Math.abs(n - target) < Math.abs(best - target)) best = n;
  return best;
}

/* ------------------------------ ניתוח שטח ------------------------------ */

const RING = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
  [1, 0],
  [1, -1],
  [0, -1],
];

/**
 * מאתר את מאפייני השטח שמהם נבנות הצורות.
 * מחזיר קואורדינטות במרחב ה-viewBox (0..1000).
 */
export function analyze(grid, G) {
  const Sc = 1000 / (G - 1);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] < min) min = grid[i];
    if (grid[i] > max) max = grid[i];
  }
  const relief = max - min || 1;

  // החלקה 3×3 — מונעת פסגות-רעש מדגימת ה-DEM
  const sm = new Float32Array(G * G);
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      let s = 0;
      let n = 0;
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const ii = i + di;
          const jj = j + dj;
          if (ii >= 0 && ii < G && jj >= 0 && jj < G) {
            s += grid[ii * G + jj];
            n++;
          }
        }
      }
      sm[i * G + j] = s / n;
    }
  }

  const to1000 = (j, i) => ({ x: Math.round(j * Sc), y: Math.round(i * Sc) });
  const peaks = [];
  const saddles = [];
  let steepest = { g: -1, x: 500, y: 500, elev: 0 };

  for (let i = 3; i < G - 3; i++) {
    for (let j = 3; j < G - 3; j++) {
      const c = sm[i * G + j];
      let isMax = true;
      for (let di = -2; di <= 2 && isMax; di++) {
        for (let dj = -2; dj <= 2; dj++) {
          if ((di || dj) && sm[(i + di) * G + (j + dj)] >= c) {
            isMax = false;
            break;
          }
        }
      }
      if (isMax && c > min + 0.45 * relief) peaks.push({ ...to1000(j, i), elev: Math.round(c) });

      let changes = 0;
      for (let r = 0; r < 8; r++) {
        const a = sm[(i + RING[r][0]) * G + (j + RING[r][1])] - c;
        const b = sm[(i + RING[(r + 1) % 8][0]) * G + (j + RING[(r + 1) % 8][1])] - c;
        if (a > 0 !== b > 0) changes++;
      }
      if (changes >= 4 && c > min + 0.35 * relief) {
        saddles.push({ ...to1000(j, i), elev: Math.round(c) });
      }

      const gx = sm[i * G + j + 1] - sm[i * G + j - 1];
      const gy = sm[(i + 1) * G + j] - sm[(i - 1) * G + j];
      const gm = Math.hypot(gx, gy);
      // רק בתוך התחום הפנימי — מדרון בשולי המפה נחתך ולא ניתן להדגמה
      const p = to1000(j, i);
      if (gm > steepest.g && p.x > 160 && p.x < 840 && p.y > 160 && p.y < 840) {
        steepest = { g: gm, ...p, elev: Math.round(c) };
      }
    }
  }

  const dedupe = (list, r) => {
    const out = [];
    for (const p of list.sort((a, b) => b.elev - a.elev)) {
      if (!out.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < r)) out.push(p);
    }
    return out;
  };

  const interval = chooseInterval(relief);
  const distinct = dedupe(peaks, 130);

  /**
   * בולטוּת (prominence): כמה צריך לרדת מהפסגה כדי להגיע אל פסגה גבוהה ממנה.
   * בלי הסינון הזה כל גבנון קטן על גב הרכס נספר כ"פסגה", והטקסט הלימודי
   * מבטיח ללומד עשר פסגות במקום שלוש.
   */
  const { elevAt } = sampler(grid, G);
  for (const p of distinct) {
    const higher = distinct.filter((q) => q.elev > p.elev);
    if (!higher.length) {
      p.prominence = Math.round(p.elev - min);
      continue;
    }
    let best = 0;
    for (const q of higher) {
      let low = Infinity;
      const steps = Math.max(6, Math.round(Math.hypot(q.x - p.x, q.y - p.y) / 8));
      for (let s = 0; s <= steps; s++) {
        low = Math.min(
          low,
          elevAt(p.x + ((q.x - p.x) * s) / steps, p.y + ((q.y - p.y) * s) / steps),
        );
      }
      best = Math.max(best, low);
    }
    p.prominence = Math.round(p.elev - best);
  }
  const minProm = Math.max(2 * interval, 0.07 * relief);
  const significant = distinct.filter((p) => p.prominence >= minProm);

  /**
   * התבליט נגזר מהערכים **המעוגלים** ולא מעוגל בנפרד.
   * עיגול נפרד של שלושת המספרים מייצר אי-התאמה של מטר: הכרטיס מציג
   * ‎"909–1158 מ׳"‎ ולידו ‎"הפרש 249 מ׳"‎, והלומד שמחסיר מקבל 250.
   */
  const minR = Math.round(min);
  const maxR = Math.round(max);
  return {
    min: minR,
    max: maxR,
    relief: maxR - minR,
    interval,
    /** פסגות מובהקות בלבד — לאחר סינון בולטוּת. */
    peaks: significant.length >= 2 ? significant : distinct.slice(0, 3),
    /** כל המקסימומים המקומיים, למקרה שנדרשת רשת צפופה יותר. */
    allPeaks: distinct,
    saddles: dedupe(saddles, 130),
    steepest: { x: steepest.x, y: steepest.y, elev: steepest.elev },
  };
}

/**
 * מוצא את נקודת האוכף (col) בין שתי הפסגות הגבוהות: הנקודה הנמוכה ביותר
 * לאורך הקו המחבר אותן. זו ההגדרה הלימודית של אוכף — "נמוך מהפסגות שמשני
 * צדיו, גבוה מהגאיות שמשני צדיו האחרים".
 */
export function findCol(grid, G, a, b) {
  const { elevAt } = sampler(grid, G);
  let best = null;
  let bestE = Infinity;
  for (let s = 0.15; s <= 0.85; s += 0.01) {
    const x = a.x + (b.x - a.x) * s;
    const y = a.y + (b.y - a.y) * s;
    const e = elevAt(x, y);
    if (e < bestE) {
      bestE = e;
      best = { x: Math.round(x), y: Math.round(y) };
    }
  }
  return { ...best, elev: Math.round(bestE) };
}

/**
 * מדרג קודקודי-עיקול של קווי הגובה: קמירות בכיוון המורד = שלוחה (U),
 * קמירות בכיוון המעלה = גיא (V). זהו הקריטריון הקרטוגרפי עצמו, ולכן
 * הצורות שנבחרות הן באמת המופעים המובהקים ביותר באזור.
 */
export function findBends(grid, G, { min, max, interval }) {
  const { gradAt } = sampler(grid, G);
  const cand = [];
  const start = Math.ceil((min + 0.08 * (max - min)) / interval) * interval;
  const end = max - 0.05 * (max - min);
  for (let L = start; L <= end; L += interval) {
    for (const ch of contourAt(grid, G, L)) {
      const pts = ch.points;
      if (pts.length < 9) continue;
      for (let i = 4; i < pts.length - 4; i++) {
        const p = pts[i];
        if (p[0] < 130 || p[0] > 870 || p[1] < 130 || p[1] > 870) continue;
        const a = pts[i - 4];
        const b = pts[i + 4];
        const t1 = norm([p[0] - a[0], p[1] - a[1]]);
        const t2 = norm([b[0] - p[0], b[1] - p[1]]);
        const turn = Math.atan2(t1[0] * t2[1] - t1[1] * t2[0], t1[0] * t2[0] + t1[1] * t2[1]);
        const bend = norm([a[0] - p[0] + (b[0] - p[0]), a[1] - p[1] + (b[1] - p[1])]);
        const convex = [-bend[0], -bend[1]];
        const g = gradAt(p[0], p[1]);
        const down = norm([-g[0], -g[1]]);
        const gm = Math.hypot(g[0], g[1]);
        const dot = convex[0] * down[0] + convex[1] * down[1];
        cand.push({
          x: Math.round(p[0]),
          y: Math.round(p[1]),
          level: L,
          type: dot > 0 ? 'spur' : 'valley',
          strength: Math.abs(turn) * gm * Math.abs(dot),
        });
      }
    }
  }
  const top = (type, n, minGap = 90) => {
    const list = cand.filter((c) => c.type === type).sort((a, b) => b.strength - a.strength);
    const out = [];
    for (const c of list) {
      if (!out.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < minGap)) out.push(c);
      if (out.length >= n) break;
    }
    return out;
  };
  return { spurs: top('spur', 6), valleys: top('valley', 6) };
}

/**
 * מאתר חלון שבו קווי הגובה נקיים, מקבילים ורציפים — כלומר משטח משופע אחיד.
 * `magPower` מכוון בין "תלול" ל"קריא": מדרון רוצה שיפוע חזק, ואילו הדגמת
 * המושג "קווי גובה" רוצה קווים רגועים שאפשר לספור.
 *
 * מדידה בחלון ולא בנקודה בודדת: הנקודה התלולה ביותר ב-DEM היא לרוב רעש
 * דגימה, והצורה שנבנית סביבה אינה מייצגת את מה שהלומד רואה במפה.
 */
export function findCleanSlopeWindow(
  grid,
  G,
  taken = [],
  { magPower = 1, radius = 80, gap = 170 } = {},
) {
  const { gradAt } = sampler(grid, G);
  let best = null;
  const step = Math.round(radius / 4);
  for (let cy = 200; cy <= 800; cy += 35) {
    for (let cx = 200; cx <= 800; cx += 35) {
      if (taken.some((t) => Math.hypot(t.x - cx, t.y - cy) < gap)) continue;
      let n = 0;
      let sum = 0;
      let sx = 0;
      let sy = 0;
      for (let dy = -radius; dy <= radius; dy += step) {
        for (let dx = -radius; dx <= radius; dx += step) {
          const g = gradAt(cx + dx, cy + dy);
          sum += Math.hypot(g[0], g[1]);
          const u = norm(g);
          sx += u[0];
          sy += u[1];
          n++;
        }
      }
      const meanMag = sum / n;
      const coherence = Math.hypot(sx, sy) / n; // 1 = כל השיפועים באותו כיוון
      const score = meanMag ** magPower * coherence ** 2;
      if (!best || score > best.score) best = { x: cx, y: cy, score, meanMag, coherence };
    }
  }
  return best;
}

export { dist };
