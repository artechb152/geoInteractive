import type { TerrainHeightProfile } from './terrainConfigs';
import { CALM_BLEND_RADIUS, CALM_START_RADIUS } from './terrainConfigs';
import { boulderField, fbm2, noise2, ridged2, smoothstep, smoothstep01, terraceOffset } from './terrainNoise';
import {
  DRIVE_ROUTE,
  ROUTE_EDGE_WOBBLE,
  ROUTE_HALF_WIDTH,
  ROUTE_RUT_OFFSET,
  routeMaskFromDistance,
} from './terrainRoute';

/**
 * Terrain shape authoring for the drive lab, built in three layers:
 *
 *  1. LARGE: a few hand-placed landforms per soil (knolls, a wadi, an
 *     escarpment, dune ridges, basins, a drainage channel). They're placed
 *     in the gaps between the route loops, so the track threads between
 *     them. Large forms are smooth and give the scene its silhouette and
 *     composition.
 *  2. MEDIUM: the soil's structural signature, derived from the large form:
 *     limestone ledges, farm terraces, secondary dunes or mud hummocks.
 *  3. SMALL: rubble, boulder clusters and puddles. Always masked by the
 *     route and the spawn area, never applied everywhere.
 *
 * The route network (terrainRoute.ts) is then cut into the result. Its bed
 * follows a blurred version of the large forms, with no cross-slope, so it
 * reads as a graded track: cut banks where it passes a hill, a low embankment
 * where it crosses a hollow, twin wheel ruts, and patchy spoil berms along
 * its edges.
 *
 * Coordinates are world metres. The vehicle spawns at the origin driving
 * toward +Z (vehicleController's heading π) with the chase camera behind it,
 * so the comments below say "ahead" for +Z and "left" for +X, as seen in the
 * spawn view.
 */

type Landform = {
  /** Smooth large-scale relief (m), including the visual-only apron beyond the tile. */
  large(x: number, z: number): number;
  /** Medium structure (m) given the natural large height at this point. Damped on the track. */
  medium(x: number, z: number, large: number): number;
  /** Small detail (m). Each style decides what survives on the track (`routeMask`) and near spawn (`calm`). */
  small(x: number, z: number, large: number, routeMask: number, calm: number): number;
};

/** [x, z, footprint radius along, footprint radius across, angle (rad), height in relief units]. */
type Blob = [number, number, number, number, number, number];
type Path = Array<[number, number]>;

/**
 * Hill/hollow with a finite footprint, shaped (1 - ρ²)², so it has a
 * defined foot instead of a Gaussian tail creeping under the track and
 * the spawn area.
 */
function blob(x: number, z: number, [cx, cz, rx, rz, angle, h]: Blob): number {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dx = x - cx;
  const dz = z - cz;
  const u = (dx * c + dz * s) / rx;
  const v = (-dx * s + dz * c) / rz;
  const q = u * u + v * v;
  if (q >= 1) return 0;
  return h * (1 - q) * (1 - q);
}

function sumBlobs(x: number, z: number, blobs: Blob[]): number {
  let h = 0;
  for (const b of blobs) h += blob(x, z, b);
  return h;
}

function pathDistance(x: number, z: number, path: Path): number {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const ex = ax + dx * t - x;
    const ez = az + dz * t - z;
    best = Math.min(best, ex * ex + ez * ez);
  }
  return Math.sqrt(best);
}

/** Flat-floored channel: 1 across the floor, easing to 0 over the bank. */
function channel(d: number, floorHalfWidth: number, bankWidth: number): number {
  return 1 - smoothstep(floorHalfWidth, floorHalfWidth + bankWidth, d);
}

/**
 * Relief for the visual-only apron beyond the playable tile. It rises just
 * past the boundary stakes and settles back to flat inside the fog, so it
 * never competes with HorizonBackdrop's distant ridgelines.
 */
function apron(x: number, z: number, height: number, shape: number): number {
  const r = Math.hypot(x, z);
  if (r < 21) return 0;
  return height * smoothstep(21, 31, r) * (1 - smoothstep(46, 62, r)) * shape;
}

