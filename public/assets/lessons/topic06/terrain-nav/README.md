# Terrain association (lesson 6, ניווט לפי השטח) — assets

- `overview.jpg`, `leg-1.jpg` … `leg-4.jpg` — the static views shown when WebGL is unavailable: rendered from the live model (same terrain, cover, light and camera — the learn-mode opening view, and each practice leg's opening look from the navigator's eye) at 2× with every overlay hidden, by
  `node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs scripts/qa/shot-terrain-nav.mjs --base=http://localhost:3001 --capture-fallback`.
  Regenerate them whenever the terrain, the cover, the lighting or a camera contract changes.
- Ground textures are not copied here: the model reads the lesson's existing CC0 Poly Haven set in `../location-check/textures/`.
