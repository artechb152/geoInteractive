import { useSim } from "@/lib/store";
import { CAMERA_VIEWS } from "@/lib/scenario";

export function CameraCaption() {
  const cameraMode = useSim((s) => s.cameraMode);
  const selectedRoute = useSim((s) => s.selectedRoute);
  const v = CAMERA_VIEWS[cameraMode];

  const teach =
    cameraMode === "route" && !selectedRoute
      ? "בחר ציר כדי למסגר אותו בתלת-ממד."
      : v.teach;

  return (
    <div key={cameraMode} className="cam-caption">
      <span className="cam-caption-icon" aria-hidden="true">
        {v.icon}
      </span>
      <span className="cam-caption-title">{v.label}</span>
      <span className="cam-caption-sep" />
      <span className="cam-caption-teach">{teach}</span>
    </div>
  );
}
