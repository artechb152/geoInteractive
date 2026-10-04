'use strict';
/**
 * Painted terrain for the "כוחות פנימיים וחיצוניים בעיצוב הנוף" board
 * (GeologyVisuals.tsx → EndogenicVisual / ExogenicVisual).
 *
 * Style: stylized oblique aerial terrain — one continuous, sculpted and painted
 * landscape seen from above at an angle (foreground, middle ground, hazy
 * background), after the lesson's onboarding renders
 * (public/assets/scene-onboarding/topic-02/states/state-1…3). A shallow cut
 * along the near edge reveals the rock beneath without dominating the picture.
 *
 * Pipeline: height fields → sun + sky light, soft cast shadows and hollows →
 * painted materials (soil, limestone, scrub, sand, water, ash) → a perspective
 * column renderer → light brush (Kuwahara) finish and paper grain.
 *
 *   node scripts/media/render-geology-forces.cjs [--only endo|endo-final|exo]
 *        [--frames 10] [--preview <dir>] [--out <dir>] [--anchors] [--overlay]
 *
 *   forces/endo-00…endo-NN.webp   endogenic landscape, uplift t = 0 → 1 (played as a flipbook)
 *   forces/exo.webp               exogenic landscape
 *   src/components/lessons/topic-02/exogenicOverlay.data.ts
 *                                 the exogenic processes' geometry, projected through
 *                                 the camera (rewritten with exo; --overlay: only it)
 *
 * The images are opaque (sky painted in). Labels, arrows and process motion stay
 * on the SVG overlay in GeologyVisuals.tsx / ExogenicActivity.tsx, whose 560 × 360
 * viewBox this frame matches (2 px per unit); the overlay anchor points are
 * printed at the end. --out renders the images (and the exogenic data module)
 * into another folder. Nothing is ever mirrored for RTL.
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));

const root = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
// --out <dir> renders the images somewhere else (e.g. to compare against the delivered ones)
const OUT = path.resolve(opt('out', path.join(root, 'public/assets/lessons/topic02/scene-geology/forces')));
const ONLY = opt('only', 'all');
const FRAMES = Number(opt('frames', 10));
const PREVIEW = opt('preview', null);
const KUW = Number(opt('kuwahara', 3));
const ANCHORS_ONLY = args.includes('--anchors');
const OVERLAY_ONLY = args.includes('--overlay');

// ── frame & camera ──────────────────────────────────────────────────────────
const VB_W = 560;
const VB_H = 360;
const S = 4; // internal px per viewBox unit (rendered 2× above the delivered size)
const OUT_S = 2;
const IW = VB_W * S;
const IH = VB_H * S;
// World: x across (0…LX), y into the distance (0 = the cut near edge), z up.
const LX = 900;
const LY = 520;
// Perspective camera looking along +y, ≈40° down at the near edge. Vertical
// lines stay vertical (shifted horizon), as in a painted aerial view.
const CAM = { x: 450, y: -900, z: 755 };
const F = 900 * S;
const H0 = (356 - 755) * S;
const T0 = -CAM.y; // forward distance to the near edge
const vb = (x, y, z) => {
  const t = y - CAM.y;
  return [(IW / 2 + (F * (x - CAM.x)) / t) / S, (H0 + (F * (CAM.z - z)) / t) / S];
};

// ── math ────────────────────────────────────────────────────────────────────
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (c, d, t) => [c[0] + (d[0] - c[0]) * t, c[1] + (d[1] - c[1]) * t, c[2] + (d[2] - c[2]) * t];
const mul3 = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const norm3 = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};
function smin(a, b, k) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return mix(b, a, h) - k * h * (1 - h);
}

function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded 2D gradient noise, roughly −0.7…0.7. */
function makeNoise(seed) {
  const rand = mulberry(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint16Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const gx = new Float32Array(256);
  const gy = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const a = rand() * Math.PI * 2;
    gx[i] = Math.cos(a);
    gy[i] = Math.sin(a);
  }
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const h00 = perm[X + perm[Y]];
    const h10 = perm[X + 1 + perm[Y]];
    const h01 = perm[X + perm[Y + 1]];
    const h11 = perm[X + 1 + perm[Y + 1]];
    const d00 = gx[h00] * xf + gy[h00] * yf;
    const d10 = gx[h10] * (xf - 1) + gy[h10] * yf;
    const d01 = gx[h01] * xf + gy[h01] * (yf - 1);
    const d11 = gx[h11] * (xf - 1) + gy[h11] * (yf - 1);
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const a = d00 + u * (d10 - d00);
    const b = d01 + u * (d11 - d01);
    return a + v * (b - a);
  };
}
function fbm(n, x, y, oct) {
  let s = 0;
  let a = 0.5;
  let f = 1;
  let w = 0;
  for (let i = 0; i < oct; i++) {
    s += a * n(x * f, y * f);
    w += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / w;
}
function ridged(n, x, y, oct) {
  let s = 0;
  let a = 0.5;
  let f = 1;
  let w = 0;
  for (let i = 0; i < oct; i++) {
    const v = 1 - Math.min(1, Math.abs(n(x * f, y * f)) * 1.45);
    s += a * v * v;
    w += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / w;
}
const POLY = { at: 0, len: 1 };
/** Distance from a point to a polyline; POLY.at / POLY.len give the position along it. */
function distToPolyline(px, py, pts) {
  let best = Infinity;
  let at = 0;
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const vx = bx - ax;
    const vy = by - ay;
    const len2 = vx * vx + vy * vy;
    const t = clamp(((px - ax) * vx + (py - ay) * vy) / len2, 0, 1);
    const d = Math.hypot(px - ax - vx * t, py - ay - vy * t);
    if (d < best) {
      best = d;
      at = acc + t * Math.sqrt(len2);
    }
    acc += Math.sqrt(len2);
  }
  POLY.at = at;
  POLY.len = acc;
  return best;
}

// ── fields ──────────────────────────────────────────────────────────────────
class Field {
  constructor(cs = 0.5) {
    this.cs = cs;
    this.nx = Math.round(LX / cs) + 1;
    this.ny = Math.round(LY / cs) + 1;
    this.a = new Float32Array(this.nx * this.ny);
  }
  fill(fn) {
    const { nx, ny, cs, a } = this;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) a[j * nx + i] = fn(i * cs, j * cs);
    return this;
  }
  at(x, y) {
    const { nx, ny, cs, a } = this;
    let fx = x / cs;
    let fy = y / cs;
    fx = fx < 0 ? 0 : fx > nx - 1.0001 ? nx - 1.0001 : fx;
    fy = fy < 0 ? 0 : fy > ny - 1.0001 ? ny - 1.0001 : fy;
    const i = fx | 0;
    const j = fy | 0;
    const tx = fx - i;
    const ty = fy - j;
    const k = j * nx + i;
    const top = a[k] + (a[k + 1] - a[k]) * tx;
    const bot = a[k + nx] + (a[k + nx + 1] - a[k + nx]) * tx;
    return top + (bot - top) * ty;
  }
}

function blur(F2, r) {
  const { nx, ny } = F2;
  const out = new Field(F2.cs);
  let src = F2.a;
  const tmp = new Float32Array(src.length);
  const dst = out.a;
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < ny; j++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += src[j * nx + clamp(i, 0, nx - 1)];
      for (let i = 0; i < nx; i++) {
        tmp[j * nx + i] = acc / (2 * r + 1);
        acc += src[j * nx + clamp(i + r + 1, 0, nx - 1)] - src[j * nx + clamp(i - r, 0, nx - 1)];
      }
    }
    for (let i = 0; i < nx; i++) {
      let acc = 0;
      for (let j = -r; j <= r; j++) acc += tmp[clamp(j, 0, ny - 1) * nx + i];
      for (let j = 0; j < ny; j++) {
        dst[j * nx + i] = acc / (2 * r + 1);
        acc += tmp[clamp(j + r + 1, 0, ny - 1) * nx + i] - tmp[clamp(j - r, 0, ny - 1) * nx + i];
      }
    }
    src = dst;
  }
  return out;
}

// ── light ───────────────────────────────────────────────────────────────────
// Warm sun from the left and a little in front: west- and viewer-facing slopes
// catch it, east flanks and the fault scarp fall into soft cool shade.
const SUN = norm3([-0.62, -0.42, 0.62]);
const SUN_H = norm3([SUN[0], SUN[1], 0]);
const AMB = [0.47, 0.48, 0.55];
const SUNC = [0.8, 0.73, 0.6];
const HAZE = hex('#E9E3D5');
const SKY_TOP = hex('#DCE5E3');
const SKY_LOW = hex('#EFE8DA');

/**
 * soft(x, y) (optional) widens the shadow penumbra at a receiving point (1 =
 * the default), so a scene can give a big isolated landform a soft cast shadow.
 */
function lighting(H, soft = null) {
  const { nx, ny, cs } = H;
  const h = H.a;
  const dir = new Field(cs);
  const amb = new Field(cs);
  const slope = new Field(cs);
  const cav = new Field(cs);
  const b1 = blur(H, 6);
  const b2 = blur(H, 26);
  const hl = Math.hypot(SUN[0], SUN[1]);
  const sdx = SUN[0] / hl;
  const sdy = SUN[1] / hl;
  const tanE = SUN[2] / hl;
  for (let j = 0; j < ny; j++) {
    const j0 = Math.max(0, j - 1);
    const j1 = Math.min(ny - 1, j + 1);
    for (let i = 0; i < nx; i++) {
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(nx - 1, i + 1);
      const k = j * nx + i;
      const dzdx = (h[j * nx + i1] - h[j * nx + i0]) / ((i1 - i0) * cs);
      const dzdy = (h[j1 * nx + i] - h[j0 * nx + i]) / ((j1 - j0) * cs);
      const inv = 1 / Math.hypot(dzdx, dzdy, 1);
      const lam = Math.max(0, (-dzdx * SUN[0] - dzdy * SUN[1] + SUN[2]) * inv);
      let lit = 1;
      const x0 = i * cs;
      const y0 = j * cs;
      const h0 = h[k] + 0.4;
      const sf = soft ? soft(x0, y0) : 1;
      for (let d = cs * 1.5; d < 320; d += Math.max(cs, d * 0.05)) {
        const x = x0 + sdx * d;
        const y = y0 + sdy * d;
        if (x < 0 || y < 0 || x > LX || y > LY) break;
        const over = H.at(x, y) - (h0 + d * tanE);
        if (over > -10 * sf) lit = Math.min(lit, clamp(0.5 - over / ((1.2 + 0.07 * d) * sf), 0, 1));
        if (lit <= 0) break;
      }
      dir.a[k] = lam * lit;
      const c1 = b1.a[k] - h[k];
      const c2 = b2.a[k] - h[k];
      const steep = 1 - 0.6 * clamp((1 - inv) * 2.2, 0, 1);
      const ao = clamp(1 - (0.05 * Math.max(0, c1) + 0.011 * Math.max(0, c2)) * steep, 0.45, 1);
      amb.a[k] = ao * (0.64 + 0.36 * inv) + clamp(-c1 * 0.02, 0, 0.1);
      slope.a[k] = 1 - inv;
      cav.a[k] = c1;
    }
  }
  return { dir, amb, slope, cav };
}

