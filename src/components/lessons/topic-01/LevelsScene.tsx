'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  fillClass: string;
  zoomLevel: number; // 1=widest, 3=closest
  dragIcon: string; // category icon shown above the label in the drag exercise
  dragSubtitle: string; // bullet-separated keywords under the label in the drag exercise
};

const DRAG_ASSET_BASE = '/assets/lessons/topic01/scene-levels/drag-exercise';

const LEVELS: Record<Level, LevelMeta> = {
  strategic: {
    label: 'אסטרטגית',
    english: 'Strategic',
    who: 'הדרג המדיני (הממשלה) והרמטכ"ל',
    zoom: '"מבט מלוויין" (גלובלי) – מדינות שלמות, יבשות ואוקיינוסים.',
    zoomIcon: 'globe',
    time: 'חודשים עד שנים. החלטות שמשפיעות על דורות.',
    example: 'האם המדינה יוצאת למלחמה כוללת? עם אילו מדינות חותמים ברית? החלטות תקציב דרמטיות, למשל – להפסיק לייצר טנקים ולרכוש צוללות במקום.',
    fillClass: 'fill-accent-intel/30',
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
    fillClass: 'fill-accent/30',
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
    fillClass: 'fill-terrain-sand/30',
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

// Only the strategic tagline is legible in the reference (it's the one tab
// shown open) — "המבט הרחב: מטרות המלחמה והמשאבים להשגתן." is transcribed
// verbatim from it. operational/tactical are NOT visible anywhere in the
// reference and were authored here to match its one-line "ה_ ה_: _."
// pattern, paraphrasing this scene's own existing who/zoom/example copy for
// each level — unlike every other string in this component, these two are
// new copy, not transcribed from a source. Flagged in
// design/docs/assumptions.md for the user to review/edit.
const LEVEL_TAGLINE: Record<Level, string> = {
  strategic: 'המבט הרחב: מטרות המלחמה והמשאבים להשגתן.',
  operational: 'התיאום האזורי: סנכרון כוחות, ציוד ותנועה בין החזית לעורף.',
  tactical: 'הפעולה בשטח: ההחלטה המיידית שמכריעה את הרגע.',
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
// Plain text-fg alone still loses to the busier artwork behind it — the
// strategic zone's tree line + rock texture in particular swallows dark
// ink with no separation. A light halo (paper.card, already an approved
// token) behind the glyphs keeps one flat ink color across all 3 zones
// (per the note above) while staying legible over any of the three
// terrain textures, not just the calmer ones tactical/operational sit on.
const ZONE_LABEL_TEXT = 'text-fg [text-shadow:0_1px_2px_rgba(248,242,231,0.85),0_0_7px_rgba(248,242,231,0.75)]';
const ZONE_SUBTITLE_TEXT = 'text-fg-muted [text-shadow:0_1px_2px_rgba(248,242,231,0.9),0_0_6px_rgba(248,242,231,0.8)]';

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

  const assignedCount = Object.keys(assignments).length;
  const allAssigned = assignedCount === SCENARIOS.length;
  const correctCount = SCENARIOS.filter((s, i) => assignments[i] === s.correct).length;

  const pool = SCENARIOS.map((s, i) => ({ s, i })).filter((x) => !assignments[x.i]);
  const inBin = (level: Level) =>
    SCENARIOS.map((s, i) => ({ s, i })).filter((x) => assignments[x.i] === level);

  const moveScenario = (idx: number, level: Level | null) => {
    setAssignments((prev) => {
      if (level) return { ...prev, [idx]: level };
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    setSelectedScenario(null);
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
    <section id="scene-levels" className="px-4 sm:px-6 lg:px-8">
      {/* Header keeps the narrower standard reading width; the levels
          table below is deliberately NOT nested in this max-w-6xl wrapper
          (see LevelsTable's own comment) — it runs to the section's own
          wider edges instead. Same "allowed to run wider than the header"
          precedent the drag exercise further down already uses. */}
      <div className="max-w-6xl mx-auto">
        <SceneHeader
          step="01.1"
          eyebrow="רמות המלחמה"
          title={
            <>
              <span className="gradient-text">שלוש רמות המלחמה</span> · אותה המערכה, ברזולוציות שונות
            </>
          }
          intro="בדיוק כמו באפליקציית ניווט, המלחמה נראית לגמרי אחרת בהתאם ל'זום' שבו מסתכלים עליה. סרקו את המטריצה — בכל עמודה רמה אחרת, ובכל שורה ממד אחר: מי מחליט, איזה שטח, איזה אופק זמן."
        />
      </div>

      {/* === Levels table — one column per level (title + wide banner
          image), one row per dimension below. Replaces the earlier
          click-to-reveal tab/banner selector. === */}
      <LevelsTable />

      {/* === Practice: Drag scenarios into bins === */}
      <div className="mt-12">
        <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
          <div>
            <h3 className="font-display text-2xl font-bold leading-tight text-black sm:text-3xl">תרגול גרירה<span aria-hidden className="mt-2 block h-1 w-10 rounded-full bg-accent" /></h3>
            <p className="mt-2 text-base leading-relaxed text-fg-muted">
              גרור (או הקש בנייד) כל משפט לקטגוריה המתאימה. אחרי שכל ה־{SCENARIOS.length} ימוינו — לחץ "בדוק תשובות".
            </p>
          </div>
          {submitted && (
            <div
              className={cn(
                'chip',
                correctCount === SCENARIOS.length
                  ? 'border-status-ok/50 bg-status-ok/10 text-status-ok'
                  : 'border-status-danger/50 bg-status-danger/10 text-status-danger'
              )}
            >
              <span className="font-mono">
                {correctCount}/{SCENARIOS.length} נכון
              </span>
            </div>
          )}
        </div>

        {/* Pool sidebar (right, RTL-first) + the three-zone diorama (left).
            Previously `items-stretch`: the diorama had no height of its
            own, so it was force-stretched to match the pool card's row
            height — and since `aspect-[1672/941]` then had to derive this
            box's WIDTH back out of that borrowed height, the diorama's
            rendered width silently tracked the pool's height too. The pool
            shrinks by one chip every time a scenario is dragged out of it,
            so the diorama kept visibly shrinking along with it on every
            single drag (reported: the image gets smaller, repeatedly) —
            and even before any drag, that borrowed height happened to make
            the diorama wider than this column, overflowing off the left
            edge (hence the old `translate-x-[84px]` compensating shift,
            removed below along with it). `items-start` lets each card size
            itself independently: the diorama from its own aspect-ratio
            within its actual column width, full stop. */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start mb-6">
          <ScenarioPool
            pool={pool}
            selectedScenario={selectedScenario}
            submitted={submitted}
            onSelect={handleScenarioSelect}
            onMoveScenario={moveScenario}
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
                />
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-center items-center">
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
// header column per level (title + the wide 3:1 banner photo + tagline),
// then one shared-label row per MATRIX_ROWS dimension (who/zoom/time/
// example) with one value cell per level — same row-label + N-value-column
// structure as this lesson's own AsymmetricScene.tsx TypologyTable, which
// is also what this scene's own SceneHeader intro already describes
// ("בכל עמודה רמה אחרת, ובכל שורה ממד אחר"). Replaces the earlier
// click-to-reveal tab/banner selector — direct user request for a static
// table showing all 3 levels at once instead of 3 separate cards. All
// pedagogical copy (level labels, tagline, and all 4 who/zoom/time/example
// values) is read unchanged from the existing LEVELS/LEVEL_TAGLINE/
// MATRIX_ROWS data.
//
// Rendered by LevelsScene() as a sibling of (not nested inside) its
// max-w-6xl header wrapper — but max-w-6xl (1152px) was never actually the
// binding constraint: this scene's own <section> padding (px-4 sm:px-6
// lg:px-8, 32px/side at lg+) already narrows its content box to ~1105px,
// tighter than max-w-6xl. So just moving out of max-w-6xl was a no-op —
// fixed here with a `-mx-4 sm:-mx-6 lg:-mx-8` breakout that cancels the
// section's own padding for this element only, recovering the full ~1169px
// section box (measured live at 1440px).
function LevelsTable() {
  const labelColClass = 'hidden sm:block sm:w-[110px] lg:w-[130px] shrink-0';
  const gridColsClass = 'grid grid-cols-3 sm:grid-cols-[110px_repeat(3,1fr)] lg:grid-cols-[130px_repeat(3,1fr)]';

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 mb-4 surface-elevated overflow-hidden rounded-xl">
      {/* Header row: level title + wide banner photo + tagline, one column per level. */}
      <div className={cn(gridColsClass, 'border-b border-border-strong')}>
        <div className={cn(labelColClass, 'p-4 bg-bg-accent/40')} aria-hidden />
        {LEVEL_ORDER.map((level) => {
          const meta = LEVELS[level];
          return (
            <div key={level} className="flex flex-col border-s border-border-strong bg-bg-accent/20">
              <div className="px-4 pt-4 pb-2.5">
                <h3 className="font-display text-lg sm:text-xl font-extrabold leading-tight text-fg">
                  {meta.label}
                </h3>
              </div>
              {/* Wide banner photo at its real 2172×724 (3:1) ratio — the
                  same technique as this lesson's other *-BANNER.png calls:
                  `aspect` on IsometricAsset is nominal only, canceled by
                  `[aspect-ratio:auto]`, so the outer `aspect-[3/1]`
                  wrapper drives the real shape. */}
              <div className="relative mx-4 mb-3 overflow-hidden rounded-[3px] aspect-[3/1]">
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
              <p className="px-4 pb-4 text-xs sm:text-sm text-fg-muted leading-relaxed text-pretty">
                {LEVEL_TAGLINE[level]}
              </p>
            </div>
          );
        })}
      </div>

      {/* One shared-label row per MATRIX_ROWS dimension. */}
      {MATRIX_ROWS.map((row) => (
        <div key={row.key} className={cn(gridColsClass, 'border-b border-border-subtle last:border-b-0')}>
          <div className={cn(labelColClass, 'p-4 flex items-center bg-bg-accent/10')}>
            <div className="text-sm font-display font-bold text-fg">{row.label}</div>
          </div>
          {LEVEL_ORDER.map((level) => (
            <div key={level} className="p-4 border-s border-border-subtle">
              <div className="mb-1 text-xs font-display font-bold text-fg-muted sm:hidden">{row.label}</div>
              <p className="text-sm sm:text-base text-fg-muted leading-relaxed text-pretty">
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
  selectedScenario,
  submitted,
  onSelect,
  onMoveScenario,
}: {
  pool: { s: (typeof SCENARIOS)[number]; i: number }[];
  selectedScenario: number | null;
  submitted: boolean;
  onSelect: (idx: number) => void;
  onMoveScenario: (idx: number, level: Level | null) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <motion.div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData('text/scenario');
        const idx = Number(raw);
        if (!Number.isNaN(idx)) onMoveScenario(idx, null);
        setIsOver(false);
      }}
      animate={{ scale: isOver ? 1.005 : 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn('surface-elevated p-4 flex flex-col min-w-0 transition-colors duration-300 ease-snap', isOver && 'border-brand/45')}
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-sm font-display font-semibold text-fg tracking-wider">
          {pool.length > 0
            ? `אירועים למיון · ${pool.length}`
            : '✓ כל המשפטים סווגו'}
        </div>
        {pool.length > 0 && (
          <div className="text-sm text-fg-muted">
            גרור משפט לאחת מ־3 הקטגוריות למטה
          </div>
        )}
      </div>

      {pool.length === 0 ? (
        <div className="text-center py-3 text-sm text-fg-muted">
          לחץ "בדוק תשובות" כדי לראות תוצאות, או גרור משפט בחזרה לכאן כדי לסווג מחדש.
        </div>
      ) : (
        <div className="space-y-3">
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
            />
          ))}
        </div>
      )}
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
}: {
  level: Level;
  scenariosInBin: { s: (typeof SCENARIOS)[number]; i: number }[];
  selectedScenario: number | null;
  submitted: boolean;
  onSelect: (idx: number) => void;
  onMoveScenario: (idx: number, level: Level | null) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const meta = LEVELS[level];
  const isEmpty = scenariosInBin.length === 0;
  const isWaitingForTap = selectedScenario != null && isEmpty;

  return (
    <div
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
        (isOver || isWaitingForTap) && 'cursor-pointer',
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
        <div className={cn('mt-2.5 font-display font-bold leading-tight text-lg md:text-xl', ZONE_LABEL_TEXT)}>
          {meta.label}
        </div>
        <div className={cn('mt-1 text-sm leading-snug', ZONE_SUBTITLE_TEXT)}>
          {meta.dragSubtitle}
        </div>

        <motion.div
          animate={{ scale: isOver ? 1.02 : 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className={cn(
            'mt-3 w-full max-w-[220px] rounded-xl border-2 border-dashed px-3 py-3 transition-colors duration-200 ease-snap',
            isEmpty ? 'flex flex-col items-center justify-center gap-1.5 min-h-[96px]' : 'space-y-1.5',
            isOver || isWaitingForTap ? ZONE_DASH_BORDER_ACTIVE : ZONE_DASH_BORDER,
            isOver ? ZONE_DASH_BG_ACTIVE : ZONE_DASH_BG_IDLE,
          )}
        >
          {isEmpty ? (
            <>
              <span className={cn('text-sm font-display font-semibold tracking-wider', ZONE_HINT_TEXT)}>
                {isOver ? 'שחרר כאן' : isWaitingForTap ? 'הקש לשבץ כאן' : 'גררו לכאן'}
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
}: {
  index: number;
  scenario: (typeof SCENARIOS)[number];
  isSelected: boolean;
  isCorrect: boolean;
  isWrong: boolean;
  submitted: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  return (
    <div
      draggable
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
        !isSelected && !isCorrect && !isWrong && 'hover:border-brand/30 hover:bg-brand/[0.03]'
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
      {submitted && isWrong && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-1.5 text-sm text-status-danger leading-snug"
          >
            הקטגוריה הנכונה: <strong>{LEVELS[scenario.correct].label}</strong>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
