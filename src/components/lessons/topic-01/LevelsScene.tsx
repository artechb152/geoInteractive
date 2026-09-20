'use client';

import {
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { IsometricAsset } from '@/components/assets/IsometricAsset';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Level = 'strategic' | 'operational' | 'tactical';

type LevelMeta = {
  label: string;
  english: string;
  who: string;
  zoom: string;
  zoomIcon: IconName;
  time: string;
  example: string;
  zoomLevel: number; // 1=widest, 3=closest
  dragIcon: string; // category icon shown above the label in the drag exercise
  dragSubtitle: string; // bullet-separated keywords under the label in the drag exercise
};

const DRAG_ASSET_BASE = '/assets/lessons/topic01/scene-levels/drag-exercise';

// Mouse-drag-to-pan threshold (px) for the horizontal scenario strip below —
// same pattern and value as the home page's CoursePlanPanel carousel row.
const POOL_DRAG_CLICK_THRESHOLD = 4;

// Only this many events are offered for sorting at once; each accepted
// placement reveals the next one in SCENARIOS order. Chosen over showing all
// 6 because 6 x 256px overflowed the pool row at 1440px and forced the learner
// to pan the strip to find an event. At 1440px the pool row's inner width is
// ~1344px, so 4 equal chips are ~327px each - wider than the old fixed w-64,
// so nothing gets less readable.
const POOL_VISIBLE_SLOTS = 4;

const LEVELS: Record<Level, LevelMeta> = {
  strategic: {
    label: 'אסטרטגית',
    english: 'Strategic',
    who: 'הדרג המדיני (הממשלה) והרמטכ"ל',
    zoom: '"מבט מלוויין" (גלובלי) – מדינות שלמות, יבשות ואוקיינוסים.',
    zoomIcon: 'globe',
    time: 'חודשים עד שנים. החלטות שמשפיעות על דורות.',
    example: 'האם המדינה יוצאת למלחמה כוללת? עם אילו מדינות חותמים ברית? החלטות תקציב דרמטיות, למשל – להפסיק לייצר טנקים ולרכוש צוללות במקום.',
    zoomLevel: 1,
    dragIcon: `${DRAG_ASSET_BASE}/TOPIC01-LEVELS-DRAG-BADGE-STRATEGIC.png`,
    dragSubtitle: 'דרג לאומי • חזון • משאבים',
  },
  operational: {
    label: 'אופרטיבית',
    english: 'Operational',
    who: 'אלופי הפיקודים ומפקדי האוגדות — דרג הביניים שמחבר בין החזון לשטח.',
    zoom: '"מבט רחב ב-Waze" (אזורי) – עשרות עד מאות קילומטרים.',
    zoomIcon: 'layers',
    time: 'ימים, שבועות או חודשים.',
    example: 'תכנון איך להזרים 30,000 חיילים ומאות טנקים לחזית מבלי ליצור פקק תנועה ענק ופגיע, והחלטה איפה להקים עבורם מאגרי דלק ענקיים בשטח.',
    zoomLevel: 2,
    dragIcon: `${DRAG_ASSET_BASE}/TOPIC01-LEVELS-DRAG-BADGE-OPERATIONAL.png`,
    dragSubtitle: 'מערכות • תיאום • מהלכים',
  },
  tactical: {
    label: 'טקטית',
    english: 'Tactical',
    who: 'המפקדים בשטח (מג"דים, מ"פים) ועד החייל הבודד בקצה.',
    zoom: '"Street View" (מקומי) – נמדד במטרים: סלע בודד, חלון בבניין או ערוץ נחל.',
    zoomIcon: 'crosshair',
    time: 'שניות, דקות או שעות ספורות. החלטות של חיים ומוות ב"כאן ועכשיו".',
    example: 'בחירת סלע ספציפי שיסתיר חייל מצלף, החלטה מאיזו זווית לפרוץ לבניין כדי שהשמש תסנוור את האויב, ובאיזה ערוץ נחל הפלוגה תתגנב בשקט בלי להתגלות.',
    zoomLevel: 3,
    dragIcon: `${DRAG_ASSET_BASE}/TOPIC01-LEVELS-DRAG-BADGE-TACTICAL.png`,
    dragSubtitle: 'כוחות • אש • שטח',
  },
};

// In RTL, first column → right side. Strategic = broadest = right.
const LEVEL_ORDER: Level[] = ['strategic', 'operational', 'tactical'];

// TOPIC01-LEVELS-DRAG-BG.png has a fixed physical layout baked into the
// artwork — strategic/purple-capitol on the left, tactical/tan-truck on
// the right — which does not mirror for RTL (project rule: never mirror
// illustrations). Grid children reverse in an RTL document (DOM child 1 →
// rightmost column), so this list is LEVEL_ORDER reversed to land each
// zone's overlay on the matching physical patch of the image.
const DRAG_ZONE_ORDER: Level[] = ['tactical', 'operational', 'strategic'];

// TOPIC01-LEVELS-{STRATEGIC,OPERATIONAL,TACTICAL}-BANNER.png — one
// photograph per level, same 2172×724 (3:1) format as this lesson's own
// AsymmetricScene.tsx ACTOR-*-BANNER.png assets, used as each column's
// header image in the levels table (LevelsTable) below.
const LEVEL_BANNER_BASE = '/assets/lessons/topic01/scene-levels';

const LEVEL_BANNER_PROMPT: Record<Level, string> = {
  strategic:
    'Photorealistic documentary-style photo of Israeli generals and government officials seated around a conference table in a dim strategic war room, viewed from behind, studying a large illuminated wall map of the world; an Israeli flag stands beside the map, muted warm interior lighting, shallow depth of field, no text overlays, no visible faces in close-up.',
  operational:
    'Photorealistic documentary-style photo of military officers in a field command-and-control room, viewed from behind, pointing at a large regional map on a wide wall-mounted screen bank with mountains visible through a window beside them, natural daylight mixed with screen glow, shallow depth of field, no text overlays, no visible faces in close-up.',
  tactical:
    'Photorealistic documentary-style photo of soldiers in full combat gear hiking single-file along a rocky hillside trail at golden hour, shot from behind, sweeping valley and coastline in the background, natural daylight, shallow depth of field, no text overlays, no visible faces in close-up.',
};

// TOPIC01-LEVELS-DRAG-BG.png's orange ("operational") landmass isn't
// centered in its own grid column — its visual center sits ~3 percentage
// points of the full image width to the right of the column's midpoint
// (measured by sampling the shape's left/right outline across its
// height). Expressed as a fraction of the column's own width (since the
// overlay div below spans the column edge-to-edge), that's a ~9%
// translateX nudge; the other two zones' shapes are already centered in
// their columns, so this map is empty for them. The strategic zone is the
// odd one out here: it's the edge column (bounded by the page edge, not by
// a second shape outline), and its green landmass reads visually wider on
// its left side (compass rose + tree line) than its right — the icon/label
// column, centered on the grid column itself, ends up sitting left of the
// landmass's own visual center. Nudged right to match, same technique as
// operational above.
const ZONE_CONTENT_OFFSET: Partial<Record<Level, string>> = {
  strategic: '8%',
  operational: '9%',
};

// Reference `exec-ff34cfc5` uses one uniform dark-ink label color and one
// uniform accent dashed drop-box across all 3 zones — not a color per zone
// (the old per-zone accent-intel/accent/terrain-sand palette made the
// tactical zone's label and drop-box unreadable, since terrain-sand nearly
// matches the tactical terrain artwork behind it).
//
// A light text-shadow halo alone (2nd attempt) only separates dark ink
// from a DARKER patch behind it — it did nothing where the terrain
// artwork itself is light (the tan tactical ground, the pale strategic
// sky/rock), so it read as no contrast there. A solid backing plate (3rd
// attempt) fixed contrast but boxed the text off the map, which reads
// wrong on this photoreal diorama — direct user request to drop the
// plate and rely on text color alone instead.
//
// paper.bright (#FDFBF3, already an approved token — used elsewhere as
// the dark progress-card's on-photo text color) is brighter than every
// terrain patch in this artwork, so it reads as contrast everywhere the
// backing plate did. A dark drop-shadow (opposite polarity from the
// failed light halo above) gives the glyph edges definition against the
// artwork's own lighter patches too, without needing an opaque box.
const ZONE_LABEL_TEXT = 'text-paper-bright [text-shadow:0_1px_3px_rgba(20,18,10,0.65),0_1px_10px_rgba(20,18,10,0.5)]';
const ZONE_SUBTITLE_TEXT = 'text-paper-bright/90 [text-shadow:0_1px_2px_rgba(20,18,10,0.6),0_1px_8px_rgba(20,18,10,0.45)]';

// The "גררו לכאן" / "שחרר כאן" / "הקש לשבץ כאן" drop-target hint (inside
// the dashed box below the label/subtitle above) used to render in flat
// text-fg-muted with NO halo, and — in its idle state — the whole box
// including that text was additionally dropped to opacity-70. A
// text-shadow halo alone (first attempt) still wasn't enough here: this
// artwork is a photoreal terrain photo, not a flat illustration, and its
// fine-grained texture (grass blades, rock stipple, mixed light/dark
// patches) breaks up thin small-text glyph edges enough that the halo
// doesn't reliably separate them — confirmed still barely legible after
// that pass. The box now gets an actual near-opaque light backing plate
// (paper.card) instead of floating directly over the photo, so the hint
// text sits on a flat, predictable surface with guaranteed contrast no
// matter what terrain patch is behind it; the halo stays as a cheap
// belt-and-suspenders in case the backing is ever made more transparent.
const ZONE_HINT_TEXT = 'text-fg [text-shadow:0_1px_1px_rgba(248,242,231,0.6)]';
const ZONE_DASH_BORDER = 'border-accent/60';
const ZONE_DASH_BORDER_ACTIVE = 'border-accent';
const ZONE_DASH_BG_IDLE = 'bg-paper-card/90';
const ZONE_DASH_BG_ACTIVE = 'bg-accent/20';

type MatrixRowKey = 'who' | 'zoom' | 'time' | 'example';
const MATRIX_ROWS: { key: MatrixRowKey; label: string }[] = [
  { key: 'who', label: 'מי מחליט?' },
  { key: 'zoom', label: 'זום מרחבי' },
  { key: 'time', label: 'אופק זמן' },
  { key: 'example', label: 'דוגמה מבצעית' },
];

// Event icon files are numbered 01–06 in drag-exercise/; each scenario below
// carries the same-numbered icon (matched by filename, per design request).
const SCENARIOS: { text: string; correct: Level; icon: string }[] = [
  { text: 'מפקד פלוגה מאתר עמדת מקלע אויב על שלוחה', correct: 'tactical', icon: `${DRAG_ASSET_BASE}/TOPIC01-LEVELS-DRAG-EVENT-01.png` },
  { text: 'מטכ"ל מחליט לפתוח גזרה חדשה בצפון', correct: 'strategic', icon: `${DRAG_ASSET_BASE}/TOPIC01-LEVELS-DRAG-EVENT-02.png` },
  { text: 'אלוף הפיקוד מסנכרן תנועת אוגדה מול חיל אוויר', correct: 'operational', icon: `${DRAG_ASSET_BASE}/TOPIC01-LEVELS-DRAG-EVENT-03.png` },
  { text: 'נגד מפעיל מקלע מתחלף לעמדה סמוכה', correct: 'tactical', icon: `${DRAG_ASSET_BASE}/TOPIC01-LEVELS-DRAG-EVENT-04.png` },
  { text: 'ראש ממשלה מאשר העברת תקציב הגנה לזירה אסיאתית', correct: 'strategic', icon: `${DRAG_ASSET_BASE}/TOPIC01-LEVELS-DRAG-EVENT-05.png` },
  { text: 'מפקדת חטיבה משריינת מתאמת ציר לוגיסטי עם פיקוד עורף', correct: 'operational', icon: `${DRAG_ASSET_BASE}/TOPIC01-LEVELS-DRAG-EVENT-06.png` },
];

export function LevelsScene() {
  const [assignments, setAssignments] = useState<Record<number, Level>>({});
  const [submitted, setSubmitted] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);
  // A pool chip currently being hand-dragged toward a zone — see
  // ScenarioPool's comment for why this can't just be native HTML5 drag.
  // Lifted up here (rather than local to ScenarioPool) because the ghost
  // needs to render above the whole section and each LevelZone needs to
  // know when it's the current hover target.
  const [poolDrag, setPoolDrag] = useState<{ idx: number; x: number; y: number; overLevel: Level | null } | null>(
    null,
  );

  const assignedCount = Object.keys(assignments).length;
  const allAssigned = assignedCount === SCENARIOS.length;

  // Events are revealed from a queue: the first POOL_VISIBLE_SLOTS are offered
  // up front, and every accepted placement reveals exactly one more, so the pool
  // holds at most POOL_VISIBLE_SLOTS chips and never needs to scroll. Derived
  // from `assignments` rather than held as its own state so reset() - which
  // already clears `assignments` - rewinds the queue for free, and so no code
  // path can desync the queue from what is actually sorted.
  const revealedCount = Math.min(SCENARIOS.length, POOL_VISIBLE_SLOTS + assignedCount);
  const pool = SCENARIOS.slice(0, revealedCount)
    .map((s, i) => ({ s, i }))
    .filter((x) => !assignments[x.i]);
  const inBin = (level: Level) =>
    SCENARIOS.map((s, i) => ({ s, i })).filter((x) => assignments[x.i] === level);

  const moveScenario = (idx: number, level: Level) => {
    // No correctness check here on purpose: a placement is accepted as-is and the
    // chip stays in the zone the learner chose. Right/wrong is revealed only by
    // `submitted` below, after the check-answers button.
    setAssignments((prev) => ({ ...prev, [idx]: level }));
    setSelectedScenario(null);
  };

  const handlePoolItemDragMove = (idx: number, x: number, y: number) => {
    const target = document.elementFromPoint(x, y)?.closest('[data-drop-zone]');
    const overLevel = (target?.getAttribute('data-drop-zone') as Level | null) ?? null;
    setPoolDrag({ idx, x, y, overLevel });
  };

  const handlePoolItemDragEnd = () => {
    if (poolDrag?.overLevel) moveScenario(poolDrag.idx, poolDrag.overLevel);
    setPoolDrag(null);
  };

  const reset = () => {
    setAssignments({});
    setSubmitted(false);
    setSelectedScenario(null);
  };

  const handleScenarioSelect = (idx: number) => {
    setSelectedScenario(selectedScenario === idx ? null : idx);
  };

  return (
    <section id="scene-levels" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="01.1"
        eyebrow="רמות המלחמה"
        underline
        title={
          <>
            <span className="gradient-text">שלוש רמות המלחמה</span> · אותה המערכה, ברזולוציות שונות
          </>
        }
        intro="בדיוק כמו באפליקציית ניווט, המלחמה נראית לגמרי אחרת בהתאם ל'זום' שבו מסתכלים עליה. סרקו את המטריצה — בכל עמודה רמה אחרת, ובכל שורה ממד אחר: מי מחליט, איזה שטח, איזה אופק זמן."
      />

      {/* === Levels table — one column per level (title + wide banner
          image), one row per dimension below. Replaces the earlier
          click-to-reveal tab/banner selector. === */}
      <LevelsTable />

      {/* === Practice: Drag scenarios into bins === */}
      <div className="mt-12">
        <div className="mb-5">
          <h3 className="font-display text-2xl font-bold leading-tight text-black sm:text-3xl">תרגול גרירה<span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" /></h3>
          <p className="mt-2 text-base leading-relaxed text-fg-muted">
            גררו (או בחרו ולחצו) כל משפט לקטגוריה המתאימה. אחרי שכל ה־{SCENARIOS.length} ימוינו — לחצו "בדוק תשובות".
          </p>
        </div>

        {/* Scenario pool (horizontal strip, full width) stacked above the
            three-zone diorama (also full width) — both now size themselves
            independently at the container's full width instead of sharing
            a row split with a fixed-width sidebar, which used to cap the
            diorama at (container width − 320px). Pool used to be a
            vertical sidebar whose row-height (driven by how many chips
            were still unsorted) got shared with the diorama via
            `items-stretch`/`items-start`; as a horizontal strip the pool's
            own height no longer depends on the diorama at all, so both
            sections simply stack at their natural heights. */}
        <div className="flex flex-col gap-6 mb-6">
          <ScenarioPool
            pool={pool}
            remaining={SCENARIOS.length - assignedCount}
            selectedScenario={selectedScenario}
            submitted={submitted}
            onSelect={handleScenarioSelect}
            draggingIndex={poolDrag?.idx ?? null}
            onItemDragMove={handlePoolItemDragMove}
            onItemDragEnd={handlePoolItemDragEnd}
          />

          {/* Zones diorama — TOPIC01-LEVELS-DRAG-BG.png supplies the
              artwork only (no baked-in text); label/subtitle/drop-target
              are overlaid in code per zone, evenly split into thirds to
              match the background's own strategic|operational|tactical
              layout. Not mirrored: the asset renders as-is. */}
          <div
            className="relative min-w-0 rounded-xl overflow-hidden border border-border aspect-auto sm:aspect-[1672/941]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized */}
            <img
              src="/assets/lessons/topic01/scene-levels/drag-exercise/TOPIC01-LEVELS-DRAG-BG.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute inset-0 size-full object-cover"
            />
            {/* Below `sm`, the container has no aspect-ratio (the CSS
                property makes an in-flow-auto height act like a fixed
                height, clipping/overflowing rather than growing) — so the
                overlay's own content sets the container's real height,
                and nothing here needs to shrink past 3 lines of subtitle
                text. At sm+ the reference's exact ratio takes over, where
                zone content already fits comfortably inside it — the grid
                is pinned to that box (`sm:absolute sm:inset-0`) so each
                zone column has a real height for its own content to
                anchor to via `top-[%]` (see LevelZone). */}
            <div className="relative sm:absolute sm:inset-0 grid grid-cols-3">
              {DRAG_ZONE_ORDER.map((level) => (
                <LevelZone
                  key={level}
                  level={level}
                  scenariosInBin={inBin(level)}
                  selectedScenario={selectedScenario}
                  submitted={submitted}
                  onSelect={handleScenarioSelect}
                  onMoveScenario={moveScenario}
                  forceOver={poolDrag?.overLevel === level}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Ghost preview for a pool chip being hand-dragged toward a zone
            (see ScenarioPool) — fixed-position, follows the pointer,
            `pointer-events-none` so it never blocks the drop-zone
            hit-testing done via `elementFromPoint` underneath it. */}
        {poolDrag && (
          <div
            aria-hidden
            className="pointer-events-none fixed z-50 w-56 -translate-x-1/2 -translate-y-1/2 rounded-xl surface p-2.5 shadow-lg opacity-90"
            style={{ left: poolDrag.x, top: poolDrag.y }}
          >
            <p className="text-xs leading-snug">{SCENARIOS[poolDrag.idx].text}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-end items-center">
          <button
            onClick={() => setSubmitted(true)}
            disabled={!allAssigned}
            className={cn('btn-primary', !allAssigned && 'opacity-45 cursor-not-allowed hover:brightness-100 active:translate-y-0')}
          >
            {allAssigned
              ? 'בדוק תשובות'
              : `נותרו ${SCENARIOS.length - assignedCount} למיון`}
          </button>
          {(assignedCount > 0 || submitted) && (
            <button
              onClick={reset}
              className="btn-secondary"
            >
              אפס הכל
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// Real table (not 3 separate cards): one shared bordered wrapper, one
// header column per level (title + the wide 3:1 banner photo), then one
// shared-label row per MATRIX_ROWS dimension (who/zoom/time/example) with
// one value cell per level — same row-label + N-value-column structure as
// this lesson's own AsymmetricScene.tsx TypologyTable, which is also what
// this scene's own SceneHeader intro already describes ("בכל עמודה רמה
// אחרת, ובכל שורה ממד אחר"). Replaces the earlier click-to-reveal
// tab/banner selector — direct user request for a static table showing
// all 3 levels at once instead of 3 separate cards. All pedagogical copy
// (level labels and all 4 who/zoom/time/example values) is read unchanged
// from the existing LEVELS/MATRIX_ROWS data.
function LevelsTable() {
  const labelColClass = 'hidden sm:block sm:w-[110px] lg:w-[130px] shrink-0';
  const gridColsClass = 'grid grid-cols-3 sm:grid-cols-[110px_repeat(3,1fr)] lg:grid-cols-[130px_repeat(3,1fr)]';

  return (
    <div className="surface-elevated overflow-hidden">
      {/* Header row: level title + wide banner photo, one column per level. */}
      <div className={cn(gridColsClass, 'border-b border-border-strong')}>
        <div className={cn(labelColClass, 'p-4 bg-bg-accent')} aria-hidden />
        {LEVEL_ORDER.map((level) => {
          const meta = LEVELS[level];
          return (
            <div key={level} className="flex flex-col border-s border-border-subtle bg-bg-accent">
              <div className="px-4 pt-4 pb-2.5">
                <h3 className="font-display font-bold leading-tight text-black text-lg md:text-xl">
                  {meta.label}
                </h3>
              </div>
              {/* Wide banner photo at its real 2172×724 (3:1) ratio — the
                  same technique as this lesson's other *-BANNER.png calls:
                  `aspect` on IsometricAsset is nominal only, canceled by
                  `[aspect-ratio:auto]`, so the outer `aspect-[3/1]`
                  wrapper drives the real shape. Square corners, no
                  `rounded-lg`. Full-bleed within the column (no inline
                  margins) and flush with the header row's bottom border
                  (no bottom margin) — a full banner across the column,
                  not an inset photo. */}
              <div className="relative overflow-hidden aspect-[3/1]">
                <IsometricAsset
                  assetId={`TOPIC01-LEVELS-${level.toUpperCase()}-BANNER`}
                  src={`${LEVEL_BANNER_BASE}/TOPIC01-LEVELS-${level.toUpperCase()}-BANNER.png`}
                  alt=""
                  aspect="1/1"
                  fit="cover"
                  compactPlaceholder
                  prompt={LEVEL_BANNER_PROMPT[level]}
                  className="absolute inset-0 size-full [aspect-ratio:auto]"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* One shared-label row per MATRIX_ROWS dimension. */}
      {MATRIX_ROWS.map((row) => (
        <div key={row.key} className={cn(gridColsClass, 'border-b border-border-subtle last:border-b-0')}>
          <div className={cn(labelColClass, 'p-4 flex items-center bg-bg-accent')}>
            <div className="text-base font-display font-bold text-black tracking-wider">{row.label}</div>
          </div>
          {LEVEL_ORDER.map((level) => (
            <div key={level} className="p-4 border-s border-border-subtle">
              <div className="mb-1.5 text-base font-display font-bold text-black tracking-wider sm:hidden">{row.label}</div>
              <p className="text-base leading-relaxed text-black text-pretty">
                {LEVELS[level][row.key]}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ScenarioPool({
  pool,
  remaining,
  selectedScenario,
  submitted,
  onSelect,
  draggingIndex,
  onItemDragMove,
  onItemDragEnd,
}: {
  pool: { s: (typeof SCENARIOS)[number]; i: number }[];
  remaining: number;
  selectedScenario: number | null;
  submitted: boolean;
  onSelect: (idx: number) => void;
  draggingIndex: number | null;
  onItemDragMove: (idx: number, x: number, y: number) => void;
  onItemDragEnd: () => void;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  // `phase` starts 'pending' on every pointerdown and resolves to 'item' —
  // pick up the chip under the pointer — once movement crosses the
  // threshold below. See the comment above handleRowPointerDown for why
  // this is a custom pointer drag rather than native HTML5 drag-and-drop.
  const rowDragRef = useRef<{
    x: number;
    y: number;
    pointerId: number;
    phase: 'pending' | 'item';
    chipIndex: number;
  } | null>(null);
  const rowDraggedRef = useRef(false);

  // The pool row no longer scrolls (see POOL_VISIBLE_SLOTS above), so every
  // pointer drag starting on a chip here is unambiguously a pick-up — there's
  // no competing pan gesture left to classify it against. Pool chips still
  // aren't natively draggable (see ScenarioChip's `draggable={false}`
  // below): a floating ghost plus `elementFromPoint` zone hit-testing
  // (driven from the parent via onItemDragMove/onItemDragEnd) is what makes
  // the drop targets — overlaid on the diorama artwork, not plain DOM drop
  // zones — hit reliably.
  const handleRowPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    rowDraggedRef.current = false;
    const chipEl = (e.target as HTMLElement).closest('[data-scenario-index]');
    const chipIndex = chipEl ? Number(chipEl.getAttribute('data-scenario-index')) : null;
    if (chipIndex == null) {
      rowDragRef.current = null;
      return;
    }
    rowDragRef.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      phase: 'pending',
      chipIndex,
    };
  };

  const handleRowPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = rowRef.current;
    const drag = rowDragRef.current;
    if (!el || !drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;

    if (drag.phase === 'pending') {
      if (Math.max(Math.abs(dx), Math.abs(dy)) <= POOL_DRAG_CLICK_THRESHOLD) return;
      drag.phase = 'item';
      rowDraggedRef.current = true;
      el.setPointerCapture(drag.pointerId);
    }

    if (drag.phase === 'item') {
      onItemDragMove(drag.chipIndex, e.clientX, e.clientY);
    }
  };

  const endRowDrag = () => {
    const drag = rowDragRef.current;
    if (drag?.phase === 'item') onItemDragEnd();
    if (drag && drag.phase !== 'pending') rowRef.current?.releasePointerCapture(drag.pointerId);
    rowDragRef.current = null;
  };

  /** בולם קליק/בחירה בטעות בסיום גרירה עם העכבר */
  const handleRowClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (rowDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      rowDraggedRef.current = false;
    }
  };

  if (pool.length === 0) return null;

  return (
    <motion.div className="surface-elevated p-4 flex flex-col min-w-0 transition-colors duration-300 ease-snap">
      {/* The pool is deliberately NOT a drop target: with a fixed number of
          visible slots, returning a sorted chip here would push the row past its
          cap, and an already-placed event is meant to be moved between zones
          (which the zones' own native drop handlers already support), not un-sorted. */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-sm font-display font-semibold text-fg tracking-wider">
          {`אירועים למיון · ${remaining}`}
        </div>
        <div className="text-sm text-fg-muted">
          גררו משפט לאחת מ־3 הקטגוריות למטה (או בחרו ולחצו)
        </div>
      </div>

      <div
        ref={rowRef}
        onPointerDown={handleRowPointerDown}
        onPointerMove={handleRowPointerMove}
        onPointerUp={endRowDrag}
        onPointerCancel={endRowDrag}
        onClickCapture={handleRowClickCapture}
        className="flex gap-3 items-stretch pb-1 cursor-grab select-none active:cursor-grabbing"
      >
        {pool.map(({ s, i }) => (
          <ScenarioChip
            key={i}
            index={i}
            scenario={s}
            isSelected={selectedScenario === i}
            isCorrect={false}
            isWrong={false}
            submitted={submitted}
            onSelect={() => onSelect(i)}
            className={cn('flex-1 min-w-0', draggingIndex === i && 'opacity-40')}
            draggable={false}
          />
        ))}
      </div>
    </motion.div>
  );
}

// One of the 3 zones overlaid on TOPIC01-LEVELS-DRAG-BG.png. The whole
// column is the drop/tap target (large hit area over the artwork); only
// the dashed box is the visual "גררו לכאן" affordance from the reference.
function LevelZone({
  level,
  scenariosInBin,
  selectedScenario,
  submitted,
  onSelect,
  onMoveScenario,
  forceOver = false,
}: {
  level: Level;
  scenariosInBin: { s: (typeof SCENARIOS)[number]; i: number }[];
  selectedScenario: number | null;
  submitted: boolean;
  onSelect: (idx: number) => void;
  onMoveScenario: (idx: number, level: Level) => void;
  /** True while a pool chip is being hand-dragged over this zone — see
   * ScenarioPool/LevelsScene's custom pointer-based drag. Native
   * `dragover` (below) only fires for the still-native zone-to-zone drag,
   * so this is how the pool's custom drag reports the same "hovering"
   * state into this zone's existing over/active styling. */
  forceOver?: boolean;
}) {
  const [isOver, setIsOver] = useState(false);
  const meta = LEVELS[level];
  const isEmpty = scenariosInBin.length === 0;
  const showOver = isOver || forceOver;
  const isWaitingForTap = selectedScenario != null && isEmpty;

  return (
    <div
      data-drop-zone={level}
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData('text/scenario');
        const idx = Number(raw);
        if (!Number.isNaN(idx)) onMoveScenario(idx, level);
        setIsOver(false);
      }}
      onClick={() => {
        if (selectedScenario != null) {
          onMoveScenario(selectedScenario, level);
        }
      }}
      className={cn(
        'relative h-full min-w-0 text-center',
        (showOver || isWaitingForTap) && 'cursor-pointer',
      )}
    >
      {/* `pt-[12%]` (a padding %) resolves against the column's WIDTH per
          CSS spec, not its height — kept as-is for the mobile in-flow
          layout below `sm`, where it happens to read fine. At `sm`+ the
          column has a fixed aspect ratio (see the outer container), so
          this switches to `top-[%]` on an absolutely-positioned block,
          which DOES resolve against height — the only way to anchor this
          content at a specific vertical fraction of the zone artwork. */}
      <div
        className="flex flex-col items-center px-2.5 pt-[12%] sm:pt-0 sm:absolute sm:inset-x-0 sm:top-[26%]"
        style={ZONE_CONTENT_OFFSET[level] ? { transform: `translateX(${ZONE_CONTENT_OFFSET[level]})` } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized */}
        <img
          src={meta.dragIcon}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="w-20 h-20 sm:w-24 sm:h-24 object-contain shrink-0"
        />
        <div className={cn('mt-2.5 font-display font-black leading-tight text-xl md:text-2xl', ZONE_LABEL_TEXT)}>
          {meta.label}
        </div>
        <div className={cn('mt-1 text-sm md:text-base font-semibold leading-snug', ZONE_SUBTITLE_TEXT)}>
          {meta.dragSubtitle}
        </div>

        <motion.div
          animate={{ scale: showOver ? 1.02 : 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className={cn(
            'mt-3 w-full max-w-[200px] rounded-xl border-2 border-dashed px-3 py-3 transition-colors duration-200 ease-snap',
            // Capped so a zone holding many chips (up to all 6, if every
            // scenario gets dropped in the same bin) scrolls internally
            // instead of pushing past the diorama's own bottom edge — the
            // diorama container clips overflow, so uncapped growth here
            // used to just cut chips off rather than visibly contain them.
            isEmpty
              ? 'flex flex-col items-center justify-center gap-1.5 min-h-[96px]'
              : 'space-y-1.5 max-h-[220px] overflow-y-auto',
            showOver || isWaitingForTap ? ZONE_DASH_BORDER_ACTIVE : ZONE_DASH_BORDER,
            showOver ? ZONE_DASH_BG_ACTIVE : ZONE_DASH_BG_IDLE,
          )}
        >
          {isEmpty ? (
            <>
              <span className={cn('text-sm font-display font-semibold tracking-wider', ZONE_HINT_TEXT)}>
                {showOver ? 'שחרר כאן' : isWaitingForTap ? 'הקש לשבץ כאן' : 'גררו לכאן'}
              </span>
              <Icon name="chevrons-down" size={16} strokeWidth={2} className="text-fg-muted" />
            </>
          ) : (
            scenariosInBin.map(({ s, i }) => {
              const isCorrect = submitted && level === s.correct;
              const isWrong = submitted && level !== s.correct;
              return (
                <ScenarioChip
                  key={i}
                  index={i}
                  scenario={s}
                  isSelected={selectedScenario === i}
                  isCorrect={isCorrect}
                  isWrong={isWrong}
                  submitted={submitted}
                  onSelect={() => onSelect(i)}
                  compact
                />
              );
            })
          )}
        </motion.div>
      </div>
    </div>
  );
}

function ScenarioChip({
  index,
  scenario,
  isSelected,
  isCorrect,
  isWrong,
  submitted,
  onSelect,
  compact = false,
  className,
  draggable = true,
}: {
  index: number;
  scenario: (typeof SCENARIOS)[number];
  isSelected: boolean;
  isCorrect: boolean;
  isWrong: boolean;
  submitted: boolean;
  onSelect: () => void;
  compact?: boolean;
  className?: string;
  draggable?: boolean;
}) {
  return (
    <div
      data-scenario-index={index}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/scenario', String(index));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        'surface cursor-grab active:cursor-grabbing transition-all duration-300 ease-snap',
        compact ? 'p-2.5' : 'p-3',
        isSelected && 'border-accent bg-accent/10 ring-2 ring-accent/40',
        isCorrect && !isSelected && 'border-status-ok/50 bg-status-ok/10',
        isWrong && !isSelected && 'border-status-danger/50 bg-status-danger/10',
        !isSelected && !isCorrect && !isWrong && 'hover:border-brand/30 hover:bg-brand/[0.03]',
        className
      )}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
    >
      <div className="flex items-start gap-2">
        <p className={cn('flex-1', compact ? 'text-xs leading-snug' : 'text-base leading-relaxed text-black')}>
          {scenario.text}
        </p>
        {submitted && isCorrect && (
          <Icon
            name="check"
            size={compact ? 12 : 14}
            strokeWidth={2.5}
            className="shrink-0 mt-0.5 text-status-ok"
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized */}
        <img
          src={scenario.icon}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={cn('shrink-0 object-contain', compact ? 'size-11' : 'size-14')}
        />
      </div>
    </div>
  );
}
