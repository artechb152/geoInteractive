# Assumptions — trafficability driving lab prototype

Undocumented-in-brief decisions made while building `/lab/trafficability-drive`.
Flag for review before this is integrated into the actual lesson 4 scene.

1. **Route/placement**: standalone page at `/lab/trafficability-drive`
   (`src/app/lab/trafficability-drive/page.tsx`), `noindex`, not linked from
   the lesson nav. Chosen over the existing `/prt` (external prebuilt-SPA
   embeds) and `/prototypes` (same) systems, since this is a native React
   component, not a separate build artifact.

2. **Physics engine**: no rigid-body engine (no cannon-es/Rapier dependency
   added). The vehicle uses a hand-tuned arcade model — per-wheel terrain
   height sampled from an analytic heightfield function (no raycasting
   needed), spring-damped suspension, and a slip/sink model driven by
   per-terrain parameters. Matches the brief's explicit "no engineering
   accuracy claim needed" and keeps the JS payload smaller than either
   physics engine would.

3. **Terrain geometry**: procedurally generated in-browser from a seeded
   value-noise heightfield (no external noise library — self-contained, a
   few hundred bytes) rather than Blender-authored meshes. Real Poly Haven
   photo textures (diffuse/normal/roughness) are layered on top for
   close-up surface detail. This was chosen over baking terrain in Blender
   because the same height function has to be evaluated at runtime for wheel
   contact anyway — building geometry from it directly guarantees the visual
   surface and the "physics" surface are always identical.

4. **Vehicle identity**: a generic stylized light off-road "technical"
   (open-top jeep-like), not a real-world vehicle model, per the brief.
   Built with flat PBR materials only (no textures) to avoid any texture
   licensing question and keep the GLB small (~265KB).

5. **Poster/thumbnail images**: cropped straight from each terrain's own
   diffuse texture rather than a separately rendered hero shot. This
   guarantees the preview genuinely matches the driving environment, at the
   cost of looking less "produced" than the reference mockup. A Blender
   still-render pass (vehicle + ground) could replace these later if the
   plainer look isn't good enough — flagging for a visual call, not
   re-guessing it here.

6. **Spawn point**: origin `(0, 0, 0)` on every terrain, vehicle facing
   `-Z`, inside a ~7m "calm" radius that blends into each terrain's full
   character by ~15m out — same for all four soils, so switching terrains
   mid-session is a fair comparison.

7. **Terrain tile size**: ~44m × 44m playable area per terrain (small,
   per the brief — "no need for a big world"), with a soft inward push plus
   visible boundary-stake markers rather than a hard wall.

8. **Boundary/recovery model**: "stuck" (sunk past threshold) and "flipped"
   (excessive pitch/roll) both freeze the vehicle and surface the recover
   button — there's no separate off-map case, since the soft boundary push
   prevents leaving the tile entirely.

9. **Mobile/tablet**: below Tailwind's `md` breakpoint, the interactive
   canvas is never mounted — only the poster image + lesson text render, per
   the brief (no touch controls needed). This is a static CSS split, not a
   JS viewport check, so the heavy Three.js/GLTF/texture path never loads on
   small screens at all.

10. **Lesson copy**: the soil `desc`/`effect`/`tip` text in `terrainConfigs.ts`
    is copied character-for-character from `SOILS` in `TrafficabilityScene.tsx`.
    No factual issues were found in that text while building this lab, so
    nothing was flagged or altered.

11. **Graphics upgrade (2026-09-23)** — requested explicitly ("AAA-level,
    as realistic as possible"), flagged to the user up front that literal
    AAA/console fidelity isn't achievable in browser WebGL on office-laptop
    integrated graphics; this pushes toward the ceiling of what real-time
    WebGL can do on modest hardware instead:
    - Added `@react-three/postprocessing` + `postprocessing` (the only new
      runtime deps in this feature) for SSAO, a tightly-thresholded Bloom,
      Vignette, and SMAA.
    - Sky/reflections: drei's `<Sky>` baked into a small cubemap via
      `<Environment background frames={1}>` — self-contained (no HDRI
      network fetch, unlike drei's presets), used as both the visible
      background and `scene.environment` for real PBR reflections.
    - Terrain realism: per-vertex color multiply (slope darkening + a
      large-scale noise tint unrelated to the texture's own tiling
      frequency) breaks the "obviously a repeating photo" look cheaply,
      without a shader rewrite.
    - Boundary markers restyled from bright cones to plain survey
      stakes with a small hazard-tape flag.
    - Wheel kickup: a pooled `THREE.Sprite` particle system (dust on
      soft/sand, dark splashes on mud, none on hard rock) — cheap at this
      particle count, no shader/instancing complexity needed.
    - Vehicle paint: added `KHR_materials_clearcoat` in Blender (Blender's
      glTF exporter maps "Coat Weight"/"Coat Roughness" to it automatically)
      for a glossy-paint look, exported correctly per a JSON-chunk check of
      the GLB.
    - **Pitfall worth remembering**: glTF/Blender material colors are
      *linear*, not sRGB. A value that looks like a plausible dark olive
      typed by eye (e.g. `(0.176, 0.208, 0.129)`) renders 2-3x too bright
      once real PBR/IBL lighting is involved, because linear→sRGB display
      conversion lifts shadows. Fixed by converting a target on-screen
      color through `linear = ((srgb+0.055)/1.055)^2.4` instead of guessing.
      Under the old flat ambient+hemisphere-only lighting this had gone
      unnoticed because that setup was itself not physically correct.
    - Verified visually via Playwright screenshots at each step (see
      conversation), not just build success — screenshots aren't checked
      into the repo (they were a local debugging aid), so a fresh visual
      review is still worthwhile before calling this final.
