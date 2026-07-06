'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Platform = {
  id: string;
  label: string;
  english: string;
  icon: IconName;
  minAlt: number; // meters
  maxAlt: number;
  defaultAlt: number;
  manpadsRisk: boolean; // exposed below 5000m
  desc: string;
};

const PLATFORMS: Platform[] = [
  {
    id: 'helo',
    label: 'מסוק תקיפה',
    english: 'Attack Helicopter',
    icon: 'plane',
    minAlt: 100,
    maxAlt: 3000,
    defaultAlt: 800,
    manpadsRisk: true,
    desc: 'מסוקים כמו ה"אפאצ\'י". מספקים כוח אש מדויק וקטלני, אבל טסים נמוך מאוד. זה אומר שהם מטרה קלה יחסית לטילי כתף (MANPADS) ולנשק קל שיורה מהקרקע.',
  },
  {
    id: 'mini-uav',
    label: 'מל"ט טקטי',
    english: 'Tactical UAV',
    icon: 'plane',
    minAlt: 1500,
    maxAlt: 5500,
    defaultAlt: 4000,
    manpadsRisk: true,
    desc: 'רחפנים ומל"טים קטנים (כמו "רוכב שמיים" ו"זיק"). משמשים לאיסוף מודיעין ותקיפה ממוקדת. הם טסים בגובה בינוני, ולכן עדיין נמצאים בסכנת פגיעה אם האויב מצויד היטב.',
  },
  {
    id: 'male-uav',
    label: 'מל"ט אסטרטגי',
    english: 'MALE UAV',
    icon: 'plane',
    minAlt: 5000,
    maxAlt: 9000,
    defaultAlt: 7500,
    manpadsRisk: false,
    desc: 'מל"טים ענקיים (כמו "כוכב" ו"שובל"). יכולים לטוס שעות ארוכות, לרוב מעל גובה העננים. מכיוון שהם טסים גבוה, רק מערכות נ"מ כבדות וארוכות טווח (SAM) יכולות לאיים עליהם.',
  },
  {
    id: 'fighter',
    label: 'מטוס קרב',
    english: 'Fighter Jet',
    icon: 'plane',
    minAlt: 3000,
    maxAlt: 12000,
    defaultAlt: 9000,
    manpadsRisk: false,
    desc: 'מטוסי קרב (כמו F-16 ו-F-35). מציעים מהירות עצומה ותקיפה עוצמתית, אבל הפעלתם יקרה מאוד וזמן השהייה שלהם באוויר (מעל המטרה) מוגבל מאוד בהשוואה למל"ט.',
  },
  {
    id: 'satellite',
    label: 'לוויין LEO',
    english: 'LEO Satellite',
    icon: 'satellite',
    minAlt: 11000,
    maxAlt: 12000,
    defaultAlt: 11500,
    manpadsRisk: false,
    desc: 'משייטים בחלל הרחק מכל סכנה, בגבהים של מאות קילומטרים. הבעיה: הם נעים במסלול קבוע סביב כדור הארץ, ולכן אפשר להשתמש בהם ולצלם רק כשהם חולפים בדיוק מעלינו לכמה רגעים.',
  },
  {
    id: 'balloon',
    label: 'בלון תצפית',
    english: 'Aerostat',
    icon: 'pyramid',
    minAlt: 2000,
    maxAlt: 4500,
    defaultAlt: 3500,
    manpadsRisk: true,
    desc: 'בלוני תצפית עצומים (כמו "טל שמיים"). מספקים תצפית רצופה 24/7 וזולים מאוד להפעלה. החיסרון: הם קשורים לקרקע, מה שהופך אותם למטרה קלה, והם עלולים להיקרע או לצאת מכלל שימוש בסופות ורוחות עזות.',
  },
];

const SCALE_MAX = 12000;