// ── scattered shrubs / stones (procedural, any resolution) ──────────────────
class Scatter {
  /**
   * One candidate per grid cell; density(x, y) ∈ 0…1 decides if it is placed,
   * size(rand) gives its radius, palette its colours.
   */
  constructor({ seed, spacing, density, size, palette, shadow = 0.5, sharp = 0.3, light = 0.34 }) {
    Object.assign(this, { spacing, palette, shadow, sharp, light });
    this.nx = Math.ceil(LX / spacing) + 1;
    this.ny = Math.ceil(LY / spacing) + 1;
    const n = this.nx * this.ny;
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.r = new Float32Array(n);
    this.c = new Uint8Array(n);
    this.on = new Uint8Array(n);
    const rand = mulberry(seed);
    for (let j = 0; j < this.ny; j++)
      for (let i = 0; i < this.nx; i++) {
        const k = j * this.nx + i;
        this.x[k] = (i + 0.15 + rand() * 0.7) * spacing;
        this.y[k] = (j + 0.15 + rand() * 0.7) * spacing;
        this.r[k] = size(rand);
        this.c[k] = Math.floor(rand() * palette.length);
        const p = rand();
        this.on[k] = this.x[k] < LX && this.y[k] < LY && p < density(this.x[k], this.y[k]) ? 1 : 0;
      }
    this.out = [0, 0, 0, 0, 1];
  }
  sample(x, y) {
    const { spacing: s, nx, ny } = this;
    const ci = Math.floor(x / s);
    const cj = Math.floor(y / s);
    let a = 0;
    let r0 = 0;
    let g0 = 0;
    let b0 = 0;
    let sh = 1;
    for (let dj = -2; dj <= 2; dj++) {
      const j = cj + dj;
      if (j < 0 || j >= ny) continue;
      for (let di = -2; di <= 2; di++) {
        const i = ci + di;
        if (i < 0 || i >= nx) continue;
        const k = j * nx + i;
        if (!this.on[k]) continue;
        const r = this.r[k];
        const sx = x - (this.x[k] - SUN_H[0] * r * 1.2);
        const sy = y - (this.y[k] - SUN_H[1] * r * 1.2);
        const ds = (sx * sx + sy * sy) / (r * r * 1.7);
        if (ds < 1) sh *= 1 - this.shadow * (1 - ds);
        const dx = x - this.x[k];
        const dy = y - this.y[k];
        const d2 = (dx * dx + dy * dy) / (r * r);
        if (d2 >= 1) continue;
        const f = 1 - d2;
        const al = ss(0, this.sharp, f);
        const hl = (dx * SUN_H[0] + dy * SUN_H[1]) / r;
        const kk = 0.78 + this.light * hl + 0.16 * f;
        const col = this.palette[this.c[k]];
        r0 = mix(r0, col[0] * kk, al);
        g0 = mix(g0, col[1] * kk, al);
        b0 = mix(b0, col[2] * kk, al);
        a = a + al * (1 - a);
      }
    }
    const o = this.out;
    o[0] = r0;
    o[1] = g0;
    o[2] = b0;
    o[3] = a;
    o[4] = sh;
    return o;
  }
}

// ── palette (from the onboarding terrain renders, kept natural and muted) ───
const SOIL = hex('#C4A277');
const SOIL_LT = hex('#D3B78B');
const SOIL_DK = hex('#A6865F');
const DRYGRASS = hex('#A89E69');
const SCRUB = hex('#8E8857');
const ROCK = hex('#BDB6A7');
const ROCK_LT = hex('#D3CDBF');
const ROCK_DK = hex('#7B7368');
const GRAVEL = hex('#D6CBB3');
const SHRUBS = ['#55623A', '#66733F', '#4C5933', '#707C49'].map(hex);
const RIPARIAN = ['#566F38', '#647F41', '#4B6534'].map(hex);
const STONES = ['#A9A090', '#C2BAA9', '#968C7D', '#B4A58C'].map(hex);
const HORIZON_SOIL = hex('#7A644A');
const SAND = hex('#DDBE89');
const SAND_LT = hex('#E3C998');
const WATER = hex('#4C889F');
const WATER_LT = hex('#7DB0C0');
const ASH = hex('#958574');
const SCORIA = hex('#73665C');
const BASALT = hex('#564C46');
const OXIDE = hex('#7E5D4C');
const MAGMA = [hex('#F7C065'), hex('#E2752F'), hex('#A73D24')];
const STROKE = makeNoise(4711);
const FACEN = makeNoise(5150);

// Shading flags set by the material functions for the current pixel.
let EMIT = false;
let FLAT = false;

const skyAt = (py) => mix3(SKY_TOP, SKY_LOW, ss(0, IH * 0.32, py));

// ── renderer ────────────────────────────────────────────────────────────────
/**
 * Perspective column renderer: every image column is a vertical plane through
 * the camera. It enters the land through the cut near edge (drawn as a rock
 * face), then the surface is marched front → back, each sample filling the
 * rows it newly reveals (interpolated between samples, so steep walls get
 * their own pixels).
 */
function render(sc) {
  const col = new Float32Array(IW * IH * 3);
  const depth = new Float32Array(IW * IH).fill(1e9);
  const id = new Uint8Array(IW * IH);
  for (let py = 0; py < IH; py++) {
    const c = skyAt(py);
    for (let px = 0; px < IW; px++) {
      const k = (py * IW + px) * 3;
      col[k] = c[0];
      col[k + 1] = c[1];
      col[k + 2] = c[2];
    }
  }
  const put = (px, r, c, fid, d) => {
    const k = r * IW + px;
    col[k * 3] = c[0];
    col[k * 3 + 1] = c[1];
    col[k * 3 + 2] = c[2];
    id[k] = fid;
    depth[k] = d;
  };
  const { H } = sc;
  const tEnd = T0 + LY;
  for (let px = 0; px < IW; px++) {
    const u = (px + 0.5 - IW / 2) / F;
    const xF = CAM.x + u * T0;
    if (xF < 0 || xF > LX) continue;
    // the cut near edge
    const hs = H.at(xF, 0);
    const syTop = H0 + (F * (CAM.z - hs)) / T0;
    const syBot = H0 + (F * CAM.z) / T0;
    for (let r = Math.max(0, Math.ceil(syTop - 0.5)); r < Math.min(IH, Math.ceil(syBot - 0.5)); r++) {
      const z = CAM.z - ((r + 0.5 - H0) * T0) / F;
      put(px, r, shadeFace(sc, xF, clamp(z, 0, hs), hs), 2, 0);
    }
    // the surface
    let ymin = syTop;
    let pX = xF;
    let pY = 0;
    let pZ = hs;
    let pS = syTop;
    let pT = T0;
    let t = T0;
    while (t < tEnd && ymin > 0) {
      t += clamp((0.45 * t * t) / (F * CAM.z), 0.04, 2);
      const x = CAM.x + u * t;
      const y = t - T0;
      if (x < 0 || x > LX || y > LY) break;
      const z = H.at(x, y);
      const sy = H0 + (F * (CAM.z - z)) / t;
      if (sy < ymin) {
        const r0 = Math.max(0, Math.ceil(sy - 0.5));
        const r1 = Math.min(IH - 1, Math.ceil(ymin - 0.5) - 1);
        for (let r = r0; r <= r1; r++) {
          const w = pS > sy ? clamp((r + 0.5 - sy) / (pS - sy), 0, 1) : 0;
          const ti = t + (pT - t) * w;
          put(px, r, shadeSurface(sc, x + (pX - x) * w, y + (pY - y) * w, z + (pZ - z) * w, ti, r), 1, ti);
        }
        ymin = sy;
      }
      pX = x;
      pY = y;
      pZ = z;
      pS = sy;
      pT = t;
    }
  }
  return { col, depth, id };
}

function shadeFace(sc, x, z, hs) {
  EMIT = false;
  const c = sc.face(x, z, hs);
  if (EMIT) return c;
  // rough rock relief lit from the upper left, darker toward the foot, and the
  // soft shadow under the soil lip
  const n1 = fbm(FACEN, x / 6, z / 1.8, 3);
  const n2 = fbm(FACEN, (x - 0.8) / 6, (z + 0.6) / 1.8, 3);
  const n3 = fbm(FACEN, x / 14 + 40, z / 7, 3);
  let k = 0.95 + 0.42 * (n1 - n2) + 0.1 * n3;
  k *= 0.8 + 0.2 * ss(0, 34, z);
  k *= 1 - 0.28 * (1 - ss(0.6, 4.5, hs - z)) * ss(1.5, 3, hs - z + 2);
  return [c[0] * 0.95 * k, c[1] * 0.92 * k, c[2] * 0.88 * k];
}

function shadeSurface(sc, x, y, z, t, py) {
  const { L } = sc;
  const dir = L.dir.at(x, y);
  const amb = L.amb.at(x, y);
  const sl = L.slope.at(x, y);
  const cv = L.cav.at(x, y);
  EMIT = false;
  FLAT = false;
  let c = sc.albedo(x, y, z, sl, cv);
  if (EMIT) return c;
  let shade = 1;
  if (!FLAT) {
    // painted relief: pale on spurs and crests, warmer in hollows, scrub in gullies,
    // and fine strokes down the fall line
    c = mul3(c, 1 + clamp(-cv * 0.05, 0, 0.1) - clamp(cv * 0.03, 0, 0.1));
    c = mix3(c, SCRUB, clamp(cv * 0.14, 0, 0.3) * (1 - ss(0.4, 0.6, sl)));
    if (sl > 0.04) {
      const gx = sc.H.at(x + 0.5, y) - sc.H.at(x - 0.5, y);
      const gy = sc.H.at(x, y + 0.5) - sc.H.at(x, y - 0.5);
      const gl = Math.hypot(gx, gy) || 1;
      const along = (x * gy - y * gx) / gl;
      const down = (x * gx + y * gy) / gl;
      const st = STROKE(along / 0.6, down / 5) + 0.5 * STROKE(along / 0.28 + 40, down / 2.2);
      c = mul3(c, 1 + 0.08 * st * ss(0.04, 0.25, sl));
    }
    const flat = 1 - ss(0.36, 0.55, sl);
    if (flat > 0)
      for (const s of sc.scatters) {
        const d = s.sample(x, y);
        const a = d[3] * flat;
        if (a > 0.001) c = mix3(c, [d[0] / d[3], d[1] / d[3], d[2] / d[3]], a);
        shade *= mix(1, d[4], flat);
      }
  }
  let lr;
  let lg;
  let lb;
  if (FLAT) {
    lr = AMB[0] + SUNC[0] * SUN[2];
    lg = AMB[1] + SUNC[1] * SUN[2];
    lb = AMB[2] + SUNC[2] * SUN[2];
  } else {
    lr = AMB[0] * amb + SUNC[0] * dir * shade;
    lg = AMB[1] * amb + SUNC[1] * dir * shade;
    lb = AMB[2] * amb + SUNC[2] * dir * shade;
  }
  c = [c[0] * lr, c[1] * lg, c[2] * lb];
  if (sc.glow) {
    const e = sc.glow(x, y);
    if (e > 0) c = mix3(c, MAGMA[1], e);
  }
  // aerial perspective; the far edge dissolves into the sky
  const far = (t - T0) / LY;
  c = mix3(c, HAZE, 0.06 + 0.3 * Math.pow(far, 1.4));
  return mix3(c, skyAt(py), ss(0.86, 1, far));
}

// ── post: brush finish, grain, encode ───────────────────────────────────────
function kuwahara(img, r) {
  if (r <= 0) return;
  const { col } = img;
  const W1 = IW + 1;
  const n = W1 * (IH + 1);
  const sR = new Float64Array(n);
  const sG = new Float64Array(n);
  const sB = new Float64Array(n);
  const sL = new Float64Array(n);
  const sL2 = new Float64Array(n);
  for (let y = 0; y < IH; y++) {
    let rr = 0;
    let rg = 0;
    let rb = 0;
    let rl = 0;
    let rl2 = 0;
    for (let x = 0; x < IW; x++) {
      const k = y * IW + x;
      const R = col[k * 3];
      const G = col[k * 3 + 1];
      const B = col[k * 3 + 2];
      const Lm = 0.3 * R + 0.59 * G + 0.11 * B;
      rr += R;
      rg += G;
      rb += B;
      rl += Lm;
      rl2 += Lm * Lm;
      const o = (y + 1) * W1 + x + 1;
      const u = y * W1 + x + 1;
      sR[o] = sR[u] + rr;
      sG[o] = sG[u] + rg;
      sB[o] = sB[u] + rb;
      sL[o] = sL[u] + rl;
      sL2[o] = sL2[u] + rl2;
    }
  }
  const rect = (S2, x0, y0, x1, y1) => S2[(y1 + 1) * W1 + x1 + 1] - S2[y0 * W1 + x1 + 1] - S2[(y1 + 1) * W1 + x0] + S2[y0 * W1 + x0];
  const out = new Float32Array(col.length);
  for (let y = 0; y < IH; y++)
    for (let x = 0; x < IW; x++) {
      const k = y * IW + x;
      if (img.id[k] === 0 || img.id[k] === 4) {
        out[k * 3] = col[k * 3];
        out[k * 3 + 1] = col[k * 3 + 1];
        out[k * 3 + 2] = col[k * 3 + 2];
        continue;
      }
      let best = Infinity;
      for (let q = 0; q < 4; q++) {
        const x0 = q & 1 ? x : Math.max(0, x - r);
        const x1 = q & 1 ? Math.min(IW - 1, x + r) : x;
        const y0 = q & 2 ? y : Math.max(0, y - r);
        const y1 = q & 2 ? Math.min(IH - 1, y + r) : y;
        const a = (x1 - x0 + 1) * (y1 - y0 + 1);
        const m = rect(sL, x0, y0, x1, y1) / a;
        const v = rect(sL2, x0, y0, x1, y1) / a - m * m;
        if (v < best) {
          best = v;
          out[k * 3] = rect(sR, x0, y0, x1, y1) / a;
          out[k * 3 + 1] = rect(sG, x0, y0, x1, y1) / a;
          out[k * 3 + 2] = rect(sB, x0, y0, x1, y1) / a;
        }
      }
    }
  img.col = out;
}

