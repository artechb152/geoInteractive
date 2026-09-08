'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { HistoricalCasesPanel } from './HistoricalCasesPanel';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Layer = {
  id: string;
  label: string;
  desc: string;
  popupTitle: string;
  popupBody: string;
  icon: IconName;
};

const LAYERS: Layer[] = [
  {
    id: 'base',
    label: 'הטבע: הר, נהר, מדבר',
    desc: 'כל מה שהיה כאן לפני שאנשים נכנסו לשטח.',
    popupTitle: 'השכבה הבסיסית: הטבע (תבליט)',
    popupBody: 'התחלנו — רואים רק את הטבע: הרים, נהרות ומדבר. כל ההחלטות הצבאיות שיגיעו אחר כך מסתמכות על הצורה הטבעית של הקרקע. בלי השכבה הזו אין על מה להוסיף שום דבר אחר.',
    icon: 'mountain',
  },
  {
    id: 'roads',
    label: 'דרכים וצינורות',
    desc: 'איך זזים בשטח: כבישים, מסילות, צינורות גז ודלק.',
    popupTitle: 'איך זזים בשטח? (תכסית)',
    popupBody: 'הוספנו דרכים — עכשיו אפשר לתכנן איך לזוז במרחב. כבישים, מסילות, צינורות גז ודלק הם העורקים שדרכם הצבא מתנייע ומזין את עצמו. בלי השכבה הזו השטח הוא ים של הרים ובוץ ללא ציר תנועה.',
    icon: 'truck',
  },
  {
    id: 'buildings',
    label: 'איפה אנשים נמצאים',
    desc: 'ערים, כפרים, בתים, מתחמים — היכן גרים, עובדים ומסתתרים.',
    popupTitle: 'איפה האנשים נמצאים? (תכסית)',
    popupBody: 'הוספנו יישובים — עכשיו ברור איפה אנשים נמצאים. ערים, כפרים, בתים ומתחמים מספרים איפה ימצאו אזרחים, איפה האויב יכול להתחפר, ואיפה חייבים להיזהר במיוחד מפגיעה בחפים מפשע.',
    icon: 'capital',
  },
  {
    id: 'borders',
    label: 'גבולות וזכויות שליטה',
    desc: 'קווים שמסמנים מי שולט באיזה אזור — לא רואים אותם בשטח, אבל הם משנים הכל.',
    popupTitle: 'מי שולט באיזה אזור?',
    popupBody: 'הוספנו גבולות — עכשיו ברור מי שולט באיזה אזור. אלו קווים שלא רואים בשטח, אבל הם קובעים איפה מותר לחצות, איפה צריך אישור מדיני, ואיפה בכלל הקרב יכול להתרחש.',
    icon: 'flag',
  },
  {
    id: 'ops',
    label: 'שכבה צבאית בזמן אמת',
    desc: 'איפה הכוחות שלנו, איפה האויב, איפה האיומים — משתנה כל שעה.',
    popupTitle: 'התמונה המבצעית בזמן אמת',
    popupBody: 'השכבה האחרונה והמשתנה ביותר: איפה הכוחות שלנו, איפה האויב ואיפה האיומים. עכשיו יש לנו תמונה מלאה לתכנון מבצעי — בלי כל אחת מהשכבות הקודמות היינו מקבלים החלטה עיוורת.',
    icon: 'crosshair',
  },
];

