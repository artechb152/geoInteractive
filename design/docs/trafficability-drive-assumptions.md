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
   visible cone markers at the boundary rather than a hard wall.

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
