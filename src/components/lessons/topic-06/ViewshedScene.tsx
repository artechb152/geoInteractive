'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
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
        eyebrow="ניתוח Viewshed אלגוריתמי"
        title={
          <>
            <span className="gradient-text">מפת אור וצל</span> — מה שהמחשב יודע, ואתה לא
          </>
        }
        intro="במקום לחשב LOS לכל מטרה בנפרד, מערכות GIS מחשבות לך מאות אלפי קווי ראייה בו-זמנית, וצובעות את המפה ירוק (מואר) או אדום (שטח מת). הזיזו את התצפיתן, ראו איך החישוב משתנה."
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">איך זה עובד מתחת למכסה:</strong>{' '}
            המערכת מקבלת <strong className="text-fg">DEM</strong> — מודל גבהים ספרתי (ייצוג תלת-ממדי של פני השטח כרשת פיקסלים, לכל פיקסל גובה).
            לכל פיקסל היא בודקת: <em>האם הקו מהתצפיתן אליי לא נחתך?</em> אם כן — ירוק (מואר). אם לא — אדום (שטח מת).
          </div>
        </div>
      </div>

      {/* Main viewshed map */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch mb-12">
        {/* Map */}
        <div className="surface-elevated p-4 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-[10px] font-mono text-fg-dim tracking-widest uppercase">
              מפת Viewshed · {mode === 'single' ? 'תצפיתן יחיד' : `${observers.length} תצפיתנים מצטברים`}
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-fg-dim">
              <span className="flex items-center gap-1">
                <span className="size-2 bg-status-ok rounded-sm" /> מואר {coverage}%
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 bg-status-danger/40 rounded-sm" /> שטח מת {100 - coverage}%
              </span>
            </div>
          </div>
          <ViewshedMap
            visibilityMap={visibilityMap}
            observers={visibleObservers}
            selectedIdx={selectedIdx}
            onCellClick={handleCellClick}
          />
          <div className="mt-3 text-[10px] text-fg-dim text-center">
            לחץ על המפה כדי להזיז את <strong className="text-fg">{observers[selectedIdx]?.label}</strong>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          {/* Mode toggle */}
          <div className="surface p-4 rounded-xl">
            <div className="text-xs font-mono text-fg-dim mb-2 tracking-widest uppercase">מצב ניתוח</div>
            <div className="flex gap-1 p-1 bg-bg-card border border-border rounded-xl">
              {(['single', 'cumulative'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                    mode === m ? 'bg-accent text-bg shadow-glow' : 'text-fg-muted hover:text-fg'
                  )}
                >
                  {m === 'single' ? 'תצפיתן יחיד' : 'מצטבר'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-fg-dim mt-2 leading-relaxed">
              {mode === 'single'
                ? 'רואים את הכיסוי של תצפיתן יחיד — יחשפו אילו "עיניים בודדות" יוצרות פערים.'
                : 'מאחדים את הכיסוי של כל התצפיתנים. השאלה: האם נשארו "כתמים מתים"?'}
            </p>
          </div>

          {/* Observers list */}
          <div className="surface p-4 rounded-xl">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-xs font-mono text-fg-dim tracking-widest uppercase">תצפיתנים</div>
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
                + הוסף
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
                        ? 'border-accent bg-accent/5 shadow-glow'
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
              לחץ על תצפיתן כדי לבחור אותו, ואז לחץ על המפה כדי להזיז אותו.
            </div>
          </div>

          <div className="surface p-3 rounded-xl text-xs text-fg-muted bg-bg-accent/30 border border-border">
            <strong className="text-fg block mb-1">תרגול:</strong>
            במצב <em>מצטבר</em>, נסה לסדר 3 תצפיתנים כך שאף אזור על המפה לא ייצבע אדום.
            (זו בדיוק העבודה של מי שתכנן את מערך התצפית בקו הגבול.)
          </div>
        </div>
      </div>

      {/* Concept cards */}
      <SoftDivider text="3 כלי ניתוח שעובדים יד ביד" />

      <div className="grid md:grid-cols-3 gap-3 mb-10">
        <ConceptCard
          icon="eye"
          title="Viewshed"
          subtitle="מודל האור"
          body={`הכלי הקלאסי. נקודה אחת על המפה → סריקה של כל פיקסל → צביעת השטחים המוארים מול המתים. השימוש: בחירת מיקום למוצבים, ממסרים, מכ"מים — איפה הם 'יראו' הכי הרבה?`}
          color="text-status-ok"
          border="border-status-ok/40"
          bg="bg-status-ok/5"
        />
        <ConceptCard
          icon="layers"
          title="Cumulative Viewshed"
          subtitle="כיסוי קולקטיבי"
          body="עשרות-מאות נקודות תצפית מקובצות לכדי 'מפת צפיפות'. אזורים בהירים = מכוסים היטב. אזורים חשוכים = עיוורון מודיעיני. בדיוק הניתוח שעושים כשמתכננים פריסת מצלמות וחיישנים לאורך גבול."
          color="text-accent-cool"
          border="border-accent-cool/40"
          bg="bg-accent-cool/5"
        />
        <ConceptCard
          icon="compass"
          title="Least-Cost Path"
          subtitle="מסלול בעלות מינימלית"
          body="מודל הזרימה: מחשב את הנתיב הפיזי הקל והחסכוני ביותר באנרגיה, שעוקף רכסים תלולים ונצמד לשטחים מתים. השילוב Viewshed + LCP = מסלול חדירה שלא רואים אותו, וגם לא מתאמצים בו."
          color="text-accent"
          border="border-accent/40"
          bg="bg-accent/5"
        />
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
    <div className="aspect-[22/13] relative">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
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
                  'font-mono font-bold',
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

function ConceptCard({
  icon,
  title,
  subtitle,
  body,
  color,
  border,
  bg,
}: {
  icon: 'eye' | 'layers' | 'compass';
  title: string;
  subtitle: string;
  body: string;
  color: string;
  border: string;
  bg: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      className={cn('surface p-5 rounded-xl', border, bg)}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('size-10 rounded-xl flex items-center justify-center border-2', border)}>
          <Icon name={icon} size={18} className={color} />
        </div>
        <div>
          <div className={cn('font-display font-bold leading-tight', color)}>{title}</div>
          <div className="text-[10px] font-mono text-fg-dim mt-0.5">{subtitle}</div>
        </div>
      </div>
      <p className="text-xs text-fg leading-relaxed">{body}</p>
    </motion.div>
  );
}

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-xs font-mono text-fg-dim tracking-widest uppercase">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
