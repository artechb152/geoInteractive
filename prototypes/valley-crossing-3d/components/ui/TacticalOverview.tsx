import { MiniMap } from "./MiniMap";
import { Legend } from "./Legend";

export function TacticalOverview() {
  return (
    <div className="panel overview-panel">
      <span className="hud-corner tl" />
      <span className="hud-corner br" />
      <div className="panel-eyebrow">סקירה טקטית</div>
      <MiniMap />
      <div className="overview-divider" />
      <Legend />
    </div>
  );
}
