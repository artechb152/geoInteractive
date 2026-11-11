# 3D performance — how every model in the course stays smooth

The course's 3D models must run smoothly on a weak machine (an integrated Intel UHD 630, a laptop on
battery, a browser drawing without the GPU) **and** look exactly as designed on a strong one. This is
done by one shared system that every model draws through, plus a few rules for the code inside a
model. `npm run check:3d` enforces what can be checked on the source (and runs in `npm run build`);
`npm run perf:3d` measures the rest in a browser.

## The shared system

| Piece | What it does |
|---|---|
| `src/components/three/QualityCanvas.tsx` | The only react-three-fiber `<Canvas>`. Draws on demand or every frame by **profile**, pauses off-screen, owns the pixel ratio (adaptive while moving, full at rest, `pixelBudget` supersampling), caches shadow maps, never redraws on scroll. |
| `src/components/three/QualityComposer.tsx` | The only `<EffectComposer>` (post-processing). Keeps every pass at the canvas's current pixel ratio. |
| `src/lib/webgl-support.ts` | `hasWebGL()` — one WebGL probe per page, its context released at once. |
| `src/lib/gpu-tier.ts` | `gpuTier()` — `high` / `low` (integrated) / `software` (no GPU). Override for QA: `?gpu=high\|low\|software`, `?gpu=auto` clears it. |
| `scripts/check-3d.mjs` | `npm run check:3d` — the source rules below. |
| `scripts/perf/bench-3d.mjs`, `scenes-3d.mjs` | `npm run perf:3d` — the browser benchmark of every model. |

What a model gets without asking:

- **No needless frames.** `profile="interactive"` (the default) draws on demand: OrbitControls, tweens
  and React prop changes invalidate. A model at rest draws nothing.
