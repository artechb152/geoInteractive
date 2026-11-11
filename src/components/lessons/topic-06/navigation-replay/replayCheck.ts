/**
 * A position check, as geometry. The learner gathers evidence and each piece
 * becomes a LOCUS — the set of places they could be standing:
 *
 *   sight    a point sign seen from afar (a summit, the saddle, the pines):
 *            the line from the sign back through the eye, drawn from the
 *            observed direction
 *   stand    a point sign the eye stands in (the saddle): that place
 *   on       a linear sign the eye stands on (the road, the stream): that line
 *   arc      the distance counted since the last identified point: a circle
 *            around it
 *
 * One locus is never a position. Two that cross at a usable angle are. The
 * check compares the place they give with the dead-reckoned estimate; it
 * never reads the true position (the observed direction carries a small
 * reading error, as a compass would) — so a check is evidence, not a GPS fix.
 */
import { crownGap, SIGNS, STAND_IN_M, type Sign, type SignId } from './replayRoute';
import { heightAt } from './replayTerrain';
import { bearingW, distW, headingVec, nearestOn, type Polyline, type W2 } from './replayWorld';

/** The reading error of a sighted direction, degrees (a careful compass reading). */
export const SIGHT_ERROR_DEG = 1.5;
/** Below this crossing angle two loci do not fix a place. */
export const MIN_CROSS_DEG = 10;
/** A fix within this distance of the estimate agrees with it, m. */
export const AGREE_M = 25;

export type Locus =
  | { kind: 'sight'; sign: SignId; from: W2; az: number }
  | { kind: 'stand'; sign: SignId; at: W2 }
  | { kind: 'on'; sign: SignId; line: Polyline }
  | { kind: 'arc'; centre: W2; r: number };

/** Length of a sight line drawn on the map, m. */
const SIGHT_LEN = 1400;

/** What a sign identified in the view and matched on the map tells, seen from `eye`. */
export function locusOf(id: SignId, eye: W2): Locus | null {
  const s = SIGNS[id];
  if (s.kind === 'point' && s.at) {
    if (distW(eye, s.at) <= STAND_IN_M) return { kind: 'stand', sign: id, at: s.at };
    // the direction from the eye to the sign, as read; the line runs back from the sign
    const az = (bearingW(eye, s.at) + SIGHT_ERROR_DEG + 180) % 360;
    return { kind: 'sight', sign: id, from: s.at, az };
  }
  if (s.kind === 'line' && s.line && nearestOn(s.line, eye).d <= 15) return { kind: 'on', sign: id, line: s.line };
  return null;
}

/** Why a sign gives no locus from here (for the feedback), or null when it does. */
export function noLocusReason(id: SignId, eye: W2): 'area' | 'far-line' | null {
  const s = SIGNS[id];
  if (s.kind === 'area') return 'area';
  if (s.kind === 'line' && s.line && nearestOn(s.line, eye).d > 15) return 'far-line';
  return null;
}

// ───────────────────────────────────────────── loci as polylines (for drawing and crossing)

export function locusPoints(l: Locus): W2[] {
  switch (l.kind) {
    case 'sight': {
      const v = headingVec(l.az);
      return [l.from, { x: l.from.x + v.x * SIGHT_LEN, z: l.from.z + v.z * SIGHT_LEN }];
    }
    case 'arc': {
      const n = 180;
      return Array.from({ length: n + 1 }, (_, k) => {
        const a = (k / n) * Math.PI * 2;
        return { x: l.centre.x + Math.cos(a) * l.r, z: l.centre.z + Math.sin(a) * l.r };
      });
    }
    case 'on':
      return l.line.pts;
    case 'stand':
      return [l.at];
  }
}

type Hit = { at: W2; angle: number };

function segCross(a: W2, b: W2, c: W2, d: W2): { p: W2; angle: number } | null {
  const r = { x: b.x - a.x, z: b.z - a.z };
  const s = { x: d.x - c.x, z: d.z - c.z };
  const den = r.x * s.z - r.z * s.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * s.z - (c.z - a.z) * s.x) / den;
  const u = ((c.x - a.x) * r.z - (c.z - a.z) * r.x) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  const cos = Math.abs(r.x * s.x + r.z * s.z) / (Math.hypot(r.x, r.z) * Math.hypot(s.x, s.z));
  return { p: { x: a.x + r.x * t, z: a.z + r.z * t }, angle: (Math.acos(Math.min(1, cos)) * 180) / Math.PI };
}

