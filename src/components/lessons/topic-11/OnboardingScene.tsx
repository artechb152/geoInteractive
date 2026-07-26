'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { IntelCard } from '@/components/lesson/IntelCard';
import { SoftDivider } from '@/components/lesson/SoftDivider';
import {
  StepAccordionItem,
  AccordionSection,
  AccordionKicker,
  AccordionSectionTitle,
  AccordionSectionText,
} from '@/components/lesson/StepAccordion';
import { type IconName } from '@/components/Icon';

type View = 'shape' | 'border' | 'buffer' | 'depth';

type Step = {
  id: View;
  label: string;
  icon: IconName;
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'shape',
    label: 'הצורה — הגיאוגרפיה הבסיסית של המדינה',
    icon: 'globe',
    popupTitle: 'צורת המדינה מכתיבה את הגורל האסטרטגי שלה',
    popupBody:
      'מדינה צרה וארוכה כמו ישראל שונה לחלוטין ממדינה רחבת-ידיים כמו רוסיה. הגיאוגרפיה היא <strong>הגורם המרכזי</strong> שקובע את "הדוקטרינה הצבאית" (תפיסת ההפעלה של הצבא). לדוגמה: מכיוון שישראל צרה מאוד (כ-14 ק"מ באזור השרון), תפיסת הביטחון שלה מחייבת להעביר את הלחימה לשטח האויב כמה שיותר מהר. לעומתה, רוסיה יכולה להרשות לעצמה לספוג פלישה, לסגת לאחור בזכות השטח העצום שלה — ועדיין לנצח.',
  },
  {
    id: 'border',
    label: 'הגבול — היכן שהמדינה נגמרת',
    icon: 'flag',
    popupTitle: 'הקו שעל המפה נראה אחרת לגמרי במציאות',
    popupBody:
      'גבול הוא הרבה יותר מסימון שמפריד בין מדינות — הוא מרחב פיזי ואנושי. גבול שמבוסס על <strong>מכשול טבעי</strong> כמו נהר רחב או שרשרת הרים, מספק הגנה טבעית ויציבות. לעומת זאת, גבול שצויר באופן שרירותי על מפה על ידי פוליטיקאים, מבלי להתחשב בשטח או באוכלוסייה (כמו גבולות הסכם סייקס-פיקו במזרח התיכון) — הופך כמעט תמיד למוקד נפיץ של סכסוכים.',
  },
  {
    id: 'buffer',
    label: 'אזור החיץ — רצועת ההגנה הקדמית',
    icon: 'eye',
    popupTitle: 'השטח שסופג את "המכה הראשונה"',
    popupBody:
      'בין מדינות עוינות נהוג לעיתים להגדיר <strong>אזור חיץ</strong> — רצועת שטח מפורזת (ללא נוכחות צבאית) או מדוללת בכוחות. המטרה שלה כפולה: למנוע חיכוך יומיומי ולספק התרעה מוקדמת במקרה של פלישה (כמו הגבול המתוח בין צפון ודרום קוריאה). כיום, בזכות התפתחות טכנולוגיית האיסוף, אמצעים כמו חיישנים מתקדמים, מכ"מים ולוויינים מספקים "אזור חיץ וירטואלי" שמחליף חלק מהצורך בשטח פיזי גדול.',
  },
  {
    id: 'depth',
    label: 'העומק — המרחב שקונה לנו זמן',
    icon: 'layers',
    popupTitle: 'עומק אסטרטגי שווה זמן תגובה',
    popupBody:
      '<strong>עומק אסטרטגי</strong> הוא המרחק הפיזי בין קו החזית לבין מרכזי האוכלוסייה החשובים של המדינה. עומק כזה מאפשר לצבא מותקף לסגת לאחור, לספוג את המכה, להתארגן מחדש ולתקוף בחזרה, מבלי לסכן את הבירה שלו. היסטורית, מדינות ענק כמו רוסיה השתמשו בשטח שלהן כנשק כדי להתיש אויבים. מדינה חסרת עומק, לעומת זאת, חייבת להסתמך על מודיעין מושלם כדי לזהות איומים מראש. <strong>במילים פשוטות: מרחק פיזי נותן זמן לקבל החלטות.</strong>',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'הצבא הגדול בעולם הובס על ידי הגיאוגרפיה',
    place: 'הפלישה של נפוליאון לרוסיה · 1812',
    lesson: 'נפוליאון יצא לכבוש את רוסיה עם צבא אדיר של 600,000 חיילים. הרוסים בחרו שלא להילחם חזיתית: הם נסוגו לאחור תוך שהם שורפים יבולים ומבנים כדי לא להשאיר אספקה לאויב ("אדמה חרוכה"), ופשוט שאבו את הצבא הצרפתי פנימה. אחרי צעידה של 1,000 ק"מ לתוך החורף הרוסי הקפוא, הצבא הצרפתי קרס. רק כ-30,000 חיילים חזרו הביתה. <strong>העומק המרחבי שימש כאן כנשק קטלני.</strong>',
    icon: 'fuel',
    accent: 'text-accent-cool',
  },
  {
    headline: 'ספגו מכה אנושה – אבל ניצחו בזכות המרחב',
    place: 'הפלישה לרוסיה במלחמת העולם ה-2 · יוני 1941',
    lesson: 'גרמניה הנאצית פלשה עם 3 מיליון חיילים והגיעה עד לשערי מוסקבה תוך 5 חודשים. אולם, בזכות השטח העצום שלה, ברית המועצות פשוט העבירה את כל מפעלי הנשק שלה 1,500 ק"מ מזרחה – הרחק מטווח הפגיעה הגרמני. הצבא נסוג, הרוויח זמן להתארגן, ולבסוף ניצח. <strong>ללא עומק אסטרטגי, ברית המועצות הייתה נמחקת מהמפה ב-1941.</strong>',
    icon: 'truck',
    accent: 'text-accent',
  },
  {
    headline: 'הגבולות המלאכותיים שיצרו סכסוכי נצח',
    place: 'הסכם סייקס-פיקו, המזרח התיכון · 1916',
    lesson: 'בריטניה וצרפת חילקו ביניהן את המזרח התיכון ושירטטו גבולות עם סרגל על המפה. הקווים הישרים הללו חתכו דרך אזורי מחיה של עמים ושבטים, ואיחדו קבוצות עוינות באותה מדינה (למשל בעיראק או בסוריה). אלו גבולות שלא התחשבו במציאות בשטח. <strong>יותר מ-100 שנים עברו, והסכסוכים המדממים באזור הם עדיין תוצאה של אותם קווים.</strong>',
    icon: 'compass',
    accent: 'text-status-warn',
  },
  {
    headline: 'אזור החיץ המתוח ביותר בעולם',
    place: 'האזור המפורז בקוריאה (DMZ) · 1953–היום',
    lesson: 'הרצועה שמפרידה בין קוריאה הצפונית לדרומית היא שטח ברוחב 4 ק"מ ואורך 250 ק"מ. היא מלאה בשני מיליון מוקשים ומוקפת באלפי חיילים משני הצדדים. למרות המתח האדיר, כאזור חיץ היא עובדת ומייצרת הפרדה פיזית: מאז 1953, לא פרצה שם מלחמה גלויה נוספת. <strong>זו ההוכחה ששטח הפרדה יכול למנוע הסלמה.</strong>',
    icon: 'shield',
    accent: 'text-status-danger',
  },
];

