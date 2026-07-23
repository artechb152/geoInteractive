'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
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
};

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
  },
};

// In RTL, first column → right side. Strategic = broadest = right.
const LEVEL_ORDER: Level[] = ['strategic', 'operational', 'tactical'];

type MatrixRowKey = 'who' | 'zoom' | 'time' | 'example';
const MATRIX_ROWS: { key: MatrixRowKey; label: string }[] = [
  { key: 'who', label: 'מי מחליט?' },
  { key: 'zoom', label: 'זום מרחבי' },
  { key: 'time', label: 'אופק זמן' },
  { key: 'example', label: 'דוגמה מבצעית' },
];

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
        intro="בדיוק כמו באפליקציית ניווט, המלחמה נראית לגמרי אחרת בהתאם ל'זום' שבו מסתכלים עליה. סרקו את המטריצה — בכל עמודה רמה אחרת, ובכל שורה ממד אחר: מי מחליט, איזה שטח, איזה אופק זמן."
      />

      {/* === Comparison Matrix === */}
      <div className="surface-elevated p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5 pb-5 border-b border-border-subtle">
          <div className="shrink-0 mx-auto sm:mx-0">
            <SVGPyramidStatic />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-bold text-xl leading-tight mb-1">
              שלוש הרמות במבט אחד
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty">
              למעלה (אסטרטגית) — רחב, איטי, רחוק. למטה (טקטית) — צמוד, מהיר, כאן ועכשיו. ביניהן (אופרטיבית) — דרג הביניים שמתרגם מטרות מדיניות לתנועה בשטח.
            </p>
          </div>
        </div>

        <ComparisonMatrix />
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

        {/* Pool of unassigned scenarios */}
        <ScenarioPool
          pool={pool}
          selectedScenario={selectedScenario}
          submitted={submitted}
          onSelect={handleScenarioSelect}
          onMoveScenario={moveScenario}
        />

        {/* 3 Category Bins */}
        <div className="grid md:grid-cols-3 gap-3 mb-6">
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

function ComparisonMatrix() {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="hidden sm:table-cell pb-4 px-3 text-right text-sm font-display font-semibold text-fg-muted tracking-wider whitespace-nowrap align-bottom w-[110px]"
            >
              ממד
            </th>
            {LEVEL_ORDER.map((id) => {
              const meta = LEVELS[id];
              return (
                <th
                  key={id}
                  scope="col"
                  className="pb-4 px-3 text-right align-bottom"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon name={meta.zoomIcon} size={28} className={cn('shrink-0', meta.text)} />
                    <div className="min-w-0">
                      <div
                        className={cn(
                          'font-display font-bold text-base leading-tight',
                          meta.text
                        )}
                      >
                        {meta.label}
                      </div>
                      <div className="text-[10px] font-mono text-fg-dim mt-0.5">
                        {meta.english}
                      </div>
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {MATRIX_ROWS.map((row) => (
            <tr key={row.key}>
              <th
                scope="row"
                className="hidden sm:table-cell py-4 px-3 text-right align-top text-sm font-display font-semibold text-fg-muted tracking-wider whitespace-nowrap border-t border-border-subtle"
              >
                {row.label}
              </th>
              {LEVEL_ORDER.map((id) => {
                const meta = LEVELS[id];
                return (
                  <td
                    key={id}
                    className="py-4 px-3 text-right align-top leading-relaxed border-t border-border-subtle"
                  >
                    <div className="sm:hidden text-sm font-display font-semibold text-fg-muted mb-1.5 tracking-wider">
                      {row.label}
                    </div>
                    <span
                      className={cn(
                        row.key === 'example'
                          ? 'text-fg-muted text-pretty text-xs sm:text-sm'
                          : 'text-fg text-xs sm:text-sm'
                      )}
                    >
                      {meta[row.key]}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SVGPyramidStatic() {
  const order: { id: Level; y: number; left: number; right: number }[] = [
    { id: 'strategic', y: 8, left: 5, right: 95 },
    { id: 'operational', y: 40, left: 22, right: 78 },
    { id: 'tactical', y: 70, left: 36, right: 64 },
  ];
  const bottomCap = { y: 98, left: 44, right: 56 };

  return (
    <svg viewBox="0 0 100 110" className="w-[120px] sm:w-[110px]" aria-hidden>
      <polygon
        points={`${order[0].left},${order[0].y - 3} ${order[0].right},${order[0].y - 3} ${bottomCap.right},${bottomCap.y + 2} ${bottomCap.left},${bottomCap.y + 2}`}
        className="fill-bg-card stroke-border"
        strokeWidth="0.5"
      />
      {order.map((r, i) => {
        const next = order[i + 1] ?? bottomCap;
        const meta = LEVELS[r.id];
        const points = `${r.left},${r.y} ${r.right},${r.y} ${next.right},${next.y} ${next.left},${next.y}`;
        return (
          <g key={r.id}>
            <polygon
              points={points}
              className={cn(meta.fillClass, 'stroke-current', meta.text)}
              strokeWidth="0.6"
            />
            <text
              x="50"
              y={(r.y + next.y) / 2 + 1.5}
              textAnchor="middle"
              className={cn('text-[5px] font-display font-bold', meta.text)}
            >
              {meta.label}
            </text>
          </g>
        );
      })}
    </svg>
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
        'bg-bg-elevated p-4 mb-6 rounded-[3px] border transition-colors duration-200',
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
        'relative bg-bg-elevated rounded-[3px] overflow-hidden flex flex-col transition-colors duration-200',
        'border',
        isOver
          ? meta.borderActive
          : isWaitingForTap
            ? cn(meta.borderActive, 'cursor-pointer')
            : 'border-border',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3 pr-4">
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
      <div className="p-3 pt-0 flex-1 min-h-[140px]">
        {scenariosInBin.length === 0 ? (
          <motion.div
            animate={{
              backgroundColor: isOver
                ? 'rgba(116, 156, 117, 0.10)'
                : isWaitingForTap
                  ? 'rgba(235, 158, 72, 0.06)'
                  : 'rgba(0, 0, 0, 0.015)',
            }}
            className="h-full min-h-[120px] rounded-[3px] flex flex-col items-center justify-center gap-2 transition-colors"
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
