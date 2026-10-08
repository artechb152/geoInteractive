// Evaluates a map choice for a screen-C scenario. Pure; the geometry is injected so Node tests can run it.
import type { LatLon, SheetPoint } from './geo';
import type { Landmark, LandmarkId, Scenario } from './scaleContent.data';
import type { SheetMeta } from './scaleSheets.data';

export type ChoiceEval = { covered: boolean; sheetsNeeded: number; missing: string[]; correct: boolean };
export type ChooseGeo = {
  lonLatToSheet: (sheet: SheetMeta, p: LatLon) => SheetPoint;
  insideSheet: (q: SheetPoint) => boolean;
  sheetsNeeded: (points: readonly LatLon[], groundWidthM: number) => number;
};

export function scenarioPoints(s: Scenario, landmarks: Record<LandmarkId, Landmark>): LatLon[] {
  return [...s.points.map((id) => landmarks[id]), ...(s.area ?? [])];
}

export function evaluateChoice(
  s: Scenario,
  sheet: SheetMeta,
  landmarks: Record<LandmarkId, Landmark>,
  geo: ChooseGeo,
): ChoiceEval {
  const pts = scenarioPoints(s, landmarks);
  const covered = pts.every((p) => geo.insideSheet(geo.lonLatToSheet(sheet, p)));
  const missing = s.needs.filter((n) => !n.shownOn.includes(sheet.id)).map((n) => n.label);
  return { covered, sheetsNeeded: geo.sheetsNeeded(pts, sheet.groundWidthM), missing, correct: sheet.id === s.target };
}
