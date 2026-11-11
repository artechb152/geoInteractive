# UI Fidelity Rules — Geo9900

This project must match the provided visual mockups as closely as possible ("pixel perfect").

## Source of truth

- Lesson screen definition and planning template: `design/docs/lesson-screen-guide.md`. Read it when designing or implementing a specific lesson screen.

- Master mockup: @design/mockups/mockup.png (1402 × 1122 px — desktop design frame; measurements map ≈1:1 to CSS px)
- Written spec with exact values: @design/docs/design-spec.md
- Section crops for close comparison: `design/mockups/mockup-header.png`, `design/mockups/mockup-hero.png`, `design/mockups/mockup-section-1.png`, `design/mockups/mockup-footer.png`
- Latest implementation screenshot for diffing: `design/screenshots/home-implemented-1440.png` / `design/screenshots/current.png`

## Rules

- Do not invent layout changes.
- Do not simplify the design unless explicitly asked.
- Prioritize visual fidelity over generic best practices.
- Use exact spacing, colors, typography, radius, and shadows from `design/docs/design-spec.md`. Colors there were pixel-sampled from the mockup — never substitute "close enough" Tailwind defaults.
- New color tokens require approval; approved landing tokens (paper/olive/ember/pine/tanline) live in `tailwind.config.ts`.
- Work in small sections: header → hero → features → bottom band. Finish and verify one before starting the next.
- After each implementation stage, render the page (Playwright screenshot at 1440px) and compare side-by-side against the matching mockup crop. Fix deltas before moving on.
- Avoid changing unrelated files.
- If a visual detail is uncertain, document the assumption in `design/docs/assumptions.md` and continue — don't silently guess.

## Hebrew / RTL

- The entire page is RTL: use logical properties/utilities (`ms-`/`me-`/`start-`/`end-`), never `left-`/`right-` absolutes or `text-align: left/right` for content.
- Hebrew text is right-aligned by default; inline-start is the RIGHT side.
- Never mirror maps, diagrams, or illustrations for RTL.
- On SVG `<text>`, always set `textAnchor` explicitly (default anchoring clips labels off-frame under RTL).

## 3D performance (mandatory for every 3D change)

Every 3D model must stay smooth on weak hardware (an integrated Intel UHD 630, a browser drawing without the GPU) and look exactly as designed on a strong GPU. Performance is part of implementing a 3D model, not a later task. Guide: `design/docs/3d-performance.md`.

- Draw through the shared system: `QualityCanvas` (`src/components/three/QualityCanvas.tsx`) for every react-three-fiber canvas, `QualityComposer` for post-processing, `hasWebGL()` (`src/lib/webgl-support.ts`) for the WebGL check. A raw `<Canvas>`, `EffectComposer` or `getContext('webgl…')` needs a written reason next to it (`// perf-3d-allow(<rule>): <why>`).
- Pick the model's `profile`: `interactive` (default, drawn on demand), `static`, or `animated` (only when it really moves on its own; prefer `animating={playing}`). Give it a unique `name` and register it in `scripts/perf/scenes-3d.mjs`.
- One owner per renderer setting: never set the pixel ratio (`setDpr`, drei `AdaptiveDpr` / `PerformanceMonitor`, `regress`) or the frameloop yourself. Leave `shadowCache` on unless the model schedules its own shadow updates.
- No needless per-frame work: no allocations, React state updates or unconditional `invalidate()` inside `useFrame`; ask for frames only while something moves (animate DOM overlays with CSS). Attach pointer handlers only where used and give large meshes a BVH. Build geometries, materials and textures once (stable `useMemo`, no inline `<Line points={[…]}>`); memoise the scene component so a live value does not re-render the R3F tree every frame. Dispose what you create, never shared/cached resources.
- Never lower visual quality on a strong GPU to win a benchmark (no geometry thinning, no removed effects); weak hardware adapts through the shared system.
- Verify every 3D change: `npm run check:3d` (also part of `npm run build`), then on a production build `npm run perf:3d -- --scenes=<name> --shots=<dir>` — at rest and off-screen a non-animated model draws 0 fps; draw calls, triangles and shadow passes do not grow; screenshots at the same camera match the previous build. Simulated weak hardware (`--gpu=sw`, `--cpu=4`, `--tier=low`) is not proof for a real UHD 630 — say so when reporting.

## Target viewport

- Desktop: **1440px width** — this is the only target until desktop is pixel-accurate.
- The design frame is ~1400px, so at 1440px the mockup maps ≈1:1; effective content width ≈ 1290px, centered.
- First make desktop match the mockup at 1440px. Do not optimize for mobile yet.
- Mobile/responsive behavior: only after desktop is signed off, as a separate task.

## Verification loop

1. Implement one section.
2. Screenshot at 1440 × 1122 (Playwright MCP, `browser_resize` then `browser_take_screenshot`).
3. Compare against the mockup crop for that section.
4. List concrete deltas (px offsets, wrong color, wrong weight) and fix them.
5. Only then move to the next section.
