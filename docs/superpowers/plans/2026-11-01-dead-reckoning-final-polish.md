# Dead reckoning: production verification and scanned-stone polish

**Goal:** Verify the exported production activity, then close the remaining visual gap in weathered stone silhouettes, ground contact and the continuous wadi bank.
**Spec:** The user's approved concept 2 (`dead-reckoning-concept-02-mockup.png`) and the visual-polish brief in this chat. Preserve all camera/UI/movement fixes and the current scenario.
**Architecture:** Keep the existing model, scatter, camera and dust pipeline. Replace the angular small/medium stone asset with compact pieces extracted from a CC0 weathered sand-rock scan. Improve bank morphology only if production images confirm the remaining straight-face problem. Production QA uses real UI interactions, never dev placement hooks.

## Constraints and review focus

- No edits to other sessions' dirty files or unrelated lesson sections.
- Existing 64° horizontal FOV, 1.4-second movement, 615-m crossing, visibility and UI remain authoritative.
- The original worktree was created with the native tool but its filesystem is not writable in this turn. Work explicitly in the original checkout, staging only this task's files; publishing main is already authorized.
- Rocks must retain the scenario's coordinate contract, footprint/height bounds and no-obstacle walking corridor.
- No new runtime external requests, production debug globals or synthetic screenshot backgrounds.
- Review contact/burial on slopes, scan UVs/normals, instanced material caching, and production loading/return-to-scene lifecycle.

## Tasks and evidence

- [x] Capture baseline exported-production states through the public UI; check shader/network errors and absence of dev hooks.
- [x] Add an asset-contract test that fails before the rounded scan asset exists; build a reproducible compact asset preserving existing shape names and placement dimensions.
- [x] Integrate the asset and refine ground contact/bank after comparing actual renders; retain existing functional tests.
- [x] Capture final production states, keyboard/reduced-motion smoke and performance; run unit/browser regression, TypeScript and static build.
- [x] Obtain a fresh read-only final review; prepare a commit containing only task files. Publication to main and remote revision are verified in the delivery response.

## Progress

- Baseline: 18/18 dead-reckoning unit tests passed. Initial restricted build could not fetch Google Fonts; network-enabled production build passed.
- Asset research: Poly Haven `sand_rocks_small_01` is a weathered coastal scan (CC0), with naturally rounded sandy stones matching the mockup more closely than the existing fractured scans. Source downloads stay in the uncommitted output workspace.
- Asset contract RED→GREEN: missing asset failed first; generated asset passed. Ten new pieces retain placement bounds, exposed scan UVs and normals; the original rock07 remains. Final GLB is 426,476 bytes versus 1,190,668 for the original asset.
- Ruling: retain the dust curve, visibility, camera and movement unchanged. Improve actual silhouettes, the crossing ramp and surface contrast rather than making the storm thinner. Cost: distant detail remains intentionally obscured.
- Production baseline and final: 18/18 UI-driven checks each, no dev globals and no runtime/shader/network errors; both measured 60 FPS idle. Static build passed all 51 pages in the isolated worktree. Its final static asset was refreshed from the exact tested GLB after rebuilding the boulder.
- Next export resets its internal build directory to `.next` even with a custom export destination. A concurrent root build failed collecting an archive route; moving the production build to the native worktree resolved the cache collision. No application configuration was changed.
- Verification: 19/19 unit/asset checks; 66/66 neighboring unit checks; 141/141 existing browser checks; TypeScript passed. Camera sweep/drag/mid-walk angular projection spread 0.00px; 100 pairs took 1471ms. Clean walking/turning 60 FPS; one first-walk frame reached 83ms during streaming.
- Fresh independent read-only review: no Critical/Important findings. Reviewer inspected actual binary bounds, UVs and unit normals and independently reran 19/19 tests.
- Minor deferred: asset-contract test has broad height bounds, not per-shape footprint assertions. The reviewer checked the actual asset against all ten expected radius/height bounds; future tests could automate that extra guard.
