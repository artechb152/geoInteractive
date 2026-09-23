// Shared visual constants for the 3D scene. All scene/tactical components import
// from here so the look stays cohesive and "premium tactical".
//
// NOTE: A subtle Bloom post-process is active (high luminance threshold). For
// tactical glow use bright meshBasicMaterial / emissive colors; keep terrain and
// structure materials non-emissive and physically plausible (roughness ~0.7-1).

import type { ElementKind, RouteId } from "./types";

/** Natural, muted, layered terrain + structure palette. */
export const PALETTE = {
  // terrain layers
  grassLow: "#71744a",
  grassDry: "#8d8452",
  grassHigh: "#9aa06a",
  dirt: "#6e5836",
  dirtDark: "#594630",
  rockLow: "#5f5950",
  rockMid: "#6f6860",
  rockHigh: "#8b8275",
  sand: "#9a8a62",
  mud: "#574832",
  // water
  water: "#2f5862",
  waterDeep: "#1d3a42",
  // road
  roadDirt: "#5b4a30",
  roadDark: "#493a26",
  roadEdge: "#71603f",
  // bridge
  bridgeWood: "#5a4632",
  bridgeWoodDark: "#463525",
  bridgeStone: "#6f685d",
  bridgeStoneDark: "#565047",
  // buildings
  buildingWall: "#a89c83",
  buildingWallAlt: "#8e8369",
  buildingWall3: "#b6ac92",
  roof: "#7c4636",
  roofAlt: "#6a3c2e",
  roof3: "#86503a",
  woodBeam: "#4a3a29",
  sandbag: "#7e7350",
  // vegetation
  treeFoliage: "#46583a",
  treeFoliageAlt: "#3c5033",
  treeFoliage3: "#506245",
  treeTrunk: "#463728",
  shrub: "#566240",
  shrubAlt: "#626d49",
  // rocks
  rock: "#6a645b",
  rockDark: "#4e4942",
} as const;

/** Tactical overlay colors (markers, zones, lines). */
export const TACTICAL = {
  friendly: "#3d8bff",
  friendlyGlow: "#8cbbff",
  enemy: "#ff5044",
  enemyGlow: "#ffa49b",
  observation: "#3fe3d2",
  observationGlow: "#a6fff5",
  warn: "#ffb13d",
  neutral: "#d8dee4",
  objective: "#ffcf4d",
  objectiveGlow: "#ffe49a",
  danger: "#ff3a2c",
  dangerSoft: "#ff6a5c",
  losEnemy: "#ff6b5e",
  losFriendly: "#5fd0e6",
  highlight: "#ffe08a",
  highlightGlow: "#fff0c0",
  selected: "#5ff0dd",
} as const;

/** Single source of truth for the color of a terrain element by its kind,
 *  used by both the analysis card and the 3D highlight ring. */
export function elementKindColor(kind: ElementKind): string {
  switch (kind) {
    case "enemy":
      return TACTICAL.enemy;
    case "friendly":
      return TACTICAL.friendly;
    case "objective":
      return TACTICAL.objective;
    default:
      return TACTICAL.neutral;
  }
}

/** Per-route accent colors. */
export const ROUTE_COLORS: Record<RouteId, string> = {
  valley: "#ff8a3c",
  highground: "#3fe3d2",
  sidepassage: "#ffd23f",
};

/** Sky, fog and lighting setup for the cinematic look. */
export const ENV = {
  bgTop: "#a4b8c6",
  fogColor: "#b1bcb9",
  fogNear: 150,
  fogFar: 580,
  sunColor: "#ffe2ad",
  sunPosition: [-165, 98, 82] as [number, number, number],
  sunIntensity: 2.9,
  ambientColor: "#5d6b7d",
  ambientIntensity: 0.3,
  hemiSky: "#d0e2ec",
  hemiGround: "#62583b",
  hemiIntensity: 0.5,
  fillColor: "#9cc0db",
  fillIntensity: 0.4,
  rimColor: "#ffd9a0",
  rimIntensity: 0.5,
} as const;
