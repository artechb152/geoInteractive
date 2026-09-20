# Plan — topic-01 `#scene-levels` drag exercise: queued reveal, deferred feedback

## Context

`src/components/lessons/topic-01/LevelsScene.tsx` holds the "תרגול גרירה" exercise:
6 scenario chips (`SCENARIOS`) live in a horizontal strip (`ScenarioPool`) above a
3-zone diorama (`LevelZone` × 3). Today all 6 chips render at once in an
`overflow-x-auto` row of `w-64 shrink-0` cards, so at 1440px the row overflows and the
learner must pan/scroll the strip to reach later events.

`assignments: Record<number, Level>` maps scenario index → zone. Correctness styling is
already gated behind `submitted`, and `ScenarioChip` in the pool is already passed
`isCorrect={false} isWrong={false}`.

## Spec (user requirements, binding)

1. At most **4** events visible for sorting at any moment (3 if 4 do not fit comfortably).
2. Dropping an event on a valid zone is accepted **without any correctness check**; the
   event stays where the learner put it and **exactly one** next event enters the pool.
3. No colour, mark, message, score, or behaviour during the drag stage may reveal whether
   a placement is right. No event is ever returned to the pool for being wrong.
4. Releasing outside a valid zone returns the event to the pool and does **not** advance
   the queue.
5. An already-sorted event may be moved between zones before checking answers; such a move
   does **not** pull another event from the queue.
6. Results/feedback appear only after all events are sorted and "בדיקת תשובות" is pressed.
   Use the existing check mechanism (the `submitted` flag).
7. When fewer events remain than available slots, show only those that remain.
8. Every event appears exactly once; preserve the existing fixed `SCENARIOS` order (no
   shuffle mechanism exists today).
9. Reset clears queue, visible events, assignments, and results.
10. Do not solve this by hiding scrollbars or clipping content. Cards stay readable and
    zones stay reachable while dragging.

## Global Constraints

- Only `src/components/lessons/topic-01/LevelsScene.tsx` may change. No other file.
- Design, colours, typography unchanged — no new tokens, no new Tailwind colours.
- RTL: logical properties only (`ms-`/`me-`/`start-`/`end-`); no `left-`/`right-` utilities;
  never mirror artwork.
- Do not touch `LevelsTable`, `LEVELS`, `SCENARIOS` content, zone artwork, or `LevelZone`
  styling.
- `npx tsc --noEmit` must pass.
- Existing behaviour that must survive: tap-to-select then tap-a-zone, the floating drag
  ghost, zone-to-zone native HTML5 drag, `submitted` gating of correct/wrong styling.

## Task 1 — Queue model + non-scrolling pool row

Single file: `src/components/lessons/topic-01/LevelsScene.tsx`.

### 1a. Visible-slot constant

Add near `POOL_DRAG_CLICK_THRESHOLD`:

```ts
// Only this many events are offered for sorting at once; each accepted
// placement reveals the next one in SCENARIOS order. Chosen over showing all
// 6 because 6 x 256px overflowed the pool row at 1440px and forced the learner
// to pan the strip to find an event. At 1440px the pool row's inner width is
// ~1344px, so 4 equal chips are ~327px each - wider than the old fixed w-64,
// so nothing gets less readable.
const POOL_VISIBLE_SLOTS = 4;
```

### 1b. Derive the visible pool instead of listing every unassigned scenario

Replace

```ts
const pool = SCENARIOS.map((s, i) => ({ s, i })).filter((x) => !assignments[x.i]);
```

with a revealed-prefix derivation. `assignedCount` already exists above it:

```ts
// Events are revealed from a queue: the first POOL_VISIBLE_SLOTS are offered
// up front, and every accepted placement reveals exactly one more, so the pool
// holds at most POOL_VISIBLE_SLOTS chips and never needs to scroll. Derived
// from `assignments` rather than held as its own state so reset() - which
// already clears `assignments` - rewinds the queue for free, and so no code
// path can desync the queue from what is actually sorted.
const revealedCount = Math.min(SCENARIOS.length, POOL_VISIBLE_SLOTS + assignedCount);
const pool = SCENARIOS.slice(0, revealedCount)
  .map((s, i) => ({ s, i }))
  .filter((x) => !assignments[x.i]);
```

The derivation holds only while `assignments` never shrinks, which 1c enforces.

### 1c. `moveScenario`: accept every placement, never un-assign

`moveScenario(idx, level)` currently accepts `level: Level | null`, where `null` removes
the assignment. Un-assigning would shrink `assignedCount`, so `revealedCount` would fall
back below an index already revealed and an event on screen would vanish. Change the
signature to `moveScenario(idx: number, level: Level)` and drop the delete branch:

```ts
const moveScenario = (idx: number, level: Level) => {
  // No correctness check here on purpose: a placement is accepted as-is and the
  // chip stays in the zone the learner chose. Right/wrong is revealed only by
  // `submitted` below, after the check-answers button.
  setAssignments((prev) => ({ ...prev, [idx]: level }));
  setSelectedScenario(null);
};
```

