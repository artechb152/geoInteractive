# Homepage map-table verification — 2026-11-11 (map sheet + chapter entry)

Reference for materials, light and perspective: `design/mockups/home-directions-2026-11-11/03-tactile-mission-table-v2-clean.png`. The follow-up brief overrides it on map size, map identity, the navigation art, blank copy zones, the carousel and the hover sub-chapters.
Decisions and assumptions: `design/docs/assumptions.md` → "Map-table homepage — map sheet + chapter entry".

## Visual comparison (browser renders, before → after)

The renders were compared at 1920 × 910, 1440 × 1122, 1440 × 900 and 1366 × 768 after each stage: sheet → card art → layout → hover/focus.

- **Map size:** at 1920 × 910 the old stage was ≈ 1280 px wide on a large felt field. The sheet frame now covers ≥ 85 % of the window at every test size, with the felt as a 2–4 % frame. Cards are 468 u (≈ 425 px at 1920 × 910, 360 px at 1366 × 768). Copy is unchanged in u.
- **Reads as a map:**
  - one continuous sheet folded in quarters (a valley fold, plus a ridge/valley fold), with a straight cut edge and light wear;
  - the stepped top edge is gone;
  - a faded neatline with a graduated border;
  - faded contours only in the quiet upper-left and the wide-frame margins.
- **Clear of folds and marks:** „פרקי הקורס”, the headline and the brand sit on flat, unprinted paper, clear of both folds (asserted).
- **Navigation card:** redrawn with the course's own lesson-6 compass (olive bezel, ivory face, printed scale) on a map in the site's symbology. The dark brass mass and saturated green blotches are gone.
- **Blank copy zones:** every card's number, its rule and its title lines sit on blank card stock:
  - 01: the ridge falls under the title into haze;
  - 02: a flat valley floor;
  - 03: the map is composed around the copy.
- **Hover / focus:** a card-stock slip with the chapter's own sub-chapters rises in the card plane, below the title. Leaving or blurring removes it cleanly.

Screens: `design/screenshots/home-map-table/` (dev) and `design/screenshots/home-map-table-production/` (static export):
- `00-fit-1920x910.png`, `00-fit-1440x1122.png`, `00-fit-1440x900.png`, `00-fit-1366x768.png`;
- `01-default.png`, `02-hover-subchapters.png`, `03-focus-subchapters.png`, `04-reduced-motion.png`.

## Functional verification

`scripts/qa/home-map-table.e2e.mjs` — PASS on the dev server and on the production static export:

- **Chapters and paging:**
  - three public chapters with their links, in RTL order;
  - no arrows, dots or carousel semantics while every chapter is visible.
- **Cards at rest:**
  - square layout boxes, resting at the designed angle;
  - the pointer hits the card link over its whole tilted face, including the number.
- **Blank copy zones:** each card's zone is unmarked on the shipped WebP (pixel check).
- **Fit:** at 1920 × 910, 1440 × 1122, 1440 × 900 and 1366 × 768:
  - the header links, h1, h2 and cards are all inside the viewport, with no scrolling;
  - the sheet is ≥ 85 % of the window;
  - „פרקי הקורס” is ≥ 6 % of the sheet height above the horizontal fold;
  - the h1, h2 and brand are clear of both folds.
- **Sub-chapters:**
  - they equal `lesson-scenes.ts` minus the framing scenes, for each chapter, and are hidden at rest;
  - hover reveals them (with depth), and leaving restores both the pose and the hidden state;
  - Tab focus reveals them, and moving on hides them.
- **Navigation:** one click on a card, even on the slip, opens its chapter; „המשך ללמוד” remembers the last position.
- **Reduced motion:** keeps the pose and the reveal, with no tilt.
- **Errors:** no runtime page errors.

Found and fixed during QA: the upper (far) half of each tilted card sat behind its flat slot in 3D. Hovering or clicking a card's number or title hit the slot instead of the link. The slot now ignores the pointer, and a regression assertion covers it.

## Build

- `tsc --noEmit`: 0 errors.
- `next build` (isolated worktree with the current `src/`): exit 0, 53 static pages; `/` 4.71 kB, first load 116 kB (156 kB before — framer-motion is no longer used on the page). The first attempt failed inside `next/font` while fetching Google Fonts for `src/app/layout.tsx` (a transient network error); the identical rerun passed.
- Shipped art:
  - one sheet per window shape: 388 / 324 / 313 / 392 KiB (only one is downloaded);
  - felt: 209 KiB;
  - chapter faces: 118 / 161 / 96 KiB.

No commit made.
