/**
 * Measurement mission — where the landscape is seen from (no React, no three.js).
 *
 *   ONE view state, LandView {az, elev}, drives everything that depends on the
 *   angle: the WebGL camera (MeasurementLandscape3D), the HTML pins and names
 *   over it, and whether the ground hides a point. The section beside it is
 *   data along the survey line and never turns.
 *
 *   Round: all the way, any number of times — az is never limited or folded;
 *   it is only compared modulo 360 (sameView), and a glide back takes the short
 *   way (nearView). Tilt: from just over the horizon (the profile) to almost
 *   straight down — never under the model.
 *
 *   landCamera()  solves the renders' own framing (render_measurement_landscape.py
 *                 camera(): the same lens, frame window and points) for any angle
 *                 and box, so the model stays centred and as large as the box
 *                 allows while it turns — registered with the section beside it
 *                 (the survey line's stretch no longer on screen than there).
 *                 The no-WebGL stills were taken with it at LAND_START.
 *   hiddenBy()    marches from a point toward the eye over the height grid
 *                 (model-height.bin): what the ground, its sides, or the sea hide.
 *
 * Unit-tested in scripts/qa/measurement-mission.test.mjs.
 */
import { MEASUREMENT_LANDSCAPE as L } from './measurementLandscape.data';
import { MEASUREMENT_MODEL as M } from './measurementModel.data';
import { ELLIPSOID_Z, N_Z_PER_M, STATION_IDS, SURVEY_SPAN, Z_PER_M, Z_SCALE, geoidZ, groundZ, stationWorld, undulationAt, type Pt, type Size, type Vec3 } from './measurementLayout';
import { STATIONS, type StationId } from './measurementMission.data';

export type LandView = { readonly az: number; readonly elev: number };