Because a zone-to-zone move rewrites an existing key, `assignedCount` is unchanged and
`revealedCount` does not advance — requirement 5 falls out of the derivation.

### 1d. Remove the now-invalid "drag back to the pool" drop target

`ScenarioPool`'s root `motion.div` carries `onDragOver`/`onDragLeave`/`onDrop` plus
`isOver` state whose only job was calling `onMoveScenario(idx, null)`. That path no longer
exists (1c). Delete those three handlers, the `isOver` state, the
`animate={{ scale: isOver ? 1.005 : 1 }}` / `transition` props, and the
`isOver && 'border-accent'` class, and drop the now-unused `onMoveScenario` prop from
`ScenarioPool`'s props type and from its call site in `LevelsScene`. If `motion` then
becomes unused in the file, remove its import; `LevelZone` still uses `motion.div`, so
check before removing.

Leave a comment where the drop target was:

```tsx
{/* The pool is deliberately NOT a drop target: with a fixed number of
    visible slots, returning a sorted chip here would push the row past its
    cap, and an already-placed event is meant to be moved between zones
    (which the zones' own native drop handlers already support), not un-sorted. */}
```

### 1e. Pool row: no horizontal scrolling, equal-width chips

In `ScenarioPool`'s chip row `div`, replace

```
className="flex gap-3 overflow-x-auto pb-1 cursor-grab select-none active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
```

with

```
className="flex gap-3 items-stretch pb-1 cursor-grab select-none active:cursor-grabbing"
```

and change each `ScenarioChip`'s `className` from `cn('w-64 shrink-0', ...)` to
`cn('flex-1 min-w-0', ...)`. At most 4 chips share the row, so they grow to ~327px each at
1440px instead of overflowing. Content is not clipped and no scrollbar is hidden.

Keep `draggable={false}` on pool chips (1f explains why the custom pointer drag stays).

### 1f. Retire the dead pan gesture in the pointer-drag classifier

The row can no longer scroll, so the `'pan'` phase in `handleRowPointerDown` /
`handleRowPointerMove` / `endRowDrag` is dead, and its provisional
"horizontal-dominant → pan" guess can only delay a legitimate pick-up. Keep the custom
pointer drag itself (it is what draws the floating ghost and hit-tests zones via
`elementFromPoint`), but simplify the classifier:

- `rowDragRef`'s shape drops `scrollLeft` and narrows `phase` to `'pending' | 'item'`.
- `handleRowPointerDown` no longer reads `el.scrollLeft`. If no chip is under the pointer
  (`chipIndex == null`), do not start a drag at all (`rowDragRef.current = null`).
- `handleRowPointerMove`: once movement crosses `POOL_DRAG_CLICK_THRESHOLD`, go straight to
  `'item'` (no dx/dy comparison, no later pan-to-item upgrade), set
  `rowDraggedRef.current = true`, capture the pointer, and call `onItemDragMove`.
- `endRowDrag` is otherwise unchanged.
- Replace the long "pan vs pick-up" comment block above `handleRowPointerDown` with a short
  one explaining that the row no longer scrolls, so every chip-originated pointer drag is a
  pick-up, and that native HTML5 drag is still not used on pool chips because the floating
  ghost plus `elementFromPoint` zone hit-testing is what makes the drop targets (overlaid
  on artwork) reliable.

`handlePoolItemDragEnd` in `LevelsScene` already assigns only when `poolDrag.overLevel` is
non-null, so a release outside a zone leaves the chip in the pool and leaves `assignments`
untouched — requirement 4 already holds; do not change it.

### 1g. Pool header count reflects the whole remaining queue

`ScenarioPool`'s header renders `` `אירועים למיון · ${pool.length}` ``. With a capped pool
that number would sit at 4 and read as "only 4 events exist". Pass the total still-unsorted
count in and render that instead, so the learner can see more are coming. Add a
`remaining: number` prop to `ScenarioPool`, pass `SCENARIOS.length - assignedCount` from
`LevelsScene`, and render `` `אירועים למיון · ${remaining}` ``. No other copy changes.

### 1h. Verify untouched requirements

Confirm (do not re-implement): `reset()` still clears `assignments`, `submitted` and
`selectedScenario`; the check-answers button is still gated on `allAssigned`; nothing in the
pool or in `LevelZone` styles a chip by `s.correct` outside a `submitted &&` guard. Report
any place where that is not true instead of silently fixing outside this file.

### Verification for Task 1

- `npx tsc --noEmit` passes.
- `grep -n "overflow-x-auto\|w-64\|scrollbar" src/components/lessons/topic-01/LevelsScene.tsx`
  returns nothing for the pool row.
- `grep -n "s.correct" src/components/lessons/topic-01/LevelsScene.tsx` — every hit is inside
  a `submitted &&` guard.
- Report the greps' output in the report file.

There is no test runner configured for this component; browser verification at 1440px is
performed by the controller after review.
