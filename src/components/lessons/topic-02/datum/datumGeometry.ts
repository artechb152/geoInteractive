/* ─────────────────── דאטום — geometry of the fit exercise ───────────────────
   Moved verbatim out of CoordinatesScene.tsx (the original 2-D DatumFit): the
   deck's slide-17/18 picture as an exercise — a wavy geoid and an ellipsoid
   that the learner shifts, rotates and scales onto it, either over the whole
   Earth (global datum) or only over one marked region (local datum). 2-D
   illustration: 2 shifts + 1 rotation + 1 scale stand in for the deck's
   3 + 3 + 1 parameters. Everything from `Pose` to `bestFit` is unchanged, so
   the score and "הצגת התאמה" give exactly the results they gave before
   (scripts/qa/datum-guided.test.mjs pins them).

   Below that: the spatial (3-D) illustration of the SAME section. The 2-D
   exercise plane is the globe's meridian plane z = 0, facing the default
   camera: section +x = world +x, section up (−SVG y) = world +y, and the
   pose's rotation is about Z. The 3-D geoid reproduces the original GEOID
   points exactly in that plane, and the posed 3-D ellipsoid (radii
   170 : 135 : 170) cuts that plane in exactly the posed 2-D ellipse. Pure TS, no React/three — imported by the scene, the 3-D view
   and the node tests. */

export type Pose = { dx: number; dy: number; rot: number; s: number };
export type DatumMode = 'global' | 'local';
export const DV = { w: 600, h: 400 } as const;
export const GC = { x: 300, y: 205 } as const;
export const ELL = { rx: 170, ry: 135 } as const;
export const RANGE = { dx: [-200, 200], dy: [-170, 170], rot: [-45, 45], s: [0.5, 1.4] } as const;
export const START: Pose = { dx: 170, dy: -120, rot: 25, s: 0.55 };
// SVG y points down, so negative angles are the upper half: an upper-right arc.
export const LOCAL_ARC = { from: -1.45, to: -0.55 };
// Waves everywhere, plus a bulge inside the local arc: the place where a
// globally fitted ellipsoid leaves a gap and a local datum earns its keep.
export const GEOID = Array.from({ length: 180 }, (_, i) => {
  const t = (i / 180) * Math.PI * 2;
  const signed = t > Math.PI ? t - 2 * Math.PI : t;
  const w =
    1 +
    0.05 * Math.sin(5 * t + 0.3) +
    0.03 * Math.sin(8 * t + 1.2) +
    0.025 * Math.sin(3 * t + 2) +
    0.14 * Math.exp(-(((signed + 1.0) / 0.38) ** 2));
  return { t: signed, x: GC.x + ELL.rx * w * Math.cos(t), y: GC.y + ELL.ry * w * Math.sin(t) };
});
/* Score = how close to the best reachable fit, on an absolute scale: 10
   viewBox units above the best error → 0 %. Measured with these shapes: the
   global fit is ≈ 4.4 units worse than the local fit over the marked arc
   (≈ 55 %), and the local fit is ≈ 40 units worse over the whole geoid (0 %). */
export const FIT_TOL = 10;
export const FIT_GOOD = 80;
export const REGION: Record<DatumMode, typeof GEOID> = {
  global: GEOID,
  local: GEOID.filter((p) => p.t >= LOCAL_ARC.from && p.t <= LOCAL_ARC.to),
};
export const GEOID_PATH = `${GEOID.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} Z`;
export const LOCAL_PATH = REGION.local.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

