'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { IntelCard } from '@/components/lesson/IntelCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'flat',
    label: 'שטח פתוח (בלי מכשולים)',
    caption: 'אין הרים, אין נהרות. שני הצבאות יכולים פשוט ללכת ישר זה לעבר זה. שום דבר בשטח לא עוזר ולא מפריע לאף אחד.',
    insight: 'בלי השפעה של השטח, מי שיגבר הוא מי שיש לו יותר חיילים, נשק טוב יותר או אימון טוב יותר. כלומר: כוח מול כוח, ניקוד טהור.',
    popupTitle: 'שטח פתוח: כוח מול כוח',
    popupBody:
      'בשטח פתוח וחלק, בלי הרים או נהרות שיפריעו, שני הצבאות פשוט צועדים ישירות אחד מול השני. כשאין לטופוגרפיה שום השפעה, הקרב הופך למתמטיקה פשוטה של כוח מול כוח: מי שיש לו יותר חיילים, נשק מתקדם יותר או אימון טוב יותר – הוא זה שינצח.',
  },
  {
    id: 'mountain',
    label: 'הוספת הר',
    caption: 'פתאום יש מכשול. אי אפשר ללכת ישר יותר — חייבים לעקוף מימין או משמאל. מי שמטפס לראש ההר ראשון רואה את כל מי שזז למטה.',
    insight: 'מי שמחזיק את הנקודה הגבוהה ביותר רואה את האויב ראשון, יורה אליו ראשון, וקשה מאוד לתקוף אותו מלמטה. זאת הסיבה שצבאות תמיד נלחמים על פסגות.',
    popupTitle: 'הר באמצע: מי שלמעלה — מנצח',
    popupBody:
      'ברגע שיש הר במרכז המפה, חוקי המשחק משתנים. הצבא שיגיע ראשון לפסגה מרוויח יתרון עצום: הוא רואה את כל השטח, קל לו יותר לירות כלפי מטה, ויש לו מחסה טבעי. פתאום, מספיק כוח קטן שתפס את הגובה כדי לבלום צבא גדול שמתעייף וחשוף לגמרי בזמן שהוא מנסה לטפס אליו.',
  },
  {
    id: 'river',
    label: 'הוספת נהר',
    caption: 'טנקים, משאיות ותותחים לא יכולים פשוט לחצות נהר בשחייה. הם חייבים גשר. ואם יש רק גשר אחד — כל הצבא חייב להצטופף ולעבור דרכו.',
    insight: 'מי ששולט בגשר היחיד — שולט בכל הקרב. אפילו קבוצה קטנה של 50 חיילים, אם היא חוסמת או מפוצצת את הגשר, יכולה לעצור צבא של עשרות אלפים.',
    popupTitle: 'נהר חוצה: חומת מים',
    popupBody:
      "נהר מתפקד כמו חומת מים שמחסלת את מהירות ההתקפה. אי אפשר פשוט להסתער – הצבא התוקף חייב לעצור, לחפש גשר או לחצות את המים באטיות. בזמן החצייה החיילים תקועים, צפופים ופגיעים לחלוטין. זה נותן לצד השני הזדמנות פז לחכות מוגן בגדה ממול, ולתקוף בדיוק כשהאויב חסר אונים.",
  },
  {
    id: 'narrow',
    label: 'צמצום המעבר',
    caption: 'הוספנו שני רכסי הרים בצדדים. עכשיו המעבר באמצע הצטמצם לסדק. צבא של 10,000 חיילים נאלץ לעבור אחד מאחורי השני — לא 1,000 בשורה אלא 50, חשופים מכל צד.',
    insight: 'כשהמרחב הצר מאלץ אותך להצטופף בטור — היתרון המספרי שלך נעלם. כוח קטן עם נשק טוב יכול לעצור צבא ענק. זאת הסיבה שכל מפקד מחפש את "נקודות החנק" של האויב.',
    popupTitle: "צוואר בקבוק: היתרון המספרי נמחק",
    popupBody:
      "כשהשטח נסגר למעבר צר ויוצר 'צוואר בקבוק', היתרון של צבא גדול פשוט נמחק. אי אפשר לדחוף מאות טנקים או חיילים בבת אחת למעבר, והם נאלצים להידחס בטור ארוך ואיטי. ככה בדיוק כוח קטן שמחכה ביציאה יכול לעצור אימפריה שלמה, פשוט כי הוא מכריח אותה להילחם מולו 'בתורות'.",
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
    <section id="scene-onboarding" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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

      <div className="grid lg:grid-cols-[2fr_3fr] gap-6">
        {/* Accordion — first child → RIGHT in RTL (text on right) */}
        <Accordion
          type="single"
          collapsible
          value={expandedStep ?? ''}
          onValueChange={(v) => {
            setExpandedStep((v as Feature) || null);
            if (v) setStep(v as Feature);
          }}
          className="space-y-3"
        >
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const passed = STEPS.findIndex((x) => x.id === step) > i;
            return (
              <AccordionItem
                key={s.id}
                value={s.id}
                className={cn(
                  'transition-all duration-300 ease-snap',
                  active
                    ? 'border-brand/45 bg-bg-elevated'
                    : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                  passed && !active && 'opacity-85'
                )}
              >
                <AccordionTrigger>
                  {active && (
                    <motion.span
                      layoutId="active-step-bar"
                      className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
                    />
                  )}
                  <span
                    className={cn(
                      'size-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      active && 'bg-brand-dark text-bg-elevated border-brand-dark',
                      passed && !active && 'bg-status-ok/15 text-status-ok border-status-ok/30',
                      !active && !passed && 'bg-bg-accent text-fg-muted border-border'
                    )}
                  >
                    {passed && !active ? (
                      <Icon name="check" size={16} strokeWidth={2.5} />
                    ) : (
                      <span className="font-display text-sm font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        'font-display font-semibold leading-tight transition-colors',
                        active ? 'text-fg' : 'text-fg'
                      )}
                    >
                      {s.label}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="mt-3" />
                  <h4 className="font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2 text-fg">
                    {s.popupTitle}
                  </h4>
                  <p className="text-sm leading-relaxed text-fg-muted text-pretty">
                    {s.popupBody}
                  </p>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Visualization — second child → LEFT in RTL.
            Card bg is set to match the SVG's own ground colour so any
            uncovered area (when the grid stretches the card taller than
            the SVG's natural aspect) reads as one continuous surface
            instead of leaving cream bands. */}
        <div className="surface-elevated bg-bg-accent/30 relative overflow-hidden min-h-[280px]">
          <TerrainStage feature={step} />
        </div>
      </div>

      <SoftDivider text="ועכשיו 4 סיפורים אמיתיים מההיסטוריה" />

      <div className="grid sm:grid-cols-2 gap-4">
        {HISTORICAL.map((h, i) => (
          <IntelCard
            key={h.headline}
            place={h.place}
            headline={h.headline}
            lesson={h.lesson}
            icon={h.icon}
            accent={h.accent}
          />
        ))}
      </div>

      <ReadyCallout title="עכשיו אתם מוכנים">
        <p>הבנתם את ההיגיון? מעולה. כל מה שראיתם עכשיו מבוסס על אינסטינקט בריא. בצבא, לאינסטינקטים האלה יש שמות, חוקים והגדרות. עכשיו ניקח את ההיגיון שלכם ונתרגם אותו לשפה שבה גנרלים מתכננים מלחמות. נתחיל מהבסיס: שלוש הרמות של המלחמה
            <strong className="text-fg"> שלוש הרמות שבהן צבא חושב על מלחמה</strong>.</p>
      </ReadyCallout>

    </section>
  );
}

function TerrainStage({ feature }: { feature: Feature }) {
  return (
    <div className="relative w-full h-full">
      {/* WebGL scene. The Canvas renders transparent so the parent
          card's cream tint reads through any uncovered margin. */}
      <TerrainCanvas feature={feature} />

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-xs text-fg-muted pointer-events-none">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        לחץ על שלב מימין — נבנה את השטח יחד, צעד אחר צעד
      </div>
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
      <span className="text-sm font-display font-semibold text-fg-muted tracking-wider">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
