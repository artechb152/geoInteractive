'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { HistoricalCasesPanel } from './HistoricalCasesPanel';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

export type View = 'access' | 'obstacles' | 'cover' | 'concealment';

// Split out via next/dynamic so the frame-player (and its canvas/preload
// logic) doesn't end up in the initial bundle for the rest of the lesson —
// same technology as topic-01/OnboardingScene.tsx.
const SceneOnboardingFramePlayer = dynamic(() => import('./SceneOnboardingFramePlayer'), {
  loading: () => <ManeuverStageLoading />,
});

type Step = {
  id: View;
  label: string;
  icon: IconName;
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'access',
    label: 'האם אנחנו בכלל יכולים לעבור פה?',
    icon: 'truck',
    popupTitle: 'עבִירוּת: השאלה הראשונה לפני שזזים',
    popupBody:
      `לפני שמתכננים מסלול, צריך לשאול שאלה פיזית פשוטה: האם אנחנו והרכבים שלנו מסוגלים בכלל לעבור פה? היכולת הזאת נקראת "עבירות", והיא תלויה בשני דברים עיקריים: עד כמה השטח תלול (השיפוע), ומה סוג האדמה (סלע קשה? חול שוקע? בוץ?). למשל, ג'יפ או משאית ייעצרו בעלייה של 30%, בזמן שטנק (שנע על שרשראות/זחלים) יצליח לטפס גם שיפוע של 60%. מעבר לזה, חול רטוב עלול לבלוע משאית פנימה, ושטח "טרשי" (מלא בסלעים חדים שבולטים החוצה) יקרע לה את הצמיגים. השורה התחתונה: אם השטח לא עביר — אי אפשר לבצע את המשימה.`,
  },
  {
    id: 'obstacles',
    label: 'מה יעצור אותנו בדרך?',
    icon: 'shield',
    popupTitle: 'מכשולים: כשהטבע והאויב משלבים כוחות',
    popupBody:
      'גם אם האדמה נוחה לנסיעה, האויב תמיד ינסה לעצור אותנו. לרוב הוא ייקח מכשול שהטבע יצר (כמו נחל שקשה לחצות) ויוסיף עליו מלכודות משלו: הוא יכול לפזר שדה מוקשים בדיוק על גדת הנחל, לפוצץ גשר, או לחפור תעלה עמוקה שנועדה לעצור טנקים (תעלת נ"ט). השילוב הזה הופך שטח פתוח למעין "מבצר". כדי להתגבר על זה, חיל ההנדסה מפעיל כלים כבדים כדי לפרוץ את הדרך מחדש (פעולה שנקראת בשפה הצבאית "קידום ניידות") — למשל באמצעות נטרול מוקשים, פריצת דרכים חדשות או הנחת גשרים ניידים.',
  },
  {
    id: 'cover',
    label: 'איפה אפשר להסתתר מאש?',
    icon: 'mountain',
    popupTitle: 'מחסה (Cover): מה באמת יכול לעצור כדור?',
    popupBody:
      'בזמן לחימה, מי שנמצא בשטח פתוח וחשוף נמצא בסכנת חיים. לכן, מתכננים מסלול שמדלג בין נקודות "מחסה": סלע ענק, שקע עמוק באדמה, או קיר בטון עבה. מחסה אמיתי חייב להיות עשוי מחומר חזק ועבה מספיק כדי לעצור פיזית כדורים, רסיסים והדף של פיצוץ. להתחבא מאחורי שיח זה ממש לא מחסה. גם גזע עץ דק לא יעזור. רק עצם קשיח וגדול מספיק באמת יספק הגנה וישמור עליכם בחיים.',
  },
  {
    id: 'concealment',
    label: 'מה מסתיר אותנו מהעיניים של האויב?',
    icon: 'eye',
    popupTitle: 'הסתרה (Concealment): להיות רואים ואינם נראים',
    popupBody:
'בניגוד למחסה, הסתרה לא מגינה עלינו מפני פגיעה – היא רק מונעת מהאויב לגלות אותנו. שיח גדול, יער צפוף, ערפל, צל ואפילו קירות דקים במבנה נטוש, יכולים להעלים אותנו מהעין (ואפילו ממצלמות תרמיות שמזהות חום גוף), אבל אף אחד מהם לא יעצור כדור שנירה לעברנו. השילוב המושלם הוא "הסתרה + מחסה": ככה קשה מאוד למצוא אותנו, ואם במקרה התגלינו וירו עלינו – אנחנו מוגנים פיזית מאש.',
  },
];

export function OnboardingScene() {
  const [view, setView] = useState<View>('access');
  const [expandedStep, setExpandedStep] = useState<View | null>('access');

  const handleStepClick = (id: View) => {
    if (expandedStep === id) {
      setExpandedStep(null);
    } else {
      setView(id);
      setExpandedStep(id);
    }
  };

  return (
    <section id="scene-onboarding" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="05.0"
        eyebrow="רגע לפני שמתחילים"
title = {
  <>
    <span className="gradient-text">איך יודעים אם כוח באמת יכול לעבור בשטח?</span>
  </>
}
        intro='עבור רובנו השטח הוא סתם "נוף", אבל מפקד צבאי מסתכל עליו כעל חידה שצריך לפתור. בואו נראה איך מנתחים תא שטח לקראת תנועה (מושג שנקרא בשפה הצבאית "תמרון"), דרך 4 שאלות מפתח – החל מהשאלה הבסיסית ביותר ("האם בכלל אפשר לעבור פה?") ועד לשאלות של חיים ומוות.'
      />

      <div className="grid md:grid-cols-[32fr_68fr] gap-6">
        <div className="space-y-1">
          {STEPS.map((s, i) => {
            const active = view === s.id;
            const expanded = expandedStep === s.id;
            const passed = STEPS.findIndex((x) => x.id === view) > i;
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
                  aria-controls={`t5-onb-panel-${s.id}`}
                  className="w-full p-4 text-start flex items-center gap-3 relative"
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
                    <div className="font-display font-bold leading-tight transition-colors text-black text-lg md:text-xl">{s.label}</div>
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
                      key={`t5-onb-panel-${s.id}`}
                      id={`t5-onb-panel-${s.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20">
                        <div className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
                          {s.popupTitle}
                        </div>
                        <p className="text-base leading-relaxed text-black">
                          {s.popupBody}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="surface-elevated bg-bg-accent relative overflow-hidden min-h-[280px] [&_canvas]:!w-full [&_canvas]:!h-full">
          <SceneOnboardingFramePlayer targetState={view} />
        </div>
      </div>

      <div className="mt-20 mb-12">
        <HistoricalCasesPanel />
      </div>

      <ReadyCallout title="עכשיו אתם מוכנים">
        <p>עכשיו בטח הבנתם שתנועה צבאית בשטח ("תמרון") היא הרבה יותר מסתם "ללכת ממקום למקום" – זה פאזל שלם של החלטות קריטיות. בחלקים הבאים של הקורס נצלול לעומק ונגלה: מה הופך אדמה לנוחה למעבר, איך חיל ההנדסה מתגבר על מכשולים בדרך, איך שורדים במקום פתוח וחשוף, ואיך עצים וצמחייה משנים את כל חוקי המשחק.</p>
      </ReadyCallout>
    </section>
  );
}

function ManeuverStageLoading() {
  return (
    <div className="w-full h-full min-h-[280px] flex items-center justify-center">
      <div className="flex items-center gap-2 text-fg-dim text-xs font-display">
        <span className="size-2 rounded-full bg-brand-dark animate-pulse" />
        <span>טוען...</span>
      </div>
    </div>
  );
}

