'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { IntelCard } from '@/components/lesson/IntelCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type View = 'soldier' | 'chain' | 'routes' | 'tail';

type Step = {
  id: View;
  label: string;
  icon: IconName;
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'soldier',
    label: 'החייל בחזית – תלוי לחלוטין במערכת',
    icon: 'people',
    popupTitle: 'כל לוחם בודד צורך כ-50 ק"ג ביום',
    popupBody:
      'כל חייל שנמצא בחזית צורך מדי יום מים (כ-8 ליטרים), מזון (כ-2 ק"ג), תחמושת (5-15 ק"ג), וכן ציוד רפואי, חלקי חילוף ודלק לרכבים. בסך הכל מדובר על כ-50 ק"ג ביום לכל לוחם! <strong>תכפילו את זה במספר החיילים ובמספר ימי הלחימה</strong> ותקבלו משקלים עצומים. ללא שרשרת אספקה שמתפקדת כראוי, הלוחם יקרוס תוך 72 שעות. <strong>במילים פשוטות: כוח לוחם בלי דלק ואספקה הוא כוח משותק.</strong>',
  },
  {
    id: 'chain',
    label: 'קווי האספקה (LOC) – העורק הראשי',
    icon: 'truck',
    popupTitle: 'מבסיס האם המוגן ועד ללוחם בחזית',
    popupBody:
      '<strong>LOC</strong> (קיצור של Lines of Communication - קווי תקשורת ואספקה) מתאר את המערכת הפיזית שמחברת בין החיילים בשטח לבין בסיסי האספקה שבעורף. מערכת זו כוללת כבישים, מסילות רכבת, נתיבי ים ורשתות תקשורת. <strong>צבא יכול להתקדם רק עד איפה שהוא מסוגל לאבטח את קווי האספקה שלו</strong>. לדוגמה, כשנפוליאון פלש לרוסיה, הוא התקדם 1,000 ק"מ עד מוסקבה, אך קווי האספקה שלו נותקו מאחור. הצבא הגדול בעולם דאז התפרק בגלל חוסר באספקה, ולא בגלל הפסד בקרב.',
  },
  {
    id: 'routes',
    label: 'צירי אספקה: ראשי וחלופי',
    icon: 'compass',
    popupTitle: 'תוכנית העבודה מול תוכנית המגירה',
    popupBody:
      '<strong>MSR (Main Supply Route)</strong> – ציר האספקה הראשי. דרכו עוברת רוב האספקה לכוחות, ולכן האויב תמיד ינסה לתקוף אותו. <strong>ASR (Alternate Supply Route)</strong> – ציר חלופי שנקבע מראש כדי לא להיתקע אם הציר הראשי נחסם (למשל בגלל מארב, הצפה או הרס הכביש). הכלל בלוגיסטיקה צבאית אומר: תמיד חייבים חלופה מוכנה מראש. להסתמך רק על ציר אספקה אחד זה הימור מסוכן.',
  },
  {
    id: 'tail',
    label: 'הבטן הלוגיסטית – נקודת התורפה',
    icon: 'box',
    popupTitle: 'הזנב שמתארך ככל שמתקדמים',
    popupBody:
      '<strong>"הבטן הלוגיסטית"</strong> היא כל השטח שמאחורי הכוחות הלוחמים, בו ממוקמות יחידות התמיכה (תחזוקה, חימוש ורפואה). לפי שיטת ה"דחיפה" (<strong>Push Logistics</strong>), האספקה נשלחת כל הזמן קדימה אל עבר החזית. הבעיה היא שככל שהצבא מתקדם עמוק יותר לשטח האויב, כך "הבטן הלוגיסטית" שלו מתארכת, נעשית מסורבלת והרבה יותר קשה להגן עליה. <strong>"ציידי לוגיסטיקה"</strong> (כוחות אויב מיוחדים) מנצלים בדיוק את השטחים החשופים האלה בעורף כדי לחבל באספקה.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'הצבא הגדול בעולם הובס ללא קרב',
    place: 'פלישת נפוליאון לרוסיה · 1812',
    lesson: 'נפוליאון יצא לרוסיה עם 600,000 חיילים וקווי אספקה (LOC) ארוכים במיוחד. הרוסים החליטו לא להילחם חזיתית, אלא לסגת ולשרוף את כל השדות והמבנים בדרך, כדי שהצרפתים לא יוכלו להשתמש במשאבים המקומיים. במרחק של 1,000 ק"מ מהבית, ללא מזון וללא ציוד חורף, קווי האספקה קרסו. עד חודש נובמבר הושמדו כ-90% מהצבא הצרפתי בגלל הקור והרעב. מה שהכריע את נפוליאון לא היה צבא האויב, אלא קריסת הלוגיסטיקה.',
    icon: 'fuel',
    accent: 'text-accent-cool',
  },
  {
    headline: 'כשנגמר הדלק ל"שועל המדבר"',
    place: 'קרב אל-עלמיין, צפון אפריקה · 1942',
    lesson: 'הגנרל הגרמני ארווין רומל (שכונה "שועל המדבר") נחל ניצחונות מזהירים במשך שנתיים. אבל הייתה לו בעיה קריטית אחת: הבריטים הצליחו להטביע את מכליות הדלק הגרמניות בים, והדלק פשוט לא הגיע לכוחותיו. באוקטובר 1942, צבאו נתקע במקום כי הטנקים לא יכלו לנסוע. רומל נאלץ להרים ידיים ולסגת לאחור מרחק של 1,500 ק"מ. מה שהכריע את המערכה לא היה איכות הטנקים או כישרון הפיקוד, אלא המחסור בדלק.',
    icon: 'ship',
    accent: 'text-accent',
  },
  {
    headline: 'גשר אחד רחוק מדי',
    place: 'מבצע "מרקט גארדן", הולנד · ספטמבר 1944',
    lesson: 'במלחמת העולם השנייה, בעלות הברית תכננו לפתוח ציר אספקה מהיר היישר אל תוך גרמניה, על ידי כיבוש סדרה של גשרים בהולנד. כמעט כל הגשרים נכבשו בהצלחה, למעט הגשר האחרון בעיר ארנהיים. בגלל הכישלון הזה קו האספקה נקטע, והחיילים שהונחתו בעומק השטח נותרו מבודדים וללא ציוד. המבצע נכשל, והוליד את המושג "גשר אחד רחוק מדי" – שמתאר שאפתנות יתר שלא מגובה ביכולת לוגיסטית.',
    icon: 'compass',
    accent: 'text-status-warn',
  },
  {
    headline: 'רבע מיליון חיילים במצור, בלי שום אספקה',
    place: 'קרב סטלינגרד, החזית המזרחית · 1942-1943',
    lesson: 'הארמייה השישית של הצבא הגרמני כותרה לחלוטין בתוך העיר סטלינגרד. הרוסים סגרו עליהם מכל כיוון וחתכו להם את קווי האספקה לחלוטין. הפיקוד הגרמני הבטיח לספק לחיילים הנצורים 700 טון של ציוד ביום דרך האוויר, אבל בפועל הצליחו להנחית בקושי 100 טון. תוך שלושה חודשים החיילים הגרמנים גוועו ברעב וקפאו מקור, מה שהוביל לכניעתם של כ-250,000 מהם. הניצחון הרוסי הושג בזכות ניתוק הלוגיסטיקה של האויב.',
    icon: 'crosshair',
    accent: 'text-status-danger',
  },
];

