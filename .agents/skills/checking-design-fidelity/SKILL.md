---
name: checking-design-fidelity
description: Use when writing, editing, or reviewing any styled UI in this Geo9900 repo — new JSX/className, buttons, cards, callouts, headings, spacing, or colors — on the landing page or inside any lesson scene (src/components/lessons/topic-XX). Also use whenever asked to check a section, component, or page for visual consistency with the rest of the site.
---

# Checking Design Fidelity

## Overview

This repo has exactly **two closed typography/color systems** — landing marketing chrome, and lesson-scene content — plus **one shared component/utility layer** both draw from. Every heading, sub-heading, body line, button, card, and color must come from the tables below, copied verbatim or reused via an existing component. Never hand-roll a new size/weight/color/spacing value.

**Scope:** hierarchy, spacing, buttons, colors, font sizes by heading/sub-heading/body. RTL logical-property correctness is a separate concern (AGENTS.md, rtl-qa-reviewer).

## Which system applies

| Location | System | Table |
|---|---|---|
| `src/components/landing/**`, the `/` home route | Landing marketing chrome — `paper/olive/ember/pine/tanline` tokens | Table 1 |
| `src/components/lessons/topic-XX/**` — any heading/sub-heading/body inside a card, accordion, or callout | Lesson-scene content — the **topic-01 reference** (`OnboardingScene.tsx:104-223`) | Table 2 |
| Anything else, or before reaching for raw Tailwind at all | Shared components & utility classes — reuse, don't recreate | Table 3 |

Global invariant (`globals.css`): every `<h1>`–`<h6>` gets `font-display tracking-tight` automatically. Never override the font family on a heading tag.

## Table 1 — Landing marketing chrome

Full source: `design/design-spec.md` §3–4 (has more variants — badge, progress card, lesson-card, utility buttons). Core rows:

| Element | Size / weight / line-height | Real Tailwind class |
|---|---|---|
| H1 hero | 60px / 800–900 / 1.12 | `text-[60px] font-extrabold leading-[1.12] text-olive-ink` |
| Section title (H2) | 22–28px / 700 / 1.2 | `text-2xl sm:text-3xl font-bold text-olive-ink` |
| H3 | ~20px / 700 | `text-xl font-bold text-olive-ink` |
| Hero sub / body (2 lines) | 24px / 600 / 1.4 | `text-2xl font-semibold leading-[1.4] text-olive-soft` |
| Card/lesson subtitle, muted | 14–15px / 400–500 | `text-sm text-olive-muted` |
| Eyebrow / badge chip label | 14–15px / 600 | `text-sm font-semibold text-tanline-badge` (or `.section-eyebrow`, see Table 3) |
| Button label | 18px / 700 | `text-lg font-bold` (color per variant, Table 3) |

**Color mapping — the spec doc's `--token-name` labels are documentation, not class names.** Use the real class:

| Spec doc label | Hex | Real Tailwind class | Usage |
|---|---|---|---|
| `--bg-page` | `#F3E9DC` | `bg-paper-page` | page canvas |
| `--surface-card` | `#F8F2E7` | `bg-paper-card` | feature/lesson cards, pills |
| `--surface-panel` | `#F6EFE6` | `bg-paper-panel` | course-plan panel |
| `--ink-900` | `#38432E` | `text-olive-ink` | H1, titles, primary text |
| `--ink-700` | `#4A5240` | `text-olive-soft` | sub-headline, button labels on light |
| `--ink-muted` | `#8A8873` | `text-olive-muted` | subtitles, muted meta |
| `--accent-orange` | `#D97E2B` | `bg-ember` / `text-ember` | primary accent — action/focus ONLY |
| `--accent-orange-deep` | `#C96714` | `ember-deep` | CTA bottom edge, chevrons |
| `--accent-orange-soft` | `#D69051` | `ember-soft` | active-lesson border, outlined-button border on dark |
| `--dark-card` | `#2E3826` | `bg-pine` / `bg-pine-grad` | progress card |
| `--ring-arc` | `#A3A832` | `olive-ring` | progress arc |
| `--border-tan` | `#DCCDB2` | `border-tanline` | hairlines |
| `--text-on-dark` | `#FDFBF3` | `text-paper-bright` | text on dark card |
| `--badge-text` | `#8A6F4D` | `text-tanline-badge` | badge chip label |

