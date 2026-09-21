# Topic-01 MDO Interaction Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In `src/components/lessons/topic-01/MDOScene.tsx` (the MDO ground-level interactive scene in Lesson 1): stabilize the summary area's height, fill the right-hand control column's unused middle space with a selection explainer, add multi-select (1–5) directly on the field-photo objects with a shape-hugging highlight, compose the explainer's content from existing domain/edge data only, confirm/keep the existing animated connection light restored, remove a default-focus-outline rectangle on connection-line clicks, and audit/document the live-background-video readiness — without changing any existing Hebrew copy, design tokens, or unrelated files.

**Architecture:** All functional changes live in one file, `src/components/lessons/topic-01/MDOScene.tsx`. It already renders a background photo (`MDOSceneBackdrop`, with an optional not-yet-produced video overlay), five independent per-domain object layers (`DOMAIN_VISUALS`, each with its own `box`/`anchor`/`avoidR`), an SVG overlay drawing the domain-pair connection curves (`MDO_EDGES`, `edgeControl`), and a fixed-width right control column (`MDOControlColumn`) with domain toggle switches and a Reset button. This plan adds one new piece of client state (`selectedObjects`, a `Set<MdoDomainId>` capped at the 5 domains, independent from the existing on/off `active` state and from the existing line-click `selectedEdgeId` state), wires it into the existing object-image layer (click-to-select, visual highlight, adjusted connector anchor), and adds one new small UI region inside the existing control column (a selection explainer, composed only from the existing `MDO_DOMAINS`/`MDO_EDGES` content fields already imported into this file). It also fixes the top summary's variable height and a missing focus-outline override on the connection hit-paths, and documents (without fabricating) the state of the not-yet-produced background video.
Content source of truth (unchanged by this plan): `src/components/lessons/topic-01/mdo-interaction-content.ts` — `MDO_DOMAINS[id].{label,contribution,missing}`, `MDO_EDGES[].{label,aToB,bToA}`, `MDO_COUNT_INTROS`, `MDO_FOUR_ACTIVE_BY_MISSING`.

**Tech Stack:** Next.js 15 / React 19, TypeScript, `framer-motion` (`motion.img`/`motion.g`/`motion.div`, `useReducedMotion`), inline SVG with `feMorphology`/`feFlood`/`feComposite`/`feMerge` filters, Tailwind CSS 3, `cn` from `@/lib/utils`. No unit-test framework in this repo (confirmed via `package.json`); verification here is `npx tsc --noEmit`, `npm run lint`, and `npm run build`, plus a written manual-QA checklist — **do not use Playwright or any browser-automation tool for this plan** (explicit user instruction — the user verifies visually themselves). `package.json` scripts available: `dev`, `build`, `lint`, `qa:svg`, `qa:rtl` (none of the `qa:*` scripts touch this component).

**Spec:** No separate written spec doc exists — the spec is the user's own request, reproduced in full below (Hebrew, verbatim) because every requirement in this plan traces back to one of its 7 numbered points.

> 1. מנע קפיצות בגובה: אזור הסיכום העליון צריך לשמור גובה יציב שמספיק לתוכן הקיים בכל המצבים. שינוי טקסט לא ידחוף את התמונה למטה. אין לחתוך טקסט או להקטין גופן.
> 2. נצל את הטור הימני: שמור את המתגים למעלה ואת האיפוס בתחתית. בשטח שביניהם הוסף אזור הסבר לבחירת ממדים. הטור והתמונה נשארים באותו גובה ובמעטפת אחידה, בלי כרטיסים מנותקים.
> 3. בחירה מרובה בתמונה: לחיצה על אובייקט פעיל בוחרת אותו; לחיצה נוספת מבטלת בחירה. אפשר לבחור 1–5 אובייקטים. הבחירה נפרדת מהמתגים שמפעילים ומכבים ממדים. הדגש נבחר באמצעות הגדלה עדינה של כ־4% וקו מתאר לבן דק סביב צורת האובייקט, לא סביב מלבן התמונה. שמור את נקודת המגע בקרקע והתאם את עוגני הקווים.
> 4. הסבר לבחירה: הצג באזור הימני התחתון את תרומת הממד היחיד, הקשר בין שני נבחרים, או הסבר משולב לשלושה ומעלה. לדוגמה: חלל+ים לעומת חלל+ים+סייבר. השתמש בתוכן הקיים; עבור קבוצות הרכב את התרומות והקשרים הרלוונטיים ללא המצאת יכולות או שינוי הניסוחים. הדגש את הקווים שבין הנבחרים. כשאין בחירה הצג הנחיה קצרה. כיבוי ממד מסיר אותו גם מהבחירה. איפוס מנקה בחירה ומפעיל הכול.
> 5. החזר את תנועת האור בקווים הכתומים: נקודות אור קטנות נעות בעדינות לאורך הקשרים הפעילים. הקו עצמו נשאר ברור ויציב. עצור תנועה מחוץ למסך וב־prefers-reduced-motion.
> 6. הסר את המלבן השחור בלחיצה על קו: בדוק את מקור המסגרת ותקן מקומית ברכיב הקשרים. החלף אותה בהדגשת הקו עצמו. אל תבטל נגישות פוקוס באופן גלובלי. שמור לחיצה לאורך כל הקו ואת חלונית הקשר הקיימת בשמאל־למטה; בחירת קו אינה משנה את הבחירה המרובה.
> 7. רקע חי: בדוק אם קיים וידאו אמיתי ומחובר. אם לא, הכן תמיכה בלולאה שקטה של גלים וצמחייה, מצלמה נעולה וללא כלי הממדים בתוך הווידאו. השתמש ברקע הסטטי כחלופה, הוסף עצירת תנועה וכבד reduced motion. אם אין לך כלי להפקה, הכן תמונת מקור נקייה ופרומפט מוכן ל-Google Flow, וציין בדיוק איזה קובץ חסר ואיפה לשמור אותו. אל תציג תמיכה בקוד כאילו הווידאו כבר הופק.

**Pre-flight audit (read before starting — saves re-deriving this):** the working tree's current, *uncommitted* `MDOScene.tsx` already implements a "ground-level scene" (background photo + independent per-domain object layers + SVG connection curves) that supersedes an older, already-committed "field diagram" version. Cross-checking that current file against the 7 points above:
- **Point 5 (animated light) appears to already be implemented** — `motionEnabled && bothActive && !dimmedBySelection` gates a small `<circle>` with `<animateMotion>` along each active edge's path, separate from the stable core/halo strokes, already respecting `inView` (`IntersectionObserver`) and `useReducedMotion()`. Task 4 below re-verifies this rather than re-implementing it, and folds in the one real code touch that region needs (multi-select line emphasis).
- **Point 7's code-side support (static fallback, motion-stop button, reduced-motion) also appears already implemented** in `MDOSceneBackdrop`, and a complete, already-well-formed Google-Flow prompt file already exists on disk at `public/assets/lessons/topic01/scene-mdo/mdo-scene-background-loop.prompt.txt`. Task 5 below audits and documents this rather than re-authoring it.
- **Points 1, 2, 3, 4, 6 are not yet implemented** (no fixed summary height, no explainer region, no click-to-select on objects, no focus-outline override on the edge hit-paths) — these are this plan's real net-new work, in Tasks 1–4.

## Global Constraints

