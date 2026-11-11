# Navigation replay prepared walking transitions

> Execution: native, in the existing isolated worktree, as explicitly requested by the user. Use executing-plans and TDD; review the complete change before delivery.

## Approved brief and rulings

Prepare the next segment while the learner answers, then move through the real terrain on Continue. Keep the approved composition, per-moment answers and 1920×910 fit. Use the existing assets and shared planning geography; no new dependency or service.

- Animate decision-area forward advances depart→enroute and enroute→saddle. Timeline jumps, backwards navigation, reset, reduced motion and static fallback arrive directly.
- Ruling: saddle→after is an intentional time cut, preloaded during the preceding questions. Showing the actual westward turn would reveal the answer; never animate or draw that hidden track before the correct evidence.
- The approach to the saddle is one prepared corridor shared by both walking transitions. Keep only three bounded CPU worlds (initial station, approach corridor, final station); render one world at a time and dispose them on unmount. Preparing geometry/scatter yields to input between batches.
- Short accelerated replay, eye 1.7m over the terrain, no camera bob. A Skip to arrival control and reduced-motion preference bypass travel. Do not animate the wrong route, inflate the measured distance or automatically complete moments.
- Keep source moment/map/reading while walking; switch to the destination only on arrival. Timeline/reset can interrupt. Hide decision actions while travelling and restore focus to the destination prompt on arrival. No initial-loader redesign in this task.

## Tasks

1. Write failing model tests for valid route slices, endpoints/arc-length sampling, hidden fourth transition, bounded deduplicated preparation and disposal; implement pure walk/cache modules.
2. Prepare a detailed approach corridor asynchronously using existing terrain/scatter. Test path coverage, stable world placement, fine ground detail and yielding. Cache next world after the current first frame, not on click.
3. Wire Continue to a cancellable walk, camera/heading/estimated map marker to the same progress, and immediate jump/reduced/static paths. Keep composition and skip/keyboard handling. Add browser regressions that fail on the old code.
4. Verify all old/new model and browser tests, delayed preparation, reset/jump interruption, fallback/reduced motion, production export, 1440/1920 screenshots and representative frame timings. Fresh review; fix meaningful findings; commit task files and fast-forward/push main without disturbing other work.

## Review focus

- Correct terrain underfoot throughout both real route segments; no landmark jumps or frozen frames on arrival.
- Background preparation does not duplicate builds or continue after unmount; repeated travel has bounded resources.
- A quick click can wait/skip safely; failed preparation reaches the existing fallback.
- A stale arrival callback cannot override a timeline jump or reset; keyboard focus recovers.
- Station 4 remains unknowable before its own evidence, including during preparation and transitions.

## Ledger

- Baseline: 21/21 replay model/shared-world tests passing at 2ebb837. Existing native worktree refreshed onto origin/main; branch codex/navigation-replay-walk. Dependencies reused through a local junction; no package changes.
- Tasks 1–3 complete: tests observed RED→GREEN; real walking, cancellation, shared map sampling, skip/focus/reduced-motion/fallback integrated. Full first browser suite 27/27, models 61/61.
- Fresh review: cancellation while preparing retained busy=true; terrain GPU buffers survived swaps; radial/corridor clearance changed nearby shrubs. Reproduced all three (browser timeout, 32 vs31 GPU geometries, mismatched shrub scale), then corrected. Models now 62/62; two browser regressions 2/2.
- Task 4 verification complete: 63/63 models (including real corridor surface raycasts), 30/30 static-production browser tests, production build/type checking and 51 exported pages. Four production screenshots cover movement and arrival at 1440px and full fit at 1920×910. Local motion median16.7ms/p95 33.3ms, DPR1. RTL audit: no changed-file findings (72 existing elsewhere).
- Ruling: the application-question reset test failed because its exiting feedback node can persist beyond its hard-coded 450ms during model warmup. Verified that reset clears the answer and restores focus; test now waits for actual node detachment (3s bound) and retains those assertions. Product question behaviour is unchanged.
- Reviewed and verified for the user-authorized fast-forward delivery to main; final commit/remote verification is recorded in the chat.
