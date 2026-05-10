'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
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
    label: 'תכנון: המלחמה על המפה',
    icon: 'compass',
    caption: 'אתם יושבים בחמ"ל מול המפה. סימנתם מאיפה יוצאים (A) ולאן מגיעים (B). עכשיו הדילמה: האם ללכת בקו ישר ומהיר אבל חשוף לאויב, או במסלול עוקף, מוגן וארוך יותר?',
    insight: 'ניווט מוצלח מתחיל בראש. החלטה נכונה עכשיו תחסוך לכם ברדק וטעויות בלילה, כשכבר יהיה מאוחר מדי לחשוב.',
  },
  {
    id: 'start',
    label: 'יציאה: נועלים כיוון',
    icon: 'crosshair',
    caption: 'יוצאים לדרך. שולפים מצפן ומודדים את הזווית המדויקת ליעד — זהו ה"אזימוט" (למשל: 47 מעלות). זה המצפן המוסרי שלכם לשעה הקרובה.',
    insight: 'בשטח, "בערך" זה לא עובד. סטייה קטנה של 5 מעלות תגרום לכם לפספס את היעד ב-90 מטר על כל קילומטר של הליכה.',
  },
  {
    id: 'travel',
    label: 'בתנועה: "עיניים לשטח"',
    icon: 'eye',
    caption: 'אחרי 200 מטר, עוצרים לרגע. האם הגבעה שמימין והדקלים שמשמאל נמצאים איפה שהמפה הבטיחה? אלו ה"עוגנים" שלכם — סימני דרך שמאשרים שאתם על הנתיב.',
    insight: 'נווט טוב לא רק הולך, הוא "מדבר" עם השטח. תמיד תשוו בין מה שהעיניים רואות לבין מה שהמפה מספרת.',
  },
  {
    id: 'arrive',
    label: 'הגעה: חותמת סופית',
    icon: 'target',
    caption: 'הגעתם לאזור היעד. איך תדעו שזה בדיוק זה? מחפשים "אימות": צומת דרכים מסוים או מבנה בולט. רק כשכל החלקים בפאזל מתאימים — אפשר להכריז: "הגענו".',
    insight: 'להגיע לאזור זה קל, להגיע לנקודה המדויקת בערפל או בחושך — זה האתגר האמיתי. אל תנחשו, תוודאו.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'לנווט עם החושים: סוד המדבר',
    place: 'נגב · אלפי שנים',
    lesson: 'במשך דורות, הבדואים חצו מאות קילומטרים של חולות ללא מפה אחת. הם השתמשו בכוכבים, ברוח ובצורת הדיונות. ה-GPS לא חידש כלום — הוא רק הפך את זה ליותר קל.',
    icon: 'star',
    accent: 'text-accent-cool',
  },
  {
    headline: 'אבודים בערפל: לקחי יער הוורטגן',
    place: 'גרמניה · 1944',
    lesson: 'ב-1944, יחידות אמריקאיות שלמות איבדו התמצאות ביער עבות. בלי "סיפור דרך" מוכן מראש, הן הסתובבו במעגלים ונתפסו ע"י האויב. כשלא קוראים נכון את הקרקע, השטח הופך למלכודת.',
    icon: 'compass',
    accent: 'text-accent-hot',
  },
  {
    headline: 'כשלוויינים שותקים: המלחמה המודרנית',
    place: 'אוקראינה · 2022 ואילך',
    lesson: 'בשדות הקרב של אוקראינה, ה-GPS לעיתים קרובות משובש וחסר תועלת. הלוחמים חזרו למקורות: מפת נייר ומצפן. מי שסומך רק על הטכנולוגיה — יישאר מאחור ברגע האמת.',
    icon: 'bolt',
    accent: 'text-accent-intel',
  },
  {
    headline: 'מחיר הטעות: ניווט תחת אש',
    place: 'דרום לבנון · 1997',
    lesson: 'בפעילות מבצעית בלבנון, טעויות קטנות במיקום הובילו יחידות עילית למקומות לא מתוכננים ולקרבות קשים. בניווט קרבי, סטייה של מטרים ספורים יכולה להיות ההבדל בין הצלחה לאסון.',
    icon: 'crosshair',
    accent: 'text-status-danger',
  },
];

