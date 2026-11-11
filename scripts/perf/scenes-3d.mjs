// Every 3D model in the course, as the benchmark (scripts/perf/bench-3d.mjs) reaches it.
//
//   path     page of the static export (trailing slash)
//   hash     the lesson sub-topic (#scene-<id>) — also the section the canvas is searched in
//   scene    the canvas's data-scene (set by QualityCanvas's `name`); the canvas is picked by it,
//            or — on a build without it — by `index` among the section's WebGL canvases
//   near     (no data-scene) the WebGL canvas closest to a button/tab with this name, instead of index
//   steps    clicks that bring the model on screen ({ tab | button: name regexp source })
//   drag     the model turns under a drag (false: measured at rest only)
//   cycle    a neighbouring sub-topic without 3D, for the mount/unmount (memory) cycles
//   skip     why the benchmark does not run it (it is still registered)
//
// Add a scene here when you add a 3D model; `npm run check:3d` fails if a QualityCanvas `name`
// has no entry.
export const SCENES = {
  relief: { path: '/lessons/topic-02/', hash: 'scene-relief-cover', scene: 'relief-cover', index: 0, drag: true, cycle: 'scene-onboarding' },
  topography: {
    path: '/lessons/topic-02/',
    hash: 'scene-topography',
    scene: 'topography',
    index: 0,
    steps: [{ tab: 'מודל תלת־ממדי' }],
    drag: true,
    cycle: 'scene-recap',
  },
  datum: { path: '/lessons/topic-02b/', hash: 'scene-coordinates', scene: 'datum-globe', index: 1, drag: true, cycle: 'scene-scale' },
  measurement: { path: '/lessons/topic-02b/', hash: 'scene-coordinates', scene: 'measurement-landscape', index: 0, drag: true },
  globe: { path: '/lessons/topic-02b/', hash: 'scene-coordinates-2', scene: 'geo-globe', index: 0, near: 'קו אורך', drag: true, cycle: 'scene-recap' },
  projections: { path: '/lessons/topic-02b/', hash: 'scene-coordinates-2', scene: 'projection-stage', index: 1, near: 'גלילי', drag: true },
  contours: { path: '/lessons/topic-02b/', hash: 'scene-contours', scene: 'contour-cake', index: 0, drag: true, cycle: 'scene-recap' },
  'location-check': { path: '/lessons/topic-06/', hash: 'scene-principles', scene: 'location-check', index: 0, drag: true, cycle: 'scene-onboarding' },
  'planning-lab': { path: '/lessons/topic-06/', hash: 'scene-tips', scene: 'planning-lab', index: 0, steps: [{ button: 'דילוג על ההדרכה', optional: true }], drag: true, cycle: 'scene-onboarding' },
  // the replay's first-visit walkthrough covers the page until it is skipped
  replay: { path: '/lessons/topic-06/', hash: 'scene-tips', scene: 'navigation-replay', index: 1, steps: [{ button: 'דילוג על ההדרכה', optional: true }], drag: true },
  'terrain-nav': { path: '/lessons/topic-06/', hash: 'scene-combatnav', scene: 'terrain-nav', index: 0, drag: true, cycle: 'scene-recap' },
  'dead-reckoning': { path: '/lessons/topic-06/', hash: 'scene-combatnav', scene: 'dead-reckoning', index: 1, drag: true },
  drive: { path: '/lab/trafficability-drive/', hash: '', scene: 'drive', index: 0, steps: [{ button: 'התחל נהיגה' }], drag: false },
  // not mounted anywhere: topic-01 shows a video in its place (kept as code)
  'terrain-canvas': { scene: 'terrain-canvas', skip: 'not mounted (topic-01 replaced it with TerrainVideo)' },
  // the home model is switched off (SHOW_3D_MODEL): the page must not create a WebGL context at all
  home: { path: '/', hash: '', scene: 'home-terrain', index: 0, drag: false, expectNoCanvas: true },
};