/** Where two loci cross, with the crossing angle (a "stand" locus agrees with any locus passing close to it). */
export function crossings(a: Locus, b: Locus): Hit[] {
  if (a.kind === 'stand' || b.kind === 'stand') {
    const st = (a.kind === 'stand' ? a : b) as Extract<Locus, { kind: 'stand' }>;
    const other = a.kind === 'stand' ? b : a;
    if (other.kind === 'stand') return st.sign === other.sign ? [{ at: st.at, angle: 90 }] : [];
    const pts = locusPoints(other);
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) best = Math.min(best, distToSeg(st.at, pts[i - 1], pts[i]));
    return best <= AGREE_M ? [{ at: st.at, angle: 90 }] : [];
  }
  const pa = locusPoints(a);
  const pb = locusPoints(b);
  const out: Hit[] = [];
  for (let i = 1; i < pa.length; i++)
    for (let j = 1; j < pb.length; j++) {
      const h = segCross(pa[i - 1], pa[i], pb[j - 1], pb[j]);
      if (h) out.push({ at: h.p, angle: h.angle });
    }
  return out;
}

function distToSeg(p: W2, a: W2, b: W2) {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const L2 = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.z - a.z) * vz) / L2));
  return Math.hypot(a.x + vx * t - p.x, a.z + vz * t - p.z);
}

// ───────────────────────────────────────────── the verdict

export type CheckVerdict =
  | { kind: 'partial'; why: 'one-sight' | 'one-arc' | 'one-on' | 'one-stand' | 'shallow' | 'apart'; loci: Locus[] }
  | { kind: 'fix'; at: W2; offsetM: number; agrees: boolean; angle: number; loci: Locus[] };

/**
 * Evaluates the gathered loci against the estimate. The fix is the crossing
 * nearest the estimate; with three or more loci, the usable crossings are
 * averaged. (The estimate only chooses between crossings, it never moves one.)
 */
export function evaluate(loci: Locus[], estimate: W2): CheckVerdict {
  if (loci.length === 1) {
    const k = loci[0].kind;
    return { kind: 'partial', why: k === 'sight' ? 'one-sight' : k === 'arc' ? 'one-arc' : k === 'on' ? 'one-on' : 'one-stand', loci };
  }
  const usable: Hit[] = [];
  let shallow = false;
  for (let i = 0; i < loci.length; i++)
    for (let j = i + 1; j < loci.length; j++) {
      const hits = crossings(loci[i], loci[j]).filter((h) => distW(h.at, estimate) < 700);
      if (!hits.length) continue;
      hits.sort((p, q) => distW(p.at, estimate) - distW(q.at, estimate));
      if (hits[0].angle < MIN_CROSS_DEG) shallow = true;
      else usable.push(hits[0]);
    }
  if (!usable.length) return { kind: 'partial', why: shallow ? 'shallow' : 'apart', loci };
  const at = { x: usable.reduce((s, h) => s + h.at.x, 0) / usable.length, z: usable.reduce((s, h) => s + h.at.z, 0) / usable.length };
  const offsetM = distW(at, estimate);
  return { kind: 'fix', at, offsetM, agrees: offsetM <= AGREE_M, angle: Math.max(...usable.map((h) => h.angle)), loci };
}

// ───────────────────────────────────────────── recognising a sign from a click

/** A tree crown the view's ray passed through, if any (the 3D canvas reports it with the ground hit). */
export type ViewPick = { eye: W2 & { y: number }; dir?: { x: number; y: number; z: number }; hit: (W2 & { y: number }) | null; tree?: 'oak' | 'pine' | 'olive' | null };

const SUMMIT_R = 115;
const SADDLE_R = 75;

/**
 * Which sign a click in the view meant: the crown it hit, else the point,
 * line or area its ground hit belongs to. `null`: nothing on the map there.
 */
