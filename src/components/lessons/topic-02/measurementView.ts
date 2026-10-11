/**
 * Measurement mission — where the landscape is seen from (no React, no three.js).
 *
 *   ONE view state, LandView {az, elev}, drives everything that depends on the
 *   angle: the WebGL camera (MeasurementLandscape3D), the HTML pins and names
 *   over it, the links down to the section, and whether the ground hides a
 *   point. The section itself is data along the survey line and never turns.
 *
 *   landCamera()  solves the renders' own framing (render_measurement_landscape.py
 *                 camera(): the same lens, frame window and points) for any angle
 *                 and box, so the model stays centred and as large as the box
 *                 allows while it turns. At LAND_START in a 1400 × 800 box it is
 *                 the renders' camera — the no-WebGL fallback registers with it.
 *   hiddenBy()    marches from a point toward the eye over the height grid
 *                 (model-height.bin): what the ground, or the sea, hides.
 *
 * Unit-tested in scripts/qa/measurement-mission.test.mjs.
 */
import { MEASUREMENT_LANDSCAPE as L } from './measurementLandscape.data';
import { MEASUREMENT_MODEL as M } from './measurementModel.data';
import { ELLIPSOID_Z, N_Z_PER_M, STATION_IDS, Z_PER_M, geoidZ, groundZ, undulationAt, type Pt, type Size, type Vec3 } from './measurementLayout';
import { STATIONS, type StationId } from './measurementMission.data';

export type LandView = { readonly az: number; readonly elev: number };

