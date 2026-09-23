import { TACTICAL } from "@/lib/style";

type Variant = "dot" | "diamond" | "box" | "line" | "dash";

const ITEMS: { variant: Variant; color: string; label: string }[] = [
  { variant: "dot", color: TACTICAL.friendly, label: "כוח ידידותי" },
  { variant: "diamond", color: TACTICAL.enemy, label: "כוח אויב" },
  { variant: "diamond", color: TACTICAL.objective, label: "יעד" },
  { variant: "box", color: TACTICAL.observation, label: "תצפית" },
  { variant: "box", color: TACTICAL.danger, label: "אזור סיכון" },
  { variant: "line", color: TACTICAL.neutral, label: "ציר" },
  { variant: "dash", color: TACTICAL.losFriendly, label: "קו ראייה ידידותי" },
  { variant: "dash", color: TACTICAL.losEnemy, label: "קו ראייה אויב" },
];

export function Legend() {
  return (
    <>
      <div className="intel-label">מקרא</div>
      <div className="legend-grid">
        {ITEMS.map((item) => {
          const filled =
            item.variant === "dot" ||
            item.variant === "diamond" ||
            item.variant === "box";
          return (
            <div key={item.label} className="legend-item">
              <span
                className={"legend-swatch " + item.variant}
                style={
                  filled
                    ? { background: item.color, color: item.color }
                    : { color: item.color }
                }
              />
              <span className="legend-label">{item.label}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