/** Faint shading where nearer ground overlaps farther ground (painted edge definition). */
function overlapEdges(img) {
  const { col, id, depth } = img;
  const src = col.slice();
  for (let y = 2; y < IH; y++)
    for (let x = 0; x < IW; x++) {
      const k = y * IW + x;
      if (id[k] !== 1) continue;
      const up = k - 2 * IW;
      if (id[up] !== 1) continue;
      const jump = depth[up] - depth[k];
      if (jump > 14) {
        const s = 0.14 * ss(14, 60, jump);
        for (let ch = 0; ch < 3; ch++) col[k * 3 + ch] = src[k * 3 + ch] * (1 - s);
      }
    }
}

function grain(img) {
  const n = makeNoise(777);
  const { col } = img;
  for (let y = 0; y < IH; y++)
    for (let x = 0; x < IW; x++) {
      const k = y * IW + x;
      const g = 1 + 0.03 * n(x / 2.1, y / 2.1) + 0.02 * n(x / 9, y / 3.5);
      col[k * 3] *= g;
      col[k * 3 + 1] *= g;
      col[k * 3 + 2] *= g;
    }
}

async function save(img, name) {
  const buf = Buffer.alloc(IW * IH * 3);
  for (let k = 0; k < IW * IH * 3; k++) buf[k] = clamp(Math.round(img.col[k] * 255), 0, 255);
  const raw = { raw: { width: IW, height: IH, channels: 3 } };
  const file = path.join(OUT, `${name}.webp`);
  await sharp(buf, raw).resize(VB_W * OUT_S, VB_H * OUT_S, { kernel: 'lanczos3' }).webp({ quality: 80, effort: 6, smartSubsample: true }).toFile(file);
  console.log(path.relative(root, file), Math.round(fs.statSync(file).size / 1024) + ' KB');
  if (PREVIEW) {
    fs.mkdirSync(PREVIEW, { recursive: true });
    await sharp(buf, raw).resize(VB_W * OUT_S, VB_H * OUT_S, { kernel: 'lanczos3' }).png().toFile(path.join(PREVIEW, `${name}.png`));
  }
}

/** Gentle grade: a touch more contrast and colour, so the painted light reads. */
function grade(img) {
  const { col } = img;
  for (let k = 0; k < IW * IH; k++) {
    const r = col[k * 3];
    const g = col[k * 3 + 1];
    const b = col[k * 3 + 2];
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    for (let ch = 0; ch < 3; ch++) {
      const v = col[k * 3 + ch];
      col[k * 3 + ch] = 0.56 + (l + (v - l) * 1.08 - 0.56) * 1.08;
    }
  }
}

function finish(img) {
  overlapEdges(img);
  kuwahara(img, KUW);
  grade(img);
  grain(img);
  return img;
}

// ── shared material pieces ──────────────────────────────────────────────────
function soilColor(n, x, y) {
  const m = fbm(n, x / 16, y / 16, 4);
  const big = fbm(n, x / 70 + 31, y / 70, 3);
  let c = mix3(SOIL, SOIL_LT, clamp(0.5 + 1.3 * m + 0.9 * big, 0, 1));
  c = mix3(c, SOIL_DK, clamp(-m * 1.6 - big, 0, 1) * 0.5);
  return mix3(c, DRYGRASS, clamp(fbm(n, x / 38 + 20, y / 38, 3) * 1.8, 0, 1) * 0.38);
}
function rockColor(n, x, y, cav) {
  let r = mix3(ROCK, ROCK_LT, clamp(0.5 + 1.4 * fbm(n, x / 4, y / 9, 3), 0, 1));
  // dark crevices between blocks
  const cr = ridged(n, x / 6 + 11, y / 6, 2);
  r = mix3(r, ROCK_DK, clamp((cr - 0.72) * 2.4, 0, 0.55) + clamp(cav * 0.2, 0, 0.45));
  return r;
}
/** Natural bedding: beds that wander, thicken and thin, with mottling and joints. */
function bedRock(base, x, z, frac, n) {
  let c = mul3(base, 1 + 0.07 * fbm(n, x / 7, z / 3.5, 3) + 0.035 * Math.sin(frac * Math.PI * 7 + n(x / 15, z / 4) * 2.4));
  const joint = Math.abs(n(x / 5.5 + z * 0.05, z / 26 + 7));
  if (joint < 0.025) c = mul3(c, 0.78);
  if (frac < 0.05 || frac > 0.97) c = mul3(c, 0.84);
  return mul3(c, 1 + 0.05 * n(x / 0.9, z / 0.7));
}
function soilHorizon(x, z, hs) {
  // thin dark topsoil over the rock, with a ragged base
  const base = hs - 2.4 - 0.8 * FACEN(x / 3, 9.1);
  if (z < base) return null;
  return mix3(HORIZON_SOIL, SOIL_DK, clamp((z - base) / 3, 0, 1) * 0.55 + 0.1 * FACEN(x / 0.8, z / 0.8));
}
function magma(e) {
  EMIT = true;
  const q = clamp(e, 0, 1);
  return q < 0.5 ? mix3(MAGMA[0], MAGMA[1], q / 0.5) : mix3(MAGMA[1], MAGMA[2], (q - 0.5) / 0.5);
}

// ════════════════════════════════════════════════════════════════════════════
// ENDOGENIC — a folded range rising across the land, a fault scarp parallel
// to it with the eastern block dropped, and a volcanic field on that block
// fed by a magma chamber that the cut reveals.
// ════════════════════════════════════════════════════════════════════════════
const E = {
  ZP: 52,
  THROW: 14,
  TOPS: [52, 42, 32, 22, 12],
  AMPF: [1, 0.9, 0.8, 0.7, 0.6],
  STRATA: ['#C9B48E', '#B4936C', '#A49C86', '#987A5E', '#7C7064'].map(hex),
  // The main volcano: a sculpted cone (rim height h, foot radius r) with a
  // crater (radius cr, depth cd), set fully in frame on the eastern block.
  VOLCANO: { x: 686, y: 256, r: 108, h: 112, cr: 17, cd: 7 },
  // A basalt flow down its sunlit flank onto the plain (the tongue, a breakout
  // where the slope eases, a lobe at its toe): spine (world x, y), meander
  // amplitude and wavelength, width at the start → at the end, thickness on the
  // plain, age (0 fresh … 1 weathered).
  FLOWS: [
    { pts: [[666.7, 238.6], [655.6, 227], [642.4, 217.8], [631, 206.5], [619.6, 195.2], [608.7, 186.4], [603, 176], [599.5, 165], [598, 155], [598.5, 147]], amp: 2.4, wl: 30, w0: 2, w1: 17, th: 2.4, age: 0, seed: 0 },
    { pts: [[621, 194.5], [613, 193], [606.5, 194]], amp: 0.6, wl: 12, w0: 3.5, w1: 6.5, th: 1.8, age: 0.15, seed: 2 },
    { pts: [[601, 170], [594, 164], [588.5, 161]], amp: 0.8, wl: 14, w0: 8, w1: 9, th: 2, age: 0.25, seed: 4 },
    { pts: [[602, 160], [608, 154], [612.5, 151]], amp: 0.6, wl: 12, w0: 7, w1: 7.5, th: 1.8, age: 0.1, seed: 6 },
  ],
  // Small cones: one in the cut (fed by the magma chamber), a cinder cone on the plain.
  CONES: [
    { x: 684, y: 4, h: 28, r: 32, cr: 4.5, glow: 1, rib: 9 },
    { x: 702, y: 94, h: 19, r: 22, cr: 3.5, glow: 0, rib: 18 },
  ],
  CHAMBER: { x: 718, y: 18, z: 14, rx: 66, ry: 60, rz: 9.5 },
  CONDUIT: [
    [702, 21],
    [694, 34],
    [688, 50],
    [684, 80],
  ],
};
const eN = { a: makeNoise(101), b: makeNoise(202), c: makeNoise(303), d: makeNoise(404), e: makeNoise(505), m: makeNoise(606), r: makeNoise(707), f: makeNoise(808), v: makeNoise(909), g: makeNoise(1010), w: makeNoise(1111) };
// A fold belt: the main anticline (whose plunging nose the cut crosses) and a
// lower parallel anticline to the west, receding into the distance.
const RIDGES = [
  { x0: 318, k: -0.2, amp: 84, w: 66, y0: 20, y1: 210, front: 0.26, seed: 0 },
  { x0: 168, k: -0.12, amp: 58, w: 56, y0: 90, y1: 280, front: 0, seed: 7 },
];
const ridgeX = (y, i = 0) => RIDGES[i].x0 + RIDGES[i].k * y + 8 * Math.sin(y / 70 + 0.5 + i * 2);
const ridgeAmp = (y, i = 0) => {
  const R = RIDGES[i];
  return R.amp * (R.front + (1 - R.front) * ss(R.y0, R.y1, y)) * (1 - 0.3 * ss(400, 520, y)) * (0.8 + 0.16 * Math.sin(y / 34 + 0.8 + R.seed) + 0.3 * fbm(eN.a, y / 30 + R.seed, 3.7, 3));
};
/** Smooth uplift of the beds (the fold itself, without the eroded surface detail). */
const foldUplift = (x, y) => RIDGES.reduce((s, _, i) => s + ridgeAmp(y, i) * Math.exp(-((((x - ridgeX(y, i)) * 0.98) / (RIDGES[i].w + 22)) ** 2)), 0);
const faultX = (y, z) => 560 - 0.1 * y + 6 * Math.sin(y / 60) + 0.16 * (z - E.ZP);

function endoGround(x, y, t) {
  // gently rolling plain, soft hills in the distance
  let z = E.ZP + 1.6 * fbm(eN.b, x / 26, y / 26, 3) + 4 * fbm(eN.d, x / 80 + 9, y / 80, 3);
  z += 30 * ss(250, 480, y) * clamp(0.45 + 1.3 * fbm(eN.e, x / 130 + 5, y / 100, 4), 0, 1.2);
  if (t > 0) {
    const along = -0.2 * x + 0.98 * y;
    const across = 0.98 * x + 0.2 * y;
    const warp = 9 * fbm(eN.b, x / 34, y / 34, 2);
    for (let i = 0; i < RIDGES.length; i++) {
      const dx = (x - ridgeX(y, i)) * 0.98;
      const prof = Math.exp(-Math.pow(Math.abs(dx) / RIDGES[i].w, 1.35));
      if (prof < 0.002) continue;
      const A = ridgeAmp(y, i);
      // big spurs and valleys down the flanks, finer gullies within them, a little crag on the crest
      const spur = ridged(eN.c, (across + warp) / 95 + i * 5, along / 32, 3);
      const flank = Math.sqrt(prof) * (1 - prof);
      const gully = ridged(eN.g, (across + 2 * warp) / 42 + i * 3, along / 13, 2);
      z += t * (A * prof + 0.55 * A * flank * (spur - 0.45) - 0.13 * A * flank * gully * gully + 2.5 * prof * fbm(eN.d, x / 15, y / 15, 3) + 3 * prof * prof * (ridged(eN.e, x / 28, y / 28, 2) - 0.5));
    }
  }
  const xf = faultX(y, z);
  z -= E.THROW * (1 - ss(xf - 6, xf + 1, x)) * (1 + 0.12 * eN.r(y / 14, 2.2));
  return z;
}
/**
 * The volcanic field at (x, y): height added to the ground (zc, of which gz is
 * the gully relief), ash-apron weight (v), crater glow, and for the main
 * volcano (main = 1) the painter's cues: q (1 at the rim → 0 at the foot), the
 * rib/gully signal (rib > 0 on rib crests, < 0 in gullies) and the crater.
 */