/** Mean radial distance (viewBox units) from the region's geoid points to the posed ellipse. */
export function fitError(p: Pose, pts: typeof GEOID) {
  const cx = GC.x + p.dx;
  const cy = GC.y + p.dy;
  const a = (p.rot * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  let sum = 0;
  for (const q of pts) {
    const vx = q.x - cx;
    const vy = q.y - cy;
    const lx = vx * cos + vy * sin;
    const ly = -vx * sin + vy * cos;
    const rho = Math.hypot(lx / (ELL.rx * p.s), ly / (ELL.ry * p.s));
    sum += rho === 0 ? 0 : Math.abs(1 - 1 / rho) * Math.hypot(vx, vy);
  }
  return sum / pts.length;
}

export const clampPose = (p: Pose): Pose => ({
  dx: Math.min(RANGE.dx[1], Math.max(RANGE.dx[0], p.dx)),
  dy: Math.min(RANGE.dy[1], Math.max(RANGE.dy[0], p.dy)),
  rot: Math.min(RANGE.rot[1], Math.max(RANGE.rot[0], p.rot)),
  s: Math.min(RANGE.s[1], Math.max(RANGE.s[0], p.s)),
});

/** Pattern search inside the slider ranges, so the "best" pose is reachable. */
export function bestFit(pts: typeof GEOID): { pose: Pose; err: number } {
  let best = { pose: { dx: 0, dy: 0, rot: 0, s: 1 }, err: Infinity };
  for (const seed of [{ dx: 0, dy: 0, rot: 0, s: 1 }, { dx: 60, dy: -60, rot: 0, s: 0.8 }, { dx: -60, dy: 60, rot: 20, s: 1.2 }]) {
    let p: Pose = seed;
    let e = fitError(p, pts);
    const step = { dx: 32, dy: 32, rot: 12, s: 0.16 };
    for (let round = 0; round < 8; round++) {
      let improved = true;
      while (improved) {
        improved = false;
        for (const k of ['dx', 'dy', 'rot', 's'] as const) {
          for (const dir of [1, -1]) {
            const q = clampPose({ ...p, [k]: p[k] + dir * step[k] });
            const eq = fitError(q, pts);
            if (eq < e - 1e-6) {
              p = q;
              e = eq;
              improved = true;
            }
          }
        }
      }
      step.dx /= 2;
      step.dy /= 2;
      step.rot /= 2;
      step.s /= 2;
    }
    if (e < best.err) best = { pose: p, err: e };
  }
  // Snap to the sliders' own steps so "הצגת התאמה" lands on reachable values.
  const pose = clampPose({
    dx: Math.round(best.pose.dx / 2) * 2,
    dy: Math.round(best.pose.dy / 2) * 2,
    rot: Math.round(best.pose.rot),
    s: Math.round(best.pose.s * 100) / 100,
  });
  return { pose, err: fitError(pose, pts) };
}

/* ─────────────── shared helpers (score, snapping, inspection) ─────────────── */

export type BestFits = Record<DatumMode, { pose: Pose; err: number }>;
export const computeBest = (): BestFits => ({ global: bestFit(REGION.global), local: bestFit(REGION.local) });

/** The original DatumFit score, unchanged: 0–100. */
export function scoreFor(pose: Pose, mode: DatumMode, best: BestFits) {
  const err = fitError(pose, REGION[mode]);
  return Math.round(Math.min(1, Math.max(0, 1 - (err - best[mode].err) / FIT_TOL)) * 100);
}

/** Onto the sliders' own steps (2 · 2 · 1° · 0.01), inside their ranges. */
export const snapPose = (p: Pose): Pose =>
  clampPose({
    dx: Math.round(p.dx / 2) * 2,
    dy: Math.round(p.dy / 2) * 2,
    rot: Math.round(p.rot),
    s: Math.round(p.s * 100) / 100,
  });

/** The geoid's radial factor at a signed section angle t ∈ (−π, π] — the same
    formula GEOID samples, as a continuous function. */
export function geoidW(t: number) {
  const u = t < 0 ? t + 2 * Math.PI : t;
  const signed = u > Math.PI ? u - 2 * Math.PI : u;
  return (
    1 +
    0.05 * Math.sin(5 * u + 0.3) +
    0.03 * Math.sin(8 * u + 1.2) +
    0.025 * Math.sin(3 * u + 2) +
    0.14 * Math.exp(-(((signed + 1.0) / 0.38) ** 2))
  );
}

/** Section (SVG) point of the geoid at angle t. */
export const geoidAt = (t: number) => {
  const w = geoidW(t);
  return { x: GC.x + ELL.rx * w * Math.cos(t), y: GC.y + ELL.ry * w * Math.sin(t) };
};

/** Section angle t of an SVG point (inverse of geoidAt's direction). */
export const angleOf = (x: number, y: number) => Math.atan2((y - GC.y) / ELL.ry, (x - GC.x) / ELL.rx);

/** The posed ellipse point that fitError measures a geoid point against: on
    the ray from the ellipse centre through q (the same radial gap). */
export function ellipsePointToward(p: Pose, q: { x: number; y: number }) {
  const cx = GC.x + p.dx;
  const cy = GC.y + p.dy;
  const a = (p.rot * Math.PI) / 180;
  const vx = q.x - cx;
  const vy = q.y - cy;
  const lx = vx * Math.cos(a) + vy * Math.sin(a);
  const ly = -vx * Math.sin(a) + vy * Math.cos(a);
  const rho = Math.hypot(lx / (ELL.rx * p.s), ly / (ELL.ry * p.s));
  if (rho === 0) return { x: cx, y: cy };
  return { x: cx + vx / rho, y: cy + vy / rho };
}

/** Polyline of the posed ellipse in section (SVG) coordinates. */
export function posedEllipse(p: Pose, n = 120) {
  const a = (p.rot * Math.PI) / 180;
  const cx = GC.x + p.dx;
  const cy = GC.y + p.dy;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const lx = ELL.rx * p.s * Math.cos(t);
    const ly = ELL.ry * p.s * Math.sin(t);
    return { x: cx + lx * Math.cos(a) - ly * Math.sin(a), y: cy + lx * Math.sin(a) + ly * Math.cos(a) };
  });
}

