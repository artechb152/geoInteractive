'use client';

import { useState, type CSSProperties } from 'react';
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
  borderActive: string;
  bgActive: string;
  text: string;
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
    borderActive: 'border-accent-intel',
    bgActive: 'bg-accent-intel/15',
    text: 'text-accent-intel',
    fillClass: 'fill-accent-intel/30',
    zoomLevel: 1,
    dragIcon: `${DRAG_ASSET_BASE}/strategic-purple.png`,
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
    borderActive: 'border-accent',
    bgActive: 'bg-accent/15',
    text: 'text-accent',
    fillClass: 'fill-accent/30',
    zoomLevel: 2,
    dragIcon: `${DRAG_ASSET_BASE}/operational-orange.png`,
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
    borderActive: 'border-terrain-sand',
    bgActive: 'bg-terrain-sand/15',
    text: 'text-terrain-sand',
    fillClass: 'fill-terrain-sand/30',
    zoomLevel: 3,
    dragIcon: `${DRAG_ASSET_BASE}/tactical-gold.png`,
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

// Overlay position for each level's button on TOPIC01-LEVELS-DIORAMA.png,
// tuned by eye against the rendered asset (its composition doesn't match
// lesson1part3image1.png's reference photo, so this isn't measured from the
// reference — see design/assumptions.md). `insetInlineEnd`/`insetBlockStart`
// (distance from the visual left/top) are used throughout so the anchor is
// expressed relative to the image's own content, not mirrored for RTL.
const LEVEL_BUTTON_POSITION: Record<Level, CSSProperties> = {
  strategic: { insetBlockStart: '8%', insetInlineEnd: '13%' },
  operational: { insetBlockStart: '39%', insetInlineEnd: '63%' },
  tactical: { insetBlockStart: '78%', insetInlineEnd: '74%' },
};

