'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { IntelCard } from '@/components/lesson/IntelCard';
import { SoftDivider } from '@/components/lesson/SoftDivider';
import {
  StepAccordionItem,
  AccordionSection,
  AccordionSectionLabel,
  AccordionSectionText,
} from '@/components/lesson/StepAccordion';
import { type IconName } from '@/components/Icon';
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
              <StepAccordionItem
                key={s.id}
                index={i}
                label={s.label}
                active={active}
                expanded={expanded}
                passed={passed}
                onToggle={() => handleStepClick(s.id)}
                panelId={`step-panel-${s.id}`}
              >
                <AccordionSection>
                  <AccordionSectionLabel>מה קורה בשלב הזה?</AccordionSectionLabel>
                  <AccordionSectionText>{s.caption}</AccordionSectionText>
                </AccordionSection>
                <AccordionSection bordered>
                  <AccordionSectionLabel>ולמה זה משנה?</AccordionSectionLabel>
                  <AccordionSectionText>{s.insight}</AccordionSectionText>
                </AccordionSection>
              </StepAccordionItem>
            );
          })}
        </EditableBlock>

        {/* Visualization — second child → LEFT in RTL. EditableFrame (not
            EditableBlock) so it doesn't add a wrapper div. */}
        <EditableFrame id="visual-frame" label="סרטון תצוגה">
        <div className="surface-elevated bg-bg relative overflow-hidden aspect-video min-h-[320px] [&_video]:!w-full [&_video]:!h-full">
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
