# CombatNavScene comparison notes

Reference: `design-references/topic-03/scene-combatnav.png`
Current: `screenshots/combatnav-current.png`

## Round 1
- Confirmed the accordion already had a working rotating chevron (my design-spec assumption that it was missing was wrong on inspection — no change needed there).
- Restyled the "דוגמה" block inside the accordion panel into a highlighted `bg-bg-accent` box with a small spark icon, matching the mockup's boxed callout treatment. Heading text kept as exactly "דוגמה" (the mockup's "דוגמה נוכחית" wording does not exist in the code and was not adopted, per the rule that code text is authoritative).
- Restyled the legend from a plain list into a bordered/tinted box, closer to the mockup's compact legend box (kept in its existing position under the caption rather than absolutely overlaid on the map, to avoid new overlap/clipping risk at smaller widths — documented as a scoping choice).
- **Bug found and fixed (pre-existing, not introduced by this pass)**: `HandrailVisual`'s base terrain rect used `className="fill-terrain-sand/8"` — Tailwind's class scanner was not generating this single low-opacity utility (verified: `/10`, `/12`, `/60` on the same color in the same file compile fine; `/8` did not, confirmed via compiled CSS inspection and a from-scratch dev-server rebuild, so it isn't a stale-cache artifact). With no fill rule applied, the SVG fell back to the spec default fill (black), turning the entire diagram board solid black — a severe fidelity break versus the mockup's cream terrain paper. Fixed by changing `/8` → `/10` (negligible opacity difference, and a value already proven to compile in this exact file). This is the single highest-impact fix of this implementation pass.

- Same root cause found on two more spots after auditing every `*/N` (single-digit) opacity utility in this file and in `PlanningScene.tsx`: `bg-brand/5` (active accordion row tint, line ~131) and `to-brand/5` (board gradient wash, line ~243) in `CombatNavScene.tsx`, and `bg-accent/5` (`PacingDemo` result card) in `PlanningScene.tsx`. All three bumped to `/10` for the same reason — confirmed via compiled-CSS inspection that Tailwind's scanner silently drops single-digit opacity suffixes in this project's build, while two-digit ones compile fine. `RecapScene.tsx` has one more instance (`bg-accent/5`) that was **not** touched, since that file is explicitly locked out of scope for this task.

## Verified
- 3 METHODS data, `SUPPORT` legend content, single-open-accordion mechanic (`active`/`setActive`), and per-method diagram/caption/legend swap all untouched — only styling/markup changed.
- Board header, diagram, and caption still update together when switching methods.
