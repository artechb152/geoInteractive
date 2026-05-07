'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Checkpoint = {
  id: string;
  label: string;
  feature: string;
  icon: IconName;
};

const CHECKPOINTS: Checkpoint[] = [
  { id: '1', label: 'נקודה 1', feature: 'יוצאים מהבסיס · קשת חדה לכיוון מזרח',  icon: 'flag' },
  { id: '2', label: 'נקודה 2', feature: 'מגיעים לפיתול בנחל · עוברים אותו ימינה', icon: 'wave' },
  { id: '3', label: 'נקודה 3', feature: 'עוקפים את הגבעה משמאל · רואים תורן', icon: 'mountain' },
  { id: '4', label: 'נקודה 4', feature: 'חוצים דרך עפר · ממשיכים ישר 600 מ׳', icon: 'truck' },
  { id: '5', label: 'יעד', feature: 'מגיעים לקפל קרקע מסומן · מאמתים ועוצרים', icon: 'target' },
];

export function PlanningScene() {
  return (
    <section id="scene-planning" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="03.2"
        eyebrow="תכנון ציר תנועה"
        title={
          <>
            <span className="gradient-text">סיפור דרך</span> · המסלול שכותבים מראש
          </>
        }
        intro="לפני שיוצאים לשטח, מכינים תוכנית מסלול מפורטת — מין 'תסריט' של מה צריך לראות בכל קטע. ככה גם אם הדרך קשה, אתה לא מאבד את החוט."
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">למה לכתוב את זה מראש?</strong>{' '}
            כי בלילה, בלחץ קרבי, או אחרי שעות הליכה — המוח שלך כבר לא חושב טוב.
            "סיפור דרך" כתוב מראש מאפשר לך פשוט לעקוב — בלי לחשוב יותר מדי. זה מציל חיים.
          </div>
        </div>
      </div>

      <RouteStoryBuilder />

      <div className="my-12">
        <PacingDemo />
      </div>

      <ConclusionCard />
    </section>
  );
}

