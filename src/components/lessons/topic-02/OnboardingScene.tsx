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
    label: 'מבנה הקרקע והסביבה הטבעית',
    desc: 'מבנה הקרקע והשפעתו על הפעילות בשטח.',
    popupTitle: 'הבסיס להבנת השטח',
    popupBody: 'השכבה הראשונה מציגה את הסביבה הטבעית: הרים, נהרות ואזורים מדבריים. צורת פני הקרקע נקראת תבליט, והיא כוללת בין היתר הרים, עמקים ומדרונות. מבנה הקרקע משפיע על אפשרויות התנועה, התצפית וההסתרה, ולכן הוא בסיס לתכנון הפעילות בשטח.',
    icon: 'mountain',
  },
  {
    id: 'roads',
    label: 'דרכים ותשתיות',
    desc: 'דרכים, מסילות וצינורות להעברת מקורות אנרגיה.',
    popupTitle: 'תנועה ואספקה במרחב',
    popupBody: 'בשכבה זו נוספות דרכים, מסילות וצינורות גז ודלק. דרכים ומסילות מאפשרות תנועת כוחות והעברת אספקה, וצינורות משמשים להעברת מקורות אנרגיה. זיהוי התשתיות מסייע להעריך כיצד ניתן לנוע במרחב ובאילו נתיבים תלויה האספקה. תשתיות אלו הן חלק מהתכסית — המרכיבים שנמצאים על פני הקרקע.',
    icon: 'truck',
  },
  {
    id: 'buildings',
    label: 'יישובים ומבנים',
    desc: 'יישובים ומבנים והשפעתם על הפעילות ועל האוכלוסייה.',
    popupTitle: 'הסביבה הבנויה והאוכלוסייה',
    popupBody: 'בשכבה זו נוספים ערים, כפרים ומבנים. הם מצביעים על אזורי מגורים ופעילות ומשפיעים על התנועה, התצפית וההסתרה. בתכנון מבצעי יש להביא בחשבון גם את נוכחות האוכלוסייה האזרחית ואת הצורך לצמצם את הסיכון לפגיעה בה. גם יישובים ומבנים הם חלק מהתכסית.',
    icon: 'capital',
  },
  {
    id: 'borders',
    label: 'גבולות ואזורי שליטה',
    desc: 'גבולות מדיניים וקווים המציינים שליטה בפועל.',
    popupTitle: 'חלוקת המרחב ומשמעותה',
    popupBody: 'בשכבה זו מופיעים גבולות ואזורי שליטה. חלקם מסומנים בשטח בגדרות או במכשולים, ואחרים מופיעים במפה בלבד. חשוב להבחין בין גבול מדיני לבין קו שמציין שליטה בפועל. מידע זה מסייע להבין את מגבלות התנועה ואת התיאום הנדרש לפעילות במרחב.',
    icon: 'flag',
  },
  {
    id: 'ops',
    label: 'תמונת המצב המבצעית',
    desc: 'מיקום כוחותינו, כוחות האויב והאיומים הידועים.',
    popupTitle: 'מיקום כוחות ואיומים',
    popupBody: 'השכבה האחרונה מציגה את מיקום כוחותינו, כוחות האויב והאיומים הידועים. מידע זה עשוי להשתנות במהירות, ולכן חשוב לבדוק מתי עודכן. שילובו עם שכבות השטח והתשתיות מסייע להעריך את המצב ולתכנן את הפעילות בהתאם למידע הזמין.',
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
        title="המפה כמערכת של שכבות מידע"
        intro="מפה משלבת כמה סוגי מידע: מבנה הקרקע, דרכים, יישובים, גבולות ומיקום כוחות. כל שכבה מוסיפה מידע שמסייע להבין את המרחב ולתכנן בו פעילות. בחרו את השכבות לפי הסדר ובדקו כיצד כל אחת מוסיפה לתמונת השטח."
      />

      {/* Preserve the existing 32:68 accordion/map split. Longer approved
          labels wrap naturally without reducing the type size. */}
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
                  // Rows sit on the textured page — the hover tint lives on a ::before
                  // layer over the opaque white base, so it never lets the page show through.
                  'relative isolate overflow-hidden rounded-xl border transition-colors duration-200 ease-snap',
                  'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap',
                  active
                    ? 'border-brand/45 bg-bg-elevated'
                    : 'border-border bg-bg-elevated hover:border-brand/30 hover:before:bg-brand/[0.03]'
                )}
              >
                <button
                  type="button"
                  onClick={() => clickLayer(i)}
                  aria-expanded={expanded}
                  aria-controls={`layer-panel-${l.id}`}
                  className="w-full p-4 text-start flex items-center gap-3 cursor-pointer rounded-xl focus-visible:ring-inset focus-visible:ring-offset-0"
                >
                  <span
                    className={cn(
                      'size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ease-snap',
                      active || passed ? 'bg-brand-dark text-bg-elevated' : 'bg-bg-accent text-fg-muted'
                    )}
                  >
                    {passed && !active ? (
                      <Icon name="check" size={18} strokeWidth={2.5} />
                    ) : (
                      <span className="font-display text-base font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold leading-snug text-black text-lg md:text-xl">
                      {l.label}
                    </div>
                  </div>
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', expanded ? 'text-brand-dark' : 'text-fg-dim')}
                  >
                    <svg
                      width="20"
                      height="20"
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
                          through. At 1440px the approved copy's tallest panels
                          (roads, buildings) need 232px including padding. */}
                      <div className="px-4 pb-4 pt-1 md:min-h-[232px]">
                        <div className="text-base font-display font-bold text-black mb-1.5">
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

      {/* Practical examples use the existing four-case panel layout. */}
      <div className="mt-20 mb-12">
        <HistoricalCasesPanel />
      </div>

      <ReadyCallout title="בהמשך השיעור" signature={false}>
        <p>נלמד לזהות את מרכיבי השטח ולהבין כיצד הם מופיעים במפה. נכיר תבליט ותכסית, תבניות נוף וסוגי סלעים, ובהמשך נתרגל
            <strong className="text-fg"> שימוש בקנה מידה, קריאת נקודות ציון ופענוח קווי גובה</strong>.</p>
      </ReadyCallout>
    </section>
  );
}

function MapStageLoading() {
  return (
    <div className="w-full h-full min-h-[280px] flex items-center justify-center">
      <div className="flex items-center gap-2 text-fg-muted text-sm font-display">
        <span className="size-2 rounded-full bg-brand-dark animate-pulse" />
        <span>טוען...</span>
      </div>
    </div>
  );
}

