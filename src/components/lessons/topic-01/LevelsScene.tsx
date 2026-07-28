'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Level = 'strategic' | 'operational' | 'tactical';

type LevelMeta = {
  label: string;
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
};

const LEVELS: Record<Level, LevelMeta> = {
  strategic: {
    label: 'אסטרטגית',
    who: 'הדרג המדיני (הממשלה) והרמטכ"ל',
    zoom: '"מבט מלוויין" (גלובלי) – מדינות שלמות, יבשות ואוקיינוסים.',
    zoomIcon: 'globe',
    time: 'חודשים עד שנים. החלטות שמשפיעות על דורות.',
    example: 'האם המדינה יוצאת למלחמה כוללת? עם אילו מדינות חותמים ברית? החלטות תקציב דרמטיות, למשל – להפסיק לייצר טנקים ולרכוש צוללות במקום.',
    borderActive: 'border-brand-dark',
    bgActive: 'bg-brand/10',
    text: 'text-brand-dark',
    fillClass: 'fill-brand/30',
    zoomLevel: 1,
  },
  operational: {
    label: 'אופרטיבית',
    who: 'אלופי הפיקודים ומפקדי האוגדות — דרג הביניים שמחבר בין החזון לשטח.',
    zoom: '"מבט רחב ב-Waze" (אזורי) – עשרות עד מאות קילומטרים.',
    zoomIcon: 'layers',
    time: 'ימים, שבועות או חודשים.',
    example: 'תכנון איך להזרים 30,000 חיילים ומאות טנקים לחזית מבלי ליצור פקק תנועה ענק ופגיע, והחלטה איפה להקים עבורם מאגרי דלק ענקיים בשטח.',
    borderActive: 'border-accent',
    bgActive: 'bg-accent/10',
    text: 'text-accent',
    fillClass: 'fill-accent/30',
    zoomLevel: 2,
  },
  tactical: {
    label: 'טקטית',
    who: 'המפקדים בשטח (מג"דים, מ"פים) ועד החייל הבודד בקצה.',
    zoom: '"Street View" (מקומי) – נמדד במטרים: סלע בודד, חלון בבניין או ערוץ נחל.',
    zoomIcon: 'crosshair',
    time: 'שניות, דקות או שעות ספורות. החלטות של חיים ומוות ב"כאן ועכשיו".',
    example: 'בחירת סלע ספציפי שיסתיר חייל מצלף, החלטה מאיזו זווית לפרוץ לבניין כדי שהשמש תסנוור את האויב, ובאיזה ערוץ נחל הפלוגה תתגנב בשקט בלי להתגלות.',
    borderActive: 'border-brand',
    bgActive: 'bg-brand/10',
    text: 'text-brand',
    fillClass: 'fill-brand/30',
    zoomLevel: 3,
  },
};

// In RTL, first column → right side. Strategic = broadest = right.
const LEVEL_ORDER: Level[] = ['strategic', 'operational', 'tactical'];

