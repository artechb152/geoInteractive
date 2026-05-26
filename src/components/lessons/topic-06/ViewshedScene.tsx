'use client';
import { useMemo, useState } from 'react';
import { SceneHeader } from './SceneHeader';
import { InsightCard } from '@/components/lesson/InsightCard';
import { cn } from '@/lib/utils';

const GRID_W = 22;
const GRID_H = 13;
const EYE_HEIGHT = 2;

// Terrain generator — 3 hills create interesting visibility patterns
function terrainHeight(x: number, y: number): number {
  const h1 = Math.exp(-(((x - 6) ** 2) / 18 + ((y - 4) ** 2) / 10)) * 8;
  const h2 = Math.exp(-(((x - 13) ** 2) / 14 + ((y - 8) ** 2) / 12)) * 11;
  const h3 = Math.exp(-(((x - 18) ** 2) / 12 + ((y - 3) ** 2) / 8)) * 7;
  return Math.max(0, h1 + h2 + h3 - 0.6);
}

function isVisibleFrom(ox: number, oy: number, tx: number, ty: number): boolean {
  if (ox === tx && oy === ty) return true;
  const oH = terrainHeight(ox, oy) + EYE_HEIGHT;
  const tH = terrainHeight(tx, ty);
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(3, Math.ceil(dist * 3));
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    const x = ox + dx * t;
    const y = oy + dy * t;
    const lineH = oH + (tH - oH) * t;
    const groundH = terrainHeight(x, y);
    if (groundH > lineH + 0.05) return false;
  }
  return true;
}

type Observer = { x: number; y: number; color: string; label: string };
const COLORS = ['accent-cool', 'accent', 'accent-hot'] as const;