export function signFromView(p: ViewPick): SignId | null {
  if (p.tree === 'pine') return 'pines';
  if (p.tree === 'oak' && p.hit && crownGap(p.hit) < 25) return 'woodland';
  const s = SIGNS;
  // a point sign seen from afar is recognised by direction — a summit's top or the saddle's notch on the
  // skyline is often just hidden, so the ray lands on the slope before it or the land beyond it
  const aimed = aimedSign(p);
  if (aimed) return aimed;
  const h = p.hit;
  if (!h) return null;
  const near = (id: SignId, r: number) => distW(h, s[id].at!) <= r;
  // standing in the saddle: the ground around the eye is the saddle
  if (distW(p.eye, s.saddle.at!) <= STAND_IN_M && near('saddle', SADDLE_R)) return 'saddle';
  if (near('summitW', SUMMIT_R) && h.y > SUMMIT_TOP.summitW - 60) return 'summitW';
  if (near('summitE', SUMMIT_R) && h.y > SUMMIT_TOP.summitE - 60) return 'summitE';
  if (near('saddle', SADDLE_R)) return 'saddle';
  if (nearestOn(s.road.line!, h).d <= 14) return 'road';
  if (nearestOn(s.stream.line!, h).d <= 16) return 'stream';
  if (s.pines.members!.some((m) => distW(m, h) < 22)) return 'pines';
  if (crownGap(h) < 6) return 'woodland';
  return null;
}

/** Apparent half-size of a point sign from afar, m (a summit's crown, the saddle's notch, the pine grove). */
const AIM_HALF_M: Partial<Record<SignId, number>> = { summitW: 95, summitE: 95, saddle: 45, pines: 55 };
const AIM_LIFT_M: Partial<Record<SignId, number>> = { summitW: -12, summitE: -12, saddle: 2, pines: 7 };

function aimedSign(p: ViewPick): SignId | null {
  const d = p.dir;
  if (!d) return null;
  let best: SignId | null = null;
  let bestScore = 1;
  for (const id of Object.keys(AIM_HALF_M) as SignId[]) {
    const at = SIGNS[id].at!;
    const dist = distW(p.eye, at);
    if (dist <= STAND_IN_M + 20) continue;
    const vx = at.x - p.eye.x;
    const vy = heightAt(at.x, at.z) + AIM_LIFT_M[id]! - p.eye.y;
    const vz = at.z - p.eye.z;
    const len = Math.hypot(vx, vy, vz);
    const ang = Math.acos(Math.max(-1, Math.min(1, (vx * d.x + vy * d.y + vz * d.z) / len)));
    const tol = Math.max(0.045, Math.atan(AIM_HALF_M[id]! / dist));
    // the ground hit must not be much nearer than the sign (a click on the near slope below it is not the sign)
    if (p.hit && distW(p.eye, p.hit) < dist * 0.45) continue;
    const score = ang / tol;
    if (score < bestScore) [best, bestScore] = [id, score];
  }
  return best;
}

/** Summit heights, m — a click lower down the hill than ~60 m under the top is not "the summit". */
const SUMMIT_TOP = { summitW: heightAt(SIGNS.summitW.at!.x, SIGNS.summitW.at!.z), summitE: heightAt(SIGNS.summitE.at!.x, SIGNS.summitE.at!.z) };

/** Which sign a click on the map (in world metres) meant. Points before lines before areas. */
export function signFromMap(w: W2): SignId | null {
  const s = SIGNS;
  if (distW(w, s.saddle.at!) <= 55) return 'saddle';
  if (distW(w, s.summitW.at!) <= 90) return 'summitW';
  if (distW(w, s.summitE.at!) <= 90) return 'summitE';
  if (distW(w, s.pines.at!) <= 70 || s.pines.members!.some((m) => distW(m, w) < 25)) return 'pines';
  if (nearestOn(s.road.line!, w).d <= 28) return 'road';
  if (nearestOn(s.stream.line!, w).d <= 28) return 'stream';
  if (crownGap(w) < 14) return 'woodland';
  return null;
}

/** Hebrew: the compass word for a direction from a point to another ("צפונה", "דרום־מערבה"…). */
export function directionWord(from: W2, to: W2): string {
  const words = ['צפונה', 'צפון־מזרחה', 'מזרחה', 'דרום־מזרחה', 'דרומה', 'דרום־מערבה', 'מערבה', 'צפון־מערבה'];
  return words[Math.round(bearingW(from, to) / 45) % 8];
}

export const signName = (id: SignId) => SIGNS[id].name;
export type { Sign };
