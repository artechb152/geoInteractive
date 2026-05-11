'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
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
      'בעין של אזרח: בניינים, חנויות, רחובות, אנשים. המוח רואה את העיר כסביבת חיים — מקום עם פינות נחמדות לקפה ופחות נחמדות לחנייה. <strong>בעין של מפקד</strong>, כל אחד מהאלמנטים האלה הופך למשהו אחר לגמרי: סיכון, מחסה, נקודת תורפה, או הזדמנות. אותה רחוב — שני עולמות.',
  },
  {
    id: 'commander',
    label: 'אופקי — מה מפקד רואה',
    icon: 'crosshair',
    popupTitle: 'המורפולוגיה האופקית — קווי ראייה',
    popupBody:
      'בעיר, קווי ראייה נשברים כל 30 מטרים. <strong>טווחי היתקלות יורדים מקילומטרים למטרים בודדים</strong>. גריד עירוני נותן לרחובות ארוכים — אבל גם חושף שיירות לאש "Enfilade" (אש לכל אורך הרחוב). קסבה ססגונית = בלבול ניווט אבל גם פחות אש ארוכה. <strong>שתי גיאומטריות, שתי דוקטרינות.</strong>',
  },
  {
    id: 'vertical',
    label: 'אנכי — האיומים מעל',
    icon: 'mountain',
    popupTitle: 'הממד האנכי — "גבעות בטון"',
    popupBody:
      'מבנים גבוהים = הרים מלאכותיים. מי ששולט בגג של בניין 30 קומות רואה את כל הסביבה ויורה ראשון. צלפים פועלים מטווחים שהיו בלתי אפשריים בשטח פתוח. <strong>נ"ט מלמעלה</strong> פוגע בגגות טנקים — הנקודה הפגיעה ביותר. הקרב הופך לתלת-ממדי: לא רק "ימינה-שמאלה" אלא גם "למעלה-למטה".',
  },
  {
    id: 'underground',
    label: 'תת-קרקעי — הצד השני של המפה',
    icon: 'layers',
    popupTitle: 'המנהרות — מלחמה ב-GPS-Denied',
    popupBody:
      'מתחת לרגליים: רשת מנהרות שלמה. מערכת ביוב, מנהרות התקפיות, חניונים תת-קרקעיים. <strong>GPS לא עובד</strong> — אדמה חוסמת לוויינים. <strong>קשר רדיו מצומצם</strong>. סנסור אווירי לא רואה למטה. כוח שמתחפר בתת-קרקע נע ללא חשיפה, מאגף אחורית, ויוצא בנקודות בלתי צפויות. בעזה, חמאס בנה מטרו שלם.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'מ-300 אלף חיילים ל-90 אלף בקרב על עיר אחת',
    place: 'סטלינגרד · אוגוסט 1942 — פברואר 1943',
    lesson: 'הצבא ה-6 הגרמני נכנס לסטלינגרד עם 300,000 חיילים. ב-6 חודשי קרב בית-בית, ירדה היחידה ל-90,000 ונכבשה. סטלינגרד היה הקרב הראשון שהוכיח שעיר יכולה לבלוע צבא שלם — לא בקרב אחד, אלא ב-1,000 קרבות של בניין-בית.',
    icon: 'capital',
    accent: 'text-status-danger',
  },
  {
    headline: 'מסוק נופל — וכל המבצע משתנה',
    place: 'מוגדישו, סומליה · אוקטובר 1993',
    lesson: 'יחידת קומנדו אמריקאית נכנסה למוגדישו בכוונה לתפוס מנהיג מקומי. מסוק "Black Hawk" הופל ע"י RPG. תוך 18 שעות, הכוח האמריקאי הצטופף סביב חורבות המסוק, בקרב בית-בית מול אלפי מקומיים מצוידים. 18 חיילים נהרגו. מבצע "פשוט" הפך לאסון — בלי כלים כבדים, בלי תצפית אווירית טובה.',
    icon: 'plane',
    accent: 'text-accent-hot',
  },
  {
    headline: 'מנהרות שלמו מתחת לעיר עתיקה',
    place: 'מוסול, עיראק · 2016–17',
    lesson: 'דאעש החזיק את מוסול עם רשת מנהרות שחפר מתחת לעיר. הצבא העיראקי הצטרך 9 חודשי קרב לכבוש את העיר. בכל בניין שנכבש — מנהרת בריחה. בכל פינה — מטענים מאולתרים. מי שעולה מהמנהרה למעלה מאחורי הכוח התוקף — שלל קטלני.',
    icon: 'layers',
    accent: 'text-accent',
  },
  {
    headline: 'בתי חולים בתוך אזור לחימה',
    place: 'עזה · 2023 ואילך',
    lesson: 'במלחמת חרבות ברזל, חמאס מיקם תשתיות לחימה — מנהרות, מפקדות — סמוך לאתרים אזרחיים רגישים: בתי חולים, מסגדים, בתי ספר. צה"ל מתמודד עם דילמה מבצעית, משפטית ומוסרית כפולה: לכבוש את המטרה בלי לפגוע בחפים מפשע. שיעור באילוצים משפטיים-מבצעיים.',
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
        title={
          <>
            העיר כ<span className="gradient-text">מרחב לחימה תלת-ממדי</span>
          </>
        }
        intro="מפקד שלא מבין שעיר היא לא רחובות — היא קוביית רוביק תלת-ממדית של איומים — ייקלע לאסון. בוא נראה ב-4 שכבות איך אותה גזרה אורבנית משתנה לחלוטין מהמבט של מי שמסתכל עליה."
      />

      <div className="grid lg:grid-cols-[2fr_3fr] gap-6 items-start">
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
                  aria-controls={`t10-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t10-onb-bar"
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
                      key={`t10-onb-panel-${s.id}`}
                      id={`t10-onb-panel-${s.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-accent/20">
                        <div className="text-xs font-mono text-accent mt-3 mb-2 tracking-widest uppercase">
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

        <div className="surface-elevated relative overflow-hidden sticky top-6">
          <CityStage view={view} />
        </div>
      </div>

      <SoftDivider text="ההיסטוריה האורבנית · 4 קרבות שעיצבו את הדוקטרינה" />

      <div className="grid sm:grid-cols-2 gap-4">
        {HISTORICAL.map((h, i) => (
          <motion.article
            key={h.headline}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.08 }}
            className="surface p-5 relative overflow-hidden"
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-bl from-bg-elevated via-bg-card to-bg-card opacity-100"
            />
            <div className="relative flex items-start gap-4">
              <div className="size-12 rounded-xl bg-bg-elevated border border-border-strong flex items-center justify-center shrink-0">
                <Icon name={h.icon} size={22} className={h.accent} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-fg-dim mb-1.5 tracking-widest uppercase flex items-center gap-2">
                  <span className="size-1 rounded-full bg-fg-dim" />
                  {h.place}
                </div>
                <h3 className="font-display font-bold text-lg leading-tight mb-2 text-balance">
                  {h.headline}
                </h3>
                <p className="text-sm text-fg-muted leading-relaxed text-pretty">{h.lesson}</p>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-10 relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-bl from-accent/10 via-bg-elevated to-bg-elevated p-6 sm:p-7 flex gap-4 sm:gap-5 items-center"
      >
        <div className="absolute -end-12 -top-12 size-40 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="relative size-12 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center text-accent shrink-0 shadow-glow">
          <Icon name="arrow-left" size={20} />
        </div>
        <div className="relative flex-1">
          <div className="text-xs font-mono text-accent mb-1.5 tracking-widest uppercase">עכשיו אתה מוכן</div>
          <p className="text-fg leading-relaxed text-pretty text-sm sm:text-base">
            הבנת שעיר זה לא "שטח אופקי" — זה <strong>קוביית רוביק</strong>. בשלוש הסצנות הבאות נצלול:
            <strong className="text-fg"> איך גריד שונה מקסבה טקטית, איך עובד הקרב התלת-ממדי, ולמה אזרחים הם הפקטור הכי קשה</strong>.
          </p>
        </div>
      </motion.div>
    </section>
  );
}

function CityStage({ view }: { view: View }) {
  const showCommander = view !== 'street';
  const showVertical = view === 'vertical' || view === 'underground';
  const showUnderground = view === 'underground';

  return (
    <div className="aspect-[4/3] relative">
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
      <span className="text-xs font-mono text-fg-dim tracking-widest uppercase">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
