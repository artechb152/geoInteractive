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
      'כל חיזוי מתחיל בתחזית אזורית: 25°C, רוח 10 קמ"ש, ראות 12 ק"מ. זה הרקע הכללי. אבל זה הקרקע הכי גרועה לתכנון מבצע — כי באותה גזרה, באותה שעה, אזורים שונים מתנהגים <strong>אחרת</strong>. תחזית אזורית = ההתחלה. כל מתכנן רציני צריך לעבור מההתחלה לרזולוציה מקומית.',
  },
  {
    id: 'micro',
    label: 'מיקרו-אקלים — הקרקע האמיתית',
    icon: 'wave',
    popupTitle: 'אותה גזרה — שני עולמות',
    popupBody:
      'עמק צר לוכד לחות → ערפל כבד עד 09:00. הרכס שמעל — אוויר יבש, ראות 20 ק"מ. שני אזורים במרחק קילומטר — שני שדות קרב שונים לחלוטין. <strong>מיקרו-אקלים</strong> = הטופוגרפיה יוצרת אקלים מקומי. מתכנן שלא מבחין בו, שולח את הכוח לתוך ערפל ולא יודע למה הסנסור התעוור.',
  },
  {
    id: 'physiology',
    label: 'עומס פיזיולוגי על החייל',
    icon: 'fuel',
    popupTitle: 'גוף האדם לא קורא תחזית',
    popupBody:
      'השילוב של טמפ\' + לחות + רוח קובע <strong>WBGT</strong> (Wet-Bulb Globe Temperature) — המדד שכל צבא משתמש בו לחיזוי שחיקת כוח. ב-WBGT גבוה, שתיית מים מתפלת חצי ליטר לשעה, היפותרמיה ב-WBGT נמוך מובילה לכשל מנטלי. תכנון מבצע <strong>חייב</strong> לכלול את הנתון הזה — אחרת החייל יתפרק לפני המגע עם האויב.',
  },
  {
    id: 'atmosphere',
    label: 'אטמוספירה כשכבה אופטית',
    icon: 'bolt',
    popupTitle: 'מולקולות שאוכלות גלים',
    popupBody:
      'אדי מים, אבק, גשם — כולם <strong>בולעים</strong> גלים אלקטרומגנטיים. הלייזר של ציין המטרה מתפזר. ה-IR של הסנסור התרמי מתפזר. הראדאר חוטף ירידה ביכולת. הפלטפורמה האווירית לא יכולה לחדור את תקרת הענן. אטמוספירה היא לא רקע — היא מתווך פיזיקלי שמשנה את אופן פעולת המערכות שלך.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'החורף הרס את הצבא הגדול בעולם',
    place: 'פלישת נפוליאון לרוסיה · 1812',
    lesson: 'נפוליאון יצא ביוני עם 600,000 חיילים. בנובמבר נשארו כ-30,000. הטמפ׳ ירדה ל-30-° צלזיוס. לא היה מי שמכוון את התותחים, כי הידיים נצמדו לפלדה. סוסים קפאו עומדים. החורף הרוסי לא היה רקע — הוא היה האויב הראשי.',
    icon: 'fuel',
    accent: 'text-accent-cool',
  },
  {
    headline: 'ערפל הסתיר התקפה של 200 אלף חיילים',
    place: 'יער הארדנים · דצמבר 1944',
    lesson: 'ההתקפה הגרמנית בקרב הבליטה הצליחה רק כי ערפל כבד בבוקר 16 בדצמבר קרקע את כל חיל האוויר בעלות הברית. שלושה ימים שלמים, סדר כוחות גרמני עצום זז בשטח גלוי — אבל אף לוויין ואף מטוס לא ראה אותו. תחזית טובה הייתה משנה את תוצאות הקרב.',
    icon: 'wave',
    accent: 'text-fg-dim',
  },
  {
    headline: 'תקרת ענן עצרה תקיפות אוויר חודשים',
    place: 'וייטנאם · עונת הגשמים, אמצע שנות ה-60',
    lesson: 'מונסון = תקרת ענן של 200 מטר. מסוקי תקיפה לא יכלו לטוס. ה-B-52 פגעו עיוור. הוויטקונג ידעו את התחזית טוב יותר מהאמריקאים, ותכננו את התקפותיהם במדויק להתאמה עם מזג האוויר שביטל את עליונות האוויר.',
    icon: 'plane',
    accent: 'text-terrain-sky',
  },
  {
    headline: 'סופת חול ביטלה סנסורים תרמיים',
    place: 'מבצע "סופת המדבר" · עיראק 1991',
    lesson: 'במלחמת המפרץ הראשונה, סופת חול גדולה כיסתה את ה-IR של כלי הקרב האמריקאיים. טנקי M1 השתמשו ב-IR כדי לראות בלילה ובמזג אוויר רע — אבל החלקיקים פיזרו את הגל. הפיתרון: רדאר מילימטרי + הסתמכות על GPS לניווט תוך מזג אוויר עיוור.',
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
        title={
          <>
            <span className="gradient-text">האקלים הוא חייל</span>, לא רקע
          </>
        }
        intro="אותה גזרה. 12 שעות מאוחר יותר. שני שדות קרב שונים. תלמדו לראות מזג אוויר ב-4 שכבות — מהמבט האזורי הרחב ועד לאטמוספירה כשכבה פיזיקלית פעילה ששוברת סנסורים."
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
                  aria-controls={`t7-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t7-onb-bar"
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
                      key={`t7-onb-panel-${s.id}`}
                      id={`t7-onb-panel-${s.id}`}
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

      <ReadyCallout title="עכשיו אתה מוכן">
        <p>הבנת שמזג אוויר זה לא רקע — זה פרמטר פעיל. בשלוש הסצנות הבאות נצלול:
            <strong className="text-fg"> מיקרו-אקלים ועומס פיזיולוגי, איך אטמוספירה משבשת סנסורים, ואיך תקרת ענן קובעת איזו פלטפורמה תטוס</strong>.</p>
      </ReadyCallout>
    </section>
  );
}

function WeatherStage({ view }: { view: View }) {
  const showFog = view === 'micro' || view === 'physiology' || view === 'atmosphere';
  const showPhysio = view === 'physiology' || view === 'atmosphere';
  const showBeams = view === 'atmosphere';

  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          <linearGradient id="sky-7" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dde6f0" />
            <stop offset="100%" stopColor="#f0f4f9" />
          </linearGradient>
          <radialGradient id="fog-7" cx="50%" cy="80%" r="60%">
            <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" fill="url(#sky-7)" />

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

        {/* Valley fog (micro-climate) */}
        <motion.g initial={false} animate={{ opacity: showFog ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <ellipse cx="48" cy="62" rx="22" ry="9" fill="url(#fog-7)" />
          <ellipse cx="40" cy="60" rx="14" ry="6" fill="url(#fog-7)" opacity="0.6" />
          <ellipse cx="58" cy="63" rx="12" ry="5" fill="url(#fog-7)" opacity="0.7" />
          <text
            x="48"
            y="68"
            textAnchor="middle"
            className="fill-fg-dim font-display font-bold"
            fontSize="3.4"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1.1"
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

        {/* Physiological zones — soldier markers with heat indicators */}
        <motion.g initial={false} animate={{ opacity: showPhysio ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          {/* Ridge soldier (cool) */}
          <g>
            <circle cx="78" cy="32" r="2.4" className="fill-accent-cool" />
            <text
              x="78"
              y="28"
              textAnchor="middle"
              className="fill-accent-cool font-display font-bold"
              fontSize="2.4"
              paintOrder="stroke"
              stroke="#ffffff"
              strokeWidth="0.8"
              strokeLinejoin="round"
            >
              קור
            </text>
          </g>
          {/* Valley soldier (heat + humid) */}
          <g>
            <circle cx="48" cy="60" r="2.4" className="fill-accent-hot" />
            <circle cx="48" cy="60" r="4" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
              <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
            </circle>
            <text
              x="48"
              y="55"
              textAnchor="middle"
              className="fill-accent-hot font-display font-bold font-bold"
              fontSize="2.6"
              paintOrder="stroke"
              stroke="#ffffff"
              strokeWidth="0.85"
              strokeLinejoin="round"
            >
              חום + לחות
            </text>
          </g>
        </motion.g>

        {/* Atmosphere beams (laser/IR being absorbed) */}
        <motion.g initial={false} animate={{ opacity: showBeams ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          {/* IR beam from above into valley — gets attenuated */}
          <line x1="40" y1="8" x2="48" y2="55" className="stroke-accent" strokeWidth="0.5" strokeDasharray="1 0.5" />
          <text
            x="40"
            y="6"
            textAnchor="middle"
            className="fill-accent font-display font-bold font-bold"
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

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-sm font-display font-semibold text-fg-muted tracking-wider">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
