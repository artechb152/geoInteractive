# UI Fidelity Rules — Geo9900

This project must match the provided visual mockups as closely as possible ("pixel perfect").

## Source of truth

- Master mockup: @design/mockup.png (1402 × 1122 px — desktop design frame; measurements map ≈1:1 to CSS px)
- Written spec with exact values: @design/design-spec.md
- Section crops for close comparison: `design/mockup-header.png`, `design/mockup-hero.png`, `design/mockup-section-1.png`, `design/mockup-footer.png`
- Latest implementation screenshot for diffing: `design/home-implemented-1440.png` / `design/current.png`

## Rules

- Do not invent layout changes.
- Do not simplify the design unless explicitly asked.
- Prioritize visual fidelity over generic best practices.
- Use exact spacing, colors, typography, radius, and shadows from `design/design-spec.md`. Colors there were pixel-sampled from the mockup — never substitute "close enough" Tailwind defaults.
- New color tokens require approval; approved landing tokens (paper/olive/ember/pine/tanline) live in `tailwind.config.ts`.
- Work in small sections: header → hero → features → bottom band. Finish and verify one before starting the next.
- After each implementation stage, render the page (Playwright screenshot at 1440px) and compare side-by-side against the matching mockup crop. Fix deltas before moving on.
- Avoid changing unrelated files.
- If a visual detail is uncertain, document the assumption in `design/assumptions.md` and continue — don't silently guess.

## Hebrew / RTL

- The entire page is RTL: use logical properties/utilities (`ms-`/`me-`/`start-`/`end-`), never `left-`/`right-` absolutes or `text-align: left/right` for content.
- Hebrew text is right-aligned by default; inline-start is the RIGHT side.
- Never mirror maps, diagrams, or illustrations for RTL.
- On SVG `<text>`, always set `textAnchor` explicitly (default anchoring clips labels off-frame under RTL).

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
