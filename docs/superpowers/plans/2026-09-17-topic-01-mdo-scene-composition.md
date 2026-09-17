# Topic-01 MDO Scene — Object Composition & Contact Realism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition the five MDO domain objects (ground vehicle, antenna, ship, aircraft, satellite) in `MDOScene.tsx` to the field-photo coordinates specified below so each sits correctly on the terrain it belongs to, rescale/weaken their target-lock markers so the markers stop hiding the smallest objects, retune the connection arcs for the new layout, and add local contact effects (ground shadow / water ripple) so the objects read as part of the photo instead of stickers pasted on top — without changing the background image, the control-panel UI, or any other part of the page.

**Architecture:** All changes live in one file, `src/components/lessons/topic-01/MDOScene.tsx`. The `DOMAINS` array is the single source of truth for each object's position/size (`image: {x, y, width, aspect}`); `domainBox()` derives the full box (including height, from the asset's own aspect ratio) and `domainAnchor()` derives the marker/connection anchor from that box — both already exist and must keep being the only place these are computed (never store an anchor independently). `MDOFieldDiagram` renders the background photo, then an SVG overlay (one `<g>` per domain: object image + target-lock marker, gated on `active`) and the connection arcs (`EDGES`, via `edgeControl()`'s obstacle-avoiding Bézier search). This plan only edits values and markup inside that existing structure — it does not restructure the component.

**Tech Stack:** Next.js 15 / React 19, inline SVG (photo-pixel coordinate system, viewBox `0 0 1448 1086`, **not** RTL-mirrored — see the component's own comment above `MDOFieldDiagram`'s return), Tailwind CSS 3, `sharp` (devDependency, used here only to inspect PNG assets, not at runtime). No unit-test framework in this repo. Verification is Playwright screenshot comparison at 1440px width, matching this project's established screenshot-and-compare convention (`CLAUDE.md` Verification loop; precedent: `docs/superpowers/plans/2026-09-15-topic-04-onboarding-visual-parity.md`).

**Spec:** No separate written spec doc exists for this task — the spec is the user's own request, reproduced in full below because every number in this plan comes from it. All five source PNGs (`public/assets/lessons/topic01/scene-mdo/mdo-object-*.png`) were verified ahead of time to be alpha-trimmed with **zero transparent padding** — the bounding box computed from `image: {x, y, width, aspect}` (via `domainBox()`) is exactly the visible content's box, so `box.y + box.height` is the object's true lowest visible pixel (ground/water contact line) and needs no separate trim offset.

> **Original request (Hebrew, verbatim):** מערכת הצירים היא 1448×1086, מהפינה השמאלית העליונה, ללא היפוך ב-RTL. עדכן את DOMAINS לפי הטבלה (x/y = פינת התמונה, רוחב ביחידות התמונה המקורית, שמור יחס ממדים): רכב קרקעי (730,730,w255), אנטנה (1170,490,w58), ספינה (60,435,w190), מטוס (860,210,w245), לוויין (315,90,w115). הרכב בקדמת המישור; האנטנה קטנה ומרוחקת, בסיס על הקרקע; גוף הספינה ברצועת המים; המטוס מופרד מהלוויין ומהאופק; הלוויין נשאר המחשה סמלית עם הכיתוב הקיים. למניעת מראה מדבקות: צל מגע מקומי רך תחת גלגלי הרכב ורגלי האנטנה בלבד (נוגע בבסיס, נעלם כשהממד כבוי), הפרעת מים עדינה בקו המגע של הספינה (לא הילה סביב כל התמונה), בלי צל קרקע למטוס/ללוויין, בלי קישוטי רקע חדשים. עוגני קשר ימשיכו להיגזר מ-domainBox/domainAnchor; לאנטנה anchorRel נשאר [0.5, 0.35]. הקטנת טבעות הסימון בכ-20% והחלשת הזוהר. קשתות חיבור: קימור פתיחה 35–80 יחידות, ניתוב סביב כלים שאינם קצה הקשר, בלי קשתות ענק ובלי חיתוך שולי התמונה. אימות בצילום 1440px, בדיקת הנחה נכונה על קרקע/מים ובדיקת כיבוי/הפעלה של כל ממד, עם תיקון סטיות קטנות.

## Global Constraints

- Physical `x`/`y`/`cx`/`cy` (not logical/RTL properties) are correct and required throughout this component's SVG overlay — every coordinate is a field-photo pixel that must land on the same object regardless of page direction, and must **never** be mirrored. This is an intentional, already-documented exception to the project's usual RTL-logical-properties rule (see the comment directly above `MDOFieldDiagram`'s `return` in the current file) — do not "fix" it.
- Do not touch `public/assets/lessons/topic01/scene-mdo/mdo-scene-background.png` or any other background/photo asset. Do not add any new decorative background elements (only the two contact effects named below, each scoped to its own domain's `<g>`).
- Do not change the control panel (`DomainRow`, `MDOScene`'s layout, the five domains' `label`/`english`/`icon`/`impact`/`caption` text), `RealWorldExamples`, or `ChokepointBand` — this plan only touches `DOMAINS[].image`, the marker/edge constants, and the per-domain SVG group inside `MDOFieldDiagram`.
- Keep every asset's own aspect ratio (`aspect: <naturalWidth> / <naturalHeight>`) unchanged — only `x`, `y`, `width` move. Never stretch an object off its native proportions.
- Anchors/connection points continue to be derived only via `domainBox()` / `domainAnchor()` — never hardcode a second copy of a position.
- `cyber` (antenna) keeps `anchorRel: [0.5, 0.35]` — unchanged, still lands the marker on the dish cluster near the top of the mast, not mid-shaft.
- `space` (satellite) keeps its existing `caption: 'חלל · המחשה'` and no ground-contact shadow — it is explicitly a symbolic illustration, not a grounded object.
- `air` (aircraft) gets no ground-contact shadow — nothing to ground it to.
- After each task, run `npm run dev`, open `http://localhost:3000/lessons/topic-01#scene-mdo` (URL hash directly loads the MDO sub-topic — confirmed via `PagedLearn`'s `hashchange`/mount sync, no manual clicking through prior scenes needed), resize to **1440px width**, and screenshot with Playwright (MCP browser tools if available in your environment, otherwise an ad-hoc script under the scratchpad directory using the `playwright` devDependency already in `package.json` — do **not** commit a screenshot script to the repo). Compare against the field-photo coordinates in this plan and note concrete deltas (which object, which direction, roughly how many px) in your report rather than silently guessing at a fix.

---

## Task 1: Reposition domain objects, rescale/weaken markers, retune connection arcs

**Files:**
- Modify: `src/components/lessons/topic-01/MDOScene.tsx`

**Interfaces:**
- Consumes: nothing from other tasks — this is the first task.
- Produces: `DOMAINS[].image` now holds the final `{x, y, width}` for every domain (Task 2 reads these same boxes via `domainBox(d)`, already computed inside `MDOFieldDiagram`, to place its contact effects — Task 2 depends on this task landing first, same file, sequential). The marker/edge-tuning constants below (`MIN_ANCHOR_CLEARANCE`, `clampToField`, marker radii) are final after this task; Task 2 does not touch them.

- [ ] **Step 1: Move each domain's object to its new field-photo box**

In `src/components/lessons/topic-01/MDOScene.tsx`, inside the `DOMAINS` array, update each domain's `image` line (keep `src` and `aspect` exactly as they are — only `x`, `y`, `width` change) and its position comment:

| Domain id | Old `image` line | New `image` line |
|---|---|---|
| `land` | `x: 772, y: 539, width: 195` | `x: 730, y: 730, width: 255` |
| `air` | `x: 957, y: 97, width: 230` | `x: 860, y: 210, width: 245` |
| `sea` | `x: 59, y: 420, width: 230` | `x: 60, y: 435, width: 190` |
| `space` | `x: 417, y: 46, width: 150` | `x: 315, y: 90, width: 115` |
| `cyber` | `x: 1235, y: 286, width: 90` | `x: 1170, y: 490, width: 58` |

Also update the stale position comment above each `image` line so it still describes reality:

- `land`: replace `// Centered in the open grassy clearing.` with `// Foreground of the clearing — closest object to the viewer; wheels get a ground-contact shadow (Task 2).`
- `air`: replace `// High in the open sky, upper-right.` with `// Mid-upper sky, right of center — clear of the satellite and the horizon.`
- `sea`: replace `// Afloat in the open sea, lower-left, waterline clear of the coastline.` with `// Afloat in the open sea, lower-left — hull sits in the water band below the horizon; gets a water-contact ripple (Task 2).`
- `space`: replace `// Upper-left sky, clear of the aircraft and the mountain skyline.` with `// Upper-left sky, clear of the aircraft — a symbolic stand-in for the space domain, not a literal depiction.`
- `cyber`: replace the two-line comment `// Standing on the hillside, right edge, base planted on the ground` / `// just clear of the bunker and tree in the background photo.` with a single line `// Standing on the grass hillside, base planted on the ground; feet get a contact shadow (Task 2).`

`anchorRel: [0.5, 0.35]` on `cyber` and `caption: 'חלל · המחשה'` on `space` are unchanged — do not remove or edit those lines.

Note: this component's decorative SVG overlay is `pointer-events-none`/`aria-hidden` — the only real click targets are the `DomainRow` buttons in the left control panel, which are plain Tailwind layout (icon + Hebrew label), not tied to any field-photo coordinate. So "hit areas" have nothing to move here. The satellite's caption pill (`<rect>`/`<text>` reading `d.caption`, further down in the same per-domain block) already reads its position from `cx`/`box.y` — both derived from the new box via `domainAnchor()`/`domainBox()` — so it repositions automatically once Step 1's `space` coordinates land; no separate edit needed for it.

- [ ] **Step 2: Rescale the target-lock markers ~20% smaller and weaken the glow**

Still in `MDOScene.tsx`, inside `MDOFieldDiagram`'s `positioned.map((d) => { ... })` block, find the marker circles/ticks/core/pulse for each domain (the block that starts right after the `<image .../>` element) and change these values exactly:

| Element | Old | New |
|---|---|---|
| Outer glow circle | `r="36"` / `opacity="0.34"` | `r="29"` / `opacity="0.22"` |
| White halo ring | `r="22"` / `strokeWidth="5.5"` / `opacity="0.5"` | `r="18"` / `strokeWidth="4.5"` / `opacity="0.4"` |
| Orange ring | `r="22"` / `strokeWidth="3"` / `opacity="0.95"` | `r="18"` / `strokeWidth="2.5"` / `opacity="0.85"` |
| Tick inner radius | `x1={cx + ux * 28}` / `y1={cy + uy * 28}` | `x1={cx + ux * 22}` / `y1={cy + uy * 22}` |
| Tick outer radius | `x2={cx + ux * 35}` / `y2={cy + uy * 35}` | `x2={cx + ux * 28}` / `y2={cy + uy * 28}` |
| Tick stroke | `strokeWidth="2.5"` / `opacity="0.85"` (the `<line>` inside the tick map) | `strokeWidth="2"` / `opacity="0.7"` |
| Core outer dot | `r="8.5"` | `r="7"` |
| Core inner dot | `r="3.5"` | `r="3"` |
| Pulse ring (the `motionEnabled && isOn` block) | `r="22"` / `strokeWidth="3"` / `<animate attributeName="r" values="22;50" ...>` | `r="18"` / `strokeWidth="2.5"` / `<animate attributeName="r" values="18;40" ...>` |

The resulting per-domain marker block (everything between `<image .../>` and the caption block) should read:

```tsx
                <circle cx={cx} cy={cy} r="29" fill="#D97E2B" opacity="0.22" filter="url(#mdoNodeGlow)" />
                <circle cx={cx} cy={cy} r="18" fill="none" stroke="#FDFBF3" strokeWidth="4.5" opacity="0.4" />
                <circle cx={cx} cy={cy} r="18" fill="none" stroke="#D97E2B" strokeWidth="2.5" opacity="0.85" />
                {[
                  [0, -1],
                  [0, 1],
                  [-1, 0],
                  [1, 0],
                ].map(([ux, uy]) => (
                  <line
                    key={`${ux},${uy}`}
                    x1={cx + ux * 22}
                    y1={cy + uy * 22}
                    x2={cx + ux * 28}
                    y2={cy + uy * 28}
                    stroke="#D97E2B"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.7"
                  />
                ))}
                <circle cx={cx} cy={cy} r="7" fill="#D97E2B" />
                <circle cx={cx} cy={cy} r="3" fill="#FDFBF3" opacity="0.95" />
                {motionEnabled && isOn && (
                  <circle cx={cx} cy={cy} r="18" fill="none" stroke="#D97E2B" strokeWidth="2.5">
                    <animate attributeName="r" values="18;40" dur="3.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.75;0" dur="3.4s" repeatCount="indefinite" />
                  </circle>
                )}
```

Then, in the `<defs>` block near the top of the same `<svg>`, weaken the node-glow filter's blur (the line-glow filter for connections is untouched):

Find:
```tsx
                <filter id="mdoNodeGlow" x="-120%" y="-120%" width="340%" height="340%">
                  <feGaussianBlur stdDeviation="11" />
                </filter>
```
Replace with:
```tsx
                <filter id="mdoNodeGlow" x="-120%" y="-120%" width="340%" height="340%">
                  <feGaussianBlur stdDeviation="8" />
                </filter>
```

- [ ] **Step 3: Retune the connection-arc bow range and clamp arcs inside the frame**

Still in `MDOScene.tsx`, find the `MIN_ANCHOR_CLEARANCE` constant:

```tsx
const MIN_ANCHOR_CLEARANCE = 100;
```

Replace with:

```tsx
const MIN_ANCHOR_CLEARANCE = 80;
```

(Matches the ~20% smaller rings from Step 2 — a shrunken marker needs proportionally less clearance from an arc that doesn't connect to it.)

Find the `baseBow` line inside `edgeControl`:

```tsx
  const baseBow = Math.min(150, Math.max(45, edgeLen * 0.2));
```

Replace with:

```tsx
  const baseBow = Math.min(80, Math.max(35, edgeLen * 0.2));
```

Then add a frame-clamp helper right after the `FIELD_W`/`FIELD_H` constants (find `const FIELD_H = 1086;` and add the new function directly below it, before the `EDGES` comment block):

```tsx
const FIELD_W = 1448;
const FIELD_H = 1086;

/** Keeps a Bézier control point inside the visible field-photo frame (with a
    small margin) so a connection arc never bows out past the image's own
    edges. A quadratic Bézier stays within the convex hull of its three
    points, so clamping the control point alongside the two anchor points
    (always in-frame, since every domain's box is) keeps the whole curve
    in-frame too. */
function clampToField([x, y]: [number, number], margin = 10): [number, number] {
  return [Math.min(FIELD_W - margin, Math.max(margin, x)), Math.min(FIELD_H - margin, Math.max(margin, y))];
}
```

Finally, apply the clamp to both places `edgeControl` builds a candidate control point. Find:

```tsx
  let fallback: [number, number] = [mx + dx * baseBow, my + dy * baseBow];
```

Replace with:

```tsx
  let fallback: [number, number] = clampToField([mx + dx * baseBow, my + dy * baseBow]);
```

Find:

```tsx
      const control: [number, number] = [mx + rx * bow, my + ry * bow];
```

Replace with:

```tsx
      const control: [number, number] = clampToField([mx + rx * bow, my + ry * bow]);
```

- [ ] **Step 4: Verify with a screenshot**

Run the dev server and screenshot the scene per the Global Constraints verification loop:

```bash
npm run dev
```

Navigate to `http://localhost:3000/lessons/topic-01#scene-mdo`, resize to 1440px width, screenshot with all five domains on (the default state). Check:

- Ground vehicle sits in the foreground grass, roughly centered around field-photo x≈858, y≈790 (its anchor).
- Antenna is small and set back on the hillside, right side, base near y≈690.
- Ship's hull area sits in the blue water band (roughly the lower half of its own box), not fully on grass or fully in sky.
- Aircraft is in open sky, clearly separated from the satellite and from the horizon line.
- Satellite is upper-left sky, its caption pill still legible.
- Every marker ring is visibly smaller/lighter than before and no longer swallows the antenna image.
- No connection arc balloons far outside the five objects' cluster or gets clipped at the photo's edge.

Note any concrete pixel deltas in your report; do not fix them silently if they contradict this plan's numbers — flag as a finding instead.

- [ ] **Step 5: Commit**

```bash
git add src/components/lessons/topic-01/MDOScene.tsx
git commit -m "fix(topic-01): reposition MDO domain objects and rescale connection markers"
```

---

## Task 2: Add ground-contact shadows and a water-contact ripple

**Files:**
- Modify: `src/components/lessons/topic-01/MDOScene.tsx`

**Interfaces:**
- Consumes: Task 1's final `DOMAINS[].image` values and marker/edge tuning — must be committed first (same file, sequential, not parallel). Reuses the existing `box` variable (`const box = domainBox(d);`) already computed inside the `positioned.map((d) => { ... })` callback in `MDOFieldDiagram` — do not add a second box computation.
- Produces: final per-domain SVG markup for this plan; no later task depends on this one besides Task 3's verification pass.

- [ ] **Step 1: Add a ground-contact-domains constant**

In `src/components/lessons/topic-01/MDOScene.tsx`, find the `EDGES` array's closing and the `quadPoint` function that follows it — add the new constant right after `EDGES`'s closing `];`, before `function quadPoint`:

```tsx
const EDGES: [string, string][] = [
  ['land', 'air'],
  ['land', 'sea'],
  ['space', 'air'],
  ['space', 'land'],
  ['cyber', 'space'],
  ['cyber', 'land'],
  ['cyber', 'sea'],
];

/** Domains whose object stands on solid ground and gets a local
    contact shadow under its wheels/feet in the render below. Not `sea`
    (open water gets a water-contact ripple instead, not a shadow) and not
    `air`/`space` (nothing under them to ground them to). */
const GROUND_CONTACT_IDS = new Set(['land', 'cyber']);
```

- [ ] **Step 2: Add the two new filters**

In the same file, inside `MDOFieldDiagram`'s `<defs>` block, find the `mdoNodeGlow` filter (already edited by Task 1 to `stdDeviation="8"`) and add two new filters directly after it, before `</defs>`:

```tsx
                <filter id="mdoNodeGlow" x="-120%" y="-120%" width="340%" height="340%">
                  <feGaussianBlur stdDeviation="8" />
                </filter>
                {/* Soft, tight blur for the local ground-contact shadow under
                    the vehicle's wheels / the antenna's feet — deliberately
                    small and low-opacity so it reads as contact, not a cast
                    shadow. */}
                <filter id="mdoContactShadow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
                {/* Even softer, wider-but-thin blur for the ship's
                    water-contact ripple — a band across the hull's
                    waterline, not a halo around the whole image. */}
                <filter id="mdoWaterRipple" x="-40%" y="-150%" width="180%" height="400%">
                  <feGaussianBlur stdDeviation="2.5" />
                </filter>
```

- [ ] **Step 3: Draw the shadow/ripple inside each domain's group**

Still in `MDOFieldDiagram`, inside `positioned.map((d) => { ... })`, find the start of the per-domain group:

```tsx
              return (
                <g key={'domain-' + d.id} data-domain={d.id} style={{ opacity: isOn ? 1 : 0, transition: fade }}>
                  <image href={d.image.src} x={box.x} y={box.y} width={box.width} height={box.height} preserveAspectRatio="xMidYMid meet" />
```

Replace with (adds the two ground-position constants, a shadow ellipse *before* the image so it renders underneath the object, and a ripple ellipse *after* the image so it overlays the hull/water seam):

```tsx
              const groundCx = box.x + box.width / 2;
              const groundCy = box.y + box.height;
              return (
                <g key={'domain-' + d.id} data-domain={d.id} style={{ opacity: isOn ? 1 : 0, transition: fade }}>
                  {GROUND_CONTACT_IDS.has(d.id) && (
                    <ellipse
                      cx={groundCx}
                      cy={groundCy}
                      rx={box.width * 0.34}
                      ry={box.width * 0.075}
                      fill="#000000"
                      opacity="0.22"
                      filter="url(#mdoContactShadow)"
                    />
                  )}
                  <image href={d.image.src} x={box.x} y={box.y} width={box.width} height={box.height} preserveAspectRatio="xMidYMid meet" />
                  {d.id === 'sea' && (
                    <ellipse
                      cx={groundCx}
                      cy={box.y + box.height * 0.93}
                      rx={box.width * 0.42}
                      ry={box.width * 0.03}
                      fill="#F4F8FC"
                      opacity="0.3"
                      filter="url(#mdoWaterRipple)"
                    />
                  )}
```

Both new ellipses live **inside** the same `<g>` that the `style={{ opacity: isOn ? 1 : 0, ... }}` already gates — so they fade out with the rest of their domain's group when that domain is switched off, with no extra code needed for that behavior. The shadow's `cy={groundCy}` is exactly `box.y + box.height`, i.e. the object's own lowest pixel, so it always touches the base as required.

- [ ] **Step 4: Verify with a screenshot**

With the dev server still running (`npm run dev`), re-screenshot `http://localhost:3000/lessons/topic-01#scene-mdo` at 1440px width. Check:

- Ground vehicle has a soft, small dark shadow touching its wheels — not a hard-edged ellipse, not visible beyond the vehicle's own footprint.
- Antenna has the same, scaled down to its own thin footprint.
- Ship's hull-water line has a subtle light ripple, not a halo around the whole ship image.
- Aircraft and satellite have **no** ground shadow.
- Toggle each domain off one at a time (via its row in the left control panel) and confirm its shadow/ripple (and the rest of its group) disappears with it, and toggle back on to confirm it returns.

- [ ] **Step 5: Commit**

```bash
git add src/components/lessons/topic-01/MDOScene.tsx
git commit -m "feat(topic-01): add MDO ground-contact shadows and water ripple"
```

---

## Task 3: Full 1440px visual verification and deviation fixes

**Files:**
- Modify: `src/components/lessons/topic-01/MDOScene.tsx` (only if the screenshot check below finds a deviation worth fixing — otherwise this task may end with no diff)

**Interfaces:**
- Consumes: Task 1 + Task 2's final `MDOScene.tsx` — must be committed first (same file, sequential).
- Produces: final, verified state of this plan. Nothing depends on this task.

- [ ] **Step 1: Full-state screenshot pass**

With `npm run dev` running, open `http://localhost:3000/lessons/topic-01#scene-mdo`, resize to **1440px width**, and screenshot the scene in each of these states:

1. All five domains on (default).
2. Each domain individually switched off, one at a time (5 screenshots) — toggle via its row in the left control panel (`role="switch"` button), confirm that domain's object, marker, and (for `land`/`cyber`/`sea`) contact effect all fade out together, and every connection arc touching that domain also fades out (per-edge rule: an edge draws only when **both** endpoints are on).
3. All five domains off, then use "הפעלת כל הממדים" to restore all five — confirm everything returns.

For each of the five objects in the "all on" screenshot, confirm against this plan's field-photo boxes:

| Domain | Box (x, y, width×height) | Expected terrain |
|---|---|---|
| `land` (vehicle) | (730, 730, 255×118.8) | Foreground grass |
| `cyber` (antenna) | (1170, 490, 58×200.1) | Grass hillside, base at y≈690, clear of the bunker (bunker sits further right, ~x 1355–1415) |
| `sea` (ship) | (60, 435, 190×87.3) | Upper ~40px of box in sky, lower ~47px in water (horizon in this area is ≈y 473) — this split is correct, not a bug |
| `air` (aircraft) | (860, 210, 245×69.8) | Open sky, clear of the satellite and the horizon |
| `space` (satellite) | (315, 90, 115×62.6) | Upper-left sky |

- [ ] **Step 2: Fix any deviation found**

If any object's visible art doesn't sit correctly on its terrain (e.g. a wheel appears to float above the grass line, the ship reads as fully airborne or fully submerged, an arc visibly clips the photo edge, a marker ring still swallows the antenna), adjust the **smallest** value that fixes it:

- A few px off the ground/water line → adjust that domain's `y` in `DOMAINS` (and/or `width`, if the object reads too large/small for its slot) by the minimum needed, keeping `aspect` unchanged.
- A shadow/ripple that looks like a hard sticker outline or floats clear of the object → adjust only its own `rx`/`ry`/`opacity` (from Task 2), not its `cy` (which must stay `box.y + box.height` or, for the ripple, `box.y + box.height * 0.93` — the attachment point, not the visual size, is what "must touch the base" requires).
- An arc still balloons too wide or clips an edge → re-check `MIN_ANCHOR_CLEARANCE` and the `baseBow` clamp from Task 1 Step 3; only loosen the clamp's upper bound slightly (e.g. 80 → 95) if no smaller fix clears the obstacle, and say why in your report.

Do not change any `DOMAINS[]` value that the screenshot shows is already correct, and do not add any element beyond what Tasks 1–2 already specify (no new background decoration, no new shadow on `air`/`space`, no halo around the ship). If nothing needs fixing, say so explicitly in your report — a clean pass is a valid outcome for this task.

- [ ] **Step 3: Commit (only if Step 2 made changes)**

```bash
git add src/components/lessons/topic-01/MDOScene.tsx
git commit -m "fix(topic-01): correct MDO scene composition deviations found at 1440px"
```

If Step 2 made no changes, skip this commit and say so in your report — there is nothing to commit.
