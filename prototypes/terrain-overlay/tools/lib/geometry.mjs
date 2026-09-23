/**
 * geometry.mjs — כלי הגאומטריה המשותפים לחילוץ הצורות: marching squares,
 * תפירת קטעים לשרשראות, פישוט (RDP), החלקה לעקומות Bézier, קמור, והרחבה.
 *
 * הכול עובד במרחב ה-viewBox של הרכיב (0..1000 בשני הצירים) כדי שהפלט יוכל
 * להיכנס ישירות ל-SVG בלי המרה נוספת.
 */

export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const norm = (v) => {
  const L = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / L, v[1] / L];
};

/* --------------------------- marching squares --------------------------- */

/**
 * מפיק את קווי הגובה ברום L מתוך רשת גבהים G×G, ומחזיר שרשראות תפורות.
 * @returns {{points:number[][], closed:boolean}[]}
 */
export function contourAt(grid, G, L) {
  const Sc = 1000 / (G - 1);
  const segs = [];
  for (let i = 0; i < G - 1; i++) {
    for (let j = 0; j < G - 1; j++) {
      const tl = grid[i * G + j];
      const tr = grid[i * G + j + 1];
      const bl = grid[(i + 1) * G + j];
      const br = grid[(i + 1) * G + j + 1];
      let c = 0;
      if (tl > L) c |= 8;
      if (tr > L) c |= 4;
      if (br > L) c |= 2;
      if (bl > L) c |= 1;
      if (c === 0 || c === 15) continue;
      const a = [(j + (L - tl) / (tr - tl)) * Sc, i * Sc];
      const b = [(j + 1) * Sc, (i + (L - tr) / (br - tr)) * Sc];
      const cc = [(j + (L - bl) / (br - bl)) * Sc, (i + 1) * Sc];
      const d = [j * Sc, (i + (L - tl) / (bl - tl)) * Sc];
      const P = (p, q) => segs.push([p, q]);
      switch (c) {
        case 1:
          P(cc, d);
          break;
        case 2:
          P(b, cc);
          break;
        case 3:
          P(b, d);
          break;
        case 4:
          P(a, b);
          break;
        case 5:
          P(a, d);
          P(b, cc);
          break;
        case 6:
          P(a, cc);
          break;
        case 7:
          P(a, d);
          break;
        case 8:
          P(a, d);
          break;
        case 9:
          P(a, cc);
          break;
        case 10:
          P(a, b);
          P(cc, d);
          break;
        case 11:
          P(a, b);
          break;
        case 12:
          P(b, d);
          break;
        case 13:
          P(b, cc);
          break;
        case 14:
          P(cc, d);
          break;
      }
    }
  }
  return stitch(segs);
}

/** תופר קטעים בדידים לשרשראות רציפות לפי נקודות קצה משותפות. */
export function stitch(segs) {
  const key = (p) => Math.round(p[0] * 100) + '_' + Math.round(p[1] * 100);
  const coord = {};
  const adj = new Map();
  for (const [p, q] of segs) {
    const a = key(p);
    const b = key(q);
    coord[a] = p;
    coord[b] = q;
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b);
    adj.get(b).push(a);
  }
  const used = new Set();
  const ek = (a, b) => a + '>' + b;
  const chains = [];
  // מתחילים מקצוות (דרגה 1) כדי ששרשראות פתוחות ייתפרו במלואן
  const starts = [...adj.keys()].sort((p, q) => adj.get(p).length - adj.get(q).length);
  for (const s0 of starts) {
    while (adj.get(s0).filter((n) => !used.has(ek(s0, n))).length) {
      const pts = [coord[s0]];
      let c = s0;
      for (;;) {
        const nx = adj.get(c).filter((n) => !used.has(ek(c, n)));
        if (!nx.length) break;
        const n = nx[0];
        used.add(ek(c, n));
        used.add(ek(n, c));
        pts.push(coord[n]);
        c = n;
        if (c === s0) break;
      }
      chains.push({ points: pts, closed: c === s0 });
    }
  }
  return chains;
}

/* ------------------------------ פישוט/החלקה ------------------------------ */

