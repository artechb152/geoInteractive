'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { IntelCard } from '@/components/lesson/IntelCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type View = 'street' | 'commander' | 'vertical' | 'underground';

type Step = {
  id: View;
  label: string;
  icon: IconName;
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'street',
    label: 'הרחוב — מה אזרח רואה',
    icon: 'eye',
    popupTitle: 'תמונה אזרחית: עיר רגילה',
    popupBody:
      'בעין של אזרח: בניינים, חנויות, רחובות, ואנשים. המוח שלנו רואה את העיר כסביבת חיים — מקום עם פינות נחמדות לקפה וכאלה שפחות נחמדות לחנייה. <strong>אבל בעין של מפקד צבאי</strong>, כל אחד מהדברים האלה הופך למשהו אחר לגמרי: סכנה, מקום מסתור, או הזדמנות טקטית. אותו רחוב — שני עולמות שונים לחלוטין.',
  },
  {
    id: 'commander',
    label: 'אופקי — מה מפקד רואה',
    icon: 'crosshair',
    popupTitle: 'המורפולוגיה האופקית — קווי ראייה',
    popupBody:
      'בניגוד לשטח פתוח, בעיר אי אפשר לראות רחוק. <strong>הקרבות מתנהלים מטווח אפס, פנים אל פנים.</strong> רחובות ישרים וארוכים (כמו במנהטן למשל) מקלים על הניווט, אבל הופכים כוחות צבא למטרה קלה לירי לכל אורך הרחוב. לעומת זאת, סמטאות צפופות ומפותלות (כמו בעיר העתיקה) מונעות ירי ממרחק, אבל קל מאוד ללכת בהן לאיבוד. <strong>צורת העיר מכתיבה את צורת הלחימה.</strong>',
  },
  {
    id: 'vertical',
    label: 'אנכי — האיומים מעל',
    icon: 'mountain',
    popupTitle: 'הממד האנכי — "גבעות בטון"',
    popupBody:
      'מגדלים בעיר הם כמו הרים בשטח. מי שתופס את הגג של בניין בן 30 קומות שולט על כל האזור. <strong>האיום מגיע מלמעלה:</strong> צלפים ומחבלים שיורים טילי נ"ט (נגד טנקים) עלולים לפגוע בחלק העליון של הטנק — שזו הנקודה הכי פגיעה שלו. הלחימה בעיר היא בתלת-ממד: החיילים לא צריכים להסתכל רק ימינה ושמאלה, אלא תמיד גם למעלה ולמטה.',
  },
  {
    id: 'underground',
    label: 'תת-קרקעי — הצד השני של המפה',
    icon: 'layers',
    popupTitle: 'המנהרות — מלחמה ב-GPS-Denied',
    popupBody:
      'מתחת לאדמה מסתתר עולם שלם: חניונים תת-קרקעיים, מערכות ביוב ומנהרות לחימה. <strong>מתחת לאדמה ה-GPS לא עובד</strong> (מפני שהאדמה חוסמת את הקליטה) <strong>וגם מכשירי הקשר בקושי מתפקדים</strong>. רחפנים ומטוסים לא יכולים לראות מבעד לאדמה, מה שמאפשר לאויב לנוע בחשאי, להפתיע את הצבא מאחור, ולהגיח ממקומות לא צפויים.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'מ-300 אלף חיילים ל-90 אלף בקרב על עיר אחת',
    place: 'סטלינגרד · אוגוסט 1942 — פברואר 1943',
    lesson: 'הצבא הגרמני נכנס לסטלינגרד עם 300,000 חיילים. אחרי שישה חודשים של לחימה עיקשת מבית לבית, הכוח הצטמצם ל-90,000 חיילים בלבד, שלבסוף נכנעו. סטלינגרד הפך לסמל של קרב עירוני: זה היה הקרב הראשון שהוכיח שעיר יכולה "לבלוע" צבא ענק שלם — לא בקרב גדול אחד, אלא באלפי היתקלויות קטנות של מטרים בודדים.',
    icon: 'capital',
    accent: 'text-status-danger',
  },
  {
    headline: 'מסוק נופל — וכל המבצע משתנה',
    place: 'מוגדישו, סומליה · אוקטובר 1993',
    lesson: 'כוח קומנדו אמריקאי נכנס לעיר מוגדישו למבצע מהיר ללכידת מנהיג מקומי. הכל השתבש כשמסוק שלהם הופל על ידי טיל כתף. תוך שעות, הכוח המבודד מצא את עצמו מוקף ונלחם על חייו מול אלפי מקומיים חמושים בסביבה עירונית צפופה. מה שהתחיל כמבצע "כירורגי פשוט" הפך לאסון, והוכיח כמה מהר המצב בעיר יכול לצאת משליטה כשאין סיוע כבד ומעטפת אווירית.',
    icon: 'plane',
    accent: 'text-accent-hot',
  },
  {
    headline: 'מנהרות שלמו מתחת לעיר עתיקה',
    place: 'מוסול, עיראק · 2016–17',
    lesson: 'ארגון דאעש שלט בעיר מוסול בזכות רשת עצומה של מנהרות. הצבא העיראקי נזקק ל-9 חודשים שלמים כדי לשחרר את העיר! כמעט תחת כל בניין חיכתה מנהרת מילוט, ובכל פינה הוחבאו מטעני חבלה. המנהרות איפשרו למחבלים להגיח מאחורי הכוחות התוקפים וליצור מלכודות קטלניות.',
    icon: 'layers',
    accent: 'text-accent',
  },
  {
    headline: 'בתי חולים בתוך אזור לחימה',
    place: 'עזה · 2023 ואילך',
    lesson: 'במלחמת "חרבות ברזל", העולם נחשף לכך שחמאס הסתיר תשתיות טרור, מנהרות ומפקדות מתחת למתקנים אזרחיים כמו בתי חולים ובתי ספר. המציאות הזו יוצרת עבור צה"ל דילמה קשה: איך משמידים את האויב, מבלי לפגוע באזרחים חפים מפשע שמסתתרים מעליו? זוהי דוגמה חיה לאופן שבו חוקי המלחמה מתנגשים עם מציאות הלחימה בשטח.',
    icon: 'shield',
    accent: 'text-status-warn',
  },
];