- **Off-screen pause** for every profile (and `paused` for the host's own rules, e.g. a hidden step).
  The first frame is drawn even off-screen, so the model is built before it scrolls in.
- **Adaptive resolution.** Frames drawn back to back while something moves (a damped orbit, an
  animation, a drag) are timed; below ~28 fps the pixel ratio steps down (to 0.6 at most), above ~50 it
  climbs back. Frames paced by the input (a slow drag) or held up by JavaScript are not the GPU's pace
  and are not counted — **a fast GPU never steps down**. A model at rest is always drawn at full
  resolution.
- **GPU tiers.** `low` starts moving frames at a pixel ratio of 1; `software` gets no MSAA, starts at
  0.75 and rests at 1 at most. `high` is never changed.
- **Shadow cache** (on for `static` / `interactive`): shadow maps are redrawn only when a caster or a
  shadow light changes, not on every frame of an orbit.
- **No redraw on scroll** (R3F re-measures the canvas on scroll by default; QualityCanvas turns it off).
- **A closed canvas is let go.** three hangs a `dispose` listener of the renderer on every texture,
  geometry and material it draws, and never takes it off; a resource that outlives the canvas (three's
  own empty textures, a module-level cache) then keeps the old renderer, its context, the canvas and the
  section's DOM alive after every visit. QualityCanvas notes the listeners its renderer adds and removes
  them when the canvas closes.
- **High-performance GPU** asked for (a dual-GPU laptop's discrete card).
- `data-scene`, `data-profile`, `data-gpu-tier` on the canvas, for QA and the benchmark.

## Making a new 3D model

```tsx
import { QualityCanvas } from '@/components/three/QualityCanvas';
import { LESSON_FIT_CANVAS_RESIZE } from '@/components/lesson/LessonViewportFit';

<QualityCanvas
  name="my-model"                 // unique; add it to scripts/perf/scenes-3d.mjs
  profile="interactive"           // 'static' | 'interactive' | 'animated' — see below
  paused={!active}                // optional: the host's own visibility (a hidden step)
  dpr={[1, 2]}
  resize={LESSON_FIT_CANVAS_RESIZE} // inside a LessonViewportFit
  shadows={{ type: THREE.PCFShadowMap }}
>
  …
</QualityCanvas>
```

1. **Pick the profile.**
   - `static` — nothing moves for long (a figure that changes only when the lesson steps). Always full
     resolution.
   - `interactive` — the default: the learner turns it, steps it, hovers it. Drawn on demand.
   - `animated` — it moves on its own all the time (wind, a walker, a running vehicle). Drawn every
     frame while on screen. Prefer `interactive` + `animating={playing}` when the animation stops.
   - `moving={dragging}` — the view changes without the camera moving (a dragged handle, a morph
     scrubbed by a slider): drawn every frame, at the moving resolution, while true.
2. **Shadows.** Leave `shadowCache` on unless the model schedules its own shadow updates
   (`shadowMap.autoUpdate = false`) or animates shadow casters inside a shader — then
   `shadowCache={false}` with a comment saying why.
3. **Post-processing** goes in `<QualityComposer>`.
4. **WebGL support / fallback**: `hasWebGL()` from `@/lib/webgl-support`, never your own probe canvas.
   Without WebGL: the static still, no loader (see CLAUDE.md "3D models (loading)").
5. **Register it** in `scripts/perf/scenes-3d.mjs` (path, sub-topic, the clicks that show it), then run
   `npm run check:3d` and `npm run perf:3d -- --scenes=my-model` on a production build.

## Rules for the code inside a model

Checked by `npm run check:3d` (exceptions below):

| Rule | Why |
|---|---|
| `raw-canvas` — no `<Canvas>` from `@react-three/fiber` outside `src/components/three` | everything above is lost |
| `raw-composer` — no `EffectComposer` outside `src/components/three` | passes keep rendering at the old resolution |
| `webgl-context` — no `getContext('webgl…')` outside `webgl-support.ts` | each probe is a driver round-trip; unreleased ones count against Chrome's ~16 live contexts (the oldest, maybe a model's, is lost) |
| `own-dpr` — no `setDpr`, drei `AdaptiveDpr` / `PerformanceMonitor` / `AdaptiveEvents`, `regress` | two controllers fight over the pixel ratio (R3F also re-applies the Canvas `dpr` prop on every render) |
| `alloc-in-frame` — no `new Vector3()` (any three math object, geometry, material, texture, typed array, Map/Set) inside `useFrame` | garbage every frame → GC pauses; keep a module-level or `useMemo` scratch object |
| `state-in-frame` — no unconditional `setX()` inside `useFrame` | a React re-render every frame |
| `invalidate-loop` — no unconditional `invalidate()` inside `useFrame` | the model never rests |
| `inline-line-points` — no `<Line points={[…]}>` | new points each render rebuild drei's Line and can drop its shader (recompiled on the next frame) |
| `preserve-buffer` — no `preserveDrawingBuffer: true` | a full-frame copy every frame (a capture flag may set it) |
| `unregistered-scene` — every `QualityCanvas` has a literal unique `name` listed in `scripts/perf/scenes-3d.mjs` | the benchmark must reach every model |

An exception is written next to the code, with its reason:

```ts
// perf-3d-allow(alloc-in-frame): the pose is kept as last.current — a tween starts from it
// perf-3d-allow-file(webgl-context): a single full-frame shader player (no three.js)
```

Not checkable on the source — review them, and let `npm run perf:3d` catch them:

- **Ask for frames only while something moves.** A conditional `invalidate()` in `useFrame` that stays
  true (a pulsing marker) is still a 60 fps loop: animate DOM overlays with CSS instead.
- **Raycasting.** Every R3F pointer handler (`onPointerMove`, `onClick`, …) on a mesh makes every
  pointer move raycast it. Attach handlers only where they are used, give big meshes a BVH (drei
  `<Bvh>` reads `enabled` on mount only — key it), and `raycast={() => null}` on meshes that must not
  be hit.
- **React work per frame.** A live value (a heading, a slider) belongs in a small component that
  subscribes to it; memoise the scene component (`memo`) and pass it stable props (`useCallback`), so a
  host re-render does not reconcile the whole R3F tree every frame.
- **Build once.** Geometries, materials and textures in `useMemo` with stable deps (not on hover); heavy
  CPU work (solvers, terrain builds) cached or stopped early, not repeated per pointer move.
- **Clean up** what you create with `new` (geometry, material, texture, render target) on unmount — but
  never a shared/cached resource (`dispose={null}` on primitives from a loader cache). A module-level
  cache is fine: QualityCanvas detaches the closed renderer from it. Nothing outside the canvas (a
  module-level store, a `window` listener, a dev hook) may keep a reference to the scene, the renderer
  or a DOM node of the model after it unmounts.
- **Shadow-map size and post-processing quality** are set for the strong GPU; the adaptive resolution
  takes care of the weak one. Do not lower them per tier without a measured reason and a screenshot
  comparison.
- **Time.** R3F restarts its clock when a paused model resumes: animate with `delta` or your own time,
  not `clock.elapsedTime`, when a jump back would show.

## Verifying a 3D change

1. `npm run check:3d` — no problems.
2. `npm run build` (in a worktree — CLAUDE.md), then `npm run perf:3d -- --scenes=<name> --shots=<dir>`.
   Never judge performance on `next dev`.
3. Read the row: `idle` (frames per second at rest, on screen) and `off` (scrolled away) must be 0 for
   a non-animated model; `recover` (seconds back to full resolution after a drag) small; `draws` /
   `tris` per frame and `shadow` passes per drag not higher than before; `drag-fps`.
4. Compare with a baseline taken **on the same machine with the same options**:
   `npm run perf:3d -- --json=after.json --compare=scripts/perf/baselines/<machine>.json` exits 1 on a
   regression (`scripts/perf/baselines/README.md` lists the baselines and their machine; on another
   machine, benchmark main first and compare with that). Check the `rest0` screenshots against the previous build (pixel-identical on a strong
   GPU, unless the change is meant to be visible).
5. Weak hardware, simulated: `--gpu=sw` (SwiftShader: a browser drawing on the CPU), `--cpu=4` (a slow
   CPU), `--tier=low` (the integrated-GPU policy on this GPU). These are stand-ins: a real Intel UHD 630
   must still be tried on the machine itself (`chrome://gpu` there should say "Hardware accelerated").
6. `--cycles=5` mounts and unmounts the model (sub-topic away and back) and reports, after each return,
   the memory after garbage collection (JS heap, DOM, ArrayBuffer data), the DOM node count, and at the
   end the closed canvases still reachable (`keptCanvases`) and WebGL contexts left alive. A closed model
   that stays reachable keeps its renderer and the whole section around it: `keptCanvases` must not grow
   with the cycles. To find what holds it, compare two heap snapshots (DevTools → Memory) and follow the
   retainers of a detached `<canvas>`.

Options: `--out=out` (the export to serve) or `--base=http://…`, `--scenes=a,b`, `--gpu=hw|sw`,
`--cpu=N`, `--tier=…`, `--cycles=N`, `--shots=dir`, `--json=file`, `--compare=file`.