const pointLineDist = (p, a, b) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / L;
};

/** Ramer–Douglas–Peucker. */
export function rdp(pts, tolerance) {
  if (pts.length < 3) return pts;
  let dm = 0;
  let idx = 0;
  const a = pts[0];
  const b = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = pointLineDist(pts[i], a, b);
    if (d > dm) {
      dm = d;
      idx = i;
    }
  }
  return dm > tolerance
    ? [...rdp(pts.slice(0, idx + 1), tolerance).slice(0, -1), ...rdp(pts.slice(idx), tolerance)]
    : [a, b];
}

/** דילול נקודות במרחק מינימלי — לטבעות סגורות. */
export function decimateClosed(pts, spacing) {
  const p = dist(pts[0], pts[pts.length - 1]) < 1 ? pts.slice(0, -1) : pts;
  const res = [p[0]];
  for (let i = 1; i < p.length; i++) {
    if (dist(p[i], res[res.length - 1]) >= spacing) res.push(p[i]);
  }
  return res;
}

const r1 = (p) => [Math.round(p[0]), Math.round(p[1])];

export const path = (pts, close) =>
  'M' +
  pts
    .map(r1)
    .map((p) => p.join(','))
    .join(' L') +
  (close ? ' Z' : '');

/** Catmull-Rom → Bézier, שרשרת פתוחה. */
export function smooth(pts) {
  if (pts.length < 2) return path(pts, false);
  let d = `M${r1(pts[0]).join(',')}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || pts[i + 1];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${r1(c1).join(',')} ${r1(c2).join(',')} ${r1(p2).join(',')}`;
  }
  return d;
}

/** Catmull-Rom → Bézier, טבעת סגורה. */
export function smoothClosed(pts) {
  const n = pts.length;
  let d = `M${r1(pts[0]).join(',')}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${r1(c1).join(',')} ${r1(c2).join(',')} ${r1(p2).join(',')}`;
  }
  return d + ' Z';
}

/* ------------------------------ פוליגונים ------------------------------ */

export const inBox = (p, B) => p[0] >= B[0] && p[0] <= B[2] && p[1] >= B[1] && p[1] <= B[3];

/** חותך שרשרת לקטעים שנמצאים בתוך התיבה. */
export function clipToBox(chain, B) {
  const runs = [];
  let cur = [];
  for (const p of chain.points) {
    if (inBox(p, B)) cur.push(p);
    else {
      if (cur.length > 1) runs.push(cur);
      cur = [];
    }
  }
  if (cur.length > 1) runs.push(cur);
  return runs;
}

/** נקודה בתוך פוליגון (ray casting). */
export function pointInPoly(pt, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) {
      ins = !ins;
    }
  }
  return ins;
}

/** קמור (monotone chain). */
export function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const pt of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], pt) <= 0) lo.pop();
    lo.push(pt);
  }
  const up = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const pt = p[i];
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], pt) <= 0) up.pop();
    up.push(pt);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/** הרחבת פוליגון החוצה ממרכזו במרחק d. */
export function expand(poly, d) {
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  return poly.map((p) => {
    const dx = p[0] - cx;
    const dy = p[1] - cy;
    const L = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / L) * d, p[1] + (dy / L) * d];
  });
}

/** רצועה סימטרית סביב קו (לאזור לחיץ של ציר רכס). */
export function offsetBand(pts, w) {
  const up = [];
  const lo = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const L = Math.hypot(tx, ty) || 1;
    tx /= L;
    ty /= L;
    up.push([pts[i][0] - ty * w, pts[i][1] + tx * w]);
    lo.push([pts[i][0] + ty * w, pts[i][1] - tx * w]);
  }
  return up.concat(lo.reverse());
}

/** תיבה חוסמת של רשימת נקודות, בתוספת שוליים. */
export function bounds(pts, pad = 0) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    if (p[0] < x0) x0 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[0] > x1) x1 = p[0];
    if (p[1] > y1) y1 = p[1];
  }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

/** שטח פוליגון (ערך מוחלט) — לשימוש במיון אזורי לחיצה (S-06). */
export function polyArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return Math.abs(a / 2);
}
