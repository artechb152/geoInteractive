// Central app state (Zustand). Every UI and tactical component reads from here,
// which keeps the components prop-free and decoupled.

import { create } from "zustand";
import {
  INTEL_ACTIONS,
  INTEL_BUDGET,
  SITUATION_IDS,
  STAGE_ORDER,
  STAGES,
} from "./scenario";
import type {
  CameraMode,
  ElementId,
  LayerState,
  MissionStage,
  RevealState,
  RouteId,
  ScoutId,
  SituationId,
} from "./types";

const DEFAULT_LAYERS: LayerState = {
  lineOfSight: true,
  dangerZones: true,
  routes: true,
  labels: true,
  unitMarkers: true,
};

const DEFAULT_REVEALS: RevealState = {
  friendlyLOS: false,
  enemyLOS: false,
  valleyZone: false,
  approachZone: false,
  bridgeZone: false,
  sideZone: false,
  sidePassage: false,
  civilianHint: false,
};

function pickSituation(): SituationId {
  return SITUATION_IDS[Math.floor(Math.random() * SITUATION_IDS.length)];
}

interface SimState {
  stage: MissionStage;
  cameraMode: CameraMode;
  selectedRoute: RouteId | null;
  selectedElement: ElementId | null;
  hoveredElement: ElementId | null;
  layers: LayerState;
  booted: boolean;
  /** False until the user dismisses the opening intro screen. */
  missionStarted: boolean;
  /** Guided-explanation mode: the side panel shows the full structured guide. */
  guidedMode: boolean;
  /** Intelligence-phase state. */
  reveals: RevealState;
  actionPoints: number;
  scoutedActions: ScoutId[];
  findings: string[];
  /** Random per-run situation modifier. */
  situationId: SituationId;
  /** Bumped whenever the camera should (re)frame, so the rig re-runs its
   *  transition even when the mode value is unchanged (e.g. Reset). */
  cameraNonce: number;

  setBooted: (v: boolean) => void;
  startMission: () => void;
  toggleGuided: () => void;
  performScout: (id: ScoutId) => void;
  setStage: (s: MissionStage) => void;
  goNext: () => void;
  goPrev: () => void;
  setCameraMode: (m: CameraMode) => void;
  selectRoute: (r: RouteId) => void;
  setSelectedElement: (e: ElementId | null) => void;
  setHoveredElement: (e: ElementId | null) => void;
  toggleLayer: (k: keyof LayerState) => void;
  goToDebrief: () => void;
  tryAnotherRoute: () => void;
  restart: () => void;
}

export const useSim = create<SimState>((set, get) => ({
  stage: "brief",
  cameraMode: "strategic",
  selectedRoute: null,
  selectedElement: null,
  hoveredElement: null,
  layers: { ...DEFAULT_LAYERS },
  booted: false,
  missionStarted: false,
  guidedMode: true,
  reveals: { ...DEFAULT_REVEALS },
  actionPoints: INTEL_BUDGET,
  scoutedActions: [],
  findings: [],
  situationId: "lowvis",
  cameraNonce: 0,

  setBooted: (v) => set({ booted: v }),

  startMission: () => {
    set({
      missionStarted: true,
      reveals: { ...DEFAULT_REVEALS },
      actionPoints: INTEL_BUDGET,
      scoutedActions: [],
      findings: [],
      situationId: pickSituation(),
    });
    get().setStage("brief");
  },

  toggleGuided: () => set((s) => ({ guidedMode: !s.guidedMode })),

  performScout: (id) =>
    set((s) => {
      if (s.actionPoints <= 0 || s.scoutedActions.includes(id)) return {};
      const r: RevealState = { ...s.reveals };
      if (id === "hill") {
        r.friendlyLOS = true;
        r.valleyZone = true;
      } else if (id === "ridge") {
        r.enemyLOS = true;
        r.approachZone = true;
      } else if (id === "side") {
        r.sideZone = true;
        r.sidePassage = true;
      } else if (id === "bridge") {
        r.bridgeZone = true;
      } else if (id === "civilians") {
        r.civilianHint = true;
      }
      const action = INTEL_ACTIONS.find((a) => a.id === id);
      return {
        actionPoints: s.actionPoints - 1,
        scoutedActions: [...s.scoutedActions, id],
        reveals: r,
        findings: action ? [...s.findings, action.finding] : s.findings,
      };
    }),

  setStage: (s) =>
    set((st) => ({
      stage: s,
      cameraMode: STAGES[s].cameraMode,
      selectedElement: null,
      cameraNonce: st.cameraNonce + 1,
    })),

  goNext: () => {
    const i = STAGE_ORDER.indexOf(get().stage);
    get().setStage(STAGE_ORDER[Math.min(i + 1, STAGE_ORDER.length - 1)]);
  },

  goPrev: () => {
    const i = STAGE_ORDER.indexOf(get().stage);
    get().setStage(STAGE_ORDER[Math.max(i - 1, 0)]);
  },

  setCameraMode: (m) =>
    set((s) => ({ cameraMode: m, cameraNonce: s.cameraNonce + 1 })),

  selectRoute: (r) =>
    set((s) => ({
      selectedRoute: r,
      cameraMode: "route",
      cameraNonce: s.cameraNonce + 1,
    })),

  setSelectedElement: (e) => set({ selectedElement: e }),

  setHoveredElement: (e) => set({ hoveredElement: e }),

  toggleLayer: (k) =>
    set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),

  goToDebrief: () => {
    if (get().selectedRoute)
      set((s) => ({
        stage: "debrief",
        cameraMode: "strategic",
        selectedElement: null,
        cameraNonce: s.cameraNonce + 1,
      }));
  },

  tryAnotherRoute: () =>
    set((s) => ({
      stage: "decision",
      cameraMode: "strategic",
      selectedRoute: null,
      selectedElement: null,
      cameraNonce: s.cameraNonce + 1,
    })),

  restart: () =>
    set((s) => ({
      stage: "brief",
      cameraMode: "strategic",
      selectedRoute: null,
      selectedElement: null,
      hoveredElement: null,
      missionStarted: false,
      layers: { ...DEFAULT_LAYERS },
      reveals: { ...DEFAULT_REVEALS },
      actionPoints: INTEL_BUDGET,
      scoutedActions: [],
      findings: [],
      situationId: pickSituation(),
      cameraNonce: s.cameraNonce + 1,
    })),
}));
