'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { IntelCard } from '@/components/lesson/IntelCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type View = 'observer' | 'visible' | 'dead' | 'intervisibility';

type Step = {
  id: View;
  label: string;
  icon: IconName;
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'observer',
    label: 'מאיפה אני מסתכל?',
    icon: 'eye',
    popupTitle: 'נקודת התצפית — המקום שבו הכל מתחיל',
    popupBody:
      'כל ניתוח של השטח מתחיל בנקודה אחת: העין של התצפיתן, המצלמה או הרחפן. הקו הדמיוני שיוצא מהנקודה הזו נקרא <strong>"קו ראייה"</strong> (Line of Sight, או בקיצור LOS). גובה הנקודה הוא קריטי — מטר אחד נוסף לגובה יכול לחשוף בפנינו שטחים ענקיים שקודם הוסתרו. זו הסיבה שבמלחמות צבאות נלחמים בחירוף נפש על פסגות הרים: מי ששולט בגובה, שולט במה שאפשר לראות.',
  },
  {
    id: 'visible',
    label: 'מה גלוי לעין שלי?',
    icon: 'crosshair',
    popupTitle: 'השטחים הגלויים — איפה האויב חשוף',
    popupBody:
      'קו הראייה שלנו הוא תמיד קו ישר. אם הקו הזה לא נתקע בדרך בשום מכשול — כמו "תבליט" (הרים וגבעות) או "תכסית" (מבנים ועצים) — השטח נחשב לגלוי. הכלל ברור: אם אתה יכול לראות את האויב, אתה גם יכול לפגוע בו. במפות ניתוח שטח (שנקראות <strong>מפות Viewshed</strong>), כל השטחים שגלויים לעין מסומנים בדרך כלל בירוק, כדי שנבין מיד על איזה אזור אנחנו שולטים.',
  },
  {
    id: 'dead',
    label: 'מה מוסתר ממני?',
    icon: 'shield',
    popupTitle: '"שטחים מתים" — איפה האויב מתחבא',
    popupBody:
      'כל שטח שמוסתר מעינינו בגלל מכשול (כמו הר, בניין או יער סמיך) נקרא <strong>"שטח מת"</strong> (Dead Space). אלו בדיוק המקומות שהאויב יחפש כדי להתחפר ולהקים מפקדות, כי הוא יודע שלא נראה אותו. ניתוח חכם של השטח מאפשר לנו למפות את השטחים המתים האלה, כדי שנדע לאן לשלוח סיור פיזי או רחפן מיוחד שיבדוק מה מסתתר שם מלמעלה.',
  },
  {
    id: 'intervisibility',
    label: 'הרגע שבו אני נחשף פתאום',
    icon: 'bolt',
    popupTitle: 'קו נראות הדדית — מאפס למאה בשנייה',
    popupBody:
      'כשמטפסים על הר, יש קו דק מאוד שבו עוברים ממצב של הסתרה מוחלטת למצב שבו האויב ממול רואה אותנו לחלוטין. אין כאן הדרגתיות — זה <strong>עובד כמו מתג של אור</strong> (לכן הוא נקרא קו נראות הדדית). במלחמת יום הכיפורים, טנקים סוריים טיפסו על הרכסים בגולן וברגע שחצו את הקו הזה — הם ספגו אש מידית מכוחות צה"ל. תכנון מסלול חכם מחייב אותנו לדעת בדיוק מתי אנחנו עומדים לחצות את הקו הזה ולהיחשף.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'התצפית שרואה מדינה שלמה',
    place: 'הר חרמון · מוצב החרמון (1967–היום)',
    lesson: 'מוצבי צה"ל על פסגות החרמון מאפשרים תצפית עמוקה לתוך סוריה, לבנון וכל צפון הארץ. בגלל הגובה העצום הזה, במלחמת יום הכיפורים הקרבות הראשונים והקשים ביותר היו על השליטה בהר. הכלל פשוט: מי שמחזיק בנקודה הכי גבוהה — מחזיק ב"עיניים" של המערכה ורואה כל תנועה.',
    icon: 'mountain',
    accent: 'text-accent',
  },
  {
    headline: 'חציית הרכס הגורלית',
    place: 'רמת הגולן · מלחמת יום הכיפורים 1973',
    lesson: 'מאות טנקים סוריים הושמדו ברגע אחד: הם חצו את קו הרכס ונחשפו. שנייה קודם לכן הם היו מוסתרים ובלתי נראים. ברגע שחצו את "קו הנראות ההדדית", הם הפכו באופן פתאומי למטרות גלויות לחלוטין עבור כוחות צה"ל שהמתינו להם מעבר לרכס.',
    icon: 'bolt',
    accent: 'text-accent-hot',
  },
  {
    headline: 'כשהענן הסתיר את המטרה',
    place: 'מלחמות מודרניות · שנות ה-2000',
    lesson: 'טילים "חכמים" שמונחים בעזרת מצלמה או לייזר דורשים קו ראייה (LOS – Line of Sight) רציף אל המטרה עד רגע הפגיעה. במלחמות בעיראק בשנות ה-2000, היו מקרים שבהם ענן או עשן פתאומי חסמו את הראייה של הטיל. כתוצאה מכך נשבר קו הראייה, הטיל איבד את המטרה ופגע בשטח ריק. המסקנה? ללא קו ראייה נקי, אי אפשר לפגוע.',
    icon: 'plane',
    accent: 'text-accent-cool',
  },
  {
    headline: 'מלכודת השטחים המתים בתוך העיר',
    place: 'קרב סטלינגרד · 1942–1943',
    lesson: 'בקרבות רחוב, מבנים והריסות יוצרים המון "שטחים מתים" שקשה לראות מבחוץ. בקרב סטלינגרד (במלחמת העולם השנייה), צלפים רוסים ניצלו את ההריסות כדי להקים עמדות מסתור קטלניות. החיילים הגרמנים ספגו אבדות כבדות כי הם פשוט לא הצליחו לראות מאין יורים עליהם. שטח מת בעיר הוא המקום המושלם למארב.',
    icon: 'capital',
    accent: 'text-status-warn',
  },
];

