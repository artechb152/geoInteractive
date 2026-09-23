// Shared display helpers so risk/score thresholds and class mappings live in
// exactly one place (consumed by the analysis panel, route cards and debrief).

// Matches the Hebrew risk values: גבוה (high), בינוני-נמוך (medium-low),
// בינוני (medium), נמוך (low). "בינוני-נמוך" contains "נמוך" so it maps to low.
export function riskClass(risk: string): string {
  if (risk.includes("גבוה")) return "risk-high";
  if (risk.includes("נמוך")) return "risk-low";
  return "risk-med";
}

export type ScoreBand = "good" | "mid" | "bad";

export function scoreBand(score: number): ScoreBand {
  return score >= 80 ? "good" : score >= 60 ? "mid" : "bad";
}

const BAND_COLOR: Record<ScoreBand, string> = {
  good: "var(--good)",
  mid: "var(--warn)",
  bad: "var(--enemy)",
};

export function scoreColor(score: number): string {
  return BAND_COLOR[scoreBand(score)];
}
