import { useSim } from "@/lib/store";
import { SITUATIONS, STAGES } from "@/lib/scenario";
import { MissionProgress } from "./MissionProgress";

export function TitleBar() {
  const stage = useSim((s) => s.stage);
  const situationId = useSim((s) => s.situationId);
  const info = STAGES[stage];
  const situation = SITUATIONS[situationId];

  return (
    <div className="panel title-bar">
      <span className="hud-corner tl" />
      <span className="hud-corner tr" />

      <div className="brand">
        <div className="brand-mark">
          <span className="brand-mark-core" />
        </div>
        <div className="brand-text">
          <div className="brand-title">סימולטור ניתוח שטח טקטי</div>
          <div className="brand-line">סביבת תכנון תנועה תלת-ממדית</div>
        </div>
      </div>

      <div className="header-divider" />

      <div className="header-meta">
        <div className="meta-item">
          <span className="meta-label">משימה</span>
          <span className="meta-value">חציית עמק</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">שלב</span>
          <span className="meta-value accent">
            {info.index} / 7
          </span>
        </div>
      </div>

      <MissionProgress />

      <div className="situation-chip" title={situation.text}>
        <span className="situation-chip-icon" aria-hidden="true">!</span>
        <span className="situation-chip-label">גורם מצב</span>
        <span className="situation-chip-value">{situation.label}</span>
      </div>

      <div className="status-row">
        <span className="status-dot" />
        <span>סימולציה פעילה</span>
        <span className="status-spacer" />
        <span className="status-sub">אימון</span>
      </div>
    </div>
  );
}
