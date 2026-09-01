# Accordion Style Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every content accordion in the Geo9900 lesson app so it matches the visual hierarchy, color usage, and weight system of the reference accordion in `src/components/lessons/topic-01/OnboardingScene.tsx` (lines 104–223) — one unified "line" across the site, not a colorful patchwork.

**Architecture:** No new components, no new color tokens, no new logic. This is a pure Tailwind-class substitution pass: for each target file, replace the divergent classes on the accordion's container, header row, icon badge, chevron, sub-heading labels, and body paragraphs with the exact classes used in the reference. Structure (useState, framer-motion AnimatePresence, custom inline SVG chevron) stays as-is in each file — only the *styling* changes, not the interaction mechanics.

**Tech Stack:** Next.js (App Router) + React + TypeScript + Tailwind CSS + framer-motion. Radix UI accordion primitive exists at `src/components/ui/accordion.tsx` (used only by `BufferScene.tsx`).

**Spec:** This plan's spec is the reference implementation itself — `src/components/lessons/topic-01/OnboardingScene.tsx:104-223` — plus the design intent from the user request: keep the existing hierarchy (main heading / sub-heading / regular text each get distinct, consistent treatment), reuse existing `bg`/`fg`/`brand` semantic tokens (no new hex, no landing-page `paper/olive/ember/pine/tanline` tokens here), and reduce color noise — several current files use `text-brand-dark`, `text-accent-cool`, `text-accent-hot` for sub-headings where the reference uses plain bold black. Moving toward the reference is explicitly a de-colorizing move, which matches the request to avoid an overly colorful, confusing UI.

## Global Constraints