export function OnboardingScene() {
  const [view, setView] = useState<View>('soldier');
  const [expandedStep, setExpandedStep] = useState<View | null>('soldier');

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
        step="08.0"
        eyebrow="רגע לפני שמתחילים"
        title={
          <>
            <span className="gradient-text">עורק החיים</span> של המלחמה
          </>
        }
        intro="המלחמות הגדולות בהיסטוריה כמעט ולא הוכרעו רק בזכות קרבות גבורה חזיתיים, אלא בגלל לוגיסטיקה. בואו נראה איך הכל עובד: מבסיס האם המוגן שבעורף, דרך נתיבי האספקה הגיאוגרפיים, ועד ללוחם שנמצא בקצה המסלול בחזית. כל פגיעה, אפילו הקטנה ביותר, בשרשרת הזו – עלולה להפיל את המערכה כולה."
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
                    ? 'border-brand/45 bg-bg-elevated shadow-elevated'
                    : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                  passed && !active && 'opacity-80'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleStepClick(s.id)}
                  aria-expanded={expanded}
                  aria-controls={`t8-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t8-onb-bar"
                      className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
                    />
                  )}
                  <span
                    className={cn(
                      'size-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      active ? 'bg-accent text-fg border-accent shadow-glow' : passed ? 'bg-status-ok/15 text-status-ok border-status-ok/30' : 'bg-bg-accent text-fg-muted border-border'
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
                  <Icon
                    name={s.icon}
                    size={20}
                    className={cn('transition-colors shrink-0', active ? 'text-brand-dark' : 'text-fg-dim')}
                  />
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
                      key={`t8-onb-panel-${s.id}`}
                      id={`t8-onb-panel-${s.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20">
                        <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-brand-dark mt-3 mb-2.5">
                          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
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

        <div className="surface-elevated bg-bg relative overflow-hidden min-h-[280px]">
          <SupplyChainStage view={view} />
        </div>
      </div>

      <SoftDivider text="ההיסטוריה מלאה בקרבות שהוכרעו בגלל קריסת קווי אספקה, ולא בגלל כוח אש" />

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
        <p>הבנו שלוגיסטיקה היא לא רק "מערך תמיכה אפור" אלא זירת קרב בפני עצמה שמתנהלת במקביל. בחלקים הבאים נצלול פנימה ונבין:
            <strong className="text-fg"> איך צירי האספקה (ראשי וחלופי) פועלים בשטח, איך ולמה "הבטן הלוגיסטית" שלנו גדלה ונחשפת לאויב ככל שמתקדמים, ולמה שליטה בנמל ים עמוק שווה לפעמים יותר מאוגדת לוחמים שלמה</strong>.</p>
      </ReadyCallout>
    </section>
  );
}

