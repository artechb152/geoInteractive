"use client";

import { useSim } from "@/lib/store";
import { TitleBar } from "./TitleBar";
import { MissionPanel } from "./MissionPanel";
import { AnalysisPanel } from "./AnalysisPanel";
import { TacticalOverview } from "./TacticalOverview";
import { CameraCaption } from "./CameraCaption";
import { BottomBar } from "./BottomBar";
import { RouteDecision } from "./RouteDecision";
import { Debrief } from "./Debrief";
import { MissionBrief } from "./MissionBrief";

export function Hud() {
  const stage = useSim((s) => s.stage);
  const missionStarted = useSim((s) => s.missionStarted);

  return (
    <div className="hud">
      {/* RTL: header + mission flow lead from the right; analysis sits on the left */}
      <div className="right-rail">
        <TitleBar />
        <MissionPanel />
      </div>
      <div className="left-rail">
        <AnalysisPanel />
        <TacticalOverview />
      </div>
      <CameraCaption />
      <BottomBar />
      {stage === "decision" && <RouteDecision />}
      {stage === "debrief" && <Debrief />}
      {!missionStarted && <MissionBrief />}
    </div>
  );
}
