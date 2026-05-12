'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { IntelCard } from '@/components/lesson/IntelCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

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
    label: 'הצורה — הגיאוגרפיה של המדינה',
    icon: 'globe',
    popupTitle: 'הצורה של המדינה היא גורל אסטרטגי',
    popupBody:
      'מדינה צרה וארוכה (צ\'ילה, ישראל) שונה לחלוטין ממדינה רחבה (רוסיה, ארה"ב). הגיאוגרפיה — לא ההיסטוריה — היא <strong>הגורם הראשון</strong> שקובע את הדוקטרינה הצבאית. ישראל ברוחב 14 ק"מ חייבת להעביר מלחמה לשטח האויב. רוסיה ברוחב 9,000 ק"מ יכולה לאבד מוסקבה ולחזור לנצח.',
  },
  {
    id: 'border',
    label: 'הקו — איפה המדינה נגמרת',
    icon: 'flag',
    popupTitle: 'הקו על המפה הוא לא קו במציאות',
    popupBody:
      'גבול הוא לא רק סימון מדיני. הוא מרחב פיזי, גיאוגרפי, אנושי. גבול שעובר לאורך <strong>מכשול טבעי</strong> (נהר, רכס) הוא יציב והגנה טבעית. גבול שצויר על מפה במשרד פוליטי בפריז ב-1916 (סייקס-פיקו) — מקור חיכוך תמידי. הקו קובע מי הסכסוך הבא.',
  },
  {
    id: 'buffer',
    label: 'אזור החיץ — קו הזיהוי הקדמי',
    icon: 'eye',
    popupTitle: 'הרצועה שסופגת את המכה הראשונה',
    popupBody:
      'בין שתי מדינות עוינות לעיתים יש <strong>אזור חיץ</strong> — רצועה מפורזת או דלילה בכוחות. תפקידה: לקלוט את המכה הראשונה, לספק התרעה מוקדמת, להפחית חיכוך. <strong>DMZ הקוריאני</strong> פעיל מ-1953. <strong>UNDOF בגולן</strong> מ-1974. היום, חיישנים, גדרות חכמות ורדאר מחליפים חלק מהעומק הפיזי.',
  },
  {
    id: 'depth',
    label: 'העומק — המרחב שמרוויח זמן',
    icon: 'layers',
    popupTitle: 'עומק אסטרטגי = זמן',
    popupBody:
      '<strong>עומק אסטרטגי</strong> הוא המרחק שכוח צבאי יכול לסגת אליו, להתארגן, ולנהל מערכה הרחק מערי הבירה. נפוליאון התקדם עד מוסקבה — אבל איבד 90% מהצבא בדרך. רוסיה ניצחה ע"י העומק שלה. לעומת זאת, מדינה צרה חייבת לתקוף לפני שמתקיפים אותה. <strong>עומק = זמן לקבל החלטה.</strong>',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'הצבא הגדול בעולם נחנק בעומק',
    place: 'נפוליאון ברוסיה · 1812',
    lesson: 'נפוליאון יצא עם 600,000 חיילים לכיוון מוסקבה. הרוסים לא נלחמו — הם נסוגו, שרפו הכל, וניצלו את העומק הגיאוגרפי כנשק. אחרי 1,000 ק"מ ועוד חורף קשה, רק 30,000 חיילים חזרו לפריז. <strong>העומק הוא נשק.</strong>',
    icon: 'fuel',
    accent: 'text-accent-cool',
  },
  {
    headline: 'איבדו את העיר הראשונה — אבל ניצחו',
    place: 'מבצע ברברוסה, ברה"מ · יוני 1941',
    lesson: 'גרמניה פלשה עם 3 מיליון חיילים והגיעה עד שערי מוסקבה תוך 5 חודשים. אבל ברה"מ הזיזה את התעשייה שלה 1,500 ק"מ מזרחה — מאחורי הרי אורל. הצבא נסוג, התארגן מחדש, ובסוף ניצח. <strong>בלי עומק, ברה"מ הייתה נכבשת ב-1941.</strong>',
    icon: 'truck',
    accent: 'text-accent',
  },
  {
    headline: 'הגבולות שיצרו את הסכסוכים',
    place: 'סייקס-פיקו, המזרח התיכון · 1916',
    lesson: 'בריטניה וצרפת שירטטו גבולות במזרח התיכון על מפה — לפי קווים ישרים, בלי קשר לשבטים, דתות וטופוגרפיה. עיראק, סוריה, ירדן — כולן מדינות "מלאכותיות" עם גבולות שלא חופפים לקבוצות האתניות. <strong>110 שנה אחר כך, החיכוך עדיין שם.</strong>',
    icon: 'compass',
    accent: 'text-status-warn',
  },
  {
    headline: 'אזור חיץ הכי אקטיבי בעולם',
    place: 'DMZ קוריאני · 1953–היום',
    lesson: 'הרצועה המפורזת בין שתי קוריאות פעילה 70+ שנה. 4 ק"מ רוחב, 250 ק"מ אורך. שני מיליון מוקשים, אלפי חיילים משני הצדדים. אזור חיץ מצליח: מאז 1953 לא הייתה מלחמה גלויה. <strong>הקו פוסט-מציאותי שעובד.</strong>',
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
        title={
          <>
            איך <span className="gradient-text">צורת מדינה</span> קובעת את הדוקטרינה הצבאית
          </>
        }
        intro="כל מדינה היא צורה גיאוגרפית. הצורה הזו — לפני ההיסטוריה, לפני הצבא, לפני הפוליטיקה — היא הגורם הראשון שקובע איך אפשר להגן עליה. בוא נראה ב-4 שכבות מההצורה ועד לעומק האסטרטגי."
      />

      <div className="grid md:grid-cols-[2fr_3fr] gap-6 items-start">
        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const active = view === s.id;
            const expanded = expandedStep === s.id;
            const passed = STEPS.findIndex((x) => x.id === view) > i;
            return (
              <div
                key={s.id}
                className={cn(
                  'surface overflow-hidden transition-colors',
                  active
                    ? 'border-accent shadow-glow bg-accent/5'
                    : 'hover:border-border-strong',
                  passed && !active && 'opacity-80'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleStepClick(s.id)}
                  aria-expanded={expanded}
                  aria-controls={`t11-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t11-onb-bar"
                      className="absolute inset-y-0 end-0 w-1 bg-accent rounded-l-full"
                    />
                  )}
                  <span
                    className={cn(
                      'size-9 rounded-xl flex items-center justify-center shrink-0 transition-all',
                      active ? 'bg-accent text-bg shadow-glow' : passed ? 'bg-status-ok/15 text-status-ok' : 'bg-bg-accent text-fg-muted'
                    )}
                  >
                    {passed && !active ? (
                      <Icon name="check" size={16} strokeWidth={2.5} />
                    ) : (
                      <span className="font-mono text-sm font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={cn('font-medium leading-tight', active && 'text-accent')}>{s.label}</div>
                  </div>
                  <Icon
                    name={s.icon}
                    size={20}
                    className={cn('transition-colors shrink-0', active ? 'text-accent' : 'text-fg-dim')}
                  />
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', expanded ? 'text-accent' : 'text-fg-dim')}
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
                      key={`t11-onb-panel-${s.id}`}
                      id={`t11-onb-panel-${s.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-accent/20">
                        <div className="text-sm font-display font-semibold text-accent-hover mt-3 mb-2 tracking-wider">
                          למה זה משנה
                        </div>
                        <h4 className="font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2">
                          {s.popupTitle}
                        </h4>
                        <p
                          className="text-sm leading-relaxed text-fg-muted text-pretty"
                          dangerouslySetInnerHTML={{ __html: s.popupBody }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="surface-elevated relative overflow-hidden sticky top-6">
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

      <ReadyCallout title="עכשיו אתה מוכן">
        <p>הבנת שצורת מדינה זה לא נושא לתשבץ — זה גורל אסטרטגי. בשלוש הסצנות הבאות נצלול:
            <strong className="text-fg"> איך עומק אסטרטגי משנה דוקטרינה, איך עובד אזור חיץ, ולמה גבול טבעי שונה מגבול מלאכותי</strong>.</p>
      </ReadyCallout>
    </section>
  );
}

function CountryStage({ view }: { view: View }) {
  const showBorder = view !== 'shape';
  const showBuffer = view === 'buffer' || view === 'depth';
  const showDepth = view === 'depth';

  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          <linearGradient id="ground-11" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f5f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" fill="url(#ground-11)" />

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
            עומק = שכבות נסיגה
          </text>
        </motion.g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        אותה מדינה · 4 שכבות הסתכלות
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
