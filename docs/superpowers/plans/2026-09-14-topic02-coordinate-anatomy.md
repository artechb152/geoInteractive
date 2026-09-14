# Topic 02 — "אנטומיה של נ״צ" Interactive Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Work happens directly on the current branch (`main`) — the user gave explicit consent, no worktree.

**Goal:** Rebuild the "אנטומיה של נ״צ: מה כל ספרה אומרת" block inside `CoordinatesScene.tsx` (Topic 02) as a real, interactive map+digit-anatomy panel matching the visual language of the supplied mockup, while keeping 100% of the existing Hebrew copy and touching nothing else in the file.

**Architecture:** One React client component (`DigitAnatomy`, already `'use client'` via the file) holding `precision` (6/8/10) and `activeZone` ('km' | 'fine' | null) state. A shared meters-based coordinate model derives every digit string and every highlighted-cell rectangle for both the main map (SVG grid over a raster `<img>`) and a zoom inset (the *same* raster reused via `background-position`/`background-size`, no second asset). Digit callouts are real `<button>`s whose hover/focus/click drive `activeZone`; a precision selector below drives `precision`. Everything is plain React state + Tailwind + inline SVG — no new dependency.

**Tech Stack:** Next.js 15 (app router), React, Tailwind (existing tokens only), framer-motion (`useReducedMotion`), existing `FrameCorners`/`Icon`/`cn` components.

**Spec:** The user's Hebrew brief (reproduced in full below in Global Constraints) plus `design/reference/lesson-02/lesson2part5image3.png` (design source) and the existing Hebrew copy in `CoordinatesScene.tsx` lines 296–358 (content source). No separate spec file exists; this plan carries the spec inline since it was produced directly from a `/reference-to-ui-exact` Phase-1 audit already completed and approved by the user in-conversation.

## Global Constraints