export function PlatformsScene() {
  const [ceiling, setCeiling] = useState(4500);
  const [scenario, setScenario] = useState<'all-weather' | 'covert' | 'precision' | 'persistent'>('all-weather');

  const recommendations: Record<typeof scenario, { ids: string[]; rationale: string }> = {
    'all-weather': {
      ids: ['satellite', 'male-uav'],
      rationale: 'כשמזג האוויר סוער ובלתי צפוי, נצטרך כלים שיכולים לשייט בביטחה הרבה מעל העננים, הרחק מסכנת טילי הכתף של האויב.',
    },
    covert: {
      ids: ['satellite', 'male-uav'],
      rationale: 'כשהמטרה היא לרגל ולאסוף מודיעין בלי להתגלות. נשתמש בכלים שקטים שטסים גבוה מאוד, כך שהאויב למטה לא יוכל לשמוע אותם או לזהות אותם בעין.',
    },
    precision: {
      ids: ['fighter', 'helo'],
      rationale: 'כשיש צורך להשמיד מטרות כבדות ומשוריינות. מטוסי קרב יטילו פצצות כבדות ומדויקות, ומסוקים יספקו סיוע אש קטלני וצמוד לכוחות הקרקע שלנו.',
    },
    persistent: {
      ids: ['balloon', 'male-uav'],
      rationale: 'כשצריך "עיניים בשמיים" בלי הפסקה מעל תא שטח מסוים. בלוני תצפית ומל"טים ענקיים יכולים לשהות באוויר שעות (ואפילו ימים) ברצף, והעלות שלהם נמוכה יחסית.',
    },
  };

  return (
    <section id="scene-platforms" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="07.3"
        eyebrow="תקרת ענן ובחירת פלטפורמה"
title = {
  <>
    <span className="text-accent-hover">גובה העננים</span> קובע מי בכלל יכול לפעול
  </>
}
        intro="עננים נמוכים יכולים להפוך מטוסי קרב מתקדמים ויקרים לכלים חסרי תועלת שכמעט ולא רואים כלום. שחקו עם גובה העננים, ותראו אילו כלי טיס נשארים בטוחים מעליהם, ואילו חייבים לרדת מתחתיהם ולסכן את עצמם באש האויב רק כדי לראות את המטרה."
      />

      <div className="grid md:grid-cols-2 gap-4 mb-12 items-stretch">
        <div className="surface-elevated p-5 rounded-[4px]">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-accent mb-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            המושג
          </div>
          <h3 className="font-display font-bold text-lg leading-tight text-accent-hover mb-2">
            תקרת ענן · Cloud Ceiling
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            קו הגובה שבו מתחילים להופיע עננים שמסתירים את הקרקע. מתחת לקו הזה רואים את המטרות, מעליו רואים שמיים ותו לא — לכן הוא <strong className="text-fg">קובע אילו כלי טיס בכלל יכולים לעבוד באותו יום</strong>.
          </p>
        </div>
        <div className="surface-elevated p-5 rounded-[4px]">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-accent mb-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            הדילמה
          </div>
          <h3 className="font-display font-bold text-lg leading-tight text-accent-hover mb-2">
            גבוה ועיוור או נמוך וחשוף?
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            <strong className="text-fg">מתחת</strong> לעננים — רואים את המטרה, אבל חשופים ל-<strong className="text-fg">MANPADS</strong> (טילי כתף עד 5 ק"מ). <strong className="text-fg">מעל</strong> לעננים — מוגנים, אבל המצלמות עיוורות. כל מפקד נאלץ להכריע.
          </p>
        </div>
      </div>

      {/* Main visualization */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start mb-12">
        <div className="surface-elevated p-4 rounded-[4px]">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <div className="text-[10px] font-display font-semibold text-fg-muted tracking-[0.2em] uppercase">Altitude Profile</div>
              <div className="text-base font-display font-bold leading-tight text-fg">חתך אנכי · קרקע עד 12 ק"מ</div>
            </div>
            <div className="text-end">
              <div className="text-[10px] font-display font-semibold text-fg-muted tracking-wider">תקרת ענן נוכחית</div>
              <div className="font-display font-bold text-base tabular-nums text-accent leading-none">
                {ceiling.toLocaleString()}<span className="text-xs text-fg-muted ms-1">מ׳</span>
              </div>
            </div>
          </div>

          <AltitudeMap ceiling={ceiling} platforms={PLATFORMS} />

          <p className="mt-3 text-xs text-fg-muted leading-relaxed text-pretty">
            הקו הכתום = <strong className="text-fg">תקרת הענן</strong>. כלים שנשארים{' '}
            <strong className="text-status-ok">מעליו</strong> מוגנים — אבל לא רואים את הקרקע.
            כלים שחייבים לצלול <strong className="text-status-warn">מתחתיו</strong> רואים את המטרה — אבל נחשפים לאש מהקרקע.
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <div className="surface-elevated p-5 rounded-[4px]">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">
              גובה תקרת ענן
            </div>
            <div className="font-display font-bold text-3xl tabular-nums text-accent mb-3">
              {ceiling.toLocaleString()}<span className="text-sm text-fg-muted ms-1">מ׳</span>
            </div>
            <input
              type="range"
              min={300}
              max={11000}
              step={100}
              value={ceiling}
              onChange={(e) => setCeiling(Number(e.target.value))}
              className="w-full accent-accent"
              aria-label="גובה תקרת ענן"
            />
            <div className="flex justify-between text-[10px] font-display font-medium tracking-wide text-fg-dim mt-1">
              <span>300</span>
              <span>3,000</span>
              <span>7,000</span>
              <span>11,000</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
              {[
                { label: 'מונסון', alt: 300, color: 'text-status-danger' },
                { label: 'חורף ים-תיכוני', alt: 2500, color: 'text-status-warn' },
                { label: 'קיץ נקי', alt: 8000, color: 'text-status-ok' },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => setCeiling(p.alt)}
                  className={cn('px-2 py-1.5 rounded-md border border-border hover:border-border-strong', p.color)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Legend — colour = threat status of each platform */}
          <div className="surface p-4 rounded-[3px] border border-border">
            <div className="text-[11px] font-display font-semibold text-fg-muted tracking-[0.15em] uppercase mb-2.5">מקרא · מצב הפלטפורמה</div>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2.5">
                <span className="size-2.5 rounded-full bg-status-ok ring-2 ring-status-ok/25 shrink-0" />
                <span className="text-fg"><strong className="font-semibold">מעל תקרת הענן</strong> · מוגן, אך עיוור לקרקע</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="size-2.5 rounded-full bg-status-warn ring-2 ring-status-warn/25 shrink-0" />
                <span className="text-fg"><strong className="font-semibold">מתחת לעננים</strong> · רואה, ובטוח מ-MANPADS</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="size-2.5 rounded-full bg-status-danger ring-2 ring-status-danger/25 shrink-0" />
                <span className="text-fg"><strong className="font-semibold">בטווח MANPADS</strong> · חשוף לטילי כתף (עד 5 ק"מ)</span>
              </li>
            </ul>
          </div>

          <div className="surface p-3 rounded-[3px] text-xs text-fg-muted bg-bg-accent/30 border border-border">
            <strong className="text-fg block mb-1">תנסו בעצמכם:</strong>
            הורידו את תקרת העננים ל-1,500 מטרים (מצב טיפוסי לחורף בישראל). שימו לב כמה כלי טיס מוגנים נשארים מעל העננים, וכמה מהם נאלצים לצלול פנימה כדי לראות משהו – ובכך להפוך למטרה קלה לאויב.
          </div>
        </div>
      </div>

      <SoftDivider text="מטריצת החלטה · איזו פלטפורמה לאיזו משימה" />

      {/* Scenario selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {[
          { id: 'all-weather', label: 'כל מזג אוויר', english: 'All-Weather', icon: 'wave' as IconName },
          { id: 'covert', label: 'חשאיות', english: 'Covert', icon: 'eye' as IconName },
          { id: 'precision', label: 'תקיפה מדויקת', english: 'Precision', icon: 'crosshair' as IconName },
          { id: 'persistent', label: 'כיסוי רציף', english: 'Persistent', icon: 'clock' as IconName },
        ].map((sc) => {
          const isActive = scenario === sc.id;
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => setScenario(sc.id as typeof scenario)}
              className={cn(
                'surface p-3 text-right transition-all rounded-[3px] flex items-center gap-2.5 relative overflow-hidden',
                isActive
                  ? 'border-accent bg-bg-elevated'
                  : 'border-border bg-bg-elevated hover:border-accent/50'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="t7-scenario-bar"
                  className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
                />
              )}
              <span
                className={cn(
                  'size-10 rounded-[3px] flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                  isActive
                    ? 'bg-accent text-bg-elevated border-accent'
                    : 'bg-bg-accent text-fg-muted border-border'
                )}
              >
                <Icon name={sc.icon} size={18} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <div className="font-display font-bold text-base text-fg leading-tight">
                  {sc.label}
                </div>
                <div className="font-display font-medium tracking-wide text-[10px] text-fg-dim mt-0.5">
                  {sc.english}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={scenario}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="surface-elevated p-5 rounded-[4px]"
        >
          <p className="text-sm text-fg-muted leading-relaxed mb-4">{recommendations[scenario].rationale}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {PLATFORMS.map((p) => {
              const isRecommended = recommendations[scenario].ids.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={cn(
                    'surface p-3 rounded-[3px] flex items-start gap-3 transition-all',
                    isRecommended
                      ? 'border-status-ok/50 bg-status-ok/5'
                      : 'opacity-50'
                  )}
                >
                  <Icon name={p.icon} size={28} className={cn('shrink-0', isRecommended ? 'text-status-ok' : 'text-fg-dim')} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className={cn('font-display font-bold leading-tight', isRecommended && 'text-status-ok')}>
                        {p.label}
                      </div>
                      {isRecommended && (
                        <Icon name="check" size={12} strokeWidth={3} className="text-status-ok" />
                      )}
                    </div>
                    <div className="text-[10px] font-display font-medium tracking-wide text-fg-dim mb-1">
                      {p.english} · {(p.minAlt / 1000).toFixed(1)}–{(p.maxAlt / 1000).toFixed(1)} ק"מ
                    </div>
                    <p className="text-xs text-fg-muted leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function AltitudeMap({ ceiling, platforms }: { ceiling: number; platforms: Platform[] }) {
  const reduce = useReducedMotion();

  // ── Board geometry ──────────────────────────────────────────────────────
  // viewBox 0 0 100 125 rendered with `xMidYMid meet` (never `none`) so the
  // whole drawing scales UNIFORMLY at every width — glyphs and text are never
  // stretched. The left gutter (x 0–23) carries the km axis + the ceiling
  // read-out; the platform lane lives at x 30–90 so labels never collide.
  const GROUND_Y = 114;
  const TOP_Y = 12; // 12 km at the top of the plot
  const AXIS_X = 20;
  const PLOT_X0 = 23;
  const PLOT_X1 = 98;
  const altToY = (alt: number) => GROUND_Y - (alt / SCALE_MAX) * (GROUND_Y - TOP_Y);
  const ceilingY = altToY(ceiling);
  const manpadsY = altToY(5000);

  // Short, unambiguous names for the baseline row (full names live in the matrix).
  const SHORT: Record<string, string> = {
    helo: 'מסוק',
    balloon: 'בלון',
    'mini-uav': 'מל"ט טקטי',
    'male-uav': 'מל"ט כבד',
    fighter: 'מטוס קרב',
    satellite: 'לוויין',
  };

  // Low → high so each platform owns its own column and the eye reads a rising
  // altitude staircase. Columns are spread evenly across the lane.
  const ordered = [...platforms].sort((a, b) => a.defaultAlt - b.defaultAlt);
  const LANE0 = 30;
  const LANE1 = 90;
  const colX = (i: number) => LANE0 + (i * (LANE1 - LANE0)) / (ordered.length - 1);

  // White halo — required on every SVG label so it stays readable on any fill.
  const halo = {
    paintOrder: 'stroke' as const,
    stroke: '#ffffff',
    strokeWidth: 0.8,
    strokeLinejoin: 'round' as const,
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  };

  return (
    <div className="aspect-[4/5] relative rounded-[4px] overflow-hidden ring-1 ring-black/5">
      <svg viewBox="0 0 100 125" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
        <defs>
          <filter id="cloudBlur7" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.5" />
          </filter>
          <filter id="platformShadow7" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.35" />
            <feOffset dy="0.35" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id="manpadsHatch7" patternUnits="userSpaceOnUse" width="2.4" height="2.4" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="2.4" className="stroke-status-danger" strokeWidth="0.18" opacity="0.4" />
          </pattern>
          {/* Sky → horizon. Stops are existing palette values (terrain-steel /
              terrain-sky / bg-accent / bg) used as a gradient — no new hues. */}
          <linearGradient id="sky7" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a5663" stopOpacity="0.92" />
            <stop offset="0.26" stopColor="#3d6b8e" stopOpacity="0.7" />
            <stop offset="0.58" stopColor="#F5EDDE" stopOpacity="0.85" />
            <stop offset="1" stopColor="#FFFBF7" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Atmosphere: space (cool, high) → warm cream horizon (low) */}
        <rect x="0" y="0" width="100" height={GROUND_Y} fill="url(#sky7)" />

        {/* A few faint stars, high up only — hints "near space" without clutter */}
        {[
          { x: 27, y: 6 }, { x: 41, y: 10 }, { x: 55, y: 5 },
          { x: 70, y: 12 }, { x: 84, y: 7 }, { x: 93, y: 15 },
        ].map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={i % 2 ? 0.28 : 0.4} fill="#ffffff" opacity="0.5" />
        ))}

        {/* MANPADS threat band (0–5 km) — red wash + hatch + boundary line */}
        <rect x={PLOT_X0} y={manpadsY} width={PLOT_X1 - PLOT_X0} height={GROUND_Y - manpadsY} className="fill-status-danger" opacity="0.13" />
        <rect x={PLOT_X0} y={manpadsY} width={PLOT_X1 - PLOT_X0} height={GROUND_Y - manpadsY} fill="url(#manpadsHatch7)" />
        <line x1={PLOT_X0} y1={manpadsY} x2={PLOT_X1} y2={manpadsY} className="stroke-status-danger" strokeWidth="0.3" strokeDasharray="1.2 0.8" opacity="0.7" />

        {/* Altitude axis (km) */}
        <line x1={AXIS_X} y1={altToY(0)} x2={AXIS_X} y2={altToY(12000)} className="stroke-fg" strokeOpacity="0.35" strokeWidth="0.3" />
        {[0, 3000, 6000, 9000, 12000].map((alt) => {
          const y = altToY(alt);
          return (
            <g key={alt}>
              <line x1={AXIS_X - 1.2} y1={y} x2={AXIS_X} y2={y} className="stroke-fg" strokeOpacity="0.55" strokeWidth="0.32" />
              <text x={AXIS_X - 2} y={y + 0.85} textAnchor="end" fontSize="2.5" fontWeight="700" className="fill-fg" {...halo}>
                {alt / 1000}
              </text>
            </g>
          );
        })}
        <text x={AXIS_X - 2} y={altToY(12000) - 2.4} textAnchor="end" fontSize="2" fontWeight="700" className="fill-fg-muted" {...halo}>
          ק&quot;מ
        </text>

        {/* Platform stems — faint altitude guides, drawn under everything */}
        {ordered.map((p, i) => {
          const x = colX(i);
          const gy = altToY(p.defaultAlt);
          return (
            <line
              key={`stem-${p.id}`}
              x1={x}
              y1={GROUND_Y}
              x2={x}
              y2={gy + 2}
              className="stroke-fg"
              strokeOpacity="0.16"
              strokeWidth="0.35"
              strokeDasharray="0.6 0.7"
            />
          );
        })}

        {/* Ground / terrain baseline */}
        <path
          d={`M 0 ${GROUND_Y} Q 26 ${GROUND_Y - 1.6} 50 ${GROUND_Y - 0.6} Q 76 ${GROUND_Y - 1.5} 100 ${GROUND_Y - 0.4} L 100 ${GROUND_Y} Z`}
          className="fill-terrain-olive"
          opacity="0.5"
        />
        <rect x="0" y={GROUND_Y} width="100" height={125 - GROUND_Y} className="fill-terrain-olive" />
        <rect x="0" y={GROUND_Y} width="100" height="0.4" className="fill-fg" opacity="0.3" />

        {/* Ground objective — what the sensors overhead are trying to see */}
        <g transform={`translate(60 ${GROUND_Y - 1.5})`}>
          <circle r="2.1" className="fill-none stroke-fg" strokeWidth="0.35" opacity="0.55" />
          <circle r="0.7" className="fill-fg" opacity="0.55" />
          <line x1="-3" y1="0" x2="-2.4" y2="0" className="stroke-fg" strokeWidth="0.35" opacity="0.55" />
          <line x1="2.4" y1="0" x2="3" y2="0" className="stroke-fg" strokeWidth="0.35" opacity="0.55" />
          <line x1="0" y1="-3" x2="0" y2="-2.4" className="stroke-fg" strokeWidth="0.35" opacity="0.55" />
        </g>

        {/* Cloud ceiling — the hero. Cloud band, line, axis marker and read-out
            are one group so they animate together to the ceiling height. Drawn
            BEFORE the platforms so a glyph just above the line is never hidden. */}
        <motion.g
          initial={false}
          animate={{ y: ceilingY }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 80, damping: 18 }}
        >
          {/* Connector: axis marker → cloud line, both at the ceiling height */}
          <line x1={AXIS_X} y1="0" x2={PLOT_X0} y2="0" className="stroke-accent" strokeWidth="0.35" strokeDasharray="0.8 0.6" opacity="0.8" />

          {/* Cloud band (its base = the ceiling line) */}
          <g filter="url(#cloudBlur7)">
            {[31, 42, 52, 63, 74, 85, 95].map((cx, i) => (
              <ellipse key={`cb-${cx}`} cx={cx} cy={-1.3 - (i % 2) * 0.5} rx={6 + (i % 3)} ry="2.3" className="fill-bg-elevated" opacity="0.72" />
            ))}
            {[29, 38, 47, 58, 70, 82, 93].map((cx) => (
              <ellipse key={`cm-${cx}`} cx={cx} cy="-0.5" rx="4.4" ry="1.7" className="fill-bg-accent" opacity="0.95" />
            ))}
            {[30, 46, 62, 78, 90].map((cx, i) => (
              <ellipse key={`cf-${cx}`} cx={cx} cy={-1.9 + (i % 2) * 0.4} rx="2.7" ry="1.15" className="fill-bg-elevated" opacity="0.9" />
            ))}
          </g>

          {/* Ceiling line — white underlay + accent dash so it reads over clouds */}
          <line x1={PLOT_X0} y1="0" x2={PLOT_X1} y2="0" stroke="#ffffff" strokeWidth="1.1" opacity="0.7" />
          <line x1={PLOT_X0} y1="0" x2={PLOT_X1} y2="0" className="stroke-accent" strokeWidth="0.6" strokeDasharray="1.6 1" />

          {/* Axis intersection marker — the moving height marker */}
          <circle cx={AXIS_X} cy="0" r="1.55" fill="#ffffff" opacity="0.9" />
          <circle cx={AXIS_X} cy="0" r="1.05" className="fill-accent" />

          {/* Ceiling read-out pill — far-left gutter lane, clear of the axis numbers */}
          <rect x="0.4" y="-3.5" width="12.2" height="7" rx="1.6" className="fill-bg-elevated stroke-accent" strokeWidth="0.4" />
          <text x="6.5" y="-1" textAnchor="middle" fontSize="2" fontWeight="700" className="fill-accent" {...halo}>תקרת ענן</text>
          <text x="6.5" y="2.15" textAnchor="middle" fontSize="2.55" fontWeight="800" className="fill-fg" {...halo}>{ceiling.toLocaleString()} מ׳</text>
        </motion.g>

        {/* Platforms — glyph + altitude tag + baseline name (on top of clouds) */}
        {ordered.map((p, i) => {
          const x = colX(i);
          const gy = altToY(p.defaultAlt);
          const aboveCeiling = p.defaultAlt > ceiling;
          const inManpads = p.defaultAlt <= 5000;
          const statusClass = aboveCeiling ? 'text-status-ok' : inManpads ? 'text-status-danger' : 'text-status-warn';
          const name = SHORT[p.id] ?? p.label;
          const parts = name.split(' ');
          return (
            <g key={p.id}>
              <g filter="url(#platformShadow7)" className={statusClass}>
                <PlatformGlyph type={p.id} x={x} y={gy} scale={1.25} />
              </g>
              {/* Altitude tag on the stem, below the glyph */}
              <text x={x} y={gy + 4.8} textAnchor="middle" fontSize="2.1" fontWeight="700" className="fill-fg" {...halo}>
                {(p.defaultAlt / 1000).toFixed(1)} ק&quot;מ
              </text>
              {/* Name on a shared baseline row — never overlaps between columns */}
              {parts.length > 1 ? (
                <>
                  <text x={x} y={119.6} textAnchor="middle" fontSize="2.3" fontWeight="700" className="fill-fg" {...halo}>{parts[0]}</text>
                  <text x={x} y={122.6} textAnchor="middle" fontSize="2.3" fontWeight="700" className="fill-fg" {...halo}>{parts.slice(1).join(' ')}</text>
                </>
              ) : (
                <text x={x} y={121} textAnchor="middle" fontSize="2.4" fontWeight="700" className="fill-fg" {...halo}>{name}</text>
              )}
            </g>
          );
        })}

        {/* MANPADS threat label — drawn last so a low cloud band never covers it.
            Centered in the empty low strip; textAnchor="middle" avoids the RTL/bidi
            reordering that pushes an "end"-anchored mixed string past the edge. */}
        <text x={75} y={GROUND_Y - 5.8} textAnchor="middle" fontSize="2.1" fontWeight="700" className="fill-status-danger" {...halo}>
          טווח טילי כתף
        </text>
        <text x={75} y={GROUND_Y - 2.9} textAnchor="middle" fontSize="2" fontWeight="600" className="fill-fg-muted" {...halo}>
          MANPADS · עד 5 ק&quot;מ
        </text>
      </svg>
    </div>
  );
}

