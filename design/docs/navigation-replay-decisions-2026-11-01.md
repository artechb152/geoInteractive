# „במהלך הניווט: מה צריך לבדוק?” — from a replay to a decision exercise (2026-11-01)

Lesson 6, „דגשים לתכנון ולניווט”, screen 2 (`#scene-tips`, `[data-tips-screen="nav"]`). Replaces the four fixed moments of the navigation replay (`navigation-replay-spec-2026-10-29.md`, `navigation-replay-integration-2026-11-01.md`), where decisions mostly produced text and the moment-4 drift happened regardless of them.

## What the learner does

1. **Opening (guided).** At the stream crossing — the known start — a check is done with full help: click the saddle in the view (a pointer marks it), find it on the map (it pulses), then the stream channel underfoot. Two crossing loci fix the position; only then can the walk start.
2. **At every stop, one question:** „ממשיכים, או עוצרים לבדיקה?” with three short lines — **צפוי** (from the plan, relative to the last identified point), **נתון** (the distance counted since it), and either **אירוע** (what happened on the way) or **מה השתנה** (what moved on the map since the last stop).
3. **Continue** walks the next fixed segment in the 3D view (ground level, accelerated, skippable) while the map's estimate moves along the plan by the same counted distance and its uncertainty ring widens.
4. **Check** opens a three-step task: a sign in the view → the same sign on the map → the counted distance (or a second sign). „קביעת מיקום” evaluates whatever was gathered: one locus is a partial check (the position stays an estimate, the locus stays drawn); two that cross fix the position. The fix becomes the new identified point; if it is far from the estimate (> 25 m) it is reported as a deviation and the next leg is redrawn from it.
5. **Debrief („תחקיר”)** after the crossing: the map shows the way really walked and, at each stop, the true position against the estimate; a panel lists every stop — the decision, the evidence relied on, the result — with the metres walked against the plan, the fixes made, and where the woodland drift was found. Two or three principles are chosen from what happened.

Past stops can be reviewed (read-only). „התחלה מחדש” / „ניסיון בדרך אחרת” start over.

## Model

| Module | Role |
|---|---|
| `replayRoute.ts` | Ground truth: stops (`STOP_AT`), every walkable segment (`SEGMENTS`), the woodland weave, signs and what each stop sees, the three 3D worlds. |
| `replayCheck.ts` | Loci from evidence, their crossings, the verdict; recognising a sign from a click in the view (ground hit, crown hit, or aimed direction) and on the map. |
| `replayRun.ts` | The reducer: what is known (fix, counted, plan, estimate, uncertainty, target) apart from what happened (visits with truth, decisions, checks, fixes); next-stop rules; the debrief numbers. |
| `replayScenario.ts` | All words: per-stop texts, help level and hints, check feedback, verdicts, debrief lines. |
| `replayWalk.ts` | Walk store for any segment (arc length, smooth heading, skip, cancel). |
| `replayPreparation.ts` | Three worlds: `start` (light, first frame), `legA`, `legB` (all branches), one shared scatter clearance. |
| `ReplayMarkers.tsx` | The scene's picker (ray-march over the world's own terrain + crown spheres) and the in-view labels. |

### Next-stop rules

```
stream ─(fix required)→ enroute → saddle → woods ─┬─ fixed here → crossing → end
                                                  └─ not fixed → road ─┬─ fixed → crossing (along the road)
                                                                       └─ not fixed → beyond ─(fix required)→ crossing
```

### Why this drift

The planned leg B crosses the W-north woodland for ~230 m. Weaving between oaks and leaving downhill is a classic, believable loss of line; the dirt road running east–west across the valley is a catching feature that tells the navigator *that* they reached the road but not *where* on it. The learner's choices only change how soon the deviation is measured (≈ 50 → 110 m) and how many extra metres it costs (≈ 30 → 120 m).

## Not changed

The map's geography (contours, maquis, road, stream from the shared lab ground), the eye height and the no-view-from-above rule, the loading rule (`ModelLoading` until the first frame), the no-WebGL fallback (now four stills per stop, chosen-from-list signs), the lesson's other screens.

## Verification

Model: `navigation-replay.test.mjs`, `navigation-replay-walk.test.mjs`, `navigation-replay-shared-world.test.mjs`. Browser: `navigation-replay.e2e.test.mjs` (real clicks in the 3D view through the canvas camera and on the SVG map; checked path, drift path with the limited walk, partial check, wrong picks, keyboard path, review, reset, reduced motion, fit at 1440 × 1122 and 1920 × 910).