export function OnboardingScene() {
  const [view, setView] = useState<View>('shape');
  const [expandedStep, setExpandedStep] = useState<View | null>('shape');

  const handleStepClick = (id: View) => {
    if (expandedStep === id) {
      setExpandedStep(null);
    } else {
      setView(id);
      setExpandedStep(id);
    }
  };

  return (
    <section id="scene-onboarding" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="11.0"
        eyebrow="לפני שמתחילים"
title = {
  <>
    <span className="text-accent-hover">הגיאוגרפיה של המדינה</span> מכתיבה את דרך הלחימה שלה
  </>
}
        intro="כל מדינה קיימת קודם כל במרחב הפיזי. הצורה הגיאוגרפית שלה – עוד לפני פוליטיקה, היסטוריה או טכנולוגיה – היא הגורם המרכזי שקובע כיצד ניתן להגן עליה ואיך יופעל הצבא שלה. בואו נפרק את הגיאוגרפיה של המדינה ל-4 שכבות בסיסיות: מהצורה הכללית ועד למרחב ההגנה שלה."
      />

      <div className="grid md:grid-cols-[2fr_3fr] gap-6 items-start">
        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const active = view === s.id;
            const expanded = expandedStep === s.id;
            const passed = STEPS.findIndex((x) => x.id === view) > i;
            return (
              <StepAccordionItem
                key={s.id}
                index={i}
                label={s.label}
                active={active}
                expanded={expanded}
                passed={passed}
                onToggle={() => handleStepClick(s.id)}
                panelId={`t11-onb-panel-${s.id}`}
              >
                <AccordionSection>
                  <AccordionKicker>למה זה משנה</AccordionKicker>
                  <AccordionSectionTitle>{s.popupTitle}</AccordionSectionTitle>
                  <AccordionSectionText dangerousHtml={s.popupBody} />
                </AccordionSection>
              </StepAccordionItem>
            );
          })}
        </div>

        <div className="surface-elevated bg-bg relative overflow-hidden aspect-video min-h-[320px]">
          <CountryStage view={view} />
        </div>
      </div>

      <SoftDivider text="4 שיעורי היסטוריה על צורת מדינה" />

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

      <ReadyCallout title="סיכום ביניים: הגיאוגרפיה מכתיבה את הכללים">
        <p>עכשיו ברור למה הגיאוגרפיה של המדינה היא הרבה יותר מנתון יבש — היא מה שמכתיב את היכולת שלה לשרוד. בשלבים הבאים נצלול אל "העיניים של הצבא" ונראה כיצד מערך המודיעין:
            <strong className="text-fg"> מנתח את השטח בעזרת חיישנים ומודלים תלת-ממדיים (GEOINT), מזהה מטרות מעבר לגבול (SAR/תרמי), ומשתמש במידע גלוי ברשת כדי להשלים את התמונה (OSINT)</strong>.</p>
      </ReadyCallout>
    </section>
  );
}