// Custom platform glyphs — small but recognisable silhouettes.
// `currentColor` resolves to the parent `<g>`'s text-color class, so the same
// glyph drawing is recoloured by the status (status-ok / status-warn / status-danger).
function PlatformGlyph({ type, x, y, scale = 1 }: { type: string; x: number; y: number; scale?: number }) {
  const sw = 0.28;
  const t = `translate(${x} ${y}) scale(${scale})`;

  if (type === 'helo') {
    return (
      <g transform={t}>
        {/* Rotor */}
        <line x1="-3" y1="-1.15" x2="3" y2="-1.15" className="stroke-fg" strokeWidth="0.32" strokeLinecap="round" />
        <line x1="0" y1="-0.8" x2="0" y2="-1.15" className="stroke-fg" strokeWidth={sw} />
        {/* Cabin */}
        <ellipse cx="0" cy="-0.05" rx="1.55" ry="0.78" fill="currentColor" className="stroke-fg" strokeWidth={sw} />
        {/* Cockpit highlight */}
        <ellipse cx="0.6" cy="-0.2" rx="0.55" ry="0.35" className="fill-bg-elevated" opacity="0.5" />
        {/* Tail boom */}
        <path d="M 0.8 0.1 L 2.7 0.45 L 2.7 0.7 L 0.8 0.55 Z" fill="currentColor" className="stroke-fg" strokeWidth={sw} />
        {/* Tail rotor */}
        <line x1="2.7" y1="0.2" x2="3.1" y2="0" className="stroke-fg" strokeWidth={sw} />
        <line x1="2.7" y1="0.85" x2="3.1" y2="1.05" className="stroke-fg" strokeWidth={sw} />
        {/* Skids */}
        <line x1="-1.4" y1="0.95" x2="1.4" y2="0.95" className="stroke-fg" strokeWidth="0.28" strokeLinecap="round" />
        <line x1="-1" y1="0.78" x2="-1" y2="0.95" className="stroke-fg" strokeWidth={sw} />
        <line x1="1" y1="0.78" x2="1" y2="0.95" className="stroke-fg" strokeWidth={sw} />
      </g>
    );
  }
  if (type === 'mini-uav') {
    // Quadcopter — top-down
    return (
      <g transform={t}>
        <line x1="-1.7" y1="-1.7" x2="1.7" y2="1.7" className="stroke-fg" strokeWidth="0.32" strokeLinecap="round" />
        <line x1="1.7" y1="-1.7" x2="-1.7" y2="1.7" className="stroke-fg" strokeWidth="0.32" strokeLinecap="round" />
        {[[-1.7,-1.7],[1.7,-1.7],[-1.7,1.7],[1.7,1.7]].map(([cx,cy],i)=>(
          <g key={i}>
            <circle cx={cx} cy={cy} r="0.7" className="fill-bg-elevated stroke-fg" strokeWidth={sw} opacity="0.7" />
            <circle cx={cx} cy={cy} r="0.25" fill="currentColor" />
          </g>
        ))}
        <rect x="-0.55" y="-0.55" width="1.1" height="1.1" rx="0.2" fill="currentColor" className="stroke-fg" strokeWidth={sw} />
      </g>
    );
  }
  if (type === 'male-uav') {
    // Long-endurance UAV — side profile with long wings
    return (
      <g transform={t}>
        {/* Long wing */}
        <path d="M -4 -0.2 L 4 -0.2 L 4 0.2 L -4 0.2 Z" fill="currentColor" className="stroke-fg" strokeWidth={sw} />
        {/* Fuselage */}
        <ellipse cx="0" cy="0" rx="1" ry="0.55" fill="currentColor" className="stroke-fg" strokeWidth={sw} />
        {/* Engine bulge */}
        <ellipse cx="-1" cy="0" rx="0.35" ry="0.45" className="fill-bg-elevated stroke-fg" strokeWidth="0.22" opacity="0.85" />
        {/* V-tail */}
        <path d="M 1.1 0 L 2.2 -0.8 L 2.3 -0.65 L 1.3 0 Z" fill="currentColor" className="stroke-fg" strokeWidth={sw} />
        <path d="M 1.1 0 L 2.2 0.8 L 2.3 0.65 L 1.3 0 Z" fill="currentColor" className="stroke-fg" strokeWidth={sw} />
      </g>
    );
  }
  if (type === 'fighter') {
    // Fighter jet — side view, swept wings
    return (
      <g transform={t}>
        <path d="M -2.6 0 L 1.7 -0.45 L 2.3 0 L 1.7 0.45 Z" fill="currentColor" className="stroke-fg" strokeWidth={sw} />
        {/* Upper wing */}
        <path d="M -0.4 -0.35 L 0 -1.5 L 0.9 -1.2 L 1 -0.3 Z" fill="currentColor" className="stroke-fg" strokeWidth={sw} />
        {/* Lower wing */}
        <path d="M -0.4 0.35 L 0 1.5 L 0.9 1.2 L 1 0.3 Z" fill="currentColor" className="stroke-fg" strokeWidth={sw} />
        {/* Tail fin */}
        <path d="M 1.5 -0.25 L 2.1 -0.9 L 2.4 -0.55 L 2.2 -0.05 Z" fill="currentColor" className="stroke-fg" strokeWidth="0.22" />
        {/* Cockpit canopy */}
        <ellipse cx="0.4" cy="-0.05" rx="0.45" ry="0.2" className="fill-bg-elevated" opacity="0.65" />
      </g>
    );
  }
  if (type === 'satellite') {
    return (
      <g transform={t}>
        {/* Solar panels (warm sand tone) */}
        <rect x="-3" y="-0.55" width="2" height="1.1" className="fill-terrain-sand stroke-fg" strokeWidth="0.22" />
        <rect x="1" y="-0.55" width="2" height="1.1" className="fill-terrain-sand stroke-fg" strokeWidth="0.22" />
        {/* Panel gridlines */}
        <line x1="-2.5" y1="-0.55" x2="-2.5" y2="0.55" className="stroke-fg" strokeWidth="0.12" opacity="0.5" />
        <line x1="-2" y1="-0.55" x2="-2" y2="0.55" className="stroke-fg" strokeWidth="0.12" opacity="0.5" />
        <line x1="1.5" y1="-0.55" x2="1.5" y2="0.55" className="stroke-fg" strokeWidth="0.12" opacity="0.5" />
        <line x1="2" y1="-0.55" x2="2" y2="0.55" className="stroke-fg" strokeWidth="0.12" opacity="0.5" />
        {/* Connecting struts */}
        <line x1="-1" y1="0" x2="-0.7" y2="0" className="stroke-fg" strokeWidth="0.2" />
        <line x1="1" y1="0" x2="0.7" y2="0" className="stroke-fg" strokeWidth="0.2" />
        {/* Body */}
        <rect x="-0.7" y="-0.7" width="1.4" height="1.4" rx="0.18" fill="currentColor" className="stroke-fg" strokeWidth={sw} />
        {/* Antenna */}
        <line x1="0" y1="-0.7" x2="0" y2="-1.5" className="stroke-fg" strokeWidth="0.22" />
        <circle cx="0" cy="-1.65" r="0.22" fill="currentColor" className="stroke-fg" strokeWidth="0.18" />
      </g>
    );
  }
  if (type === 'balloon') {
    return (
      <g transform={t}>
        {/* Envelope */}
        <ellipse cx="0" cy="-0.35" rx="1.45" ry="1.75" fill="currentColor" className="stroke-fg" strokeWidth={sw} />
        {/* Highlight */}
        <ellipse cx="-0.45" cy="-0.85" rx="0.4" ry="0.65" className="fill-bg-elevated" opacity="0.45" />
        {/* Equator seam */}
        <line x1="-1.4" y1="-0.4" x2="1.4" y2="-0.4" className="stroke-fg" strokeWidth="0.15" opacity="0.45" />
        {/* Suspension ropes */}
        <line x1="-0.7" y1="1.25" x2="-0.3" y2="1.8" className="stroke-fg" strokeWidth="0.16" />
        <line x1="0.7" y1="1.25" x2="0.3" y2="1.8" className="stroke-fg" strokeWidth="0.16" />
        {/* Gondola */}
        <rect x="-0.55" y="1.75" width="1.1" height="0.6" rx="0.12" fill="currentColor" className="stroke-fg" strokeWidth="0.22" />
      </g>
    );
  }
  // Fallback
  return <circle cx={x} cy={y} r="1.6" fill="currentColor" className="stroke-fg" strokeWidth={sw} />;
}

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-sm font-display font-semibold text-fg-muted tracking-wider">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}