// TOPIC01-LEVELS-DRAG-BG.png's orange ("operational") landmass isn't
// centered in its own grid column — its visual center sits ~3 percentage
// points of the full image width to the right of the column's midpoint
// (measured by sampling the shape's left/right outline across its
// height). Expressed as a fraction of the column's own width (since the
// overlay div below spans the column edge-to-edge), that's a ~9%
// translateX nudge; the other two zones' shapes are already centered in
// their columns, so this map is empty for them.
const ZONE_CONTENT_OFFSET: Partial<Record<Level, string>> = {
  operational: '9%',
};

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
  const [activeLevel, setActiveLevel] = useState<Level>('strategic');
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
      {/* Header + level-selector matrix keep the standard reading width;
          only the drag exercise below (wrapped separately) is allowed to
          run wider, close to the section's own edges. */}
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

        {/* === Level Selector === */}
        <div className="surface-elevated p-4 sm:p-6">
          <div className="grid gap-5 md:grid-cols-[1fr_1.35fr] md:items-stretch">
            {/* Active-level detail panel — first child → right in RTL. */}
            <div className="flex flex-col justify-center min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeLevel}
                  id={`level-panel-${activeLevel}`}
                  role="tabpanel"
                  aria-labelledby={`level-tab-${activeLevel}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border-subtle">
                    <Icon
                      name={LEVELS[activeLevel].zoomIcon}
                      size={30}
                      strokeWidth={2}
                      className="shrink-0 text-accent"
                    />
                    <div className="min-w-0">
                      <div className="font-display font-bold text-xl leading-tight text-accent">
                        {LEVELS[activeLevel].label}
                      </div>
                      <div className="text-xs font-mono text-fg-dim mt-0.5">
                        {LEVELS[activeLevel].english}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {MATRIX_ROWS.map((row) => (
                      <div key={row.key}>
                        <h4 className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-1">
                          {row.label}
                        </h4>
                        <p className="text-sm sm:text-base text-fg leading-relaxed text-pretty">
                          {LEVELS[activeLevel][row.key]}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Diorama with overlay level buttons — second child → left in
                RTL. Not mirrored: the asset renders as-is. */}
            <div
              role="tablist"
              aria-label="בחר רמת מלחמה"
              className="relative w-full overflow-hidden rounded-xl border border-border-subtle"
              style={{ aspectRatio: '3 / 2' }}
            >
              <IsometricAsset
                assetId="TOPIC01-LEVELS-DIORAMA"
                src="/assets/lessons/topic01/scene-levels/TOPIC01-LEVELS-DIORAMA.png"
                alt="איור איזומטרי: חדר מצב אסטרטגי למעלה, חדר בקרה אופרטיבי במרכז, וחיילים בזום טקטי קרוב בפינה התחתונה"
                fit="cover"
                className="absolute inset-0 size-full [aspect-ratio:auto]"
              />
              {LEVEL_ORDER.map((level) => (
                <LevelButton
                  key={level}
                  level={level}
                  isActive={level === activeLevel}
                  onSelect={setActiveLevel}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* === Practice: Drag scenarios into bins === */}
      <div className="mt-12">
        <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
          <div>
            <h3 className="font-display font-bold text-xl leading-tight mb-1">תרגול גרירה</h3>
            <p className="text-fg-muted text-sm">
              גרור (או הקש בנייד) כל משפט לקטגוריה המתאימה. אחרי שכל ה־{SCENARIOS.length} ימוינו — לחץ "בדוק תשובות".
            </p>
          </div>
          {submitted && (
            <div
              className={cn(
                'chip',
                correctCount === SCENARIOS.length
                  ? 'border-status-ok/40 bg-status-ok/10 text-status-ok'
                  : 'border-status-warn/40 bg-status-warn/10 text-status-warn'
              )}
            >
              <Icon
                name={correctCount === SCENARIOS.length ? 'check' : 'spark'}
                size={14}
                strokeWidth={2.5}
              />
              <span className="font-mono">
                {correctCount}/{SCENARIOS.length} נכון
              </span>
            </div>
          )}
        </div>

        {/* Pool sidebar (right, RTL-first) + the three-zone diorama (left).
            The diorama's own aspect-ratio forces it wider than its grid
            column at this width, overflowing off the left edge of the
            viewport — shifted right as one unit (both cards move together,
            nothing resized) to reduce how much of the clipped zone is lost.
            Capped at 84px: past that, the pool card would slide behind the
            fixed course-outline sidebar (`<aside>` in the lesson layout) and
            its drag targets would become unreachable. */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-stretch mb-6 lg:translate-x-[84px]">
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
            className="relative min-w-0 rounded-xl overflow-hidden border border-border-subtle aspect-auto sm:aspect-[1672/941]"
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
            className={cn(
              'px-6 py-3 rounded-[3px] font-bold transition-all flex items-center gap-2',
              allAssigned
                ? 'bg-accent text-bg-elevated hover:scale-105 active:scale-95'
                : 'bg-bg-accent text-fg-dim border border-border cursor-not-allowed'
            )}
          >
            <Icon name="check" size={16} strokeWidth={2.5} />
            {allAssigned
              ? 'בדוק תשובות'
              : `נותרו ${SCENARIOS.length - assignedCount} למיון`}
          </button>
          {(assignedCount > 0 || submitted) && (
            <button
              onClick={reset}
              className="px-6 py-3 rounded-[3px] border border-border hover:border-border-strong font-medium text-sm flex items-center gap-2"
            >
              <Icon name="spark" size={14} />
              אפס הכל
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// Only the active level gets the orange/accent treatment here (unlike the
// pyramid/practice-bin sections below, which use a 3-color per-level
// identity) — see design/assumptions.md for why this screen diverges.
function LevelButton({
  level,
  isActive,
  onSelect,
}: {
  level: Level;
  isActive: boolean;
  onSelect: (level: Level) => void;
}) {
  const meta = LEVELS[level];
  return (
    <button
      type="button"
      role="tab"
      id={`level-tab-${level}`}
      aria-selected={isActive}
      aria-controls={`level-panel-${level}`}
      onClick={() => onSelect(level)}
      style={LEVEL_BUTTON_POSITION[level]}
      className={cn(
        'absolute px-4 py-2 rounded-full text-sm font-display font-bold shadow-elevated backdrop-blur-sm transition-all',
        isActive
          ? 'bg-accent text-bg-elevated scale-105'
          : 'bg-fg/80 text-bg-elevated hover:bg-fg/95'
      )}
    >
      {meta.label}
    </button>
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
      className={cn(
        'bg-bg-elevated p-4 rounded-xl border flex flex-col min-w-0 transition-colors duration-200',
        isOver ? 'border-brand' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-sm font-display font-semibold text-fg tracking-wider">
          {pool.length > 0
            ? `אירועים למיון · ${pool.length}`
            : '✓ כל המשפטים סווגו'}
        </div>
        {pool.length > 0 && (
          <div className="text-xs text-fg-muted">
            גרור משפט לאחת מ־3 הקטגוריות למטה
          </div>
        )}
      </div>

      {pool.length === 0 ? (
        <div className="text-center py-3 text-sm text-fg-muted">
          לחץ "בדוק תשובות" כדי לראות תוצאות, או גרור משפט בחזרה לכאן כדי לסווג מחדש.
        </div>
      ) : (
        <div className="space-y-2.5">
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
        <div className={cn('mt-2.5 font-display font-bold text-base sm:text-xl leading-tight', meta.text)}>
          {meta.label}
        </div>
        <div className="mt-1 text-[11px] sm:text-[13px] text-fg-muted leading-snug">
          {meta.dragSubtitle}
        </div>

        <motion.div
          animate={{ scale: isOver ? 1.02 : 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className={cn(
            'mt-3 w-full max-w-[220px] rounded-lg border-2 border-dashed px-3 py-3 transition-colors duration-200',
            isEmpty ? 'flex flex-col items-center justify-center gap-1.5 min-h-[96px]' : 'space-y-1.5',
            meta.borderActive,
            isOver ? meta.bgActive : isWaitingForTap ? '' : 'opacity-50',
          )}
        >
          {isEmpty ? (
            <>
              <span
                className={cn(
                  'text-sm font-display font-semibold tracking-wide',
                  isOver ? meta.text : isWaitingForTap ? 'text-accent' : 'text-fg-muted',
                )}
              >
                {isOver ? 'שחרר כאן' : isWaitingForTap ? 'הקש לשבץ כאן' : 'גררו לכאן'}
              </span>
              <Icon
                name="chevrons-down"
                size={16}
                strokeWidth={2}
                className={isOver ? meta.text : 'text-fg-dim'}
              />
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
        'surface cursor-grab active:cursor-grabbing transition-all',
        compact ? 'p-2.5' : 'p-3',
        isSelected && 'border-accent ring-2 ring-accent/40',
        isCorrect && !isSelected && 'border-status-ok/50 bg-status-ok/5',
        isWrong && !isSelected && 'border-status-danger/50 bg-status-danger/5',
        !isSelected && !isCorrect && !isWrong && 'hover:border-border-strong'
      )}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
    >
      <div className="flex items-start gap-2">
        <p className={cn('flex-1 leading-snug', compact ? 'text-xs' : 'text-sm')}>
          {scenario.text}
        </p>
        {submitted && (isCorrect || isWrong) && (
          <Icon
            name={isCorrect ? 'check' : 'spark'}
            size={compact ? 12 : 14}
            strokeWidth={2.5}
            className={cn(
              'shrink-0 mt-0.5',
              isCorrect ? 'text-status-ok' : 'text-status-danger'
            )}
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
            className={cn('mt-1.5 text-[11px] text-status-danger leading-snug')}
          >
            הקטגוריה הנכונה: <strong>{LEVELS[scenario.correct].label}</strong>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