- Single file for all functional changes: `src/components/lessons/topic-01/MDOScene.tsx`. Do not modify `src/components/lessons/topic-01/mdo-interaction-content.ts` or any other lesson content/copy file — every domain/edge string used anywhere in this plan already exists in that file today.
- **Zero invented or reworded Hebrew domain content.** The selection explainer (Task 4) may ONLY recombine existing `MDO_DOMAINS[id].{label,contribution}` and `MDO_EDGES[].{label,aToB,bToA}` fields, using connective phrasing already used elsewhere in this same file (e.g. `composeSummary`'s `` `מה הממד הפעיל תורם: ${label} — ${contribution}.` `` pattern, or `MDOEdgeCard`'s `` `תרומת ${aLabel} ל${bLabel}: ` `` pattern) — never a new sentence describing a capability the data doesn't state. The two short pieces of new UI microcopy this plan does add (the empty-selection prompt string, and the new select-button `aria-label`s) are UI chrome, not domain content, and are called out explicitly in Task 4 — do not treat them as a spec violation, but do not add any more new copy beyond those two spots.
- **No new color tokens.** Every new visual element reuses hex values already present in this file: accent orange `#D97E2B`, cream/white `#FDFBF3`. No Tailwind color utility beyond ones already used in this file (`text-fg`, `text-fg-muted`, `border-border-subtle`, `bg-bg-accent/60`, etc.).
- **RTL:** the field-photo SVG/overlay coordinate system (`FIELD_W`/`FIELD_H`, `box`/`anchor`, physical `left`/`top`/`x`/`y`) is an existing, already-documented exception to this project's logical-properties rule (see the comment directly above `MDOGroundScene`'s `return`) — new overlay markup in Tasks 3–4 follows that same existing exception and must **never** be mirrored. Any new markup OUTSIDE that photo-coordinate overlay (the control-column explainer text block in Task 4) must use this file's existing logical-property conventions (as `MDOEdgeCard`'s `insetInlineEnd`/`insetBlockEnd` and `DomainToggleRow`'s `ms-auto`/`me-auto` already do) — no new `left-`/`right-` literals there.
- **Multi-select (`selectedObjects`) is fully independent of both existing state trees:** the on/off toggles (`active`) and the line-click explanation card (`selectedEdgeId`). Selecting/deselecting an object must never change `active` or open/close `MDOEdgeCard`; clicking a connection line must never change `selectedObjects` (point 6's own text: "בחירת קו אינה משנה את הבחירה המרובה"). The one real coupling allowed, per spec point 4, is one-directional: turning a domain off removes it from `selectedObjects` (never the reverse), and Reset clears `selectedObjects` back to empty while turning every domain back on.
- **Never hand-edit `DOMAIN_VISUALS[].box/anchor/avoidR`** to achieve the selected-state highlight — the 4% scale and the adjusted connector anchor are both computed at render time (Task 3's `effectiveAnchor`/`domainPivot`), keeping the underlying data as the single source of truth for the unselected geometry.
- **Do not use Playwright, the Playwright MCP tools, or any other browser-automation tool anywhere in this plan** — explicit user instruction; the user verifies visually themselves. Every task's own verification step is `npx tsc --noEmit` / `npm run lint` / `npm run build` plus a written manual-check description, never a screenshot script.
- After each task that touches rendered UI, do **not** attempt a Playwright screenshot per this project's own `CLAUDE.md` verification loop — that default is explicitly overridden for this plan by the user's direct instruction above. Instead, end the task's report with a plain-language description of what to check manually at 1440px (this is what Task 6 compiles into one final checklist).
- Keep every existing accessibility affordance: `role="status" aria-live="polite"` announcements, the edge hit-paths' `tabIndex`/`role="button"`/`aria-expanded`/`aria-controls`/`aria-label`, `MDOEdgeCard`'s focus-trap/Escape/Tab handling, `DomainToggleRow`'s `role="switch"`/`aria-checked`. Point 6 forbids any *global* focus-outline removal (e.g. a blanket `*:focus { outline: none }` or a shared Tailwind reset) — the fix must be scoped to the one SVG hit-path element identified in Task 1.

---

## Task 1: Remove the default focus-outline rectangle on connection-line clicks

**Files:**
- Modify: `src/components/lessons/topic-01/MDOScene.tsx`

**Interfaces:**
- Consumes: nothing from other tasks — this is the first task and touches an isolated ~15-line region.
- Produces: nothing later tasks depend on (Task 4 touches a different part of the same `edges.map` rendering — the emphasize/opacity calculation for the *visible* paths — not this hit-path element).

- [ ] **Step 1: Confirm the root cause**

Open `src/components/lessons/topic-01/MDOScene.tsx` and find the invisible, focusable connection hit-path (inside `MDOGroundScene`, in the second `edges.map(({ edge, a, b, d }) => { ... })` block, right after the marker-rings block). It currently has `tabIndex={bothActive ? 0 : -1}` and `role="button"` but **no `outline`/focus styling of any kind** — every other focusable element in this file (`DomainToggleRow`'s switch, the Reset button, `MDOEdgeCard`'s close button) explicitly sets `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ...`; this one element is the one exception, so on focus (via click or Tab) the browser draws its own default UA focus outline — a rectangle following the SVG path's bounding box, which is the "black rectangle" the user is seeing. The existing `isFocused` state (already tracked via this same element's `onFocus`/`onBlur`) already drives a **visible** emphasis on the two *visible* stroke paths above it (`emphasize = isSelected || isFocused`, boosting `strokeWidth`) — so removing the UA outline here does not remove focus visibility, it removes a *redundant, mis-shaped* one.

- [ ] **Step 2: Suppress the outline locally on the hit-path only**

Find this exact block:

```tsx
              style={{ pointerEvents: bothActive ? 'stroke' : 'none', cursor: bothActive ? 'pointer' : undefined }}
```

Replace with:

```tsx
              style={{ pointerEvents: bothActive ? 'stroke' : 'none', cursor: bothActive ? 'pointer' : undefined, outline: 'none' }}
```

This is the only change for this task. It is scoped to this one `<path>` element's own inline style — no global CSS, no shared stylesheet rule, no other focusable element in the file is touched. The line-length click target, `MDOEdgeCard`'s existing bottom-start position, and the existing keyboard `Enter`/`Space` handling are all untouched.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (a one-line style-object addition; if this fails, the surrounding object literal's syntax was broken — check for a missing comma).

- [ ] **Step 4: Manual-check note for the final report**

Note in this task's report (do not attempt to execute this yourself — no Playwright): "Tab to a connection line (or click one) — the line itself should thicken/brighten (existing `isFocused`/`emphasize` behavior), and no black/dark rectangle should appear around the line's bounding box."

- [ ] **Step 5: Commit**

```bash
git add src/components/lessons/topic-01/MDOScene.tsx
git commit -m "fix(topic-01): remove default focus-outline rectangle on MDO connection lines"
```

---

## Task 2: Stabilize the summary area's height across all active-count states

**Files:**
- Modify: `src/components/lessons/topic-01/MDOScene.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing later tasks depend on (`MDOSummary` is not touched by any other task in this plan).

- [ ] **Step 1: Confirm the line-count range**

`composeSummary(active)` (already in the file, unchanged by this task) returns 1 line for `n===0` or `n===5`, 2 lines for `n===4`, and 3 lines for `n===1`, `n===2`, or `n===3` — so `MDOSummary` currently renders 1–3 `<p>` lines depending on how many domains are active, with no reserved space for the lines that aren't there, which is the height jump the user is seeing (the summary block sits in its own `border-b` region *above* the `[control column | image]` row, so its height changing pushes that whole row down).

- [ ] **Step 2: Pad the rendered lines to a constant slot count**

Find the `MDOSummary` function:

```tsx
function MDOSummary({ active }: { active: Set<MdoDomainId> }) {
  const { badge, lines } = useMemo(() => composeSummary(active), [active]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-display text-sm font-bold text-fg">{badge}</span>
        <span aria-hidden="true" className="flex gap-1.5">
          {MDO_DOMAIN_ORDER.map((id) => (
            <span key={id} className={cn('size-2 rounded-full', active.has(id) ? 'bg-accent' : 'bg-border')} />
          ))}
        </span>
      </div>
      <div className="mt-2 space-y-1.5 text-sm leading-relaxed text-fg-muted">
        {lines.map((line, i) => <p key={i}>{line}</p>)}
      </div>
    </div>
  );
}
```

Replace with:

```tsx
// The most lines composeSummary() ever returns (its 1/2/3-active branches);
// MDOSummary below always renders exactly this many <p> slots so the
// summary's own height never depends on `active` — see that component.
const SUMMARY_LINE_SLOTS = 3;

function MDOSummary({ active }: { active: Set<MdoDomainId> }) {
  const { badge, lines } = useMemo(() => composeSummary(active), [active]);
  // Padded to a constant slot count so this block's height stays fixed
  // across every active-count state, per the design brief: no truncation,
  // no font shrink, and the [control column | image] row below never gets
  // pushed down when the composed text gets shorter or longer. Unused
  // slots render a non-breaking space so their line-height is identical
  // to a real line, just invisible (and hidden from assistive tech).
  const paddedLines = [...lines, ...Array(SUMMARY_LINE_SLOTS - lines.length).fill(null)];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-display text-sm font-bold text-fg">{badge}</span>
        <span aria-hidden="true" className="flex gap-1.5">
          {MDO_DOMAIN_ORDER.map((id) => (
            <span key={id} className={cn('size-2 rounded-full', active.has(id) ? 'bg-accent' : 'bg-border')} />
          ))}
        </span>
      </div>
      <div className="mt-2 space-y-1.5 text-sm leading-relaxed text-fg-muted">
        {paddedLines.map((line, i) => (
          <p key={i} aria-hidden={line ? undefined : true} className={line ? undefined : 'invisible'}>
            {line ?? ' '}
          </p>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual-check note for the final report**

Note in this task's report: "Toggle domains on/off in every order (try landing on 0, 1, 2, 3, 4, and 5 active) — the summary block's own height, and the top edge of the image/control-column row beneath it, should never move, even though the composed sentence count visibly changes from 1 to 3 lines."

- [ ] **Step 5: Commit**

```bash
git add src/components/lessons/topic-01/MDOScene.tsx
git commit -m "fix(topic-01): reserve constant height for the MDO summary across all active-count states"
```

---

## Task 3: Multi-select on the field-photo objects (state, click affordance, shape-hugging highlight, adjusted connector anchors)

**Files:**
- Modify: `src/components/lessons/topic-01/MDOScene.tsx`

**Interfaces:**
- Consumes: nothing from Tasks 1–2 (disjoint regions of the same file; rebase cleanly on top of either).
- Produces (for Task 4 to consume):
  - New state in `MDOScene()`: `selectedObjects: Set<MdoDomainId>` and `toggleObjectSelection(id: MdoDomainId): void`, threaded into `<MDOGroundScene selectedObjects={selectedObjects} onToggleObject={toggleObjectSelection} ... />`. Task 4 also reads `selectedObjects` via a new `<MDOControlColumn selectedObjects={selectedObjects} ... />` prop this task does NOT add (Task 4 adds that one prop plug on the already-existing `MDOControlColumn` call).
  - `resetAll()` (existing function) updated to also `setSelectedObjects(new Set())`.
  - New module-level helpers `domainPivot(d: DomainVisual): [number, number]` and `effectiveAnchor(d: DomainVisual, isSelected: boolean): [number, number]`, and constant `SELECTED_SCALE = 1.04`. Task 4 does not need these directly (they're only used inside `MDOGroundScene`'s own edge/marker rendering, already wired by this task) but must not redefine or shadow them.
  - New SVG filter `id="mdoSelectionOutline"` inside the existing `<defs>` block. Task 4 does not use it.
  - The `edges` useMemo inside `MDOGroundScene` now also depends on `selectedObjects` (added to its dependency array) — Task 4's own edit to the same `edges.map` render block (for line emphasis) must keep reading `edge`/`a`/`b`/`d` exactly as this task leaves them; only the `emphasize` boolean calculation changes in Task 4.

- [ ] **Step 1: Add the pivot/anchor-adjustment helpers**

In `src/components/lessons/topic-01/MDOScene.tsx`, find:

```tsx
function byId(id: MdoDomainId) {
  return DOMAIN_VISUALS.find((d) => d.id === id)!;
}

function pct(value: number, total: number) {
  return `${(value / total) * 100}%`;
}
```

Replace with:

```tsx
function byId(id: MdoDomainId) {
  return DOMAIN_VISUALS.find((d) => d.id === id)!;
}

function pct(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

/** The scale a selected domain's own object image renders at (spec: "כ-4%
    הגדלה עדינה") — also drives how far its connector anchor moves in
    effectiveAnchor() below, so the two stay geometrically consistent. */
const SELECTED_SCALE = 1.04;

/** The point a domain's own image visually scales FROM when selected — the
    exact same point its `transformOrigin` CSS uses, so the object's own
    ground/water-contact line never shifts (spec: "שמור את נקודת המגע
    בקרקע"). Grounded/airborne domains pivot from their box's own
    bottom-center (their lowest visible pixel = the contact line); `space`
    is a genuinely separate circular inset with no ground contact, so it
    pivots from its own center instead. */
function domainPivot(d: DomainVisual): [number, number] {
  return d.standalone
    ? [d.box.x + d.box.width / 2, d.box.y + d.box.height / 2]
    : [d.box.x + d.box.width / 2, d.box.y + d.box.height];
}

/** A domain's own connector anchor, recomputed for the SAME 4% scale its
    image renders at around the SAME pivot as domainPivot() — so a
    connection curve keeps landing on the scaled object's visual hub
    instead of the pre-scale point (spec: "התאם את עוגני הקווים"). Returns
    the unmodified anchor when not selected. */
function effectiveAnchor(d: DomainVisual, isSelected: boolean): [number, number] {
  if (!isSelected) return d.anchor;
  const [px, py] = domainPivot(d);
  return [px + (d.anchor[0] - px) * SELECTED_SCALE, py + (d.anchor[1] - py) * SELECTED_SCALE];
}
```

- [ ] **Step 2: Add `selectedObjects` state, its toggle, and wire Reset**

Find:

```tsx
export function MDOScene() {
  const [active, setActive] = useState<Set<MdoDomainId>>(new Set(MDO_DOMAIN_ORDER));
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
```

Replace with:

```tsx
export function MDOScene() {
  const [active, setActive] = useState<Set<MdoDomainId>>(new Set(MDO_DOMAIN_ORDER));
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  // Multi-select on the field-photo objects themselves — fully independent
  // of `active` (on/off) and `selectedEdgeId` (line-click explanation
  // card); 0–5 members, driven by clicking an active object in the image.
  const [selectedObjects, setSelectedObjects] = useState<Set<MdoDomainId>>(new Set());
  const [announcement, setAnnouncement] = useState('');
```

Then find:

```tsx
  function selectEdge(id: string) {
    setSelectedEdgeId((prev) => (prev === id ? null : id));
  }
  function closeCard() {
    setSelectedEdgeId(null);
  }
  function resetAll() {
    suppressEdgeFocusRestoreRef.current = true;
    setActive(new Set(MDO_DOMAIN_ORDER));
    setSelectedEdgeId(null);
    setAnnouncement('כל הממדים חוברו מחדש');
  }
```

Replace with:

```tsx
  function selectEdge(id: string) {
    setSelectedEdgeId((prev) => (prev === id ? null : id));
  }
  function closeCard() {
    setSelectedEdgeId(null);
  }
  function toggleObjectSelection(id: MdoDomainId) {
    setSelectedObjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function resetAll() {
    suppressEdgeFocusRestoreRef.current = true;
    setActive(new Set(MDO_DOMAIN_ORDER));
    setSelectedEdgeId(null);
    setSelectedObjects(new Set());
    setAnnouncement('כל הממדים חוברו מחדש');
  }
```

- [ ] **Step 3: Drop a domain out of the selection when it's switched off**

Find the existing effect that auto-closes the edge card:

```tsx
  // A selected line's own explanation closes automatically the moment
  // either of its two domains is switched off — never left open pointing at
  // a connection that can no longer be drawn.
  useEffect(() => {
    if (!selectedEdgeId) return;
    const edge = MDO_EDGES.find((e) => e.id === selectedEdgeId);
    if (edge && (!active.has(edge.a) || !active.has(edge.b))) {
      suppressEdgeFocusRestoreRef.current = true;
      setSelectedEdgeId(null);
    }
  }, [active, selectedEdgeId]);
```

Immediately after it, add:

```tsx

  // Turning a domain off also drops it out of the multi-select (spec:
  // "כיבוי ממד מסיר אותו גם מהבחירה") — never the reverse; selecting an
  // object never changes `active`.
  useEffect(() => {
    setSelectedObjects((prev) => {
      const next = new Set([...prev].filter((id) => active.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [active]);
```

- [ ] **Step 4: Pass the new state/handler down to `MDOGroundScene`**

Find:

```tsx
          <MDOGroundScene
            active={active}
            selectedEdgeId={selectedEdgeId}
            motionOk={motionOk}
            onSelectEdge={selectEdge}
            onCloseCard={closeCard}
            suppressFocusRestoreRef={suppressEdgeFocusRestoreRef}
          />
```

Replace with:

```tsx
          <MDOGroundScene
            active={active}
            selectedEdgeId={selectedEdgeId}
            selectedObjects={selectedObjects}
            motionOk={motionOk}
            onSelectEdge={selectEdge}
            onToggleObject={toggleObjectSelection}
            onCloseCard={closeCard}
            suppressFocusRestoreRef={suppressEdgeFocusRestoreRef}
          />
```

- [ ] **Step 5: Extend `MDOGroundScene`'s props**

Find:

```tsx
function MDOGroundScene({
  active,
  selectedEdgeId,
  motionOk,
  onSelectEdge,
  onCloseCard,
  suppressFocusRestoreRef,
}: {
  active: Set<MdoDomainId>;
  selectedEdgeId: string | null;
  motionOk: boolean;
  onSelectEdge: (id: string) => void;
  onCloseCard: () => void;
  suppressFocusRestoreRef: React.MutableRefObject<boolean>;
}) {
```

Replace with:

```tsx
function MDOGroundScene({
  active,
  selectedEdgeId,
  selectedObjects,
  motionOk,
  onSelectEdge,
  onToggleObject,
  onCloseCard,
  suppressFocusRestoreRef,
}: {
  active: Set<MdoDomainId>;
  selectedEdgeId: string | null;
  selectedObjects: Set<MdoDomainId>;
  motionOk: boolean;
  onSelectEdge: (id: string) => void;
  onToggleObject: (id: MdoDomainId) => void;
  onCloseCard: () => void;
  suppressFocusRestoreRef: React.MutableRefObject<boolean>;
}) {
```

- [ ] **Step 6: Use the scaled anchor when building connection curves**

Find:

```tsx
  const edges = useMemo(
    () =>
      MDO_EDGES.map((edge) => {
        const a = byId(edge.a);
        const b = byId(edge.b);
        const avoid = [
          ...DOMAIN_VISUALS.filter((d) => d.id !== edge.a && d.id !== edge.b && active.has(d.id)).map((d) => ({ point: d.anchor, radius: d.avoidR })),
          CARD_OBSTACLE,
        ];
        const control = edgeControl(a.anchor, b.anchor, centroid, avoid);
        return { edge, a, b, d: edgePath(a.anchor, b.anchor, control), mid: quadPoint(a.anchor, control, b.anchor, 0.5) };
      }),
    [active, centroid],
  );
```

Replace with:

```tsx
  const edges = useMemo(
    () =>
      MDO_EDGES.map((edge) => {
        const a = byId(edge.a);
        const b = byId(edge.b);
        const aAnchor = effectiveAnchor(a, selectedObjects.has(a.id));
        const bAnchor = effectiveAnchor(b, selectedObjects.has(b.id));
        const avoid = [
          ...DOMAIN_VISUALS.filter((d) => d.id !== edge.a && d.id !== edge.b && active.has(d.id)).map((d) => ({ point: d.anchor, radius: d.avoidR })),
          CARD_OBSTACLE,
        ];
        const control = edgeControl(aAnchor, bAnchor, centroid, avoid);
        return { edge, a, b, d: edgePath(aAnchor, bAnchor, control), mid: quadPoint(aAnchor, control, bAnchor, 0.5) };
      }),
    [active, centroid, selectedObjects],
  );
```

- [ ] **Step 7: Add the alpha-shape outline filter**

Find (inside the `<svg>`'s `<defs>`):

```tsx
          <filter id="mdoContrailBlur" x="-40%" y="-150%" width="180%" height="400%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
```

Replace with:

```tsx
          <filter id="mdoContrailBlur" x="-40%" y="-150%" width="180%" height="400%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          {/* Thin white outline traced around a selected object's own
              alpha silhouette (dilate the PNG's real transparent-pixel
              edge, flood it white, keep only the dilated ring, then draw
              the original image back on top) — spec: "קו מתאר לבן דק סביב
              צורת האובייקט, לא סביב מלבן התמונה". Applied via CSS
              `filter: url(#mdoSelectionOutline)` on the object's own
              <img>, not inside this <svg>'s own render tree. */}
          <filter id="mdoSelectionOutline" x="-30%" y="-30%" width="160%" height="160%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="dilated" />
            <feFlood floodColor="#FDFBF3" result="outlineColor" />
            <feComposite in="outlineColor" in2="dilated" operator="in" result="outline" />
            <feMerge>
              <feMergeNode in="outline" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
```

- [ ] **Step 8: Scale + outline the four photographic object layers when selected**

Find:

```tsx
      {DOMAIN_VISUALS.filter((d) => !d.standalone).map((d) => (
        <motion.img
          key={d.id}
          src={d.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute"
          style={{
            left: pct(d.box.x, FIELD_W),
            top: pct(d.box.y, FIELD_H),
            width: pct(d.box.width, FIELD_W),
            height: pct(d.box.height, FIELD_H),
          }}
          initial={false}
          animate={{ opacity: active.has(d.id) ? 1 : 0 }}
          transition={{ duration: motionOk ? 0.3 : 0 }}
        />
      ))}
```

Replace with:

```tsx
      {DOMAIN_VISUALS.filter((d) => !d.standalone).map((d) => {
        const isSelected = selectedObjects.has(d.id);
        return (
          <motion.img
            key={d.id}
            src={d.src}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute"
            style={{
              left: pct(d.box.x, FIELD_W),
              top: pct(d.box.y, FIELD_H),
              width: pct(d.box.width, FIELD_W),
              height: pct(d.box.height, FIELD_H),
              // Bottom-center pivot = this object's own ground/water
              // contact line (see domainPivot()) — scaling up never
              // moves that point.
              transformOrigin: '50% 100%',
              filter: isSelected ? 'url(#mdoSelectionOutline)' : undefined,
            }}
            initial={false}
            animate={{ opacity: active.has(d.id) ? 1 : 0, scale: isSelected ? SELECTED_SCALE : 1 }}
            transition={{ duration: motionOk ? 0.3 : 0 }}
          />
        );
      })}
```

- [ ] **Step 9: Scale + emphasize the `space` circular inset when selected**

Find:

```tsx
      <motion.div
        className="pointer-events-none absolute overflow-hidden rounded-full shadow-elevated"
        style={{
          left: pct(byId('space').box.x, FIELD_W),
          top: pct(byId('space').box.y, FIELD_H),
          width: pct(byId('space').box.width, FIELD_W),
          height: pct(byId('space').box.height, FIELD_H),
          border: '4px solid #FDFBF3',
        }}
        initial={false}
        animate={{ opacity: active.has('space') ? 1 : 0 }}
        transition={{ duration: motionOk ? 0.3 : 0 }}
      >
        <img src={SPACE_SRC} alt="" aria-hidden="true" draggable={false} className="size-full object-cover" />
      </motion.div>
```

Replace with:

```tsx
      <motion.div
        className="pointer-events-none absolute overflow-hidden rounded-full shadow-elevated"
        style={{
          left: pct(byId('space').box.x, FIELD_W),
          top: pct(byId('space').box.y, FIELD_H),
          width: pct(byId('space').box.width, FIELD_W),
          height: pct(byId('space').box.height, FIELD_H),
          border: '4px solid #FDFBF3',
          // `space` is a masked circle, not a raster silhouette (see
          // domainPivot()'s comment) — feMorphology has no alpha edge to
          // trace here, so its "selected" outline is a second white ring
          // outside the existing border instead of the filter used above.
          boxShadow: selectedObjects.has('space') ? '0 0 0 3px #FDFBF3' : undefined,
          transformOrigin: '50% 50%',
        }}
        initial={false}
        animate={{ opacity: active.has('space') ? 1 : 0, scale: selectedObjects.has('space') ? SELECTED_SCALE : 1 }}
        transition={{ duration: motionOk ? 0.3 : 0 }}
      >
        <img src={SPACE_SRC} alt="" aria-hidden="true" draggable={false} className="size-full object-cover" />
      </motion.div>
```

- [ ] **Step 10: Add the click-to-select hit targets**

Find the marker-rings block's own closing (right before the "Real, accessible controls" comment):

```tsx
        {DOMAIN_VISUALS.map((d) => (
          <motion.g
            key={'marker-' + d.id}
            aria-hidden="true"
            initial={false}
            animate={{ opacity: active.has(d.id) ? 1 : 0 }}
            transition={{ duration: motionOk ? 0.3 : 0 }}
          >
            <circle cx={d.anchor[0]} cy={d.anchor[1]} r="24" fill="#D97E2B" opacity="0.16" filter="url(#mdoNodeGlow)" />
            <circle cx={d.anchor[0]} cy={d.anchor[1]} r="14" fill="none" stroke="#FDFBF3" strokeWidth="3.5" vectorEffect="non-scaling-stroke" opacity="0.4" />
            <circle cx={d.anchor[0]} cy={d.anchor[1]} r="14" fill="none" stroke="#D97E2B" strokeWidth="2.5" vectorEffect="non-scaling-stroke" opacity="0.9" />
            <circle cx={d.anchor[0]} cy={d.anchor[1]} r="5" fill="#D97E2B" />
          </motion.g>
        ))}
```

Replace with (also switches the marker ring itself onto the scaled anchor, so it stays visually attached to the selected object's new hub position):

```tsx
        {DOMAIN_VISUALS.map((d) => {
          const isSelected = selectedObjects.has(d.id);
          const [mcx, mcy] = effectiveAnchor(d, isSelected);
          return (
            <motion.g
              key={'marker-' + d.id}
              aria-hidden="true"
              initial={false}
              animate={{ opacity: active.has(d.id) ? 1 : 0 }}
              transition={{ duration: motionOk ? 0.3 : 0 }}
            >
              <circle cx={mcx} cy={mcy} r="24" fill="#D97E2B" opacity="0.16" filter="url(#mdoNodeGlow)" />
              <circle cx={mcx} cy={mcy} r="14" fill="none" stroke="#FDFBF3" strokeWidth="3.5" vectorEffect="non-scaling-stroke" opacity="0.4" />
              <circle cx={mcx} cy={mcy} r="14" fill="none" stroke="#D97E2B" strokeWidth="2.5" vectorEffect="non-scaling-stroke" opacity="0.9" />
              <circle cx={mcx} cy={mcy} r="5" fill="#D97E2B" />
            </motion.g>
          );
        })}

        {/* Multi-select hit targets — one per domain, transparent HTML
            buttons (not SVG, for free keyboard semantics matching the rest
            of this file's controls), rendered only while that domain is
            active (spec: click target only exists on an active object).
            Sit right after the markers in DOM order but are NOT inside
            this <svg> (see the sibling block just below it, after this
            svg's closing tag) — kept out of the SVG so pointer-events on
            an HTML <button> behave normally; they still receive clicks
            despite the decorative SVG painting on top of them, because
            this svg's own root is pointer-events-none except its
            explicitly-enabled descendants (the edge hit-paths). */}
```

- [ ] **Step 11: Render the select buttons as siblings of the `<svg>`**

Find the end of the `<svg>...</svg>` block followed by the edge-card render:

```tsx
      </svg>

      {selectedEdge && (
```

Replace with:

```tsx
      </svg>

      {DOMAIN_VISUALS.map((d) => {
        if (!active.has(d.id)) return null;
        const isSelected = selectedObjects.has(d.id);
        return (
          <button
            key={'select-' + d.id}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${isSelected ? 'ביטול בחירת' : 'בחירת'} ${d.label} להשוואה בין ממדים`}
            onClick={() => onToggleObject(d.id)}
            className="absolute rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            style={{
              left: pct(d.box.x, FIELD_W),
              top: pct(d.box.y, FIELD_H),
              width: pct(d.box.width, FIELD_W),
              height: pct(d.box.height, FIELD_H),
              background: 'transparent',
              cursor: 'pointer',
            }}
          />
        );
      })}

      {selectedEdge && (
```

- [ ] **Step 12: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. If `DomainVisual`/`MdoDomainId` type errors appear around `effectiveAnchor`/`domainPivot`, confirm the function signatures exactly match Step 1's code (both take a `DomainVisual`, not a raw `[number, number]`).

- [ ] **Step 13: Manual-check note for the final report**

Note in this task's report: "At 1440px, click each of the five objects on the image (land vehicle, aircraft, ship, satellite circle, comms mast) while its domain is on — it should grow slightly (~4%) with a thin white outline appearing around its own silhouette (not a rectangle around the whole image), and clicking it again should remove the highlight. Try selecting up to all 5 at once. Turn off a domain that's currently selected via its toggle switch — its highlight/selection should disappear. Click Reset — every selection should clear. None of this should open/close the existing bottom-left line-explanation card or change any toggle switch."

- [ ] **Step 14: Commit**

```bash
git add src/components/lessons/topic-01/MDOScene.tsx
git commit -m "feat(topic-01): add multi-select on MDO field-photo objects with shape-hugging highlight"
```

---

## Task 4: Selection explainer in the right column + line emphasis between selected objects

**Files:**
- Modify: `src/components/lessons/topic-01/MDOScene.tsx`

**Interfaces:**
- Consumes: Task 3's `selectedObjects: Set<MdoDomainId>` state in `MDOScene()`, and the fact that `MDOGroundScene` already threads `selectedObjects` through to its `edges` useMemo (this task only changes the `emphasize` boolean inside the existing `edges.map` render, and does not touch the `d`/`mid`/`a`/`b` values Task 3 already computed). Must be applied after Task 3 lands (same file, sequential — this task's diffs assume Task 3's props/state already exist).
- Produces: `composeSelectionExplainer(selected: Set<MdoDomainId>): { heading: string; lines: string[] }` and `<MDOSelectionExplainer selected={...} />`, both self-contained — no later task in this plan depends on them.

- [ ] **Step 1: Add the content composer**

In `src/components/lessons/topic-01/MDOScene.tsx`, find `composeSummary` and its closing brace (ends right before `export function MDOScene()`):

```tsx
  return { badge, lines: [MDO_COUNT_INTROS[String(n) as '1' | '2' | '3'], stillPossible, missing] };
}

export function MDOScene() {
```

Replace with (adds a new function between them, `composeSummary` itself unchanged):

```tsx
  return { badge, lines: [MDO_COUNT_INTROS[String(n) as '1' | '2' | '3'], stillPossible, missing] };
}

/** The right column's own selection-explainer content — composed ONLY from
    existing MDO_DOMAINS/MDO_EDGES fields (contribution / label / aToB /
    bToA), reusing the exact connective phrasing composeSummary() and
    MDOEdgeCard already use elsewhere in this file, never a new sentence
    describing a capability the data doesn't state. Independent of
    composeSummary(): this reads the object multi-select, not the on/off
    toggles. */
function composeSelectionExplainer(selected: Set<MdoDomainId>): { heading: string; lines: string[] } {
  const ids = MDO_DOMAIN_ORDER.filter((id) => selected.has(id));

  if (ids.length === 0) {
    return {
      heading: 'השוואת ממדים',
      lines: ['לחצו על אובייקט פעיל בתמונה כדי לבחור אותו ולהשוות בין ממדים.'],
    };
  }

  if (ids.length === 1) {
    const d = MDO_DOMAINS[ids[0]];
    return { heading: d.label, lines: [`מה הממד תורם: ${d.contribution}.`] };
  }

  if (ids.length === 2) {
    const edge = MDO_EDGES.find((e) => (e.a === ids[0] && e.b === ids[1]) || (e.a === ids[1] && e.b === ids[0]));
    if (!edge) return { heading: `${MDO_DOMAINS[ids[0]].label} + ${MDO_DOMAINS[ids[1]].label}`, lines: [] };
    const aLabel = MDO_DOMAINS[edge.a].label;
    const bLabel = MDO_DOMAINS[edge.b].label;
    return {
      heading: edge.label,
      lines: [`תרומת ${aLabel} ל${bLabel}: ${edge.aToB}`, `תרומת ${bLabel} ל${aLabel}: ${edge.bToA}`],
    };
  }

  // 3+ selected: compose each selected domain's own contribution plus the
  // labels of every edge whose BOTH ends are in the selection — the set of
  // relevant connections grows as more objects are added (spec's own
  // example: חלל+ים vs חלל+ים+סייבר), without repeating full aToB/bToA
  // prose for every pair (would overflow the 190px column at 4-5 picks).
  const contributions = ids.map((id) => `${MDO_DOMAINS[id].label} — ${MDO_DOMAINS[id].contribution}`).join('; ');
  const pairLabels = MDO_EDGES.filter((e) => selected.has(e.a) && selected.has(e.b)).map((e) => e.label);
  return {
    heading: ids.map((id) => MDO_DOMAINS[id].label).join(' + '),
    lines: [`מה כל ממד תורם: ${contributions}.`, ...(pairLabels.length ? [`קשרים ביניהם: ${pairLabels.join(', ')}.`] : [])],
  };
}

export function MDOScene() {
```

- [ ] **Step 2: Emphasize the connection lines between selected objects**

Find (inside the `edges.map(({ edge, d, mid }) => { ... })` block that renders the two `motion.path`s and the light dot):

```tsx
          const dimmedBySelection = selectedEdgeId != null && !touchesSelected;
          const emphasize = isSelected || isFocused;
```

Replace with:

```tsx
          const dimmedBySelection = selectedEdgeId != null && !touchesSelected;
          const inObjectSelection = selectedObjects.has(edge.a) && selectedObjects.has(edge.b);
          const emphasize = isSelected || isFocused || inObjectSelection;
```

This reuses the existing `emphasize` variable (already driving both visible paths' `strokeWidth`) — no other line in that block needs to change. The animated light dot's own gating condition (`motionEnabled && bothActive && !dimmedBySelection`) is untouched by this task; confirm in Step 5 below that it still fires correctly.

- [ ] **Step 3: Add the explainer component**

Find `MDOSummary` and the `RealWorldExamples` function that follows it — insert the new component between `MDOControlColumn` and `MDOSummary` (right after `MDOControlColumn`'s closing brace, before the `MDOSummary` doc comment):

```tsx
      <button
        type="button"
        onClick={onReset}
        className="mt-auto flex items-center justify-center gap-1.5 rounded-xl border border-border bg-bg-elevated px-3 py-2 text-sm font-display font-bold text-fg transition-colors hover:bg-bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <Icon name="refresh" size={15} />
        איפוס
      </button>
    </div>
  );
}

/** The summary: badge + at most 2–3 composed sentences.
```

Replace with:

```tsx
      <button
        type="button"
        onClick={onReset}
        className="mt-3 shrink-0 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-bg-elevated px-3 py-2 text-sm font-display font-bold text-fg transition-colors hover:bg-bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <Icon name="refresh" size={15} />
        איפוס
      </button>
    </div>
  );
}

/** The right column's own middle region — its own bounded, internally
    scrollable slot between the toggle rows and Reset, so the column's and
    image's shared total height never changes regardless of how long the
    composed explanation gets (spec: "הטור והתמונה נשארים באותו גובה").
    Still the same bg-bg-accent/60 surface as the rest of the column — no
    border/shadow/radius of its own, so it never reads as a detached card. */
function MDOSelectionExplainer({ selected }: { selected: Set<MdoDomainId> }) {
  const { heading, lines } = useMemo(() => composeSelectionExplainer(selected), [selected]);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto border-t border-border-subtle pt-3">
      <div className="font-display text-xs font-bold leading-tight text-fg">{heading}</div>
      <div className="mt-1.5 space-y-1.5 text-[11px] leading-relaxed text-fg-muted">
        {lines.map((line, i) => <p key={i}>{line}</p>)}
      </div>
    </div>
  );
}

/** The summary: badge + at most 2–3 composed sentences.
```

- [ ] **Step 4: Wire the explainer into `MDOControlColumn` between the toggles and Reset**

Find:

```tsx
function MDOControlColumn({
  active,
  motionOk,
  onToggle,
  onReset,
}: {
  active: Set<MdoDomainId>;
  motionOk: boolean;
  onToggle: (id: MdoDomainId) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-bg-accent/60 p-3">
      <div>
        {DOMAIN_VISUALS.map((domain, i) => (
          <div key={domain.id} className={cn(i < DOMAIN_VISUALS.length - 1 && 'border-b border-border-subtle')}>
            <DomainToggleRow domain={domain} isOn={active.has(domain.id)} motionOk={motionOk} onToggle={() => onToggle(domain.id)} />
          </div>
        ))}
      </div>
      <button
```

Replace with:

```tsx
function MDOControlColumn({
  active,
  selectedObjects,
  motionOk,
  onToggle,
  onReset,
}: {
  active: Set<MdoDomainId>;
  selectedObjects: Set<MdoDomainId>;
  motionOk: boolean;
  onToggle: (id: MdoDomainId) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-bg-accent/60 p-3">
      <div className="shrink-0">
        {DOMAIN_VISUALS.map((domain, i) => (
          <div key={domain.id} className={cn(i < DOMAIN_VISUALS.length - 1 && 'border-b border-border-subtle')}>
            <DomainToggleRow domain={domain} isOn={active.has(domain.id)} motionOk={motionOk} onToggle={() => onToggle(domain.id)} />
          </div>
        ))}
      </div>
      <MDOSelectionExplainer selected={selectedObjects} />
      <button
```

(`className="mt-auto ..."` on the Reset `<button>` itself was already changed to `className="mt-3 shrink-0 ..."` in Step 3 above — `mt-auto` is no longer needed now that `MDOSelectionExplainer`'s own `flex-1` fills the remaining space and pushes Reset down by construction.)

- [ ] **Step 5: Pass `selectedObjects` at the call site**

Find:

```tsx
          <MDOControlColumn active={active} motionOk={motionOk} onToggle={toggleDomain} onReset={resetAll} />
```

Replace with:

```tsx
          <MDOControlColumn active={active} selectedObjects={selectedObjects} motionOk={motionOk} onToggle={toggleDomain} onReset={resetAll} />
```

- [ ] **Step 6: Confirm the animated connection light is intact**

Read (don't modify unless a real problem is found) the light-dot block just below the two `motion.path`s in the same `edges.map`:

```tsx
              {motionEnabled && bothActive && !dimmedBySelection && (
                <circle r="3.5" fill="#D97E2B" opacity="0.85">
                  <animateMotion dur="4.2s" repeatCount="indefinite" path={d} />
                </circle>
              )}
```

Confirm: `motionEnabled = inView && !reduceMotion` (already defined earlier in `MDOGroundScene`, gated by the existing `IntersectionObserver` + `useReducedMotion()`) — so the dot only animates for active, in-view, motion-allowed connections, and the two stroke paths above it (core + halo) never themselves animate position, only `pathLength`/`opacity`/`strokeWidth` on toggle — i.e. the line stays visually stable while only the small dot moves, exactly matching spec point 5. This block is unrelated to `selectedObjects`/`inObjectSelection` (Step 2 above only changed the `emphasize`-driven `strokeWidth`, not this block's own condition) — if a real bug is found here (e.g. the dot doesn't restart after a domain is re-toggled on), fix it minimally and describe the fix in the report; if it's already correct, say so explicitly rather than making a speculative change.

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Manual-check note for the final report**

Note in this task's report: "With 0 objects selected, the right column's middle area shows a short one-line prompt. Select 1 object — see its own contribution line. Select 2 — see the two-line mutual-contribution text matching that exact pair (try a few different pairs, including a חלל+ים pair). Select 3+ (try חלל+ים+סייבר specifically, per the brief's own example) — see the combined contributions line plus a 'קשרים ביניהם' line listing the relevant connection labels; the text should read differently between 2-selected and 3-selected on the same domains, not just append. While 2+ objects are selected, their connecting line(s) on the image should read visibly thicker/brighter than non-participating lines. Reset should clear the explainer back to the empty-state prompt. None of this should affect the still-independent line-click bottom-left card. Confirm the small light dot is still visibly gliding along each active connection line (steady core line, moving dot) — stop and note if it's missing (should not need a code change per this task's own audit, but flag if not visible in your own read of the animate props)."

- [ ] **Step 9: Commit**

```bash
git add src/components/lessons/topic-01/MDOScene.tsx
git commit -m "feat(topic-01): add selection explainer to MDO control column, emphasize selected-pair connections"
```

---

## Task 5: Audit and document the live-background-video readiness

**Files:**
- Modify: `design/docs/assumptions.md` (append-only — add one new dated entry; do not edit any existing entry)
- Modify: `src/components/lessons/topic-01/MDOScene.tsx` (only if this task's own audit in Step 1 finds a real gap in `MDOSceneBackdrop` against the checklist below — expected outcome is no code change)

**Interfaces:**
- Consumes: nothing from Tasks 1–4 (this task's file-existence check and `MDOSceneBackdrop` read are independent of the rest of this plan; safe to run in parallel conceptually, executed sequentially here for ledger simplicity).
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Audit `MDOSceneBackdrop` against spec point 7's checklist**

Read `MDOSceneBackdrop` in `src/components/lessons/topic-01/MDOScene.tsx` (the function rendering `SCENE_SRC`/`SCENE_VIDEO_SRC`) and confirm each of these already holds — do not change anything yet, just check:
- [ ] Static photo (`IsometricAsset` with `SCENE_SRC`) always renders, and is the visible layer whenever the video isn't playing (`showVideo && 'opacity-0'` on it, i.e. it only fades out once `showVideo` is true).
- [ ] `showVideo = !reduceMotion && !videoUnavailable && videoReady` — video never shows under `prefers-reduced-motion`, and the `<video>` element itself is entirely un-rendered when `reduceMotion` is true.
- [ ] The play/pause effect pauses when `!inView` (off-screen, via the existing `IntersectionObserver`-driven `inView` prop) or when the user has pressed the pause button (`paused`).
- [ ] `onError={() => setVideoUnavailable(true)}` on the `<video>` — confirms this component already fails silently to the static photo when `mdo-scene-background-loop.mp4` doesn't exist on disk, which Step 2 below confirms is the current case.
- [ ] `SCENE_VIDEO_SRC` points at `${ASSET_BASE}/mdo-scene-background-loop.mp4`, i.e. `public/assets/lessons/topic01/scene-mdo/mdo-scene-background-loop.mp4`.

If every box above is already true, make **no code change** — this is the expected, valid outcome (the plan's own pre-flight audit already found this implemented). If any box is false, fix only that specific gap, keeping every other already-correct behavior untouched, and describe exactly what was wrong and what was changed in the report.

- [ ] **Step 2: Confirm the missing file and the readiness of its replacement assets**

Run (from the repo root):

```bash
ls "public/assets/lessons/topic01/scene-mdo/mdo-scene-background-loop.mp4" 2>&1 || echo "MISSING: mdo-scene-background-loop.mp4 does not exist"
```

Expected: `MISSING: ...` (confirms the video genuinely hasn't been produced — do not create a placeholder/stock clip to make this pass).

Then read `public/assets/lessons/topic01/scene-mdo/mdo-scene-background-loop.prompt.txt` and confirm it already specifies: a locked camera (no pan/tilt/dolly/zoom), motion limited to sea waves / hillside vegetation / clouds only, no domain-tool objects (vehicle/ship/jet/satellite/mast) anywhere in the video, a seamless loop point, and `mdo-scene-background-ground.png` as the reference/init frame. This file was already found complete during this plan's own pre-flight read — if it's still exactly that content, no edit is needed. If it's missing or has drifted from this checklist, rewrite it to satisfy every item above (keep the same target path and reference-frame filename).

Confirm `public/assets/lessons/topic01/scene-mdo/mdo-scene-background-ground.png` exists (it's already `SCENE_SRC`, referenced and rendered elsewhere in this same file) and is the correct, clean source frame to hand to Google Flow — it's the plain photo with no domain-tool layers baked in (those are separate PNGs composited by React, confirmed by reading `DOMAIN_VISUALS` — none of its `src` paths point at the background file).

- [ ] **Step 3: Document the exact missing-file/production instructions**

Append a new entry to the end of `design/docs/assumptions.md` (after its current last line — do not touch any existing content in that file):

```markdown

## 2026-09-21 — Topic-01 MDO scene — live background video status (not fabricated, per explicit instruction)

- **`public/assets/lessons/topic01/scene-mdo/mdo-scene-background-loop.mp4` does not exist yet.** `MDOSceneBackdrop` in `MDOScene.tsx` already supports it fully (static-photo fallback via `onError`, motion-stop button, `prefers-reduced-motion` respected, pauses off-screen via the existing `IntersectionObserver`) — nothing in this codebase claims a video plays when none has been produced.
- **To produce it:** feed `public/assets/lessons/topic01/scene-mdo/mdo-scene-background-ground.png` (the existing, already-clean background photo — no domain-tool objects baked in, those are separate composited layers) into Google Flow (or an equivalent single-reference-frame video tool) as the init/reference frame, using the prompt already written at `public/assets/lessons/topic01/scene-mdo/mdo-scene-background-loop.prompt.txt` (locked camera; waves/hillside-vegetation/cloud motion only; no vehicle/ship/jet/satellite/mast in frame; seamless loop; ~1536×1024 / 3:2; H.264 mp4).
- **Save the exported file to exactly:** `public/assets/lessons/topic01/scene-mdo/mdo-scene-background-loop.mp4`. No other filename or location — `SCENE_VIDEO_SRC` in `MDOScene.tsx` is a literal, non-configurable path.
```

- [ ] **Step 4: Type-check (only relevant if Step 1 made a code change)**

If Step 1 changed `MDOScene.tsx`, run `npx tsc --noEmit` and confirm no new errors. If Step 1 made no code change, skip this step and say so in the report.

- [ ] **Step 5: Commit**

```bash
git add design/docs/assumptions.md
git commit -m "docs(topic-01): document MDO live-background-video status and production instructions"
```

If Step 1 made a code change, stage and include `src/components/lessons/topic-01/MDOScene.tsx` in the same commit and adjust the message to also cover it (e.g. `fix(topic-01): correct MDO background-video fallback and document its status`).

---

## Task 6: Type-check/build the whole scene, self-review against the spec, write the final manual-QA checklist

**Files:**
- Modify: `design/docs/assumptions.md` (append one more short entry with the manual-QA checklist — do not edit prior entries, including Task 5's own entry)

**Interfaces:**
- Consumes: the fully-merged `MDOScene.tsx` from Tasks 1–5 (must run after all of them land).
- Produces: nothing later — this is the last task in the plan.

- [ ] **Step 1: Full build verification (no Playwright)**

Run, in order, from the repo root:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all three succeed with no new errors/warnings introduced by this plan's changes (pre-existing warnings elsewhere in the repo, unrelated to `MDOScene.tsx`, are not this task's concern — note any if `lint`/`build` surface them, but do not fix unrelated files). `npm run build` in particular exercises Next.js's own production type-check/bundling path, which is the closest thing to an end-to-end check available without a browser.

- [ ] **Step 2: Self-review the finished file against all 7 spec points**

Re-read the finished `src/components/lessons/topic-01/MDOScene.tsx` top to bottom and confirm, point by point (this is a reading/tracing exercise, not a code-writing step — only make a fix here if a real gap is found, and describe exactly what and why):

1. `MDOSummary` always renders `SUMMARY_LINE_SLOTS` (3) `<p>` lines regardless of `active`'s size.
2. `MDOControlColumn`: toggles first child (`shrink-0`), `MDOSelectionExplainer` second (`flex-1 min-h-0 overflow-y-auto`), Reset last (`mt-3 shrink-0`) — one shared `bg-bg-accent/60 rounded-2xl` surface, no nested card/border/shadow around the explainer itself.
3. Clicking an active object toggles it in `selectedObjects` (not `active`); up to 5 can be selected; `SELECTED_SCALE` (1.04) + `mdoSelectionOutline`/box-shadow ring apply only to selected objects; `transformOrigin`/`domainPivot` keep the ground-contact point fixed; `effectiveAnchor` feeds both the connection curves and the marker rings.
4. `composeSelectionExplainer` covers all of 0 / 1 / 2 / 3+ selected using only `MDO_DOMAINS`/`MDO_EDGES` fields; `inObjectSelection` emphasizes the relevant connection line(s); the Step 3 effect drops a domain from `selectedObjects` when it's switched off; `resetAll` clears `selectedObjects`.
5. The light-dot `<circle>`/`<animateMotion>` block is present, gated on `motionEnabled && bothActive && !dimmedBySelection`, and the core/halo strokes never themselves move position.
6. The edge hit-path's `style` includes `outline: 'none'`, scoped to that one element; no global outline/focus rule was added anywhere in this file.
7. `design/docs/assumptions.md` carries the Task 5 entry with the exact missing-file path and production instructions; no code anywhere in `MDOSceneBackdrop` claims the video already plays.

- [ ] **Step 3: Write the final manual-QA checklist**

Append one more new entry to the end of `design/docs/assumptions.md` (after Task 5's entry — do not edit it):

```markdown

## 2026-09-21 — Topic-01 MDO interaction upgrade — manual QA checklist (no Playwright used, per explicit instruction — verify visually)

At `http://localhost:3000/lessons/topic-01#scene-mdo`, 1440px width:

- Toggle domains through every active-count from 0 to 5 — the summary block's height and the row beneath it never move.
- Click each of the 5 objects on the image while active — 4% grow + thin white shape outline; click again to deselect. Select all 5, then deselect all.
- Select 1 object → its own contribution shows in the right column. Select 2 → the matching pair's mutual-contribution text (try a few pairs). Select 3+, including חלל+ים then חלל+ים+סייבר specifically → combined contributions + relevant connection labels, visibly different between the two.
- While 2+ are selected, their connecting line(s) read thicker/brighter than the rest.
- Turn off a domain that is currently selected via its toggle — it drops out of the selection and its highlight disappears.
- Click Reset — all domains re-activate, selection clears to the empty-state prompt, any open line-explanation card closes.
- Click several different connection lines — the existing bottom-left explanation card still opens correctly, at its existing position, and does **not** change the multi-select. No black/dark rectangle appears around a clicked line; the line itself thickens instead.
- Tab through the whole scene with the keyboard — toggle switches, the 5 new select buttons, every connection line, and Reset should all be reachable and operable with a visible focus ring, with no default black rectangle on the lines.
- Confirm the small light dot is gliding along active connection lines, and stops under OS-level "reduce motion" (or when the scene is scrolled off-screen).

Live-background-video status (separate from the above — see the entry directly above this one): not yet produced; source frame and Google-Flow prompt are ready; exact missing path is `public/assets/lessons/topic01/scene-mdo/mdo-scene-background-loop.mp4`.
```

- [ ] **Step 4: Commit**

```bash
git add design/docs/assumptions.md
git commit -m "docs(topic-01): add final manual-QA checklist for the MDO interaction upgrade"
```

If Step 2's self-review found and fixed a real gap in `MDOScene.tsx`, stage and include it in this same commit (or a preceding one) and describe the fix clearly in the report — do not silently fold an undocumented fix into the docs-only commit message.
