# "באיזה אזור אתם נמצאים?" — logic findings (task 30, 2026-10-26)

Found while reworking the decision row and the feedback of `LocationCheckActivity.tsx` (lesson 6, עקרונות הניווט). Task 30 was not allowed to change the state machine, the scenario, the geometry or the map, so these findings are written down here and not fixed in those files. Each one says whether the display now works around it.

## 1. A check with no area makes the next choice "stale"

- **Where:** `locationCheckState.ts`, `reducer` `'check'` and `view()`.
- **What:** "בדקו את הבחירה" with no area stores an attempt whose input is `{ candidateId: null }`. Choosing an area afterwards differs from that input, so `view()` reports `stale: true`.
- **Effect before task 30:** the feedback said "הבחירה השתנתה — בדקו שוב" although no area had ever been checked.
- **Now:** `feedbackOf()` in the activity treats a stale attempt whose result was `missing` as no attempt. The panel says "אזור N נבחר — עדיין לא נבדק", and `data-feedback="pending"`, not `stale`. `view()` is unchanged, so any other consumer of `stale` still sees the quirk.
- **Possible fix in the state module (not made):** don't store an attempt for a `missing` check, or make `view()` ignore one.

## 2. The field distance is not visible before the check

- **Where:** the activity as a whole. The measurement boxes were removed in `ac39b93` ("strip extra controls").
- **What:** the instruction says "השוו את הכיוון והמרחק במפה למדידות מהשטח". The field bearing (043°) is on the observation's heading tape. The paced distance (about 300 m, accepted range 260–340 m) appears nowhere until after a check, when the map draws the band and the feedback lists it.
- **Effect:** before checking, the learner can compare the bearing but not the distance. The decision doesn't depend on it, because both areas are 300 m from the last known position (finding 3), but the instruction promises a comparison the screen doesn't support.
- **Now:** after a check, the feedback puts the map value beside the field value for both measurements, with the tolerance. Before a check, nothing was added: re-adding the measurement was outside this task, which concerns the result area, and it would reverse a deliberate removal.
- **Options (owner's call):** (a) show the distance next to the bearing as part of the observation; (b) word the instruction as "השוו את הכיוון במפה לכיוון שנמדד בשטח"; (c) leave it as is and accept that the distance is learned from the feedback.

## 3. The distance can never decide, and the distance-failure branches are unreachable

- **Where:** `locationCheckScenario.ts`. LAST_KNOWN (650, 120) to area 1 (650, 420) and to area 2 (890, 300) is exactly 300 m in both cases.
- **What:** this is intended (brief §8: "המרחק מתאים לשני האזורים. הוא מצמצם את האפשרויות, אך אינו מכריע ביניהן"). With these data, `distance.consistent` is always `true` and `fitsCandidates` is always 2. The feedback texts for "the distance does not fit" never show.
- **Effect:** none for learners. The activity's QA can't reach those texts through the UI, only by calling `verdictOf` with a crafted evaluation.

## 4. Success reveals an exact observer point

- **Where:** `LocationCheckMap.tsx`, `ObserverReveal`.
- **What:** after a successful check, the map marks "מיקום הצופה" at the centre of area 1 and draws the field of view. The evidence supports the area: a bearing within ±5° and a distance within 260–340 m. It doesn't support a point.
- **Effect:** the map claims more certainty than the feedback, which now says "אזור 1 מתאים לשתי המדידות … במצב אמיתי ממשיכים לבדוק את ההתאמה לאורך הדרך".
- **Possible change (map owner):** label the mark "מיקום הצופה בתרגיל", or draw it only as the area's highlighted halo.

## 5. `scripts/qa/shot-location-check.mjs` is stale

- It still drives controls that `ac39b93` removed: "הראו את התפצלות הדרך", the GPS help dialog, and `[data-measurements]`. It fails on those regardless of task 30.
- Task 30 also changed texts that it matches:
  - the success title is now "אזור 1 מתאים לשתי המדידות", not "אזור 1 מתאים למדידות";
  - the "פירוט הבדיקה" popover is gone;
  - the opening text has changed.
- The task-30 checks were run from a separate script; see the task-30 entry in `assumptions.md`.

## Update — 2026-10-27, user-approved field readings

Finding 2 is resolved in the live activity: the user explicitly chose to show the measured distance before the answer. LocationCheckActivity now renders the observed bearing and about 300 m from READINGS above the two views. Both map candidates still deliberately share the distance; the direction distinguishes them. Other findings remain as described above.

## Update — 2026-10-27, task 30 follow-up

- **Finding 1 — fixed in the state module.** `view()` now reports `stale` only for a verdict whose area changed since; a check made with no area judged nothing, so the area chosen next is a first choice (`stale: false`, no result). The screen's behaviour is unchanged: `feedbackOf()` already showed "אזור N נבחר — עדיין לא נבדק" there. Unit test: "a check with no area makes the next choice a first choice, not a change".
- **Finding 4 — fixed in the map.** After success the mark is named "נקודת התצפית בתרחיש": OBSERVER is the point the 3D observation is rendered from (`observerEye()`), so the name is literal. It is not presented as a result. The map key after success separates "אזור שמתאים לשתי המדידות" (the chosen halo) from "נקודת התצפית בתרחיש (להמחשה)", and the success line adds "המדידות תומכות באזור, לא בנקודה מדויקת בתוכו." The field-of-view wedge stays, so the view can be read on the map. The label moved below-left of the halo, west of the arrow from the last known position.
- **Finding 5 — fixed.** `scripts/qa/shot-location-check.mjs` was rewritten for the current activity. It merges the task-30 state checks (formerly a scratch script) with the old checks that still apply: registration, map clicks, road contrast at the road-split look, loading, navigation, reduced motion, no WebGL and `--capture-fallback`. It adds the field readings and the scenario viewpoint. Registration is now measured in the canvas's layout px: under the laptop fit the canvas measures its untransformed size.
- Findings 2 (resolved 2026-10-27) and 3 (by design) are unchanged.
