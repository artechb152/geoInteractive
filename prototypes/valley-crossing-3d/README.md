# Tactical Terrain Analysis Simulator

A polished, browser-based **3D military terrain analysis simulator** — a guided training scenario in which the user studies a movement problem (high ground, enemy overwatch, an exposed valley, a bridge choke point) and selects the most effective route for a friendly force to reach a village objective.

Built entirely with **code-generated geometry** (no external 3D models, no paid assets, no runtime network dependencies) using Next.js, React, TypeScript, Three.js, React Three Fiber, Drei and a procedural post-processing stack.

> **Operation Iron Pass — Valley Crossing.** Analyze the terrain, identify the key risks, and choose the safest axis of advance.

---

## Features

**Cinematic 3D scene**
- Sculpted procedural terrain with a dominant western observation hill, an exposed central valley, a threatening enemy ridge, a carved river, a detailed bridge, a dirt road with worn edges and tire tracks, and an objective village (buildings, courtyard wall, sandbag berms, watchtower, well).
- Layered natural terrain coloring (dry grass, dirt, rocky slopes, muddy riverbanks) and instanced vegetation/rocks placed by terrain rules (massed on high ground, sparse in the exposed valley).
- Cinematic lighting (warm key sun + soft shadows, sky fill, warm rim light), procedural sky, atmospheric fog, and post-processing (subtle bloom on tactical glows, color grading, vignette).

**Guided mission flow**
- Opening **mission brief** modal (objective, situation, terrain problem, task).
- Five guided analysis phases — High Ground → Movement → Enemy Overwatch → Choke Point → Route Decision — each with its own camera, focused overlays, and a plain-language explanation.
- **Route decision** with three polished route cards, a **debrief** (operational score, metrics, strengths/weaknesses, recommendation), and full replay (Try Another Route / Restart Mission).
- High-level progress indicator: **Brief → Analyze → Decide → Debrief**.

**Tactical analysis systems**
- **Line of sight** — distinct friendly (cyan) and enemy (red) sight lines with observer/observed markers, filtered to what matters per phase.
- **Exposure zones** — severity-tiered (Moderate / High / Extreme) with pulsing overlays and labels.
- **Route analysis** — path, flowing chevron arrows, risk zones, key terrain interactions, and five tactical **metrics** (Observation, Exposure, Speed, Tactical Advantage, Choke Point Risk) that update on selection.
- **Clickable terrain** — every key feature shows its tactical role and assessment.
- **Stage-focused overlays** — each phase shows only the overlays relevant to its lesson, so the scene never feels cluttered.

**Premium command UI**
- Dark translucent panels with hairline borders, corner brackets, mono-spaced tactical typography, and tasteful motion.
- Six camera views (Strategic, Soldier POV, High Ground, Enemy Overwatch, Choke Point, Route Preview) with smooth eased transitions and an on-screen camera caption explaining what each view teaches.
- A 2D **mini-map** (friendly start, enemy ridge, bridge, village, river, road, selected route) + legend.
- Tactical layer toggles (Line of Sight, Exposure, Routes, Labels, Units), keyboard focus states, and reduced-motion support.

---

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript (strict, `noUnusedLocals`) · Three.js · @react-three/fiber · @react-three/drei · @react-three/postprocessing · Zustand · plain global CSS.

No paid assets, no external 3D models, no runtime network requests (sky, bloom and all geometry are procedural).

---

## Getting started

### Prerequisites
- Node.js **18.18+** (Node 20 LTS recommended)

### Installation
```bash
npm install
```

### Run locally (development)
```bash
npm run dev
```
Open **http://localhost:3000**.

### Other scripts
```bash
npm run build      # production build (runs type-checking + lint)
npm run start      # serve the production build
npm run lint       # ESLint (next/core-web-vitals)
npm run typecheck  # tsc --noEmit
```

---

## Deployment (Vercel)

This is a standard Next.js App-Router project with no environment variables or backend services.

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Import it into Vercel (it auto-detects Next.js) — or run `vercel` from the project root.
3. Deploy. No configuration needed.