- **Reference Standard** — every task restyles its target element(s) to exactly these classes (copy verbatim, do not paraphrase):
  - Card container: `surface overflow-hidden transition-all duration-300 ease-snap`, with state modifiers — active/open: `border-brand/45 bg-bg-elevated`; idle/closed: `border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]`; completed-and-not-active (if the file has this concept): also add `opacity-80`.
  - Header/trigger button: `w-full p-4 text-right flex items-center gap-3 relative`.
  - Icon/number badge: `size-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap`, with state modifiers — active/completed: `bg-brand-dark text-bg-elevated border-brand-dark`; idle: `bg-bg-accent text-fg-muted border-border`. (Never `rounded-[3px]` — that is the divergent pattern being removed.)
  - **Main heading** (the row's title, always visible): `font-display font-bold leading-tight transition-colors text-black text-base md:text-lg`. Never `font-medium`/`font-semibold`, never `text-fg`/`text-brand-dark` — always `font-bold` + `text-black`.
  - Chevron: keep each file's existing SVG/icon element and its rotate-on-expand animation; only change its **color** classes to `text-brand-dark` when expanded / `text-fg-dim` when collapsed.
  - Content wrapper (revealed on expand): outer motion wrapper unchanged; inner padding div: `px-4 pb-4 pt-1 border-t border-brand/20 space-y-3`.
  - **Sub-heading** (a label inside the expanded body, e.g. "מה קורה בשלב הזה?" / a field name / an English term row): `text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5`. Never `text-sm`, never `font-semibold`, never `text-brand-dark`/`text-accent-cool`/`text-accent-hot`/`text-fg-muted` for this role.
  - **Regular body text** (the explanatory paragraph under a sub-heading): `text-base leading-relaxed text-black`. Never `text-sm`, never `text-fg`/`text-fg-muted`.
- **No new color tokens.** Only reuse tokens already defined in `tailwind.config.ts` under `bg`, `border`, `fg`, `brand` (plus plain `black`, which the reference itself uses). Do not touch `paper`/`olive`/`ember`/`pine`/`tanline` — those belong to the separate landing-page design system and are out of scope.
- **RTL.** All edits are class-string substitutions on elements that are already RTL-correct (`text-right`, logical `ms-`/`me-` where present). Do not introduce any `left-`/`right-` absolute utilities or `text-align: left/right` inline styles. Do not touch any SVG `<text>` `textAnchor` behavior — only class strings on existing elements.
- **Scope boundary.** Only the files listed in this plan's tasks are in scope. `src/components/landing/home/CoursePlanPanel.tsx`, `src/components/ui/AppHeader.tsx`, and `src/components/prt/NotesWidget.tsx` are toggle/menu widgets, not content accordions — do not touch them under this plan.
- **Verification method.** This is a visual-only change with no unit-test surface. Each task's "test" step is: start the dev server (`npm run dev`, if not already running on port 3000), use the Playwright MCP tools (`browser_navigate`, `browser_resize` to 1440×900, `browser_click` to expand the accordion item(s) touched, `browser_take_screenshot`) to render the changed scene at `http://localhost:3000/lessons/topic-0N`, and visually confirm: (a) the row title is bold and black, (b) any in-body sub-heading label is bold and black (not colored/smaller), (c) body paragraphs are `text-base` and black, (d) the icon badge is a fully-rounded square (`rounded-xl`), not a barely-rounded one. Compare side-by-side against a screenshot of the topic-01 reference (`http://localhost:3000/lessons/topic-01`) taken the same way. `npx tsc --noEmit` must also pass (no type errors) since these are `.tsx` files.
- **Commit style.** One commit per task, message format `style(accordion): unify <scope> to topic-01 reference`.

---

### Task 1: Batch-restyle OnboardingScene accordions — topics 02–06

**Files:**
- Modify: `src/components/lessons/topic-02/OnboardingScene.tsx` (~L124–222)
- Modify: `src/components/lessons/topic-03/OnboardingScene.tsx` (~L89–200)
- Modify: `src/components/lessons/topic-04/OnboardingScene.tsx` (~L89–200)
- Modify: `src/components/lessons/topic-05/OnboardingScene.tsx` (~L85–195)
- Modify: `src/components/lessons/topic-06/OnboardingScene.tsx` (~L89–199)

**Interfaces:** None — pure className edits, no prop/type/signature changes in any of these files.

Each of these 5 files implements the same `STEPS.map(...)` accordion pattern as the topic-01 reference (numbered/check badge → row title → expandable body with two labeled sections). Apply the Global Constraints "Reference Standard" substitutions to each file:

- [ ] **Step 1: topic-02 — badge radius.** In `src/components/lessons/topic-02/OnboardingScene.tsx`, find the icon/number badge `<span>` classes (currently `rounded-[3px]`, around where the badge `size-*` class lives). Change the radius utility to `rounded-xl`, keeping `size-9 flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap` and the existing active/idle color modifiers.

- [ ] **Step 2: topic-02 — row title.** Find the row title div (currently `font-medium leading-tight`, no `font-display`/`font-bold`). Replace with `font-display font-bold leading-tight transition-colors text-black text-base md:text-lg`.

- [ ] **Step 3: topic-02 — sub-headings and body.** Find the body sub-heading (currently `text-sm font-display font-semibold text-brand-dark mt-3 mb-2 tracking-wider`) and the separate `h4` sub-title (`font-display font-bold text-base sm:text-lg`) — collapse both into one consistent sub-heading style: `text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5`. Find the body paragraph (currently `text-sm leading-relaxed text-fg-muted text-pretty`) and change to `text-base leading-relaxed text-black` (keep `text-pretty` if present, it's a wrapping utility not a hierarchy concern).

- [ ] **Step 4: topic-03 — apply the same four substitutions.** Badge at ~L145 (`rounded-[3px]` → `rounded-xl`). Row title at ~L156 (`font-display font-semibold leading-tight text-fg` → `font-display font-bold leading-tight transition-colors text-black text-base md:text-lg`). Sub-heading at ~L190 (`text-sm font-display font-semibold tracking-wider text-brand-dark mt-3 mb-2.5` → `text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5`). Body at ~L196 (`text-sm leading-relaxed text-fg-muted text-pretty` → `text-base leading-relaxed text-black`, keep `text-pretty`).

- [ ] **Step 5: topic-04 — apply the same four substitutions.** Same line numbers and same before/after values as topic-03 (badge ~L145, title ~L156, sub-heading ~L190, body ~L195).

- [ ] **Step 6: topic-05 — apply the same four substitutions.** Same before/after values as topic-03/04 (badge ~L145, title ~L156, sub-heading ~L190, body ~L198).

- [ ] **Step 7: topic-06 — apply title/sub-heading/body substitutions (badge already correct).** topic-06's badge is already `rounded-xl` (matches reference) — leave it. Row title at ~L146 (`font-display font-semibold leading-tight text-fg` → `font-display font-bold leading-tight transition-colors text-black text-base md:text-lg`). This file has a two-header body (like the reference) at ~L184/~L190 using `text-sm font-display font-semibold text-accent-cool` and `text-brand-dark mb-1.5 tracking-wider` — change **both** to `text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5`. Body paragraphs at ~L187/~L193 (`text-sm leading-relaxed text-fg` / `text-fg-muted`) → `text-base leading-relaxed text-black` (both).

- [ ] **Step 8: Type-check.** Run: `npx tsc --noEmit`. Expected: no new errors introduced by these 5 files (className-only edits should never produce type errors; if any appear, they indicate a stray syntax mistake — fix before proceeding).

- [ ] **Step 9: Visual verification.** Start dev server if not running (`npm run dev`). Using Playwright MCP: `browser_navigate` to `http://localhost:3000/lessons/topic-01`, `browser_resize` to 1440×900, expand the first accordion item, `browser_take_screenshot` (reference). Repeat navigate/resize/expand-first-item/screenshot for `http://localhost:3000/lessons/topic-02` through `topic-06`. Confirm in each: row title is bold black, sub-heading label(s) inside the expanded body are bold black (not colored, not smaller), body paragraph is black at the larger `text-base` size, and the icon badge is a rounded-square (not a barely-rounded rectangle). Fix any file where a class substitution was missed.

- [ ] **Step 10: Commit.**

```bash
git add src/components/lessons/topic-02/OnboardingScene.tsx src/components/lessons/topic-03/OnboardingScene.tsx src/components/lessons/topic-04/OnboardingScene.tsx src/components/lessons/topic-05/OnboardingScene.tsx src/components/lessons/topic-06/OnboardingScene.tsx
git commit -m "style(accordion): unify topic-02..06 onboarding accordions to topic-01 reference"
```

---

### Task 2: Batch-restyle OnboardingScene accordions — topics 07–12

**Files:**
- Modify: `src/components/lessons/topic-07/OnboardingScene.tsx`
- Modify: `src/components/lessons/topic-08/OnboardingScene.tsx`
- Modify: `src/components/lessons/topic-09/OnboardingScene.tsx`
- Modify: `src/components/lessons/topic-10/OnboardingScene.tsx`
- Modify: `src/components/lessons/topic-11/OnboardingScene.tsx`
- Modify: `src/components/lessons/topic-12/OnboardingScene.tsx`

**Interfaces:** None — pure className edits.

All 6 files share the topic-03/04/05 pattern exactly: badge `rounded-[3px]` at ~L145, row title `font-display font-semibold leading-tight text-fg` at ~L156, sub-heading `text-sm font-display font-semibold ... text-brand-dark mt-3 mb-2.5` at ~L190, body `text-sm leading-relaxed text-fg-muted text-pretty` at ~L198 (topic-12 additionally has a separate `h4` subtitle `font-display font-bold text-base sm:text-lg` at ~L194 — fold it into the same sub-heading treatment as the others, don't keep it as a third distinct style).

- [ ] **Step 1: topic-07.** Badge (`rounded-[3px]` → `rounded-xl`). Title (`font-display font-semibold leading-tight text-fg` → `font-display font-bold leading-tight transition-colors text-black text-base md:text-lg`). Sub-heading (`text-sm font-display font-semibold tracking-wider text-brand-dark mt-3 mb-2.5` → `text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5`). Body (`text-sm leading-relaxed text-fg-muted text-pretty` → `text-base leading-relaxed text-black`, keep `text-pretty`).

- [ ] **Step 2: topic-08.** Same four substitutions, same before/after values, as topic-07.

- [ ] **Step 3: topic-09.** Same four substitutions, same before/after values.

- [ ] **Step 4: topic-10.** Same four substitutions, same before/after values.

- [ ] **Step 5: topic-11.** Same four substitutions, same before/after values.

- [ ] **Step 6: topic-12.** Same four substitutions as the others, PLUS: find the separate `h4` sub-title (`font-display font-bold text-base sm:text-lg`) that sits alongside the sub-heading — merge it into a single sub-heading element using `text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5` (do not leave two visually different heading styles stacked; if the `h4` carries genuinely different text content than the sub-heading label, keep both text strings but give them identical classes so they read as one consistent style, not two).

- [ ] **Step 7: Type-check.** Run: `npx tsc --noEmit`. Expected: no new errors.

- [ ] **Step 8: Visual verification.** With the dev server running, use Playwright MCP to navigate to `http://localhost:3000/lessons/topic-07` through `topic-12` at 1440×900, expand the first accordion item in each, screenshot, and confirm the same four hierarchy checks as Task 1 Step 9 (bold black title, bold black sub-heading, black `text-base` body, `rounded-xl` badge). Pay particular attention to topic-12: confirm there is exactly one visually-consistent sub-heading style per expanded section, not two competing ones.

- [ ] **Step 9: Commit.**

```bash
git add src/components/lessons/topic-07/OnboardingScene.tsx src/components/lessons/topic-08/OnboardingScene.tsx src/components/lessons/topic-09/OnboardingScene.tsx src/components/lessons/topic-10/OnboardingScene.tsx src/components/lessons/topic-11/OnboardingScene.tsx src/components/lessons/topic-12/OnboardingScene.tsx
git commit -m "style(accordion): unify topic-07..12 onboarding accordions to topic-01 reference"
```

---

### Task 3: Restyle TopographyScene.tsx (topic-02) accordion

**Files:**
- Modify: `src/components/lessons/topic-02/TopographyScene.tsx` (~L75–180)

**Interfaces:** None — className edits only.

This is a 3-item accordion for picking a map "view," structurally different from the OnboardingScene pattern (no numbered-step badge/check states — likely an icon or letter badge instead). Current row label uses `text-sm font-display font-semibold text-fg-muted tracking-wider` (an eyebrow-style label) plus a title `font-medium text-sm leading-tight` (~L88–101); body content further down reuses similar `text-sm`/`text-fg-muted` styling.

- [ ] **Step 1: Read the file first.** Open `src/components/lessons/topic-02/TopographyScene.tsx` and locate: the accordion item container, the badge/icon element (if any), the row title element, any in-body sub-heading/eyebrow labels, and the body paragraph(s). Confirm the line numbers above still match — if the file has shifted, use the element roles (not line numbers) to find them.

- [ ] **Step 2: Container and header row.** Apply the Global Constraints container classes (`surface overflow-hidden transition-all duration-300 ease-snap` + active/idle border-and-bg modifiers) and header row classes (`w-full p-4 text-right flex items-center gap-3 relative`) if the current container/header diverges from these (e.g. different padding, no `ease-snap`, different border treatment). If a badge/icon element exists, apply `size-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap` with active/idle color modifiers matching the Reference Standard.

- [ ] **Step 3: Row title.** Change the title element to `font-display font-bold leading-tight transition-colors text-black text-base md:text-lg` (currently `font-medium text-sm leading-tight` — this is the biggest gap: wrong weight, wrong size, no color set).

- [ ] **Step 4: Eyebrow/sub-heading and body.** If there's an eyebrow-style label above/inside content (currently `text-sm font-display font-semibold text-fg-muted tracking-wider`), convert it to the sub-heading treatment `text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5` if it plays a sub-heading role (introduces a labeled section of body content). If it instead plays a purely decorative "eyebrow above the main title" role distinct from any in-body sub-heading, keep it visually subordinate to the main title but still align its color to black (not `text-fg-muted`) for the de-colorizing goal — use judgment based on what the element actually does, and note your reasoning in the task report. Body paragraph(s): `text-base leading-relaxed text-black`.

- [ ] **Step 5: Type-check.** Run: `npx tsc --noEmit`. Expected: no new errors.

- [ ] **Step 6: Visual verification.** With the dev server running, Playwright-navigate to `http://localhost:3000/lessons/topic-02`, resize to 1440×900, locate and expand the TopographyScene accordion (it is a different scene within the topic-02 lesson than OnboardingScene — advance through the lesson flow if needed to reach it), screenshot, and confirm the same hierarchy checks as prior tasks.

- [ ] **Step 7: Commit.**

```bash
git add src/components/lessons/topic-02/TopographyScene.tsx
git commit -m "style(accordion): unify topic-02 TopographyScene accordion to topic-01 reference"
```

---

### Task 4: Restyle LandformsScene.tsx (topic-03) accordion

**Files:**
- Modify: `src/components/lessons/topic-03/LandformsScene.tsx` (~L92–188)

**Interfaces:** None — className edits only.

5-item landform accordion. Current: icon badge `rounded-[3px]` (~L119); title `font-display font-bold leading-tight` with color `text-fg`/`text-brand-dark` depending on state (~L126); three different body sub-headings colored `text-accent-cool`/`text-brand-dark`/`text-status-warn` respectively (~L164, ~L170, ~L176) — this is the most colorful file in the set and the clearest case for the de-colorizing goal; body text `text-sm leading-relaxed text-fg` (~L167, ~L173, ~L179).

- [ ] **Step 1: Badge.** Change `rounded-[3px]` to `rounded-xl` at ~L119, keeping `size-9`/state color modifiers.

- [ ] **Step 2: Row title.** At ~L126, the title already uses `font-display font-bold leading-tight` (weight is correct) but the color is state-dependent `text-fg`/`text-brand-dark` — change to the single reference color `text-black` in all states (drop the `text-brand-dark` active-state color swap; keep `transition-colors text-base md:text-lg` added if not already present).

- [ ] **Step 3: The three body sub-headings.** At ~L164, ~L170, and ~L176, all three currently use different accent colors (`text-accent-cool`, `text-brand-dark`, `text-status-warn` respectively) at `text-sm font-display font-semibold`. Change **all three** to the identical `text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5` — this is the file where per-category color-coding is being deliberately removed in favor of one consistent black/bold sub-heading style, per the request to reduce visual noise. Keep whatever icon/glyph (if any) sits inline with each label; only change the text color and weight classes.

- [ ] **Step 4: Body paragraphs.** At ~L167, ~L173, ~L179: change `text-sm leading-relaxed text-fg` to `text-base leading-relaxed text-black`.

- [ ] **Step 5: Type-check.** Run: `npx tsc --noEmit`. Expected: no new errors.

- [ ] **Step 6: Visual verification.** Playwright-navigate to `http://localhost:3000/lessons/topic-03` at 1440×900, reach the LandformsScene accordion, expand at least two of the five items (to confirm the sub-heading color unification applies consistently across items, not just the first), screenshot, confirm hierarchy checks.

- [ ] **Step 7: Commit.**

```bash
git add src/components/lessons/topic-03/LandformsScene.tsx
git commit -m "style(accordion): unify topic-03 LandformsScene accordion to topic-01 reference"
```

---

### Task 5: Restyle EngineeringScene.tsx (topic-04) accordion

**Files:**
- Modify: `src/components/lessons/topic-04/EngineeringScene.tsx` (~L108–202)

**Interfaces:** None — className edits only.

4-item "modes" accordion. Current: icon badge `rounded-[3px]` size-10 (~L136 — note: `size-10`, not the reference's `size-9`); title `font-display font-bold text-base text-fg` (~L143 — weight already correct, color wrong, missing `md:text-lg`); body has an English-label sub-heading `text-sm font-display font-semibold text-brand-dark` (~L179) AND a separate `h4` sub-title `font-display font-bold text-base sm:text-lg` (~L182 — two different sub-heading treatments stacked, same issue as topic-12); body paragraph `text-sm leading-relaxed text-fg-muted text-pretty` (~L186).

- [ ] **Step 1: Badge.** At ~L136, change `rounded-[3px]` to `rounded-xl`. Also change `size-10` to `size-9` to match the reference badge size exactly (keep this file's existing state color modifiers).

- [ ] **Step 2: Row title.** At ~L143, change `font-display font-bold text-base text-fg` to `font-display font-bold leading-tight transition-colors text-black text-base md:text-lg`.

- [ ] **Step 3: Merge the two sub-heading treatments.** At ~L179 and ~L182, there are two different styles for what should be one sub-heading role (an English-label eyebrow at `text-sm font-display font-semibold text-brand-dark`, and a separate `h4` at `font-display font-bold text-base sm:text-lg`). Collapse both into the single Reference Standard sub-heading class string `text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5`, keeping both pieces of text content if they carry different information (e.g. an English term plus a Hebrew label) but giving them the same visual weight — do not present one as more prominent than the other.

- [ ] **Step 4: Body paragraph.** At ~L186, change `text-sm leading-relaxed text-fg-muted text-pretty` to `text-base leading-relaxed text-black` (keep `text-pretty`).

- [ ] **Step 5: Type-check.** Run: `npx tsc --noEmit`. Expected: no new errors.

- [ ] **Step 6: Visual verification.** Playwright-navigate to `http://localhost:3000/lessons/topic-04` at 1440×900, reach the EngineeringScene accordion, expand at least one item, screenshot, confirm hierarchy checks and confirm the merged sub-heading reads as one consistent style rather than two.

- [ ] **Step 7: Commit.**

```bash
git add src/components/lessons/topic-04/EngineeringScene.tsx
git commit -m "style(accordion): unify topic-04 EngineeringScene accordion to topic-01 reference"
```

---

### Task 6: Restyle CombatNavScene.tsx (topic-06) accordion

**Files:**
- Modify: `src/components/lessons/topic-06/CombatNavScene.tsx` (~L120–220)

**Interfaces:** None — className edits only.

3-item nav-technique accordion. This file is already closest to the reference: icon badge is already `rounded-xl` (~L143, matches — leave as-is). Title uses `font-display font-bold` with state colors `text-fg`/`text-brand-dark` (~L153), plus an extra eyebrow line `text-sm font-display font-semibold text-fg-muted tracking-wider` (~L150) above the title.

- [ ] **Step 1: Row title.** At ~L153, change the color to the single reference value `text-black` in all states (drop the `text-brand-dark` active-state swap), and confirm size classes are `text-base md:text-lg` (add if missing) alongside the existing `font-display font-bold leading-tight`.

- [ ] **Step 2: Eyebrow line.** At ~L150, this eyebrow sits above the title (not inside the expanded body) — it is not the same role as the reference's in-body sub-heading. Per the de-colorizing goal, still align its color: keep it visually smaller/lighter than the main title (it is a genuinely different hierarchy level — a category label above a heading, not a second heading), but change its color from `text-fg-muted` to `text-fg-dim` if `text-fg-muted` is unavailable in that context, or leave `text-fg-muted` if that is the established "tertiary label" token elsewhere in the reference file's non-accordion UI — check `src/components/lessons/topic-01/OnboardingScene.tsx` for how it treats any comparable pre-title eyebrow text and match that treatment; if the reference has no equivalent element, keep this eyebrow's existing muted color and font-size but do not lighten it further, and note this as a judgment call in your report.

- [ ] **Step 3: Body sub-headings and paragraphs.** Locate the expanded-body sub-heading(s) and paragraph(s) in this file (below ~L153, inside the expand panel) and apply the standard substitutions: sub-heading → `text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5`; body paragraph → `text-base leading-relaxed text-black`.

- [ ] **Step 4: Type-check.** Run: `npx tsc --noEmit`. Expected: no new errors.

- [ ] **Step 5: Visual verification.** Playwright-navigate to `http://localhost:3000/lessons/topic-06` at 1440×900, reach the CombatNavScene accordion, expand an item, screenshot, confirm hierarchy checks.

- [ ] **Step 6: Commit.**

```bash
git add src/components/lessons/topic-06/CombatNavScene.tsx
git commit -m "style(accordion): unify topic-06 CombatNavScene accordion to topic-01 reference"
```

---

### Task 7: Restyle LOCScene.tsx (topic-08) accordion

**Files:**
- Modify: `src/components/lessons/topic-08/LOCScene.tsx` (~L104–208)

**Interfaces:** None — className edits only.

3-item "disruption" accordion; the file even has a comment claiming "same pattern as OnboardingScene of every lesson" — it drifted along with the others. Current: badge `rounded-[3px]` (~L134); title `font-display font-semibold leading-tight text-fg` (~L143); sub-heading `text-sm font-display font-semibold ... text-brand-dark mt-3 mb-2.5` (~L189); body `text-sm leading-relaxed text-fg-muted text-pretty` (~L193).

- [ ] **Step 1: Apply the standard four substitutions** (identical pattern to Task 1/2's topic-03..12 files): badge `rounded-[3px]` → `rounded-xl` at ~L134; title `font-display font-semibold leading-tight text-fg` → `font-display font-bold leading-tight transition-colors text-black text-base md:text-lg` at ~L143; sub-heading `text-sm font-display font-semibold tracking-wider text-brand-dark mt-3 mb-2.5` → `text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5` at ~L189; body `text-sm leading-relaxed text-fg-muted text-pretty` → `text-base leading-relaxed text-black` (keep `text-pretty`) at ~L193.

- [ ] **Step 2: Update the stale comment.** The file has a comment stating it matches the OnboardingScene pattern — after this edit that becomes true again; leave the comment as-is if accurate, or fix its wording only if it references specific class values that no longer exist (do not add new comments beyond correcting a factually wrong one).

- [ ] **Step 3: Type-check.** Run: `npx tsc --noEmit`. Expected: no new errors.

- [ ] **Step 4: Visual verification.** Playwright-navigate to `http://localhost:3000/lessons/topic-08` at 1440×900, reach the LOCScene accordion, expand an item, screenshot, confirm hierarchy checks.

- [ ] **Step 5: Commit.**

```bash
git add src/components/lessons/topic-08/LOCScene.tsx
git commit -m "style(accordion): unify topic-08 LOCScene accordion to topic-01 reference"
```

---

### Task 8: Update shared Radix accordion primitive and its sole consumer (BufferScene, topic-11)

**Files:**
- Modify: `src/components/ui/accordion.tsx`
- Modify: `src/components/lessons/topic-11/BufferScene.tsx` (~L174–248)

**Interfaces:**
- Consumes: `@radix-ui/react-accordion` primitives (`Root`, `Item`, `Header`, `Trigger`, `Content`) — unchanged, only their wrapped className defaults change.
- Produces: `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` exports from `src/components/ui/accordion.tsx` — same names, same prop signatures, only default className values change. `BufferScene.tsx` is the only consumer in the repo; no other file's import needs updating.

`src/components/ui/accordion.tsx`'s doc comment already claims it matches the OnboardingScene pattern but currently doesn't: `AccordionItem` uses `surface overflow-hidden transition-colors` (missing `duration-300 ease-snap`); `AccordionTrigger` uses `p-3` (reference is `p-4`) and the lucide `ChevronDown` at `size-[18px] text-fg-dim` with a CSS-only rotate (this can stay — it's a reasonable equivalent to the reference's custom SVG, not a required change, since the plan's constraint is on typography/color, not on swapping icon implementations); `AccordionContent` defaults to `text-sm` and `px-3 pb-3 pt-1 border-t border-brand/20`.

- [ ] **Step 1: Fix `AccordionItem` container classes.** In `src/components/ui/accordion.tsx`, change the `AccordionItem` wrapper's className from `surface overflow-hidden transition-colors` to `surface overflow-hidden transition-all duration-300 ease-snap` (matches the reference's transition treatment; active/idle border-and-bg state classes are applied per-consumer via `className` prop, so no change needed there).

- [ ] **Step 2: Fix `AccordionTrigger` padding.** Change the trigger's `p-3` to `p-4` (keep `text-right flex items-center gap-3 relative` and the existing chevron rotate logic).

- [ ] **Step 3: Fix `AccordionContent` defaults.** Change the content wrapper's default text size from `text-sm` to `text-base`, and its inner padding from `px-3 pb-3 pt-1 border-t border-brand/20` to `px-4 pb-4 pt-1 border-t border-brand/20`.

- [ ] **Step 4: Update the component's own doc comment** if it references the old `p-3`/`text-sm` values specifically (keep the comment's claim that it matches OnboardingScene, since after this task it will).

- [ ] **Step 5: Fix `BufferScene.tsx` title.** At ~L211, change the row title from `font-display font-semibold leading-tight text-fg` to `font-display font-bold leading-tight transition-colors text-black text-base md:text-lg`. At ~L202, check the icon badge — if it uses `rounded-[3px]`, change to `rounded-xl`.

- [ ] **Step 6: Fix `BufferScene.tsx` sub-heading and the three labeled sub-fields.** At ~L220, change the body sub-heading from `text-sm font-display font-semibold tracking-wider text-brand-dark` to `text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5`. At ~L226, ~L232, ~L238, there are three labeled sub-fields currently at `text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-fg-muted`/`text-accent-hover` with `text-sm text-fg`/`text-fg-muted leading-relaxed` bodies — these are a third, even-smaller hierarchy tier not present in the reference (the reference only has heading/sub-heading/body). Treat them as body-level content: change each field's own micro-label to `text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5` (same as the sub-heading treatment, since they play the same "labeled section" role at a smaller scale that the reference doesn't have) and each field's value text to `text-base leading-relaxed text-black`. Note in your report that this collapses a 3-tier hierarchy into 2 tiers to match the reference, since the reference scene never needed a third tier.

- [ ] **Step 7: Type-check.** Run: `npx tsc --noEmit`. Expected: no new errors. Since `accordion.tsx` is a shared component, also grep for any other importer that might be affected: `grep -rn "from '@/components/ui/accordion'" src/` (or the repo's actual import alias) — confirm `BufferScene.tsx` is still the only consumer before committing, so no other scene silently inherits an unreviewed visual change.

- [ ] **Step 8: Visual verification.** Playwright-navigate to `http://localhost:3000/lessons/topic-11` at 1440×900, reach the BufferScene accordion, expand an item, screenshot, confirm hierarchy checks including the collapsed 2-tier structure from Step 6.

- [ ] **Step 9: Commit.**

```bash
git add src/components/ui/accordion.tsx src/components/lessons/topic-11/BufferScene.tsx
git commit -m "style(accordion): unify shared Radix accordion primitive and BufferScene to topic-01 reference"
```

---

## Self-Review Notes (for the plan author, not a task)

- **Spec coverage:** All 16 files identified by research are covered — 11 OnboardingScene siblings (Tasks 1–2), 5 distinct-structure scenes (Tasks 3–7), plus the shared primitive and its consumer (Task 8). Topic-01 itself is the reference and is never modified. The 3 tangential toggle/menu widgets are explicitly excluded in Global Constraints.
- **De-colorizing goal:** Tasks 4 (LandformsScene's 3 differently-colored sub-headings) and 8 (BufferScene's 3-tier micro-label hierarchy) are the two clearest instances of collapsing color-coded/over-tiered styling into the reference's flatter black/bold system, directly answering the "not too colorful, keep one unified line" request.
- **Judgment calls flagged for implementers:** Task 3 Step 4 (eyebrow-vs-subheading role) and Task 6 Step 2 (pre-title eyebrow treatment) are marked as requiring the implementer's read of the actual file rather than a fixed prescription, since research could not pin down their exact current markup — this is intentional, not a placeholder, since the decision rule (match the reference's role-based treatment) is fully specified.