Radius/shadow: cards `rounded-[18-24px]` + `shadow-card-soft`; panel `rounded-3xl` + `shadow-panel-soft`; pine card `shadow-pine-card`; primary CTA `rounded-xl` + `shadow-cta-ember`. Full table: `design/design-spec.md` §6.

## Table 2 — Lesson-scene content (topic-01 reference, verbatim)

Source: `src/components/lessons/topic-01/OnboardingScene.tsx:104-223`, formalized in `docs/superpowers/plans/2026-09-01-accordion-style-unification.md`. This is a **flat, de-colorized** hierarchy — do not color-code by category.

| Element | Exact classes |
|---|---|
| Card container | `surface overflow-hidden transition-all duration-300 ease-snap` — active: `border-brand/45 bg-bg-elevated`; idle: `border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]` |
| Header/trigger row | `w-full p-4 text-right flex items-center gap-3 relative` |
| Icon/number badge | `size-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap` — active: `bg-brand-dark text-bg-elevated border-brand-dark`; idle: `bg-bg-accent text-fg-muted border-border`. **Never `rounded-[3px]`.** |
| **Heading** (row title) | `font-display font-bold leading-tight transition-colors text-black text-base md:text-lg`. Never `font-medium`/`font-semibold`, never `text-fg`/`text-brand-dark`. |
| **Sub-heading** (in-body label) | `text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5`. Never `text-sm`, never `font-semibold`, never colored (`text-brand-dark`/`text-accent-cool`/`text-accent-hot`/`text-fg-muted`). |
| **Body text** | `text-base leading-relaxed text-black`. Never `text-sm`, never `text-fg`/`text-fg-muted`. |
| Content wrapper (inner) | `px-4 pb-4 pt-1 border-t border-brand/20 space-y-3` |
| Chevron | keep the icon; color only — `text-brand-dark` open, `text-fg-dim` closed |

There are exactly **3 tiers**: heading → sub-heading → body. Never add a 4th micro-label tier.

## Table 3 — Shared components & utility classes (reuse before hand-rolling)

| Need | Use | Notes |
|---|---|---|
| Button | `<Button variant="primary\|secondary\|ghost" size="sm\|md\|lg">` (`src/components/ui/Button.tsx`) | primary = `bg-cta-ember` gradient + `shadow-cta-ember`, white bold text; secondary = `border-border bg-paper-bright/70` + `text-fg`; ghost = transparent + `text-fg-muted`. Sizes: sm `h-10 rounded-xl text-sm`, md `h-12 rounded-xl text-[15px]`, lg `h-14 rounded-2xl text-base`. |
| Button, inside a scene not importing the component | `.btn-primary` / `.btn-secondary` / `.btn-ghost` (`globals.css`) | Same visual language as `Button`, CSS-class form. |
| Section heading (h1/h2/h3) | `<SectionHeader as="h1\|h2\|h3" eyebrow title intro bar />` | h1 `text-3xl font-extrabold sm:text-4xl`; h2 `text-2xl sm:text-3xl`; h3 `text-xl` — all `font-display font-bold tracking-tight text-fg`. |
| Card surface | `<SurfaceCard tone="light\|pine">` or `.surface` / `.surface-elevated` | light = white card + `shadow-elevated`; pine = dark gradient panel, `text-paper-bright`. |
| Eyebrow label | `.section-eyebrow` or `<StatusChip tone="badge">` | `text-[11px] font-display font-bold tracking-[0.22em] uppercase text-brand-dark` with a small dot marker. |
| Status/tag pill | `<StatusChip tone="accent\|brand\|neutral\|badge\|dim">` | never build a pill by hand — tone table is closed. |
| Icon in a circle | `<IconBadge tone size="sm\|md\|lg">` | sizes: sm `size-8`, md `size-10`, lg `size-12`. |
| Accordion | `<Accordion>`/`<AccordionItem>`/`<AccordionTrigger>`/`<AccordionContent>` (`src/components/ui/accordion.tsx`) | defaults already match Table 2; only add state classes via `className`. |

