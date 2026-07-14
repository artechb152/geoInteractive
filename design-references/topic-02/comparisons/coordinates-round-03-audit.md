# Round 3 visual audit — CoordinatesScene

Screenshots: `coordinates-round-03-top.png` (resting state, re-verifies round-2 fixes on a
clean dev server), `coordinates-round-03-danger.png` (slider driven to shift=55 via a
real `input`/`change` event dispatch — not a static mockup of the state).

## Environment note
Round 2's screenshot attempt initially failed silently: running `npm run build` in the
same worktree while the dev server was still running had invalidated the dev server's
`.next` build manifest, so the client JS bundle 404'd, hydration never happened, and
clicking sub-topic tabs / reading `location.hash` on mount did nothing (page stayed on
the statically-rendered first scene). Diagnosed via `browser_console_messages`, fixed by
stopping the dev process, deleting `.next`, and restarting `npm run dev -- -p 3105`
before this round. Not a bug in `CoordinatesScene.tsx` — noted here in case another
agent hits the same symptom.

## Confirmed working — resting state (round-03-top)
- All round-2 fixes hold on a clean build: normal-case "Google Maps"/"Easting"/"Northing",
  correctly-ordered coordinate pairs, visible target-zone glow.

## Confirmed working — live interaction (round-03-danger, shift=55 via real onChange)
- `dangerLevel` correctly evaluates to `'danger'` (55 ≥ 40) and every element keyed off
  it updates together: big number "55" turns red (`text-status-danger`), the pill
  becomes solid red "✗ סטטוס: סטייה קריטית", and the right-hand callout box switches to
  the red border/tint with the real `consequenceText` for the 40–70 tier ("דו"צ! הירי
  נופל ישירות על כוחותינו בגלל טעות בשפת המפה.").
- `ImpactMap`'s `offsetX`/`offsetY` math is visibly reflected: the impact pin sits
  up-and-right of the target pin (matches `x: offsetX (+), y: -offsetY` unchanged),
  dashed displacement line drawn between them (only appears once `shift > 4`, as coded).
  SVG coordinate space is untouched by the page's `dir="rtl"` — diagram not mirrored.
- The 3-part slider tick row ("0 מ׳" / "50 מ׳ (טווח רסיסים)" / "100 מ׳ (החטאה מלאה)")
  fits the narrower column without collision at this viewport.
- This end-to-end check (dispatch a real `input`/`change` event on the native
  `<input type="range">`, not a simulated prop) confirms the `onChange={(e) =>
  setShift(Number(e.target.value))}` handler is byte-for-byte the original — only the
  surrounding visual layer changed.

## Outstanding, low-priority (acceptable, documented in the design spec's assumptions)
- No literal ITM/WGS84 axis-tick numbers on the `ImpactMap` grid (mockup shows some;
  not present in real component state/data, so not fabricated here).
- Scene is taller than the reference's single 1003px frame because all real copy is
  kept in full (mockup's placeholder copy was shorter in a few spots) — expected and
  intentional per the content-preservation rule.

No further fixes queued; treating desktop pass as complete after this 3rd round.
