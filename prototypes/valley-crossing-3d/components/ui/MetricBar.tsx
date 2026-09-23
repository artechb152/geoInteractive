import type { RouteMetrics } from "@/lib/types";

type Polarity = "good" | "risk";

function band(value: number, polarity: Polarity): string {
  if (polarity === "good") {
    return value >= 70 ? "good" : value >= 40 ? "mid" : "bad";
  }
  // risk metrics: high values are bad
  return value >= 70 ? "bad" : value >= 40 ? "mid" : "good";
}

export function MetricBar({
  label,
  value,
  polarity,
}: {
  label: string;
  value: number;
  polarity: Polarity;
}) {
  return (
    <div className="metric">
      <div className="metric-head">
        <span className="metric-label">{label}</span>
        <span className={"metric-val " + band(value, polarity)}>{value}</span>
      </div>
      <div className="metric-bar">
        <span
          className={"metric-fill " + band(value, polarity)}
          style={{ width: value + "%" }}
        />
      </div>
    </div>
  );
}

/** The five core tactical metrics for a route. */
export function RouteMetricsList({ metrics }: { metrics: RouteMetrics }) {
  return (
    <div className="metrics">
      <MetricBar label="תצפית" value={metrics.visibility} polarity="good" />
      <MetricBar label="חשיפה" value={metrics.exposure} polarity="risk" />
      <MetricBar label="מהירות" value={metrics.speed} polarity="good" />
      <MetricBar
        label="יתרון טקטי"
        value={metrics.advantage}
        polarity="good"
      />
      <MetricBar
        label="סיכון בצוואר בקבוק"
        value={metrics.chokeRisk}
        polarity="risk"
      />
    </div>
  );
}
