# Design Assumptions

Visual details that were uncertain in the mockup and the assumption made while implementing.
Format: one bullet per assumption — what was unclear, what was assumed, where it's applied.

- **Progress source of truth (35% vs 4/12):** the mockup shows 35% but 4/12 = 33%. Implemented one source of truth: `percent = round(completed/12·100)`, so 4 completed ⇒ **33%**. Applied in `src/lib/course-progress.ts` / `ProgressCard`.
- **"Completed lessons" heuristic:** no real completion store exists — only the last-visit tracker (`src/lib/last-visit.ts`). Assumed `completed = lastVisit.topicNumber − 1` (lessons before the one currently visited). Fresh device ⇒ empty state: ring 0%, caption "עוד לא התחלת את הקורס", button "התחלת השיעור הראשון" → topic-01. The mockup's 35%/"4 מתוך 12" was a mid-course sample, not default content.
- **Hero primary CTA label:** stays "המשך ללמוד" always (exact mockup text, no hydration flicker); only the destination is dynamic — last-visited lesson, or topic-01 on a fresh device.
- **"סקירת הקורס" (secondary CTA):** no overview page is implied by the mockup; assumed it scrolls smoothly to the course-plan panel (`#syllabus`).
- **Progress-card button label vs destination:** mockup says "המשך לשיעור הבא" but the correct behavior (per last-visit semantics) is returning to the *last-visited* lesson; kept the mockup label with that destination.
- **Carousel behavior:** mockup shows 5 of 12 lessons with a single chevron at the inline-end (visual left). Implemented paging in windows of 5 (01–05 / 06–10 / 11–12); a back-chevron appears at the inline-start only after paging, so the default view stays pixel-identical. Forward chevron gets a disabled state on the last page.
- **"צפייה בכל השיעורים":** no all-lessons route exists; assumed the pill expands the panel in place to a 12-card grid (label toggles to "הצגה מצומצמת"). No routing added.
- **Lessons 06–12 cards:** no approved display strings in the mockup — titles use `shortTitle` from `src/lib/lessons.ts`, no subtitle. Mini-dioramas use the existing assets `lesson-{06..12}-{los,weather,logistics,chokepoints,urban,borders,gis-layers}.png`.
- **Header utility buttons:** mockup implies actionable buttons but no account/notification system exists. "התראות" opens a popover with an empty state; "החשבון שלי" opens a guest-profile popover with a working "איפוס התקדמות" action (clears last-visit after inline confirmation; hero/carousel/progress update live). Styled with approved tokens only.
- **Interactive-state styling (not in mockup):** hover = slight brightness/`paper-bright` fill lift, active = 1px press, keyboard focus = 2px `ember-soft` ring. Progress ring animates to its value (disabled under `prefers-reduced-motion`).

## Phase 2 — systematizing the Home style across the site (no new HEX)

- **Semantic token remap:** the sitewide semantic tokens (`bg/fg/border/accent`) were re-pointed to the Home design-lock values that already exist in `tailwind.config.ts` — `bg` → paper.page cream, `fg` → olive ink scale, `border` → tanline scale, `accent` → ember scale, `shadow-elevated` → the Home card-soft shadow. Home components use only the `paper/olive/ember/pine/tanline` namespaces, so the Home render is unaffected.
- **Body canvas behind the Home sheet:** `body` background is now cream (`bg-bg` = paper.page), which would have hidden the Home sheet's 40px rounded corners. A fixed `paper-bright` backdrop layer was added behind the sheet in the Home `PageShell` (≈ the previous near-white canvas, existing token) to preserve the sheet-on-canvas read.
- **"White elevated cards" interpretation:** per the reference style, elevated cards stay pure white (`bg-card #FFFFFF`) on the cream page — slightly brighter than the mockup's `paper.card #F8F2E7` inner-panel cards. Hairlines are `tanline` at ~50–60% opacity; card radii keep their existing values (2xl/3xl — within the mockup's 18–24px family).
- **Decorative orange removed from backgrounds:** `TopoField` (hero-strip texture) was rebuilt in the Home contour language — tan `#C9A56B` flowing contour lines at ~0.22 opacity; the V2 sage islands and decorative orange "+" survey marks were dropped (orange = action/focus only).
- **`accent.deep` value shift:** the legacy "palest orange" token now maps to ember.soft `#D69051` (the lightest ember in the approved palette). It stays lighter than `accent.DEFAULT`, so the h1→h3 orange-lightening hierarchy is preserved, just warmer/deeper than the old `#F7CFA0`.