const ASSETS = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/reference-assets/measurement-mission`;
/** The turnable model's two files (export_measurement_model.py). */
export const MODEL_URLS = { heights: `${ASSETS}/${M.heights.file}`, albedo: `${ASSETS}/${M.albedo.file}` } as const;

/** What the turnable model shows in a view (MeasurementLandscape3D draws it). */
export type ModelState = {
  /** The ground is see-through: the geoid and ellipsoid sheets show inside it (the geoid view's reveal). */
  clear: boolean;
  /** The dashed survey line over SURVEY_SPAN. */
  survey: boolean;
  /** The receiver on its tripod beside this station (the task view). */
  tripod: StationId | null;
  /** H at this station, measured from the geoid inside the see-through ground (the geoid view, a station picked). */
  plumb: StationId | null;
};

/** The three views that show the landscape. */
export type LandTab = 'surface' | 'geoid' | 'undulation';
/**
 * Where each landscape view opens, and where "מבט התחלתי" takes it back to.
 * The surface view opens in profile: square to the survey line, 9° over the
 * horizon — low enough to read like the section beside it, high enough that the
 * dashed survey line shows on the ground (at 5° it hid behind the ridges, once
 * heights are drawn DISPLAY_VE×). The geoid view looks a little higher and from
 * the left, where the sheets inside the see-through ground read as surfaces; the
 * task view a little over the line, where the receiver stands clear of the
 * ground. (Each is a whole number of arrow-key steps from the profile — 10°
 * round, 8° tilt; scripts/qa/capture-measurement-fallback.mjs relies on it.)
 */
export const LAND_STARTS: Readonly<Record<LandTab, LandView>> = {
  surface: { az: 0, elev: 9 },
  geoid: { az: -20, elev: 25 },
  undulation: { az: 0, elev: 17 },
};
/** The profile: the surface view's opening, and the renders' camera (the no-WebGL fallback). */
export const LAND_START: LandView = LAND_STARTS.surface;
/** Tilt (deg): from just over the horizon to almost straight down. Round is free. */
export const LAND_ELEV = [2, 84] as const;
/** Wheel zoom over a model (the landscape and the ellipsoid alike): 1 is the fitted framing. */
export const MODEL_ZOOM = [0.7, 3] as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Only the tilt is limited: az runs on past 360 in either direction. */
export const clampLand = (v: LandView): LandView => ({ az: v.az, elev: clamp(v.elev, LAND_ELEV[0], LAND_ELEV[1]) });
/** An angle difference folded into −180 … 180. */
export const wrapAz = (d: number) => ((((d % 360) + 540) % 360) - 180);
/** Same view, whichever turn of the circle each angle is written on. */
export const sameView = (a: LandView, b: LandView) => Math.abs(wrapAz(a.az - b.az)) < 0.05 && Math.abs(a.elev - b.elev) < 0.05;
/** `to`, written on the turn of the circle nearest `from`: a glide toward it never goes the long way round. */
export const nearView = (from: LandView, to: LandView): LandView => ({ az: from.az + wrapAz(to.az - from.az), elev: to.elev });

// ---------------------------------------------------------------- the camera

/** The renders' lens: 70 mm on a 36 mm-wide sensor, framing 1400 × 800 → tan of half the vertical view. */
const TAN_V = (18 / 70) * (800 / 1400);
/** Where the framed points may sit (NDC): a little room at the sides and above (the pins); the base on the floor, level with the section's. */
const WINDOW = { u0: -0.975, u1: 0.975, v0: -1, v1: 0.84 };
/** Blender's default clip range — the renders' matrix used it. */
const NEAR = 0.1;
const FAR = 100;

export type Mat4 = number[][];
export type LandCamera = {
  eye: Vec3;
  target: Vec3;
  /** Vertical field of view (deg) and width / height, for a three.js PerspectiveCamera. */
  fovY: number;
  aspect: number;
  near: number;
  far: number;
  /** world → clip, row-major (the same form as MEASUREMENT_LANDSCAPE.camera). */
  matrix: Mat4;
};

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Camera axes for a view: `back` points from the target to the eye. */
function axes(view: LandView) {
  const el = (view.elev * Math.PI) / 180;
  const az = (view.az * Math.PI) / 180;
  const back: Vec3 = [Math.sin(az) * Math.cos(el), -Math.cos(az) * Math.cos(el), Math.sin(el)];
  const fwd: Vec3 = [-back[0], -back[1], -back[2]];
  const right = unit(cross(fwd, [0, 0, 1]));
  const up = cross(right, fwd);
  return { back, fwd, right, up };
}

/**
 * The closed model's base corners and top edges (the renders' own points), at the displayed
 * height: the top edges were exported at L.ve; the base stays where it is.
 */
export const FIT: readonly Vec3[] = M.fit.map(([x, y, z]) => [x, y, z > M.baseZ + 1e-6 ? z * Z_SCALE : z] as Vec3);
/** The survey line's stretch (SURVEY_SPAN) on the ellipsoid level: the length the section draws. */
const SPAN_LINE = [SURVEY_SPAN.s0, SURVEY_SPAN.s1].map((s) => [s / L.mPerUnit - L.width / 2, L.lineY, ELLIPSOID_Z] as Vec3);

/**
 * The renders' solve, step for step: target and distance so the points fill the frame window —
 * and, given `span` (the survey line's stretch's longest length on screen, in NDC), never closer
 * than that allows.
 */
function solve(view: LandView, aspect: number, points: readonly (readonly number[])[], span: number | null, window = WINDOW) {
  const { back, fwd, right, up } = axes(view);
  const th = TAN_V;
  const tw = TAN_V * aspect;
  let target: Vec3 = [0, 0, M.targetZ];
  let dist = 15;
  const { u0: U0, u1: U1, v0: V0, v1: V1 } = window;
  const uv = (p: readonly number[], eye: Vec3) => {
    const d: Vec3 = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]];
    const z = dot(d, fwd);
    return [dot(d, right) / z / tw, dot(d, up) / z / th];
  };
  for (let it = 0; it < 400; it++) {
    const eye = add(target, back, dist);
    let u0 = Infinity;
    let u1 = -Infinity;
    let v0 = Infinity;
    let v1 = -Infinity;
    for (const p of points) {
      const [u, v] = uv(p, eye);
      if (u < u0) u0 = u;
      if (u > u1) u1 = u;
      if (v < v0) v0 = v;
      if (v > v1) v1 = v;
    }
    let k = Math.max((u1 - u0) / (U1 - U0), (v1 - v0) / (V1 - V0));
    if (span) {
      const [a, b] = SPAN_LINE.map((p) => uv(p, eye));
      k = Math.max(k, Math.hypot((b[0] - a[0]) * aspect, b[1] - a[1]) / aspect / span);
    }
    // centred across; down to the window's floor — a model narrower than its box (held to the span) keeps
    // the spare height above it, where the pins stand, and none under it
    target = add(add(target, right, ((u0 + u1) / 2 - (U0 + U1) / 2) * tw * dist * 0.5), up, (v0 - V0) * th * dist * 0.5);
    dist *= 1 + (k - 1) * 0.5;
  }
  return { target, eye: add(target, back, dist) };
}

/**
 * The camera for a view in a box of `size`: the view's direction, then target
 * and distance solved so the whole model (the closed model's base corners and
 * top edges) fits the frame window. `spanPx`, when given, registers the model
 * with the section beside it: the survey line's stretch is never drawn longer
 * than the section draws it (its plot width), so — both drawing heights
 * DISPLAY_VE× — the relief along the line stands as high in the model as in the
 * section. The framing comes from the geometry and the shared line, not from the
 * box alone; a box too small for that just fits the model.
 * `zoom` (the wheel) narrows the lens about the frame's centre: the eye stays
 * where the framing put it, so nothing comes too close and the hiding test holds.
 */
export function landCamera(view: LandView, size: Size, spanPx?: number, zoom = 1): LandCamera {
  const { fwd, right, up } = axes(view);
  const aspect = size.w / size.h;
  const th = TAN_V / zoom;
  const tw = th * aspect;
  const { eye, target } = solve(view, aspect, FIT, spanPx ? (2 * spanPx) / size.w : null);
  const a = (FAR + NEAR) / (NEAR - FAR);
  const b = (2 * FAR * NEAR) / (NEAR - FAR);
  const row = (v: Vec3, t: number) => [v[0], v[1], v[2], t];
  const vx = row(right, -dot(right, eye));
  const vy = row(up, -dot(up, eye));
  const vz = row([-fwd[0], -fwd[1], -fwd[2]], dot(fwd, eye));
  const matrix: Mat4 = [vx.map((c) => c / tw), vy.map((c) => c / th), vz.map((c, i) => c * a + (i === 3 ? b : 0)), vz.map((c) => -c)];
  return { eye, target, fovY: (2 * Math.atan(th) * 180) / Math.PI, aspect, near: NEAR, far: FAR, matrix };
}

/** Pixel position of a world point in a box of `size` (origin top-left); `ahead` false when it is behind the eye. */
export function projectWith(m: Mat4, p: Vec3, size: Size): Pt & { ahead: boolean } {
  const [x, y, z] = p;
  const cx = m[0][0] * x + m[0][1] * y + m[0][2] * z + m[0][3];
  const cy = m[1][0] * x + m[1][1] * y + m[1][2] * z + m[1][3];
  const cw = m[3][0] * x + m[3][1] * y + m[3][2] * z + m[3][3];
  return { x: ((cx / cw + 1) / 2) * size.w, y: ((1 - cy / cw) / 2) * size.h, ahead: cw > 0 };
}

export type LivePin = Pt & { hidden: boolean };

/**
 * The station pins over the turnable model, from its camera; `hidden` where the
 * ground stands between them and the eye. `clear`: the ground is see-through,
 * so nothing hides them.
 */
export function livePins(cam: LandCamera, size: Size, grid: HeightGrid | null, clear = false): Record<StationId, LivePin> {
  const pin = (id: StationId): LivePin => {
    const p = stationWorld(id);
    return { ...projectWith(cam.matrix, p, size), hidden: grid && !clear ? hiddenBy(grid, p, cam.eye) : false };
  };
  return { A: pin('A'), B: pin('B'), C: pin('C') };
}

// ---------------------------------------------------------------- the close-up of H (the geoid view)

export type Rect = { x: number; y: number; w: number; h: number };
/**
 * The close-up of the picked station's H on the see-through model: its box (px, at the stage's top
 * corner), title row, the least padding round the station's heights inside it, the length under
 * which H — or the ellipsoid crossing it — is too short to read (the section's close-up uses the
 * same), and the most it enlarges.
 */
export const HEIGHT_LENS = { w: 168, h: 92, title: 20, pad: 10, below: 16, maxK: 8 } as const;
/** A station pin over its ground point (px): half the width of its head, and its height above the point. */
const PIN = { half: 21, up: 54 } as const;

export type HeightLens = {
  /** Times larger than the model, in both directions. */
  k: number;
  /** The close-up's box in the stage, and the part of it the enlarged model fills (under the title, inside the border). */
  box: Rect;
  view: Rect;
  /** The stretch of the model it shows, framed round the station (stage px): `view` is it, k times larger. */
  frame: Rect;
  /** The station's ground point, and the geoid and the ellipsoid right under it (stage px). */
  ground: Pt;
  geoid: Pt;
  ellipsoid: Pt;
};

const overlaps = (a: Rect, b: Rect, gap: number) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

/**
 * The geoid view's close-up of H, or null where the model shows it well enough. H is drawn from the
 * geoid right under the station up to its ground point; where that is shorter than HEIGHT_LENS.below
 * — or the ellipsoid, lying between the two (N < 0), crosses it closer than that to either end — it
 * is unclear in the model which surface H starts from. The stretch round the station is then drawn
 * again in a box at the stage's top corner on the station's side: the same camera cropped to a frame
 * round the station, an exact whole number of times larger in both directions, so H, h and N keep
 * their proportions. Null too where the frame leaves the stage, or the box would cover the frame or
 * a station pin (from an angle the reader turned to) — the model then shows H as it is.
 */
export function heightLens(cam: LandCamera, size: Size, id: StationId, pins: Record<StationId, Pt>): HeightLens | null {
  const L = HEIGHT_LENS;
  const [x, y, z] = stationWorld(id);
  const at = (zz: number) => projectWith(cam.matrix, [x, y, zz], size);
  const ground = at(z);
  const geoid = at(geoidZ(STATIONS[id].N));
  const ellipsoid = at(ELLIPSOID_Z);
  if (!ground.ahead || !geoid.ahead || !ellipsoid.ahead) return null;
  const d = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
  const spans = [d(ground, geoid), ...(STATIONS[id].N < 0 ? [d(geoid, ellipsoid), d(ellipsoid, ground)] : [])];
  if (Math.min(...spans) >= L.below) return null;

  // the enlarged model fills the box under its title, a little under the border on every side
  const vw = L.w - 4;
  const vh = L.h - L.title - 3;
  const xs = [ground.x, geoid.x, ellipsoid.x];
  const ys = [ground.y, geoid.y, ellipsoid.y];
  const k = Math.min(
    L.maxK,
    Math.floor((vh - 2 * L.pad) / Math.max(1, Math.max(...ys) - Math.min(...ys))),
    Math.floor((vw - 2 * L.pad) / Math.max(1, Math.max(...xs) - Math.min(...xs))),
  );
  if (k < 2) return null;
  const frame = { w: vw / k, h: vh / k, x: (Math.max(...xs) + Math.min(...xs)) / 2 - vw / k / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2 - vh / k / 2 };
  if (frame.x < 0 || frame.y < 0 || frame.x + frame.w > size.w || frame.y + frame.h > size.h) return null;

  const heads = STATION_IDS.map((s) => ({ x: pins[s].x - PIN.half, y: pins[s].y - PIN.up, w: 2 * PIN.half, h: PIN.up }));
  const corners = ground.x >= size.w / 2 ? [size.w - L.w, 0] : [0, size.w - L.w];
  for (const bx of corners) {
    const box = { x: bx, y: 0, w: L.w, h: L.h };
    if (overlaps(box, frame, 6) || heads.some((h) => overlaps(box, h, 2))) continue;
    return { k, box, view: { x: bx + 2, y: L.title + 1, w: vw, h: vh }, frame, ground, geoid, ellipsoid };
  }
  return null;
}

// ---------------------------------------------------------------- the ground

export type HeightGrid = { cols: number; rows: number; cell: number; h: Float32Array; maxTop: number };

const HALF_W = (L.width * L.mPerUnit) / 2;
const HALF_D = (L.depth * L.mPerUnit) / 2;

/** The height grid from model-height.bin (Int16 decimetres, row 0 = the front edge). */
export function heightGrid(buf: ArrayBuffer): HeightGrid {
  const { cols, rows, cell, metresPerUnit } = M.heights;
  const raw = new Int16Array(buf);
  if (raw.length !== cols * rows) throw new Error(`model-height.bin: ${raw.length} samples, expected ${cols * rows}`);
  const h = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) h[i] = raw[i] * metresPerUnit;
  const g = { cols, rows, cell, h, maxTop: 0 };
  let maxTop = -Infinity;
  for (let j = 0; j < rows; j += 2) for (let i = 0; i < cols; i += 2) maxTop = Math.max(maxTop, topZ(g, -HALF_W + i * cell, -HALF_D + j * cell));
  g.maxTop = maxTop + 0.02;
  return g;
}

/** Ground H (m) at a point given in metres (bilinear; clamped to the footprint). */
export function groundAt(g: HeightGrid, xM: number, yM: number): number {
  const fi = clamp((xM + HALF_W) / g.cell, 0, g.cols - 1.0001);
  const fj = clamp((yM + HALF_D) / g.cell, 0, g.rows - 1.0001);
  const i = Math.floor(fi);
  const j = Math.floor(fj);
  const u = fi - i;
  const v = fj - j;
  const at = (a: number, b: number) => g.h[b * g.cols + a];
  return (1 - u) * (1 - v) * at(i, j) + u * (1 - v) * at(i + 1, j) + (1 - u) * v * at(i, j + 1) + u * v * at(i + 1, j + 1);
}

/** World height of the model's top at a point in metres: the ground, or the sea's surface (the geoid) over it. */
export function topZ(g: HeightGrid, xM: number, yM: number): number {
  return Math.max(groundAt(g, xM, yM), 0) * Z_PER_M + undulationAt(xM, yM) * N_Z_PER_M;
}

/**
 * Whether the model hides world point `p` from `eye`, from any side: the ray
 * runs under the top (the ground or the sea) somewhere before it leaves the
 * footprint — through the top, or out through one of the sides.
 */
export function hiddenBy(g: HeightGrid, p: Vec3, eye: Vec3): boolean {
  const d: Vec3 = [eye[0] - p[0], eye[1] - p[1], eye[2] - p[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const step = (g.cell * 0.5) / L.mPerUnit;
  for (let t = step * 2; t < len; t += step) {
    const x = p[0] + (d[0] * t) / len;
    const y = p[1] + (d[1] * t) / len;
    const z = p[2] + (d[2] * t) / len;
    if (z > g.maxTop) return false;
    const xM = x * L.mPerUnit;
    const yM = y * L.mPerUnit;
    if (Math.abs(xM) > HALF_W || Math.abs(yM) > HALF_D) return false; // out past a side: nothing further can hide it
    if (z < topZ(g, xM, yM) - 0.003) return true;
  }
  return false;
}

// ---------------------------------------------------------------- along the survey line

const xOfSample = (i: number) => (-HALF_W + i * L.line.step) / L.mPerUnit;
const inSpan = (i: number) => i * L.line.step >= SURVEY_SPAN.s0 - 1e-6 && i * L.line.step <= SURVEY_SPAN.s1 + 1e-6;

/** The dashed survey line draped on the model over SURVEY_SPAN (riding the water over the sea). */
export function surveyLine3D(lift = 0.006): Vec3[] {
  return L.line.H.flatMap((H, i) => (inSpan(i) ? [[xOfSample(i), L.lineY, Math.max(groundZ(H, L.line.N[i]), geoidZ(L.line.N[i])) + lift] as Vec3] : []));
}

/**
 * The geoid and the ellipsoid where the survey line's upright plane cuts them,
 * over SURVEY_SPAN: the section's two reference lines, in the model (shown
 * inside the see-through ground).
 */
export function surveyPlaneLines(): { geoid: Vec3[]; ellipsoid: Vec3[] } {
  const geoid: Vec3[] = [];
  const ellipsoid: Vec3[] = [];
  L.line.N.forEach((N, i) => {
    if (!inSpan(i)) return;
    geoid.push([xOfSample(i), L.lineY, geoidZ(N)]);
    ellipsoid.push([xOfSample(i), L.lineY, ELLIPSOID_Z]);
  });
  return { geoid, ellipsoid };
}
