# Topic-04 Onboarding Scene — Visual Parity with Topic-02 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `topic-04`'s onboarding scene (`#scene-onboarding`) visually match `topic-02`'s onboarding scene — same container width, same accordion/illustration column ratio, same accordion card sizing and single-heading panel structure — without changing any lesson copy.

**Architecture:** Both scenes are independent, bespoke React components (`OnboardingScene.tsx` per topic) that share only generic atoms (`SceneHeader`, `ReadyCallout`, `Icon`). There is no shared "onboarding template" to refactor into — this plan ports specific Tailwind classes and JSX structure from `topic-02/OnboardingScene.tsx` (the visual reference) into `topic-04/OnboardingScene.tsx`, editing only className/structure, never the `STEPS`/`HISTORICAL` data arrays or any rendered Hebrew string except one explicitly approved deletion (Task 2, Step 4).

Note: an earlier plan (`docs/superpowers/plans/2026-09-01-accordion-style-unification.md`) unified topics 02–06's accordions to a site-wide `topic-01` reference (`size-9` badges, `text-base md:text-lg` titles). `topic-02/OnboardingScene.tsx` has since been deliberately customized beyond that baseline (`size-11` badges, `text-lg md:text-xl` titles, `32fr_68fr` grid — see its own in-file comments). This plan intentionally targets that current, customized `topic-02` state — not the older `topic-01` baseline — per explicit user instruction to match `topic-02` specifically.

**Tech Stack:** Next.js 15 / React 19, Tailwind CSS 3 (+ `tailwindcss-rtl`), Framer Motion, `cn()` helper (`@/lib/utils`). No unit-test framework in this repo (no jest/vitest) — verification is Playwright screenshot comparison at 1440px, matching this project's established screenshot-and-compare convention (see `CLAUDE.md` Verification loop, and the precedent plan above).

**Spec:** `src/components/lessons/topic-02/OnboardingScene.tsx` is the visual reference/spec for this port — every class value below is copied verbatim from it. No separate written spec doc exists for this task; scope was narrowed via explicit user decisions recorded in Global Constraints.

## Global Constraints

- RTL logical properties only — never introduce `left-`/`right-` or `text-align: left/right` (project-wide rule, `CLAUDE.md`).
- Do not change any Hebrew copy/text content anywhere in `topic-04/OnboardingScene.tsx` — not `STEPS[].label`, not `popupTitle`/`popupBody`, not `HISTORICAL[]`, not `ReadyCallout` body, not `SceneHeader` title/intro — **except** the one static duplicate-heading line explicitly approved for removal in Task 2 Step 4.
- Do not touch the historical-examples section (`HISTORICAL.map` / `IntelCard` grid / local `SoftDivider`) — user explicitly chose "skip it, restyle only" and `IntelCard` was confirmed to already be the current shared site-wide card component, so no change is needed there. Out of scope for this plan.
- Do not touch `ManeuverStage` (the inline SVG illustration) internals, or swap it for topic-02's canvas frame-player — different, deliberate illustration technology per topic; out of scope.
- Do not "fix" the `step="05.0"` / `t5-onb-*` id vestiges from the old topic numbering (`aria-controls`, `layoutId`, panel `id`/`key`) — known pre-existing issue, unrelated to visual parity, explicitly left alone. Note it in the final report as a Finding only.
- No new color tokens or Tailwind config changes — every class used below already exists in the codebase (verified present in `topic-02/OnboardingScene.tsx`).
- Do not modify `topic-02/OnboardingScene.tsx` or any shared component (`SceneHeader.tsx`, `ReadyCallout.tsx`, `IntelCard.tsx`, `Icon.tsx`) — this plan only edits `topic-04/OnboardingScene.tsx`.
- After each task, render both `/lessons/topic-02#scene-onboarding` and `/lessons/topic-04#scene-onboarding` via `npm run dev` and compare with a Playwright screenshot at **1440×1122** (viewport width per `CLAUDE.md` target). Note any concrete pixel/wrapping deltas in the task report rather than silently adjusting values.

---

## Task 1: Container & grid-layout parity