- **Scope lock:** ONLY `DigitAnatomy()` and `DigitGroup()` in `src/components/lessons/topic-02/CoordinatesScene.tsx` (currently lines 296–358) may change, plus the two import lines at the top of that file. `DatumShiftDemo`/`ImpactMap`, `GridReferenceExercise`/`DigitWalkthrough`/`DigitPractice`/`GridSquare`, `CoordinateAnatomy`, the `SYSTEMS` cards, and every other file in the repo are OUT OF SCOPE — do not touch them. `GRID_EAST_KM`/`GRID_NORTH_KM` (module-level consts, lines 301–302) are shared with the untouched drill below: read them, never change their values or delete them.
- **Content preservation (verbatim, zero rewording):** every existing Hebrew string in the current `DigitAnatomy`/`DigitGroup` must appear somewhere in the new version, unchanged character-for-character (it may be re-split across new sub-elements): the eyebrow "אנטומיה של נ״צ: מה כל ספרה אומרת", the H3 "נ״צ הוא לא מספר קסם — הוא שתי כתובות מדויקות, אחת בתוך השנייה", the intro paragraph (מזרח קודם/צפון אחר-כך/מד קואורדינטות/״מדקו״), the labels "מזרח · Easting" / "צפון · Northing" / "מספר משבצת ק״מ — מודפס על המפה" / "מיקום בתוך המשבצת — נמדד במדקו", and the closing paragraph (פי 10, 6/8/10 ספרות, "אורך הנ״צ לא הופך אתכם למדויקים יותר מהמפה ומהעין שלכם"). Do not invent new sentences of pedagogical content; short UI microcopy (button labels, aria-labels, a scale badge like "1 ק״מ"/"100 מ׳") is fine since it's UI chrome, not lesson content.
- **Design tokens only, no new hex:** `text-fg` / `text-fg-muted` / `text-fg-dim` (olive ink) for text and grid; `text-accent` / `bg-accent` (ember orange, `#D97E2B` family) for active highlights and in-cell position digits; `border-border` / `border-border-subtle` (tanline) for hairlines; `bg-bg` / `bg-bg-elevated` / `bg-bg/30` / `bg-bg/40` for surfaces. Do **not** use `text-accent-cool` (blue) anywhere in this component — the mockup uses one uniform olive/orange scheme for both axes, unlike the old code's per-axis blue/orange split.
- **No enclosing white card on the outer section:** unlike its sibling blocks in this file (which all use `surface-elevated ... border`), `DigitAnatomy`'s root must NOT have a card background/border — it sits directly on the page's cream canvas ("משטח קרם רציף המשתלב ברקע העמוד"). Inner elements (digit readouts, the info paragraph) may use subtle tinted surfaces (`bg-bg/30`, `bg-bg/40`, `border-border/40`) exactly like this same file's existing `DatumShiftDemo` inner panels.
- **RTL composition — map left, numbers right, via DOM order, not mirroring:** put the digit-readout column as the FIRST DOM child and the map as the SECOND DOM child inside a `grid lg:grid-cols-[1fr_1.5fr]` (no `order-*` utilities needed — this file's own `DatumShiftDemo` already proves plain DOM order gives correct RTL placement: first child → visual right, second child → visual left). The map's own internal SVG coordinate system is physical/Cartesian (east → increasing x → visual right growth in LTR terms, north → decreasing y): it must never be transformed/mirrored for RTL. Any absolutely-positioned element *inside* the map diagram (e.g. the zoom-inset overlay) uses **physical** `top-*`/`right-*` Tailwind utilities, not logical `start-*`/`end-*` — this exact situation already has a precedent comment in this same file at the `GridSquare` component ("Positioned in physical (non-logical) px because it must line up exactly with the grid... a diagram-alignment concern, not RTL text flow") — copy that reasoning into a comment at the new usage.
- **Isolated LTR digit rendering:** wrap each axis's full digit pair (km digits + fine digits) in a single `<bdi dir="ltr">` so `1783`/`6667`-style numbers render in correct left-to-right digit order regardless of the surrounding RTL context. Inside that `<bdi>`, the km digits and the fine digit(s) must be **separate DOM elements** (separate `<button>`s) so they can be styled/highlighted independently — never one text node.
- **Coordinate model — one fixed anchor, meters:** `ANATOMY_EAST_M = 178350`, `ANATOMY_NORTH_M = 666750`. All three precisions derive from this ONE pair, matching `GRID_EAST_KM`/`GRID_NORTH_KM` (`'178'`/`'666'`) exactly:
  - 6 digits → `178` / `666` (km only, no fine digit)
  - 8 digits → `1783` / `6667` (km + one "hundred-metres" digit: 300–400 m east, 700–800 m north of the km square's SW corner)
  - 10 digits → `17835` / `66675` (km + hundred-metres digit + one "ten-metres" digit)
  Never hardcode these digit strings directly except as the derivation's own inputs (`ANATOMY_EAST_M`/`ANATOMY_NORTH_M`) — always compute via the shared helper so a future anchor change stays consistent everywhere.
- **Shared image/SVG coordinate system:** the main map is a square container (`aspect-square`) with the raster `<img>` (`object-cover`, filling it) and an SVG overlay (`viewBox="0 0 600 600"`, `absolute inset-0 size-full`) as siblings in the exact same box — because both scale together with the container at any width, they never drift apart on resize. The "world" is a fictional 6 km × 6 km tile: east 175–181, north 663–669, so 1 km = 100 SVG units exactly. East increases rightward (`x = (eastKm − 175) × 100`), north increases upward (`y = 600 − (northKm − 663) × 100`) — this is a demonstration area with no real-world tie; do not reuse real ITM axis numbers beyond the already-fixed `178`/`666` example.
- **One raster asset, reused unscaled for the zoom, never a second image:** the terrain PNG lives at `public/reference-assets/coordinate-anatomy/terrain-map.png` (moved there by Task 1) and is referenced by an `<img>` in the main map AND by a CSS `background-image` in the zoom inset — same file, two different crops/scales, exactly per the brief ("אין להשתמש בתמונה אחרת לתקריב"). The zoom inset's `background-size`/`background-position` must be computed from the *same* 6 km world model (`WORLD_SPAN_KM = 6`) so the crop is always centered exactly on the fixed anchor point, at any precision.
- **Graduated CSS mask on the map raster only:** the `<img>` wrapper (not the SVG overlay, not the corner frames) gets `[mask-image:radial-gradient(...)]` (+ `-webkit-mask-image`) so the photographic map fades into the page's cream canvas at its edges — same technique already used in `src/components/landing/home/CoursePlanPanel.tsx`. Never apply a CSS filter/opacity fade that would degrade the source pixels used by the zoom.
- **Interactive zones — exactly two, literally per the brief:** hovering/focusing/clicking-or-tapping the **first three digits** (km group) sets `activeZone = 'km'`; doing the same on the **last digit** (whichever is finest for the current precision) sets `activeZone = 'fine'`. At 10-digit precision the middle (hundred-metres) digit is styled orange but is NOT an independent hover target — only "first three" and "last digit" are interactive, per the literal spec text. Mouse-leave/blur clears back to `null`; click/tap sets the same zone (covers touch, which has no hover). At 6-digit precision there is no fine digit at all: render its button `disabled` (not removed, so the readout's height never changes) showing `–` instead of a digit.
- **Precision selector — 3 options, segmented-button pattern already used lower in this same file** (`GridReferenceExercise`'s demo/practice toggle, ~line 655): plain `<button aria-pressed>`, DOM order 6→8→10 (so in RTL, 6 lands at visual right / coarsest-first, matching the mockup), with the existing `arrow-left` icon between adjacent options (already in `Icon.tsx`) as a decorative "advance" cue. Default precision is **8** (per the mockup and the brief).
- **No leader lines from the map to the digit numbers, and no leader line from the km-square to the zoom inset — deliberate, documented simplification** (write this to `design/assumptions.md` in Task 2): the mockup's static dashed connector lines don't generalize once the numbers are dynamic (different precision = different position), and the interactive hover-sync (digit ↔ map highlight) already communicates the same relationship more robustly and accessibly than a static line would. This mirrors this project's own prior precedent of dropping a mockup's decorative dashed route for the same class of reason (`design/assumptions.md`, Topic-02 scale-picker entry).
- **Corner frames:** reuse the existing `FrameCorners` component (`src/components/ui/FrameCorners.tsx`) — `tone="sage"` on the main map, `tone="accent"` on the zoom inset (ties the inset to the "active/zoomed" emphasis, matching the mockup's orange-bordered inset vs. the map's dark corner marks).
- **No layout shift when precision changes:** the digit-readout card, the main map, and the zoom inset must all keep a constant rendered height across all three precision values (already guaranteed by disabling rather than removing the fine-digit button, and by the map/inset containers using fixed `aspect-square` boxes regardless of what's drawn inside).
- **Motion:** short CSS transitions (`transition-colors`/`transition-all`) for highlight state changes, with `motion-reduce:transition-none` alongside every such class (Tailwind's built-in reduced-motion variant — no JS needed for these). The outer `motion.div` entrance (`whileInView` fade+rise, matching this file's sibling blocks) should gate on `useReducedMotion()` exactly like `TopographyScene.tsx` already does (`initial={reduce ? false : {...}}`).
- **Accessibility:** every interactive element needs a real accessible name (`aria-label` on the digit buttons describing what will be highlighted; the precision buttons' visible text is enough); visible `focus-visible:ring-2 focus-visible:ring-accent` on all of them (existing project convention); the distinction between "km digits" and "fine digits" must be explained in visible text (the existing caption lines), never by color alone; the raster `<img>` needs a real Hebrew `alt` ("מפת שטח דמיונית להדגמה, ללא שיוך למיקום אמיתי" or equivalent); the zoom inset (a CSS background-image, which has no native alt) needs `role="img"` + `aria-label`.
- **Verification method (this codebase's established convention, see `design/assumptions.md`'s many prior `/reference-to-ui-exact` entries):** headless Chrome via `puppeteer-core` (already in `node_modules`, no install needed) driving the local Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`, run with `node --input-type=module -e "..."` from the repo root so bare `import` specifiers resolve against the project's own `node_modules` (no new script files need to be committed for this — verification scripts are throwaway, run inline via Bash, never written into the repo). The dev server is already running in the background on **http://localhost:3001** (port 3000 was taken by another process); the route is `http://localhost:3001/lessons/topic-02/#scene-coordinates` (client-side hash routing — `PagedLearn` reads `window.location.hash` on mount, so this URL deep-links straight into the Coordinates sub-topic). `whileInView` animations need an actual scroll pass (or a `viewport={{ once: true }}` + manual `window.scrollTo` loop) before they read as visible in a screenshot — see the audit's own baseline-capture script for the exact pattern.

---

### Task 1: Rebuild `DigitAnatomy` as the interactive coordinate-anatomy panel

**Files:**
- Move: `ChatGPT Image Sep 14, 2026, 02_44_07 PM.png` (repo root) → `public/reference-assets/coordinate-anatomy/terrain-map.png`
- Create: `public/reference-assets/coordinate-anatomy/ASSET-MANIFEST.md`
- Modify: `src/components/lessons/topic-02/CoordinatesScene.tsx` (top imports + lines 296–358, the `DigitAnatomy`/`DigitGroup` block)

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`, `Icon` from `@/components/Icon` (already imported in this file), `FrameCorners` from `@/components/ui/FrameCorners` (new import), `motion`/`useReducedMotion` from `framer-motion` (add `useReducedMotion` to the existing import), the already-in-scope module consts `GRID_EAST_KM`/`GRID_NORTH_KM`.
- Produces: the public export surface of this file is unchanged (`CoordinatesScene` is still the only export) — nothing outside this file depends on `DigitAnatomy`'s internals, confirmed by repo-wide grep during the audit.

- [ ] **Step 1: Move the source image and write the asset manifest**

```bash
mkdir -p public/reference-assets/coordinate-anatomy
git mv "ChatGPT Image Sep 14, 2026, 02_44_07 PM.png" public/reference-assets/coordinate-anatomy/terrain-map.png
```

Create `public/reference-assets/coordinate-anatomy/ASSET-MANIFEST.md`:

```markdown
# Asset Manifest — coordinate-anatomy

| Filename | Purpose | Dimensions | Format | Fit | Status |
|---|---|---|---|---|---|
| terrain-map.png | Fictional demo terrain (no real-world tie), shared by the main map view and the zoom inset in Topic 02 → "אנטומיה של נ״צ" (`CoordinatesScene.tsx`, `DigitAnatomy`/`AnatomyMap`/`AnatomyZoomInset`) | 1254×1254 | PNG | main map: `object-cover`; zoom inset: CSS `background-size`/`background-position` crop, same file, no second asset | present |
```

- [ ] **Step 2: Update the two import lines at the top of `CoordinatesScene.tsx`**

Change:
```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';
```
to:
```tsx
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { FrameCorners } from '@/components/ui/FrameCorners';
import { cn } from '@/lib/utils';
```

- [ ] **Step 3: Replace the `DigitAnatomy`/`DigitGroup` block (current lines 296–358) with the following, verbatim**

Everything from the `/* ─────────────────── DIGIT ANATOMY...` comment through the end of the old `DigitGroup` function is replaced by:

```tsx
/* ─────────────────── DIGIT ANATOMY — WHAT EACH DIGIT MEANS ─────────────── */
/* Grid-square constants shared with the pinpoint drill below, so the
   worked example here and the interactive exercise refer to the same
   printed km-square (178 east / 666 north) — matching the corrected ITM
   example above (easting-first ordering). */
const GRID_EAST_KM = '178';
const GRID_NORTH_KM = '666';

/* Anatomy-only demo anchor, in metres. Every precision level (6/8/10
   digits) is derived from this ONE fixed point so the map, the digit
   callouts and the zoom always agree. Fictional area — no real-world tie. */
const ANATOMY_EAST_M = 178350;
const ANATOMY_NORTH_M = 666750;

type Precision = 6 | 8 | 10;
type DigitZone = 'km' | 'fine' | null;

type DigitSplit = { km: string; fine: string; full: string };

function splitDigits(totalMeters: number, precision: Precision): DigitSplit {
  const km = Math.floor(totalMeters / 1000);
  const remainder = totalMeters - km * 1000; // 0..999
  const kmStr = String(km);
  if (precision === 6) return { km: kmStr, fine: '', full: kmStr };
  const d1 = Math.floor(remainder / 100); // hundred-metres digit, 0-9
  if (precision === 8) return { km: kmStr, fine: String(d1), full: `${kmStr}${d1}` };
  const d2 = Math.floor((remainder - d1 * 100) / 10); // ten-metres digit, 0-9
  return { km: kmStr, fine: `${d1}${d2}`, full: `${kmStr}${d1}${d2}` };
}

// Fictional 6 km × 6 km demo tile shared by the map's SVG overlay and the
// zoom inset's background-image crop. 100 SVG units == 1 km, so the
// highlighted km-square always lands on a clean 100-unit cell. East
// increases rightward, north increases upward — never mirrored for RTL.
const MAP_EAST_MIN = 175;
const MAP_EAST_MAX = 181;
const MAP_NORTH_MIN = 663;
const MAP_NORTH_MAX = 669;
const MAP_VB = 600; // svg viewBox is 0 0 600 600
const WORLD_SPAN_KM = MAP_EAST_MAX - MAP_EAST_MIN; // 6

function eastToX(eastKm: number) {
  return (eastKm - MAP_EAST_MIN) * 100;
}
function northToY(northKm: number) {
  return MAP_VB - (northKm - MAP_NORTH_MIN) * 100;
}

const KM_EAST = Number(GRID_EAST_KM);
const KM_NORTH = Number(GRID_NORTH_KM);

// Fractional position of the demo anchor inside the full source image (0..1,
// image-space: x rightward, y downward) — reused as-is for the zoom inset's
// background-position, so the crop is always centred on the same point.
const DEMO_FRAC_X = (ANATOMY_EAST_M / 1000 - MAP_EAST_MIN) / WORLD_SPAN_KM;
const DEMO_FRAC_Y = 1 - (ANATOMY_NORTH_M / 1000 - MAP_NORTH_MIN) / WORLD_SPAN_KM;

const TERRAIN_MAP_SRC = '/reference-assets/coordinate-anatomy/terrain-map.png';

function DigitAnatomy() {
  const reduce = useReducedMotion();
  const [precision, setPrecision] = useState<Precision>(8);
  const [activeZone, setActiveZone] = useState<DigitZone>(null);

  const east = splitDigits(ANATOMY_EAST_M, precision);
  const north = splitDigits(ANATOMY_NORTH_M, precision);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="my-10"
    >
      <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">
        אנטומיה של נ&quot;צ: מה כל ספרה אומרת
      </div>
      <h3 className="font-display font-bold text-2xl sm:text-3xl leading-tight mb-4 text-balance">
        נ&quot;צ הוא לא מספר קסם — הוא שתי כתובות מדויקות, אחת בתוך השנייה
      </h3>
      <p className="text-fg leading-relaxed text-pretty mb-8 max-w-3xl">
        קוראים תמיד <strong className="text-fg">מזרח קודם, צפון אחר-כך</strong> — ואף פעם לא הפוך. בכל אחת משתי המחציות, שלוש הספרות הראשונות הן מספר משבצת הקילומטר <strong className="text-fg">המודפס על המפה עצמה</strong>; הספרות שאחריהן הן המיקום המדויק בתוך אותה משבצת, שאותו מודדים בעזרת <strong className="text-fg">מד קואורדינטות (&quot;מדקו&quot;)</strong> — סרגל שקוף שמחלק כל משבצת קילומטר לעשרה חלקים שווים.
      </p>

      {/* Digit readouts (visual right) + map (visual left) — first DOM child
          lands at inline-start/right in this RTL page, matching this same
          file's DatumShiftDemo two-column pattern one section up. */}
      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-6 lg:gap-10 items-start">
        <div className="flex flex-col gap-5">
          <DigitReadout
            axisLabel="Easting · מזרח"
            digits={east}
            activeZone={activeZone}
            onZoneChange={setActiveZone}
          />
          <DigitReadout
            axisLabel="Northing · צפון"
            digits={north}
            activeZone={activeZone}
            onZoneChange={setActiveZone}
          />
          <div className="p-4 sm:p-5 rounded-[3px] bg-bg/40 border border-border/40">
            <p className="text-sm text-fg-muted leading-relaxed">
              <strong className="text-fg">כל ספרה נוספת בתוך המשבצת מדייקת את המיקום פי 10 בכל ציר בנפרד:</strong> נ&quot;צ של 6 ספרות ({GRID_EAST_KM} / {GRID_NORTH_KM}) מצביע רק על משבצת קילומטר שלמה; נ&quot;צ של 8 ספרות (ספרה נוספת בכל צד, כמו בתרגיל שלמטה) מדייק עוד פי 10 בכל ציר; נ&quot;צ של 10 ספרות מדייק עוד פי 10 נוסף. אבל שימו לב — <strong className="text-fg">אורך הנ&quot;צ לא הופך אתכם למדויקים יותר מהמפה ומהעין שלכם.</strong> קריאה ארוכה בלי הערכה זהירה בשטח נותנת רק ביטחון-יתר מסוכן.
            </p>
          </div>
        </div>

        <AnatomyMap precision={precision} activeZone={activeZone} east={east} north={north} />
      </div>

      <PrecisionSelector precision={precision} onChange={setPrecision} />
    </motion.div>
  );
}

function DigitZoneButton({
  children,
  label,
  active,
  disabled,
  onActivate,
  onDeactivate,
  className,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={disabled ? undefined : onActivate}
      onMouseLeave={disabled ? undefined : onDeactivate}
      onFocus={disabled ? undefined : onActivate}
      onBlur={disabled ? undefined : onDeactivate}
      onClick={disabled ? undefined : onActivate}
      aria-pressed={disabled ? undefined : active}
      aria-label={label}
      className={cn(
        'rounded-[3px] px-1 -mx-1 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-elevated',
        disabled ? 'opacity-35 cursor-default' : 'cursor-pointer',
        active && !disabled && 'bg-accent/10',
        className,
      )}
    >
      {children}
    </button>
  );
}

function DigitReadout({
  axisLabel,
  digits,
  activeZone,
  onZoneChange,
}: {
  axisLabel: string;
  digits: DigitSplit;
  activeZone: DigitZone;
  onZoneChange: (zone: DigitZone) => void;
}) {
  const hasFine = digits.fine.length > 0;
  return (
    <div className="p-4 sm:p-5 rounded-[3px] border border-border/40 bg-bg/30">
      <div className="text-xs font-display font-semibold tracking-wider mb-3 text-fg-muted">{axisLabel}</div>
      <bdi dir="ltr" className="flex items-baseline gap-1 font-display font-bold text-4xl sm:text-5xl tabular-nums mb-3">
        <DigitZoneButton
          label={`שלוש הספרות הראשונות של ${axisLabel}: ${digits.km} — מספר משבצת הקילומטר המודפס על המפה`}
          active={activeZone === 'km'}
          onActivate={() => onZoneChange('km')}
          onDeactivate={() => onZoneChange(null)}
          className="text-fg"
        >
          {digits.km}
        </DigitZoneButton>
        <DigitZoneButton
          label={
            hasFine
              ? `הספרה האחרונה של ${axisLabel}: ${digits.fine} — המיקום בתוך המשבצת, נמדד במד הקואורדינטות`
              : `אין ספרת מיקום פנימית ברמת דיוק של 6 ספרות`
          }
          active={activeZone === 'fine'}
          disabled={!hasFine}
          onActivate={() => onZoneChange('fine')}
          onDeactivate={() => onZoneChange(null)}
          className="text-accent"
        >
          {hasFine ? digits.fine : '–'}
        </DigitZoneButton>
      </bdi>
      <div className="flex flex-col gap-1 text-[11px] text-fg-muted leading-snug">
        <span className={cn('flex items-center gap-1.5 transition-colors motion-reduce:transition-none', activeZone === 'km' && 'text-fg font-semibold')}>
          <span className="inline-block size-1.5 rounded-full shrink-0 bg-fg" aria-hidden />
          מספר משבצת ק&quot;מ — מודפס על המפה
        </span>
        <span
          className={cn(
            'flex items-center gap-1.5 transition-colors motion-reduce:transition-none',
            !hasFine && 'opacity-40',
            activeZone === 'fine' && hasFine && 'text-accent font-semibold',
          )}
        >
          <span className="inline-block size-1.5 rounded-full shrink-0 bg-accent" aria-hidden />
          מיקום בתוך המשבצת — נמדד במדקו
        </span>
      </div>
    </div>
  );
}

function AnatomyMap({
  precision,
  activeZone,
  east,
  north,
}: {
  precision: Precision;
  activeZone: DigitZone;
  east: DigitSplit;
  north: DigitSplit;
}) {
  const kmX = eastToX(KM_EAST);
  const kmY = northToY(KM_NORTH + 1); // top edge (higher northing = smaller y)
  const KM_SIZE = 100;

  const showHundredCell = precision === 8 || precision === 10;
  const fineD1e = showHundredCell ? Number(east.fine[0]) : undefined;
  const fineD1n = showHundredCell ? Number(north.fine[0]) : undefined;
  const fineX = fineD1e !== undefined ? kmX + fineD1e * 10 : undefined;
  const fineY = fineD1n !== undefined ? kmY + (9 - fineD1n) * 10 : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square rounded-[4px] overflow-hidden">
        {/* Raster layer, faded into the page canvas via a graduated CSS
            mask — the pixels themselves are never degraded, so the exact
            same file can be reused unscaled for the zoom inset below. */}
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_82%_82%_at_50%_50%,black_62%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_82%_82%_at_50%_50%,black_62%,transparent_100%)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export; reused pixel-identical for the zoom inset */}
          <img
            src={TERRAIN_MAP_SRC}
            alt="מפת שטח דמיונית להדגמה, ללא שיוך למיקום אמיתי"
            draggable={false}
            className="size-full object-cover"
          />
        </div>

        <FrameCorners tone="sage" />

        <svg
          viewBox={`0 0 ${MAP_VB} ${MAP_VB}`}
          className="absolute inset-0 size-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          {Array.from({ length: WORLD_SPAN_KM + 1 }).map((_, i) => {
            const eastKm = MAP_EAST_MIN + i;
            const northKm = MAP_NORTH_MIN + i;
            return (
              <g key={i}>
                <line x1={i * 100} y1="0" x2={i * 100} y2={MAP_VB} className="stroke-fg/20" strokeWidth="1" />
                <line x1="0" y1={MAP_VB - i * 100} x2={MAP_VB} y2={MAP_VB - i * 100} className="stroke-fg/20" strokeWidth="1" />
                <text x={i * 100 + 4} y={MAP_VB - 4} fontSize="11" textAnchor="start" className="fill-fg/50 font-display font-semibold">
                  {eastKm}
                </text>
                <text x="4" y={MAP_VB - i * 100 - 6} fontSize="11" textAnchor="start" className="fill-fg/50 font-display font-semibold">
                  {northKm}
                </text>
              </g>
            );
          })}

          <rect
            x={kmX}
            y={kmY}
            width={KM_SIZE}
            height={KM_SIZE}
            fill="none"
            className={cn('transition-all motion-reduce:transition-none', activeZone === 'km' ? 'stroke-fg' : 'stroke-fg/70')}
            strokeWidth={activeZone === 'km' ? 4 : 2.5}
          />

          {fineX !== undefined && fineY !== undefined && (
            <rect
              x={fineX}
              y={fineY}
              width={10}
              height={10}
              className={cn(
                'transition-all motion-reduce:transition-none',
                activeZone === 'fine' ? 'fill-accent/40 stroke-accent' : 'fill-accent/20 stroke-accent/70',
              )}
              strokeWidth={activeZone === 'fine' ? 2.5 : 1.5}
            />
          )}
        </svg>

        <AnatomyZoomInset layout="overlay" precision={precision} activeZone={activeZone} east={east} north={north} />
      </div>

      <AnatomyZoomInset layout="stacked" precision={precision} activeZone={activeZone} east={east} north={north} />
    </div>
  );
}