const CONE = { zc: 0, gz: 0, v: 0, glow: 0, ang: 0, d: 0, main: 0, q: 0, rib: 0, crater: 0 };
function mainVolcano(x, y) {
  const V = E.VOLCANO;
  const dx = x - V.x;
  const dy = y - V.y;
  const d = Math.hypot(dx, dy);
  CONE.v = Math.max(CONE.v, ss(0, 0.5, 1 - d / (V.r * 1.22)));
  if (d >= V.r) return;
  const ca = d > 1e-3 ? dx / d : 1;
  const sa = d > 1e-3 ? dy / d : 0;
  const ang = Math.atan2(dy, dx);
  // the rim wanders a little; a sharp crest, steep inner walls, a small floor
  const hR = V.h * (1 + 0.03 * eN.w(ca * 1.5 + 7, sa * 1.5));
  const q = clamp(1 - (d - V.cr) / (V.r - V.cr), 0, 1);
  let h;
  let rib = 0;
  let gz = 0;
  if (d < V.cr) h = hR - V.cd * (1 - ss(0.42 * V.cr, V.cr, d));
  else {
    // concave flanks scored by radial gullies (periodic in angle, wandering),
    // which start below the rim, widen downslope and die out on the apron
    h = hR * Math.pow(q, 1.45);
    const warp = fbm(eN.w, ca * 1.8 + 3, sa * 1.8 + d / 24, 3);
    const deep = clamp(0.55 + 1.2 * fbm(eN.w, ca * 2.6 + 11, sa * 2.6, 2), 0.15, 1);
    const g1 = Math.pow(Math.abs(Math.sin(8 * ang + 4.5 * warp)), 0.55);
    const g2 = Math.pow(Math.abs(Math.sin(21 * ang + 7 * warp + 1.3)), 0.6);
    const u = 1 - q;
    const head = 0.05 + 0.08 * (0.5 + eN.w(ca * 3 + 20, sa * 3));
    rib = ss(head, head + 0.18, u) * (1 - ss(0.5, 0.88, u)) * (0.7 * deep * (g1 - 0.6) + 0.3 * (g2 - 0.6));
    gz = V.h * 0.055 * rib;
    h += gz;
  }
  h += 1.6 * Math.exp(-(((d - V.cr) / 2.4) ** 2));
  if (h > CONE.zc) {
    CONE.zc = h;
    CONE.gz = gz;
    CONE.main = 1;
    CONE.q = q;
    CONE.rib = rib;
    CONE.ang = ang;
    CONE.d = d / V.r;
    CONE.crater = 1 - ss(V.cr - 1.5, V.cr + 1, d);
  }
  // only a dull warmth painted on the crater floor; the overlay makes it breathe
  if (d < V.cr * 0.5) CONE.glow = Math.max(CONE.glow, 0.32 * (1 - d / (V.cr * 0.5)));
}
function endoCone(x, y) {
  CONE.zc = 0;
  CONE.gz = 0;
  CONE.v = 0;
  CONE.glow = 0;
  CONE.main = 0;
  CONE.rib = 0;
  CONE.crater = 0;
  CONE.ang = 0;
  CONE.d = 1;
  mainVolcano(x, y);
  for (const c of E.CONES) {
    const dx = x - c.x;
    const dy = y - c.y;
    const d = Math.hypot(dx, dy);
    CONE.v = Math.max(CONE.v, ss(0, 0.45, 1 - d / (c.r * 1.15)));
    if (d >= c.r) continue;
    const ang = Math.atan2(dy, dx);
    const q = 1 - d / c.r;
    const rim = c.h * Math.pow(1 - c.cr / c.r, 1.6);
    let h;
    if (d < c.cr) h = rim - 0.8 * c.cr * (1 - (d / c.cr) ** 2);
    else h = c.h * Math.pow(q, 1.6) * (1 + ss(c.cr, c.cr * 3, d) * (0.12 * (ridged(eN.v, ang * 5 + c.rib, d / 12, 2) - 0.5) + 0.05 * eN.e(x / 8, y / 8)));
    if (h > CONE.zc) {
      CONE.zc = h;
      CONE.main = 0;
      CONE.ang = ang;
      CONE.d = d / c.r;
    }
    if (d < c.cr * 0.7) CONE.glow = Math.max(CONE.glow, (1 - d / (c.cr * 0.7)) * c.glow);
  }
  return CONE;
}

/** Basalt flows at (x, y): mask m (1 inside), added thickness th, age, position along the flow s (0 vent → 1 toe). */
const FLOW = { m: 0, th: 0, age: 0, s: 0, e: 0, og: 0 };
/** The spine, densified, with a gentle meander (two wavelengths) that grows from the vent. */
function meander(pts, amp, wl, seed) {
  const out = [];
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.ceil(len / 1.5));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const at = acc + t * len;
      const off = amp * ss(0, 14, at) * (0.7 * Math.sin((at * 2 * Math.PI) / wl + seed) + 0.3 * Math.sin((at * 2 * Math.PI) / (wl * 0.43) + 2 * seed));
      out.push([ax + (bx - ax) * t - ((by - ay) / len) * off, ay + (by - ay) * t + ((bx - ax) / len) * off]);
    }
    acc += len;
  }
  out.push(pts[pts.length - 1]);
  return out;
}
for (const f of E.FLOWS) {
  f.path = meander(f.pts, f.amp, f.wl, f.seed);
  const pad = f.w1 * 1.6 + f.amp + 6;
  const xs = f.path.map((p) => p[0]);
  const ys = f.path.map((p) => p[1]);
  f.box = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
}
function lavaFlow(x, y) {
  FLOW.m = 0;
  FLOW.th = 0;
  FLOW.age = 0;
  for (const f of E.FLOWS) {
    if (x < f.box[0] || x > f.box[2] || y < f.box[1] || y > f.box[3]) continue;
    // a tongue: narrow at the vent, widening down the cone and spreading on the
    // plain; a warped distance, scaled to the local width, gives it lobate,
    // crinkled margins
    // it pinches and swells along its length
    const width = (at, len) => mix(f.w0, f.w1, Math.pow(at / len, 0.9)) * (1 + 0.24 * Math.sin(at / 9.5 + f.seed) + 0.12 * Math.sin(at / 4.1 + 1.7 + f.seed));
    distToPolyline(x, y, f.path);
    const a = 1 + 0.5 * width(POLY.at, POLY.len);
    const wx = x + a * fbm(eN.m, x / 10 + 50 + f.seed, y / 10, 3);
    const wy = y + a * fbm(eN.m, x / 10, y / 10 + 50 + f.seed, 3);
    const dd = distToPolyline(wx, wy, f.path);
    const s = POLY.at / POLY.len;
    const w = width(POLY.at, POLY.len) * (1 + 0.15 * eN.e(x / 3, y / 3));
    const m = 1 - ss(w * 0.75, w, dd);
    if (m <= FLOW.m) continue;
    // thin on the steep cone, thick lobes on the plain; a channel between
    // raised rubbly levées, arcuate pressure ridges bowed downstream, clinker
    const e = dd / w;
    const plain = ss(0.4, 0.75, s);
    const levee = Math.exp(-(((e - 0.74) / 0.15) ** 2));
    const channel = 1 - ss(0.2, 0.5, e);
    const ogive = mix(0.3, 0.75, plain) * Math.sin((POLY.at + 0.55 * w * e * e) / 2.3 + 2.2 * eN.m(x / 5 + f.seed, y / 5));
    FLOW.m = m;
    FLOW.th = m * (f.th * mix(0.75, 1, plain) * (1 + levee - 0.35 * channel * (1 - plain)) + ogive + 0.8 * fbm(eN.e, x / 1.6 + f.seed, y / 1.6, 2));
    FLOW.og = ogive / mix(0.3, 0.75, plain);
    FLOW.age = f.age;
    FLOW.s = s;
    FLOW.e = e;
  }
  return FLOW;
}
function endoZ(x, y, t) {
  const g = endoGround(x, y, t);
  const cn = endoCone(x, y);
  const fl = lavaFlow(x, y);
  // a flow fills the gullies it runs down
  return g + cn.zc - cn.gz * fl.m * 0.85 + fl.th;
}

/** Fold bed containing (x, y, z): index and position within the bed (0 = base, 1 = top). */
const LAYER = { k: 0, frac: 0 };
function endoLayer(x, y, z, t) {
  const west = x < faultX(y, z);
  const zz = z + (west ? E.THROW : 0) + 1.3 * fbm(eN.f, x / 24, z / 14, 2);
  const A = t * foldUplift(x, y);
  let k = 4;
  for (let i = 0; i < 4; i++)
    if (zz >= E.TOPS[i + 1] + A * E.AMPF[i + 1]) {
      k = i;
      break;
    }
  const hi = E.TOPS[k] + A * E.AMPF[k];
  const lo = k === 4 ? 0 : E.TOPS[k + 1] + A * E.AMPF[k + 1];
  LAYER.k = k;
  LAYER.frac = (zz - lo) / Math.max(1, hi - lo);
  return LAYER;
}

function endoAlbedo(t) {
  return (x, y, z, sl, cav) => {
    let c = soilColor(eN.m, x, y);
    // pale limestone: crags on steep ground and the hard beds of the fold where they crop out
    const k = endoLayer(x, y, z, t);
    const ledge = t > 0 ? ss(0.7, 0.9, k.frac) * ss(0.08, 0.22, sl) : 0;
    const crest = clamp(-cav * 0.3, 0, 0.6) * ss(0.12, 0.3, sl);
    const rk = clamp(ss(0.24, 0.48, sl + 0.2 * fbm(eN.r, x / 7, y / 7, 3)) * (1 - ss(0.5, 3, cav)) + ledge * 0.7 + crest + 0.3 * t * ss(108, 132, z), 0, 1);
    if (rk > 0) c = mix3(c, mix3(rockColor(eN.r, x, y, cav), E.STRATA[k.k], 0.2), rk);
    // the fault scarp: fresh, pale rock along the step
    const xf = faultX(y, z);
    const scarp = (1 - ss(3, 6, Math.abs(x - xf + 2.5))) * ss(0.08, 0.26, sl);
    if (scarp > 0) c = mix3(c, mix3(ROCK_LT, ROCK, 0.5 + 0.5 * eN.r(x / 2, y / 6)), scarp * 0.8);
    // volcanic field: ash apron, scoria cones with dark gullies, basalt flows
    const cn = endoCone(x, y);
    if (cn.v > 0) {
      const high = cn.main ? cn.q : cn.zc > 0 ? 1 - cn.d : 0;
      let v;
      if (cn.main) {
        // ash and scoria darkening toward the summit: pale ash on the rib crests,
        // dark scoria down the gullies, a burnt (oxidised) crater
        v = mix3(ASH, SCORIA, clamp(0.5 + 0.45 * ss(0.3, 0.92, high) - 0.9 * cn.rib, 0, 1));
        v = mix3(v, BASALT, 0.55 * ss(0.7, 1, high));
        v = mix3(v, mix3(BASALT, OXIDE, 0.45 + 0.3 * eN.e(x / 2.5, y / 2.5)), 0.85 * cn.crater);
      } else {
        const rib = eN.v(cn.ang * 7, cn.d * 4);
        v = mix3(ASH, SCORIA, clamp(0.25 - rib * 1.1 + ss(0.35, 0.95, high) * 0.6, 0, 1));
      }
      const dust = (1 - (cn.main ? ss(0.06, 0.3, high) : ss(0.15, 0.5, high))) * clamp(0.65 + 0.6 * fbm(eN.g, x / 9, y / 9, 3), 0, 1);
      v = mix3(v, cn.main ? mix3(c, mix3(ASH, SOIL_DK, 0.35), 0.45) : mix3(c, ASH, 0.25), dust);
      c = mix3(c, v, cn.main ? Math.max(cn.v * 0.9, ss(0.1, 0.35, high)) : cn.v * 0.9);
    }
    const fl = lavaFlow(x, y);
    if (fl.m > 0) {
      // fresh basalt is dark and rubbly; the older flow is weathered and dusted with ash
      // a dark, smoother channel between lighter, browner rubble levées, in patches of
      // fresher and older crust
      const lev = ss(0.42, 0.7, fl.e);
      let b = mix3(mul3(BASALT, 0.66), SCORIA, clamp(0.1 + 1.1 * fbm(eN.e, x / 1.3, y / 1.3, 2) * (0.4 + 0.6 * lev) + 0.62 * lev, 0, 0.9));
      b = mix3(b, mix3(SCORIA, OXIDE, 0.5), 0.3 * lev * clamp(0.5 + eN.f(x / 2, y / 2), 0, 1));
      b = mul3(b, (1 + 0.1 * fbm(eN.w, x / 9 + 40, y / 9, 2)) * (1 + 0.09 * fl.og * (1 - lev)));
      b = mix3(b, ASH, clamp((eN.f(x / 0.7, y / 0.7) - 0.2) * 1.6, 0, 0.3) * (0.4 + 0.6 * lev));
      b = mix3(b, mix3(ASH, SOIL_DK, 0.3), fl.age * 0.42);
      // thinly veiled by ash near the vent, so the tongue weighs most where it spreads
      b = mix3(b, c, 0.35 * (1 - ss(0, 0.4, fl.s)));
      c = mix3(c, b, fl.m);
    }
    return mul3(c, 1 + 0.09 * eN.f(x / 1.4, y / 1.4));
  };
}
const endoGlow = (x, y) => {
  const cn = endoCone(x, y);
  return cn.glow > 0 ? clamp(cn.glow * 1.1, 0, 0.8) : 0;
};

