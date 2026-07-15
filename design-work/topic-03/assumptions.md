# Assumptions — Topic 03 redesign

Documented per project rule: "if a visual detail is uncertain, write the assumption down and continue — don't silently guess." Each item will be checked against the actual reference-image pixels during the screenshot/compare loop for that scene and corrected if wrong.

1. **HookScene H1 second line color.** Mockup appears to show both H1 lines in the same dark-olive ink (no orange gradient on line 2), while current code uses `gradient-text text-accent` on line 2. Assumption: match the mockup (both lines same ink color) since "prioritize visual fidelity" overrides the pre-existing gradient treatment. If this reads wrong on screenshot compare, will revert.

2. **HookScene text alignment.** Mockup reads right-aligned (not centered) for H1/sub/CTA. Assumption: switch to right-aligned column, CTA left-aligned under text (not centered) to match. Copy/CTA behavior unchanged.

3. **SceneHeader eyebrow color per scene.** Onboarding's eyebrow reads as muted/gray; Principles/Planning read as orange tracked-caps; CombatNav reads as a plainer dark label. Assumption: implement a local topic-03 header with an optional `eyebrowTone` (muted default, orange variant) rather than forcing one universal style, so each scene can match its own mockup. Will confirm exact tone per scene against screenshots.

4. **PlanningScene top concept illustration.** The mockup shows a small illustrated A→B route-comparison graphic (direct vs protected path + legend box) above/beside the "Route Story" concept-strip text, separate from the main interactive `RouteStoryBuilder` map further down. Scoping decision: add a compact decorative SVG glyph in that strip (not a second full interactive map) to avoid inventing new interactive surface area not requested in the interaction-preservation rules. If the delta reads as too sparse after the first screenshot, will revisit with the user rather than silently expanding scope.

5. **PlanningScene checkpoint row text split.** Each `CHECKPOINTS[i].feature` is one continuous string starting with "אזימוט Xdeg (...), כ-Y מ' (±50): [description]". Mockup shows azimuth+distance visually distinct from the description. Assumption: this is a pure CSS/typography treatment (e.g. bold the leading clause via a light regex/split on the first colon, or wrap the existing string as-is in two visual weights) — not a data change. Exact wording, values, and order stay byte-identical; only presentation may bold/separate the leading segment.

6. **CombatNavScene "דוגמה נוכחית" board callout.** Assumption: this maps to the existing `METHODS[].example` field already rendered in the accordion body under a "דוגמה" heading — the mockup's boxed/highlighted treatment is a styling enhancement of that existing block, not new content, and does not need to be duplicated onto the board itself.

7. **CombatNavScene collapsed-row mini-icons.** Assumption: adding a small decorative icon preview to collapsed accordion rows (methods 2–3) is safe supplementary styling since it doesn't change data, order, or the single-open-at-a-time mechanic.

8. **Exact px/rem spacing values.** Where the mockup doesn't allow exact pixel measurement (compressed reference PNGs), spacing decisions default to the closest existing Tailwind scale step already used by sibling scenes in this codebase, not arbitrary new values.
