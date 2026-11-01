# Prepared walking in the navigation replay

User requested real movement like the following dead-reckoning exercise, with the next segment prepared while answering. This extends the approved 2026-11-01 replay integration without changing the composition.

## Behaviour

Continue animates departure→enroute and enroute→saddle through the fixed planning example. The source moment and its readings remain until arrival; a dashed estimate on the map follows the same arc-length sample as the camera. The replay is accelerated (2.8–6.5s), at ground height +1.7m, without head bob. Only after arrival does the destination decision become available. A focused Skip to arrival button, reset and timeline navigation can interrupt at any time. Reduced motion and photographed fallback advance directly.

The saddle→fourth moment remains a time cut. Its world is prepared in advance, but animating the westward departure would disclose the correct explanation before the learner evaluates the missing road. True position and route still appear only after correct supporting evidence. No new claim is made about what the navigator can know before checking.

## Preparation and ownership

Three fixed CPU worlds: departure, the shared approach corridor used by both walking segments, and the final station. Duplicate requests share one promise. Preparation is serial, abortable, and yields between small geometry/scatter batches. It starts once the current world is prepared, while the learner reads/answers. Only one world is mounted; outgoing terrain GPU buffers are disposed while typed arrays stay cached for revisits. Unmount aborts builds, disposes results and removes inspection closures.

The horizon and assets are reused. Fine terrain is extended over the approach corridor; detailed vegetation, stones and grass follow a bounded strip along that route, rather than the whole landscape. Departure and corridor use the same clearance and size rules so nearby shrubs do not disappear when walking starts. The shadow map covers the whole corridor and is rendered once per world, not on every walking frame. Rendering stops offscreen and returns to demand rendering at a decision.

Initial download and first-frame loading retain the existing shared ModelLoading behaviour. A very early Continue can still wait for preparation; Skip/reset/timeline remain available. Failed world preparation selects the existing photographed fallback. All sixteen fallback captures are refreshed from the current renderer.

## Verification record

- Initial models 21/21; walking/cache/geometry tests written failing before implementation.
- Fresh review identified cancellation during preparation, stale GPU allocations and inconsistent near vegetation. Each was reproduced with a failing test and corrected.
- Model suite after corrections, including raycast checks against the actual rendered ground: 63/63.
- Full initial browser run: 27/27; additional cancellation and GPU regressions: 2/2 after their observed failures.
- Final static-production browser run: 30/30. Production build/type checking and all 51 static pages pass. The application-question reset test now waits for actual animation-node removal instead of a fixed 450ms; its choice-clearing and keyboard-focus assertions remain unchanged.
- Frame timing in the first prepared transition (Chrome headless, ANGLE D3D11, 1440×1122, DPR1): median 16.7ms, p95 33.3ms in the final run. These are local measurements, not a universal device guarantee. GPU-allocation regression confirms old terrain buffers are released on each world swap/revisit.
- RTL scan: no findings in changed files; 72 existing findings elsewhere remain outside this task.
- Final production evidence and timings: `design/screenshots/navigation-replay-walk-2026-11-01/`.
