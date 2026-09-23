// Shared type contract for the simulator. Every component consumes these types;
// no component should redefine its own variants.

/** Planar map coordinate [x, z]. Height (y) is sampled from the terrain. */
export type Vec2 = [number, number];

/** Explicit world coordinate [x, y, z]. */
export type Vec3 = [number, number, number];

export type CameraMode =
  | "strategic"
  | "soldier"
  | "highground"
  | "overwatch"
  | "chokepoint"
  | "route";

export type MissionStage =
  | "brief"
  | "highground"
  | "movement"
  | "overwatch"
  | "chokepoint"
  | "decision"
  | "debrief";

export type RouteId = "valley" | "highground" | "sidepassage";

export type ElementId =
  | "western-hill"
  | "valley-road"
  | "bridge"
  | "enemy-ridge"
  | "village"
  | "side-passage";

export type Faction = "friendly" | "enemy" | "observation";

export type ElementKind = "friendly" | "enemy" | "neutral" | "objective";

export interface RouteEvaluation {
  risk: string;
  speed: string;
  advantage: string;
  score: number;
  feedback: string;
}

/** 0-100 tactical metrics for a route. "good" metrics reward high values;
 *  "risk" metrics (exposure, chokeRisk) penalize high values. */
export interface RouteMetrics {
  visibility: number;
  exposure: number;
  speed: number;
  advantage: number;
  chokeRisk: number;
}

export interface RouteDef {
  id: RouteId;
  label: string;
  shortLabel: string;
  color: string;
  /** Planar path; lift onto the surface with onSurface() at render time. */
  waypoints: Vec2[];
  /** Neutral, pre-decision framing (shown BEFORE the player commits). */
  description: string;
  known: string;
  unknown: string;
  /** Revealed only AFTER the player selects this route. */
  evaluation: RouteEvaluation;
  metrics: RouteMetrics;
  /** Key terrain interactions along the route, in plain language. */
  interactions: string[];
  recommendation: string;
}

/** Intelligence-gathering action the player can spend a point on. */
export type ScoutId = "hill" | "ridge" | "side" | "civilians" | "bridge";

export interface IntelAction {
  id: ScoutId;
  label: string;
  finding: string;
}

/** What scouting has revealed so far (drives overlay visibility). */
export interface RevealState {
  friendlyLOS: boolean;
  enemyLOS: boolean;
  valleyZone: boolean;
  approachZone: boolean;
  bridgeZone: boolean;
  sideZone: boolean;
  sidePassage: boolean;
  civilianHint: boolean;
}

/** Random per-run situation modifier shown at the brief. */
export type SituationId =
  | "civilians"
  | "lowvis"
  | "unverified"
  | "timepressure"
  | "quietridge";

export interface SituationModifier {
  id: SituationId;
  label: string;
  text: string;
}

export interface DangerZone {
  id: string;
  position: Vec2;
  radius: number;
  label: string;
  level: "moderate" | "high" | "extreme";
}

export interface SightLine {
  id: string;
  kind: "enemy" | "friendly";
  from: Vec2;
  to: Vec2;
}

export interface TacticalElement {
  id: ElementId;
  name: string;
  kind: ElementKind;
  position: Vec2;
  /** Hit-test radius for click selection. */
  radius: number;
  /** Short tactical role, e.g. "Observation Advantage" or "Choke Point". */
  role: string;
  summary: string;
  details: string[];
}

export interface UnitMarker {
  id: string;
  faction: Faction;
  position: Vec2;
  label: string;
}

export interface MapLabel {
  id: string;
  text: string;
  position: Vec2;
  kind: "terrain" | "structure" | "enemy" | "objective" | "route";
}

export interface LayerState {
  lineOfSight: boolean;
  dangerZones: boolean;
  routes: boolean;
  labels: boolean;
  unitMarkers: boolean;
}

export interface StageInfo {
  id: MissionStage;
  index: number;
  title: string;
  subtitle: string;
  body: string;
  focus: ElementId | null;
  cameraMode: CameraMode;
}

/** Guided per-stage explanation shown in the side panel. */
export interface StageGuide {
  see: string;
  why: string;
  watch: string;
}

/** A key tactical concept with a short, plain-language explanation. */
export interface KeyConcept {
  id: string;
  term: string;
  text: string;
}

export interface CameraPose {
  position: Vec3;
  target: Vec3;
}

/** Resolved overlay visibility for the current stage + layer toggles. */
export interface VisibilityState {
  routeIds: RouteId[];
  /** Ids of the exposure zones to render for this stage. */
  exposureZoneIds: string[];
  /** Ids of the sight lines to render, by faction, for this stage. */
  enemyLOSIds: string[];
  friendlyLOSIds: string[];
  enemyMarkers: boolean;
  friendlyMarker: boolean;
  observationMarker: boolean;
  labels: boolean;
  highlightElement: ElementId | null;
}