function SupplyChainStage({ view }: { view: View }) {
  const showBase = view !== 'soldier';
  const showRoutes = view === 'routes' || view === 'tail';
  const showASR = view === 'routes' || view === 'tail';
  const showTail = view === 'tail';

  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          <linearGradient id="ground-8" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f5f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" fill="url(#ground-8)" />

        {/* Terrain hints */}
        <path d="M0 58 L25 50 L45 55 L65 48 L85 52 L100 50 L100 75 L0 75 Z" className="fill-terrain-sand/20" />

        {/* Front line zone (right side) */}
        <rect x="80" y="0" width="20" height="75" className="fill-status-danger/8" />
        <line x1="80" y1="0" x2="80" y2="75" className="stroke-status-danger" strokeWidth="0.3" strokeDasharray="1 0.8" />
        <text
          x="90"
          y="9"
          textAnchor="middle"
          className="fill-status-danger font-display font-bold"
          fontSize="3.2"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinejoin="round"
        >
          חזית
        </text>

        {/* Soldier at the tip (always visible) */}
        <motion.g
          initial={false}
          animate={view === 'soldier' ? { scale: 1.2 } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <circle cx="89" cy="40" r="2.5" className="fill-accent-hot" />
          <circle cx="89" cy="40" r="4" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
            <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
          </circle>
          <text
            x="89"
            y="36"
            textAnchor="middle"
            className="fill-accent-hot font-display font-bold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            לוחם
          </text>
          {view === 'soldier' && (
            <text
              x="89"
              y="49"
              textAnchor="middle"
              className="fill-accent-hot font-sans"
              fontSize="2.4"
              paintOrder="stroke"
              stroke="#ffffff"
              strokeWidth="0.8"
              strokeLinejoin="round"
            >
              50 ק"ג / יום
            </text>
          )}
        </motion.g>

        {/* Base in the rear (left) */}
        <motion.g initial={false} animate={{ opacity: showBase ? 1 : 0 }} transition={{ duration: 0.3 }}>
          <rect x="6" y="36" width="9" height="9" rx="1" className="fill-accent-cool" />
          <rect x="8" y="38" width="2" height="3" className="fill-bg" />
          <rect x="11" y="38" width="2" height="3" className="fill-bg" />
          <text
            x="10.5"
            y="34"
            textAnchor="middle"
            className="fill-accent-cool font-display font-bold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            בסיס
          </text>
          <text
            x="10.5"
            y="50"
            textAnchor="middle"
            className="fill-accent-cool font-sans"
            fontSize="2.2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeLinejoin="round"
          >
            עורף
          </text>
        </motion.g>

        {/* Simple chain (step 2): basic LOC line */}
        <motion.g initial={false} animate={{ opacity: view === 'chain' ? 1 : 0 }} transition={{ duration: 0.3 }}>
          <line
            x1="15"
            y1="40"
            x2="87"
            y2="40"
            className="stroke-accent"
            strokeWidth="0.7"
            strokeDasharray="2 1"
          />
          <text
            x="50"
            y="36"
            textAnchor="middle"
            className="fill-accent font-display font-bold"
            fontSize="3.2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            LOC — קו אספקה
          </text>
        </motion.g>

        {/* MSR + ASR routes (step 3, 4) */}
        <motion.g initial={false} animate={{ opacity: showRoutes ? 1 : 0 }} transition={{ duration: 0.3 }}>
          {/* MSR — primary, thick */}
          <path
            d="M15 40 Q 30 38 50 42 Q 70 46 87 40"
            fill="none"
            className="stroke-accent"
            strokeWidth="1.2"
          />
          <text
            x="50"
            y="50"
            textAnchor="middle"
            className="fill-accent font-display font-bold"
            fontSize="3.2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            MSR · ראשי
          </text>
        </motion.g>

        {/* ASR — alternate, thinner dashed */}
        <motion.g initial={false} animate={{ opacity: showASR ? 1 : 0 }} transition={{ duration: 0.3 }}>
          <path
            d="M15 40 Q 30 28 50 25 Q 70 22 87 40"
            fill="none"
            className="stroke-accent-cool"
            strokeWidth="0.7"
            strokeDasharray="2 1.2"
          />
          <text
            x="50"
            y="22"
            textAnchor="middle"
            className="fill-accent-cool font-display font-bold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            ASR · עתודה
          </text>
        </motion.g>

        {/* Logistical tail — supply vehicles + vulnerability zones */}
        <motion.g initial={false} animate={{ opacity: showTail ? 1 : 0 }} transition={{ duration: 0.3 }}>
          {/* Supply vehicles spread along the MSR */}
          {[25, 38, 50, 62, 75].map((x, i) => {
            const y = 38 + (i === 2 ? 2 : i === 1 || i === 3 ? 1.5 : 1);
            return (
              <g key={i}>
                <rect x={x - 1.4} y={y - 0.8} width="2.8" height="1.6" rx="0.3" className="fill-accent" />
                <circle cx={x - 0.8} cy={y + 0.9} r="0.4" className="fill-fg" />
                <circle cx={x + 0.8} cy={y + 0.9} r="0.4" className="fill-fg" />
              </g>
            );
          })}
          {/* Vulnerability zone (logistics raider threat) */}
          <ellipse cx="45" cy="58" rx="14" ry="6" className="fill-status-danger/15 stroke-status-danger" strokeWidth="0.4" strokeDasharray="1.2 0.8" />
          <text
            x="45"
            y="68"
            textAnchor="middle"
            className="fill-status-danger font-display font-bold"
            fontSize="2.6"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.85"
            strokeLinejoin="round"
          >
            "ציידי לוגיסטיקה"
          </text>
          <text
            x="45"
            y="71"
            textAnchor="middle"
            className="fill-status-danger font-sans"
            fontSize="2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.7"
            strokeLinejoin="round"
          >
            תקיפה בעורף הכוחות
          </text>
        </motion.g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        מבנה קו האספקה (LOC) · 4 שכבות
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