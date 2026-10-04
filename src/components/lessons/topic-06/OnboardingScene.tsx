'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { ReadyCallout } from '@/components/lesson/ReadyCallout';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Phase = 'plan' | 'start' | 'travel' | 'arrive';

type Step = {
  id: Phase;
  label: string;
  icon: IconName;
  caption: string;
  insight: string;
};

const STEPS: Step[] = [
  {
    id: 'plan',
    label: 'תכנון: בחירת המסלול',
    icon: 'flag',
    caption: 'מסמנים במפה את נקודת המוצא (A) ואת היעד (B), ומשווים בין מסלולים אפשריים. בוחנים את המרחק, את תנאי השטח ואת מידת החשיפה לאורך כל מסלול.',
    insight: 'תכנון מראש מסייע לצפות קשיים ולבחור נקודות שבהן נבדוק את המיקום. המסלול הקצר ביותר אינו בהכרח המתאים ביותר למשימה.',
  },
  {
    id: 'start',
    label: 'יציאה: קביעת כיוון',
    icon: 'compass',
    caption: 'לפני היציאה מוודאים את המיקום ואת כיוון התנועה בעזרת המפה והמצפן. הכיוון מתואר באמצעות אזימוט: זווית הנמדדת במעלות מכיוון הצפון, עם כיוון השעון.',
    insight: 'סטייה קטנה בכיוון מצטברת ככל שהמרחק גדל. לדוגמה, סטייה קבועה של 5 מעלות לאורך קילומטר תרחיק אותנו בכ־90 מטר מהקו המתוכנן.',
  },
  {
    id: 'travel',
    label: 'בתנועה: בדיקת המיקום',
    icon: 'eye',
    caption: 'במהלך התנועה משווים בין סימנים בולטים בשטח לבין מיקומם במפה. בהמחשה, הגבעה והדקלים משמשים נקודות ייחוס לבדיקת המיקום ביחס למסלול.',
    insight: 'בדיקות חוזרות לאורך הדרך מסייעות לזהות סטייה מוקדם. אם השטח אינו תואם את הצפוי, בודקים מחדש את המיקום ואת הכיוון לפני שממשיכים.',
  },
  {
    id: 'arrive',
    label: 'הגעה: אימות היעד',
    icon: 'target',
    caption: 'בהגעה לאזור היעד מזהים את הנקודה המתוכננת באמצעות סימנים שנבחרו מראש, כגון צומת דרכים או מבנה בולט. בודקים גם את התאמת הסביבה למפה.',
    insight: 'קרבה ליעד אינה מספיקה כדי לאשר הגעה. אימות הנקודה חשוב במיוחד בחושך או בראות מוגבלת, כשקל לבלבל בין מקומות דומים.',
  },
];

// Background sources for the historical examples; the final card is illustrative:
// https://terpconnect.umd.edu/~tlaloc/archastro/ae16.html
// https://www.nps.gov/places/hurtgen-forest.htm
// https://www.easa.europa.eu/en/newsroom-and-events/news/easa-publishes-sib-warn-intermittent-gnss-outages-near-ukraine-conflict
const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'ניווט לפי כוכבים',
    place: 'חצי האי ערב · מסורות ניווט',
    lesson: 'במסורות הניווט בחצי האי ערב שימש הידע על הכוכבים להתמצאות ולקביעת כיוון. הדוגמה ממחישה כיצד היכרות עם סימנים טבעיים יכולה לתמוך בניווט גם ללא אמצעים דיגיטליים.',
    icon: 'star',
    accent: 'text-accent-cool',
  },
  {
    headline: 'השפעת השטח: יער הירטגן',
    place: 'גרמניה · 1944',
    lesson: 'בקרבות ביער הירטגן ב־1944 פעלו הכוחות בשטח מיוער וצפוף בעל תבליט קשה לתנועה. בהקשר של ניווט, זו דוגמה לחשיבות של לימוד השטח מראש והתאמת המסלול לתנאיו.',
    icon: 'compass',
    accent: 'text-accent-hot',
  },
  {
    headline: 'ניווט בתנאי שיבוש',
    place: 'סביבת המלחמה באוקראינה · 2022',
    lesson: 'בעקבות הפלישה לאוקראינה ב־2022 התריעה הסוכנות האירופית לבטיחות תעופה על התגברות שיבושי ניווט לווייני באזורים הסמוכים למלחמה. עבור ניווט בשטח, הלקח הוא לשמור גם על מיומנות בשימוש במפה ובמצפן.',
    icon: 'satellite',
    accent: 'text-accent-intel',
  },
  {
    headline: 'הבחנה בין נקודות דומות',
    place: 'דוגמה להמחשה · ניווט בלילה',
    lesson: 'במסלול יש שני צמתים דומים, והיעד נמצא ליד השני. זיהוי לפי מראה הצומת בלבד עלול להוביל לעצירה במקום שגוי. שילוב של המרחק שעברנו, סדר סימני הדרך והסביבה מסייע לאמת את היעד.',
    icon: 'crosshair',
    accent: 'text-status-danger',
  },
];

