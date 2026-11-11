# Clean map-table homepage implementation plan

> **For agentic workers:** Execute inline with superpowers:executing-plans. The user's request authorizes implementation of the selected mockup. Do not commit.

**Goal:** Implement the approved clean concept 3 as a working, tactile RTL homepage.

**Architecture:** A homepage-only component and scoped CSS replace the old homepage composition. Decorative background and chapter artwork are separate optimized image assets; every title, button and link is real accessible HTML. Use existing public `lessons` and `useCourseProgress`; preserve lesson and archive components.

**Tech Stack:** Next.js/React, CSS perspective, Framer Motion layout transitions, Playwright.

**Spec:** `design/mockups/home-directions-2026-11-11/03-tactile-mission-table-v2-clean.png` and the user's approval in this chat.

## Global constraints

- No commit. Retain all pre-existing working changes.
- Desktop target 1440 × 1122. Blank paper background; no map markings outside chapter cards, props or benefits grid.
- Exactly the three public chapters, right-to-left, with existing URLs and remembered continue destination.
- Approved image supersedes the old homepage design. Its sampled palette stays local to this component; no global token changes.
- Logical positioning properties; unmirrored artwork; motion disabled with reduced-motion preference.

## Review focus

- Native links must work after ordinary clicks; swipes must not accidentally navigate.
- Keyboard controls, visible focus and carousel status must remain usable.
- Three carousel positions wrap without duplicating chapters; rapid changes must not corrupt order.
- Pointer effects must reset on exit and never run for reduced-motion or touch.
- Images must load from a static export, including a configured base path.

### Task 1: Verify current behavior and create the static visual composition

**Files:** `scripts/qa/home-map-table.e2e.mjs`, `src/app/page.tsx`, new `src/components/landing/home/MapTableHome.tsx`, `MapTableHome.module.css`, `public/assets/home/map-table/*`.

- [x] Write the browser checks first and observe failure on the old homepage.
- [x] Generate standalone decorative assets from the approved reference, with no embedded UI text; optimize for delivery.
- [x] Implement header, quiet paper sheet, headline and three linked illustrated cards. Reuse current lesson data.
- [x] Capture at 1440 × 1122 and correct measured visual differences against the approved image.

### Task 2: Implement and exercise interaction

- [x] Add wrapped arrow/dot/keyboard/swipe navigation with exactly three links.
- [x] Add subtle cursor-responsive card tilt, lift, light and shadow; reset on pointer exit.
- [x] Connect the continue link to existing remembered progress.
- [x] Verify reduced motion, focus, navigation, image loading, bounds and no page errors; capture rest, selected and hover states.

### Task 3: Verify and review

- [x] Run browser checks, TypeScript and a static production build where available.
- [x] Request an independent scoped review and fix actionable findings.
- [x] Record visual assumptions and verification results. Leave all changes uncommitted.

## Completion evidence

- Browser suite passed against both development and the final static production export, including square-card measurements and chapter-link keyboard focus retention.
- `tsc --noEmit --pretty false --incremental false`: exit 0.
- Final `next build`: exit 0; all 53 pages generated. Homepage route 4.25 kB / first load JS 155 kB.
- Four WebP images total 736,318 bytes; PNG generation originals are not shipped.
- Independent read-only review: no important/critical issues. Replaced the card-copy span with a div; added focused-link keyboard regression assertions.
- Final screenshots: `design/screenshots/home-map-table-production/` (default, selected, hover, reduced motion).
- Local production preview: `http://127.0.0.1:4176/`. No commit, merge, or publication performed.
