---
name: mockup-to-design
description: Implement or update UI to pixel-match a reference mockup image (design/mockup.png, design-references/**, or any image the user attaches) using this project's fidelity loop — narrow scope, section-by-section build, Playwright screenshot compare, exact design-spec tokens, RTL correctness. Use whenever the user hands over a mockup/screenshot and asks to build, redesign, or align a UI section to it.
argument-hint: "[mockup path or short description of the target section]"
metadata:
  author: project
  version: "1.0.0"
---

# Mockup → Design

Turns a reference image into pixel-accurate code in this repo, without scope creep or drift from the visual reference. This is the same discipline documented in root `AGENTS.md` under "UI Fidelity Rules," generalized so it applies to any mockup — the landing page, a single lesson scene, a widget — not just `design/mockup.png`.

## When to use

- The user attaches or points to a reference image (a full page mockup, a section crop, a screenshot of a redesigned component) and asks to build or align code to it.
- The user asks to "redesign" or "restyle" an existing interactive component from a picture, while keeping its behavior identical.
- Any follow-up pass to fix visual deltas against a mockup that's already partially implemented.

Not for: designing a mockup from scratch with no reference image (use `ui-ux-pro-max` / `design` instead), or pure copy/content edits (use `hebrew-copy-editor`).

## 0. Establish scope before touching code

Read the request literally and find the tightest possible boundary:

- Which exact component/section is being redesigned? Find it by reading the code, not guessing from the filename — for scenes under `src/components/lessons/topic-*/`, locate the specific sub-component (e.g. a single practice widget inside a larger scene), not the whole scene file.
- What must NOT change? Default assumption: everything except the visual layer — IDs, data structures, handlers, drag/drop or keyboard-alternative mechanisms, scoring/validation logic, copy text, unrelated sections (headers, sidebars, nav) are all off-limits unless explicitly named in the request.
- Before writing any code, read the component's full existing logic and enumerate its interactive/visual states (idle, hover, focus, selected, dragging, drop-target, correct/wrong/error, disabled, empty/loading) — the redesign must cover every state that exists today, not just the resting one shown in the mockup.

If the request and the mockup conflict on scope (e.g. the image shows surrounding chrome that isn't part of the ask), keep the narrower scope and say so rather than silently expanding the diff.

## 1. Identify the source of truth

- Full-page/landing work: `design/mockup.png`, `design/design-spec.md`, section crops in `design/`, latest render in `design/home-implemented-1440.png` / `design/current.png`.
- Any other section/lesson: whatever image the user provided this turn (check `design-references/<topic>/` first — mockups are frequently dropped there before being referenced).
- If there's a written spec (`design/design-spec.md` or equivalent), it wins over eyeballing the PNG for exact values — spacing, hex, radius, shadow. If there's no spec for this particular mockup, read pixel values/proportions directly off the image and cross-check against `tailwind.config.ts` tokens below.

## 2. Use existing tokens — never invent new ones

Colors, shadows, and gradients in this project are pixel-sampled and centralized in `tailwind.config.ts` (`bg`, `fg`, `accent`, `brand`, `terrain`, `status`, and the landing-redesign namespaces `paper`, `olive`, `ember`, `pine`, `tanline`) plus the component classes in `src/app/globals.css` (`.surface`, `.chip`, `.btn-primary`, etc.). Match a mockup color/shadow/radius to the closest existing token — do not eyeball a "close enough" Tailwind default and do not add a new hex value without calling it out to the user first (new tokens require approval, same as the root AGENTS.md rule).

## 3. Build in small, verifiable sections

Don't implement the whole target in one pass. Break it into the same visual chunks the mockup implies (e.g. header → hero → features → footer, or for a single widget: static layout → interactive states → edge cases), and after each chunk:

1. Render the page (Playwright MCP: `browser_navigate` to the right route/hash, `browser_resize` to 1440×whatever the mockup frame implies, `browser_take_screenshot`).
2. Compare side-by-side against the matching mockup/crop.
3. List concrete deltas — px offsets, wrong color/weight, spacing, misaligned grid — not vague impressions.
4. Fix before moving to the next section.

For components with dynamic/interactive states not visible in the resting mockup screenshot (drag, hover, drag-over, submitted correct/wrong, etc.), simulate the state and screenshot it too — don't ship a state you haven't looked at. Native HTML5 drag-and-drop can be exercised in Playwright either via `browser_drag`, or by dispatching synthetic `dragstart`/`dragover`/`dragend` `DragEvent`s through `browser_evaluate` when you need to freeze a mid-drag frame for inspection.

## 4. RTL correctness (whole project is RTL)

- Logical properties/utilities only: `ms-`/`me-`/`start-`/`end-`, never `left-`/`right-` or `text-align: left/right`.
- Never mirror maps, diagrams, illustrations, or icon meaning (e.g. RTL "forward" chevrons point left — that's correct, don't auto-flip them).
- Any inline SVG `<text>` must set `textAnchor` explicitly — the default anchor clips labels off-frame under `dir="rtl"`. This is a recurring bug in this codebase; check it every time you touch SVG text.

## 5. Uncertain visual details → don't silently guess

If a value in the mockup is ambiguous (unclear exact color, unstated hover/focus/error state, ambiguous spacing), write the assumption down in `design/assumptions.md` and proceed — don't block on it, don't invent it without a trace.

## 6. Verification checklist before calling it done

- [ ] Rendered at the target viewport and screenshot compared against the mockup (resting state).
- [ ] Every interactive state that existed pre-redesign still exists and has been visually exercised (not just coded) — hover, focus, selected, dragging, drop-target, correct/wrong, disabled, empty.
- [ ] Underlying mechanism unchanged: same event handlers, same state shape, same IDs, same a11y/keyboard-alternative path, same validation/scoring logic — only the styling layer moved.
- [ ] No new color/shadow/radius tokens introduced without flagging them.
- [ ] RTL: logical properties only, no mirrored diagrams, explicit `textAnchor` on any touched SVG text.
- [ ] Diff is scoped to what was asked — no incidental changes to headers, nav, sidebar, copy, or unrelated sections.
- [ ] `tsc --noEmit` (or the project's equivalent) is clean on touched files.
- [ ] Any leftover test artifacts (screenshots, scratch files) cleaned out of the repo root — write those to the scratchpad, not the working tree.
