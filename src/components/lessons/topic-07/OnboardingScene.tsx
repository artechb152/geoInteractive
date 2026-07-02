'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { IntelCard } from '@/components/lesson/IntelCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type View = 'regional' | 'micro' | 'physiology' | 'atmosphere';

type Step = {
  id: View;
  label: string;
  icon: IconName;
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'regional',
    label: 'אקלים אזורי — הרקע',
    icon: 'globe',
    popupTitle: 'תחזית אזורית — לא מספיקה',
    popupBody:
      'כל תכנון מתחיל בתחזית מזג האוויר המוכרת לנו: 25 מעלות, רוח של 10 קמ"ש וראות למרחק של 12 ק"מ. זה נותן לנו תמונת מצב כללית, אבל להסתמך רק עליה זו טעות מסוכנת. למה? כי באותו תא שטח ובאותה שעה בדיוק, אזורים שונים (כמו הר ועמק) מתנהגים <strong>אחרת לגמרי</strong>. תחזית אזורית היא רק נקודת ההתחלה; כדי לתכנן פעולה צריך לרדת לפרטים ברזולוציה המקומית של השטח עצמו.',
  },
  {
    id: 'micro',
    label: 'מיקרו-אקלים — הקרקע האמיתית',
    icon: 'wave',
    popupTitle: 'אותה גזרה — שני עולמות',
    popupBody:
      'דמיינו עמק צר שלוכד בתוכו לחות ויוצר ערפל כבד. לעומת זאת, על ההר שמעליו האוויר יבש ואפשר לראות למרחק של 20 ק"מ. מדובר בשני אזורים במרחק קילומטר אחד בלבד זה מזה, שהם למעשה שני שדות קרב שונים לחלוטין. זהו ה<strong>מיקרו-אקלים</strong>: מצב שבו צורת השטח (הטופוגרפיה) יוצרת מזג אוויר מקומי וייחודי. מפקד שמתעלם מזה, ישלח את החיילים שלו לתוך ערפל ולא יבין למה אמצעי התצפית והמצלמות שלו התעוורו לחלוטין.',
  },
  {
    id: 'physiology',
    label: 'עומס פיזיולוגי על החייל',
    icon: 'people',
    popupTitle: 'גוף האדם לא קורא תחזית',
    popupBody:
      'גוף האדם מושפע ישירות מהשילוב של טמפרטורה, לחות ורוח. השילוב הזה יוצר את עומס החום או הקור (מדד שנקרא בצבא <strong>WBGT</strong>). זהו מדד קריטי שעוזר להבין כמה מהר החיילים יתעייפו וישחקו. בעומס חום כבד, החיילים יאבדו נוזלים במהירות ויסתכנו במכת חום; בעומס קור, הם יסתכנו בהיפותרמיה (ירידה מסוכנת בחום הגוף) שפוגעת ביכולת החשיבה והתפקוד. תכנון מבצעי <strong>חייב</strong> להתחשב בזה, אחרת הלוחמים יקרסו פיזית עוד לפני שיפגשו את האויב.',
  },
  {
    id: 'atmosphere',
    label: 'אטמוספירה כשכבה אופטית',
    icon: 'bolt',
    popupTitle: 'מולקולות שאוכלות גלים',
    popupBody:
      'חלקיקים באוויר כמו אדי מים, אבק וגשם יכולים "לבלוע" ולפזר גלים (כמו אלו שמשדרים מכשירי קשר ומכ"מים). כתוצאה מכך, קרני לייזר לסימון מטרות מתפזרות, מצלמות לראיית לילה שמבוססות על חום (<strong>IR</strong>) לא מתפקדות, ויעילות המכ"ם יורדת משמעותית. בנוסף, מטוסים ורחפנים עשויים שלא להצליח לראות או לעבור מבעד לעננים נמוכים. האטמוספירה היא בעצם תווך פיזי שמשפיע ישירות על הטכנולוגיה, ולא סתם "רקע".',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'החורף הרס את הצבא הגדול בעולם',
    place: 'פלישת נפוליאון לרוסיה · 1812',
    lesson: 'בקיץ של שנת 1812, נפוליאון יצא לכבוש את רוסיה עם 600,000 חיילים. עד נובמבר נשארו לו רק כ-30,000. הטמפרטורות צנחו ל-30- מעלות צלזיוס, ובתנאים האלו היה בלתי אפשרי לכוון את התותחים – עור הידיים של החיילים קפא ונצמד למתכת. אפילו הסוסים קפאו למוות בעמידה. החורף הרוסי הקשה לא היה רק פרט שולי, הוא היה האויב העיקרי שהביס את הצבא הגדול בעולם.',
    icon: 'spark',
    accent: 'text-accent-cool',
  },
  {
    headline: 'ערפל הסתיר התקפה של 200 אלף חיילים',
    place: 'יער הארדנים · דצמבר 1944',
    lesson: 'ההתקפה המפתיעה של גרמניה בקרב הבליטה (במלחמת העולם השנייה) הצליחה בזכות דבר אחד: ערפל כבד. הערפל קרקע לחלוטין את חיל האוויר של בעלות הברית. במשך שלושה ימים שלמים, צבא גרמני עצום נע בשטח פתוח מבלי שאף מטוס או תצפית יוכלו לראות אותו. אם בעלות הברית היו מנתחות טוב יותר את האקלים, ייתכן שתוצאות הקרב היו שונות.',
    icon: 'wave',
    accent: 'text-fg-dim',
  },
  {
    headline: 'תקרת ענן עצרה תקיפות אוויר חודשים',
    place: 'וייטנאם · עונת הגשמים, אמצע שנות ה-60',
    lesson: 'במלחמת וייטנאם, עונת המונסונים (גשמים טרופיים עזים) יצרה כיסוי עננים נמוך בגובה של 200 מטרים בלבד. מסוקי התקיפה האמריקאיים הושבתו, ומפציצים כבדים נאלצו להטיל פצצות כמעט "על עיוור". לוחמי הגרילה המקומיים (הוויטקונג) ניצלו זאת: הם הכירו את האקלים היטב ותזמנו את ההתקפות שלהם לימים שבהם מזג האוויר ביטל לחלוטין את היתרון האווירי של ארצות הברית.',
    icon: 'plane',
    accent: 'text-terrain-sky',
  },
  {
    headline: 'סופת חול ביטלה סנסורים תרמיים',
    place: 'מבצע "סופת המדבר" · עיראק 1991',
    lesson: 'במלחמת המפרץ (1991), סופת חול אדירה שיבשה את אמצעי ראיית הלילה מבוססי החום (IR) של הטנקים האמריקאיים. הטנקים הסתמכו על המערכות האלו כדי לראות דרך מזג אוויר קשה, אבל חלקיקי החול שריחפו באוויר פיזרו את גלי החום ו"עיוורו" את המסכים. הפתרון בשטח היה לעבור לניווט בעזרת GPS ולהשתמש במערכות מכ"ם חלופיות כדי להתמצא בתוך הסופה.',
    icon: 'satellite',
    accent: 'text-accent-hot',
  },
];

