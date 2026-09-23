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

12. **Layered terrain material (2026-09-23)** — replaces the single tiled
    photo texture + vertex tint with a shader-blended material
    (`drive/terrainMaterial.ts`, per-soil profiles under `visual.material`
    in `terrainConfigs.ts`). Geometry, camera and physics are untouched.
    - Four layers: soil (calm, palette-coloured), exposed rock, sparse
      moss/vegetation and wet ground. Masks come from slope, normalised
      height, world-space noise, and two per-vertex masks baked from the
      mesh (fine curvature ≈0.9m, broad hollowness ≈3.2m). The spawn disc
      is kept calm.
    - Photo textures are now used only as *grayscale detail + normals*.
      Colour comes from a small warm palette per soil (sage/olive moss, tan
      soils, pale limestone), so the scene follows the site palette instead
      of whatever the photos contain. Each texture is sampled twice at
      unrelated scales/rotations and blended by noise to hide tiling.
    - Texture reuse (assumption): "hard" uses the calm `mud` texture for
      soil grain and the `hard` rock photo only where rock is exposed;
      "soft" borrows the `hard` rock photo for its chalk outcrops (tinted
      pale). Sand and mud have no rock layer. Roughness maps are no longer
      loaded (they were near-constant); roughness is set per layer.
    - Palette mid-tones were kept near the old textures' average albedo, so
      the concurrent lighting/atmosphere tuning still holds. If a soil reads
      too bright or dull, adjust `palette` in `terrainConfigs.ts`, not the
      lights.

13. **Camera & composition (2026-09-23)** — chase camera moved out of
    `Vehicle.tsx` into a reusable `ChaseCamera` class (`chaseCamera.ts`),
    framed in screen space rather than by aiming at a point ahead:
    - Vehicle anchored just right of centre on the lower third (NDC
      `0.12, -0.27`); horizon ≈36% from the top. Values were checked by
      projecting the vehicle's silhouette (dimensions from
      `build_vehicle.py`) at a ~1.3 aspect, not in a browser: at rest the
      vehicle spans ≈45–88% of frame height, clear of the HUD's bottom row.
    - FOV 52° at rest → 56° at top speed; distance 6.0 → 6.8 m. The old rig
      damped world position, which let the camera trail ~1.6 m further back
      at speed and swing wide in turns. Now only yaw, vertical and speed are
      smoothed, so the vehicle's size and position on screen stay stable.
    - Camera sits 0.8 m to the vehicle's left, so the wheels and suspension
      are seen in 3/4. The path ahead runs diagonally from the vehicle
      (lower right) toward a vanishing point left of centre, which matches
      RTL reading direction. **Assumption**: chosen side; flip `lateral` /
      `frameX` if the other flank reads better.
    - Terrain look-ahead: rising ground ahead lowers the camera elevation
      (so the crest stays visible), falling ground raises it (clamped
      9–22°). Clearance checks keep the camera and its sight line above
      ridges.
    - Motion comfort: no high-frequency shake. The only suspension-coupled
      motion is a low-passed horizon lean (≤1°, 12% of chassis roll) and a
      softened vertical follow. `prefers-reduced-motion` disables the lean
      and the speed-driven FOV/distance changes.
    - Background layer: the terrain mesh now continues past the playable
      tile as a visual-only apron (to ±72 m; the geometry gets coarser with
      distance, same height function and UV density, no physics change).
      `HorizonBackdrop.tsx` adds two distant ridgeline rings that fade up
      out of the fog colour, with a silhouette per soil type (mesas / rolling
      hills / long swells / low plain), so the horizon is a deliberate line
      rather than the tile's hard edge against bare sky.

14. **Vehicle look-dev (2026-09-23)** — `scripts/blender/build_vehicle.py`
    rebuilt for a finished, stylized low-poly look; node contract, wheel
    origins and all physics dimensions unchanged, controls/physics untouched.
    - Surface treatment: every hard edge is beveled with hardened normals
      (flat panels stay flat, edges roll off and catch a highlight); curved
      parts shade smooth by angle.
    - Material families are separate, named materials (contract with
      `drive/vehicleMaterials.ts`, which sets per-material reflection
      strength): PaintBody / PaintChassis (satin olive two-tone, light
      clearcoat), PaintedMetal, BareMetal, Rim, Tire / TireTread (warm
      charcoal, low specular — never pure black), Glass (38% alpha, no shadow
      cast), Mirror, LightLens / TailLight (faint emissive, below the bloom
      threshold), Canvas (seats, strap). Opaque materials are single-sided.
    - **Assumption**: paint shifted slightly toward a muted sage-olive
      (`#565D3A` body / `#3B4128` chassis) to sit with the site palette
      rather than saturated army green.
    - Added detail chosen for what the chase camera sees (mostly the rear
      3/4): hollow tires with staggered chevron lugs whose outer face lands
      exactly on the 0.38 m physics radius (true ground contact), recessed
      rims + lug nuts, arched fenders (clearance for ±0.14 m suspension
      travel), tail lights, tailgate hardware, seats, steering wheel, mud
      flaps, jerrycan, axles/diffs filling the see-through gap under the
      body. ~25k verts / 44k tris; GLB 267 KB → ~780 KB (no Draco — would
      need a decoder fetch, against the self-contained export).
    - QA renders (incl. a new `vehicle-preview-chase.png` from the in-lab
      camera angle) are regenerated by the script into
      `design/docs/trafficability-drive-previews/`.