/** Inspection ranges: on the exposed half of the section (the cutaway's
    exercise wall) for the global datum, inside the marked arc for the local. */
export const INSPECT_RANGE: Record<DatumMode, [number, number]> = {
  global: [-1.45, 1.45],
  local: [LOCAL_ARC.from, LOCAL_ARC.to],
};
export const INSPECT_DEFAULT: Record<DatumMode, number> = { global: 0.6, local: -0.7 };
export const clampInspect = (t: number, mode: DatumMode) =>
  Math.min(INSPECT_RANGE[mode][1], Math.max(INSPECT_RANGE[mode][0], t));

/* ─────────────── 3-D: the same section as a globe ─────────────── */

export type Vec3 = [number, number, number];

/** SVG section point → exercise-plane coordinates (u = world x, v = world y). */
export const svgToPlane = (x: number, y: number) => ({ u: x - GC.x, v: -(y - GC.y) });
export const planeToWorld = (u: number, v: number): Vec3 => [u, v, 0];

/** The cutaway: azimuths λ (from +x toward +z, the camera side) between
    which the globe is opened — the quarter in front of the section's right
    half, where the marked local arc lies. The wall at λ = 0 is the half of
    the exercise plane with u ≥ 0 and carries the original section; the wall
    at λ = π/2 is the plane x = 0, z ≥ 0. */
export const CUT = { from: 0, to: Math.PI / 2 } as const;
export const inCutaway = (x: number, z: number) => x > 0 && z > 0;

/** Geoid radial factor over the globe, parametrised by β (parametric
    latitude, + north) and λ. In the exercise plane (λ = 0 and λ = π) it IS
    the section's W(t); elsewhere the two halves blend, plus gentle ripples
    that vanish in that plane and at the poles. */
export function geoidW3(beta: number, lam: number) {
  const tFront = -beta; // λ = 0: u > 0 half, t = −β
  let tBack = beta + Math.PI; // λ = π: u < 0 half, t = β − π (≡ β + π)
  if (tBack > Math.PI) tBack -= 2 * Math.PI;
  const c = (1 + Math.cos(lam)) / 2;
  const s = Math.sin(lam);
  const cb = Math.cos(beta);
  const ripple = s * s * cb * cb * (0.035 * Math.sin(3 * lam + 2 * beta + 0.6) + 0.025 * Math.sin(5 * lam - 3 * beta + 1.4));
  return geoidW(tFront) * c + geoidW(tBack) * (1 - c) + ripple;
}

/** Point on a body of radial factor w at (β, λ): an oblate 170 : 135 : 170 frame. */
export const bodyPoint = (w: number, beta: number, lam: number): Vec3 => [
  w * ELL.rx * Math.cos(beta) * Math.cos(lam),
  w * ELL.ry * Math.sin(beta),
  w * ELL.rx * Math.cos(beta) * Math.sin(lam),
];

/** World placement of the posed ellipsoid (viewBox units, before the scene
    scale). SVG rotate(θ) turns clockwise on screen; seen from +z that is a
    rotation about Z by −θ. */