function endoFace(t) {
  return (x, z, hs) => {
    const ch = E.CHAMBER;
    const e = ((x - ch.x) / ch.rx) ** 2 + (ch.y / ch.ry) ** 2 + ((z - ch.z) / ch.rz) ** 2;
    if (e < 1) return magma(Math.sqrt(e) + 0.12 * eN.v(x / 5, z / 3));
    const dc = distToPolyline(x, z, E.CONDUIT);
    const wdt = mix(3.4, 2.2, clamp((z - 24) / 70, 0, 1)) * (1 + 0.15 * eN.v(z / 4, 3));
    if (dc < wdt) return magma(0.2 + (dc / wdt) * 0.75);
    const soil = soilHorizon(x, z, hs);
    const cn = endoCone(x, 0);
    if (soil && cn.zc < 1) return soil;
    let c;
    if (cn.zc > 0.5 && z > hs - cn.zc) {
      // the small cone in section: ash and lava beds parallel to its flanks
      const q = hs - z;
      c = mix3(BASALT, ASH, 0.5 + 0.4 * Math.sin(q / 2 + eN.v(x / 9, z / 9) * 0.6));
      c = mul3(c, 1 + 0.08 * eN.f(x / 1.2, z / 1.2));
    } else {
      const k = endoLayer(x, 0, z, t);
      c = bedRock(E.STRATA[k.k], x, z, k.frac, eN.c);
      if (Math.abs(x - faultX(0, z)) < 0.9) c = mix3(c, hex('#4A4038'), 0.55);
    }
    if (e < 2.6) c = mix3(c, hex('#A9553A'), 0.38 * (1 - (e - 1) / 1.6));
    return c;
  };
}

function endoScatters(L) {
  return [
    new Scatter({
      seed: 11,
      spacing: 2.4,
      size: (r) => 0.6 + r() * 0.8,
      palette: SHRUBS,
      density: (x, y) => {
        const cn = endoCone(x, y);
        const high = cn.main ? cn.q : cn.zc > 0 ? 1 - cn.d : 0;
        if (high > (cn.main ? 0.22 : 0.45)) return 0;
        if (lavaFlow(x, y).m > 0.1) return 0;
        const sl = L.slope.at(x, y);
        const cv = L.cav.at(x, y);
        let d = 0.3 * ss(0, 0.35, fbm(eN.g, x / 18, y / 18, 3)) + clamp(cv * 0.7, -0.3, 0.7);
        d *= (1 - ss(0.35, 0.62, sl) * 0.8) * (1 - 0.6 * cn.v);
        return clamp(d, 0, 0.75);
      },
    }),
    // scoria blocks and bombs strewn over the ash aprons and lower flanks
    new Scatter({
      seed: 31,
      spacing: 1.9,
      size: (r) => 0.45 + r() * 0.75,
      palette: [SCORIA, BASALT, mix3(SCORIA, ASH, 0.5), mix3(BASALT, OXIDE, 0.4)],
      shadow: 0.5,
      sharp: 0.15,
      light: 0.4,
      density: (x, y) => {
        const cn = endoCone(x, y);
        if (cn.v <= 0 || lavaFlow(x, y).m > 0.1) return 0;
        const high = cn.main ? cn.q : cn.zc > 0 ? 1 - cn.d : 0;
        return 0.22 * ss(0.15, 0.6, cn.v) * (1 - ss(0.25, 0.45, high));
      },
    }),
  ];
}

/** The volcano's cast shadow: soft, widening and fading away from its foot (east of the fault only). */
function endoSoft(x, y) {
  const V = E.VOLCANO;
  return 1 + 4 * ss(470, 520, x) * ss(0.45 * V.r, V.r, Math.hypot(x - V.x, y - V.y));
}
function endoScene(t, scatters) {
  const H = new Field().fill((x, y) => endoZ(x, y, t));
  return { H, L: lighting(H, endoSoft), scatters, albedo: endoAlbedo(t), face: endoFace(t), glow: endoGlow };
}

function endoAnchors(H) {
  const r = (p) => p.map((v) => Math.round(v * 10) / 10);
  // visual summit of the range: the land point highest on screen
  let best = null;
  for (let y = 60; y < LY - 60; y += 2)
    for (let x = ridgeX(y) - 60; x < ridgeX(y) + 60; x += 2) {
      const p = vb(x, y, H.at(x, y));
      if (!best || p[1] < best[1]) best = p;
    }
  const sc = (y) => {
    const z = H.at(faultX(y, E.ZP) + 3, y);
    return r(vb(faultX(y, z) - 2.5, y, z - E.THROW / 2));
  };
  const hsF = H.at(faultX(0, E.ZP), 0);
  const V = E.VOLCANO;
  const c1 = E.CONES[0];
  // the main crater: centre of the rim ring and the ring's half-axes on screen
  const rimZ = [0, 1, 2, 3].reduce((s, i) => s + H.at(V.x + V.cr * Math.cos((i * Math.PI) / 2), V.y + V.cr * Math.sin((i * Math.PI) / 2)), 0) / 4;
  const crater = vb(V.x, V.y, rimZ);
  const lip = [V.x - V.cr * 1.05, V.y - V.cr * 0.45];
  return {
    summit: r(best),
    scarp: [sc(60), sc(150), sc(260)],
    faultTop: r(vb(faultX(0, hsF), 0, hsF)),
    faultBottom: r(vb(faultX(0, 1), 0, 1)),
    quake: r(vb(faultX(0, 30), 0, 30)),
    crater0: r(crater),
    craterR: r([(vb(V.x + V.cr, V.y, rimZ)[0] - vb(V.x - V.cr, V.y, rimZ)[0]) / 2, (vb(V.x, V.y - V.cr, rimZ)[1] - vb(V.x, V.y + V.cr, rimZ)[1]) / 2]),
    craterLip: r(vb(lip[0], lip[1], H.at(lip[0], lip[1]))),
    conduit: E.CONDUIT.map(([x, z]) => r(vb(x, 0, z))),
    crater1: r(vb(c1.x, c1.y + 3, H.at(c1.x, c1.y + 3))),
    platesY: r(vb(450, 0, 11))[1],
    plateL: [r(vb(196, 0, 11))[0], r(vb(290, 0, 11))[0]],
    plateR: [r(vb(636, 0, 11))[0], r(vb(540, 0, 11))[0]],
    upArrow: [r(vb(ridgeX(0), 0, 14)), r(vb(ridgeX(0), 0, 52))],
    chamberLeft: r(vb(E.CHAMBER.x - E.CHAMBER.rx * 0.95, 0, E.CHAMBER.z)),
    archTop: r(vb(ridgeX(0), 0, H.at(ridgeX(0), 0))),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// EXOGENIC — a layered mesa whose cliffs shed scree, a stream winding through
// a valley cut into the beds, and wind-built dunes across the western plain.
// ════════════════════════════════════════════════════════════════════════════
const X = {
  ZP: 52,
  ZTOP: 140,
  ZFOOT: 104,
  BEDS: [
    [130, '#CFBB95'],
    [116, '#B6946C'],
    [101, '#C8B591'],
    [84, '#A88564'],
    [66, '#BDA383'],
    [48, '#A3896B'],
    [30, '#B49B7B'],
    [14, '#937660'],
    [-1, '#857164'],
  ].map(([z, c]) => [z, hex(c)]),
};
const xN = { a: makeNoise(1101), b: makeNoise(1202), c: makeNoise(1303), d: makeNoise(1404), e: makeNoise(1505), m: makeNoise(1606), r: makeNoise(1707), f: makeNoise(1808), s: makeNoise(1909) };
/** Signed distance into the mesa (positive inside): a front edge facing the viewer and a west edge. */
function mesaD(x, y) {
  const yf = 215 + 10 * Math.sin(x / 37 + 0.5) + 5 * Math.sin(x / 13 + 1.1) + 2.5 * fbm(xN.a, x / 9, 1.7, 2);
  const xw = 530 - 0.3 * (y - 215) + 9 * Math.sin(y / 29 + 0.3) + 4 * Math.sin(y / 11 + 2) + 2.5 * fbm(xN.a, 3.3, y / 9, 2);
  return smin(y - yf, x - xw, 26);
}
const streamX = (y) => 400 - 0.24 * y + 14 * Math.sin(y / 45 + 0.6) + 6 * Math.sin(y / 17 + 1.9);
const streamD = (x, y) => Math.abs(x - streamX(y));
function cliffProfile(q) {
  // two cliff bands with a narrow bench between them (a soft bed)
  if (q < 0.4) return mix(X.ZFOOT, 120, q / 0.4);
  if (q < 0.56) return mix(120, 123, (q - 0.4) / 0.16);
  return mix(123, X.ZTOP, (q - 0.56) / 0.44);
}
function dune(x, y) {
  // crests bow downwind (west, −x) like barchan arms; slip face on the downwind side
  const bow = 18 * Math.abs(Math.sin(y / 34 + 0.4 + 0.6 * xN.a(x / 60, y / 60)));
  const ph = (x + 0.45 * y + bow + 26 * fbm(xN.a, x / 90, y / 90, 2)) / 62;
  const f = ph - Math.floor(ph);
  const p = f < 0.2 ? ss(0, 1, f / 0.2) : 1 - ss(0, 1, (f - 0.2) / 0.8);
  const broken = clamp(0.55 + 1.4 * fbm(xN.b, x / 45 + 3, y / 45, 3), 0.15, 1);
  return 11 * broken * p + 3 * fbm(xN.d, x / 30, y / 30, 2) + 0.08 * Math.sin((x + 0.5 * y + 2 * Math.sin(y / 5)) * 2.6);
}
const duneW = (x, y) => 1 - ss(streamX(y) - 78, streamX(y) - 46, x);
function exoGround(x, y) {
  let z = X.ZP + 1.6 * fbm(xN.b, x / 24, y / 24, 3) + 3.5 * fbm(xN.d, x / 80 + 9, y / 80, 3);
  const dv = streamD(x, y);
  z -= 11 * (1 - ss(8, 48, dv)) + 9 * (1 - ss(5, 16, dv)) + 2 * (1 - ss(3, 5.5, dv));
  const gl = ridged(xN.d, x / 9, y / 40, 2);
  z -= 1.6 * gl * gl * gl * ss(8, 20, dv) * (1 - ss(36, 50, dv));
  const wd = duneW(x, y);
  if (wd > 0) z += wd * dune(x, y);
  const d = mesaD(x, y);
  if (d > -50) {
    const q = clamp((d + 50) / 42, 0, 1);
    z = Math.max(z, mix(X.ZP + 1, X.ZFOOT - 2, Math.pow(q, 1.7)) + 1.5 * fbm(xN.e, x / 3, y / 3, 2) * q);
  }
  if (d > -8) z = Math.max(z, cliffProfile(clamp((d + 8) / 8, 0, 1)));
  if (d >= 0) z = X.ZTOP + 2 * fbm(xN.c, x / 30, y / 30, 3) - 1.5 * (1 - ss(0, 7, d)) + knoll(x, y);
  return z;
}
/**
 * A low knoll on the plateau behind the rim, under the far half of the shower:
 * a remnant of the next bed up, gentle toward the viewer and steep at its back,
 * so the rain falling just behind it is hidden below its crest.
 */
const KNOLL = { x: 636, y: 246, h: 15, rx: 32, front: 12, back: 7 };
function knoll(x, y) {
  const K = KNOLL;
  const dy = (y - K.y) / (y < K.y ? K.front : K.back);
  const r = Math.hypot((x - K.x) / K.rx, dy) * (1 + 0.12 * fbm(xN.a, x / 9 + 17, y / 9, 2));
  return r < 1 ? K.h * (1 - ss(0.3, 1, r)) * (1 + 0.06 * fbm(xN.e, x / 4, y / 4, 2)) : 0;
}
/**
 * Dry rills (small wadis) that drain the scree apron under the rain across the
 * plain into the stream: an east and a west branch that join into one trunk.
 * Each is carved into the ground with a bed that only ever falls downstream,
 * so the runoff's steepest-descent paths (exoOverlay) run down them.
 */
const RILLS = [
  { pts: [[684, 197], [680, 184], [672, 172], [656, 162], [634, 156], [608, 153], [582, 151], [556, 149]], w: 2.4, d: 1.1, seed: 1 },
  { pts: [[626, 190], [622, 178], [614, 168], [598, 160], [578, 154], [556, 149]], w: 2.2, d: 1, seed: 3 },
  { pts: [[556, 149], [532, 146], [506, 142], [480, 136], [456, 129], [434, 123], [414, 118], [396, 115], [380, 113]], w: 2.8, d: 1.4, seed: 5 },
].map((r, n, all) => {
  const path = meander(r.pts, 1.6, 26, r.seed);
  // the bed: the ground less the rill depth, never rising downstream (a trunk
  // starts no higher than the branches that end where it begins)
  const bed = [];
  let acc = 0;
  let low = Infinity;
  for (const b of all.slice(0, n)) {
    const e = b.bed && b.path[b.path.length - 1];
    if (e && Math.hypot(e[0] - path[0][0], e[1] - path[0][1]) < 1) low = Math.min(low, b.bed[b.bed.length - 1][1]);
  }
  for (let i = 0; i < path.length; i++) {
    if (i) acc += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    low = Math.min(low - (i ? 0.012 * Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]) : 0), exoGround(path[i][0], path[i][1]) - r.d);
    bed.push([acc, low]);
  }
  const pad = r.w * 3;
  const xs = path.map((p) => p[0]);
  const ys = path.map((p) => p[1]);
  return Object.assign(r, { path, bed, box: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad] });
});
function rillBed(r, at) {
  const b = r.bed;
  let i = 1;
  while (i < b.length - 1 && b[i][0] < at) i++;
  return mix(b[i - 1][1], b[i][1], clamp((at - b[i - 1][0]) / Math.max(1e-6, b[i][0] - b[i - 1][0]), 0, 1));
}
function exoZ(x, y) {
  const z = exoGround(x, y);
  let zc = Infinity;
  for (const r of RILLS) {
    if (x < r.box[0] || x > r.box[2] || y < r.box[1] || y > r.box[3]) continue;
    const dd = distToPolyline(x, y, r.path);
    if (dd < r.w * 3) zc = Math.min(zc, rillBed(r, POLY.at) + r.d * (Math.max(0, dd - 0.6) / (r.w - 0.6)) ** 2);
  }
  return zc < z + 0.8 ? smin(z, zc, 0.8) : z;
}
function exoBed(z, x) {
  const zz = z + 1.2 * fbm(xN.f, x / 26, z / 16, 2);
  let k = X.BEDS.length - 1;
  for (let i = 0; i < X.BEDS.length; i++)
    if (zz >= X.BEDS[i][0]) {
      k = i;
      break;
    }
  const hi = k === 0 ? X.ZTOP + 10 : X.BEDS[k - 1][0];
  const lo = X.BEDS[k][0];
  return bedRock(X.BEDS[k][1], x, zz, (zz - lo) / Math.max(1, hi - lo), xN.c);
}