export function OnboardingScene() {
  const [view, setView] = useState<View>('observer');
  const [expandedStep, setExpandedStep] = useState<View | null>('observer');

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
        step="06.0"
        eyebrow="לפני שמתחילים"
title = {
  <>
    <span className="gradient-text">מי רואה את מי ראשון</span> — ולמה זה משנה את כל הקרב
  </>
}
        intro="הכל מתחיל ונגמר בשאלה אחת פשוטה: האם אני רואה את האויב, או שהוא מוסתר ממני? בואו נבין איך ניתוח של גבעה אחת פשוטה יכול ללמד אותנו מה אנחנו רואים, מה האויב רואה משם, ואיפה בדיוק עובר הקו שבו הכל מתהפך."
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
                  aria-controls={`t6-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t6-onb-bar"
                      className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
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
                      key={`t6-onb-panel-${s.id}`}
                      id={`t6-onb-panel-${s.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20">
                        <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-brand-dark mt-3 mb-2.5">
                          <span className="size-1.5 rounded-full bg-brand-dark" aria-hidden />
                          למה זה משנה?
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

        <div className="surface-elevated bg-bg-accent/30 relative overflow-hidden min-h-[280px]">
          <SightStage view={view} />
        </div>
      </div>

      <SoftDivider text="העיניים של שדה הקרב — ההבדל בין חיים למוות" />

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

      <ReadyCallout title="עכשיו אתם מוכנים!">
        <p>הבנתם שלראות את השטח זה לא רק "לפתוח עיניים" — אלא דורש ניתוח והבנה. בסצנות הבאות נלמד: 
            <strong className="text-fg"> איך מחשבים קו ראייה (LOS – Line of Sight) בעצמנו, איך תוכנות יכולות לייצר מפה שחושפת בפנינו את כל האזורים הגלויים (Viewshed), ואיך כל זה מאפשר לנו לסגור מעגל ולפגוע במטרה (Kill Chain)</strong>.</p>
      </ReadyCallout>
    </section>
  );
}

function SightStage({ view }: { view: View }) {
  const showVisible = view === 'visible' || view === 'dead' || view === 'intervisibility';
  const showDead = view === 'dead' || view === 'intervisibility';
  const showIntervisibility = view === 'intervisibility';

  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        {/* No internal background rect — parent card carries `bg-bg-accent/30`
            so the SVG and surround read as one continuous warm cream surface. */}

        {/* Terrain profile (side view): observer hill on left, ridge in middle, valley on right */}
        <path
          d="M0 60 L8 45 L15 52 L25 55 L40 35 L55 38 L70 50 L82 48 L92 55 L100 60 L100 75 L0 75 Z"
          className="fill-terrain-sand/30 stroke-terrain-ridge/60"
          strokeWidth="0.3"
        />
        {/* Shadow on the back of the ridge (darker fill where dead space is) */}
        <path
          d="M40 35 L55 38 L70 50 L70 75 L40 75 Z"
          className="fill-terrain-ridge/10"
        />

        {/* Observer position (always visible) */}
        <g>
          <circle cx="10" cy="42" r="2.4" className="fill-accent-cool" />
          <line x1="10" y1="42" x2="10" y2="60" className="stroke-accent-cool" strokeWidth="0.4" strokeDasharray="0.6 0.6" />
          <text
            x="10"
            y="38"
            textAnchor="middle"
            className="fill-accent-cool font-display font-bold"
            fontSize="3.4"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1.1"
            strokeLinejoin="round"
          >
            תצפיתן
          </text>
        </g>

        {/* Visible (lit) cone — bright fan from observer */}
        <motion.g initial={false} animate={{ opacity: showVisible ? 1 : 0 }} transition={{ duration: 0.4 }}>
          <polygon
            points="10,42 40,35 70,50 100,30 100,42"
            className="fill-status-ok/20"
            strokeWidth="0"
          />
          {/* Rays */}
          {[
            { x: 38, y: 36 },
            { x: 42, y: 35 },
            { x: 48, y: 34 },
            { x: 95, y: 32 },
            { x: 96, y: 38 },
          ].map((p, i) => (
            <line
              key={i}
              x1="10"
              y1="42"
              x2={p.x}
              y2={p.y}
              className="stroke-status-ok"
              strokeWidth="0.18"
              strokeDasharray="0.6 0.6"
              opacity="0.7"
            />
          ))}
          <text
            x="65"
            y="22"
            textAnchor="middle"
            className="fill-status-ok font-display font-bold"
            fontSize="4"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1.3"
            strokeLinejoin="round"
          >
            שטחים גלויים
          </text>
        </motion.g>

        {/* Dead space (behind the ridge from observer perspective) */}
        <motion.g initial={false} animate={{ opacity: showDead ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <path
            d="M40 35 L55 38 L70 50 L70 65 L48 65 Z"
            className="fill-status-danger/20 stroke-status-danger/50"
            strokeWidth="0.4"
            strokeDasharray="1 0.6"
          />
          {/* Hatching to emphasize dead space */}
          {[42, 47, 52, 57, 62].map((x, i) => (
            <line
              key={i}
              x1={x}
              y1="40"
              x2={x + 6}
              y2="63"
              className="stroke-status-danger"
              strokeWidth="0.12"
              opacity="0.45"
            />
          ))}
          <text
            x="58"
            y="52"
            textAnchor="middle"
            className="fill-status-danger font-display font-bold"
            fontSize="3.6"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeLinejoin="round"
          >
            שטח מת
          </text>
          <text
            x="58"
            y="56"
            textAnchor="middle"
            className="fill-status-danger font-sans"
            fontSize="2.4"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeLinejoin="round"
          >
            האויב יכול להסתתר כאן
          </text>
        </motion.g>

        {/* Intervisibility line — the dotted line along the ridge crest where target becomes visible */}
        <motion.g initial={false} animate={{ opacity: showIntervisibility ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          {/* Crest line and crossing */}
          <line
            x1="40"
            y1="35"
            x2="40"
            y2="14"
            className="stroke-accent-hot"
            strokeWidth="0.4"
            strokeDasharray="1.2 0.8"
          />
          <text
            x="40"
            y="12"
            textAnchor="middle"
            className="fill-accent-hot font-display font-bold"
            fontSize="3.2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            קו נראות הדדית
          </text>

          {/* Target appearing */}
          <circle cx="62" cy="44" r="1.8" className="fill-accent-hot" />
          <circle cx="62" cy="44" r="3.5" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
            <animate attributeName="r" values="2;6;2" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
          </circle>
          {/* The LOS line from observer to the now-exposed target */}
          <line
            x1="10"
            y1="42"
            x2="62"
            y2="44"
            className="stroke-accent-hot"
            strokeWidth="0.5"
          />
          <text
            x="62"
            y="40"
            textAnchor="middle"
            className="fill-accent-hot font-display font-bold"
            fontSize="2.8"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeLinejoin="round"
          >
            רגע החשיפה
          </text>
        </motion.g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        תצפית · 4 שכבות ניתוח
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