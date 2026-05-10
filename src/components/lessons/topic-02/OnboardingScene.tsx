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
  icon: IconName;
};

const LAYERS: Layer[] = [
  { id: 'base',     label: 'הטבע: הר, נהר, מדבר',     desc: 'כל מה שהיה כאן לפני שאנשים נכנסו לשטח.',                                  icon: 'mountain' },
  { id: 'roads',    label: 'דרכים וצינורות',          desc: 'איך זזים בשטח: כבישים, מסילות, צינורות גז ודלק.',                         icon: 'truck' },
  { id: 'buildings',label: 'איפה אנשים נמצאים',       desc: 'ערים, כפרים, בתים, מתחמים — היכן גרים, עובדים ומסתתרים.',                  icon: 'capital' },
  { id: 'borders',  label: 'גבולות וזכויות שליטה',    desc: 'קווים שמסמנים מי שולט באיזה אזור — לא רואים אותם בשטח, אבל הם משנים הכל.', icon: 'flag' },
  { id: 'ops',      label: 'שכבה צבאית בזמן אמת',     desc: 'איפה הכוחות שלנו, איפה האויב, איפה האיומים — משתנה כל שעה.',               icon: 'crosshair' },
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
  const enabled = new Set(LAYERS.slice(0, step).map((l) => l.id));
  const enabledList = LAYERS.slice(0, step);

  function clickLayer(i: number) {
    // Each layer button represents "show me up to layer i".
    // Clicking the current top layer again backs off one step (undo).
    const isTop = i === step - 1;
    setStep(isTop ? i : i + 1);
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

      <div className="grid lg:grid-cols-[3fr_2fr] gap-6 items-stretch">
        <div className="surface-elevated relative overflow-hidden">
          <LayeredMap enabled={enabled} />
        </div>

        <div className="space-y-3">
          {LAYERS.map((l, i) => {
            const isOn = i < step;
            const isNext = i === step;
            const isTop = isOn && i === step - 1;
            return (
              <button
                key={l.id}
                onClick={() => clickLayer(i)}
                aria-pressed={isOn}
                className={cn(
                  'w-full surface p-4 text-right transition-all flex items-center gap-3 relative',
                  isOn && 'border-accent/60 shadow-glow',
                  !isOn && isNext && 'border-accent/40 hover:border-accent hover:bg-accent/5',
                  !isOn && !isNext && 'opacity-50 hover:opacity-90'
                )}
              >
                {/* Sequential step badge */}
                <div
                  className={cn(
                    'size-7 rounded-full flex items-center justify-center shrink-0 font-mono font-bold text-xs transition-colors',
                    isOn
                      ? 'bg-accent text-bg shadow-glow'
                      : isNext
                      ? 'bg-accent/15 text-accent border border-accent/40 animate-pulse'
                      : 'bg-bg-accent text-fg-dim border border-border'
                  )}
                >
                  {i + 1}
                </div>

                <div
                  className={cn(
                    'size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                    isOn
                      ? 'bg-accent/15 text-accent border border-accent/40'
                      : 'bg-bg-accent text-fg-dim border border-border'
                  )}
                >
                  <Icon name={l.icon} size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{l.label}</div>
                  <div className="text-xs text-fg-dim mt-0.5 line-clamp-1">{l.desc}</div>
                </div>

                {/* State chip — explains what clicking will do */}
                <span
                  className={cn(
                    'shrink-0 text-xs font-mono px-2 py-1 rounded-md border whitespace-nowrap',
                    isTop && 'border-accent/50 bg-accent/10 text-accent',
                    isOn && !isTop && 'border-border bg-bg-accent text-fg-muted',
                    !isOn && isNext && 'border-accent/40 bg-accent/5 text-accent',
                    !isOn && !isNext && 'border-border-subtle bg-bg-accent text-fg-dim'
                  )}
                >
                  {isTop ? 'בטל ↩' : isOn ? 'חזור לכאן' : isNext ? '+ הוסף' : `דלג עד שלב ${i + 1}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {enabledList.length > 0 && (
          <motion.div
            key={enabledList.length}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 surface p-5 border-r-4 border-r-accent-cool flex gap-4 items-start"
          >
            <Icon name="layers" size={22} className="text-accent-cool shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-mono text-accent-cool mb-1.5 tracking-widest uppercase">
                {enabledList.length} שכבות פעילות
              </div>
              <p className="text-sm text-fg-muted leading-relaxed">
                {enabledList.length === 1 && 'התחלנו — רואים רק את הטבע: הרים, נהרות, מדבר.'}
                {enabledList.length === 2 && 'הוספת דרכים — עכשיו אפשר לתכנן איך לזוז במרחב.'}
                {enabledList.length === 3 && 'הוספת יישובים — עכשיו ברור איפה אנשים נמצאים.'}
                {enabledList.length === 4 && 'הוספת גבולות — עכשיו ברור מי שולט באיזה אזור.'}
                {enabledList.length === 5 && 'תמונה מלאה לתכנון מבצעי. בלי אחת מהשכבות — נחסר מידע קריטי להחלטה.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SoftDivider text="לקרוא מפה — להציל חיים" />

      <div className="grid sm:grid-cols-2 gap-4">
        {FACTS.map((f, i) => (
          <motion.article
            key={f.headline}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.08 }}
            className="surface p-5 hover:border-accent/40 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-xl bg-bg-accent border border-border flex items-center justify-center shrink-0">
                <Icon name={f.icon} size={22} className={f.accent} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono text-fg-dim mb-1 tracking-widest uppercase">
                  {f.place}
                </div>
                <h3 className="font-display font-bold text-lg leading-tight mb-1.5 text-balance">
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
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-10 surface-elevated p-6 flex gap-4 items-center"
      >
        <div className="size-12 rounded-full bg-accent/10 border border-accent/40 flex items-center justify-center text-accent shrink-0">
          <Icon name="arrow-left" size={20} />
        </div>
        <div className="flex-1">
          <div className="text-[10px] font-mono text-accent mb-1 tracking-widest uppercase">
            עכשיו אתה מוכן
          </div>
          <p className="text-fg leading-relaxed text-pretty">הבנו שמפה היא הרבה יותר מציור על דף. בחלקים הבאים נלמד את "שפת המפה": איך מכניסים הר שלם לנייר קטן, איך מודדים מרחק, ואיך קוראים נ"צ בלי להתבלבל.        </p>
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