export function OnboardingScene() {
  // Sequential build-up: `activeIndex` is the layer currently driving the map
  // (every layer up to and including it is lit). Tracked separately from
  // `expandedLayer` so collapsing a panel leaves the card active and the map
  // untouched -- the same two-state model as topic-01's onboarding accordion.
  const [activeIndex, setActiveIndex] = useState(0);
  // Which layer's accordion panel is currently expanded (null = collapsed).
  // Defaults to the first layer being open so the user sees content immediately.
  const [expandedLayer, setExpandedLayer] = useState<string | null>(LAYERS[0].id);
  const enabled = new Set(LAYERS.slice(0, activeIndex + 1).map((l) => l.id));

  function clickLayer(i: number) {
    const id = LAYERS[i].id;
    if (expandedLayer === id) {
      // Clicking the open panel collapses it (the map on the left stays --
      // `activeIndex` doesn't change).
      setExpandedLayer(null);
      return;
    }
    setActiveIndex(i);
    setExpandedLayer(id);
  }

  return (
    <section id="scene-onboarding" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="02.0"
        eyebrow="לפני שמתחילים"
title={
          <>
          <span className="gradient-text">מפה היא לא תמונה דו-ממדית – היא פאזל של שכבות מידע</span>
          </>
        }
                intro={`תחשבו על מפה צבאית כמו על ערימה של שקפים שקופים שמונחים זה על זה. כל שקף מוסיף סוג אחר של מידע. הדליקו את השכבות אחת אחרי השנייה, וראו איך שטח ריק הופך לתמונה מבצעית שלמה.`}
      />

      {/* Widened the map column from 2fr:3fr (640px) to 725px at the 1440px
          target. 32:68 is the widest split that still keeps every layer label
          on one line -- measured: 320px wraps three of them, 330px is clear,
          this leaves the column at 341px -- so the map grows without any type
          being resized. The column cannot reach the SVG's 4:3 ratio outright
          (a 617px-tall box would need 823px of width, squeezing the accordion
          to ~240px and wrapping the labels), so the residual letterbox is
          absorbed by the box background instead -- see bg-bg-accent below. */}
      <div className="grid md:grid-cols-[32fr_68fr] gap-6">
        <div className="space-y-1">
          {LAYERS.map((l, i) => {
            const active = activeIndex === i;
            const expanded = expandedLayer === l.id;
            const passed = activeIndex > i;
            return (
              <div
                key={l.id}
                className={cn(
                  'surface overflow-hidden transition-all duration-300 ease-snap',
                  active
                    ? 'border-brand/45 bg-bg-elevated'
                    : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                  passed && !active && 'opacity-80'
                )}
              >
                <button
                  type="button"
                  onClick={() => clickLayer(i)}
                  aria-expanded={expanded}
                  aria-controls={`layer-panel-${l.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  <span
                    className={cn(
                      'size-11 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      active || passed ? 'bg-brand-dark text-bg-elevated border-brand-dark' : 'bg-bg-accent text-fg-muted border-border'
                    )}
                  >
                    {passed && !active ? (
                      <Icon name="check" size={18} strokeWidth={2.5} />
                    ) : (
                      <span className="font-display text-base font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold leading-tight transition-colors text-black text-lg md:text-xl">
                      {l.label}
                    </div>
                  </div>
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', expanded ? 'text-brand-dark' : 'text-fg-dim')}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      key={`panel-${l.id}`}
                      id={`layer-panel-${l.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      {/* All five panels share one height so the column -- and the
                          map box stretched beside it -- never resize as you click
                          through. At the column width set above, layers 2/3/5 run to
                          211px while 1 and 4 are a line shorter at 185px; this floor
                          lifts the short ones to match rather than resizing type. */}
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20 md:min-h-[211px]">
                        <div className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
                          מה השכבה הזו מוסיפה
                        </div>
                        <h4 className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
                          {l.popupTitle}
                        </h4>
                        <p className="text-base leading-relaxed text-black text-pretty">
                          {l.popupBody}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* bg-bg-accent, not bg-bg: the SVG's own base rect is bg-bg-accent,
            so any letterboxing left by preserveAspectRatio="meet" now matches
            the map's ground exactly instead of reading as two cream stripes. */}
        <div className="surface-elevated bg-bg-accent relative overflow-hidden min-h-[280px]">
          <LayeredMap enabled={enabled} />
        </div>
      </div>

      {/* Historical examples — same panel layout as lesson 1
          (topic-01/HistoricalCasesPanel.tsx). Replaced the IntelCard
          grid; the four examples moved into the panel's CASES array. */}
      <div className="mt-20 mb-12">
        <HistoricalCasesPanel />
      </div>

      <ReadyCallout title="עכשיו אתם מוכנים">
        <p>הבנו שמפה היא הרבה יותר מציור על דף. בחלקים הבאים נלמד את "שפת המפה":
            <strong className="text-fg"> איך מכניסים הר שלם לנייר קטן, איך מודדים מרחק, ואיך קוראים נ"צ בלי להתבלבל</strong>.</p>
      </ReadyCallout>
    </section>
  );
}

function LayeredMap({ enabled }: { enabled: Set<string> }) {
  return (
    <div className="relative w-full h-full">
      {/* yMax, not yMid: the box is a little taller than the artwork's 4:3,
          and anchoring to the bottom puts the whole remainder above the
          skyline, where it is the same bg-bg-accent as the base rect and so
          invisible. Centring it instead split the slack into a cream strip
          under the terrain, which read as a band. */}
      <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="xMidYMax meet">
        <rect x="0" y="0" width="100" height="75" className="fill-bg-accent" />

        {/* Base: terrain */}
        <Layer show={enabled.has('base')}>
          <path d="M0 50 L20 35 L40 45 L60 28 L80 40 L100 32 L100 75 L0 75 Z" className="fill-terrain-ridge/30 stroke-terrain-ridge/60" strokeWidth="0.2" />
          <path d="M0 60 L25 55 L50 62 L75 56 L100 60 L100 75 L0 75 Z" className="fill-terrain-sand/20" />
          {/* Contour hints */}
          {[1, 2, 3].map((i) => (
            <path key={i} d={`M 10 ${20 + i * 4} Q 50 ${15 + i * 3} 90 ${20 + i * 4}`} fill="none" className="stroke-fg-dim" strokeWidth="0.1" opacity="0.4" />
          ))}
        </Layer>

        {/* Roads */}
        <Layer show={enabled.has('roads')}>
          <path d="M0 55 Q 40 50 60 48 T 100 45" fill="none" className="stroke-accent" strokeWidth="0.7" />
          <path d="M30 75 L30 50 L55 35" fill="none" className="stroke-accent/70" strokeWidth="0.5" strokeDasharray="1.5 1" />
        </Layer>

        {/* Buildings */}
        <Layer show={enabled.has('buildings')}>
          {[
            [25, 48], [27, 50], [29, 49], [31, 51], [33, 50],
            [62, 47], [64, 45], [66, 48],
            [80, 41], [82, 43],
          ].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="1.5" height="1.5" className="fill-fg-muted/80" />
          ))}
        </Layer>

        {/* Borders */}
        <Layer show={enabled.has('borders')}>
          <line x1="50" y1="0" x2="48" y2="75" className="stroke-accent-hot" strokeWidth="0.4" strokeDasharray="2 1.5" />
          <text x="52" y="12" className="fill-accent-hot/70 text-[2.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >גבול A↔B</text>
        </Layer>

        {/* Operational */}
        <Layer show={enabled.has('ops')}>
          {/* Friendly */}
          <g>
            <circle cx="20" cy="62" r="2" className="fill-accent-cool" />
            <text x="20" y="68" textAnchor="middle" className="fill-accent-cool text-[2.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >כוח ידידותי</text>
          </g>
          {/* Threat */}
          <g>
            <circle cx="78" cy="38" r="2.2" className="fill-accent-hot" />
            <circle cx="78" cy="38" r="6" fill="none" className="stroke-accent-hot/40" strokeWidth="0.3" strokeDasharray="0.8 0.8">
              <animate attributeName="r" values="4;9;4" dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur="2.2s" repeatCount="indefinite" />
            </circle>
            <text x="78" y="32" textAnchor="middle" className="fill-accent-hot text-[2.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >איום</text>
          </g>
        </Layer>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        הדלק שכבות מימין כדי לבנות את המפה
      </div>

      {enabled.size === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-fg-dim text-sm">מפה ריקה — בחר שכבה</span>
        </div>
      )}
    </div>
  );
}

function Layer({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <motion.g
      initial={false}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration: 0.4 }}
      style={{ pointerEvents: show ? 'auto' : 'none' }}
    >
      {children}
    </motion.g>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div className={cn('relative w-9 h-5 rounded-full transition-colors shrink-0', on ? 'bg-accent' : 'bg-bg-accent border border-border')}>
      <motion.div
        className={cn('absolute top-0.5 size-4 rounded-full', on ? 'bg-bg' : 'bg-fg-dim')}
        animate={{ x: on ? -16 : -2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </div>
  );
}