/** Domain warp, so hand-placed ellipses and paths don't read as geometric primitives. */
function warpX(x: number, z: number, amp: number, freq: number, seed: number) {
  return x + amp * noise2(x * freq, z * freq, seed);
}
function warpZ(x: number, z: number, amp: number, freq: number, seed: number) {
  return z + amp * noise2(x * freq + 31.7, z * freq - 17.3, seed);
}

// ── Hard rock: limestone upland ─────────────────────────────────────────────
// Ledged knolls flank the spine, an escarpment rises ahead-left, a tor stands
// at the boundary ahead-right, and a steep-banked dry wadi (behind-left)
// forces the ring road to dip through it. Boulders gather in clusters and on
// the high ground, so the ground around the route is visibly harder to cross
// than the track itself.

function ledges(p: TerrainHeightProfile): Landform {
  const A = p.reliefAmplitude;
  const M = p.mediumAmplitude;
  const D = p.detailAmplitude;
  const hills: Blob[] = [
    [-9.4, 2.5, 3.8, 7.4, -0.12, 1.0], // right-hand knoll
    [10.2, 4.5, 4.6, 6.2, 0.35, 0.68], // left-hand rise
    [7.5, -8.5, 3.4, 3, -0.6, 0.32], // low rocky hummock, behind-left
    [-18, 12, 4.2, 5, -0.4, 0.95], // tor at the boundary, ahead-right
    [-13.5, -18.5, 6, 4.5, -0.5, 0.6], // spur, behind-right
    [19.5, -13, 5, 4.5, 0, 0.55], // shoulder, behind-left
  ];
  const escarpment: Path = [[4, 23.5], [12, 19.5], [21, 13], [26, 4]];
  // Comes in from behind-left, crosses the ring, dies out inside the left cell.
  const wadi: Path = [[27, -17], [18, -11.5], [12.5, -7.5], [7, -5.5]];

  return {
    large(x, z) {
      const wx = warpX(x, z, 1.4, 0.07, 101);
      const wz = warpZ(x, z, 1.4, 0.07, 101);
      let h = sumBlobs(wx, wz, hills);
      const ds = pathDistance(wx, wz, escarpment);
      h += 0.9 * Math.exp(-(ds * ds) / (3.4 * 3.4));
      h -= 0.42 * channel(pathDistance(wx, wz, wadi), 0.8, 3.2) * smoothstep(7.5, 12, wx);
      h += 0.16 * fbm2(x * 0.05, z * 0.05, 102, 3);
      return h * A + apron(x, z, p.outerRelief, 0.35 + 0.65 * ridged2(x * 0.05, z * 0.05, 103, 3));
    },
    medium(x, z, large) {
      // Stepped limestone beds: treads + short risers, wobbling so the
      // ledge lines aren't perfect contour rings. Strongest on high ground.
      const v = large + 0.35 * M * noise2(x * 0.13, z * 0.13, 104);
      const ledge = terraceOffset(v, M, 0.62) * (0.35 + 0.65 * smoothstep(0.25, 1.4, large));
      // Rock ribs breaking through along the knoll crests.
      const rib = ridged2(x * 0.15, z * 0.15, 105, 2);
      return ledge + rib * rib * rib * M * 0.9 * smoothstep(0.9, 2.2, large);
    },
    small(x, z, large, routeMask, calm) {
      const rubble = D * fbm2(x * 0.7, z * 0.7, 106, 2) * (1 - 0.35 * routeMask);
      if (Math.hypot(x, z) > 26) return rubble * calm;
      // Rocks gather in patches and on the high ground, not uniformly.
      const cluster = Math.min(
        1,
        smoothstep(-0.15, 0.4, noise2(x * 0.09, z * 0.09, 108)) + 0.7 * smoothstep(0.8, 2.2, large),
      );
      const offTrack = 1 - routeMask;
      if (cluster * offTrack <= 0) return rubble * calm;
      const boulders = boulderField(x, z, {
        cell: 3.1,
        density: 0.5,
        minRadius: 0.5,
        maxRadius: 1.0,
        heightRatio: 0.55,
        seed: 107,
      });
      const scree = boulderField(x, z, {
        cell: 1.6,
        density: 0.45,
        minRadius: 0.32,
        maxRadius: 0.5,
        heightRatio: 0.5,
        seed: 109,
      });
      return (rubble + Math.max(boulders, scree) * cluster * offTrack) * calm;
    },
  };
}

