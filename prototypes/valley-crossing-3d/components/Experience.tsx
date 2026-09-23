"use client";

import { useSim } from "@/lib/store";
import { Scene } from "@/components/scene/Scene";
import { Hud } from "@/components/ui/Hud";

export function Experience() {
  const booted = useSim((s) => s.booted);

  return (
    <div className="app-root">
      <Scene />
      <Hud />
      <div className={`boot-overlay ${booted ? "boot-hidden" : ""}`}>
        <div className="boot-inner">
          <div className="boot-mark">
            <span className="boot-mark-core" />
          </div>
          <div className="boot-title">סימולטור ניתוח שטח טקטי</div>
          <div className="boot-sub">טוען נתוני שטח</div>
          <div className="boot-bar">
            <span className="boot-bar-fill" />
          </div>
        </div>
      </div>
    </div>
  );
}
