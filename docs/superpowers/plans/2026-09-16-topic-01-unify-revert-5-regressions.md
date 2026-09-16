# Plan: Revert 5 regressions from the topic-01 design-language unification

## Context

Branch `design/topic-01-unify` (this worktree) did a large "unify to design
language" pass across every topic-01 scene plus the shared `LessonShell` /
`PagedLearn` components. The project owner reviewed the rendered result and
wants 5 specific pieces of that pass reverted back to exactly how they behave
on `main` (commit `4c51a61`), while keeping the rest of the unification pass
as-is. This is a pure revert task — no new behavior, no refactor beyond the
literal changes below.

Spec/authority: the owner's 5 numbered requests (Hebrew, reproduced per task)
plus the exact prior code on `main`, confirmed via `git diff main
design/topic-01-unify -- <file>` for each file below. There is no separate
written design spec for lesson-shell chrome (design/docs/design-spec.md
covers only the landing page) — `main`'s current committed code is the
source of truth for "how it was."

## Global Constraints

- Touch ONLY the exact lines identified in each task below. Do not revert or
  touch any other part of the unification pass (e.g. leave `max-w-lesson`,
  `btn-primary`/`btn-secondary`, the footer prev/next cards, `text-black`
  copy color changes, etc. exactly as the branch already has them).
- Do not introduce new abstractions or clean up unrelated code in the
  touched files.
- Preserve existing RTL logical-property usage in the surrounding code you
  are not asked to change (don't reintroduce `text-right` unless a task
  explicitly restores it verbatim from `main`).
- After all edits: run `npm run build` (or `npx tsc --noEmit` if build is
  slow) to confirm no type errors, and `npm run lint` if available.
- No screenshots/Playwright verification required for this task — these are
  literal, git-diff-verified reverts of known-good `main` code, not new
  visual work.

## Task 1 — Revert all 5 items (single batched task; each item independent, same shape: literal revert-to-main)

### Item 1 — Secondary header (לימוד / תרגול / בדיקת ידע) tabs: restore icons, restore green color

File: `src/components/lesson/LessonShell.tsx`

The unify pass removed the per-tab icon and swapped the active-tab/underline
color from the brand green to orange. Owner: keep the label text and overall
tab structure as the branch has it, but bring the icon back and put the
color back to green.

Current (branch), around line 90-121:
```tsx
            {TABS.map(({ key, label }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  aria-controls={`lesson-panel-${key}`}
                  id={`lesson-tab-${key}`}
                  onClick={() => setTab(key)}
                  className={cn(
                    'relative inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 text-sm font-display font-semibold transition-colors',
                    active
                      ? 'text-accent'
                      : 'text-fg-muted hover:text-brand-dark',
                  )}
                >
                  <span>{label}</span>
                  {active && (
                    <motion.span
                      layoutId={`lesson-tab-indicator-${lesson.id}`}
                      transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 30,
                      }}
                      className="absolute inset-x-2 -bottom-px h-1 bg-accent rounded-full"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
```

Change to (restore `Icon` destructure + render + green color; KEEP the
`font-display font-semibold` text styling and everything else the branch
already has — only the icon and the color/thickness tokens named below
change):
```tsx
            {TABS.map(({ key, label, Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  aria-controls={`lesson-panel-${key}`}
                  id={`lesson-tab-${key}`}
                  onClick={() => setTab(key)}
                  className={cn(
                    'relative inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 text-sm font-display font-semibold transition-colors',
                    active
                      ? 'text-brand-dark'
                      : 'text-fg-muted hover:text-fg',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4 transition-colors',
                      active ? 'text-brand-dark' : 'text-fg-dim',
                    )}
                    aria-hidden
                  />
                  <span>{label}</span>
                  {active && (
                    <motion.span
                      layoutId={`lesson-tab-indicator-${lesson.id}`}
                      transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 30,
                      }}
                      className="absolute inset-x-2 -bottom-px h-0.5 bg-brand-dark rounded-full"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
```

`TABS` (top of file, ~line 28) already carries `Icon: BookOpen` /
`Crosshair` / `ListChecks` per tab — no change needed there, it was never
removed, only the destructure dropped it.

⚠️ Cannot verify from diff alone: confirm no other reference to `TABS`
elsewhere in the file relies on the 2-arg destructure shape — there is only
this one `.map(...)` call in the file.

---

### Item 2 — Sidebar "שיעור N" heading: restore its size/weight/color

File: `src/components/lesson/PagedLearn.tsx`, function `ScenePagerDesktop`
(the `xl:flex` fixed sidebar — NOT `ScenePagerMobile`, leave that untouched).

Current (branch), ~line 292-294:
```tsx
          <div className="px-2 mb-6 pb-2.5 border-b border-border-subtle">
            <div className="text-sm font-display font-semibold tracking-wider text-fg-muted mb-2">
              שיעור {lesson.number}
            </div>
```

Change the inner heading `<div>`'s className back to `main`'s value (leave
the outer container div's `px-2 mb-6 pb-2.5 border-b border-border-subtle`
untouched — only the "שיעור N" label itself regressed):
```tsx
          <div className="px-2 mb-6 pb-2.5 border-b border-border-subtle">
            <div className="font-display font-bold text-accent text-xl mb-2">
              שיעור {lesson.number}
            </div>
```

Do not touch the "תוכן השיעור" label below it, and do not touch
`ScenePagerMobile`'s equivalent "שיעור N" line — the owner's complaint is
specifically about the desktop side menu.

---

### Item 3 — Sidebar sub-topic hover state: restore exactly as `main`