// ── Soft rock: chalk hills with farm terraces ───────────────────────────────
// Broad rounded hills whose flanks are cut into flat terraces, with a shallow
// swale ahead. Because the ground is soft, the road is cut cleanly
// through it (high grade), the "easy to engineer" lesson.

function terraces(p: TerrainHeightProfile): Landform {
  const A = p.reliefAmplitude;
  const M = p.mediumAmplitude;
  const D = p.detailAmplitude;
  const hills: Blob[] = [
    [-10.8, 3.5, 5.6, 8.8, 0.2, 1.0],
    [10.5, -3, 5.2, 7.8, -0.3, 0.85],
    [14.5, 19.5, 7, 5, -0.6, 0.85],
    [-15.5, -17.5, 6.5, 5, 0.5, 0.75],
    [21.5, 0, 4.5, 7, 0, 0.6],
    [-19.5, 10, 4.5, 6, -0.3, 0.55],
  ];
  const swale: Path = [[-27, 20.5], [-8, 21], [6, 22.5], [27, 19.5]];

  return {
    large(x, z) {
      const wx = warpX(x, z, 2.6, 0.05, 201);
      const wz = warpZ(x, z, 2.6, 0.05, 201);
      let h = sumBlobs(wx, wz, hills);
      h -= 0.22 * channel(pathDistance(wx, wz, swale), 2, 4);
      h += 0.2 * fbm2(x * 0.045, z * 0.045, 202, 3);
      return h * A + apron(x, z, p.outerRelief, 0.5 + 0.5 * fbm2(x * 0.035, z * 0.035, 203, 3));
    },
    medium(x, z, large) {
      const v = large + 0.1 * M * noise2(x * 0.09, z * 0.09, 204);
      const terrace = terraceOffset(v, M, 0.72) * smoothstep(0.35, 1.0, large);
      return terrace + 0.12 * M * fbm2(x * 0.3, z * 0.3, 205, 2);
    },
    small(x, z, _large, routeMask, calm) {
      return D * fbm2(x * 0.65, z * 0.65, 206, 2) * (1 - 0.5 * routeMask) * calm;
    },
  };
}

// ── Sand: transverse dune field ─────────────────────────────────────────────
// Asymmetric dunes, with a long windward slope, a sharp brink and a steep
// slip face. The crests run across the spine, so driving ahead from spawn
// you climb each windward face and drop over its brink (the wind blows
// toward +Z). Near spawn the dunes ease down (see the spawn ease in
// createLandformHeight), leaving a calmer interdune flat to start on.

function dune(x: number, z: number, wavelength: number, angle: number, seed: number): number {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const u = x * c + z * s; // downwind
  const v = -x * s + z * c; // along the crest
  const phase = u / wavelength + 0.28 * noise2(v * 0.045, u * 0.02, seed) + 0.1 * Math.sin(v * 0.19 + seed);
  const index = Math.floor(phase);
  const f = phase - index;
  const CREST = 0.62;
  // Windward: eases in from the trough and is still rising at the crest.
  // Slip face: drops steeply from the brink, then eases into the next trough.
  const profile =
    f < CREST
      ? 0.85 * smoothstep01(f / CREST) + 0.15 * (f / CREST)
      : Math.pow(1 - (f - CREST) / (1 - CREST), 1.6);
  // Height varies crest to crest and along each crest (saddles, horns). The
  // switch between crests happens in the trough, where the profile is 0.
  const amp = 0.62 + 0.45 * noise2(v * 0.05, index * 3.1, seed + 1);
  return profile * Math.max(0.2, Math.min(1, amp));
}

function dunes(p: TerrainHeightProfile): Landform {
  const A = p.reliefAmplitude;
  const M = p.mediumAmplitude;
  const D = p.detailAmplitude;
  const WIND = 1.32; // downwind ≈ +Z (the spawn heading), tilted slightly left

  return {
    large(x, z) {
      const wx = warpX(x, z, 1.6, 0.04, 301);
      const wz = warpZ(x, z, 1.6, 0.04, 301);
      const h = dune(wx, wz, 14, WIND, 302) + 0.22 * fbm2(x * 0.04, z * 0.04, 303, 3);
      return h * A + apron(x, z, p.outerRelief, dune(x, z, 22, WIND - 0.15, 304));
    },
    medium(x, z) {
      // Small cross-dunes riding on the big ones, patchy rather than everywhere.
      const patch = smoothstep(-0.2, 0.5, noise2(x * 0.08, z * 0.08, 305));
      return M * dune(x, z, 5.5, WIND - 0.6, 306) * patch;
    },
    small(x, z, _large, routeMask, calm) {
      return D * fbm2(x * 0.8, z * 0.8, 307, 2) * (1 - 0.3 * routeMask) * calm;
    },
  };
}

