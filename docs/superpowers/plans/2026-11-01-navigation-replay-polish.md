# Navigation replay integration and polish

Goal: one geography with the planning lab, a complete screen within 1920×910, and more natural close-range terrain, delivered to origin/main.

Approved scope: user accepted the three follow-up recommendations on 2026-11-01. Preserve the four learning moments and existing local work outside this branch.

Architecture: adapt the planning lab's example route and height grid into replay coordinates. Reuse the replay renderer and state machine. Share geography rather than changing either lesson's world. Recompute distances, camera stations, contours and road visibility from the shared world. Regenerate fallback captures after visual approval.

## Tasks

- [x] 1. Shared world: write failing integration tests against the planning lab height/route; implement a replay adapter and update scenario/map; verify road-missing fairness and existing reducer tests.
- [x] 2. Screen fit: add a failing 1920×910 browser assertion for the longest decision states; consolidate heading, information and timeline, place decision text and actions beside each other in a stable full-width footer, preserve generous terrain and readable body text; compare 1440×1122 and shorter desktop screenshots.
- [x] 3. Visual polish: cluster vegetation and exposed rock with deterministic habitat variation and shape variation; align terrain colour and detail. Inspect all stations, regenerate same-world fallbacks, run typecheck/build and targeted browser/model regressions.
- [x] 4. Fresh whole-branch review and corrections; only task paths included for the authorized fast-forward delivery to main. Delivery commit and remote verification are reported in the chat.

## Review focus

- No mismatch between example route, replay contours and rendered terrain.
- Road absence is due to geography, not FOV or broken assets; feedback does not claim a specific cause without evidence.
- The longest feedback and summary fit without hiding controls or changing text scale between states.
- Free planning edits are not misrepresented as the replay's fixed example.
- Every fallback matches the new station and preserves equivalent evidence.

## Progress / rulings

- Baseline: navigation-replay.test.mjs 13/13 passing before changes.
- Isolation: native worktree created but shell access was denied; using project-local .claude/worktrees/navigation-replay-polish, branch codex/navigation-replay-polish. Main's unrelated modifications remain untouched.
- Ruling: old 500/550/600/500 metre distances belong to the replaced world; use measured distances on the lab's fixed example, and update copy/tests consistently.
- Fresh review: corrected summit framing, the cached ravine surface mask and the map's clipped stream fix ring; all three regressions were observed failing before correction.
- Verification: 53 model/integration tests passed; 24 browser tests passed on the dev server and 24/24 on the static production export; production build/type checking and all 51 static pages passed after incorporating origin/main at 124caef.
- Visual evidence: nine production screenshots at 1920×910, 1440×1122 and 1366×768; every capture asserts a live renderer. Complete 1920px screen is 770.5px high (774.5px at the saddle), starting at y=104.
- RTL audit: no findings in changed files; the repository-wide audit still reports 72 pre-existing findings elsewhere.
