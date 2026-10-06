'use strict';
/**
 * Painted terrain — the shared painting kit of the topic-02 geology renders
 * (render-geology-forces.cjs, render-geology-rocks.cjs).
 *
 * Style: stylized oblique aerial terrain — one continuous, sculpted and painted
 * landscape seen from above at an angle (foreground, middle ground, hazy
 * background), after the lesson's onboarding renders
 * (public/assets/scene-onboarding/topic-02/states/state-1…3), with a cut along
 * the near edge that reveals the rock beneath.
 *
 * Pipeline: height fields → sun + sky light, soft cast shadows and hollows →
 * painted materials → a perspective column renderer → light brush (Kuwahara)
 * finish and paper grain.
 *
 * Frame-independent pieces (math, noise, light, palette, materials) are module
 * exports; everything that depends on the frame and camera comes from
 * painter(frame). Scenes set flags.flat (flat-lit material, e.g. water),
 * flags.emit (unlit colour, e.g. magma) or flags.cleaved (a cut-face rock whose
 * relief follows a vertical cleavage, e.g. slate) from their material functions.
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));

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
/** A polyline densified, with a gentle meander (two wavelengths) that grows from its start. */
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

// ── light ───────────────────────────────────────────────────────────────────
// Warm sun from the left and a little in front: west- and viewer-facing slopes
// catch it, east flanks and steep steps fall into soft cool shade.
const SUN = norm3([-0.62, -0.42, 0.62]);
const SUN_H = norm3([SUN[0], SUN[1], 0]);
const AMB = [0.47, 0.48, 0.55];
const SUNC = [0.8, 0.73, 0.6];
const HAZE = hex('#E9E3D5');
const SKY_TOP = hex('#DCE5E3');
const SKY_LOW = hex('#EFE8DA');

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

/**
 * Shading flags set by the material functions for the current pixel: emit (unlit colour), flat
 * (flat-lit surface), cleaved (the cut face's relief runs along a vertical cleavage, not the bedding).
 */
const flags = { emit: false, flat: false, cleaved: false };

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
  flags.emit = true;
  const q = clamp(e, 0, 1);
  return q < 0.5 ? mix3(MAGMA[0], MAGMA[1], q / 0.5) : mix3(MAGMA[1], MAGMA[2], (q - 0.5) / 0.5);
}

/**
 * The frame and camera of one board, and everything that depends on them.
 *
 *   VB_W × VB_H   the overlay viewBox the image matches
 *   S, OUT_S      internal px per viewBox unit / delivered px per unit
 *   LX, LY        world extent: x across (0…LX), y into the distance (0 = the cut near edge), z up
 *   CAM, F        perspective camera looking along +y; focal length in viewBox units
 *                 (vertical lines stay vertical: a shifted horizon, as in a painted aerial view)
 *   Y0            viewBox y of z = 0 on the near edge
 *   out, preview, root, kuwahara   where save() writes, a PNG preview folder, the repo root (for
 *                 logging), the brush radius
 */