The 3D experience is loaded **client-side only** via a dynamic import with `ssr: false`, so the page prerenders instantly as a lightweight shell and then hydrates into the simulator. This avoids any server-side `window`/`document`/WebGL access and keeps the first load tiny (~89 kB JS for the shell; the Three.js bundle is code-split and fetched on the client).

---

## Project structure

```
app/
  layout.tsx            Root layout + metadata
  page.tsx              Client page; dynamically imports the experience (ssr:false)
  globals.css           Full premium design system
components/
  Experience.tsx        Wraps the 3D scene + HUD + boot overlay
  scene/                Canvas + post-processing, lighting, terrain, water, road,
                        bridge, village, vegetation, rocks, camera rig
  tactical/             Markers, routes, exposure zones, line of sight, labels,
                        clickable elements, highlights
  ui/                   Command interface: header, mission panel, stepper,
                        analysis panel, camera controls + caption, bottom dock,
                        layer toggles, legend, mini-map, route decision, debrief,
                        mission brief, progress indicator, metric bars
lib/
  terrain.ts            Procedural height field + placement helpers (single source of truth)
  scenario.ts           Stages, routes, zones, sight lines, markers, camera data,
                        per-stage overlay matrix + getVisibility()
  style.ts              3D color palette + lighting/fog constants
  store.ts              Zustand state (stage, camera, selection, layers, mission flow)
  types.ts              Shared type contract
```

### How it works (main components)

- **`lib/terrain.ts` is the single source of truth.** One procedural `getHeight(x, z)` field, built from layered Gaussians + value noise with a carved river channel and a village shelf, drives the placement of *everything* via helpers (`onTerrain`, `onSurface`, `surfaceHeight`, `slopeAt`, `sampleSurfacePath`). The road and routes ride the bridge deck over the river. Because all geometry derives from one function, the world is always internally consistent.
- **`lib/scenario.ts` is declarative data.** Stages, routes (with metrics/interactions/recommendations), exposure zones, sight lines, markers, labels and camera poses are data, not code. A single `getVisibility()` resolves a **stage-specific, non-cumulative** overlay matrix (gated by the layer toggles), which keeps every component dumb and the scene focused.
- **`lib/store.ts` (Zustand)** holds all interaction state; every UI and 3D component is prop-free and reads from it, so the data flow is obvious and decoupled.
- **`components/scene/CameraRig.tsx`** wraps OrbitControls and eases the camera between hand-tuned cinematic poses whenever the camera mode, selected route, or a re-frame nonce changes — then hands control back to the user.
- **`app/globals.css`** is one cohesive design system (panels, buttons, toggles, metric bars, modals, animations, responsive rules, keyboard focus, reduced-motion).

---

## Route evaluations

| Route | Risk | Speed | Tactical Adv. | Score | Recommendation |
|------|------|-------|---------------|-------|----------------|
| **A · Valley Road** | High | Fast | Low | 45/100 | Not recommended unless speed matters more than survivability. |
| **B · High Ground First** | Medium-Low | Medium | High | 85/100 | Recommended for balanced tactical control. |
| **C · Side Passage** | Medium | Slow | Medium | 70/100 | Possible alternative if avoiding enemy overwatch is the priority. |

---

## Future improvements

- **Animated movement:** march a friendly token along the selected route with a timeline scrubber.
- **Terrain-raycast line of sight:** compute LOS against the terrain mesh so sight lines break realistically behind ridges, and derive exposure per route segment from real visibility.
- **More post-processing:** add SSAO/ambient occlusion and depth-of-field on top of the existing bloom/grading/vignette.
- **Time of day & weather:** a sun-angle slider and variable haze for different visibility conditions.
- **Authoring:** load scenarios from JSON so new missions can be built without code.
- **Audio & accessibility:** ambient wind + UI sounds, a keyboard-accessible terrain-element picker, and a touch/tablet layout.

---

## License

Provided as a demo. No third-party paid assets are used; all geometry, materials and effects are generated in code.
