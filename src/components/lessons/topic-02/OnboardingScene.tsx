'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { HistoricalCasesPanel } from './HistoricalCasesPanel';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

export type LayerId = 'base' | 'roads' | 'buildings' | 'borders' | 'ops';

// Split out via next/dynamic so the frame-player (and its canvas/preload
// logic) doesn't end up in the initial bundle for the rest of the lesson —
// same reasoning as topic-01/OnboardingScene.tsx.
const SceneOnboardingFramePlayer = dynamic(() => import('./SceneOnboardingFramePlayer'), {
  loading: () => <MapStageLoading />,
});

type Layer = {
  id: LayerId;
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
    popupBody: 'התחלנו — רואים רק את הטבע: הרים, נהרות ומדבר. כל ההחלטות הצבאיות מכאן ואילך מסתמכות על הצורה הטבעית של הקרקע. בלי השכבה הזו אין בסיס לשום דבר אחר.',
    icon: 'mountain',
  },
  {
    id: 'roads',
    label: 'דרכים וצינורות',
    desc: 'איך זזים בשטח: כבישים, מסילות, צינורות גז ודלק.',
    popupTitle: 'איך זזים בשטח? (תכסית)',
    popupBody: 'הוספנו דרכים — עכשיו אפשר לתכנן איך לזוז במרחב. כבישים ומסילות הם העורקים שדרכם הצבא מתנייד ונע במרחב; צינורות הגז והדלק הם תשתיות אנרגיה קריטיות שמזינות אותו, ולכן גם מטרה אסטרטגית. בלי השכבה הזו השטח הוא ים של הרים ובוץ ללא ציר תנועה.',
    icon: 'truck',
  },
  {
    id: 'buildings',
    label: 'יישובים ומבנים',
    desc: 'ערים, כפרים, בתים ומתחמים — איפה גרים, עובדים ומסתתרים.',
    popupTitle: 'איפה אנשים נמצאים? (תכסית)',
    popupBody: 'הוספנו יישובים — עכשיו ברור איפה אנשים נמצאים. ערים, כפרים, בתים ומתחמים מספרים איפה יימצאו אזרחים, איפה האויב יכול להתחפר, ואיפה חייבים להיזהר במיוחד מפגיעה בחפים מפשע.',
    icon: 'capital',
  },
  {
    id: 'borders',
    label: 'גבולות ושליטה',
    desc: 'קווים שמסמנים מי שולט באיזה אזור — לרוב לא רואים אותם בשטח, אבל הם משנים הכל.',
    popupTitle: 'מי שולט באיזה אזור?',
    popupBody: 'הוספנו גבולות — עכשיו ברור מי שולט באיזה אזור. לרוב אין להן סימון פיזי בשטח, אך יש קווים שדווקא מסומנים בגדר או מכשול — והם קובעים איפה מותר לחצות, איפה צריך אישור מדיני, ואיפה בכלל הקרב יכול להתרחש.',
    icon: 'flag',
  },
  {
    id: 'ops',
    label: 'שכבה צבאית בזמן אמת',
    desc: 'איפה הכוחות שלנו, איפה האויב, איפה האיומים — משתנה כל שעה.',
    popupTitle: 'התמונה המבצעית בזמן אמת',
    popupBody: 'השכבה האחרונה, והדינמית ביותר: איפה הכוחות שלנו, איפה האויב ואיפה האיומים. עכשיו יש לנו תמונה מלאה לתכנון מבצעי — בלי השכבות הקודמות היינו מקבלים החלטה עיוורת.',
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
                intro={`תחשבו על מפה צבאית כמו על ערימה של שקפים שמונחים זה על זה. כל שקף מוסיף סוג אחר של מידע. הדליקו את השכבות אחת אחרי השנייה, וראו איך שטח ריק הופך לתמונה מבצעית שלמה.`}
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
                          through. The 211px floor was measured with an extra
                          (now-removed) heading line -- re-verify against this
                          shorter two-tier content before trusting the exact number. */}
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20 md:min-h-[211px]">
                        <div className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
                          {l.popupTitle}
                        </div>
                        <p className="text-base leading-relaxed text-black">
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

        {/* Visualization — WebP frame-sequence player, same technology as
            topic-01/SceneOnboardingFramePlayer.tsx. min-h is only a floor;
            the canvas cover-fits whatever box it's given. */}
        <div className="surface-elevated bg-bg-accent relative overflow-hidden min-h-[280px] [&_canvas]:!w-full [&_canvas]:!h-full">
          <SceneOnboardingFramePlayer targetState={LAYERS[activeIndex].id} />
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

function MapStageLoading() {
  return (
    <div className="w-full h-full min-h-[280px] flex items-center justify-center">
      <div className="flex items-center gap-2 text-fg-dim text-xs font-display">
        <span className="size-2 rounded-full bg-brand-dark animate-pulse" />
        <span>טוען...</span>
      </div>
    </div>
  );
}

