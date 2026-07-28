'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon } from 'lucide-react';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
import { OnboardingEditProvider, EditableBlock, EditableFrame } from './onboarding-edit-mode';

export type Feature = 'flat' | 'mountain' | 'river' | 'narrow';

// Split out via next/dynamic so the frame-player (and its canvas/preload
// logic) doesn't end up in the initial bundle for the rest of the lesson.
const SceneOnboardingFramePlayer = dynamic(() => import('./SceneOnboardingFramePlayer'), {
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
  const activeIndex = STEPS.findIndex((s) => s.id === step);
  const activeStep = STEPS[activeIndex];

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

      {/* Full-width video stage — step text + switcher buttons overlay the
          frame itself instead of living in a side panel. */}
      <EditableFrame id="visual-frame" label="סרטון תצוגה">
      <div className="surface-elevated bg-bg relative overflow-hidden w-full aspect-video md:aspect-[2.15/1] min-h-[360px] md:min-h-[440px] [&_video]:!w-full [&_video]:!h-full">
        <TerrainStage feature={step} />

        {/* Scrim so overlaid text/buttons stay legible over any frame. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45"
        />

        {/* Step text (right) + "why it matters" (left) — both inline-end-
            anchored to their own side via `justify-between` on a row that
            respects the container's writing direction (dir="rtl" on
            <html>), rather than relying on block auto-margin distribution.
            Both blocks stay RTL/right-aligned internally. NOTE: this
            project's tailwindcss-rtl plugin maps `text-end` to the native
            CSS `text-align: end` keyword, which under dir="rtl" is the
            LEFT edge — `text-start` is the one that renders right-aligned
            here, not `text-end`. */}
        <div className="absolute inset-x-0 top-0 p-5 md:p-8 flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="max-w-lg rounded-2xl border border-white/15 bg-black/60 p-4 text-start shadow-lg backdrop-blur-sm md:p-5"
            >
              <h3 className="font-display font-bold text-white text-2xl md:text-3xl leading-snug text-balance">
                {activeStep.label}
              </h3>
              <p className="mt-3 text-white text-base md:text-lg leading-relaxed text-pretty">
                {activeStep.caption}
              </p>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="max-w-md rounded-2xl border border-white/15 bg-black/60 p-4 text-start shadow-lg backdrop-blur-sm md:p-5"
            >
              <h4 className="font-display font-bold text-white text-2xl md:text-3xl leading-snug">ולמה זה משנה?</h4>
              <p className="mt-3 text-white text-base md:text-lg leading-relaxed text-pretty">{activeStep.insight}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Frame switcher — buttons live within the video's own width. */}
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {STEPS.map((s, i) => {
              const active = step === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  aria-pressed={active}
                  aria-label={s.label}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3.5 py-2 md:px-4 md:py-2.5 backdrop-blur-md transition-all duration-200 ease-snap text-xs md:text-sm font-display font-bold',
                    active
                      ? 'bg-brand-dark border-brand-dark text-white shadow-sm'
                      : 'bg-black/30 border-white/25 text-white/85 hover:bg-black/45 hover:text-white'
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center size-5 rounded-full text-[11px] shrink-0',
                      active ? 'bg-white/25' : 'bg-white/15'
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      </EditableFrame>

      <SoftDivider text="ועכשיו 4 סיפורים אמיתיים מההיסטוריה" />

      <div className="grid gap-5 sm:grid-cols-2">
        {HISTORICAL.map((h, i) => (
          <EditableBlock key={h.headline} id={`history-card-${i}`} label={`כרטיס היסטורי ${i + 1}`}>
            <HistoricalStoryCard
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

function HistoricalStoryCard({
  place,
  headline,
  lesson,
}: {
  place: string;
  headline: ReactNode;
  lesson: ReactNode;
}) {
  return (
    <article className="h-full rounded-2xl border border-tanline-contour/70 bg-paper-bright/75 px-6 py-7 shadow-card-soft sm:px-8 sm:py-8">
      <div className="flex items-start gap-5 sm:gap-7">
        <div className="min-w-0 flex-1">
          <p className="mb-3 text-base font-bold text-olive-ink [word-spacing:-0.03em] sm:text-lg">
            {place}
          </p>
          <h3 className="text-balance font-display text-2xl font-bold leading-snug text-olive-ink sm:text-3xl">
            {headline}
          </h3>
          <div aria-hidden="true" className="mt-4 h-0.5 w-9 rounded-full bg-ember-deep" />
        </div>

        <ImageIcon
          role="img"
          aria-label="מיקום שמור לאיור"
          className="mt-7 size-16 shrink-0 text-olive-ink sm:size-20"
          strokeWidth={1.6}
        />
      </div>

      <p className="mt-4 text-pretty text-base leading-8 text-olive-ink sm:text-lg sm:leading-9">
        {lesson}
      </p>
    </article>
  );
}

function TerrainStage({ feature }: { feature: Feature }) {
  return (
    <div className="relative w-full h-full">
      <SceneOnboardingFramePlayer targetState={feature} />
    </div>
  );
}

function TerrainStageLoading() {
  return (
    <div className="w-full h-full min-h-[280px] flex items-center justify-center">
      <div className="flex items-center gap-2 text-fg-dim text-xs font-display">
        <span className="size-2 rounded-full bg-brand-dark animate-pulse" />
        <span>טוען...</span>
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