export function OnboardingScene() {
  const [view, setView] = useState<View>('regional');
  const [expandedStep, setExpandedStep] = useState<View | null>('regional');

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
        step="07.0"
        eyebrow="לפני שמתחילים"
title = {
  <>
    <span className="text-accent-hover">מזג האוויר הוא לא תפאורה</span> — הוא חלק מהקרב
  </>
}
        intro="באותו אזור בדיוק, בהפרש של 12 שעות בלבד, המציאות בשטח יכולה להשתנות לחלוטין. בחלק זה נלמד לנתח את מזג האוויר ב-4 רמות שונות: החל מהתחזית הכללית של האזור, ועד להבנה איך האוויר והאטמוספירה הם כוח פיזיקלי של ממש שעלול לשבש מערכות טכנולוגיות וחיישנים."
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
                  aria-controls={`t7-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t7-onb-bar"
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
                      key={`t7-onb-panel-${s.id}`}
                      id={`t7-onb-panel-${s.id}`}
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
          <WeatherStage view={view} />
        </div>
      </div>

      <SoftDivider text="כשלא קוראים את האקלים — משלמים בחיים" />

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
        <p>
          עכשיו כבר ברור שמזג האוויר הוא לא רק "תפאורה" – הוא כלי נשק פעיל בשדה הקרב. בשלבים הבאים נצלול פנימה ונלמד:
          <strong className="text-fg"> איך צורת השטח יוצרת אקלים מקומי, כיצד עומס החום והקור משפיע על הלוחם, איך האוויר עצמו משבש טכנולוגיה, ולמה עננים הם אלו שמחליטים אילו מטוסים יישארו על הקרקע.</strong>
        </p>
      </ReadyCallout>
    </section>
  );
}

function WeatherStage({ view }: { view: View }) {
  const showFog = view === 'micro' || view === 'physiology' || view === 'atmosphere';
  // Visibility labels belong to the micro-climate step only. In later steps the
  // fog stays as context, but its labels are dropped so they never pile up on
  // the physiology / atmosphere labels that share the same ridge & valley.
  const showVisibilityLabels = view === 'micro';
  // Soldiers + load labels belong to the physiology step. They are deliberately
  // NOT carried into the atmosphere step (which is about optics), so the enlarged
  // soldier glyph never collides with the IR beam / attenuation marker there.
  const showPhysio = view === 'physiology';
  const showBeams = view === 'atmosphere';

  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        {/* Parent card carries `bg-bg-accent/30` (warm cream); no sky gradient here. */}

        {/* Sun (regional view) */}
        <motion.g initial={false} animate={{ opacity: view === 'regional' ? 1 : 0.2 }} transition={{ duration: 0.4 }}>
          <circle cx="78" cy="14" r="5" className="fill-accent" opacity="0.7" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i * Math.PI) / 4;
            return (
              <line
                key={i}
                x1={78 + Math.cos(a) * 7}
                y1={14 + Math.sin(a) * 7}
                x2={78 + Math.cos(a) * 10}
                y2={14 + Math.sin(a) * 10}
                className="stroke-accent"
                strokeWidth="0.4"
                opacity="0.7"
              />
            );
          })}
        </motion.g>

        {/* Mountain silhouettes */}
        <path
          d="M0 55 L18 35 L32 50 L48 30 L62 45 L78 32 L100 50 L100 75 L0 75 Z"
          className="fill-terrain-ridge/35 stroke-terrain-ridge/60"
          strokeWidth="0.3"
        />
        {/* Valley between mountains */}
        <path d="M30 52 L40 60 L48 62 L56 60 L65 53 L65 75 L30 75 Z" className="fill-terrain-sand/20" />

        {/* Valley fog shapes (micro-climate) — stay as context in later steps */}
        <motion.g initial={false} animate={{ opacity: showFog ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <ellipse cx="48" cy="62" rx="22" ry="9" className="fill-fg-dim" opacity="0.35" />
          <ellipse cx="40" cy="60" rx="14" ry="6" className="fill-fg-dim" opacity="0.22" />
          <ellipse cx="58" cy="63" rx="12" ry="5" className="fill-fg-dim" opacity="0.26" />
        </motion.g>

        {/* Visibility labels — micro-climate step only (dropped once the physiology
            / atmosphere labels take over the same ridge & valley) */}
        <motion.g initial={false} animate={{ opacity: showVisibilityLabels ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <text
            x="48"
            y="68"
            textAnchor="middle"
            className="fill-fg font-display font-bold"
            fontSize="4.2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1.4"
            strokeLinejoin="round"
          >
            ערפל עמק
          </text>
          <text
            x="48"
            y="72"
            textAnchor="middle"
            className="fill-fg-dim font-sans"
            fontSize="2.2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeLinejoin="round"
          >
            ראות &lt; 500 מ׳
          </text>

          {/* Ridge clear annotation */}
          <text
            x="82"
            y="30"
            textAnchor="middle"
            className="fill-status-ok font-display font-bold"
            fontSize="3.2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            רכס: ראות 20 ק"מ
          </text>
        </motion.g>

        {/* Physiological load — same sector, opposite loads on each soldier */}
        <motion.g initial={false} animate={{ opacity: showPhysio ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          {/* Ridge soldier — cold load */}
          <SoldierMarker x={78} y={32} tone="cool" />
          <text
            x="78"
            y="24"
            textAnchor="middle"
            className="fill-accent-cool font-display font-bold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeLinejoin="round"
          >
            עומס קור
          </text>

          {/* Valley soldier — heat + humidity load */}
          <SoldierMarker x={48} y={61} tone="hot" pulse />
          <text
            x="48"
            y="51"
            textAnchor="middle"
            className="fill-accent-hot font-display font-bold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeLinejoin="round"
          >
            עומס חום
          </text>
        </motion.g>

        {/* Load caption — ties the loads to their drivers (physiology step only) */}
        <motion.g initial={false} animate={{ opacity: showPhysio ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.28 }}>
          <text
            x="50"
            y="72"
            textAnchor="middle"
            className="fill-fg-muted font-sans"
            fontSize="2.4"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeLinejoin="round"
          >
            טמפרטורה · לחות · רוח — עומס על הלוחם
          </text>
        </motion.g>

        {/* Atmosphere beams (laser/IR being absorbed) */}
        <motion.g initial={false} animate={{ opacity: showBeams ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          {/* IR beam from above into valley — gets attenuated */}
          <line x1="40" y1="8" x2="48" y2="55" className="stroke-accent" strokeWidth="0.5" strokeDasharray="1 0.5" />
          <text
            x="40"
            y="6"
            textAnchor="middle"
            className="fill-accent font-display font-bold"
            fontSize="2.6"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.85"
            strokeLinejoin="round"
          >
            IR נכנס
          </text>
          {/* Attenuation marker */}
          <g transform="translate(48 58)">
            <circle r="3" className="fill-status-danger/15 stroke-status-danger" strokeWidth="0.4" />
            <line x1="-1.7" y1="-1.7" x2="1.7" y2="1.7" className="stroke-status-danger" strokeWidth="0.5" strokeLinecap="round" />
            <line x1="-1.7" y1="1.7" x2="1.7" y2="-1.7" className="stroke-status-danger" strokeWidth="0.5" strokeLinecap="round" />
          </g>
          <text
            x="62"
            y="58"
            textAnchor="middle"
            className="fill-status-danger font-display font-bold"
            fontSize="2.4"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeLinejoin="round"
          >
            נבלע באדים
          </text>
        </motion.g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        אותה גזרה · 4 שכבות אקלים
      </div>
    </div>
  );
}

/**
 * Small helmeted-soldier silhouette for the weather stage. Feet sit at (x, y)
 * and the figure grows upward, so it can stand on a ridge peak or a valley
 * floor. Filled in the load colour (hot / cool); the hot figure carries a
 * pulsing stress ring. Reads as a soldier without its label.
 */
function SoldierMarker({ x, y, tone, pulse = false }: { x: number; y: number; tone: 'hot' | 'cool'; pulse?: boolean }) {
  const fillClass = tone === 'hot' ? 'fill-accent-hot' : 'fill-accent-cool';
  const strokeClass = tone === 'hot' ? 'stroke-accent-hot' : 'stroke-accent-cool';
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* soft ground shadow */}
      <ellipse cx="0" cy="0.4" rx="2.5" ry="0.7" className="fill-fg-dim" opacity="0.18" />
      {pulse && (
        <circle cx="0" cy="-2.4" r="4" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
          <animate attributeName="r" values="3;5.5;3" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      {/* torso */}
      <path d="M-2.1 0 L-1.35 -3.1 Q0 -3.8 1.35 -3.1 L2.1 0 Z" className={fillClass} />
      {/* head */}
      <circle cx="0" cy="-4.25" r="1.05" className={fillClass} />
      {/* helmet dome + brim */}
      <path d="M-1.35 -4.35 A1.35 1.2 0 0 1 1.35 -4.35 Z" className={fillClass} />
      <line x1="-1.6" y1="-4.3" x2="1.6" y2="-4.3" className={strokeClass} strokeWidth="0.45" strokeLinecap="round" />
    </g>
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