## Verification procedure — run before calling any styled element done

1. **Locate the system** using the table above (landing vs. lesson-scene vs. shared-component-first).
2. **Copy classes verbatim** from the matching table or an existing sibling file in the same folder. Never reconstruct a class name from a spec doc's `--token-name` label — check the "real Tailwind class" column first.
3. **Grep before you guess.** Unsure a class/token exists? `grep -n "<name>" tailwind.config.ts src/app/globals.css`. Not found → it doesn't exist, don't write it.
4. **3 tiers max in lesson content**, flat black, per Table 2 — no color-coding sub-headings, no extra micro-label tier.
5. **Diff your final classes against the table row** before finishing. Any mismatch is either a flagged, user-approved exception, or a bug to fix.
6. **Missing value → stop, don't invent. Ask, quoting the source precisely.** Nothing in Table 1/2/3 covers the element (e.g. a heading tier, a color role, or a component type none of the tables describe)? Don't pick a "close enough" default — ask the user in your reply message. The question must quote **the exact first 3 words of the source text you're unsure about, verbatim, and no more** (not the full sentence, not a paraphrase, not your own summary of it) — then state what's undetermined. This keeps the question anchored to the real source instead of your own restatement of it. Alternatively, record the assumption in `design/assumptions.md` if the user says to proceed with a documented guess (matches AGENTS.md: new color tokens require approval).

   Example: a scene has a heading reading `"רמה טקטית — ניתוח..."` and it's unclear whether it's an H2 section title or an in-body sub-heading (Table 2's `text-base md:text-lg` vs `text-[11px] uppercase` eyebrow). Ask: `"רמה טקטית —" is a heading in TopicXXScene.tsx — is this a section title (Table 2 Heading row) or an in-body sub-heading (Table 2 Sub-heading row)?` — not the full heading text, and not a reworded description of it.

## Common mistakes (observed in this repo)

| Mistake | Reality |
|---|---|
| Writing `text-ink-900`, `border-tan`, `bg-surface-card`, `text-ink-muted` | These are the spec doc's documentation labels, not real classes. Real classes: `text-olive-ink`, `border-tanline`, `bg-paper-card`, `text-olive-muted`. |
| Coloring lesson-accordion sub-headings by category (`text-accent-cool`/`text-brand-dark`/`text-status-warn`) | Reference is flat `text-black` for every sub-heading — color-coding was deliberately removed across 8 files in the 2026-09-01 accordion unification. |
| `text-sm` for lesson-content body/sub-heading | Reference size is `text-base` (16px), not `text-sm`. |
| `rounded-[3px]` on an icon badge | Reference is `rounded-xl`. |
| A 3rd/4th text tier (e.g. a tiny uppercase micro-label under a sub-heading) | Collapse into the existing heading/sub-heading/body triplet — the reference never needed a third tier. |
| Mixing `paper-*`/`olive-*`/`ember-*`/`pine-*`/`tanline-*` into a lesson-scene file, or `bg-fg-*` semantic tokens into a landing file | Pick the system per the location table and stay in it — they're additive namespaces, not interchangeable. |
| Guessing at an uncovered case (a heading type, color role, or component none of the tables describe) instead of asking | Ask in the reply message, quoting only the exact first 3 words of the source text — no full quote, no paraphrase. |