const ASSETS = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/reference-assets/measurement-mission`;
/** The turnable model's two files (export_measurement_model.py). */
export const MODEL_URLS = { heights: `${ASSETS}/${M.heights.file}`, albedo: `${ASSETS}/${M.albedo.file}` } as const;

/** What the turnable model shows in a view (MeasurementLandscape3D draws it). */
export type ModelState = {
  /** The slab in front of the survey line is away. */
  open: boolean;
  geoidSheet: boolean;
  ellipsoidSheet: boolean;
  /** The dashed survey line on the closed model. */
  survey: boolean;
  /** The three lines on the cut face. */
  face: boolean;
  ring: StationId | null;
  arrows: StationId | null;
  tripod: StationId | null;
};

/** The renders' camera: 55° above the horizon, 4° round toward the sea. */
export const LAND_START: LandView = { az: 4, elev: 55 };
/**
 * How far the landscape turns (deg). Round: up to side-on either way, never
 * past it — the section below runs C → A from left to right, so the model is
 * never seen from behind. Tilt: from low over the ground (the cut face and
 * the sheets in profile) to almost straight down; never under the ground.
 */
export const LAND_LIMITS = { az: [-62, 62], elev: [16, 84] } as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const clampLand = (v: LandView): LandView => ({
  az: clamp(v.az, LAND_LIMITS.az[0], LAND_LIMITS.az[1]),
  elev: clamp(v.elev, LAND_LIMITS.elev[0], LAND_LIMITS.elev[1]),
});
export const sameView = (a: LandView, b: LandView) => Math.abs(a.az - b.az) < 0.05 && Math.abs(a.elev - b.elev) < 0.05;

// ---------------------------------------------------------------- the camera

/** The renders' lens: 70 mm on a 36 mm-wide sensor, framing 1400 × 800 → tan of half the vertical view. */
const TAN_V = (18 / 70) * (800 / 1400);
/** Where the framed points may sit (NDC): a little room at the sides, more above (the pins) than below. */
const WINDOW = { u0: -0.975, u1: 0.975, v0: -0.94, v1: 0.84 };
/** The task framing: more room above — from low angles the stations ride high in its tighter frame. */
const LINE_WINDOW = { u0: -0.975, u1: 0.975, v0: -0.94, v1: 0.7 };
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
 * What the camera keeps in frame. 0: the whole model (the closed model's base
 * corners and top edges — the renders' own points). 1: the survey line between
 * the stations, with the open strip in front and the ground just behind — the
 * task view, where the heights at a station are read off the cut face. Between
 * the two the camera glides (the tab change); the angle is the same view.
 */
export type Framing = number;
/** The task view's frame along the line (world x): from short of C to past A and its receiver. */
export const LINE_X = [-2.45, 3.55] as const;
const LINE_TOP = Math.max(
  ...L.line.H.map((H, i) => (Math.abs(-L.width / 2 + (i * L.line.step) / L.mPerUnit - (LINE_X[0] + LINE_X[1]) / 2) <= (LINE_X[1] - LINE_X[0]) / 2 ? groundZ(H, L.line.N[i]) : -1)),
);
// the open strip's front edge (its sheets), the face's foot, the ground just behind the line, and
// the model's back edge over the same stretch — the whole depth stays in frame, only the sides are left out
const LINE_FIT: Vec3[] = [
  ...LINE_X.flatMap((x) => [[x, -L.depth / 2, 0] as Vec3, [x, L.lineY, M.baseZ] as Vec3, [x, L.lineY + 0.75, LINE_TOP] as Vec3]),
  ...M.fit.filter((p) => p[1] > L.depth / 2 - 1e-6 && p[0] >= LINE_X[0] && p[0] <= LINE_X[1]).map((p) => [p[0], p[1], p[2]] as Vec3),
];

/**
 * The angle the camera actually takes: the task view's framing also looks
 * along the cut face more directly (the opening 55° becomes 35°), so the
 * heights on the face are less foreshortened. The mapping keeps every angle
 * the view state can take, in order: the low limit stays the low limit.
 */
const LINE_TILT = 20;
export function framedView(view: LandView, framing: Framing): LandView {
  const lo = LAND_LIMITS.elev[0];
  const k = Math.min(1, Math.max(0, framing)) * (LINE_TILT / (LAND_START.elev - lo));
  return { az: view.az, elev: view.elev - (view.elev - lo) * k };
}

/** The renders' solve, step for step: target and distance so the points fill the frame window. */
function solve(view: LandView, aspect: number, points: readonly (readonly number[])[], window = WINDOW) {
  const { back, fwd, right, up } = axes(view);
  const th = TAN_V;
  const tw = TAN_V * aspect;
  let target: Vec3 = [0, 0, M.targetZ];
  let dist = 15;
  const { u0: U0, u1: U1, v0: V0, v1: V1 } = window;
  for (let it = 0; it < 400; it++) {
    const eye = add(target, back, dist);
    let u0 = Infinity;
    let u1 = -Infinity;
    let v0 = Infinity;
    let v1 = -Infinity;
    for (const p of points) {
      const d: Vec3 = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]];
      const z = dot(d, fwd);
      const u = dot(d, right) / z / tw;
      const v = dot(d, up) / z / th;
      if (u < u0) u0 = u;
      if (u > u1) u1 = u;
      if (v < v0) v0 = v;
      if (v > v1) v1 = v;
    }
    const k = Math.max((u1 - u0) / (U1 - U0), (v1 - v0) / (V1 - V0));
    target = add(add(target, right, ((u0 + u1) / 2 - (U0 + U1) / 2) * tw * dist * 0.5), up, ((v0 + v1) / 2 - (V0 + V1) / 2) * th * dist * 0.5);
    dist *= 1 + (k - 1) * 0.5;
  }
  return { target, eye: add(target, back, dist) };
}

/**
 * The camera for a view in a box of `size`: the view's direction, then target
 * and distance solved so the framing's points fill the frame window.
 */
export function landCamera(view: LandView, size: Size, framing: Framing = 0): LandCamera {
  const f = Math.min(1, Math.max(0, framing));
  const seen = framedView(view, f);
  const { fwd, right, up } = axes(seen);
  const aspect = size.w / size.h;
  const th = TAN_V;
  const tw = TAN_V * aspect;
  const whole = f < 1 ? solve(seen, aspect, M.fit) : null;
  const line = f > 0 ? solve(seen, aspect, LINE_FIT, LINE_WINDOW) : null;
  const pick = (k: 'eye' | 'target'): Vec3 =>
    whole && line ? add(whole[k], [line[k][0] - whole[k][0], line[k][1] - whole[k][1], line[k][2] - whole[k][2]], f) : (whole ?? line)![k];
  const eye = pick('eye');
  const target = pick('target');
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

/** The station pins over the turnable model, from its camera; `hidden` where the ground stands between them and the eye. */
export function livePins(cam: LandCamera, size: Size, grid: HeightGrid | null, open: boolean): Record<StationId, LivePin> {
  const pin = (id: StationId): LivePin => {
    const s = L.stations[id];
    const p: Vec3 = [s.x, s.y, s.z];
    return { ...projectWith(cam.matrix, p, size), hidden: grid ? hiddenBy(grid, p, cam.eye, open) : false };
  };
  return { A: pin('A'), B: pin('B'), C: pin('C') };
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
 * Whether the model hides world point `p` from `eye`. `open`: the slab in
 * front of the survey line is taken away, so only the ground behind it can.
 */
export function hiddenBy(g: HeightGrid, p: Vec3, eye: Vec3, open: boolean): boolean {
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
    if (Math.abs(xM) > HALF_W || Math.abs(yM) > HALF_D) return false; // out over the side: nothing further can hide it
    if (open && y < L.lineY) continue;
    if (z < topZ(g, xM, yM) - 0.003) return true;
  }
  return false;
}

// ---------------------------------------------------------------- what stands on the cut face

/** How far in front of the cut face its lines and the height arrows are drawn (world units, ≈ 2 m). */
export const FACE_FRONT = 0.004;
const FACE_Y = L.lineY - FACE_FRONT;
const xOfSample = (i: number) => (-HALF_W + i * L.line.step) / L.mPerUnit;

/**
 * The three lines on the cut face — the section along the survey line, in the
 * model: the ground's edge (over the land), the geoid and the flat ellipsoid.
 */
export function faceLines(): { ground: Vec3[][]; geoid: Vec3[]; ellipsoid: Vec3[] } {
  const ground: Vec3[][] = [];
  let run: Vec3[] = [];
  const geoid: Vec3[] = [];
  const ellipsoid: Vec3[] = [];
  L.line.H.forEach((H, i) => {
    const x = xOfSample(i);
    const N = L.line.N[i];
    if (H >= 0) run.push([x, FACE_Y, groundZ(H, N)]);
    else if (run.length) {
      ground.push(run);
      run = [];
    }
    geoid.push([x, FACE_Y, geoidZ(N)]);
    ellipsoid.push([x, FACE_Y, ELLIPSOID_Z]);
  });
  if (run.length) ground.push(run);
  return { ground, geoid, ellipsoid };
}

/** The dashed survey line draped on the closed model (riding the water over the sea). */
export function surveyLine3D(lift = 0.006): Vec3[] {
  return L.line.H.map((H, i) => [xOfSample(i), L.lineY, Math.max(groundZ(H, L.line.N[i]), geoidZ(L.line.N[i])) + lift] as Vec3);
}

/**
 * A station's heights on the cut face, as world segments from the surface each
 * starts on: N (ellipsoid → geoid) and H (geoid → ground) stacked on one upright,
 * h (ellipsoid → ground) on a second one just beside it — h = N + H, drawn.
 */
export function stationArrows(id: StationId): Record<'N' | 'H' | 'h', [Vec3, Vec3]> {
  const s = L.stations[id];
  const zG = geoidZ(STATIONS[id].N);
  const xs = s.x - 0.06;
  const xh = s.x + 0.06;
  return {
    N: [
      [xs, FACE_Y, ELLIPSOID_Z],
      [xs, FACE_Y, zG],
    ],
    H: [
      [xs, FACE_Y, zG],
      [xs, FACE_Y, s.z],
    ],
    h: [
      [xh, FACE_Y, ELLIPSOID_Z],
      [xh, FACE_Y, s.z],
    ],
  };
}

/** World size of one screen pixel at world point `p`, for a camera in a box `h` px tall. */
export function worldPerPixel(cam: LandCamera, p: Vec3, h: number): number {
  const m = cam.matrix[3];
  const depth = m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3];
  return (2 * Math.tan(((cam.fovY / 2) * Math.PI) / 180) * depth) / h;
}

/**
 * Where the cut face's lines are named: their left end (the model's side); in the
 * task view, whose frame leaves the sides out, over the wadi between C and B —
 * clear of every station's arrows.
 */
const FACE_LABEL_TASK_X = -0.55;
export const faceLabelX = (framing: Framing) => -L.width / 2 + (FACE_LABEL_TASK_X + L.width / 2) * Math.min(1, Math.max(0, framing));

/** Whether the cut face (its front side, toward y < lineY) is turned toward the eye. */
export const faceSeen = (cam: LandCamera) => cam.eye[1] < L.lineY - 0.05;