function RouteStoryBuilder() {
  const [active, setActive] = useState(0);

  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch">
      <div className="surface-elevated relative overflow-hidden">
        <RouteMap activeStep={active} />
      </div>

      <div className="space-y-3">
        <div className="text-[10px] font-mono text-fg-dim mb-1 tracking-widest uppercase">
          המסלול ב-5 נקודות אימות
        </div>
        {CHECKPOINTS.map((c, i) => {
          const isActive = active === i;
          const passed = active > i;
          return (
            <motion.button
              key={c.id}
              onClick={() => setActive(i)}
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'w-full surface p-4 text-right transition-all flex items-start gap-3 relative overflow-hidden',
                isActive ? 'border-accent shadow-glow bg-accent/5' : 'hover:border-border-strong',
                passed && !isActive && 'opacity-80'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="t3-route-bar"
                  className="absolute inset-y-0 end-0 w-1 bg-accent rounded-l-full"
                />
              )}
              <span
                className={cn(
                  'size-8 rounded-lg flex items-center justify-center shrink-0 transition-all',
                  isActive ? 'bg-accent text-bg shadow-glow' : passed ? 'bg-status-ok/15 text-status-ok' : 'bg-bg-accent text-fg-muted'
                )}
              >
                {passed && !isActive ? (
                  <Icon name="check" size={14} strokeWidth={2.5} />
                ) : (
                  <span className="font-mono text-xs font-bold">{i + 1}</span>
                )}
              </span>
              <div className="flex-1 min-w-0 text-right">
                <div className={cn('text-sm font-medium leading-tight', isActive && 'text-accent')}>
                  {c.label}
                </div>
                <div className="text-xs text-fg-muted mt-0.5 leading-relaxed">{c.feature}</div>
              </div>
              <Icon name={c.icon} size={18} className={cn('shrink-0 mt-0.5', isActive ? 'text-accent' : 'text-fg-dim')} />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function RouteMap({ activeStep }: { activeStep: number }) {
  // 5 checkpoints positioned on a path
  const POINTS = [
    { x: 12, y: 60 }, // start
    { x: 28, y: 50 }, // river bend
    { x: 48, y: 38 }, // hill
    { x: 68, y: 32 }, // road
    { x: 88, y: 22 }, // target
  ];

  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="none">
        <rect x="0" y="0" width="100" height="75" className="fill-bg" />

        {/* Grid */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={'gx' + i} x1={i * 10} y1="0" x2={i * 10} y2="75" className="stroke-border-subtle" strokeWidth="0.08" />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={'gy' + i} x1="0" y1={i * 9.4} x2="100" y2={i * 9.4} className="stroke-border-subtle" strokeWidth="0.08" />
        ))}

        {/* River (passes near point 2) */}
        <path d="M0 55 Q 28 50 50 55 T 100 60" fill="none" className="stroke-terrain-sky/60" strokeWidth="1.4" />

        {/* Hill (near point 3) */}
        <path d="M40 42 L48 28 L56 42 Z" className="fill-terrain-ridge/40 stroke-terrain-ridge/80" strokeWidth="0.3" />

        {/* Dirt road (near point 4) */}
        <path d="M55 35 Q 70 30 85 25" fill="none" className="stroke-terrain-sand/70" strokeWidth="0.7" strokeDasharray="1.5 0.8" />

        {/* Tower (near point 3) */}
        <line x1="44" y1="34" x2="44" y2="28" className="stroke-fg-muted" strokeWidth="0.4" />
        <circle cx="44" cy="28" r="0.6" className="fill-accent" />

        {/* Path connecting all points */}
        <motion.path
          d={POINTS.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')}
          fill="none"
          className="stroke-accent/40"
          strokeWidth="0.5"
          strokeDasharray="1.2 1"
        />

        {/* Active leg highlight */}
        {activeStep > 0 && (
          <motion.path
            initial={false}
            d={POINTS.slice(0, activeStep + 1).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')}
            fill="none"
            className="stroke-accent"
            strokeWidth="0.7"
          />
        )}

        {/* Checkpoints */}
        {POINTS.map((p, i) => {
          const isActive = i === activeStep;
          const isPassed = i < activeStep;
          return (
            <g key={i}>
              {isActive && (
                <circle cx={p.x} cy={p.y} r="4" fill="none" className="stroke-accent">
                  <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r="2"
                className={cn(
                  isActive ? 'fill-accent' : isPassed ? 'fill-status-ok' : 'fill-bg-card stroke-border-strong'
                )}
                strokeWidth={isActive || isPassed ? 0 : 0.4}
              />
              <text
                x={p.x}
                y={p.y - 3.5}
                textAnchor="middle"
                className={cn('text-[2.5px] font-mono font-bold', isActive ? 'fill-accent' : isPassed ? 'fill-status-ok' : 'fill-fg-muted')}
              >
                {i === 4 ? 'B' : i + 1}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        סיפור דרך · 5 נקודות אימות
      </div>
    </div>
  );
}

function PacingDemo() {
  const [meters, setMeters] = useState(500);
  const stepLength = 1.5; // average soldier double-step length in meters
  const pairs = Math.round(meters / stepLength);

  // Convert to "ספירת צעדים" — Israeli typical: count pairs (one count per 2 steps)
  return (
    <div className="surface-elevated p-6 sm:p-8">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-1">ספירת צעדים — איך מודדים מרחק בלי GPS</h3>
        <p className="text-fg-muted text-sm">
          הטכניקה הכי פשוטה ופשוטה: סופרים כל זוג צעדים. מכפילים באורך של זוג שלך — וזה המרחק. גרור את הסרגל וראה כמה צעדים זה.
        </p>
      </div>

      <div className="grid md:grid-cols-[1.2fr_1fr] gap-6 items-stretch">
        <div>
          <div className="surface-elevated p-5">
            <div className="text-[10px] font-mono text-fg-dim mb-1 tracking-widest uppercase">
              מרחק שצריך לעבור
            </div>
            <div className="font-display font-bold text-5xl tabular-nums mb-3">
              {meters}
              <span className="text-2xl text-fg-muted ms-1">מ׳</span>
            </div>

            <input
              type="range"
              min={50}
              max={2000}
              step={50}
              value={meters}
              onChange={(e) => setMeters(Number(e.target.value))}
              className="w-full accent-accent"
              aria-label="מרחק במטרים"
            />
            <div className="flex justify-between text-[10px] font-mono text-fg-dim mt-1">
              <span>50</span>
              <span>500</span>
              <span>1,000</span>
              <span>2,000 מ׳</span>
            </div>
          </div>

          <div className="surface p-5 mt-3 border-r-4 border-r-accent">
            <div className="text-[10px] font-mono text-accent mb-1 tracking-widest uppercase">
              כמה זוגות צעדים תספור
            </div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-display font-bold text-4xl tabular-nums text-accent">
                {pairs.toLocaleString('he-IL')}
              </span>
              <span className="text-fg-muted text-sm">זוגות צעדים</span>
            </div>
            <div className="text-xs text-fg-dim font-mono">
              {meters} מ׳ ÷ {stepLength} מ׳ לזוג = {pairs} זוגות
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="surface p-5">
            <div className="text-[10px] font-mono text-fg-dim mb-2 tracking-widest uppercase">
              איך עושים את זה בפועל
            </div>
            <ol className="space-y-2.5 text-sm text-fg-muted">
              <li className="flex gap-3">
                <span className="size-6 rounded-lg bg-bg-accent text-fg-muted text-xs font-mono flex items-center justify-center shrink-0">1</span>
                <span>מודדים מראש כמה אורך זוג הצעדים שלך (בדרך כלל 1.4–1.6 מ׳).</span>
              </li>
              <li className="flex gap-3">
                <span className="size-6 rounded-lg bg-bg-accent text-fg-muted text-xs font-mono flex items-center justify-center shrink-0">2</span>
                <span>בעת ההליכה, סופרים בראש כל פעם שרגל ימין יורדת לקרקע (= זוג שלם).</span>
              </li>
              <li className="flex gap-3">
                <span className="size-6 rounded-lg bg-bg-accent text-fg-muted text-xs font-mono flex items-center justify-center shrink-0">3</span>
                <span>שומרים את הספירה במחשבון פיזי, בקשר עם מספרים, או בחבל עם קשרים.</span>
              </li>
              <li className="flex gap-3">
                <span className="size-6 rounded-lg bg-bg-accent text-fg-muted text-xs font-mono flex items-center justify-center shrink-0">4</span>
                <span>כשהגעת לזוג היעד — נעצרים, מאמתים את הסביבה. זה המקום.</span>
              </li>
            </ol>
          </div>

          <div className="surface p-4 border-r-4 border-r-status-warn flex gap-3 items-start">
            <Icon name="spark" size={18} className="text-status-warn shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="text-fg">חשוב:</strong> אורך הצעד משתנה לפי השטח. עלייה בהר = צעד קצר יותר. ירידה = ארוך יותר.
              נווט טוב יודע לכייל את הספירה לפי השטח.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConclusionCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="surface-elevated p-6 border-r-4 border-r-accent flex gap-4 items-start"
    >
      <Icon name="spark" size={22} className="text-accent shrink-0 mt-0.5" />
      <div>
        <div className="text-[10px] font-mono text-accent mb-1 tracking-widest uppercase">
          סיכום העיקרון
        </div>
        <p className="text-fg leading-relaxed text-pretty">
          תכנון ציר זה לא רק "לסמן קו במפה". זה לבנות סיפור — סדרה של דברים שאני אמור לראות, אחד אחרי השני.
          ולבדוק תוך כדי הליכה: סופרים צעדים, מסמנים נקודות אימות, מאמתים שכל פרט תואם לתוכנית.
          ככה — גם אם פתאום אין GPS, או חושך, או לחץ — <strong className="text-fg">המסלול עצמו מנחה אותי הביתה</strong>.
        </p>
      </div>
    </motion.div>
  );
}