export function OnboardingScene() {
  const [phase, setPhase] = useState<Phase>('plan');
  const [expandedStep, setExpandedStep] = useState<Phase | null>('plan');

  const handleStepClick = (id: Phase) => {
    if (expandedStep === id) {
      setExpandedStep(null);
    } else {
      setPhase(id);
      setExpandedStep(id);
    }
  };

  return (
    <section id="scene-onboarding" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        title="ניווט בשטח: מתכנון ועד הגעה"
        intro="כיצד מגיעים מנקודת המוצא ליעד בשטח לא מוכר? נבחן ארבעה שלבים: תכנון המסלול, קביעת כיוון, בדיקת המיקום בתנועה ואימות ההגעה. בחרו בכל שלב כדי לעקוב אחר ההסבר וההמחשה."
      />

      <div className="grid md:grid-cols-[2fr_3fr] gap-6">
        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const active = phase === s.id;
            const expanded = expandedStep === s.id;
            const passed = STEPS.findIndex((x) => x.id === phase) > i;
            return (
              <div
                key={s.id}
                className={cn(
                  'relative isolate rounded-xl border bg-bg-elevated overflow-hidden transition-colors duration-200 ease-snap',
                  'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-colors before:duration-200 before:ease-snap',
                  active
                    ? 'border-brand/45'
                    : 'border-border hover:border-brand/30 hover:before:bg-brand/[0.03]'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleStepClick(s.id)}
                  aria-expanded={expanded}
                  aria-controls={`step-panel-${s.id}`}
                  className="w-full p-4 text-start flex items-center gap-3 cursor-pointer rounded-xl focus-visible:ring-inset focus-visible:ring-offset-0"
                >
                  <span
                    className={cn(
                      'size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ease-snap',
                      active || passed ? 'bg-brand-dark text-bg-elevated' : 'bg-bg-accent text-fg-muted'
                    )}
                  >
                    {passed && !active ? (
                      <Icon name="check" size={18} strokeWidth={2.5} />
                    ) : (
                      <span className="font-display text-base font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold leading-snug text-black text-lg md:text-xl">
                      {s.label}
                    </div>
                  </div>
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', expanded ? 'text-brand-dark' : 'text-fg-dim')}
                  >
                    <svg
                      width="20"
                      height="20"
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
                      key={`panel-${s.id}`}
                      id={`step-panel-${s.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-5 pt-1 space-y-4">
                        <div>
                          <div className="text-base font-display font-bold text-black mb-1.5">
                            הפעולה בשלב זה
                          </div>
                          <p className="text-base leading-relaxed text-black">{s.caption}</p>
                        </div>
                        <div>
                          <div className="text-base font-display font-bold text-black mb-1.5">
                            חשיבות הפעולה
                          </div>
                          <p className="text-base leading-relaxed text-black">{s.insight}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="surface-elevated bg-bg-accent relative overflow-hidden min-h-[280px]">
          <MissionStage phase={phase} />
        </div>
      </div>

      <h3 className="mt-12 mb-6 font-display text-2xl font-bold leading-tight text-fg sm:text-3xl">
        חשיבות הניווט בתנאים שונים
      </h3>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Local info cards (spec §1 "Info card") instead of the shared IntelCard,
            whose rounded-md surface and tracked attribution line are kept for
            the other lessons that use it. Same content and order as before. */}
        {HISTORICAL.map((h) => (
          <article key={h.headline} className="surface flex h-full flex-col p-5 sm:p-6">
            <h3 className="font-display text-lg font-bold leading-snug text-fg text-balance md:text-xl">
              {h.headline}
            </h3>
            <p className="mt-2 text-base leading-relaxed text-fg text-pretty">{h.lesson}</p>
            <div className="mt-auto pt-4 text-sm font-display font-semibold text-fg-muted">
              <span aria-hidden className="me-1.5">—</span>
              <span>{h.place}</span>
            </div>
          </article>
        ))}
      </div>

      <ReadyCallout title="בהמשך השיעור" signature={false}>
        <p>ארבעת השלבים משלבים תכנון ובדיקת מיקום לאורך הדרך. בחלקים הבאים נלמד
            <strong className="text-fg"> לקבוע אזימוט, לתכנן מסלול ולבחור שיטת ניווט המתאימה לתנאי השטח</strong>.</p>
      </ReadyCallout>
    </section>
  );
}

function MissionStage({ phase }: { phase: Phase }) {
  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width="100" height="75" className="fill-bg-accent" />

        {/* Grid */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={'gx' + i} x1={i * 10} y1="0" x2={i * 10} y2="75" className="stroke-border-subtle" strokeWidth="0.1" />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={'gy' + i} x1="0" y1={i * 10} x2="100" y2={i * 10} className="stroke-border-subtle" strokeWidth="0.1" />
        ))}

        {/* Terrain — hill landmark (גבעה): rounded grassy knoll */}
        <g>
          <defs>
            <linearGradient id="t3HillBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8c9c57" />
              <stop offset="1" stopColor="#5a6b4a" />
            </linearGradient>
          </defs>
          {/* soft ground shadow */}
          <ellipse cx="62" cy="32" rx="13" ry="1.6" className="fill-terrain-steel/16" />
          <ellipse cx="61.6" cy="32.05" rx="8" ry="0.95" className="fill-terrain-steel/12" />
          {/* dome body */}
          <path d="M50 32 C50.5 24.5 55.5 19.4 62 19.4 C68.5 19.4 73.5 24.5 73.5 32 Z" fill="url(#t3HillBody)" />
          {/* soft sunlit left shoulder */}
          <path d="M53.4 30.2 C53.8 25.4 56.4 21.4 60 20.1 C58.4 22.6 56.9 26.4 55.6 30.2 Z" fill="rgba(225,232,196,0.20)" />
          {/* soft shadow on right flank */}
          <path d="M64 20.6 C69 21.7 73 25.6 73.5 32 L67.4 32 C68.4 27 66.9 23.1 64 20.6 Z" className="fill-terrain-steel/20" />
          {/* crisp grassy outline */}
          <path d="M50 32 C50.5 24.5 55.5 19.4 62 19.4 C68.5 19.4 73.5 24.5 73.5 32" fill="none" stroke="#4d6b4e" strokeWidth="0.4" strokeLinecap="round" />
          {/* contour creases */}
          <path d="M53.6 30 C57 27.6 67 27.6 70.4 30" fill="none" stroke="rgba(60,75,55,0.34)" strokeWidth="0.22" strokeLinecap="round" />
          <path d="M55.6 27 C58.6 25.3 65.4 25.3 68.4 27" fill="none" stroke="rgba(60,75,55,0.26)" strokeWidth="0.2" strokeLinecap="round" />
          {/* grass tufts for texture */}
          <g stroke="#3f4d2f" strokeWidth="0.2" strokeLinecap="round" opacity="0.7" fill="none">
            <path d="M60.4 21.4 l-0.35 -1.1 M61 21.3 l0 -1.2 M61.6 21.4 l0.35 -1.1" />
            <path d="M57.4 24.4 l-0.3 -1 M57.9 24.3 l0.05 -1.05" />
            <path d="M65.8 24.6 l0.3 -1 M65.3 24.5 l-0.05 -1.05" />
            <path d="M62.6 26.6 l-0.3 -1 M63.1 26.6 l0.05 -1.05" />
          </g>
          {/* shrub on left slope */}
          <g>
            <line x1="56.3" y1="31.3" x2="56.3" y2="30.2" stroke="#6f5230" strokeWidth="0.26" strokeLinecap="round" />
            <circle cx="56.3" cy="29.6" r="0.95" className="fill-terrain-olive" />
            <circle cx="55.8" cy="30" r="0.7" fill="#8a9c4a" />
            <circle cx="56.8" cy="30" r="0.62" fill="#6f7f37" />
          </g>
          {/* shrub on right slope */}
          <g>
            <line x1="67.6" y1="31.2" x2="67.6" y2="30.3" stroke="#6f5230" strokeWidth="0.24" strokeLinecap="round" />
            <circle cx="67.6" cy="29.8" r="0.8" className="fill-terrain-olive" />
            <circle cx="68.1" cy="30.1" r="0.6" fill="#8a9c4a" />
          </g>
          {/* rocks at the base */}
          <path d="M52.6 32 a1.5 1.1 0 0 1 3 0 Z" className="fill-terrain-sand" />
          <path d="M52.6 32 a1.5 1.1 0 0 1 1.5 -1.05 Z" fill="#d4b884" />
          <path d="M70 32 a1.2 0.9 0 0 1 2.4 0 Z" className="fill-terrain-sand" />
          <path d="M70 32 a1.2 0.9 0 0 1 1.2 -0.86 Z" fill="#d4b884" />
          {/* base ground line */}
          <line x1="50.3" y1="32" x2="73.7" y2="32" stroke="#6f5230" strokeWidth="0.3" strokeLinecap="round" opacity="0.55" />
        </g>
        <text x="62" y="36" textAnchor="middle" className="fill-fg-muted text-[2.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >גבעה</text>

        {/* Palm grove landmark (דקלים) — three date palms */}
        <g>
          <ellipse cx="84" cy="61.9" rx="8.6" ry="1.35" className="fill-terrain-steel/16" />
          <ellipse cx="83.7" cy="61.95" rx="5.0" ry="0.85" className="fill-terrain-steel/12" />
          {/* right palm */}
          <path d="M 88.18 62 Q 87.87 57.98 87.85 53.95 L 88.25 53.95 Q 88.28 57.98 89.03 62 Z" fill="#8a6a3f" />
          <path d="M 88.25 53.95 Q 88.28 57.98 89.03 62 L 88.74 62 Q 88.06 57.98 88.15 53.95 Z" fill="#6f5230" opacity="0.5" />
          <path d="M 88.14 60.05 Q 88.46 59.71 88.78 60.05" fill="none" stroke="#6f5230" strokeWidth="0.16" strokeLinecap="round" opacity="0.6" />
          <path d="M 88.06 58.04 Q 88.32 57.7 88.59 58.04" fill="none" stroke="#6f5230" strokeWidth="0.16" strokeLinecap="round" opacity="0.6" />
          <path d="M 87.98 56.02 Q 88.19 55.68 88.39 56.02" fill="none" stroke="#6f5230" strokeWidth="0.16" strokeLinecap="round" opacity="0.6" />
          <g opacity="0.95"><circle cx="88.15" cy="54.75" r="0.38" className="fill-terrain-sand" /><circle cx="88.6" cy="55.1" r="0.38" className="fill-terrain-sand" /><circle cx="89.05" cy="54.75" r="0.38" className="fill-terrain-sand" /><circle cx="88.42" cy="55.45" r="0.38" className="fill-terrain-sand" /><circle cx="88.88" cy="55.37" r="0.38" className="fill-terrain-sand" /></g>
          <g fill="none" strokeLinecap="round" className="stroke-terrain-ridge" strokeWidth="0.5" opacity="0.55"><path d="M 88.3 53.6 Q 86.16 52.79 84.41 53.71" /><path d="M 88.3 53.6 Q 86.57 51.99 85.16 52.37" /><path d="M 88.3 53.6 Q 87.5 51.69 86.85 51.86" /><path d="M 88.3 53.6 Q 88.3 51.49 88.3 51.53" /><path d="M 88.3 53.6 Q 89.1 51.69 89.75 51.86" /><path d="M 88.3 53.6 Q 90.03 51.99 91.44 52.37" /><path d="M 88.3 53.6 Q 90.44 52.79 92.19 53.71" /></g>
          <g fill="none" strokeLinecap="round" className="stroke-brand" strokeWidth="0.4"><path d="M 88.3 53.6 Q 86.16 52.63 84.41 53.55" /><path d="M 88.3 53.6 Q 86.57 51.83 85.16 52.21" /><path d="M 88.3 53.6 Q 87.5 51.53 86.85 51.7" /><path d="M 88.3 53.6 Q 88.3 51.33 88.3 51.37" /><path d="M 88.3 53.6 Q 89.1 51.53 89.75 51.7" /><path d="M 88.3 53.6 Q 90.03 51.83 91.44 52.21" /><path d="M 88.3 53.6 Q 90.44 52.63 92.19 53.55" /></g>
          <circle cx="88.3" cy="53.6" r="0.5" className="fill-terrain-ridge" />
          {/* left palm */}
          <path d="M 78.7 62 Q 79.34 58.48 79.26 54.95 L 79.64 54.95 Q 79.72 58.48 79.5 62 Z" fill="#8a6a3f" />
          <path d="M 79.64 54.95 Q 79.72 58.48 79.5 62 L 79.22 62 Q 79.5 58.48 79.54 54.95 Z" fill="#6f5230" opacity="0.5" />
          <path d="M 78.89 60.3 Q 79.19 59.96 79.49 60.3" fill="none" stroke="#6f5230" strokeWidth="0.16" strokeLinecap="round" opacity="0.6" />
          <path d="M 79.03 58.54 Q 79.28 58.2 79.52 58.54" fill="none" stroke="#6f5230" strokeWidth="0.16" strokeLinecap="round" opacity="0.6" />
          <path d="M 79.17 56.77 Q 79.36 56.43 79.55 56.77" fill="none" stroke="#6f5230" strokeWidth="0.16" strokeLinecap="round" opacity="0.6" />
          <g opacity="0.95"><circle cx="79.15" cy="55.75" r="0.38" className="fill-terrain-sand" /><circle cx="79.6" cy="56.1" r="0.38" className="fill-terrain-sand" /><circle cx="80.05" cy="55.75" r="0.38" className="fill-terrain-sand" /><circle cx="79.42" cy="56.45" r="0.38" className="fill-terrain-sand" /><circle cx="79.88" cy="56.37" r="0.38" className="fill-terrain-sand" /></g>
          <g fill="none" strokeLinecap="round" className="stroke-terrain-ridge" strokeWidth="0.5" opacity="0.55"><path d="M 79.3 54.6 Q 77.26 53.84 75.59 54.78" /><path d="M 79.3 54.6 Q 77.65 53.07 76.31 53.5" /><path d="M 79.3 54.6 Q 78.54 52.78 77.92 53.02" /><path d="M 79.3 54.6 Q 79.3 52.59 79.3 52.7" /><path d="M 79.3 54.6 Q 80.06 52.78 80.68 53.02" /><path d="M 79.3 54.6 Q 80.95 53.07 82.29 53.5" /><path d="M 79.3 54.6 Q 81.34 53.84 83.01 54.78" /></g>
          <g fill="none" strokeLinecap="round" className="stroke-terrain-olive" strokeWidth="0.4"><path d="M 79.3 54.6 Q 77.26 53.68 75.59 54.62" /><path d="M 79.3 54.6 Q 77.65 52.91 76.31 53.34" /><path d="M 79.3 54.6 Q 78.54 52.62 77.92 52.86" /><path d="M 79.3 54.6 Q 79.3 52.43 79.3 52.54" /><path d="M 79.3 54.6 Q 80.06 52.62 80.68 52.86" /><path d="M 79.3 54.6 Q 80.95 52.91 82.29 53.34" /><path d="M 79.3 54.6 Q 81.34 53.68 83.01 54.62" /></g>
          <circle cx="79.3" cy="54.6" r="0.5" className="fill-terrain-ridge" />
          {/* center palm (tallest) */}
          <path d="M 83.13 62 Q 82.8 57.48 82.73 52.95 L 83.18 52.95 Q 83.25 57.48 84.07 62 Z" fill="#8a6a3f" />
          <path d="M 83.18 52.95 Q 83.25 57.48 84.07 62 L 83.79 62 Q 83.03 57.48 83.08 52.95 Z" fill="#6f5230" opacity="0.5" />
          <path d="M 83.08 59.8 Q 83.44 59.46 83.8 59.8" fill="none" stroke="#6f5230" strokeWidth="0.16" strokeLinecap="round" opacity="0.6" />
          <path d="M 82.98 57.54 Q 83.28 57.2 83.58 57.54" fill="none" stroke="#6f5230" strokeWidth="0.16" strokeLinecap="round" opacity="0.6" />
          <path d="M 82.88 55.27 Q 83.11 54.93 83.35 55.27" fill="none" stroke="#6f5230" strokeWidth="0.16" strokeLinecap="round" opacity="0.6" />
          <g opacity="0.95"><circle cx="83.15" cy="53.75" r="0.38" className="fill-terrain-sand" /><circle cx="83.6" cy="54.1" r="0.38" className="fill-terrain-sand" /><circle cx="84.05" cy="53.75" r="0.38" className="fill-terrain-sand" /><circle cx="83.42" cy="54.45" r="0.38" className="fill-terrain-sand" /><circle cx="83.88" cy="54.37" r="0.38" className="fill-terrain-sand" /></g>
          <g fill="none" strokeLinecap="round" className="stroke-terrain-ridge" strokeWidth="0.5" opacity="0.55"><path d="M 83.3 52.6 Q 80.85 51.77 78.85 52.51" /><path d="M 83.3 52.6 Q 81.32 50.85 79.71 50.97" /><path d="M 83.3 52.6 Q 82.39 50.51 81.65 50.39" /><path d="M 83.3 52.6 Q 83.3 50.28 83.3 50.01" /><path d="M 83.3 52.6 Q 84.21 50.51 84.95 50.39" /><path d="M 83.3 52.6 Q 85.28 50.85 86.89 50.97" /><path d="M 83.3 52.6 Q 85.75 51.77 87.75 52.51" /></g>
          <g fill="none" strokeLinecap="round" className="stroke-brand-dark" strokeWidth="0.4"><path d="M 83.3 52.6 Q 80.85 51.61 78.85 52.35" /><path d="M 83.3 52.6 Q 81.32 50.69 79.71 50.81" /><path d="M 83.3 52.6 Q 82.39 50.35 81.65 50.23" /><path d="M 83.3 52.6 Q 83.3 50.12 83.3 49.85" /><path d="M 83.3 52.6 Q 84.21 50.35 84.95 50.23" /><path d="M 83.3 52.6 Q 85.28 50.69 86.89 50.81" /><path d="M 83.3 52.6 Q 85.75 51.61 87.75 52.35" /></g>
          <circle cx="83.3" cy="52.6" r="0.5" className="fill-terrain-ridge" />
        </g>
        <text x="84" y="68" textAnchor="middle" className="fill-fg-muted text-[2.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >דקלים</text>

        {/* Start point A */}
        <g>
          <circle cx="15" cy="60" r="2.5" className="fill-accent-cool" />
          <text x="15" y="56" textAnchor="middle" className="fill-accent-cool text-[3.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >A</text>
          <text x="15" y="68" textAnchor="middle" className="fill-fg-muted text-[2.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >מוצא</text>
        </g>

        {/* End point B */}
        <g>
          <circle cx="88" cy="20" r="2.5" className="fill-accent-hot" />
          <text x="88" y="16" textAnchor="middle" className="fill-accent-hot text-[3.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >B</text>
          <text x="88" y="28" textAnchor="middle" className="fill-fg-muted text-[2.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >יעד</text>
        </g>

        {/* Phase-specific overlays */}
        <PhaseOverlay phase={phase} />
      </svg>

      <div className="absolute top-4 start-4 text-sm font-display font-semibold text-fg-muted">
        משימה: מנקודה A לנקודה B · 8 ק״מ · לילה
      </div>
    </div>
  );
}

function PhaseOverlay({ phase }: { phase: Phase }) {
  return (
    <>
      {/* Plan: Show both paths as options */}
      <motion.g
        initial={false}
        animate={{ opacity: phase === 'plan' ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ pointerEvents: phase === 'plan' ? 'auto' : 'none' }}
      >
        <line x1="15" y1="60" x2="88" y2="20" className="stroke-accent/50" strokeWidth="0.4" strokeDasharray="1.2 1" />
        <line x1="15" y1="60" x2="40" y2="40" className="stroke-fg-dim/40" strokeWidth="0.3" strokeDasharray="0.8 0.8" />
        <line x1="40" y1="40" x2="50" y2="50" className="stroke-fg-dim/40" strokeWidth="0.3" strokeDasharray="0.8 0.8" />
        <line x1="50" y1="50" x2="88" y2="20" className="stroke-fg-dim/40" strokeWidth="0.3" strokeDasharray="0.8 0.8" />
        <text x="50" y="38" className="fill-accent text-[2.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >ישיר</text>
        <text x="35" y="48" className="fill-fg-dim text-[2.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >עוקף</text>
      </motion.g>

      {/* Start: Show azimuth */}
      <motion.g
        initial={false}
        animate={{ opacity: phase === 'start' ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ pointerEvents: phase === 'start' ? 'auto' : 'none' }}
      >
        <line x1="15" y1="60" x2="88" y2="20" className="stroke-accent" strokeWidth="0.6" />
        {/* Compass arc */}
        <path d="M 25 60 A 10 10 0 0 1 22 53" fill="none" className="stroke-accent" strokeWidth="0.4" />
        <text x="29" y="55" className="fill-accent text-[3px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >47°</text>
        <text x="22" y="64" className="fill-accent text-[2.2px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >אזימוט</text>
      </motion.g>

      {/* Travel: Walking with checkpoints */}
      <motion.g
        initial={false}
        animate={{ opacity: phase === 'travel' ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ pointerEvents: phase === 'travel' ? 'auto' : 'none' }}
      >
        <line x1="15" y1="60" x2="50" y2="40" className="stroke-accent" strokeWidth="0.6" />
        <line x1="50" y1="40" x2="88" y2="20" className="stroke-accent/40" strokeWidth="0.4" strokeDasharray="1 1" />
        <circle cx="50" cy="40" r="2" className="fill-accent">
          <animate attributeName="r" values="1.5;3;1.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="50" y="36" textAnchor="middle" className="fill-accent text-[2.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >מיקום נוכחי</text>

        {/* Visual reference lines to landmarks */}
        <line x1="50" y1="40" x2="62" y2="25" className="stroke-accent-cool/50" strokeWidth="0.2" strokeDasharray="0.5 0.5" />
        <line x1="50" y1="40" x2="84" y2="61" className="stroke-accent-cool/50" strokeWidth="0.2" strokeDasharray="0.5 0.5" />
      </motion.g>

      {/* Arrive: Reached B */}
      <motion.g
        initial={false}
        animate={{ opacity: phase === 'arrive' ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ pointerEvents: phase === 'arrive' ? 'auto' : 'none' }}
      >
        <line x1="15" y1="60" x2="88" y2="20" className="stroke-accent" strokeWidth="0.6" />
        <circle cx="88" cy="20" r="6" fill="none" className="stroke-status-ok" strokeWidth="0.4">
          <animate attributeName="r" values="4;9;4" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="76" y="13" className="fill-status-ok text-[2.5px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >✓ הגעה</text>
      </motion.g>
    </>
  );
}
