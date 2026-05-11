'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Layer = {
  id: string;
  label: string;
  desc: string;
  popupTitle: string;
  popupBody: string;
  icon: IconName;
};

const LAYERS: Layer[] = [
  {
    id: 'base',
    label: 'הטבע: הר, נהר, מדבר',
    desc: 'כל מה שהיה כאן לפני שאנשים נכנסו לשטח.',
    popupTitle: 'השכבה הבסיסית: הטבע',
    popupBody: 'התחלנו — רואים רק את הטבע: הרים, נהרות ומדבר. כל ההחלטות הצבאיות שיגיעו אחר כך מסתמכות על הצורה הטבעית של הקרקע. בלי השכבה הזו אין על מה להוסיף שום דבר אחר.',
    icon: 'mountain',
  },
  {
    id: 'roads',
    label: 'דרכים וצינורות',
    desc: 'איך זזים בשטח: כבישים, מסילות, צינורות גז ודלק.',
    popupTitle: 'איך זזים בשטח',
    popupBody: 'הוספנו דרכים — עכשיו אפשר לתכנן איך לזוז במרחב. כבישים, מסילות, צינורות גז ודלק הם העורקים שדרכם הצבא מתנייע ומזין את עצמו. בלי השכבה הזו השטח הוא ים של הרים ובוץ ללא ציר תנועה.',
    icon: 'truck',
  },
  {
    id: 'buildings',
    label: 'איפה אנשים נמצאים',
    desc: 'ערים, כפרים, בתים, מתחמים — היכן גרים, עובדים ומסתתרים.',
    popupTitle: 'איפה האנשים נמצאים',
    popupBody: 'הוספנו יישובים — עכשיו ברור איפה אנשים נמצאים. ערים, כפרים, בתים ומתחמים מספרים איפה ימצאו אזרחים, איפה האויב יכול להתחפר, ואיפה חייבים להיזהר במיוחד מפגיעה בחפים מפשע.',
    icon: 'capital',
  },
  {
    id: 'borders',
    label: 'גבולות וזכויות שליטה',
    desc: 'קווים שמסמנים מי שולט באיזה אזור — לא רואים אותם בשטח, אבל הם משנים הכל.',
    popupTitle: 'מי שולט באיזה אזור',
    popupBody: 'הוספנו גבולות — עכשיו ברור מי שולט באיזה אזור. אלו קווים שלא רואים בשטח, אבל הם קובעים איפה מותר לחצות, איפה צריך אישור מדיני, ואיפה בכלל הקרב יכול להתרחש.',
    icon: 'flag',
  },
  {
    id: 'ops',
    label: 'שכבה צבאית בזמן אמת',
    desc: 'איפה הכוחות שלנו, איפה האויב, איפה האיומים — משתנה כל שעה.',
    popupTitle: 'התמונה המבצעית בזמן אמת',
    popupBody: 'השכבה האחרונה והמשתנה ביותר: איפה הכוחות שלנו, איפה האויב ואיפה האיומים. עכשיו יש לנו תמונה מלאה לתכנון מבצעי — בלי אחת מהשכבות הקודמות, היינו מקבלים החלטה עיוורת.',
    icon: 'crosshair',
  },
];

const FACTS: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'טעות של 100 מטר בגלל רשת ישנה',
    place: 'ישראל • שנות ה-2000',
    lesson: 'צה"ל שדרג את רשת הקואורדינטות שלו (השפה שמייצרת נקודות ציון - נ"צ). המעבר גרם לנקודות על המפה "לזוז" ב-100 מטר. תותחן שהשתמש במפה ישנה, עלול היה לפגוע בטעות בכוחותינו במקום באויב.',
    icon: 'crosshair', // מתאים לרשת קואורדינטות ותותחנים
    accent: 'text-accent-hot',
  },
  {
    headline: 'לנחות בחוף הלא נכון',
    place: 'חופי נורמנדי • 1944',
    lesson: 'מבצע הנחיתה הגדול בהיסטוריה דרש מפות סופר-מפורטות ("קנה מידה גדול"). כל כוח קיבל מפה מדויקת של הגזרה שלו. אם היו משתמשים במפות כלליות, חיילים היו נוחתים עיוורים ישר אל תוך האש.',
    icon: 'wave', // מתאים לנחיתה בחוף
    accent: 'text-terrain-sky',
  },
  {
    headline: 'לנווט כשהעיניים לא רואות כלום',
    place: 'יערות בלגיה • דצמבר 1944',
    lesson: 'נווט איבד את דרכו בסופת שלגים. כשהראות היא אפס, הדרך היחידה שלו לשרוד ולהבין אם הוא הולך לכיוון תהום או פסגה, הייתה "לדמיין" את צורת השטח דרך קווי הגובה המצוירים על המפה.',
    icon: 'mountain', // מתאים לתבליט וקווי גובה
    accent: 'text-terrain-ridge',
  },
  {
    headline: 'מפת עולם משקרת במרחקים',
    place: 'תכנון שיגור טילים',
    lesson: 'אי אפשר "לשטח" כדור לדף נייר מבלי לעוות אותו. מפה שעובדת נהדר לניווט רגלי בעיר, תהיה שגויה לחלוטין בניסיון לחשב דרכה מסלול של טיל ארוך טווח.',
    icon: 'globe', // מתאים להיטלים ועיוותים גלובליים
    accent: 'text-accent-cool',
  },
];