function painter(frame) {
  const { VB_W, VB_H, S, OUT_S, LX, LY, CAM } = frame;
  const IW = VB_W * S;
  const IH = VB_H * S;
  const F = frame.F * S;
  const H0 = (frame.Y0 - CAM.z) * S;
  const T0 = -CAM.y; // forward distance to the near edge
  const vb = (x, y, z) => {
    const t = y - CAM.y;
    return [(IW / 2 + (F * (x - CAM.x)) / t) / S, (H0 + (F * (CAM.z - z)) / t) / S];
  };

  // ── fields ────────────────────────────────────────────────────────────────
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

  // ── light ─────────────────────────────────────────────────────────────────
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

  // ── scattered shrubs / stones (procedural, any resolution) ────────────────
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

  const skyAt = (py) => mix3(SKY_TOP, SKY_LOW, ss(0, IH * 0.32, py));

  // ── renderer ──────────────────────────────────────────────────────────────
  /**
   * Perspective column renderer: every image column is a vertical plane through
   * the camera. It enters the land through the cut near edge (drawn as a rock
   * face), then the surface is marched front → back, each sample filling the
   * rows it newly reveals (interpolated between samples, so steep walls get
   * their own pixels). id per pixel: 0 sky, 1 land surface, 2 the cut face.
   * With sc.world set it also records each pixel's world point (wx, wy, wz).
   */
  function render(sc) {
    const col = new Float32Array(IW * IH * 3);
    const depth = new Float32Array(IW * IH).fill(1e9);
    const id = new Uint8Array(IW * IH);
    const world = sc.world ? { x: new Float32Array(IW * IH), y: new Float32Array(IW * IH), z: new Float32Array(IW * IH) } : null;
    for (let py = 0; py < IH; py++) {
      const c = skyAt(py);
      for (let px = 0; px < IW; px++) {
        const k = (py * IW + px) * 3;
        col[k] = c[0];
        col[k + 1] = c[1];
        col[k + 2] = c[2];
      }
    }
    const put = (px, r, c, fid, d, wx, wy, wz) => {
      const k = r * IW + px;
      col[k * 3] = c[0];
      col[k * 3 + 1] = c[1];
      col[k * 3 + 2] = c[2];
      id[k] = fid;
      depth[k] = d;
      if (world) {
        world.x[k] = wx;
        world.y[k] = wy;
        world.z[k] = wz;
      }
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
        put(px, r, shadeFace(sc, xF, clamp(z, 0, hs), hs), 2, 0, xF, 0, z);
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
            const qx = x + (pX - x) * w;
            const qy = y + (pY - y) * w;
            const qz = z + (pZ - z) * w;
            put(px, r, shadeSurface(sc, qx, qy, qz, ti, r), 1, ti, qx, qy, qz);
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
    return { col, depth, id, world };
  }

  function shadeFace(sc, x, z, hs) {
    flags.emit = false;
    flags.cleaved = false;
    const c = sc.face(x, z, hs);
    if (flags.emit) return c;
    // rough rock relief lit from the upper left, darker toward the foot, and the
    // soft shadow under the soil lip; the relief runs along the bedding, or along
    // the (vertical) cleavage of a cleaved rock (flags.cleaved)
    const rx = flags.cleaved ? 1.8 : 6;
    const rz = flags.cleaved ? 6 : 1.8;
    const n1 = fbm(FACEN, x / rx, z / rz, 3);
    const n2 = fbm(FACEN, (x - 0.8) / rx, (z + 0.6) / rz, 3);
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
    flags.emit = false;
    flags.flat = false;
    let c = sc.albedo(x, y, z, sl, cv);
    if (flags.emit) return c;
    let shade = 1;
    if (!flags.flat) {
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
    if (flags.flat) {
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

  // ── post: brush finish, grain, encode ─────────────────────────────────────
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
    const file = path.join(frame.out, `${name}.webp`);
    await sharp(buf, raw).resize(VB_W * OUT_S, VB_H * OUT_S, { kernel: 'lanczos3' }).webp({ quality: 80, effort: 6, smartSubsample: true }).toFile(file);
    console.log(path.relative(frame.root, file), Math.round(fs.statSync(file).size / 1024) + ' KB');
    if (frame.preview) {
      fs.mkdirSync(frame.preview, { recursive: true });
      await sharp(buf, raw).resize(VB_W * OUT_S, VB_H * OUT_S, { kernel: 'lanczos3' }).png().toFile(path.join(frame.preview, `${name}.png`));
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
    kuwahara(img, frame.kuwahara);
    grade(img);
    grain(img);
    return img;
  }

  return { VB_W, VB_H, S, OUT_S, IW, IH, LX, LY, CAM, F, H0, T0, vb, Field, blur, lighting, Scatter, skyAt, render, finish, save };
}

module.exports = {
  // math & noise
  clamp, ss, mix, mix3, mul3, hex, norm3, smin, mulberry, makeNoise, fbm, ridged, POLY, distToPolyline, meander, boxBlur,
  // light
  SUN, SUN_H, AMB, SUNC, HAZE, SKY_TOP, SKY_LOW,
  // palette
  SOIL, SOIL_LT, SOIL_DK, DRYGRASS, SCRUB, ROCK, ROCK_LT, ROCK_DK, GRAVEL, SHRUBS, RIPARIAN, STONES, HORIZON_SOIL,
  SAND, SAND_LT, WATER, WATER_LT, ASH, SCORIA, BASALT, OXIDE, MAGMA, STROKE, FACEN,
  // materials
  flags, soilColor, rockColor, bedRock, soilHorizon, magma,
  // frame-dependent kit
  painter,
};