function CountryStage({ view }: { view: View }) {
  const showBorder = view !== 'shape';
  const showBuffer = view === 'buffer' || view === 'depth';
  const showDepth = view === 'depth';

  return (
    <div className="relative w-full h-full bg-bg-accent">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <rect x="0" y="0" width="100" height="75" className="fill-bg-accent" />

        {/* Country shape */}
        <motion.path
          d="M 30 15 L 65 12 L 72 22 L 70 42 L 65 60 L 55 68 L 35 66 L 28 50 L 30 30 Z"
          className="fill-terrain-ridge/30 stroke-terrain-ridge"
          strokeWidth="0.4"
          initial={false}
          animate={{ opacity: 1 }}
        />

        {/* Capital / heartland */}
        <g>
          <circle cx="48" cy="38" r="2" className="fill-accent" />
          <circle cx="48" cy="38" r="4" fill="none" className="stroke-accent/50" strokeWidth="0.3">
            <animate attributeName="r" values="3;6;3" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <text x="48" y="34" textAnchor="middle" className="fill-accent font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
            לב המדינה
          </text>
        </g>

        {/* Border highlight */}
        <motion.path
          d="M 30 15 L 65 12 L 72 22 L 70 42 L 65 60 L 55 68 L 35 66 L 28 50 L 30 30 Z"
          fill="none"
          className="stroke-accent-hot"
          strokeWidth="0.7"
          strokeDasharray="2 1.2"
          initial={false}
          animate={{ opacity: showBorder ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        />

        {/* Border-side threats */}
        <motion.g initial={false} animate={{ opacity: showBorder ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          {[
            { x: 72, y: 25 },
            { x: 65, y: 62 },
            { x: 30, y: 60 },
            { x: 28, y: 25 },
          ].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="1.4" className="fill-accent-hot" />
          ))}
          <text x="78" y="20" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
            איומים
          </text>
        </motion.g>

        {/* Buffer zone — area within border */}
        <motion.g initial={false} animate={{ opacity: showBuffer ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <path
            d="M 34 18 L 62 15 L 68 24 L 66 41 L 62 57 L 53 63 L 37 61 L 31 49 L 33 32 Z"
            fill="none"
            className="stroke-status-warn"
            strokeWidth="0.5"
            strokeDasharray="1.5 1"
            opacity="0.7"
          />
          <text x="50" y="22" textAnchor="middle" className="fill-status-warn font-display font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
            אזור חיץ
          </text>

          {/* Sensors along the buffer */}
          {[
            { x: 50, y: 14 },
            { x: 67, y: 28 },
            { x: 65, y: 55 },
            { x: 35, y: 60 },
            { x: 29, y: 35 },
          ].map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="0.5" className="fill-accent-cool" />
              <circle cx={p.x} cy={p.y} r="1.5" fill="none" className="stroke-accent-cool" strokeWidth="0.2" opacity="0.6" />
            </g>
          ))}
        </motion.g>

        {/* Strategic depth — interior layers */}
        <motion.g initial={false} animate={{ opacity: showDepth ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          {/* Concentric depth rings inside the country */}
          {[8, 16, 24].map((shrink, i) => (
            <path
              key={i}
              d="M 30 15 L 65 12 L 72 22 L 70 42 L 65 60 L 55 68 L 35 66 L 28 50 L 30 30 Z"
              fill="none"
              className="stroke-accent"
              strokeWidth="0.35"
              opacity={0.5 - i * 0.12}
              transform={`scale(${1 - shrink / 100}) translate(${shrink / 2}, ${shrink / 2})`}
              style={{ transformOrigin: '48px 38px' }}
            />
          ))}
          <text x="48" y="65" textAnchor="middle" className="fill-accent font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
            עומק = מרחב התארגנות ונסיגה
          </text>
        </motion.g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        אותה מדינה · 4 שכבות של ניתוח מרחבי
      </div>
    </div>
  );
}