Same file, same function `ScenePagerDesktop`, the sub-topic `<button>` list
item, ~line 315-343.

Current (branch):
```tsx
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-300 ease-snap cursor-pointer text-start',
                  isActive
                    ? 'border-accent bg-accent/10 text-black'
                    : 'border-transparent text-fg-muted hover:border-brand/30 hover:bg-brand/[0.03]',
                )}
              >
                <span
                  className={cn(
                    'size-2 rounded-full shrink-0 transition-colors',
                    reached ? 'bg-accent' : 'bg-fg-dim',
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    'text-base leading-snug transition-colors text-balance',
                    isActive && 'font-bold',
                  )}
                >
                  {s.label}
                </span>
```

Revert this whole block verbatim to `main`'s version (this is one visual
unit — active state, hover state, dot color, and label weight were all
changed together by the same pass, so all of it reverts together):
```tsx
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-md transition-all cursor-pointer text-right',
                  isActive
                    ? 'bg-accent/15 text-fg'
                    : 'hover:bg-bg-accent text-fg-muted',
                )}
              >
                <span
                  className={cn(
                    'size-2 rounded-full shrink-0 transition-colors',
                    reached ? 'bg-accent' : 'bg-fg',
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    'text-base leading-snug transition-colors truncate',
                    isActive && 'font-semibold',
                  )}
                >
                  {s.label}
                </span>
```

Note this reintroduces literal `text-right` (matching `main` exactly, per
this task's "revert to how it was" instruction) rather than a logical
property — that is intentional here, not a new RTL violation, since it's
restoring pre-existing `main` code verbatim.

---

### Item 4 — Onboarding scene: restore original scale (wider / shorter)

File: `src/components/lessons/topic-01/onboarding-edit-mode.tsx`, ~line 144.

The unify pass changed the permanent CSS-zoom scale applied to the whole
topic-01 onboarding scene (accordion + terrain stage) from `0.86` to `1`,
which is the "you shrank the width / made it taller, make it wider and a
touch shorter to fit the screen" the owner is describing — the code comment
already documents this exact revert:

Current (branch):
```tsx
const SCENE_SCALE = 1;
```

Change to:
```tsx
const SCENE_SCALE = 0.86;
```

Also revert the two comments above/below this line that describe the
2026-09-15 change back to describing `0.86` as the permanent scale (i.e.
restore the original comment wording from `main`, since the "was 0.86, set
to 1 on 2026-09-15" framing is now stale). Read `main`'s version of this
file's comment block (`git show main:src/components/lessons/topic-01/onboarding-edit-mode.tsx`)
for the exact original wording, or write an equivalent short comment stating
plainly that `0.86` is the permanent scene scale approved at edit-mode zoom
— do not leave a comment that says "was 0.86 ... set to 1" once the value is
back to `0.86`.

⚠️ Cannot verify from diff alone: after this change, confirm nothing else in
the branch's unify pass depended on `SCENE_SCALE === 1` (grep the file for
other `SCENE_SCALE` usages — there are none besides the `currentZoom = zoom
* SCENE_SCALE` computation and the `zoom: SCENE_SCALE` CSS style, both of
which work correctly with either value).

---

### Item 5 — MDOScene "3 examples" (RealWorldExamples): restore icon above each dimension

File: `src/components/lessons/topic-01/MDOScene.tsx`, function
`RealWorldExamples`, the per-case domain-chip row (~line 542-548 in the
branch).

Current (branch) — plain text chips, no icon:
```tsx
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  {DOMAINS.filter((d) => c.domainIds.includes(d.id)).map((d) => (
                    <span key={d.id} className="chip border-border bg-bg-accent text-fg-muted">{d.label}</span>
                  ))}
                </div>
```

Revert to `main`'s version — icon circle above the label for each domain:
```tsx
                <div className="mt-4 flex flex-wrap items-start justify-center gap-3">
                  {DOMAINS.filter((d) => c.domainIds.includes(d.id)).map((d) => (
                    <div key={d.id} className="flex flex-col items-center gap-1.5">
                      <div className="flex size-9 items-center justify-center rounded-full border border-border">
                        <Icon name={d.icon} size={16} className="text-fg" />
                      </div>
                      <span className="text-[11px] text-fg-muted">{d.label}</span>
                    </div>
                  ))}
                </div>
```

`Icon` is already imported in this file (used elsewhere in the same
component) — no new import needed. Confirm this by checking the file's
existing `import { Icon } from ...` line.

This applies uniformly to all 3 cases (Ukraine/Houthis/Iran) since they all
render through this one shared block — no per-case branching needed.

## Verification

- `npm run build` (or `npx tsc --noEmit`) passes with no new errors.
- Visual spot-check not required (owner will verify visually after merge),
  but if a dev server is trivially available, loading `/lessons/topic-01`
  and eyeballing the secondary header (green, icons present), the sidebar
  "שיעור 1" heading (larger orange text), a sub-topic hover, the onboarding
  scene sizing, and the MDO "3 examples" icons is a good sanity check.
- `git diff main design/topic-01-unify -- <each of the 5 files>` after the
  fix should show that ONLY the reverted hunks disappeared from the branch
  diff — every other hunk in those files (part of the rest of the
  unification pass) should be unchanged.

## Out of scope

- Any other file/behavior from the unification pass not named above.
- The `worktree-topic03-onboarding-style-parity` branch (separate, stale,
  unrelated to this plan).
- Merging to `main` — handled after this plan's review, via
  `superpowers:finishing-a-development-branch`, per the owner's explicit
  "when you're done you can merge to main" instruction.