// ── Mud / loess: waterlogged valley floor ───────────────────────────────────
// Nearly flat, with shallow basins, low banks and a meandering drainage
// channel that the spine and the ring have to ford. Puddles sit in the low
// spots and right on the track. The difficulty here comes from the ground
// itself and from deep ruts, not from slopes.

const MUD_PUDDLES: Array<[number, number, number, number]> = [
  // [x, z, radius, depth] — first four sit on the route.
  [0.3, 6, 1.9, 0.2],
  [7.5, 15.5, 2.3, 0.22],
  [-12.5, -3, 2.1, 0.2],
  [9.5, -11.5, 2, 0.18],
  [-6, 5, 2.6, 0.2],
  [6, -5.5, 2.4, 0.18],
  [-7, -9, 2, 0.16],
  [11, 1, 2.1, 0.2],
];

function ruts(p: TerrainHeightProfile): Landform {
  const A = p.reliefAmplitude;
  const M = p.mediumAmplitude;
  const D = p.detailAmplitude;
  const basins: Blob[] = [
    [-9.5, -2, 6, 8.5, -0.1, -0.7],
    [10, 2.5, 5, 6.5, 0.4, -0.5],
    [16.5, 17, 6, 5, -0.7, 0.6],
    [-18, 14, 5.5, 4.5, 0, 0.5],
    [-4, -21, 8, 3.5, 0, 0.45],
    [20.5, -8, 4.5, 7, 0, 0.5],
  ];
  const drain: Path = [[-27, 5], [-15, 8], [-6, 11.2], [2, 9.8], [9, 12], [16, 9.5], [27, 11]];

  return {
    large(x, z) {
      const wx = warpX(x, z, 1.8, 0.06, 401);
      const wz = warpZ(x, z, 1.8, 0.06, 401);
      let h = sumBlobs(wx, wz, basins);
      const d = pathDistance(wx, wz, drain);
      h -= 0.55 * channel(d, 0.9, 1.8);
      // Low natural levees along the channel banks.
      h += 0.12 * Math.exp(-((d - 3.1) * (d - 3.1)) / 0.8);
      h += 0.25 * fbm2(x * 0.045, z * 0.045, 402, 3);
      return h * A + apron(x, z, p.outerRelief, 0.5 + 0.5 * fbm2(x * 0.03, z * 0.03, 403, 3));
    },
    medium(x, z) {
      return M * fbm2(x * 0.3, z * 0.3, 404, 2);
    },
    small(x, z, _large, routeMask, calm) {
      let h = D * fbm2(x * 0.85, z * 0.85, 405, 2) * (1 - 0.3 * routeMask) * calm;
      // Puddles aren't damped by the calm zone: the one just ahead of spawn
      // is the first thing this terrain should show you.
      for (const [px, pz, r, depth] of MUD_PUDDLES) {
        const d = Math.hypot(x - px, z - pz);
        if (d < r) h -= depth * (1 - smoothstep(0.35 * r, r, d));
      }
      return h;
    },
  };
}

const LANDFORMS: Record<TerrainHeightProfile['style'], (p: TerrainHeightProfile) => Landform> = {
  ledges,
  terraces,
  dunes,
  ruts,
};

// ── Composition ─────────────────────────────────────────────────────────────

const BED_TAPS: Array<[number, number, number]> = (() => {
  const taps: Array<[number, number, number]> = [[0, 0, 0.2]];
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    taps.push([Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0.4 / 6]);
    taps.push([Math.cos(a + Math.PI / 6) * 5, Math.sin(a + Math.PI / 6) * 5, 0.4 / 6]);
  }
  return taps;
})();

