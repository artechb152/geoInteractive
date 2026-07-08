'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { IntelCard } from '@/components/lesson/IntelCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { OnboardingEditProvider, EditableBlock, EditableFrame } from './onboarding-edit-mode';

export type Feature = 'flat' | 'mountain' | 'river' | 'narrow';

// 3D visualization is client-only (WebGL needs a browser) and split out so
// three.js doesn't end up in the initial bundle for the rest of the lesson.
const TerrainCanvas = dynamic(() => import('./TerrainCanvas'), {
  ssr: false,
  loading: () => <TerrainStageLoading />,
});

type Step = {
  id: Feature;
  label: string;
  caption: string;
  insight: string;
};

const STEPS: Step[] = [
  {
    id: 'flat',
    label: 'שטח פתוח (בלי מכשולים)',
    caption: 'אין הרים, אין נהרות. שני הצבאות יכולים פשוט ללכת ישר זה לעבר זה. שום דבר בשטח לא עוזר ולא מפריע לאף אחד.',
    insight: 'בלי השפעה של השטח, מי שיגבר הוא מי שיש לו יותר חיילים, נשק טוב יותר או אימון טוב יותר. כלומר: כוח מול כוח, ניקוד טהור.',
  },
  {
    id: 'mountain',
    label: 'הוספת הר',
    caption: 'פתאום יש מכשול. אי אפשר ללכת ישר יותר — חייבים לעקוף מימין או משמאל. מי שמטפס לראש ההר ראשון רואה את כל מי שזז למטה.',
    insight: 'מי שמחזיק את הנקודה הגבוהה ביותר רואה את האויב ראשון, יורה אליו ראשון, וקשה מאוד לתקוף אותו מלמטה. זאת הסיבה שצבאות תמיד נלחמים על פסגות.',
  },
  {
    id: 'river',
    label: 'הוספת נהר',
    caption: 'טנקים, משאיות ותותחים לא יכולים פשוט לחצות נהר בשחייה. הם חייבים גשר. ואם יש רק גשר אחד — כל הצבא חייב להצטופף ולעבור דרכו.',
    insight: 'מי ששולט בגשר היחיד — שולט בכל הקרב. אפילו קבוצה קטנה של 50 חיילים, אם היא חוסמת או מפוצצת את הגשר, יכולה לעצור צבא של עשרות אלפים.',
  },
  {
    id: 'narrow',
    label: 'צמצום המעבר',
    caption: 'הוספנו שני רכסי הרים בצדדים. עכשיו המעבר באמצע הצטמצם לסדק. צבא של 10,000 חיילים נאלץ לעבור אחד מאחורי השני — לא 1,000 בשורה אלא 50, חשופים מכל צד.',
    insight: 'כשהמרחב הצר מאלץ אותך להצטופף בטור — היתרון המספרי שלך נעלם. כוח קטן עם נשק טוב יכול לעצור צבא ענק. זאת הסיבה שכל מפקד מחפש את "נקודות החנק" של האויב.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'הצבא הגדול בעולם נחרב — בלי קרב גדול',
    place: 'נפוליאון פולש לרוסיה · 1812',
    lesson: 'נפוליאון, השליט החזק באירופה, פלש לרוסיה עם 600,000 חיילים. הוא לא הפסיד בקרב — אבל המרחק העצום והחורף הקטלני הרגו 90% מהצבא לפני שהגיעו בכלל למוסקבה. המרחק והקור היו האויב האמיתי.',
    icon: 'fuel',
    accent: 'text-accent-cool',
  },
  {
    headline: '32 ק"מ של מים שמרו על אימפריה',
    place: 'בריטניה · 200 שנה',
    lesson: 'תעלת למאנש היא רצועת הים בין אנגליה לצרפת — רק 32 ק"מ ברוחב הצר ביותר. אבל זה הספיק כדי למנוע פלישה צרפתית, גרמנית ונאצית במשך מאות שנים. רצועת המים הזו הייתה החייל הטוב ביותר של בריטניה.',
    icon: 'wave',
    accent: 'text-terrain-sky',
  },
  {
    headline: 'ישראל ברוחבה הצר ביותר: 14 ק"מ בלבד',
    place: 'אזור השרון · ישראל',
    lesson: 'במרכז ישראל — מנתניה ועד הגבול הירדני — יש רק 14 ק"מ ברוחב. כלומר, צבא אויב יכול לכאורה לחצות את המדינה לשניים בכמה שעות נסיעה. זה מחייב תפיסה צבאית שונה לחלוטין מאשר במדינות גדולות כמו רוסיה או ארה"ב.',
    icon: 'flag',
    accent: 'text-accent-hot',
  },
  {
    headline: 'מדינה קטנה ששרדה שתי מלחמות עולם',
    place: 'שוויץ · 1914 ו-1939',
    lesson: 'שוויץ — מדינה זעירה במרכז אירופה — לא נכבשה בשום מלחמה גדולה. ההרים הגבוהים שמקיפים אותה הופכים פלישה ליקרה ולמסוכנת מדי, גם בעיני צבא ענק כמו הצבא הנאצי. ההרים שווים יותר מצבא חזק.',
    icon: 'mountain',
    accent: 'text-terrain-ridge',
  },
];