export function OnboardingScene() {
  // Sequential build-up: `step` = how many layers from the top of LAYERS are active (0..5).
  const [step, setStep] = useState(1);
  // Which layer's accordion panel is currently expanded (null = collapsed).
  const [expanded, setExpanded] = useState<string | null>(LAYERS[0].id);
  const enabled = new Set(LAYERS.slice(0, step).map((l) => l.id));

  function clickLayer(i: number) {
    const id = LAYERS[i].id;
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setStep(i + 1);
    setExpanded(id);
  }

  return (
    <section id="scene-onboarding" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="02.0"
        eyebrow="לפני שמתחילים"
        title={
          <>
            <span className="gradient-text">מפה היא לא תמונה שטוחה – היא ערימת שכבות</span>
          </>
        }
        intro={`תחשבו על מפה צבאית כמו על ערימה של שקפים שקופים שמונחים זה על זה. כל שקף מוסיף סוג אחר של מידע. הדליקו את השכבות אחת אחרי השנייה, וראו איך שטח ריק הופך לתמונה מבצעית שלמה.`}
      />

      <div className="grid lg:grid-cols-[2fr_3fr] gap-6 items-start">
        <div className="space-y-3">
          {LAYERS.map((l, i) => {
            const isOn = i < step;
            const isExpanded = expanded === l.id;
            const isPassed = isOn && !isExpanded;
            return (
              <div
                key={l.id}
                className={cn(
                  'surface overflow-hidden transition-colors',
                  isExpanded
                    ? 'border-accent shadow-glow bg-accent/5'
                    : 'hover:border-border-strong',
                  isPassed && 'opacity-80'
                )}
              >
                <button
                  type="button"
                  onClick={() => clickLayer(i)}
                  aria-expanded={isExpanded}
                  aria-controls={`layer-panel-${l.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {isExpanded && (
                    <motion.span
                      layoutId="t2-onb-bar"
                      className="absolute inset-y-0 end-0 w-1 bg-accent rounded-l-full"
                    />
                  )}
                  <span
                    className={cn(
                      'size-9 rounded-xl flex items-center justify-center shrink-0 transition-all',
                      isExpanded ? 'bg-accent text-bg shadow-glow' : isPassed ? 'bg-status-ok/15 text-status-ok' : 'bg-bg-accent text-fg-muted'
                    )}
                  >
                    {isPassed ? (
                      <Icon name="check" size={16} strokeWidth={2.5} />
                    ) : (
                      <span className="font-mono text-sm font-bold">{i + 1}</span>
                    )}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className={cn('font-medium leading-tight', isExpanded && 'text-accent')}>{l.label}</div>
                  </div>

                  <Icon
                    name={l.icon}
                    size={20}
                    className={cn('transition-colors shrink-0', isExpanded ? 'text-accent' : 'text-fg-dim')}
                  />

                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', isExpanded ? 'text-accent' : 'text-fg-dim')}
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
                  {isExpanded && (
                    <motion.div
                      key={`panel-${l.id}`}
                      id={`layer-panel-${l.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-accent/20">
                        <div className="text-xs font-mono text-accent mt-3 mb-2 tracking-widest uppercase">
                          מה השכבה הזו מוסיפה
                        </div>
                        <h4 className="font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2">
                          {l.popupTitle}
                        </h4>
                        <p className="text-sm leading-relaxed text-fg-muted text-pretty">
                          {l.popupBody}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="surface-elevated relative overflow-hidden sticky top-6">
          <LayeredMap enabled={enabled} />
        </div>
      </div>

      <SoftDivider text="לקרוא מפה — להציל חיים" />

      <div className="grid sm:grid-cols-2 gap-4">
        {FACTS.map((f, i) => (
          <motion.article
            key={f.headline}
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
                <Icon name={f.icon} size={22} className={f.accent} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-fg-dim mb-1.5 tracking-widest uppercase flex items-center gap-2">
                  <span className="size-1 rounded-full bg-fg-dim" />
                  {f.place}
                </div>
                <h3 className="font-display font-bold text-lg leading-tight mb-2 text-balance">
                  {f.headline}
                </h3>
                <p className="text-sm text-fg-muted leading-relaxed text-pretty">
                  {f.lesson}
                </p>
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
          <div className="text-xs font-mono text-accent mb-1.5 tracking-widest uppercase">
            עכשיו אתה מוכן
          </div>
          <p className="text-fg leading-relaxed text-pretty text-sm sm:text-base">
            הבנו שמפה היא הרבה יותר מציור על דף. בחלקים הבאים נלמד את "שפת המפה":
            <strong className="text-fg"> איך מכניסים הר שלם לנייר קטן, איך מודדים מרחק, ואיך קוראים נ"צ בלי להתבלבל</strong>.
          </p>
        </div>
      </motion.div>
    </section>
  );
}

function LayeredMap({ enabled }: { enabled: Set<string> }) {
  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f5f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" fill="url(#ground)" />

        {/* Base: terrain */}
        <Layer show={enabled.has('base')}>
          <path d="M0 50 L20 35 L40 45 L60 28 L80 40 L100 32 L100 75 L0 75 Z" className="fill-terrain-ridge/30 stroke-terrain-ridge/60" strokeWidth="0.2" />
          <path d="M0 60 L25 55 L50 62 L75 56 L100 60 L100 75 L0 75 Z" className="fill-terrain-sand/20" />
          {/* Contour hints */}
          {[1, 2, 3].map((i) => (
            <path key={i} d={`M 10 ${20 + i * 4} Q 50 ${15 + i * 3} 90 ${20 + i * 4}`} fill="none" className="stroke-fg-dim" strokeWidth="0.1" opacity="0.4" />
          ))}
        </Layer>

        {/* Roads */}
        <Layer show={enabled.has('roads')}>
          <path d="M0 55 Q 40 50 60 48 T 100 45" fill="none" className="stroke-accent" strokeWidth="0.7" />
          <path d="M30 75 L30 50 L55 35" fill="none" className="stroke-accent/70" strokeWidth="0.5" strokeDasharray="1.5 1" />
        </Layer>

        {/* Buildings */}
        <Layer show={enabled.has('buildings')}>
          {[
            [25, 48], [27, 50], [29, 49], [31, 51], [33, 50],
            [62, 47], [64, 45], [66, 48],
            [80, 41], [82, 43],
          ].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="1.5" height="1.5" className="fill-fg-muted/80" />
          ))}
        </Layer>

        {/* Borders */}
        <Layer show={enabled.has('borders')}>
          <line x1="50" y1="0" x2="48" y2="75" className="stroke-accent-hot" strokeWidth="0.4" strokeDasharray="2 1.5" />
          <text x="52" y="12" className="fill-accent-hot/70 text-[2.5px] font-mono">גבול A↔B</text>
        </Layer>

        {/* Operational */}
        <Layer show={enabled.has('ops')}>
          {/* Friendly */}
          <g>
            <circle cx="20" cy="62" r="2" className="fill-accent-cool" />
            <text x="20" y="68" textAnchor="middle" className="fill-accent-cool text-[2.5px] font-mono">כוח ידידותי</text>
          </g>
          {/* Threat */}
          <g>
            <circle cx="78" cy="38" r="2.2" className="fill-accent-hot" />
            <circle cx="78" cy="38" r="6" fill="none" className="stroke-accent-hot/40" strokeWidth="0.3" strokeDasharray="0.8 0.8">
              <animate attributeName="r" values="4;9;4" dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur="2.2s" repeatCount="indefinite" />
            </circle>
            <text x="78" y="32" textAnchor="middle" className="fill-accent-hot text-[2.5px] font-mono">איום</text>
          </g>
        </Layer>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        הדלק שכבות מימין כדי לבנות את המפה
      </div>

      {enabled.size === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-fg-dim text-sm">מפה ריקה — בחר שכבה</span>
        </div>
      )}
    </div>
  );
}

function Layer({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <motion.g
      initial={false}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration: 0.4 }}
      style={{ pointerEvents: show ? 'auto' : 'none' }}
    >
      {children}
    </motion.g>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div className={cn('relative w-9 h-5 rounded-full transition-colors shrink-0', on ? 'bg-accent' : 'bg-bg-accent border border-border')}>
      <motion.div
        className={cn('absolute top-0.5 size-4 rounded-full', on ? 'bg-bg' : 'bg-fg-dim')}
        animate={{ x: on ? -16 : -2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </div>
  );
}

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-[10px] font-mono text-fg-dim tracking-widest uppercase">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
