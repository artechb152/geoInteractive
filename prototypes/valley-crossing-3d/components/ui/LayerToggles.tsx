import { useSim } from "@/lib/store";
import type { LayerState } from "@/lib/types";

const LAYERS: { k: keyof LayerState; label: string; full: string }[] = [
  { k: "lineOfSight", label: "קווי ראייה", full: "קווי ראייה" },
  { k: "dangerZones", label: "אזורי סיכון", full: "אזורי סיכון" },
  { k: "routes", label: "צירים", full: "צירים" },
  { k: "labels", label: "תוויות", full: "תוויות" },
  { k: "unitMarkers", label: "כוחות", full: "סימוני כוחות" },
];

export function LayerToggles() {
  const layers = useSim((s) => s.layers);
  const toggle = useSim((s) => s.toggleLayer);

  return (
    <div className="layer-chips">
      {LAYERS.map((l) => (
        <button
          key={l.k}
          className={"layer-chip" + (layers[l.k] ? " on" : "")}
          onClick={() => toggle(l.k)}
          aria-pressed={layers[l.k]}
          aria-label={`הצג/הסתר שכבת ${l.full}`}
          title={`הצג/הסתר שכבת ${l.full}`}
        >
          <span className="chip-dot" aria-hidden="true" />
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}
