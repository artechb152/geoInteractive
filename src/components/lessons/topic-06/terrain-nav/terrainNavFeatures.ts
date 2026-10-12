/**
 * The features of the terrain-association scenario as the learner meets them:
 * a name, what the feature is (relief / land cover / route point), how the map
 * shows it, where its label sits — and one picking function that both views
 * use, so a click in the model and a click on the map resolve to the same id.
 */
import {
  CHECKPOINT_LABEL,
  GROVES,
  SQUARE_CENTER,
  SQUARE_RING,
  START,
  VILLAGE_RING,
  WATER_TOWER,
  type DomeId,
  type Point,
  type XY,
} from './terrainNavScenario';
import { distance } from './terrainNavGeometry';
import { GRID, domeFootprints, insideSheet, ringPoints, roads, summitOf, waterCourses } from './terrainNavTerrain';
import type { FeatureId } from './terrainNavPractice';
import { distanceToPolyline, pointInPolygon, polygonCentroid } from '../locationCheckGeometry';

export type FeatureInfo = {
  readonly id: FeatureId;
  readonly name: string;
  /** תבליט / תכסית / נקודת ציר. */
  readonly kind: string;
  /** How the printed map shows it. */
  readonly onMap: string;
  /** Where its label sits (ground point). */
  readonly anchor: Point;
};

const alongCurve = (pts: readonly XY[], f: number): Point => {
  const q = pts[Math.round((pts.length - 1) * f)];
  return { E: q[0], N: q[1] };
};

const ROUTE_DOMES: readonly DomeId[] = ['H1', 'H2', 'H3'];

let infoCache: Map<FeatureId, FeatureInfo> | null = null;
export function featureInfo(): Map<FeatureId, FeatureInfo> {
  if (!infoCache) {
    const m = new Map<FeatureId, FeatureInfo>();
    const add = (f: FeatureInfo) => m.set(f.id, f);
    add({ id: 'A', name: 'נקודת המוצא A', kind: 'נקודת מוצא', onMap: 'עיגול מלא עם האות A, בצומת הדרכים שבדרום־מזרח.', anchor: START });
    for (const id of ['H1', 'H2', 'H3', 'D1', 'D2', 'D3', 'D4'] as const) {
      const s = summitOf(id);
      const h = Math.round(s.heightM);
      const route = ROUTE_DOMES.includes(id);
      add({
        id,
        name: route ? CHECKPOINT_LABEL[id as 'H1' | 'H2' | 'H3'] : `כיפה בגובה ${h} מ׳`,
        kind: route ? 'תבליט · נקודה לבדיקת המיקום' : 'תבליט',
        onMap: `קווי גובה סגורים סביב נקודת גובה ${h} מ׳.`,
        anchor: { E: s.E, N: s.N },
      });
    }
    add({ id: 'square', name: CHECKPOINT_LABEL.B, kind: 'תכסית · היעד', onMap: 'משטח מרוצף בלב הכפר, שהבתים סביבו מכל הצדדים.', anchor: SQUARE_CENTER });
    add({ id: 'village', name: 'הכפר', kind: 'תכסית', onMap: 'מבנים בצבע כהה משני צדי הדרכים.', anchor: polygonCentroid(ringPoints(VILLAGE_RING)) });
    add({ id: 'tower', name: 'מגדל המים', kind: 'תכסית', onMap: 'עיגול עם נקודה במרכזו, על רמה ממזרח לבתים.', anchor: WATER_TOWER });
    const GROVE_NAME: Record<(typeof GROVES)[number]['id'], string> = { G1: 'החורשה ליד כיפה 1', G2: 'החורשה ליד כיפה 3', G3: 'החורשה הצפונית' };
    for (const g of GROVES) add({ id: g.id, name: GROVE_NAME[g.id], kind: 'תכסית', onMap: 'שטח ירוק בקו מקווקו, ובו סימן לכל עץ.', anchor: polygonCentroid(ringPoints(g.ring)) });
    const w = waterCourses();
    add({ id: 'stream', name: 'ערוץ הנחל', kind: 'תבליט', onMap: 'קו כחול בתחתית הערוץ; קווי הגובה יוצרים בו צורת V שפונה במעלה הזרם.', anchor: alongCurve(w.stream.pts, 0.42) });
    add({ id: 'gully-north', name: 'הערוץ הצר', kind: 'תבליט', onMap: 'קו כחול מקווקו; קווי הגובה יוצרים צורת V שפונה במעלה הערוץ.', anchor: alongCurve(w.gullies.find((g) => g.id === 'gully-north')!.pts, 0.45) });
    const road = (id: 'road-west' | 'track-east' | 'road-north', f: number) => alongCurve(roads().find((r) => r.id === id)!.pts, f);
    add({ id: 'track-east', name: 'דרך העפר המזרחית', kind: 'תכסית', onMap: 'קו חום בהיר בשוליים כהים.', anchor: road('track-east', 0.24) });
    add({ id: 'road-west', name: 'דרך העפר המערבית', kind: 'תכסית', onMap: 'קו חום בהיר בשוליים כהים.', anchor: road('road-west', 0.62) });
    add({ id: 'road-north', name: 'הדרך הצפונית', kind: 'תכסית', onMap: 'קו חום בהיר בשוליים כהים.', anchor: road('road-north', 0.55) });
    infoCache = m;
  }
  return infoCache;
}

/** The learn-mode list, in the order the route meets them. */
export const LEARN_FEATURES: readonly FeatureId[] = ['A', 'H1', 'H2', 'H3', 'square', 'village', 'tower', 'G1', 'G2', 'G3', 'stream', 'gully-north', 'track-east', 'road-west', 'road-north'];

const squareRing = ringPoints(SQUARE_RING);
const villageRing = ringPoints(VILLAGE_RING);
const groveRings = GROVES.map((g) => ({ id: g.id, ring: ringPoints(g.ring) }));

/**
 * The feature under a ground point, for a click in either view. `slackM`
 * widens the point and line targets (the map passes its on-screen tolerance).
 */
export function pickFeature(p: Point, slackM = 0): FeatureId | null {
  if (distance(p, START) <= 30 + slackM) return 'A';
  if (distance(p, WATER_TOWER) <= 22 + slackM) return 'tower';
  if (pointInPolygon(p, squareRing) || distance(p, SQUARE_CENTER) <= 24 + slackM) return 'square';
  for (const id of ['H1', 'H2', 'H3', 'D1', 'D2', 'D3', 'D4'] as const) {
    const s = summitOf(id);
    if (distance(p, s) <= 40 + slackM) return id;
  }
  const w = waterCourses();
  if (distanceToPolyline(p, w.stream.pts) <= 14 + slackM) return 'stream';
  const gn = w.gullies.find((g) => g.id === 'gully-north')!;
  if (distanceToPolyline(p, gn.pts) <= 10 + slackM) return 'gully-north';
  for (const r of roads()) {
    if (r.id === 'lane-village') continue;
    if (distanceToPolyline(p, r.pts) <= 9 + slackM) return r.id;
  }
  for (const g of groveRings) if (pointInPolygon(p, g.ring)) return g.id;
  if (pointInPolygon(p, villageRing) || roads().some((r) => r.id === 'lane-village' && distanceToPolyline(p, r.pts) <= 9 + slackM)) return 'village';
  // A dome's top: the cells within 25 m of its summit height, connected to it.
  if (insideSheet(p.E, p.N)) {
    const k = Math.round(p.N / GRID.stepM) * GRID.nE + Math.round(p.E / GRID.stepM);
    for (const [id, mask] of domeFootprints()) if (mask[k]) return id;
  }
  return null;
}
