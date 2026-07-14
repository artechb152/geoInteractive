# HookScene (topic-02) — Implementation Plan

Goal: restructure `HookScene.tsx`'s JSX/Tailwind classes to match `hook-design-spec.md`,
while keeping every existing string, the `learn:next` dispatch, and the component's
public shape (`export function HookScene()`, no new props) exactly as-is.

## What stays 100% unchanged

- `'use client'`, the `HookScene` export signature.
- All real Hebrew copy: the two headline lines (incl. the `<span>` around "מילימטר"),
  the full body paragraph text, and `"לחץ כדי להתחיל"`.
- The CTA `<button type="button" onClick={() => window.dispatchEvent(new CustomEvent('learn:next'))}>` — same event name, same dispatch mechanism, same `aria-label="התחל את השיעור"`.
- `id="scene-hook"` on the root `<section>` (PagedLearn's `isHook` check and hash routing depend on this id/slug).

## What changes

1. **Root layout**: replace the single centered `motion.div` (`text-center max-w-5xl
   mx-auto`) with a 2-column grid: `grid lg:grid-cols-[1.05fr_1fr] items-center gap-10
   xl:gap-16` inside a `max-w-[1290px] mx-auto w-full px-6` wrapper — matching the
   project's home content-width convention (also documented in root `CLAUDE.md`, reused
   here since it's the same "effective content width ≈1290px centered" rule already
   applied site-wide). Below `lg` the two columns stack (illustration below text) since
   we are not touching mobile layout yet beyond "don't break it".
   - First DOM child = text column (renders inline-start/right under RTL).
   - Second DOM child = illustration column (renders inline-end/left under RTL).

2. **Text column** (`text-end`/right-aligned container):
   - New: numeral block — `<div className="text-center ...">02<DividerStar /></div>` —
     centered independently of the (right-aligned) paragraph text below it, per spec §1.
   - Headline: same two text nodes/`<span>`, swap `text-center` → right-aligned
     (`text-end`), keep the `<br/>` line break as-is (it's part of existing markup).
   - New: small centered accent rule (`<hr>`-style `<div>`) under the headline only.
   - Body paragraph: same text, right-aligned instead of centered, `max-w` constrained to
     the column instead of `max-w-3xl mx-auto`.
   - CTA: wrap in a `flex items-center gap-3` row with the **arrow rendered before the
     label** in DOM order (per spec §1, the arrow sits at the visual inline-start/right of
     the label) — a small hand-drawn inline `<svg>` arrow (line + arrowhead), not a lucide
     icon (avoids any icon-flip assumptions, and matches the mockup's plain custom glyph).
     Button itself keeps its existing `onClick`/`aria-label`; only the internal markup
     (icon + label) and outer classes (drop the pill/fill `bg-accent` button chrome, mockup
     shows a plain text+arrow link, no button background) change.

3. **Illustration column**: replace the full-bleed `BackdropMap` (currently an
   absolutely-positioned full-section background) with two pieces:
   - A new `SurveyGridIllustration` component — an inline SVG (viewBox roughly square)
     containing: a faint background contour-line group (adapted from the existing
     `BackdropMap` contour-path technique, so the visual language of "faint topo lines"
     carries over rather than being invented from scratch), a full-bleed crosshair with
     tick marks (`stroke-fg-dim`), a `rotate(...)` tilted dashed grid (`stroke-accent`
     at reduced opacity) with small tick dots at intersections, a thin ring at the
     center, and the two "true vs measured" center dots (`fill-fg` + `fill-accent`,
     offset by a few px, with a subtle pulse on the orange one reusing the existing
     `motion.circle` pulse pattern already in this file).
   - This replaces `BackdropMap`'s role as full-section background with a **contained,
     column-scoped illustration** (sized to its own column, not spanning the whole
     viewport) — this is the fix for the "don't make this a landing Hero with a big
     illustration spanning everything" constraint: the illustration lives inside its own
     grid column at a bounded size, not as a full-bleed backdrop layer.
   - Keep a very subtle full-section faint background wash (page texture) if needed for
     continuity, but no giant illustration mass beyond its column.

4. **Numeral source**: hardcoded literal `"02"` (topic-02's own hook scene; not derived
   from a prop/context — this file has no lesson-number prop today and adding a context
   dependency (`LessonNavContext`) is unnecessary complexity/risk for a component that
   only ever renders for lesson 2).

5. Remove the old `BackdropMap` function (fully superseded by `SurveyGridIllustration` +
   optional faint wash) — dead code would otherwise remain unused and confuse future
   edits; nothing else in the file references it.

## Verification checklist (mirrors the mockup-to-design skill's checklist)

- [ ] `learn:next` still dispatches on the same button, lesson still advances to onboarding.
- [ ] All real Hebrew text strings byte-identical to the original file (diff the text nodes).
- [ ] No new npm dependency; no edits outside `HookScene.tsx`.
- [ ] Only `fg`, `fg-muted`, `fg-dim`, `bg`, `accent`, `accent-hover`, `border`/`border-strong`
      tokens used — no new hex.
  - [ ] RTL: no `left-`/`right-` literals, no mirrored diagram, explicit `textAnchor` if any
      SVG `<text>` is added (current plan uses no SVG text, only shapes/lines).
- [ ] 3 rounds of 1568×1003 screenshots vs. the mockup, deltas listed and fixed each round.