export function OnboardingScene() {
  const [view, setView] = useState<View>('street');
  const [expandedStep, setExpandedStep] = useState<View | null>('street');

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
        step="10.0"
        eyebrow="לפני שמתחילים"
title = {
  <>
    העיר היא לא רחוב — היא <span className="text-accent-hover">זירת לחימה ב-360 מעלות</span>
  </>
}
        intro="הלחימה בעיר היא לא לחימה ברחוב שטוח, אלא בתוך 'קוביית רוביק' תלת-ממדית שמלאה באיומים מכל כיוון. מפקד שלא יבין זאת – ייקלע מהר מאוד לאסון. בואו נפרק את העיר ל-4 שכבות ונראה איך אותו רחוב בדיוק נראה שונה לגמרי, תלוי מי מסתכל עליו."
      />

      <div className="grid md:grid-cols-[2fr_3fr] gap-6">
        <div className="space-y-3">
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
                  aria-controls={`t10-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t10-onb-bar"
                      className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
                    />
                  )}
                  <span
                    className={cn(
                      'size-9 rounded-[3px] flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
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
                    <div className={cn('font-display font-semibold leading-tight transition-colors text-fg')}>{s.label}</div>
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
                      key={`t10-onb-panel-${s.id}`}
                      id={`t10-onb-panel-${s.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20">
                        <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-brand-dark mt-3 mb-2.5">
                          <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                          למה זה משנה
                        </div>
                        <h4 className="font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2">
                          {s.popupTitle}
                        </h4>
                        <p
                          className="text-sm leading-relaxed text-fg-muted text-pretty"
                          dangerouslySetInnerHTML={{ __html: s.popupBody.replace(/{' '}/g, ' ') }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="surface-elevated bg-bg relative overflow-hidden min-h-[280px]">
          <CityStage view={view} />
        </div>
      </div>

      <SoftDivider text="ההיסטוריה האורבנית · 4 קרבות שעיצבו את הדוקטרינה" />

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
        <p>עכשיו כשהבנו שהעיר היא לא משטח ישר אלא "קוביית רוביק", אפשר לצלול פנימה! בחלקים הבאים נגלה:
            <strong className="text-fg"> למה רחובות ישרים מסוכנים באותה מידה כמו סמטאות צפופות, איך מנהלים קרב ב-360 מעלות, ולמה נוכחות של אזרחים היא האתגר הכי גדול של הצבא</strong>.</p>
      </ReadyCallout>
    </section>
  );
}

function CityStage({ view }: { view: View }) {
  const showCommander = view !== 'street';
  const showVertical = view === 'vertical' || view === 'underground';
  const showUnderground = view === 'underground';

  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          <linearGradient id="sky-10" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dde6f0" />
            <stop offset="100%" stopColor="#f0f4f9" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" fill="url(#sky-10)" />

        {/* Ground line */}
        <line x1="0" y1="56" x2="100" y2="56" className="stroke-fg-dim" strokeWidth="0.3" />

        {/* Buildings (always visible base) */}
        {[
          { x: 8,  w: 9, h: 18, floors: 4 },
          { x: 20, w: 7, h: 28, floors: 7 },
          { x: 30, w: 11, h: 22, floors: 5 },
          { x: 44, w: 8, h: 36, floors: 9 },
          { x: 56, w: 9, h: 20, floors: 5 },
          { x: 68, w: 11, h: 32, floors: 8 },
          { x: 82, w: 9, h: 24, floors: 6 },
        ].map((b, i) => (
          <g key={i}>
            <rect
              x={b.x}
              y={56 - b.h}
              width={b.w}
              height={b.h}
              className="fill-terrain-ridge/40 stroke-terrain-ridge"
              strokeWidth="0.2"
            />
            {/* Windows */}
            {Array.from({ length: b.floors }).map((_, f) => (
              <rect
                key={f}
                x={b.x + 1}
                y={56 - b.h + 2 + f * (b.h / (b.floors + 0.5))}
                width={b.w - 2}
                height="1.2"
                className="fill-accent-cool"
                opacity="0.45"
              />
            ))}
          </g>
        ))}

        {/* Street level (civilian view): vehicles, people */}
        <motion.g initial={false} animate={{ opacity: view === 'street' ? 1 : 0.35 }} transition={{ duration: 0.4 }}>
          {/* Cars */}
          <rect x="38" y="59" width="4" height="1.6" rx="0.3" className="fill-accent-cool/70" />
          <rect x="50" y="59" width="4" height="1.6" rx="0.3" className="fill-accent-cool/70" />
          {/* People */}
          {[18, 28, 60, 75].map((x, i) => (
            <circle key={i} cx={x} cy="60" r="0.6" className="fill-fg/60" />
          ))}
          <text x="50" y="70" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
            רחוב רגיל · עיר חיה
          </text>
        </motion.g>

        {/* Commander view: line-of-sight breaks + enfilade arrow */}
        <motion.g initial={false} animate={{ opacity: showCommander ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          {/* Enfilade arrow along a long street */}
          <line x1="2" y1="58" x2="95" y2="58" className="stroke-status-warn" strokeWidth="0.5" strokeDasharray="2 1" />
          <polygon points="93,57 96,58 93,59" className="fill-status-warn" />
          <text x="50" y="55" textAnchor="middle" className="fill-status-warn font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
            Enfilade · אש לאורך ציר
          </text>

          {/* Sight cone breakpoints */}
          {[28, 56, 80].map((x, i) => (
            <g key={i}>
              <circle cx={x} cy="56" r="1.5" fill="none" className="stroke-status-danger" strokeWidth="0.3" strokeDasharray="0.5 0.3" />
              <line x1={x - 1.1} y1="54.9" x2={x + 1.1} y2="57.1" className="stroke-status-danger" strokeWidth="0.4" />
            </g>
          ))}
        </motion.g>

        {/* Vertical threats: rooftop snipers + AT firing down */}
        <motion.g initial={false} animate={{ opacity: showVertical ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          {/* Sniper on rooftop */}
          {[
            { x: 48, y: 20 },
            { x: 73, y: 24 },
          ].map((s, i) => (
            <g key={i}>
              <circle cx={s.x} cy={s.y} r="1.4" className="fill-accent-hot" />
              <circle cx={s.x} cy={s.y} r="2.6" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
                <animate attributeName="r" values="1.8;4;1.8" dur="2s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
                <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
              </circle>
              {/* Firing line down to street */}
              <line x1={s.x} y1={s.y} x2={s.x + 12} y2="56" className="stroke-accent-hot" strokeWidth="0.3" strokeDasharray="0.8 0.5" opacity="0.6" />
            </g>
          ))}
          <text x="60" y="14" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="3.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round">
            צלפים בגגות · נ"ט מלמעלה
          </text>
        </motion.g>

        {/* Underground tunnels */}
        <motion.g initial={false} animate={{ opacity: showUnderground ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          {/* Tunnel network */}
          <path
            d="M5 66 L 28 66 L 28 70 L 56 70 L 56 67 L 80 67 L 80 71 L 95 71"
            fill="none"
            className="stroke-accent-hot"
            strokeWidth="0.5"
            strokeDasharray="1.2 0.8"
          />
          <path
            d="M22 73 L 38 73 L 38 68 L 65 68"
            fill="none"
            className="stroke-accent-hot/80"
            strokeWidth="0.4"
            strokeDasharray="1 0.6"
          />

          {/* Tunnel entrances (rising up to buildings) */}
          {[12, 38, 62, 86].map((x, i) => (
            <g key={i}>
              <line x1={x} y1="56" x2={x} y2="66" className="stroke-accent-hot" strokeWidth="0.4" strokeDasharray="0.5 0.4" />
              <circle cx={x} cy="56" r="0.6" className="fill-accent-hot" />
            </g>
          ))}

          {/* Moving figure in tunnel */}
          <motion.circle
            r="0.6"
            className="fill-accent-hot"
            animate={{ cx: [5, 95], cy: [66, 71] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          />

          <text x="50" y="74" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.95" strokeLinejoin="round">
            רשת מנהרות · GPS-Denied
          </text>
        </motion.g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        אותה עיר · 4 שכבות הסתכלות
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