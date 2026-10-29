# Navigation replay — "מתי עוצרים לבדוק?" (lesson 6, tips part, screen 2)

Technical spec, 2026-10-29. Brief: `output/navigation-replay-handoff-2026-10-29/CLAUDE_PROMPT.txt`
(user-supplied, not committed). Approved reference: `design/mockups/navigation-replay-2026-10-29/navigation-replay-mockup.png`
(moment 4 before a choice).

## Scope

Replaces only the second screen of `PlanningTipsScene` ("במהלך הניווט: מה צריך לבדוק?", the NAV_TIPS
accordion). The planning screen, the application question, the conclusion card, the scene order and the
lesson shell stay as they are. No new TOC entry, no new PagedLearn step.

Observable objective: the learner identifies when information from the field calls for a position and
direction check, and explains the decision from the plan and the information available.

## One geography

`navTipsGeometry.ts` (extracted from `NavTipsMap.tsx`, unchanged values): map units (100 × 75, 25 m/unit,
north up), `TIP_LEGS` 500/550/600/500 m, the route points (נ.ה, 1 stream bend, 2 saddle, 3 dirt-road
crossing, נ.ס), the ridge axis and its two summits, the stream and road paths. The planning screen's map
keeps drawing from it, pixel-identical.

`navigation-replay/` builds on that module only:

| module | role |
|---|---|
| `replayWorld.ts` | map units ↔ metres ↔ three.js world (X east, Z south, Y up); bearings; polyline distances |
| `replayTerrain.ts` | the height field `heightAt(x, z)` (designed stream valley, two summits + saddle, road valley, a low spur NW of the saddle, broad hills to the horizon) + `microRelief` (≤ 1.2 m visual detail); surface masks (road, stream bed, limestone, grass) |
| `replayContours.ts` | marching squares over `heightAt` → the map's contour lines (10 m, index 50 m) |
| `replayScenario.ts` | the four moments: estimate vs. truth, last identified point, story and field data, initial view, decisions, evidence options, feedback copy |
| `replayState.ts` | reducer / state machine |
| `ReplayMap.tsx` | SVG planning map (contours from the field, stream, road, cover, plan, last fix, estimates) |
| `ReplayView3D.tsx` + `replayScene/*` | live R3F view from the station |
| `ReplayFallback.tsx` | photographed stills of the same model and stations (no WebGL / failed asset / lost context) |
| `NavigationReplayActivity.tsx` | the card: header, panels, info, timeline, decision area |

Known vs. true, kept apart in the model and the UI:
`truePos` (simulation only — 3D camera; map shows it only in a debrief), `lastFix` (last identified
point), `estimate` (dead-reckoned progress, always labelled "אומדן"), `plan` (route), `available`
(story + field data shown to the learner). Distances on the map and in the copy are computed from the
same geometry; the walked-distance estimate is a fixed scenario value and never depends on the camera.

## The four moments

| # | label | station (truth) | estimate shown | kind | expected |
|---|---|---|---|---|---|
| 1 | יציאה | stream bend (P1) | at P1 | guided: verify place + next-leg direction, one action starts moving | — |
| 2 | בדרך לאוכף | P1 → P2 at 0.45 (~250 m) | ~250 m from P1 | decision + evidence | continue (check also fine: explain what was verified, go on) |
| 3 | באוכף | P2 | ~550 m from P1 | decision + evidence | check (planned verification point; matching data still verified here) |
| 4 | אחרי האוכף | P2 + 600 m on 342° (plan 322°), down the gully east of the spur | ~600 m from P2 = planned road crossing | decision + reason | check (expected road missing; not proof of where we drifted) |

Moment 4 fairness: the dirt road is ~170 m from the true station at its nearest and no stretch of it
within 1.2 km is in line of sight (the spur hides it; tested over the height field), so its absence is
not a framing, bush or loading artefact. The debrief reveals the true track and explains that a missing sign is a reason to check, not
proof of a specific error; it does not prescribe an automatic return.

## State machine (per moment, answers kept separately)

`viewing → (decide) → evidence → feedback → done` for decision moments, `viewing → done` for the guided
opening. Global: `{ active, moments: Record<id, MomentState> }`. Actions: `goto(id)`, `next`, `prev`,
`decide(choice)`, `answerEvidence(option)`, `retry`, `complete`, `reset`. Viewing a later moment never
marks earlier ones done; a debrief only renders for a moment in `feedback`/`done`; camera state lives in
the view store, never in the reducer.

## Measured (2026-10-29, headless Chrome, ANGLE D3D11, NVIDIA RTX A5000)

- Per station: ~0.70 M terrain triangles; ~3.1 k leaf-card shrubs + ~21 k far billboards, ~3 k cushions,
  ~4.5–7.3 k grass tufts, ~3.3–10 k stones/cobbles, ~14 k rocks.
- First view ready ≈ 4–5 s after load (assets + grids); a station change ≈ 2–4 s (≈ 0.3 s once prefetched).
- Turning continuously (vsync off): 150–208 fps, p95 frame 9–12 ms, at DPR 1 and 1.5.
- Screen height 1027 reference px in every state (fits 1440 × 1122; see assumptions.md for 1920 × 910).

## Rendering budget (desktop)

- Camera-centred polar terrain mesh, rebuilt per station (~0.35 M vertices, 0.3 m → 16 km), CPU heights from
  nested grids (2 m / 8 m / 140 m) + analytic micro-relief; earth curvature at the horizon.
- Terrain material: MeshStandardMaterial + `onBeforeCompile` splat of 4 CC0 photo layers (dry grass,
  stony soil, limestone, gravel) with normal + roughness, height-blended, anti-tiled, distance-faded.
- Instanced: leaf-card shrubs near (< 240 m), billboard shrubs to 1.5 km, grass tufts (< 30 m), cushions,
  scanned rocks, stones and stream cobbles; deterministic scatter (hash grid), never re-randomised per station.
- Sun + hemisphere light, one 3072² shadow map (±165 m) drawn once per station, exponential haze, Neutral
  tone mapping.
- `frameloop="demand"`, DPR ≤ 1.5, paused off-screen. Target 45–60 fps while looking around.
- `next/dynamic` + `ssr:false`; `ModelLoading` covers the lazy chunk and assets until the first frame.

## Assets

`public/assets/lessons/topic06/navigation-replay/` — Poly Haven CC0 (ATTRIBUTIONS.md), built by
`scripts/assets/build-navigation-replay-assets.mjs` + `scripts/blender/build_navigation_replay_models.py`;
fallback stills by `scripts/qa/capture-navigation-replay-fallback.mjs`. All paths honour
`NEXT_PUBLIC_BASE_PATH`; nothing is fetched from the network at runtime.
