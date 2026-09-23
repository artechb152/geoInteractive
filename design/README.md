# design/ — folder guide

Index of how design assets are organized. Docs and images are kept separate; each doc starts with a one-line summary of what it is.

- `docs/` — written specs and notes (Markdown only, no images).
  - `lesson-screen-guide.md` — what counts as one lesson screen, its place in the course hierarchy, and a copyable brief for designing it.
  - `design-spec.md` — pixel-fidelity spec for the homepage (source of truth per `CLAUDE.md`).
  - `design-spec-carousel.md` — spec for the standalone course-plan carousel mockup.
  - `assumptions.md` — running log of visual details that were ambiguous in a mockup, and the assumption made.
  - `qa-checklist.md` — page-by-page design-fidelity QA tracker.
  - `topic03-rock-images.md` — spec for the rock photos needed on the topic-03 geology scene.
- `mockups/` — the approved master mockups (landing page), pixel-sampled for `docs/design-spec.md`: `mockup.png` plus its section crops (`mockup-header.png`, `mockup-hero.png`, `mockup-section-1.png`, `mockup-footer.png`) and `carouselMockUpHomePage.png`.
- `screenshots/` — implementation renders captured for side-by-side diffing against the mockups (not design source).
- `reference/` — **do not reorganize.** Client-supplied reference screenshots per lesson; the visual source of truth for `/reference-to-ui-exact` passes. Filenames are cited by bare name elsewhere (`docs/assumptions.md`, `docs/UI-CONSISTENCY-RECOMMENDATIONS.md`, inline code comments) — see `reference/README.md`.
- `concept-exploration/` — AI-generated exploratory renders and their prompts, not final specs: `geology-mockups/`, `tactical-terrain-mockups/`, `levels-drag/`.
- `blender/` — Blender source files for 3D terrain assets (see `blender/terrain-density/README.md`).
- `video-source/` — source video clips used to build lesson transitions.