function exoAlbedo(x, y, z, sl, cav) {
  const dv = streamD(x, y);
  if (dv < 4) {
    FLAT = true;
    const rip = xN.s(x / 1.6, y / 0.9);
    return mix3(WATER, WATER_LT, clamp(0.3 + rip * 1.1 + (1 - dv / 4) * 0.2, 0, 1));
  }
  let c = soilColor(xN.m, x, y);
  // wind-blown sand
  const wd = duneW(x, y);
  if (wd > 0) {
    let s = mix3(SAND, SAND_LT, clamp(0.55 + 1.1 * fbm(xN.m, x / 10, y / 10, 3), 0, 1));
    s = mul3(s, 1 + 0.04 * Math.sin((x + 0.5 * y + 2 * Math.sin(y / 5)) * 2.6));
    c = mix3(c, s, wd);
  }
  // scree apron at the cliff foot
  const d = mesaD(x, y);
  const tal = ss(-48, -36, d) * (1 - ss(-8, -6.5, d));
  if (tal > 0) c = mix3(c, mix3(rockColor(xN.e, x, y, cav), X.BEDS[1][1], 0.25), tal * 0.75);
  // exposed beds on steep ground (cliff, valley walls)
  const st = ss(0.32, 0.58, sl);
  if (st > 0) c = mix3(c, mul3(exoBed(z, x + y * 0.3), 1 - clamp(xN.r(x / 0.8 + y * 0.3, z / 10), 0, 1) * 0.1), st);
  // mesa top: bare limestone pavement between soil patches
  if (d > 0) c = mix3(c, rockColor(xN.r, x, y, cav), ss(-0.05, 0.25, fbm(xN.r, x / 13, y / 13, 3)) * 0.6);
  // gravel bars and wet banks along the stream
  if (dv < 9) c = mix3(mul3(c, mix(0.82, 1, ss(4, 9, dv))), GRAVEL, (1 - ss(4, 7, dv)) * 0.35 * ss(-0.2, 0.3, xN.s(x / 6, y / 6)));
  return mul3(c, 1 + 0.09 * xN.f(x / 1.4, y / 1.4));
}

function exoFace(x, z, hs) {
  const dv = streamD(x, 0);
  if (dv < 4 && z > hs - 1.6) {
    EMIT = true;
    return mix3(WATER, WATER_LT, 0.25);
  }
  const wd = duneW(x, 0);
  const soil = soilHorizon(x, z, hs);
  if (soil && wd < 0.5) return soil;
  // dune sand over the bedrock of the plain, with cross-bedding
  const rockTop = X.ZP - 1.5 + 1.8 * fbm(xN.b, x / 24, 0, 3);
  if (wd > 0.05 && z > rockTop) {
    const xb = Math.sin((x - (z - rockTop) * 2.2) * 0.9) * 0.5 + 0.5;
    return mul3(mix3(SAND, SAND_LT, 0.4), 0.94 + 0.08 * xb + 0.04 * FACEN(x / 0.8, z / 0.8));
  }
  // stream gravels at the base of the notch
  if (dv < 16 && z > hs - 4 && z < rockTop) return mix3(GRAVEL, ROCK_DK, 0.25 + 0.3 * FACEN(x / 0.7, z / 0.7));
  return exoBed(z, x);
}

function exoScatters(L) {
  return [
    // scree blocks on the talus
    new Scatter({
      seed: 21,
      spacing: 1.7,
      size: (r) => 0.5 + r() * 1.1,
      palette: STONES,
      shadow: 0.55,
      sharp: 0.12,
      light: 0.45,
      density: (x, y) => {
        const d = mesaD(x, y);
        return ss(-46, -30, d) * (1 - ss(-12, -9, d)) * 0.55;
      },
    }),
    // shrubs; dense along the stream, almost none on the dunes
    new Scatter({
      seed: 12,
      spacing: 2.4,
      size: (r) => 0.6 + r() * 0.8,
      palette: SHRUBS,
      density: (x, y) => {
        const dv = streamD(x, y);
        if (dv < 4.8) return 0;
        const d = mesaD(x, y);
        if (d > -10 && d < 2) return 0;
        const sl = L.slope.at(x, y);
        let dd = 0.42 * ss(-0.05, 0.3, fbm(xN.f, x / 14, y / 14, 3)) + 0.75 * (1 - ss(5, 15, dv));
        dd *= 1 - duneW(x, y) * 0.94;
        dd *= 1 - ss(0.35, 0.6, sl) * 0.85;
        return clamp(dd, 0, 0.95);
      },
    }),
    new Scatter({
      seed: 13,
      spacing: 2.2,
      size: (r) => 0.8 + r() * 0.8,
      palette: RIPARIAN,
      density: (x, y) => {
        const dv = streamD(x, y);
        return dv > 4.6 && dv < 11 ? 0.6 : 0;
      },
    }),
  ];
}

// ── the rain: a cloud in the world, its shower and the runoff it feeds ──────
/**
 * The rain cloud hovers over the mesa's front rim, so the shower under it falls
 * partly in front of the cliff (onto the scree) and partly onto the plateau
 * beyond the rim. It is a cluster of soft ellipsoids [x, y, z, rx, ry, rz]
 * blended into one body with a flat, greyer base, ray-marched and lit by the
 * scene's sun, and it casts a soft shadow on the land.
 */
const CLOUD = {
  blobs: [
    [608, 216, 200, 22, 20, 12],
    [634, 222, 211, 26, 23, 19],
    [662, 214, 219, 28, 24, 24],
    [690, 220, 207, 25, 22, 15],
    [648, 199, 199, 28, 18, 10],
    [714, 212, 199, 14, 13, 8],
    [592, 220, 197, 11, 11, 7],
    [677, 227, 227, 18, 16, 14],
    [636, 252, 212, 34, 18, 14],
  ],
  base: 190,
  top: 246,
  box: [574, 176, 732, 272],
};
/**
 * The shower: drops leave the cloud base over a footprint of four depth bands
 * (world y and x ranges; the near bands fall past the cliff face east of the
 * knoll, the far band falls just behind its crest, which hides where it lands)
 * and drift west with the wind (dx per unit of fall, as over the dunes) until
 * they meet the land. slots × per drop paths are exported; per = paths per slot.
 */
const RAIN = {
  bands: [
    { y: [184, 204], x: [660, 712] },
    { y: [204, 222], x: [640, 708] },
    { y: [222, 240], x: [626, 700] },
    { y: [251, 262], x: [616, 652] },
  ],
  y0: 184,
  y1: 262,
  wind: -0.24,
  slots: 44,
  per: 3,
  splash: 2.6,
};
const cN = makeNoise(4343);
const smax = (a, b, k) => -smin(-a, -b, k);
function cloudDens(x, y, z) {
  const [bx0, by0, bx1, by1] = CLOUD.box;
  if (x < bx0 || x > bx1 || y < by0 || y > by1 || z < CLOUD.base - 6 || z > CLOUD.top + 6) return -1;
  let d = -1;
  for (const b of CLOUD.blobs) d = smax(d, 1 - ((x - b[0]) / b[3]) ** 2 - ((y - b[1]) / b[4]) ** 2 - ((z - b[2]) / b[5]) ** 2, 0.3);
  if (d < -0.5) return d;
  d += 0.26 * fbm(cN, x / 9 + z / 15, y / 9 - z / 21, 3) + 0.1 * cN(x / 3.5 + y / 7, z / 3.5);
  return d - 1.5 * (1 - ss(CLOUD.base - 1, CLOUD.base + 6, z));
}

/** In-place box blur (two passes) of a w × h array. */
function boxBlur(a, w, h, r) {
  const tmp = new Float32Array(a.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let s = 0;
        for (let d = -r; d <= r; d++) s += a[y * w + clamp(x + d, 0, w - 1)];
        tmp[y * w + x] = s / (2 * r + 1);
      }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let s = 0;
        for (let d = -r; d <= r; d++) s += tmp[clamp(y + d, 0, h - 1) * w + x];
        a[y * w + x] = s / (2 * r + 1);
      }
  }
}