export function OnboardingScene() {
  const [step, setStep] = useState<Feature>('flat');
  // Whether the current step's explanation panel is expanded; null = collapsed.
  // Defaults to the first step being open so the user sees content immediately.
  const [expandedStep, setExpandedStep] = useState<Feature | null>('flat');

  const handleStepClick = (id: Feature) => {
    if (expandedStep === id) {
      // Clicking the open panel collapses it (the visualization on the left
      // stays — `step` doesn't change).
      setExpandedStep(null);
    } else {
      // Open this step and update the visualization to match.
      setStep(id);
      setExpandedStep(id);
    }
  };

  return (
    <section id="scene-onboarding" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
    <OnboardingEditProvider>
      <EditableBlock id="title-intro" label="כותרת + טקסט פתיחה">
      <SceneHeader
        step="01.0"
        eyebrow="לפני שמתחילים"
title={
          <>
          <span className="gradient-text">איך גבעה רנדומלית, נהר או שביל צר הופכים לשובר השוויון של שדה הקרב?</span>
          </>
        }
                intro="תארו לכם שני צבאות שעומדים להילחם. עכשיו, בואו נשחק עם השטח: תוסיפו הר,  נהר, ותראו איך כל שינוי טופוגרפי קטן משנה לגמרי את חוקי המשחק. לא צריך שום ידע צבאי – רק היגיון בריא"
      />
      </EditableBlock>

      <div className="grid md:grid-cols-[2fr_3fr] gap-6 items-start">
        {/* Control panel — first child → RIGHT in RTL (text on right). */}
        <EditableBlock id="accordion-panel" label="פאנל השלבים" className="space-y-3">
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const expanded = expandedStep === s.id;
            const passed = STEPS.findIndex((x) => x.id === step) > i;
            return (
              <div
                key={s.id}
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
                  onClick={() => handleStepClick(s.id)}
                  aria-expanded={expanded}
                  aria-controls={`step-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t1-onb-step-bar"
                      className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-e-full"
                    />
                  )}
                  <span
                    className={cn(
                      'size-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      active ? 'bg-brand-dark text-bg-elevated border-brand-dark' : passed ? 'bg-status-ok/15 text-status-ok border-status-ok/30' : 'bg-bg-accent text-fg-muted border-border'
                    )}
                  >
                    {passed && !active ? (
                      <Icon name="check" size={16} strokeWidth={2.5} />
                    ) : (
                      <span className="font-display text-sm font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold leading-tight transition-colors text-black text-base md:text-lg">
                      {s.label}
                    </div>
                  </div>
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', expanded ? 'text-brand-dark' : 'text-fg-dim')}
                  >
                    <svg
                      width="18"
                      height="18"
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
                      key={`panel-${s.id}`}
                      id={`step-panel-${s.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20 space-y-3">
                        <div className="mt-3">
                          <div className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
                            <Icon name="eye" size={14} />
                            מה קורה בשלב הזה?
                          </div>
                          <p className="text-base leading-relaxed text-black">{s.caption}</p>
                        </div>
                        <div className="pt-2 border-t border-border-subtle">
                          <div className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
                            <Icon name="spark" size={14} />
                            ולמה זה משנה?
                          </div>
                          <p className="text-base leading-relaxed text-black">{s.insight}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </EditableBlock>

        {/* Visualization — second child → LEFT in RTL. EditableFrame (not
            EditableBlock) so it doesn't add a wrapper div: an extra div here
            made the WebGL canvas's ResizeObserver race during viewport
            resizes, leaving the terrain rendered at a stale, too-small scale.
            [&_canvas]:!w-full/[&_canvas]:!h-full — the permanent scene-wide
            `zoom: 0.86` (onboarding-edit-mode.tsx) makes r3f's ResizeObserver
            read a post-zoom size and re-apply it as literal px, which the
            browser then zooms AGAIN, shrinking the canvas inside this frame.
            Forcing percentage sizing sidesteps that double-zoom entirely. */}
        <EditableFrame id="visual-frame" label="לוח תלת-ממדי">
        <div className="surface-elevated bg-bg relative overflow-hidden aspect-video min-h-[320px] [&_canvas]:!w-full [&_canvas]:!h-full">
          <TerrainStage feature={step} />
        </div>
        </EditableFrame>
      </div>

      <SoftDivider text="ועכשיו 4 סיפורים אמיתיים מההיסטוריה" />

      <div className="grid sm:grid-cols-2 gap-4">
        {HISTORICAL.map((h, i) => (
          <EditableBlock key={h.headline} id={`history-card-${i}`} label={`כרטיס היסטורי ${i + 1}`}>
            <IntelCard
              place={h.place}
              headline={
                <EditableBlock as="span" nested id={`history-card-${i}-title`} label={`כותרת כרטיס ${i + 1}`} className="block">
                  {h.headline}
                </EditableBlock>
              }
              lesson={
                <EditableBlock as="span" nested id={`history-card-${i}-text`} label={`טקסט כרטיס ${i + 1}`} className="block">
                  {h.lesson}
                </EditableBlock>
              }
              icon={h.icon}
              accent={h.accent}
            />
          </EditableBlock>
        ))}
      </div>

      <EditableBlock id="ready-callout" label="תיבת סיכום">
      <ReadyCallout title="עכשיו אתם מוכנים">
        <p>הבנתם את ההיגיון? מעולה. כל מה שראיתם עכשיו מבוסס על אינסטינקט בריא. בצבא, לאינסטינקטים האלה יש שמות, חוקים והגדרות. עכשיו ניקח את ההיגיון שלכם ונתרגם אותו לשפה שבה גנרלים מתכננים מלחמות. נתחיל מהבסיס: שלוש הרמות של המלחמה
            <strong className="text-black font-bold"> שלוש הרמות שבהן צבא חושב על מלחמה</strong>.</p>
      </ReadyCallout>
      </EditableBlock>

    </OnboardingEditProvider>
    </section>
  );
}

function TerrainStage({ feature }: { feature: Feature }) {
  return (
    <div className="relative w-full h-full">
      {/* WebGL scene. The Canvas renders transparent so the parent
          card's cream tint reads through any uncovered margin. */}
      <TerrainCanvas feature={feature} />
    </div>
  );
}

function TerrainStageLoading() {
  return (
    <div className="w-full h-full min-h-[280px] flex items-center justify-center">
      <div className="flex items-center gap-2 text-fg-dim text-xs font-display">
        <span className="size-2 rounded-full bg-brand-dark animate-pulse" />
        <span>טוען תצוגה תלת-ממדית...</span>
      </div>
    </div>
  );
}

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-base font-display font-bold text-black tracking-wider">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