const SCENARIOS: { text: string; correct: Level; icon: IconName }[] = [
  { text: 'מפקד פלוגה מאתר עמדת מקלע אויב על שלוחה', correct: 'tactical', icon: 'crosshair' },
  { text: 'מטכ"ל מחליט לפתוח גזרה חדשה בצפון', correct: 'strategic', icon: 'globe' },
  { text: 'אלוף הפיקוד מסנכרן תנועת אוגדה מול חיל אוויר', correct: 'operational', icon: 'layers' },
  { text: 'נגד מפעיל מקלע מתחלף לעמדה סמוכה', correct: 'tactical', icon: 'target' },
  { text: 'ראש ממשלה מאשר העברת תקציב הגנה לזירה אסיאתית', correct: 'strategic', icon: 'flag' },
  { text: 'מפקדת חטיבה משריינת מתאמת ציר לוגיסטי עם פיקוד עורף', correct: 'operational', icon: 'truck' },
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
    <section id="scene-levels" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="01.1"
        eyebrow="רמות המלחמה"
        title={
          <>
            <span className="gradient-text">שלוש רמות המלחמה</span> · אותה המערכה, ברזולוציות שונות
          </>
        }
        intro="בדיוק כמו באפליקציית ניווט, המלחמה נראית לגמרי אחרת בהתאם ל'זום' שבו מסתכלים עליה. החליפו בין שלוש העדשות וראו איך כל שינוי בקנה המידה משנה גם את מקבל ההחלטה, אופק הזמן וסוג המשימה."
      />

      <WarZoomExplorer />

      {/* === Practice: Drag scenarios into bins === */}
      <div className="relative mt-12 overflow-hidden rounded-[3px] border border-border bg-bg-elevated p-4 shadow-elevated sm:p-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-brand-dark via-brand to-accent" />
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

        {/* Pool of unassigned scenarios */}
        <ScenarioPool
          pool={pool}
          selectedScenario={selectedScenario}
          submitted={submitted}
          onSelect={handleScenarioSelect}
          onMoveScenario={moveScenario}
        />

        {/* 3 Category Bins */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {LEVEL_ORDER.map((level) => (
            <CategoryBin
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

function WarZoomExplorer() {
  const [activeLevel, setActiveLevel] = useState<Level>('strategic');
  const meta = LEVELS[activeLevel];
  const activeIndex = LEVEL_ORDER.indexOf(activeLevel);
  const pyramidLayers: {
    level: Level;
    points: string;
    depthPoints: string;
    labelY: number;
  }[] = [
    {
      level: 'tactical',
      points: '148,32 212,32 244,101 116,101',
      depthPoints: '116,101 244,101 250,112 110,112',
      labelY: 70,
    },
    {
      level: 'operational',
      points: '110,126 250,126 286,203 74,203',
      depthPoints: '74,203 286,203 292,214 68,214',
      labelY: 168,
    },
    {
      level: 'strategic',
      points: '68,222 292,222 336,316 24,316',
      depthPoints: '24,316 336,316 330,327 30,327',
      labelY: 270,
    },
  ];
  const detailRows: { label: string; value: string }[] = [
    { label: 'מי מחליט?', value: meta.who },
    { label: 'מה רואים?', value: meta.zoom },
    { label: 'אופק הזמן', value: meta.time },
  ];

  return (
    <div className="surface-elevated relative overflow-hidden p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -end-24 -top-24 size-72 rounded-full border border-brand/10" />
        <div className="absolute -end-10 -top-10 size-44 rounded-full border border-brand/10" />
        <div className="absolute -bottom-28 start-1/3 size-64 rounded-full border border-accent/10" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-brand-dark via-brand to-accent" />
      </div>

      <div className="relative grid items-center gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-10">
        {/* Interactive pyramid — first in RTL, therefore rendered on the right. */}
        <div className="relative mx-auto w-full max-w-[360px] py-2 lg:py-4">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <motion.div
              animate={{
                scale: 1 + activeIndex * 0.08,
                opacity: 0.18 - activeIndex * 0.025,
              }}
              transition={{ type: 'spring', stiffness: 150, damping: 24 }}
              className={cn(
                'absolute start-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full border',
                meta.borderActive
              )}
            />
            <motion.div
              animate={{
                scale: 0.72 + activeIndex * 0.09,
                opacity: 0.12,
              }}
              transition={{ type: 'spring', stiffness: 150, damping: 24 }}
              className={cn(
                'absolute start-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full border',
                meta.borderActive
              )}
            />
            <div className="absolute inset-y-5 start-1/2 w-px bg-gradient-to-b from-transparent via-border-strong/50 to-transparent" />
            <div className="absolute inset-x-3 top-1/2 h-px bg-gradient-to-l from-transparent via-border-strong/30 to-transparent" />
          </div>

          <svg
            viewBox="0 0 360 350"
            className="relative z-10 mx-auto w-full overflow-visible"
            role="tablist"
            aria-label="בחירת רמת מלחמה מתוך הפירמידה"
          >
            {pyramidLayers.map(({ level, points, depthPoints, labelY }) => {
              const item = LEVELS[level];
              const isActive = activeLevel === level;
              return (
                <motion.g
                  key={level}
                  id={`war-level-${level}`}
                  role="tab"
                  tabIndex={0}
                  aria-selected={isActive}
                  aria-controls="war-level-panel"
                  aria-label={`הרמה ה${item.label}`}
                  onClick={() => setActiveLevel(level)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setActiveLevel(level);
                    }
                  }}
                  animate={{
                    scale: isActive ? 1.035 : 1,
                    x: isActive ? -3 : 0,
                    opacity: isActive ? 1 : 0.68,
                  }}
                  whileHover={{ scale: isActive ? 1.035 : 1.018, opacity: 1 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 25 }}
                  style={{ transformOrigin: `180px ${labelY}px` }}
                  className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <polygon
                    points={depthPoints}
                    fill="currentColor"
                    className={cn('opacity-35', item.text)}
                    aria-hidden
                  />
                  <polygon
                    points={points}
                    stroke="currentColor"
                    strokeWidth={isActive ? 3 : 1.5}
                    className={cn(
                      'transition-all duration-200',
                      item.text,
                      item.fillClass,
                      isActive ? 'drop-shadow-lg' : 'drop-shadow-sm'
                    )}
                  />
                  {isActive && (
                    <polygon
                      points={points}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className={cn('pointer-events-none opacity-15', item.text)}
                      aria-hidden
                    />
                  )}
                  <text
                    x="180"
                    y={labelY + 2}
                    textAnchor="middle"
                    className={cn(
                      'pointer-events-none fill-current font-display font-bold',
                      isActive ? 'text-[17px]' : 'text-[15px]',
                      item.text
                    )}
                  >
                    {item.label}
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </div>

        {/* All explanatory content stays together on the left. */}
        <div
          id="war-level-panel"
          role="tabpanel"
          aria-labelledby={`war-level-${activeLevel}`}
          className="min-w-0"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeLevel}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-4 border-b border-border-subtle pb-4">
                <div className="min-w-0">
                  <h4 className={cn('font-display text-2xl font-bold sm:text-3xl', meta.text)}>
                    הרמה ה{meta.label}
                  </h4>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg sm:text-base">
                    {activeLevel === 'strategic'
                      ? 'רואים את המערכה מלמעלה: המטרה היא לקבוע לאן המדינה הולכת ומה היא מוכנה להשקיע.'
                      : activeLevel === 'operational'
                        ? 'מתרגמים את הכיוון לתכנית: מחברים בין זירות, כוחות, זמן ולוגיסטיקה.'
                        : 'נמצאים בתוך האירוע: השטח, האויב והדקות הקרובות קובעים את ההחלטה.'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {detailRows.map((row) => (
                  <div
                    key={row.label}
                    className="bg-bg-accent/60 p-3.5"
                  >
                    <div className="mb-2">
                      <span className="text-xs font-display font-semibold text-fg-muted">
                        {row.label}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-fg">{row.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 bg-bg-card p-4 sm:p-5">
                <div className="mb-2">
                  <span className="text-xs font-display font-semibold text-fg-muted">
                    כך נראית החלטה ברמה הזאת
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-fg-muted">{meta.example}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
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
      className={cn(
        'bg-bg-accent/60 p-4 mb-6 rounded-[3px] border transition-all duration-200',
        isOver ? 'border-brand bg-brand/10 shadow-paper' : 'border-border',
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
        <div className="grid sm:grid-cols-2 gap-2">
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

function CategoryBin({
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
  const isWaitingForTap = selectedScenario != null && scenariosInBin.length === 0;

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
        if (!Number.isNaN(idx)) onMoveScenario(idx, level);
        setIsOver(false);
      }}
      onClick={() => {
        if (selectedScenario != null) {
          onMoveScenario(selectedScenario, level);
        }
      }}
      animate={{ scale: isOver ? 1.015 : 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn(
        'relative bg-bg-elevated rounded-[3px] overflow-hidden flex flex-col transition-all duration-200 shadow-elevated',
        'border border-t-4',
        isOver
          ? cn(meta.borderActive, meta.bgActive, 'shadow-paper')
          : isWaitingForTap
            ? cn(meta.borderActive, meta.bgActive, 'cursor-pointer')
            : cn('border-border', meta.borderActive),
      )}
    >
      {/* Header */}
      <div className={cn('flex items-center gap-3 border-b border-border-subtle p-4', meta.bgActive)}>
        <div className="flex-1 min-w-0">
          <div className={cn('font-display font-bold leading-tight', meta.text)}>
            {meta.label}
          </div>
          <div className="text-[11px] text-fg-muted mt-0.5">
            {scenariosInBin.length === 0
              ? 'ריק · מחכה למיון'
              : `${scenariosInBin.length} ${scenariosInBin.length === 1 ? 'משפט' : 'משפטים'}`}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex-1 min-h-[140px]">
        {scenariosInBin.length === 0 ? (
          <motion.div
            animate={{
              backgroundColor: isOver
                ? 'rgba(116, 156, 117, 0.10)'
                : isWaitingForTap
                  ? 'rgba(235, 158, 72, 0.06)'
                  : 'rgba(0, 0, 0, 0.015)',
            }}
            className="h-full min-h-[120px] rounded-[3px] border border-dashed border-border flex flex-col items-center justify-center gap-2 transition-colors"
          >
            {isOver && (
              <motion.span
                animate={{ scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className={cn('inline-flex', meta.text)}
              >
                <Icon name="check" size={18} strokeWidth={2.5} />
              </motion.span>
            )}
            <span
              className={cn(
                'text-sm font-display font-semibold tracking-wider',
                isOver
                  ? meta.text
                  : isWaitingForTap
                    ? 'text-accent'
                    : 'text-fg-muted',
              )}
            >
              {isOver ? 'שחרר כאן' : isWaitingForTap ? 'הקש לשבץ כאן' : 'גרור לכאן'}
            </span>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {scenariosInBin.map(({ s, i }) => {
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
            })}
          </div>
        )}
      </div>
    </motion.div>
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
        'surface cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5 hover:shadow-elevated',
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