export const poseToWorld = (p: Pose) => ({
  center: planeToWorld(p.dx, -p.dy) as Vec3,
  rotZ: (-p.rot * Math.PI) / 180,
  radii: [ELL.rx * p.s, ELL.ry * p.s, ELL.rx * p.s] as Vec3,
});

/** Body-local coordinates of a world point (undo the translation, then the rotation about Z). */
function toLocal(p: Pose, pt: Vec3): Vec3 {
  const { center, rotZ } = poseToWorld(p);
  const x = pt[0] - center[0];
  const y = pt[1] - center[1];
  const c = Math.cos(rotZ);
  const s = Math.sin(rotZ);
  return [x * c + y * s, -x * s + y * c, pt[2] - center[2]];
}

/** Quadric value |local / radii|² of a world point against the posed
    ellipsoid: 1 on its surface, < 1 inside. */
export function ellipsoidQ(p: Pose, pt: Vec3) {
  const { radii } = poseToWorld(p);
  const l = toLocal(p, pt);
  return (l[0] / radii[0]) ** 2 + (l[1] / radii[1]) ** 2 + (l[2] / radii[2]) ** 2;
}

/** The posed ellipsoid's section by the plane x = 0 (the second cutaway
    wall), as a polyline in (z, y), or null if it misses the plane. */
export function ellipsoidSectionX0(p: Pose, n = 96): { z: number; y: number }[] | null {
  const { center, rotZ, radii } = poseToWorld(p);
  const c = Math.cos(rotZ);
  const s = Math.sin(rotZ);
  // P = (0, y, z), X = −cx, Y = y − cy:  Lx = Xc + Ys, Ly = −Xs + Yc, Lz = z − cz.
  const X = -center[0];
  const a2 = radii[0] ** 2;
  const b2 = radii[1] ** 2;
  const d2 = radii[2] ** 2;
  // In Y: A Y² + 2 B Y + K, plus (z − cz)²/d².
  const A = (s * s) / a2 + (c * c) / b2;
  const B = X * c * s * (1 / a2 - 1 / b2);
  const K = X * X * ((c * c) / a2 + (s * s) / b2);
  const Y0 = -B / A;
  const rhs = 1 - (K - (B * B) / A);
  if (rhs <= 0) return null;
  const ry = Math.sqrt(rhs / A);
  const rz = Math.sqrt(rhs * d2);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return { z: center[2] + rz * Math.cos(t), y: center[1] + Y0 + ry * Math.sin(t) };
  });
}

/* ─────────────── display mapping (3-D view and close-up only) ───────────────
   The exercise's flattening (135 : 170) is a teaching exaggeration; drawn
   1 : 1 it made the globe read as a wide, low egg. The view stretches the
   vertical axis by one display factor — applied the same way to every
   surface, anchor, ray and the close-up — so the globe reads almost round
   (height ≈ 95 % of width), as in the reference image. Nothing above this
   line uses it: fitError, bestFit, the score and the pose are unchanged. */
export const DISPLAY_K = 1.2;
export const toDisplay = (p: Vec3): Vec3 => [p[0], p[1] * DISPLAY_K, p[2]];
export const fromDisplay = (p: Vec3): Vec3 => [p[0], p[1] / DISPLAY_K, p[2]];
/** A section (SVG) point under the same mapping, stretched about the section centre. */
export const svgDisplay = (q: { x: number; y: number }) => ({ x: q.x, y: GC.y + (q.y - GC.y) * DISPLAY_K });

/** The Earth's surface in the view: a smooth globe enclosing the exaggerated
    geoid everywhere (≥ ENVELOPE.clear), with a gentle rise over its bulge.
    Land relief is added on top by the 3-D view. */
export const ENVELOPE = { base: 1.115, rise: 0.075, width: 0.55, clear: 0.012 } as const;
export function surfaceEnvelopeW(beta: number, lam: number) {
  // the rise fades out at the poles, where every λ meets (one point, no seam)
  const pole = 1 - ((2 * beta) / Math.PI) ** 8;
  const env = ENVELOPE.base + ENVELOPE.rise * pole * Math.exp(-(((1 - beta) / ENVELOPE.width) ** 2)) * ((1 + Math.cos(lam)) / 2);
  return Math.max(env, geoidW3(beta, lam) + ENVELOPE.clear);
}
