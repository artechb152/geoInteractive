# Navigation replay: integrated planning geography and desktop polish

This follow-up supersedes the separate-world and 1027px layout sections of `navigation-replay-spec-2026-10-29.md`. User authorized implementation on 2026-11-01.

## Geography and teaching

`replayGeography.ts` adapts `planningLabState.exampleNodes()` into replay map units. E=x+500, N=600-z in world metres; north is unchanged. The replay uses the fixed example, not the learner's freely edited route. Both screens say this explicitly. The main stream, ravine, road, summits, woodland and orchard use the lab's actual data.

All replay ground heights now call `planningLabTerrain.heightAt`. Both the analytic surface classification and cached station grids include the main stream **and** ravine. Contours trace this shared ground; small visual microrelief remains below one contour interval. The replay's map and live view show the same tree locations and crown dimensions as the lab.

Route estimates are rounded to 50m from actual polyline lengths (about 400m stream→saddle and 450m saddle→road), rather than retaining the old world's 550/600m. The second observation is at 20% of the stream→saddle leg, where both summit centres fit in the opening view. The camera looks between them, rather than at the straight-line bearing alone.

The fourth true station follows the same travelled distance on a heading 50° west of the plan. It stands south of the western summit: the ridge hides the expected northern road. The model tests check road distance and terrain occlusion. Missing a sign is a reason to check; it is not proof of where the navigator actually stands. The true track remains hidden until correct supporting evidence. Existing per-moment state and retry behaviour remain intact.

## Composition

The four-moment timeline shares the top row with reset/counter, giving the full lower width to the decision and feedback. The view/map row is 370 reference px high; body copy stays 16px. Story and field readings use compact inline labels. A stable 160px decision reserve avoids resizing between states.

Measured at 1920×910: complete screen y=104..874.5 (770.5 reference px), with the saddle's longer field reading reaching y=878.5 (774.5px). Every decision/evidence/debrief/summary state is checked, not just the initial buttons. Screenshots also cover 1440×1122 and 1366×768.

The zoom dial is projected to a constant **80° horizontal** opening at every frame aspect, including fullscreen; this avoids the old widening when the frame gets shorter. A regression test checks horizontal and vertical summit framing at both observation stations.

## Rendering

Shrub habitat has real clearings and coherent dense patches instead of a uniform probability floor. Crowns have asymmetric lobes, per-instance aspect variation and a wider size range. Loose rocks are more clustered, with less aggressive whitening of scanned albedo. Ground colours have more muted herb variation. Textured branch-card tree crowns and trunks occupy the shared lab landmark positions. Assets remain local; no new runtime service or dependency was added.

All sixteen fallback photos are regenerated from these stations, with the corrected field of view and terrain. The capture waits for the intended station's renderer, not merely a ready flag left over from the previous station.

## Review and evidence

Fresh review identified opening summit framing, the cached ravine mask, and a clipped stream fix marker. Each received a failing regression test before its correction. The map crop now includes the entire fix ring.

Final verification on the branch including main at `124caef`: 53/53 model tests, 24/24 browser tests on the dev server, 24/24 on the static export, and a successful production build with type checking and 51 exported pages. The nine production screenshots explicitly assert the renderer stays live. The RTL audit has no findings in changed files; 72 existing findings elsewhere are outside this change.

Relevant commands:

```
node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs --test scripts/qa/navigation-replay.test.mjs scripts/qa/navigation-replay-shared-world.test.mjs scripts/qa/planning-lab.test.mjs
node --test --test-concurrency=1 scripts/qa/navigation-replay.e2e.test.mjs scripts/qa/navigation-replay-fit.test.mjs scripts/qa/planning-tips.test.mjs
node scripts/qa/capture-navigation-replay-fallback.mjs
node scripts/qa/shot-navigation-replay-polish.mjs
```

Browser scripts accept `QA_BASE`. Screenshot evidence is in `design/screenshots/navigation-replay-polish-2026-11-01/`.

Builds and dev servers must run serially on this checkout. The package-wrapper attempted a local install; using the local installed Next CLI consistently resolved duplicate-runtime/build-cache errors. No package manifest, lockfile or package-manager policy change belongs to this feature.