**Files:**
- Modify: `src/components/lessons/topic-04/OnboardingScene.tsx` (three className edits, all inside the `return (...)` of `OnboardingScene()`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the outer `<section>` and two-column `<div>` now use the same container/grid classes as `topic-02/OnboardingScene.tsx`. Task 2 edits live inside the first grid column produced here and depend on this task landing first (same file, sequential edits — do not run Task 2 in parallel with this task).

- [ ] **Step 1: Widen the outer container to match topic-02**

In `src/components/lessons/topic-04/OnboardingScene.tsx`, find:

```tsx
    <section id="scene-onboarding" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
```

Replace with:

```tsx
    <section id="scene-onboarding" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
```

(`max-w-lesson` is the token topic-02 uses; it replaces the narrower `max-w-6xl`.)

- [ ] **Step 2: Match the accordion/illustration column ratio**

In the same file, find:

```tsx
      <div className="grid md:grid-cols-[2fr_3fr] gap-6">
```

Replace with:

```tsx
      <div className="grid md:grid-cols-[32fr_68fr] gap-6">
```

- [ ] **Step 3: Match the illustration panel background**

In the same file, find:

```tsx
        <div className="surface-elevated bg-bg relative overflow-hidden min-h-[280px]">
          <ManeuverStage view={view} />
        </div>
```

Replace with:

```tsx
        <div className="surface-elevated bg-bg-accent relative overflow-hidden min-h-[280px]">
          <ManeuverStage view={view} />
        </div>
```

(Only the background token changes, from `bg-bg` to `bg-bg-accent`, matching topic-02's illustration wrapper. Topic-04 keeps its own `ManeuverStage` SVG child unchanged — do not add the `[&_canvas]:!w-full [&_canvas]:!h-full` selector from topic-02, since topic-04 has no `<canvas>`.)

- [ ] **Step 4: Verify with a screenshot**

Run the dev server and screenshot both scenes at 1440×1122:

```bash
npm run dev
```

Then, with Playwright (MCP browser tools or an ad-hoc script under the scratchpad directory — do not commit a screenshot script to the repo), navigate to `http://localhost:3000/lessons/topic-02#scene-onboarding` and `http://localhost:3000/lessons/topic-04#scene-onboarding`, resize to 1440×1122, and capture both.

Check specifically:
- Topic-04's outer content width now matches topic-02's.
- Topic-04's accordion column is now the narrower ~32% column, illustration ~68%.
- **Per the approved decision, do not revert the ratio if `STEPS[].label` text wraps onto more lines than before** — record the wrapping behavior (line count per label) as a finding in the task report. This is expected and pre-approved, not a bug to fix.

- [ ] **Step 5: Commit**

```bash
git add src/components/lessons/topic-04/OnboardingScene.tsx
git commit -m "style(topic-04): match onboarding scene container/grid to topic-02"
```

---

## Task 2: Accordion card styling parity

**Files:**
- Modify: `src/components/lessons/topic-04/OnboardingScene.tsx` (edits inside the `STEPS.map((s, i) => { ... })` block only)

**Interfaces:**
- Consumes: Task 1 must be complete and committed first (same file — sequential, not parallel, to avoid merge conflicts).
- Produces: final visual state of the accordion cards for this plan; no later task depends on this one.

- [ ] **Step 1: Remove the active-indicator motion bar**

In `src/components/lessons/topic-04/OnboardingScene.tsx`, inside the accordion `<button>`, find and delete this block entirely (topic-02's accordion has no equivalent element — active/inactive state is conveyed by the card's border/background color alone, which topic-04 already has via its outer `cn(...)` classes):

```tsx
                  {active && (
                    <motion.span
                      layoutId="t5-onb-bar"
                      className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
                    />
                  )}
```

- [ ] **Step 2: Match the number/check badge size**

Find:

```tsx
                  <span
                    className={cn(
                      'size-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      active || passed ? 'bg-brand-dark text-bg-elevated border-brand-dark' : 'bg-bg-accent text-fg-muted border-border'
                    )}
                  >
                    {passed && !active ? (
                      <Icon name="check" size={16} strokeWidth={2.5} />
                    ) : (
                      <span className="font-display text-sm font-bold">{i + 1}</span>
                    )}
                  </span>
```

Replace with:

```tsx
                  <span
                    className={cn(
                      'size-11 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      active || passed ? 'bg-brand-dark text-bg-elevated border-brand-dark' : 'bg-bg-accent text-fg-muted border-border'
                    )}
                  >
                    {passed && !active ? (
                      <Icon name="check" size={18} strokeWidth={2.5} />
                    ) : (
                      <span className="font-display text-base font-bold">{i + 1}</span>
                    )}
                  </span>
```

(Badge grows `size-9` → `size-11`, check icon `16` → `18`, number label `text-sm` → `text-base` — matching topic-02's badge exactly. `{i + 1}` is a computed value, not lesson text — unaffected by the "no text changes" constraint.)

- [ ] **Step 3: Match the label typography and chevron size**

Find:

```tsx
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold leading-tight transition-colors text-black text-base md:text-lg">{s.label}</div>
                  </div>
```

Replace with:

```tsx
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold leading-tight transition-colors text-black text-lg md:text-xl">{s.label}</div>
                  </div>
```

Then find the chevron `<svg>`:

```tsx
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
```

Replace with:

```tsx
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
```

(`{s.label}` itself is untouched — only the wrapping `className` font-size tokens change, `text-base md:text-lg` → `text-lg md:text-xl`, matching topic-02.)

- [ ] **Step 4: Remove the duplicate static heading in the expanded panel**

Find:

```tsx
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20">
                        <div className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
למה זה חשוב?                        </div>
                        <h4 className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
                          {s.popupTitle}
                        </h4>
                        <p className="text-base leading-relaxed text-black text-pretty">
                          {s.popupBody}
                        </p>
                      </div>
```

Replace with:

```tsx
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20">
                        <h4 className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
                          {s.popupTitle}
                        </h4>
                        <p className="text-base leading-relaxed text-black text-pretty">
                          {s.popupBody}
                        </p>
                      </div>
```

This removes the static `למה זה חשוב?` line only — user-approved (see conversation record: "Remove it (Recommended)"). `{s.popupTitle}` and `{s.popupBody}` — the actual lesson copy — are untouched, just as in topic-02's single-heading panel.

- [ ] **Step 5: Verify with a screenshot**

With the dev server still running (`npm run dev`), re-screenshot `http://localhost:3000/lessons/topic-04#scene-onboarding` at 1440×1122, expanded-card state (click the first accordion item open, matching topic-02's default-open first item). Compare side-by-side against the topic-02 screenshot from Task 1:
- Badge size, number/check glyph size, and label font size should read as visually equivalent to topic-02's.
- The expanded panel should show exactly one heading (`popupTitle`) before the body paragraph, matching topic-02.
- No active-indicator bar should render on the active card in topic-04 (matches topic-02, which has none).

- [ ] **Step 6: Commit**

```bash
git add src/components/lessons/topic-04/OnboardingScene.tsx
git commit -m "style(topic-04): match onboarding accordion card styling to topic-02"
```