function AnatomyZoomInset({
  layout,
  precision,
  activeZone,
  east,
  north,
}: {
  layout: 'overlay' | 'stacked';
  precision: Precision;
  activeZone: DigitZone;
  east: DigitSplit;
  north: DigitSplit;
}) {
  const showHundredCell = precision === 8 || precision === 10;
  const showTenCell = precision === 10;

  // Crop window, in km: the whole km-square while showing the 100 m cell;
  // the 100 m cell itself once the 10 m subdivision needs to be legible.
  const cropKm = showTenCell ? 0.1 : 1;
  const scalePct = (WORLD_SPAN_KM / cropKm) * 100;

  const d1e = showHundredCell ? Number(east.fine[0]) : 0;
  const d1n = showHundredCell ? Number(north.fine[0]) : 0;
  const d2e = showTenCell ? Number(east.fine[1]) : 0;
  const d2n = showTenCell ? Number(north.fine[1]) : 0;

  // The inset's own local grid is always 0..100, representing whichever
  // physical cell is currently framed (the 1 km square, or — at 10
  // digits — the 100 m cell within it).
  const cellX = showTenCell ? d2e * 10 : d1e * 10;
  const cellY = showTenCell ? (9 - d2n) * 10 : (9 - d1n) * 10;
  const showCell = showHundredCell;

  return (
    <div
      className={cn(
        'relative aspect-square rounded-[4px] overflow-hidden',
        layout === 'overlay'
          ? /* Physical placement (top/right, not logical start/end) — this
               diagram-internal anchor must not flip under RTL, exactly like
               this same file's GridSquare overlay a few hundred lines down. */
            'hidden lg:block lg:absolute lg:top-3 lg:right-3 lg:w-[38%]'
          : 'lg:hidden w-full max-w-[200px] mx-auto',
      )}
    >
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: `url(${TERRAIN_MAP_SRC})`,
          backgroundSize: `${scalePct}% ${scalePct}%`,
          backgroundPosition: `${DEMO_FRAC_X * 100}% ${DEMO_FRAC_Y * 100}%`,
        }}
        role="img"
        aria-label={showTenCell ? 'תקריב על תא של 10 מטר בתוך משבצת המאה מטר, מאותה מפה' : 'תקריב על משבצת הקילומטר, מאותה מפה'}
      />

      <FrameCorners tone="accent" />

      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" preserveAspectRatio="none" aria-hidden>
        {Array.from({ length: 9 }).map((_, i) => (
          <g key={i}>
            <line x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2="100" className="stroke-fg/25" strokeWidth="0.6" />
            <line x1="0" y1={(i + 1) * 10} x2="100" y2={(i + 1) * 10} className="stroke-fg/25" strokeWidth="0.6" />
          </g>
        ))}
        <rect x="0" y="0" width="100" height="100" fill="none" className="stroke-fg/70" strokeWidth="1.2" />

        {showCell && (
          <g transform={`translate(${cellX} ${cellY})`}>
            <rect
              width="10"
              height="10"
              className={cn(
                'transition-all motion-reduce:transition-none',
                activeZone === 'fine' ? 'fill-accent/35 stroke-accent' : 'fill-accent/15 stroke-accent/70',
              )}
              strokeWidth={activeZone === 'fine' ? 1.4 : 0.9}
            />
            {/* Center marker — a visual anchor only, not a claim of finer accuracy. */}
            <circle cx="5" cy="5" r="1.1" className="fill-accent" />
          </g>
        )}
      </svg>

      <div className="absolute bottom-1.5 right-1.5 rounded-[2px] bg-bg-elevated/85 px-1.5 py-0.5 text-[9px] font-display font-semibold text-fg-muted">
        {showTenCell ? '100 מ׳' : '1 ק״מ'}
      </div>
    </div>
  );
}