export function ViewshedScene() {
  const [observers, setObservers] = useState<Observer[]>([
    { x: 6, y: 4, color: COLORS[0], label: 'תצפית A' },
  ]);
  const [mode, setMode] = useState<'single' | 'cumulative'>('single');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const visibleObservers = mode === 'single' ? observers.slice(0, 1) : observers;

  // Compute visibility map
  const visibilityMap = useMemo(() => {
    const map: boolean[][] = [];
    for (let x = 0; x < GRID_W; x++) {
      map[x] = [];
      for (let y = 0; y < GRID_H; y++) {
        let visible = false;
        for (const obs of visibleObservers) {
          if (isVisibleFrom(obs.x, obs.y, x, y)) {
            visible = true;
            break;
          }
        }
        map[x][y] = visible;
      }
    }
    return map;
  }, [visibleObservers]);

  const totalCells = GRID_W * GRID_H;
  const visibleCount = visibilityMap.flat().filter(Boolean).length;
  const coverage = Math.round((visibleCount / totalCells) * 100);

  const handleCellClick = (x: number, y: number) => {
    setObservers((prev) => {
      const next = [...prev];
      next[selectedIdx] = { ...next[selectedIdx], x, y };
      return next;
    });
  };

  const addObserver = () => {
    if (observers.length >= 3) return;
    const idx = observers.length;
    setObservers([
      ...observers,
      { x: 15 - idx * 4, y: 8, color: COLORS[idx], label: `תצפית ${String.fromCharCode(65 + idx)}` },
    ]);
    setSelectedIdx(idx);
    setMode('cumulative');
  };

  const removeObserver = (idx: number) => {
    if (observers.length <= 1) return;
    setObservers((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIdx(0);
  };

  return (
    <section id="scene-viewshed" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="06.2"
        eyebrow="ניתוח שטחים גלויים (Viewshed)"
        title={
          <>
            <span className="gradient-text">לתת למחשב</span> לעשות את העבודה הקשה
          </>
        }
        intro="במקום שנמתח קו ראייה (LOS) אחד בכל פעם, תוכנות מיפוי עושות את זה בשבילנו. הן מחשבות מיליוני קווי ראייה בשנייה, וצובעות את המפה: ירוק (שטח גלוי) ואדום (שטח מת שמוסתר מאיתנו). הזיזו את התצפיתן במפה ותראו איך הכל משתנה בלייב."
      />

      <div className="mb-6">
        <InsightCard tone="cool" icon="spark" label="איך הקסם הזה עובד מאחורי הקלעים?">
          המערכת משתמשת במודל שנקרא <strong className="text-fg">DEM</strong> (מודל גבהים דיגיטלי) — זה בעצם ייצוג תלת-ממדי של השטח, שבו לכל פיקסל יש גובה משלו.
          האלגוריתם פשוט שואל על כל פיקסל במפה: <em>"האם יש קו ראייה נקי אליי מהתצפיתן?"</em>. אם התשובה היא כן — הוא נצבע בירוק. אם משהו מסתיר — הוא נצבע באדום.
        </InsightCard>
      </div>

      {/* Main viewshed map */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch mb-12">
        {/* Map */}
        <div className="surface-elevated p-4 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
              מפת שטחים גלויים · {mode === 'single' ? 'תצפיתן אחד' : `${observers.length} תצפיתנים יחד`}
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-fg-dim">
              <span className="flex items-center gap-1">
                <span className="size-2 bg-status-ok rounded-sm" /> גלוי {coverage}%
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 bg-status-danger/40 rounded-sm" /> שטח מת {100 - coverage}%
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ViewshedMap
              visibilityMap={visibilityMap}
              observers={visibleObservers}
              selectedIdx={selectedIdx}
              onCellClick={handleCellClick}
            />
          </div>
          <div className="mt-3 text-[10px] text-fg-dim text-center">
            לחצו על המפה כדי להזיז את <strong className="text-fg">{observers[selectedIdx]?.label}</strong>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          {/* Mode toggle */}
          <div className="surface p-4 rounded-xl">
            <div className="text-sm font-display font-semibold text-fg-muted mb-2 tracking-wider">סוג הניתוח</div>
            <div className="flex gap-1 p-1 bg-bg-card border border-border rounded-xl">
              {(['single', 'cumulative'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                    mode === m ? 'bg-accent text-bg-elevated' : 'text-fg-muted hover:text-fg'
                  )}
                >
                  {m === 'single' ? 'תצפיתן בודד' : 'שילוב תצפיתנים'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-fg-dim mt-2 leading-relaxed">
              {mode === 'single'
                ? 'מציג מה רואה תצפיתן אחד בלבד. מעולה כדי להבין איפה יש לו "שטחים מתים" שהוא לא מצליח לראות.'
                : 'משלב את מה שכולם רואים יחד. המטרה שלנו: לוודא שאין אף "שטח מת" שאף אחד מהתצפיתנים לא רואה.'}
            </p>
          </div>

          {/* Observers list */}
          <div className="surface p-4 rounded-xl">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">רשימת תצפיתנים</div>
              <button
                onClick={addObserver}
                disabled={observers.length >= 3}
                className={cn(
                  'text-[10px] font-mono px-2 py-1 rounded-md border transition-colors',
                  observers.length >= 3
                    ? 'border-border text-fg-dim cursor-not-allowed'
                    : 'border-accent/40 text-accent hover:bg-accent/5'
                )}
              >
                + הוספת תצפיתן
              </button>
            </div>
            <div className="space-y-1.5">
              {observers.map((obs, i) => {
                const isSelected = selectedIdx === i;
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border transition-all',
                      isSelected
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-border-strong'
                    )}
                  >
                    <button
                      onClick={() => setSelectedIdx(i)}
                      className="flex-1 flex items-center gap-2 text-right cursor-pointer"
                    >
                      <span
                        className={cn(
                          'size-3 rounded-full',
                          obs.color === 'accent-cool' && 'bg-accent-cool',
                          obs.color === 'accent' && 'bg-accent',
                          obs.color === 'accent-hot' && 'bg-accent-hot'
                        )}
                      />
                      <span className="text-xs font-medium">{obs.label}</span>
                      <span className="text-[10px] font-mono text-fg-dim ms-auto">
                        ({obs.x}, {obs.y})
                      </span>
                    </button>
                    {observers.length > 1 && (
                      <button
                        onClick={() => removeObserver(i)}
                        className="size-5 rounded-md hover:bg-bg-accent text-fg-dim hover:text-status-danger text-xs"
                        aria-label="הסר תצפיתן"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-[11px] text-fg-dim leading-relaxed">
              לחצו על שם של תצפיתן כדי לבחור בו, ואז לחצו בכל מקום במפה כדי להזיז אותו.
            </div>
          </div>

          <div className="surface p-3 rounded-xl text-xs text-fg-muted bg-bg-accent/30 border border-border">
            <strong className="text-fg block mb-1">אתגר:</strong>
            עברו למצב <em>שילוב תצפיתנים</em>, ונסו למקם 3 תצפיתנים על המפה כך שכמעט ולא יישארו אזורים אדומים.
            (ספוילר: זו בדיוק העבודה של קציני איסוף שמתכננים איפה להציב מצלמות על קו הגבול!)
          </div>
        </div>
      </div>

      {/* Concept cards */}
      <SoftDivider text="3 כלי הניתוח שכל חוקר שטח חייב להכיר" />

      <div className="grid md:grid-cols-3 gap-3 mb-10">
        <InsightCard
          tone="ok"
          icon="eye"
          label="מה אפשר לראות מנקודה אחת?"
          title="ניתוח ראות (Viewshed)"
        >
          הכלי הקלאסי ביותר. בוחרים נקודה במפה, והמחשב סורק את כל השטח וצובע מה גלוי ומה מוסתר. למה זה טוב? כדי להחליט איפה להקים מוצב צבאי, אנטנה סלולרית או מכ"ם — איפה נשיג את הראות הכי טובה?
        </InsightCard>
        <InsightCard
          tone="cool"
          icon="layers"
          label="כיסוי משותף של כמה נקודות"
          title="ראות מצטברת (Cumulative)"
        >
          חיבור של כמה נקודות תצפית יחד. המפה מראה לנו איזה אזור "מכוסה" היטב על ידי מספר תצפיות, ואיפה יש לנו "עיוורון מודיעיני" שאף אחד לא רואה. זה בדיוק מה שעושים כשמתכננים פריסת מצלמות אבטחה סביב בסיס או לאורך גבול.
        </InsightCard>
        <InsightCard
          tone="accent"
          icon="compass"
          label="איך להגיע בלי להתאמץ ולהיתפס?"
          title="מסלול חסכוני (Least-Cost Path)"
        >
          האלגוריתם מחשב את הנתיב הפיזי הכי קל להליכה, שעוקף עליות קשות ונשאר בתוך "שטחים מתים". כשמשלבים את זה עם ניתוח ראות, מקבלים את המסלול המושלם — נתיב התגנבות קל להליכה שאף אחד גם לא יכול לראות.
        </InsightCard>
      </div>
    </section>
  );
}

function ViewshedMap({
  visibilityMap,
  observers,
  selectedIdx,
  onCellClick,
}: {
  visibilityMap: boolean[][];
  observers: Observer[];
  selectedIdx: number;
  onCellClick: (x: number, y: number) => void;
}) {
  const cellW = 100 / GRID_W;
  const cellH = 100 / GRID_H;

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full select-none"
        style={{ cursor: 'crosshair' }}
      >
        {/* Cells */}
        {Array.from({ length: GRID_W }).map((_, x) =>
          Array.from({ length: GRID_H }).map((_, y) => {
            const isVisible = visibilityMap[x][y];
            const h = terrainHeight(x, y);
            // Shade darker for higher terrain
            const shade = Math.min(0.55, h / 18);
            return (
              <rect
                key={`${x}-${y}`}
                x={x * cellW}
                y={y * cellH}
                width={cellW}
                height={cellH}
                className={isVisible ? 'fill-status-ok' : 'fill-status-danger'}
                opacity={isVisible ? 0.18 + shade * 0.5 : 0.25 + shade * 0.45}
                onClick={() => onCellClick(x, y)}
                style={{ cursor: 'pointer' }}
              />
            );
          })
        )}

        {/* Terrain contours (subtle elevation lines) */}
        {Array.from({ length: GRID_W - 1 }).map((_, x) =>
          Array.from({ length: GRID_H - 1 }).map((_, y) => {
            const here = terrainHeight(x, y);
            const right = terrainHeight(x + 1, y);
            const down = terrainHeight(x, y + 1);

            // If height crosses a contour level (every 2 units), draw an edge
            const level = Math.floor(here / 2);
            const levelRight = Math.floor(right / 2);
            const levelDown = Math.floor(down / 2);

            return (
              <g key={`c-${x}-${y}`}>
                {level !== levelRight && (
                  <line
                    x1={(x + 1) * cellW}
                    y1={y * cellH}
                    x2={(x + 1) * cellW}
                    y2={(y + 1) * cellH}
                    className="stroke-fg-dim"
                    strokeWidth="0.15"
                    opacity="0.35"
                  />
                )}
                {level !== levelDown && (
                  <line
                    x1={x * cellW}
                    y1={(y + 1) * cellH}
                    x2={(x + 1) * cellW}
                    y2={(y + 1) * cellH}
                    className="stroke-fg-dim"
                    strokeWidth="0.15"
                    opacity="0.35"
                  />
                )}
              </g>
            );
          })
        )}

        {/* Observer markers */}
        {observers.map((obs, i) => {
          const isSelected = selectedIdx === i;
          const cx = obs.x * cellW + cellW / 2;
          const cy = obs.y * cellH + cellH / 2;
          return (
            <g key={i} className="pointer-events-none">
              {/* Pulse ring on selected */}
              {isSelected && (
                <circle cx={cx} cy={cy} r="2.5" fill="none" className="stroke-accent" strokeWidth="0.3">
                  <animate attributeName="r" values="2;4.5;2" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0;0.9" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={cx}
                cy={cy}
                r="1.5"
                className={cn(
                  obs.color === 'accent-cool' && 'fill-accent-cool',
                  obs.color === 'accent' && 'fill-accent',
                  obs.color === 'accent-hot' && 'fill-accent-hot'
                )}
                stroke="#ffffff"
                strokeWidth="0.4"
              />
              <text
                x={cx}
                y={cy - 2.5}
                textAnchor="middle"
                className={cn(
                  'font-display font-bold font-bold',
                  obs.color === 'accent-cool' && 'fill-accent-cool',
                  obs.color === 'accent' && 'fill-accent',
                  obs.color === 'accent-hot' && 'fill-accent-hot'
                )}
                fontSize="2.6"
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth="0.8"
                strokeLinejoin="round"
              >
                {obs.label.split(' ')[1]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-10 flex items-center gap-3">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-sm font-display font-semibold tracking-wider text-fg-muted">
        {text}
      </span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}