/** Ray-marches the cloud into the image; returns its opacity per pixel (for the overlay's occlusion). */
function paintCloud(img) {
  const A = new Float32Array(IW * IH);
  const [bx0, by0, bx1, by1] = CLOUD.box;
  const cs = [];
  for (const x of [bx0, bx1]) for (const y of [by0, by1]) for (const z of [CLOUD.base - 6, CLOUD.top + 6]) cs.push(vb(x, y, z));
  const px0 = Math.max(0, Math.floor(Math.min(...cs.map((p) => p[0])) * S));
  const px1 = Math.min(IW, Math.ceil(Math.max(...cs.map((p) => p[0])) * S));
  const py0 = Math.max(0, Math.floor(Math.min(...cs.map((p) => p[1])) * S));
  const py1 = Math.min(IH, Math.ceil(Math.max(...cs.map((p) => p[1])) * S));
  const LIT = hex('#FCF6EA');
  const SKY = hex('#D6DAD8');
  const BASE = hex('#8B8985');
  const K = 0.3;
  const dt = 0.8;
  // the cloud layer (premultiplied colour + opacity), softened a touch before compositing
  const bw = px1 - px0;
  const bh = py1 - py0;
  const lay = [0, 1, 2, 3].map(() => new Float32Array(bw * bh));
  for (let py = py0; py < py1; py++)
    for (let px = px0; px < px1; px++) {
      const k = py * IW + px;
      // the ray through this pixel: x = 450 + ax·t, y = t − 900, z = 755 − az·t
      const ax = ((px + 0.5) / S - IW / 2 / S) / (F / S);
      const az = ((py + 0.5) / S - H0 / S) / (F / S);
      let ta = by0 - CAM.y;
      let tb = Math.min(by1 - CAM.y, img.depth[k]);
      ta = Math.max(ta, (CAM.z - CLOUD.top - 6) / az);
      tb = Math.min(tb, (CAM.z - CLOUD.base + 6) / az);
      if (ta >= tb) continue;
      let tr = 1;
      let cr = 0;
      let cg = 0;
      let cb = 0;
      for (let t = ta + dt / 2; t < tb; t += dt) {
        const x = CAM.x + ax * t;
        const y = t + CAM.y;
        const z = CAM.z - az * t;
        const d = cloudDens(x, y, z);
        if (d <= 0) continue;
        const a = 1 - Math.exp(-K * d * dt);
        // sunlight reaching this point through the cloud
        let od = 0;
        for (let s = 2; s < 26; s += 4) od += Math.max(0, cloudDens(x + SUN[0] * s, y + SUN[1] * s, z + SUN[2] * s)) * 4;
        const sun = Math.exp(-0.24 * od);
        const amb = mix3(BASE, SKY, ss(CLOUD.base, CLOUD.top - 12, z));
        // a rain cloud: its flat base is a darker grey
        const w = tr * a * mix(0.8, 1, ss(CLOUD.base, CLOUD.base + 16, z));
        cr += w * (amb[0] * 0.56 + LIT[0] * 0.7 * sun);
        cg += w * (amb[1] * 0.56 + LIT[1] * 0.7 * sun);
        cb += w * (amb[2] * 0.56 + LIT[2] * 0.7 * sun);
        tr *= 1 - a;
        if (tr < 0.01) break;
      }
      const al = 1 - tr;
      if (al < 0.004) continue;
      const q = (py - py0) * bw + px - px0;
      lay[0][q] = cr;
      lay[1][q] = cg;
      lay[2][q] = cb;
      lay[3][q] = al;
      A[k] = al;
    }
  for (const L of lay) boxBlur(L, bw, bh, 2);
  for (let py = py0; py < py1; py++)
    for (let px = px0; px < px1; px++) {
      const q = (py - py0) * bw + px - px0;
      const al = lay[3][q];
      if (al < 0.004) continue;
      const k = py * IW + px;
      for (let c = 0; c < 3; c++) img.col[k * 3 + c] = lay[c][q] + (1 - al) * img.col[k * 3 + c];
      if (al > 0.03) img.id[k] = 5; // brushed like the land (unlike the sky)
    }
  return { a: A };
}

/** The cloud's soft shadow: dims the direct sun wherever the sun's ray passes through it. */
function cloudShadow(H, L) {
  const { nx, ny, cs } = H;
  const tx = SUN[0] / SUN[2];
  const ty = SUN[1] / SUN[2];
  const [bx0, by0, bx1, by1] = CLOUD.box;
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const x = i * cs;
      const y = j * cs;
      const z = H.a[k];
      const h0 = CLOUD.base - 6 - z;
      const h1 = CLOUD.top + 6 - z;
      if (h0 <= 0) continue;
      if (Math.max(x + tx * h0, x + tx * h1) < bx0 || Math.min(x + tx * h0, x + tx * h1) > bx1) continue;
      if (Math.max(y + ty * h0, y + ty * h1) < by0 || Math.min(y + ty * h0, y + ty * h1) > by1) continue;
      let od = 0;
      const n = 14;
      const step = (h1 - h0) / n / SUN[2];
      for (let q = 0; q < n; q++) {
        const h = h0 + ((h1 - h0) * (q + 0.5)) / n;
        od += Math.max(0, cloudDens(x + tx * h, y + ty * h, z + h)) * step;
      }
      L.dir.a[k] *= 1 - 0.5 * (1 - Math.exp(-0.22 * od));
    }
}

/** First point of the mesa (its front cliff edge) along a line at constant x. */
function edgeY(x) {
  let y = 100;
  while (y < LY && mesaD(x, y) < 0) y += 0.25;
  return y;
}

/** Label targets: the rain under the cloud's west end, the cliff and the scree east of the shower, the stream, a dune. */
function exoAnchors(H) {
  const r = (p) => p.map((v) => Math.round(v * 10) / 10);
  const onLand = (x, y) => r(vb(x, y, H.at(x, y)));
  return {
    rain: r(vb(596, 214, CLOUD.base)),
    cliff: r(vb(750, edgeY(750) - 3, 121)),
    talus: onLand(740, edgeY(740) - 26),
    streamMid: onLand(streamX(170), 170),
    dune: onLand(240, 70),
  };
}

// ── overlay geometry → src/components/lessons/topic-02/exogenicOverlay.data.ts ──
// (next to the images instead when they are rendered elsewhere with --out)
const OVERLAY_TS = opt('out') ? path.join(OUT, 'exogenicOverlay.data.ts') : path.join(root, 'src/components/lessons/topic-02/exogenicOverlay.data.ts');

/**
 * Everything the exogenic overlay animates, projected through the render
 * camera: the drops (with the parts of their fall the camera sees — the land
 * and the cloud hide the rest), splashes, rain veil, the runoff's
 * steepest-descent paths to the stream, the stream's centreline, the dunes'
 * saltation paths and the rockfall trajectories.
 */
function exoOverlay(H, img, cl) {
  const rd = (v, n = 1) => Math.round(v * 10 ** n) / 10 ** n;
  const sp = (p) => [rd(p[0]), rd(p[1])];
  const pix = (sx, sy) => {
    const px = Math.floor(sx * S);
    const py = Math.floor(sy * S);
    return px < 0 || py < 0 || px >= IW || py >= IH ? -1 : py * IW + px;
  };
  /**
   * Does the camera see the world point — not hidden behind the land, nor
   * under the cloud's body on screen (opacity beyond cloudMax)? Rain hangs below
   * the cloud, so the cloud is treated as in front of it.
   */
  const seen = (x, y, z, eps = 0.6, cloudMax = 0.5) => {
    const [sx, sy] = vb(x, y, z);
    const k = pix(sx, sy);
    if (k < 0) return false;
    const t = y - CAM.y;
    return img.depth[k] >= t - eps && cl.a[k] <= cloudMax;
  };
  const unit = (y) => F / S / (y - CAM.y); // viewBox units per world unit at depth y
  const baseAt = (x, y) => {
    for (let z = CLOUD.base - 3; z < CLOUD.top; z += 0.4) if (cloudDens(x, y, z) > 0.15) return z - 0.6;
    return null;
  };
  /** A drop leaving the cloud base above (x, y): its fall to the land and what the camera sees of it. */
  const fall = (xs, ys, cloudMax = 0.5) => {
    // rain falls from the cloud's flat base (not from its thin, rising edges)
    const z0 = baseAt(xs, ys);
    if (z0 === null || z0 > CLOUD.base + 16) return null;
    let z = z0;
    let x = xs;
    for (;;) {
      const zn = z - 0.2;
      const xn = xs + RAIN.wind * (z0 - zn);
      if (zn <= H.at(xn, ys) || zn < 0) break;
      z = zn;
      x = xn;
    }
    const z1 = H.at(x, ys);
    const a = vb(xs, ys, z0);
    const b = vb(x, ys, z1);
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.35);
    const vis = [];
    let open = -1;
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const on = seen(mix(xs, x, s), ys, mix(z0, z1, s), i === n ? 1.5 : 0.6, cloudMax);
      if (on && open < 0) open = s;
      if (!on && open >= 0) {
        vis.push([rd(open, 3), rd((i - 1) / n, 3)]);
        open = -1;
      }
    }
    if (open >= 0) vis.push([rd(open, 3), 1]);
    return { a, b, z0, z1, x1: x, len: (z0 - z1) * Math.hypot(1, RAIN.wind), vis };
  };

  // ── drops: depth-stratified, every slot mixing near and far paths; most fall
  // past the cliff face (near) or behind the knoll (far)
  const BANDS = [0, 3, 1, 0, 3, 2, 3, 1, 0, 3];
  const rnd = mulberry(4711);
  const drops = [];
  for (let tries = 0; drops.length < RAIN.slots * RAIN.per && tries < 50000; tries++) {
    const band = BANDS[drops.length % BANDS.length];
    const B = RAIN.bands[band];
    const ys = mix(B.y[0], B.y[1], rnd());
    const xs = mix(B.x[0], B.x[1], rnd());
    const f = fall(xs, ys);
    if (!f || !f.vis.length) continue;
    const last = f.vis[f.vis.length - 1];
    const land = last[1] === 1;
    // the splash: a ring of radius RAIN.splash lying in the ground's tangent plane
    const hx = H.at(f.x1 + 0.5, ys) - H.at(f.x1 - 0.5, ys);
    const hy = H.at(f.x1, ys + 0.5) - H.at(f.x1, ys - 0.5);
    const ring = (e, k) => vb(f.x1 + e[0] * k, ys + e[1] * k, f.z1 + e[2] * k);
    const axes = [norm3([1, 0, hx]), norm3([0, 1, hy])];
    const ex = Math.max(...axes.map((e) => Math.abs(ring(e, RAIN.splash)[0] - ring(e, -RAIN.splash)[0]) / 2));
    const ey = Math.max(...axes.map((e) => Math.abs(ring(e, RAIN.splash)[1] - ring(e, -RAIN.splash)[1]) / 2));
    // no splash ring where a drop strikes the cliff face or the steep top of the scree (the water just runs off)
    const steep = Math.hypot(hx, hy) > 0.9;
    const splash = steep ? [0, 0] : [rd(ex, 2), rd(Math.min(ey, ex * 0.6), 2)];
    drops.push({ a: sp(f.a), b: sp(f.b), len: rd(f.len), dep: rd((ys - RAIN.y0) / (RAIN.y1 - RAIN.y0), 2), vis: f.vis, land, splash });
  }

  // ── the rain veil: one translucent sheet per depth band, hanging from the
  // cloud's lowest edge on screen (the start of the last visible run of each
  // fall, clear of the cloud) to where the camera last sees the fall
  const veil = [];
  for (let band = 0; band < 4; band++) {
    const B = RAIN.bands[band];
    const ys = (B.y[0] + B.y[1]) / 2;
    const top = [];
    const bot = [];
    let hidden = 0;
    for (let xs = B.x[0] - 6; xs <= B.x[1] + 6; xs += 3) {
      const f = fall(xs, ys, 0.08);
      if (!f || !f.vis.length) continue;
      const at = (s) => [mix(f.a[0], f.b[0], s), mix(f.a[1], f.b[1], s)];
      top.push(at(f.vis[f.vis.length - 1][0]));
      bot.push(at(f.vis[f.vis.length - 1][1]));
      if (f.vis[f.vis.length - 1][1] < 1) hidden++;
    }
    const smooth = (pts) => pts.map((p, i) => [0, 1].map((c) => (pts[Math.max(0, i - 1)][c] + p[c] * 2 + pts[Math.min(pts.length - 1, i + 1)][c]) / 4));
    // cut: the land hides the foot of this sheet (it ends at a crest, not on the ground)
    veil.push({ dep: rd((ys - RAIN.y0) / (RAIN.y1 - RAIN.y0), 2), cut: hidden > top.length / 2, pts: [...smooth(top), ...smooth(bot).reverse()].map(sp) });
  }

  // ── runoff: from where the near drops land on the scree, steepest descent on
  // the height field's grid (D8: always on to the lowest lower neighbour) down
  // the rills into the stream; smoothed a little for drawing, and a branch ends
  // where it joins one already traced
  const descend = (x, y) => {
    const { nx, ny, cs, a } = H;
    let i = Math.round(x / cs);
    let j = Math.round(y / cs);
    const cells = [[i, j]];
    for (let n = 0; n < 20000; n++) {
      const k = j * nx + i;
      let best = 0;
      let bi = -1;
      let bj = -1;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const ii = i + di;
          const jj = j + dj;
          if ((!di && !dj) || ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
          const drop = (a[k] - a[jj * nx + ii]) / Math.hypot(di, dj);
          if (drop > best) {
            best = drop;
            bi = ii;
            bj = jj;
          }
        }
      if (bi < 0) return null; // a pit
      i = bi;
      j = bj;
      cells.push([i, j]);
      if (streamD(i * cs, j * cs) < 3.4) return cells.map((c, m) => {
        const w = cells.slice(Math.max(0, m - 3), m + 4);
        return [(w.reduce((s2, q) => s2 + q[0], 0) / w.length) * cs, (w.reduce((s2, q) => s2 + q[1], 0) / w.length) * cs];
      });
    }
    return null;
  };
  const flows = [];
  for (const [x0, back] of RAIN_SEEDS) {
    const p = descend(x0, edgeY(x0) - back);
    if (!p) {
      console.warn(`runoff seed ${x0} does not reach the stream`);
      continue;
    }
    // stop where it joins a branch already traced
    let cut = p.length;
    for (let i = 20; i < p.length && cut === p.length; i++)
      for (const q of flows)
        if (q.full.some((o) => Math.hypot(o[0] - p[i][0], o[1] - p[i][1]) < 0.8)) {
          cut = i + 1;
          break;
        }
    const w = p.slice(0, cut).filter((_, i, a) => i % 4 === 0 || i === a.length - 1);
    flows.push({ pts: w, full: p.slice(0, cut), joins: cut < p.length });
  }
  const runoff = flows.map((f) => {
    let len = 0;
    let wl = 0;
    const pts = f.pts.map((p, i) => {
      const s = vb(p[0], p[1], H.at(p[0], p[1]) + 0.15);
      if (i) {
        const q = f.pts[i - 1];
        const t = vb(q[0], q[1], H.at(q[0], q[1]) + 0.15);
        len += Math.hypot(s[0] - t[0], s[1] - t[1]);
        wl += Math.hypot(p[0] - q[0], p[1] - q[1], H.at(p[0], p[1]) - H.at(q[0], q[1]));
      }
      return s;
    });
    return { pts: pts.map(sp), len: rd(len), wl: rd(wl), joins: f.joins };
  });

  // ── the stream's centreline, downstream (from the far end toward the cut)
  const stream = [];
  let acc = 0;
  let prev = null;
  for (let y = 444; y >= 0; y -= 2) {
    const x = streamX(y);
    const z = H.at(x, y) + 0.1;
    if (prev) acc += Math.hypot(x - prev[0], y - prev[1], z - prev[2]);
    prev = [x, y, z];
    const [sx, sy] = vb(x, y, z);
    const hw = (vb(x + 3.4, y, z)[0] - vb(x - 3.4, y, z)[0]) / 2;
    const far = (y - CAM.y - T0) / LY;
    stream.push([rd(sx), rd(sy), rd(hw, 2), rd(acc), rd(clamp(ss(0.55, 0.86, far), 0, 1), 2), seen(x, y, z, 1.5) ? 1 : 0]);
  }
  const trunk = flows.find((f) => !f.joins);
  const end = trunk.pts[trunk.pts.length - 1];
  let join = 0;
  for (let i = 0; i < stream.length; i++) if (Math.abs(444 - i * 2 - end[1]) < Math.abs(444 - join * 2 - end[1])) join = i;
  // the swollen water below the junction, a little wider than the stream
  const bank = (side) => {
    const out = [];
    for (let y = 444 - join * 2; y >= -0.1; y -= 3) {
      const x = streamX(y) + side * 5.6;
      out.push(sp(vb(x, y, H.at(streamX(y), y) + 0.1)));
    }
    return out;
  };

  // ── dunes: saltation paths up the windward (east) slope, over the crest,
  // onto the lee; the wind blows west (−x)
  const crests = [];
  for (let y = 24; y < 300; y += 6)
    for (let x = streamX(y) - 64; x > 24; x -= 0.5) {
      if (duneW(x, y) < 0.98) continue;
      const h = H.at(x, y);
      if (h < H.at(x - 0.5, y) || h < H.at(x + 0.5, y)) continue;
      if (h - H.at(x - 5, y) < 1.6 || h - H.at(x + 22, y) < 1) continue;
      const [sx, sy] = vb(x, y, h);
      if (sx < 40 || sx > 232 || sy < 140 || sy > 285) continue;
      if (Math.hypot(sx - 86, sy - 251) < 22) continue; // keep clear of the dunes label's leader point
      if (!seen(x, y, h, 1)) continue;
      crests.push({ x, y, sx, sy });
    }
  // spread them out (farthest-point picking)
  const pick = [crests[Math.floor(crests.length / 2)]];
  while (pick.length < 7) {
    let best = null;
    let bd = -1;
    for (const c of crests) {
      const d = Math.min(...pick.map((p) => Math.hypot(p.sx - c.sx, (p.sy - c.sy) * 1.6)));
      if (d > bd) {
        bd = d;
        best = c;
      }
    }
    pick.push(best);
  }
  const dunes = pick
    .sort((a, b) => a.sy - b.sy)
    .map((c) => {
      const pts = [];
      for (let x = c.x + 22; x >= c.x - 5; x -= 1) pts.push(sp(vb(x, c.y, H.at(x, c.y))));
      return { pts, crest: 22, up: rd(unit(c.y), 3) };
    });

  // ── rockfall: a block toppling off the cap rock, falling down the cliff,
  // bouncing and rolling down the scree until it rests on the apron
  const rocks = ROCKFALL.map((x0) => rockfall(H, x0, unit, sp, rd));

  return { drops, veil, runoff, stream, join, turbid: [...bank(-1), ...bank(1).reverse()], dunes, rocks };
}