/** Distance (m) over which the bed heights of two meeting lines are blended. */
const JUNCTION_BLEND = 0.8;

/**
 * Cross-section of the track: twin wheel ruts, deeper in some stretches than
 * others, plus patchy spoil berms just outside the bed.
 */
function trackProfile(x: number, z: number, d: number, rutDepth: number, bermHeight: number): number {
  let h = 0;
  const rd = Math.abs(d - ROUTE_RUT_OFFSET) / 0.32;
  if (rd < 1) {
    const depth = rutDepth * (0.75 + 0.35 * noise2(x * 0.18, z * 0.18, 900));
    h -= depth * 0.5 * (1 + Math.cos(Math.PI * rd));
  }
  const bd = Math.abs(d - (ROUTE_HALF_WIDTH + 0.45 + 0.25 * noise2(x * 0.1, z * 0.1, 902))) / 0.6;
  if (bd < 1) {
    const patch = smoothstep(-0.35, 0.3, noise2(x * 0.13, z * 0.13, 903));
    h += bermHeight * patch * (0.7 + 0.3 * noise2(x * 0.3, z * 0.3, 901)) * 0.5 * (1 + Math.cos(Math.PI * bd));
  }
  return h;
}

/**
 * Builds the world-space height function for one terrain profile. The same
 * function is used for the render mesh and for per-wheel contact, so the
 * surface you see is the surface you drive on.
 */
export function createLandformHeight(profile: TerrainHeightProfile): (x: number, z: number) => number {
  const land = LANDFORMS[profile.style](profile);
  const { grade, rutDepth, bermHeight } = profile.route;

  // Large forms ease to half height at the spawn point and reach full
  // strength ~10 m out. The hills still frame the first view, but no steep
  // bank sits right beside the start.
  const largeAt = (x: number, z: number) => land.large(x, z) * (0.5 + 0.5 * smoothstep(3, 10, Math.hypot(x, z)));

  // Track bed height at each centreline vertex: the large forms blurred over
  // a ~10 m disc, which keeps grades drivable even on hard rock. It's a 2D
  // field value, so meeting lines already nearly agree; `JUNCTION_BLEND`
  // smooths away the remainder.
  const bed = DRIVE_ROUTE.sampleAlong((x, z) => {
    let h = 0;
    for (const [dx, dz, w] of BED_TAPS) h += largeAt(x + dx, z + dz) * w;
    return h;
  });

  const hits = DRIVE_ROUTE.createHits();
  // Same calm window the terrain material uses (terrainMaterial.ts → tgCalm),
  // so medium/small detail and the ground shading ramp in together.
  const calmIn = CALM_START_RADIUS * 0.6;
  const calmOut = CALM_BLEND_RADIUS;

  return function heightAt(x: number, z: number): number {
    const large = largeAt(x, z);
    let routeMask = 0;
    let graded = large;
    let track = 0;
    const nearest = DRIVE_ROUTE.query(x, z, hits);
    if (nearest >= 0) {
      const dMin = hits[nearest].dist;
      let bedSum = 0;
      let weightSum = 0;
      for (const hit of hits) {
        if (hit.dist === Infinity) continue;
        // Fades to 0 at the edge of the query radius, so a line entering range adds no seam.
        const w =
          Math.exp(-(hit.dist - dMin) / JUNCTION_BLEND) *
          (1 - smoothstep(DRIVE_ROUTE.influence - 1, DRIVE_ROUTE.influence, hit.dist));
        bedSum += w * DRIVE_ROUTE.interpolate(bed, hit);
        weightSum += w;
      }
      // The shoulder edge wanders, so cut banks don't run as ruler-straight lines.
      routeMask = routeMaskFromDistance(dMin - ROUTE_EDGE_WOBBLE * noise2(x * 0.1, z * 0.1, 904));
      if (weightSum > 0) graded = large + (bedSum / weightSum - large) * grade * routeMask;
      track = trackProfile(x, z, dMin, rutDepth, bermHeight);
    }
    const calm = 0.3 + 0.7 * smoothstep(calmIn, calmOut, Math.hypot(x, z));
    const medium = land.medium(x, z, large) * calm * (1 - grade * routeMask);
    return graded + medium + land.small(x, z, large, routeMask, calm) + track;
  };
}