const PRECISION_OPTIONS: { value: Precision; label: string; meters: string }[] = [
  { value: 6, label: '6 ספרות', meters: 'תא של 1 ק״מ בכל ציר' },
  { value: 8, label: '8 ספרות', meters: 'תא של 100 מ׳ בכל ציר' },
  { value: 10, label: '10 ספרות', meters: 'תא של 10 מ׳ בכל ציר' },
];

function PrecisionGlyph({ level, active }: { level: Precision; active: boolean }) {
  const tone = active ? 'stroke-accent' : 'stroke-fg-muted';
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect x="2" y="2" width="24" height="24" className={tone} strokeWidth="1.5" />
      {level !== 6 && <rect x="7" y="7" width="14" height="14" className={tone} strokeWidth="1.5" />}
      {level === 10 && <rect x="11" y="11" width="6" height="6" className={tone} strokeWidth="1.5" />}
      <circle cx="14" cy="14" r="1.4" className={active ? 'fill-accent' : 'fill-fg-muted'} />
    </svg>
  );
}

function PrecisionSelector({ precision, onChange }: { precision: Precision; onChange: (p: Precision) => void }) {
  return (
    <div className="mt-8 pt-6 border-t border-border-subtle">
      <div className="text-sm font-display font-semibold text-fg mb-4">כל ספרה נוספת — פי 10 דיוק בכל ציר</div>
      <div role="group" aria-label="רמת דיוק הנ״צ" className="flex flex-wrap items-center gap-3 sm:gap-2">
        {PRECISION_OPTIONS.map((opt, i) => (
          <div key={opt.value} className="flex items-center gap-3 sm:gap-2">
            <button
              type="button"
              aria-pressed={precision === opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex items-center gap-2.5 rounded-[3px] border px-3 py-2 text-start transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                precision === opt.value ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-fg-muted',
              )}
            >
              <PrecisionGlyph level={opt.value} active={precision === opt.value} />
              <span>
                <span className={cn('block text-sm font-display font-bold', precision === opt.value ? 'text-accent' : 'text-fg')}>
                  {opt.label}
                </span>
                <span className="block text-[11px] text-fg-muted">{opt.meters}</span>
              </span>
            </button>
            {i < PRECISION_OPTIONS.length - 1 && <Icon name="arrow-left" size={14} className="text-fg-dim shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Type-check and build**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this file (pre-existing unrelated errors elsewhere, if any, are not this task's concern — note them in the report but do not fix them).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Smoke-verify in the running dev server**

The dev server is already running in the background on port 3001 (started by the controller before this task). If it is not reachable, start it yourself: `npm run dev` (background) and wait for "Ready".

```bash
node --input-type=module -e "
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  defaultViewport: { width: 1440, height: 1000, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:3001/lessons/topic-02/#scene-coordinates', { waitUntil: 'networkidle0', timeout: 30000 });
await page.evaluate(async () => { for (let y=0;y<document.body.scrollHeight;y+=400){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,50)); } window.scrollTo(0,0); });
await new Promise(r => setTimeout(r, 400));
const east = await page.\$eval('bdi', el => el.textContent);
console.log('errors:', JSON.stringify(errors));
console.log('first bdi text (expect 1783):', east);
const precisionButtons = await page.\$\$('div[role=group] button');
await precisionButtons[0].click(); // index 0 = 6-digit (DOM order: 6, 8, 10)
await new Promise(r => setTimeout(r, 200));
console.log('after 6-digit click:', await page.\$eval('bdi', el => el.textContent));
await browser.close();
"
```
Expected: `errors: []`, first read shows `1783` (default precision 8), second read after clicking the first precision button shows `178–` (km digits + disabled placeholder dash) confirming state wiring works. If this fails, fix the component before reporting DONE.

- [ ] **Step 6: Commit**

```bash
git add public/reference-assets/coordinate-anatomy src/components/lessons/topic-02/CoordinatesScene.tsx
git commit -m "feat(topic-02): rebuild digit-anatomy panel as interactive map + coordinate model

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Visual verification, responsive/a11y pass, and docs

**Files:**
- Modify (only if deltas are found): `src/components/lessons/topic-02/CoordinatesScene.tsx` (same scope lock as Task 1 — only the `DigitAnatomy` block)
- Modify: `design/assumptions.md` (append a new dated section)
- Modify: `docs/UI-CONSISTENCY-RECOMMENDATIONS.md` (update the Topic-02 entry per that file's existing section skeleton — read it first, follow its established format)

**Interfaces:**
- Consumes: the component built in Task 1 (`DigitAnatomy` and its sub-components in `CoordinatesScene.tsx`), the running dev server on `http://localhost:3001`.
- Produces: no new interfaces — this task verifies and polishes Task 1's deliverable and writes documentation.

- [ ] **Step 1: Screenshot at desktop (1440px) and compare against the mockup crop**

```bash
node --input-type=module -e "
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  defaultViewport: { width: 1440, height: 1100, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
await page.goto('http://localhost:3001/lessons/topic-02/#scene-coordinates', { waitUntil: 'networkidle0', timeout: 30000 });
await page.evaluate(async () => { for (let y=0;y<document.body.scrollHeight;y+=400){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,50)); } });
await new Promise(r => setTimeout(r, 400));
const box = await page.evaluate(() => {
  const h3 = [...document.querySelectorAll('h3')].find(el => el.textContent?.includes('נ\"צ הוא לא מספר קסם'));
  const root = h3.closest('div').parentElement; // the motion.div wrapper
  const r = root.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});
await page.screenshot({ path: 'PLACEHOLDER_OUT_DIR/task2-desktop-1440.png', clip: box });
console.log('saved, box=', JSON.stringify(box));
await browser.close();
"
```

Replace `PLACEHOLDER_OUT_DIR` with a path under your own scratch/temp directory (never commit screenshots to the repo). Read the resulting PNG and compare it against `design/reference/lesson-02/lesson2part5image3.png` (already read once during the audit — re-read it now). List concrete deltas: wrong spacing, wrong color, text overflow/clipping, misaligned map/text columns, corner frames missing/misplaced. Fix every delta directly in `CoordinatesScene.tsx`, re-run this screenshot, repeat until no material mismatch remains (per this project's own `/reference-to-ui-exact` convention — see the many prior entries in `design/assumptions.md` for the expected rigor).

- [ ] **Step 2: Screenshot at mobile width (390px) and check reading order + no horizontal scroll**

```bash
node --input-type=module -e "
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  defaultViewport: { width: 390, height: 1400, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
await page.goto('http://localhost:3001/lessons/topic-02/#scene-coordinates', { waitUntil: 'networkidle0', timeout: 30000 });
await page.evaluate(async () => { for (let y=0;y<document.body.scrollHeight;y+=400){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,50)); } });
await new Promise(r => setTimeout(r, 400));
console.log('scrollWidth vs clientWidth:', await page.evaluate(() => [document.body.scrollWidth, document.documentElement.clientWidth]));
await page.screenshot({ path: 'PLACEHOLDER_OUT_DIR/task2-mobile-390.png', fullPage: false });
await browser.close();
"
```
Expected: `scrollWidth` not meaningfully greater than `clientWidth` (a few px of pre-existing page-chrome overflow is a known, already-logged, out-of-scope issue per `design/assumptions.md` — do not chase that; only fix overflow you can attribute to `DigitAnatomy` itself, e.g. via a DOM walk for elements wider than the viewport inside the section). Confirm visually (read the screenshot) that the order is: heading → digit readouts → map → zoom inset (stacked) → precision selector, with no clipped text and the map staying square (not letterboxed oddly).

- [ ] **Step 3: Interaction + accessibility check**

```bash
node --input-type=module -e "
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  defaultViewport: { width: 1440, height: 1000, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
await page.goto('http://localhost:3001/lessons/topic-02/#scene-coordinates', { waitUntil: 'networkidle0', timeout: 30000 });
await page.evaluate(async () => { for (let y=0;y<document.body.scrollHeight;y+=400){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,50)); } });
// Tab to the first digit button and confirm a visible focus ring + aria-label.
const info = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('bdi button')];
  return btns.map(b => ({ label: b.getAttribute('aria-label'), disabled: b.disabled, text: b.textContent }));
});
console.log('digit buttons:', JSON.stringify(info, null, 2));
// Switch to 6-digit and confirm the fine button becomes disabled with '–'.
const groupButtons = await page.\$\$('div[role=group] button');
await groupButtons[0].click();
await new Promise(r => setTimeout(r, 200));
console.log('after 6-digit:', await page.evaluate(() => [...document.querySelectorAll('bdi button')].map(b => ({ disabled: b.disabled, text: b.textContent }))));
// Switch to 10-digit and confirm the inset shows the finer crop.
await groupButtons[2].click();
await new Promise(r => setTimeout(r, 200));
console.log('after 10-digit:', await page.evaluate(() => [...document.querySelectorAll('bdi button')].map(b => b.textContent)));
await browser.close();
"
```
Expected: every digit button has a non-empty `aria-label`; at 6-digit the second button in each `bdi` is `disabled` and reads `–`; at 10-digit the digits read `17835`/`66675`. Confirm no color-only distinction: the two caption lines under each readout must remain in the DOM/visible regardless of state (already true if Task 1 was followed — verify, don't just assume).

- [ ] **Step 4: Update `design/assumptions.md`**

Append a new dated section (follow the file's existing format exactly — one bullet per assumption, most-recent section at the bottom):

```markdown

## 2026-09-14 — Topic 02 "אנטומיה של נ״צ" rebuilt as an interactive map (reference: `design/reference/lesson-02/lesson2part5image3.png`)

- **Scope limited to `DigitAnatomy`/`DigitGroup` inside `CoordinatesScene.tsx`**, per explicit instruction — `DatumShiftDemo` (deviation simulation), `GridReferenceExercise` (pinpoint drill), and `CoordinateAnatomy` (the separate closing "bottom line" block) were confirmed untouched.
- **Coordinate model:** one fixed anchor (east 178350 m / north 666750 m) derives all three precisions (178/666, 1783/6667, 17835/66675) via a single `splitDigits()` helper — matches the pre-existing `GRID_EAST_KM`/`GRID_NORTH_KM` worked example exactly, confirmed by direct calculation before implementation.
- **Dropped the mockup's per-axis blue/orange color split** (old code used `text-accent-cool` for Northing): the mockup itself uses one uniform olive/orange scheme for both axes — the mockup is the design source of truth, so the uniform scheme was adopted; `text-accent-cool` is untouched everywhere else it's used in this file.
- **No leader lines from the map to the digit numbers, and none from the km-square to the zoom inset** — deliberate simplification, not an oversight: the mockup's static dashed connectors don't generalize once the numbers are dynamic per precision level, and the interactive hover-sync (digit ↔ map highlight) communicates the same relationship more robustly. Mirrors this file's own prior precedent (the Topic-02 scale-picker entry above, which dropped a similarly-static illustrative route for the same class of reason).
- **One raster asset reused for both the main map and the zoom inset**, via CSS `background-position`/`background-size` on the same file (`terrain-map.png`) rather than a second cropped image — per explicit instruction. At the 10-digit precision the crop is ~10× beyond the source's native resolution (a 100 m window out of a 1254 px, 6 km-wide source), which reads as a soft/painterly close-up rather than crisp new detail — an inherent, accepted consequence of reusing one fixed-resolution demo asset at its deepest zoom, not a bug.
- **Zoom-inset desktop placement is a physical (non-logical) `top-3 right-3` overlay inside the map**, matching this same file's own established precedent comment on `GridSquare`'s overlay ("a diagram-alignment concern, not RTL text flow") — never flips under RTL. Mobile renders a separate, normal-flow stacked instance instead of trying to reposition the same absolutely-positioned box.
- [Add any further deltas found and fixed during the Task 2 verification loop — desktop/mobile screenshot deltas, a11y fixes, anything not already covered above.]
```

(The implementer must replace the bracketed final line with real content describing whatever was actually found/fixed in Steps 1–3, or delete it if nothing further came up.)

- [ ] **Step 5: Update `docs/UI-CONSISTENCY-RECOMMENDATIONS.md`**

Read the file first. Under its existing `### Topic 02` (or equivalent) screen-specific-findings subsection — create one if none exists yet, following the file's established skeleton — add a one-line dated note that this block was rebuilt, and note reusable patterns worth flagging for other lessons if any turned up (e.g. "same raster reused for a live zoom via background-position/size — candidate pattern for other lesson maps"). If there is nothing new to add beyond what's already there, follow the file's own rule: update the entry with today's date and "No new consistency recommendation from this reference."

- [ ] **Step 6: Final full-scene regression check**

Screenshot the entire `#scene-coordinates` section (all four sub-blocks: concept cards, `DatumShiftDemo`, the new `DigitAnatomy`, `GridReferenceExercise`, `CoordinateAnatomy`) at 1440px and confirm by reading the image that nothing outside `DigitAnatomy` visually changed and the deviation-simulation slider and the pinpoint-drill exercise still render and are still clickable (click one cell in the practice drill and confirm the correctness check still fires — this is the "אינטראקציות סמוכות" regression check from the original brief).

- [ ] **Step 7: Commit**

```bash
git add design/assumptions.md docs/UI-CONSISTENCY-RECOMMENDATIONS.md src/components/lessons/topic-02/CoordinatesScene.tsx
git commit -m "polish(topic-02): verify digit-anatomy panel across viewports, document assumptions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

(If Step 1/2/3 found zero deltas needing a code fix, this commit will only touch the two docs files — that's fine, still commit.)