// Runoff seeds on the scree under the shower: [x, distance in front of the cliff edge].
const RAIN_SEEDS = [
  [684, 14],
  [648, 12],
  [664, 16],
  [674, 13],
];
// Rockfall start points (world x) along the cap rock, one per cycle.
const ROCKFALL = [559, 552, 565];

function rockfall(H, x0, unit, sp, rd) {
  const r = 3; // the block's radius
  const g = 160;
  const dt = 1 / 240;
  const yE = edgeY(x0);
  // it topples off the cap rock just below the rim, outward (toward the viewer)
  const p = [x0, yE - 3.2, X.ZTOP - 4];
  const v = [0.8, -13, 6];
  const pts = [];
  const impacts = [];
  let ang = 0;
  let still = 0;
  let t = 0;
  for (let i = 0; i < 240 * 4; i++) {
    t = i * dt;
    v[2] -= g * dt;
    for (let c = 0; c < 3; c++) p[c] += v[c] * dt;
    const gz = H.at(p[0], p[1]);
    if (p[2] - r < gz) {
      const hx = H.at(p[0] + 0.5, p[1]) - H.at(p[0] - 0.5, p[1]);
      const hy = H.at(p[0], p[1] + 0.5) - H.at(p[0], p[1] - 0.5);
      const n = norm3([-hx, -hy, 1]);
      const vn = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
      if (vn < 0) {
        // a bounce: some of the normal speed comes back, the sliding speed is damped
        if (-vn > 14) impacts.push([rd(t, 3), ...sp(vb(p[0], p[1], gz)), rd(Math.min(1, -vn / 55), 2)]);
        for (let c = 0; c < 3; c++) v[c] -= 1.42 * vn * n[c];
        const vv = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
        for (let c = 0; c < 3; c++) v[c] = vv * n[c] + (v[c] - vv * n[c]) * 0.8;
      }
      p[2] = gz + r;
      // rolling resistance; it stops where the apron flattens out
      const s = Math.hypot(v[0], v[1], v[2]);
      if (s > 0) {
        const k = (Math.max(0, s - 0.42 * g * dt) / s) * (1 - 0.8 * dt);
        for (let c = 0; c < 3; c++) v[c] *= k;
      }
      still = s < 3 && Math.hypot(hx, hy) < 0.75 ? still + dt : 0;
      if (still > 0.08) break;
    }
    ang += (Math.hypot(v[0], v[1], v[2]) / r) * dt * (180 / Math.PI) * 0.5;
    if (i % 4 === 0) pts.push([...sp(vb(p[0], p[1], p[2])), Math.round(ang)]);
  }
  pts.push([...sp(vb(p[0], p[1], p[2])), Math.round(ang)]);
  return { pts, impacts, k: rd(unit(p[1]), 3), dur: rd(t, 2) };
}

function writeOverlay(o) {
  const J = (v) => JSON.stringify(v);
  const src = `/**
 * Exogenic overlay geometry — GENERATED by scripts/media/render-geology-forces.cjs
 * from the exogenic scene's height field, cloud and camera. Do not edit by hand;
 * regenerate with
 *   node scripts/media/render-geology-forces.cjs --only exo    (repaints forces/exo.webp and rewrites this file)
 *   node scripts/media/render-geology-forces.cjs --overlay     (rewrites this file only)
 * All points are in the forces viewBox (560 × 360); "world" lengths are in the
 * script's world units. Used by ExogenicActivity.tsx.
 */
type P = readonly [number, number];

/**
 * A raindrop's fall: from the cloud base (a) to where it meets the land (b),
 * world fall length, depth 0 (near) … 1 (far), the fractions of the fall the
 * camera sees (the land and the cloud hide the rest), whether the landing is
 * seen, and the splash's perspective-flattened half-axes ([0, 0]: it strikes
 * steep rock, no splash).
 */
export type ExoDrop = { a: P; b: P; len: number; dep: number; vis: readonly P[]; land: boolean; splash: P };
/** Drop paths; slot i of the shower falls along DROPS[i * ${RAIN.per} + k], k = 0…${RAIN.per - 1} in turn. */
export const DROPS_PER_SLOT = ${RAIN.per};
export const DROPS: readonly ExoDrop[] = ${J(o.drops)};

/**
 * The rain veil: one sheet per depth band (top edge left → right, then the
 * bottom edge back); cut: its foot is hidden behind relief (it ends at a crest).
 */
export const VEIL: readonly { dep: number; cut: boolean; pts: readonly P[] }[] = ${J(o.veil)};

/**
 * Runoff: steepest-descent paths on the land from the scree under the rain to
 * the stream (screen points; screen and world length; a branch that joins
 * another ends at the junction).
 */
export const RUNOFF: readonly { pts: readonly P[]; len: number; wl: number; joins: boolean }[] = ${J(o.runoff)};

/**
 * The stream's centreline downstream (far end → the cut): [x, y, water
 * half-width, world distance from the far end, haze 0…1, seen 0|1]; JOIN is the
 * sample where the runoff enters. TURBID: the water below the junction when the
 * stream swells (an outline a little wider than the water).
 */
export const STREAM: readonly (readonly [number, number, number, number, number, number])[] = ${J(o.stream)};
export const STREAM_JOIN = ${o.join};
export const TURBID: readonly P[] = ${J(o.turbid)};

/**
 * Dunes: ground points every world unit from the windward slope (east) over
 * the crest (index crest) onto the lee face (west); up = viewBox units per
 * world unit of height there.
 */
export const DUNES: readonly { pts: readonly P[]; crest: number; up: number }[] = ${J(o.dunes)};

/**
 * Rockfall trajectories (one per cycle): [x, y, rotation°] at 60 fps, impacts
 * [time s, x, y, strength 0…1], the block's scale (viewBox units per world
 * unit) where it rests, and the time it comes to rest.
 */
export const ROCKS: readonly { pts: readonly (readonly [number, number, number])[]; impacts: readonly (readonly [number, number, number, number])[]; k: number; dur: number }[] = ${J(o.rocks)};
`;
  fs.writeFileSync(OVERLAY_TS, src);
  console.log(path.relative(root, OVERLAY_TS), Math.round(src.length / 1024) + ' KB');
}

// ── main ────────────────────────────────────────────────────────────────────
// (requirable for inspecting the geometry from other scripts; renders only when run)
module.exports = { vb, Field, exoZ, exoGround, edgeY, mesaD, streamX, cloudDens, rockfall, CLOUD, RAIN, RILLS };
if (require.main === module) (async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const anchors = {};
  const t0 = Date.now();
  if (ANCHORS_ONLY) {
    anchors.endo = endoAnchors(new Field().fill((x, y) => endoZ(x, y, 1)));
    anchors.exo = exoAnchors(new Field().fill(exoZ));
    console.log(JSON.stringify(anchors));
    return;
  }
  if (!OVERLAY_ONLY && (ONLY.startsWith('endo') || ONLY === 'all')) {
    const final = endoScene(1, []);
    final.scatters = endoScatters(final.L);
    anchors.endo = endoAnchors(final.H);
    const frames = ONLY === 'endo-final' ? [FRAMES - 1] : Array.from({ length: FRAMES }, (_, i) => i);
    for (const i of frames) {
      const t = i / (FRAMES - 1);
      const sc = i === FRAMES - 1 ? final : endoScene(t, final.scatters);
      await save(finish(render(sc)), `endo-${String(i).padStart(2, '0')}`);
      console.log(`  t=${t.toFixed(2)}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
  }
  if (ONLY === 'all' || ONLY === 'exo' || OVERLAY_ONLY) {
    const H = new Field().fill(exoZ);
    const L = lighting(H);
    cloudShadow(H, L);
    const sc = { H, L, scatters: exoScatters(L), albedo: exoAlbedo, face: exoFace };
    const img = render(sc);
    const cl = paintCloud(img);
    writeOverlay(exoOverlay(H, img, cl));
    if (!OVERLAY_ONLY) await save(finish(img), 'exo');
    anchors.exo = exoAnchors(H);
    console.log(`  exo  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  console.log(JSON.stringify(anchors, null, 1));
})();