export function OnboardingScene() {
  const [phase, setPhase] = useState<Phase>('plan');
  const current = STEPS.find((s) => s.id === phase)!;

  return (
    <section id="scene-onboarding" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="03.0"
        eyebrow="לפני שמתחילים"
        title={
          <>
            ניווט זה לא רק <span className="gradient-text">להסתכל במפה</span>
          </>
        }
        intro="דמיין שאתה צריך להוביל קבוצה ממקום A למקום B — בלילה, בשטח שאתה לא מכיר. בוא נראה ביחד מה זה אומר בפועל, צעד אחר צעד."
      />

      <div className="grid lg:grid-cols-[3fr_2fr] gap-6 items-stretch">
        <div className="surface-elevated relative overflow-hidden">
          <MissionStage phase={phase} />
        </div>

        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const active = phase === s.id;
            const passed = STEPS.findIndex((x) => x.id === phase) > i;
            return (
              <motion.button
                key={s.id}
                onClick={() => setPhase(s.id)}
                whileHover={{ x: -3 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full surface p-4 text-right transition-all flex items-center gap-3 relative overflow-hidden',
                  active
                    ? 'border-accent shadow-glow bg-accent/5'
                    : 'hover:border-border-strong hover:bg-bg-accent/30',
                  passed && !active && 'opacity-80'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="t3-onb-step-bar"
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
                  <div className={cn('font-medium leading-tight text-sm', active && 'text-accent')}>
                    {s.label}
                  </div>
                </div>
                <Icon
                  name={s.icon}
                  size={20}
                  className={cn('transition-colors', active ? 'text-accent' : 'text-fg-dim')}
                />
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mt-6 surface-elevated p-6 grid md:grid-cols-2 gap-6"
        >
          <div className="flex gap-4 items-start">
            <Icon name="eye" size={22} className="text-accent-cool shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-mono text-accent-cool mb-1.5 tracking-widest uppercase">
                מה אתה עושה בשלב הזה
              </div>
              <p className="text-sm leading-relaxed text-fg">{current.caption}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <Icon name="spark" size={22} className="text-accent shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-mono text-accent mb-1.5 tracking-widest uppercase">
                ולמה זה משנה
              </div>
              <p className="text-sm leading-relaxed text-fg">{current.insight}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <SoftDivider text="ניווט גרוע = חיים בסכנה" />

      <div className="grid sm:grid-cols-2 gap-4">
        {HISTORICAL.map((h, i) => (
          <motion.article
            key={h.headline}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -3 }}
            className="surface p-5 hover:border-accent/40 hover:shadow-elevated transition-all duration-300 relative overflow-hidden group"
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-bl from-bg-elevated via-bg-card to-bg-card opacity-50 group-hover:opacity-100 transition-opacity"
            />
            <div className="relative flex items-start gap-4">
              <div className="size-12 rounded-xl bg-bg-elevated border border-border-strong flex items-center justify-center shrink-0 group-hover:border-accent/40 transition-colors">
                <Icon name={h.icon} size={22} className={h.accent} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono text-fg-dim mb-1.5 tracking-widest uppercase flex items-center gap-2">
                  <span className="size-1 rounded-full bg-fg-dim group-hover:bg-accent transition-colors" />
                  {h.place}
                </div>
                <h3 className="font-display font-bold text-lg leading-tight mb-2 text-balance group-hover:text-accent transition-colors">
                  {h.headline}
                </h3>
                <p className="text-sm text-fg-muted leading-relaxed text-pretty">
                  {h.lesson}
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
          <div className="text-[10px] font-mono text-accent mb-1.5 tracking-widest uppercase">
            עכשיו אתה מוכן
          </div>
          <p className="text-fg leading-relaxed text-pretty text-sm sm:text-base">
            הבנת ש"ניווט" זה תהליך שלם — לא רק קריאת מפה. בשלוש הסצנות הבאות נלמד את הכלים בפועל:
            <strong className="text-fg"> איך מחשבים אזימוט, איך מתכננים מסלול, ואיך מנווטים בשטח אויב</strong>.
          </p>
        </div>
      </motion.div>
    </section>
  );
}

function MissionStage({ phase }: { phase: Phase }) {
  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ground-3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f5f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" fill="url(#ground-3)" />

        {/* Grid */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={'gx' + i} x1={i * 10} y1="0" x2={i * 10} y2="75" className="stroke-border-subtle" strokeWidth="0.1" />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={'gy' + i} x1="0" y1={i * 10} x2="100" y2={i * 10} className="stroke-border-subtle" strokeWidth="0.1" />
        ))}

        {/* Terrain — hills, anchor landmarks */}
        <path d="M55 30 L62 18 L70 32 Z" className="fill-terrain-ridge/40 stroke-terrain-ridge" strokeWidth="0.3" />
        <text x="62" y="36" textAnchor="middle" className="fill-fg-muted text-[2.5px] font-mono">גבעה</text>

        {/* Trees */}
        {[
          [80, 60], [82, 62], [84, 60], [86, 63], [88, 61],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.2" className="fill-terrain-olive/60" />
        ))}
        <text x="84" y="68" textAnchor="middle" className="fill-fg-muted text-[2.5px] font-mono">דקלים</text>

        {/* Start point A */}
        <g>
          <circle cx="15" cy="60" r="2.5" className="fill-accent-cool" />
          <text x="15" y="56" textAnchor="middle" className="fill-accent-cool text-[3.5px] font-mono font-bold">A</text>
          <text x="15" y="68" textAnchor="middle" className="fill-fg-muted text-[2.5px] font-mono">מוצא</text>
        </g>

        {/* End point B */}
        <g>
          <circle cx="88" cy="20" r="2.5" className="fill-accent-hot" />
          <text x="88" y="16" textAnchor="middle" className="fill-accent-hot text-[3.5px] font-mono font-bold">B</text>
          <text x="88" y="28" textAnchor="middle" className="fill-fg-muted text-[2.5px] font-mono">יעד</text>
        </g>

        {/* Phase-specific overlays */}
        <PhaseOverlay phase={phase} />
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        משימה: A → B · 8 ק"מ · לילה
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
        <text x="50" y="38" className="fill-accent text-[2.5px] font-mono">ישיר</text>
        <text x="35" y="48" className="fill-fg-dim text-[2.5px] font-mono">עוקף</text>
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
        <text x="29" y="55" className="fill-accent text-[3px] font-mono font-bold">47°</text>
        <text x="22" y="64" className="fill-accent text-[2.2px] font-mono">אזימוט</text>
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
        <text x="50" y="36" textAnchor="middle" className="fill-accent text-[2.5px] font-mono font-bold">אתה כאן</text>

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
        <text x="76" y="13" className="fill-status-ok text-[2.5px] font-mono font-bold">✓ הגעה</text>
      </motion.g>
    </>
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
