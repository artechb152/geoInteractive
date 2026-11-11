# Prepared walking — production evidence

- `01-walking-to-enroute.png`: first forward transition at 1440×1122.
- `02-walking-to-saddle.png`: mid-route ground-level movement; source reading stays until arrival and the dashed estimate follows the eye.
- `03-arrived-saddle.png`: arrived decision, restored controls and keyboard focus.
- `04-1920-walking.png`: complete walking screen, status and Skip within 1920×910.
- `motion-report.json`: animation-frame intervals and sampled eye/ground positions from the first prepared transition. Final run: median16.7ms, p95 33.3ms (Chrome headless, ANGLE D3D11, DPR1). The three CPU worlds are bounded; a separate browser regression checks released GPU terrain allocations on revisits.

Verification: 63/63 model tests; 30/30 browser tests against the static production export; production build with type checking and 51 exported pages. Original state, decision, keyboard, reduced-motion, failure/fallback and fit regressions are included.