15. **Lighting & atmosphere (2026-09-23)** — `DriveAtmosphere.tsx`,
    `SkyDome.tsx`, `ContactShadow.tsx`, `atmosphere.ts`; terrain geometry and
    vehicle controls untouched.
    - **One sun for every soil**: late afternoon, 26° elevation, 70° left of
      the spawn driving direction (raking side light), so shadows always fall
      the same way and soils are compared on ground, not weather. Per-soil
      mood only changes haze, sky tint and warmth (mud = humid day after rain,
      softer shadows, never dark). Colours live in `visual.fog/sky/ambient/sun`
      (shared with `HorizonBackdrop`); light levels in `atmosphere.ts`.
    - **Sky**: drei `<Sky>` (a physical blue sky) replaced by a palette
      gradient dome (cream haze → sage zenith, warm sun glow). The same dome
      is baked once per soil into the IBL, so fill light is warm from the sun
      side, sage from above, earth-toned from below. Horizon colour = fog
      colour, so the terrain dissolves into the sky with no seam.
    - **Tone mapping was silently off**: `EffectComposer` forces the
      renderer's tone mapping to `NoToneMapping`, so the old
      `ACESFilmicToneMapping` setting never applied (hard-clipped highlights,
      part of the "cheap WebGL" look). Now a `ToneMapping` effect (Khronos
      PBR Neutral: filmic roll-off without shifting the palette's hues).
    - **Shadows** *(box widened in item 17)*: the shadow box follows the chase camera (40 m, 2048², ≈2 cm
      texels, snapped to whole texels so edges don't shimmer), instead of a
      fixed ±18 m box around the origin. PCF + `shadow.radius` (r184 deprecated
      PCFSoftShadowMap).
    - **Grounding**: N8AO replaces SSAO (cleaner, half-res, no normal pass),
      tinted warm umber; plus a terrain-conforming contact-shadow patch under
      the vehicle (fades when airborne), placed from the wheel nodes.
    - **Assumption — sun side** *(superseded by item 17: now 105°, behind-left)*: front-left was chosen so the sun's glow is
      in view near the top-left while hills still show a lit and a shaded
      face. Change `SUN_AZIMUTH_DEG` in `atmosphere.ts` to move it.
    - Not verified in a browser (per standing instruction, the user reviews
      visually). Intensities were set by calculation, not by eye; if a soil
      reads too dark or too bright, adjust `sunIntensity` / `skyFill` in
      `atmosphere.ts` together.

16. **Terrain geometry rebuild (2026-09-23)**: supersedes the "seeded
    value-noise heightfield" in item 3 and the "~7 m calm radius" in item 6.
    The shape is now authored in layers (`landforms.ts`): large landforms
    placed by hand per soil, then the soil's medium structure (ledges,
    terraces, secondary dunes, hummocks), then small detail (rubble, boulder
    clusters, puddles). Noise lives in `terrainNoise.ts` (gradient noise, no
    new dependency). `heightfield.ts` keeps its API; `createHeightSampler`
    now delegates to `createLandformHeight`.
    - **Assumption: one shared route layout.** A θ-shaped graded track
      (`terrainRoute.ts`): an irregular ring road plus a spine through the
      spawn point, the same on every soil so runs stay comparable. Only how
      deeply it's cut in (`height.route.grade`, rut depth, berm height)
      changes per soil. Soft ground gets a cleanly engineered road (the
      lesson's "bulldozers cut new routes" point); sand gets a track that
      mostly rides over the dunes.
    - **Assumption: spawn heading is +Z.** `vehicleController` drives along
      `(sin h, −cos h)`, so at heading π the car moves toward +Z (its
      comment says −Z). The layout is composed for the real +Z view.
    - **Spawn calm changed**: large forms ease to 50% at spawn (full by
      ~10 m) instead of the whole terrain dropping to 8% inside 7 m. The
      first view now has real hills in it. Medium/small detail ramps over
      the same window `terrainMaterial.ts` uses for `tgCalm`.
    - **Drivability verified numerically, not in a browser**, using the
      controller's own pitch/roll formulas and flip thresholds along every
      route vertex. Worst route point: the hard-rock wadi crossing, 16° grade,
      ~55–66% of flip. Near spawn (r < 5 m) all soils stay ≤ 24%. About 7% of
      the hard-rock ground off the route can flip the vehicle (knoll flanks,
      wadi banks, boulders); that's intentional ("cliffs block the way").
    - **Found, not fixed (out of scope)** *(fixed in item 17)*: `vehicleController.hubWorld()`
      places the wheel contacts with a proper Y-rotation (forward
      `(−sin h, −cos h)`), while motion uses `(sin h, −cos h)`. They only
      agree when driving along ±Z. On diagonal headings the wheel footprint
      is mirrored, so uphill grade can show up as roll.
    - Terrain mesh resolution raised to 176 segments over the tile (~0.25 m)
      so ledge risers, boulders and ruts render the way they're felt. About
      45k vertices including the apron; the height function costs roughly
      150 ms per soil switch.

17. **Integration pass (2026-09-23)**: items 12–16 were built by six
    parallel workstreams (terrain, materials, lighting, camera, vehicle,
    post-processing) that all wrote into the same working tree. No `3d/*`
    branches were ever created. This pass reconciles them. Priority order used
    when two workstreams disagreed: terrain silhouette/composition → lighting
    → readable vehicle movement → materials → atmospheric depth → polish.
    - **Vehicle frame fixed (was pre-existing, now visible).** The rig
      rendered yaw `+heading` while the controller moves along
      `(sin h, −cos h)`, which is the X-mirror. They agreed only along ±Z; after
      a 90° turn the car drove backwards on screen. Pitch was inverted (nose
      dipped on climbs), wheels rolled backwards and steered the opposite way.
      The new chevron tread and the steeper terrain made all of this visible.
      Now: one shared `vehicleToWorld()` transform (rig yaw = −heading) used
      by the wheel contacts, the dust emitter and the renderer. `pitch` is
      "+ = nose up", and wheel spin/steer are mapped in `Vehicle.tsx`. Controls
      are unchanged: right key still turns right, same speeds and turn rates.
      Verified numerically against three.js transforms, not in a browser.
    - **Slip direction**: the controller's "right" vector was really the
      vehicle's left, so on sand/mud a right turn slid the car *into* the
      turn (tighter, i.e. more grip). It now slides out of the turn, which is
      the lesson's "wheels lose grip". Magnitude is unchanged (up to ~30° slip
      angle on mud, ~4° on hard rock). **Assumption**: this matches the
      intended feel; flip the `right` vector in `vehicleController.ts` to
      revert.
    - **Route drivability re-run** with the corrected footprint: hard 55% of
      flip at worst (wadi crossing, 22° pitch), soft 12%, sand 24%, mud 12%;
      spawn area ≤ 15%. Grade now reads as pitch instead of leaking into roll.
    - **Sun 70° → 105° (camera × lighting conflict).** The camera sits off
      the vehicle's left and looks at its rear 3/4. With a front-left sun the
      tailgate and the camera-facing hill slopes were in shade. At 105°
      (slightly behind-left) the visible flank is fully lit, the tailgate
      catches some sun, and hill shadows fall across the view (right,
      slightly ahead) at full length. The sun glow is no longer in the spawn
      view; it appears when driving toward the sun. Fog, ridgelines and haze
      carry the depth.
    - **Terrain now casts shadows** (it only received them). The lighting
      workstream wanted hill shadows, but the terrain mesh never cast any.
      Needs `shadowSide = FrontSide` (three's default back-face shadow pass
      skips most of a heightfield). The shadow box was widened to 52 m and
      centred 15 m ahead (≈2.5 cm texels) so hill shadows don't stop at a
      visible edge; `normalBias` 0.035 → 0.05 for the self-shadowing.
      **Watch for**: striping (acne) on flat sunlit ground. If it appears,
      raise `normalBias` in `DriveAtmosphere.tsx`.
    - **Bloom threshold 1.35 → 1.9**: sun-facing sand/chalk slopes reach
      ≈1.75 HDR and were blooming, so whole hillsides glowed. Now only the
      sun disc and specular glints bloom, as the original comment intended.
    - **Duplicate noise removed**: the old value-noise `fbm` in
      `heightfield.ts` survived only for `HorizonBackdrop`; it now uses
      `terrainNoise.fbm2`, remapped (`0.5 + 0.66·n`, measured) so ridgeline
      coverage stays the same.
    - **Performance / hygiene**: 28 boundary stakes were 56 meshes with 56
      material instances. They are now 2 instanced draws. The terrain
      geometry (~45k vertices) is disposed on soil switch (it leaked before).
      Sky dome and shadow box update after the chase camera each frame
      (`useFrame` priority 0.5), so neither lags it by a frame. Removed a
      dead line in `buildTerrainGeometry`.
    - **Kept as-is, judged compatible**: N8AO + sun shadow + `ContactShadow`
      (three grounding layers by design; tinted umber), layered terrain
      material, chase-camera framing, vehicle materials, fog/sky/ridgeline
      colour chain (fog = sky horizon = ridge base).
    - Not verified in a browser (standing instruction). See the manual
      review checklist handed over with this pass.
