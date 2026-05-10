'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type View = 'flat' | 'mountain' | 'valley' | 'analyzed';

const STEPS: { id: View; label: string; icon: IconName; caption: string; insight: string }[] = [
  {
    id: 'flat',
    label: 'מתחילים מהמראה התמים',
    icon: 'eye',
    caption: 'אתה רואה אדמה. אולי כמה גבעות. אבל זאת רק תמונה — אין שום סיפור. הצבא לא יכול להחליט שום דבר על סמך זה.',
    insight: 'בלי לדעת לקרוא את השטח, אתה רואה רק "נוף יפה". מפקד שיוצא להילחם עם המבט הזה — מפסיד.',
  },
  {
    id: 'mountain',
    label: 'מסמנים את הגובה',
    icon: 'mountain',
    caption: 'עכשיו אתה רואה: הגבעה הזו גבוהה יותר. הגיא הזה עמוק יותר. צורת השטח מתחילה לדבר — איפה אפשר לראות מה, ומה מסתתר.',
    insight: 'גובה זה כוח. הצד הגבוה רואה ראשון, יורה ראשון, ושולט במגרש.',
  },
  {
    id: 'valley',
    label: 'מסמנים מה מסתתר',
    icon: 'shield',
    caption: 'עכשיו אתה רואה גם את החלקים הסמויים: בין שתי גבעות יש "אזור מת" — מקום שאי אפשר לראות אותו מהפסגות. שם אפשר להחביא תותחים, מפקדה, או שיירת אספקה.',
    insight: 'מה שלא רואים — חי. המקומות הסמויים הם נקודות הסתתרות חיוניות.',
  },
  {
    id: 'analyzed',
    label: 'התמונה הצבאית המלאה',
    icon: 'crosshair',
    caption: 'הכל ביחד: שטח שולט (פסגות), שטח חיוני (דרך מעבר), ושטח מת (אזורים סמויים). עכשיו אתה רואה את אותו הר — אבל בעיניים של מפקד.',
    insight: 'זה ההבדל בין תייר לבין מפקד. אותו נוף, אותם הרים — אבל סיפור אחר לגמרי.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'הגרמנים תפסו את כל הגבעות תוך שעה',
    place: 'מבצע סדן · הרי הגולן',
    lesson: 'במלחמת יום הכיפורים, הסורים שלחו טנקים דרך עמקים בלי לאבטח את הגבעות מסביב. צה"ל ירה עליהם מלמעלה ועצר אותם תוך שעות — למרות שהיו פי 5 בכמות.',
    icon: 'mountain',
    accent: 'text-accent',
  },
  {
    headline: 'מארב טאליבן בעמק עמוק',
    place: 'אפגניסטן · 2008',
    lesson: 'יחידה אמריקאית התקדמה דרך עמק צר. הטאליבן ירה עליה ממעל מ-3 כיוונים. היחידה איבדה 9 חיילים. הסיבה: התעלמו מהשליטה של הגבעות מסביב.',
    icon: 'crosshair',
    accent: 'text-status-danger',
  },
  {
    headline: 'הקוסמים שמצאו אוכף נסתר',
    place: 'אנטיבוס · נורמנדי 1944',
    lesson: 'יחידה בריטית מצאה מעבר אוכף סמוי בין שתי גבעות מבוצרות. במקום לתקוף ראש בראש, הם עברו ליד וגרמו לכל מערך הגנה גרמני להתמוטט.',
    icon: 'check',
    accent: 'text-status-ok',
  },
  {
    headline: 'אסון השלוחה הצרפתית',
    place: 'דיאן ביאן פו · 1954',
    lesson: 'הצרפתים בנו בסיס בעמק עמוק והותירו את הגבעות סביבם לוייטנמים. תוצאה: הצרפתים הופצצו 56 ימים, איבדו 7,000 חיילים, והפסידו את המלחמה.',
    icon: 'shield',
    accent: 'text-status-warn',
  },
];

export function OnboardingScene() {
  const [view, setView] = useState<View>('flat');
  const current = STEPS.find((s) => s.id === view)!;

  return (
    <section id="scene-onboarding" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="04.0"
        eyebrow="לפני שמתחילים"
        title={
          <>
            איך מפקד <span className="gradient-text">קורא הר</span> אחרת מתייר?
          </>
        }
        intro="תייר רואה נוף. מפקד רואה כלים. בוא נראה איך אותו הר נראה ב-4 שכבות הסתכלות שונות — ולמה השכבה האחרונה היא ההבדל בין ניצחון להפסד."
      />

      <div className="grid lg:grid-cols-[3fr_2fr] gap-6 items-stretch">
        <div className="surface-elevated relative overflow-hidden">
          <TerrainStage view={view} />
        </div>

        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const active = view === s.id;
            const passed = STEPS.findIndex((x) => x.id === view) > i;
            return (
              <motion.button
                key={s.id}
                onClick={() => setView(s.id)}
                whileHover={{ x: -3 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full surface p-4 text-right transition-all flex items-center gap-3 relative overflow-hidden',
                  active ? 'border-accent shadow-glow bg-accent/5' : 'hover:border-border-strong hover:bg-bg-accent/30',
                  passed && !active && 'opacity-80'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="t4-onb-bar"
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
                <Icon name={s.icon} size={20} className={cn('transition-colors', active ? 'text-accent' : 'text-fg-dim')} />
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
              <div className="text-[10px] font-mono text-accent-cool mb-1.5 tracking-widest uppercase">מה רואים</div>
              <p className="text-sm leading-relaxed text-fg">{current.caption}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <Icon name="spark" size={22} className="text-accent shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-mono text-accent mb-1.5 tracking-widest uppercase">ולמה זה משנה</div>
              <p className="text-sm leading-relaxed text-fg">{current.insight}</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <SoftDivider text="כשלא קוראים נכון את ההר — המחיר עצום" />

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
            <div aria-hidden className="absolute inset-0 bg-gradient-to-bl from-bg-elevated via-bg-card to-bg-card opacity-50 group-hover:opacity-100 transition-opacity" />
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
          <div className="text-[10px] font-mono text-accent mb-1.5 tracking-widest uppercase">עכשיו אתה מוכן</div>
          <p className="text-fg leading-relaxed text-pretty text-sm sm:text-base">
            הבנת ש"קריאת שטח" זה משהו שלם — לא ריגוש מהנוף. בשלוש הסצנות הבאות נצלול לעומק:
            <strong className="text-fg"> מאיזה סלע ההר עשוי, איך לזהות 5 צורות נוף קלאסיות, ואיך מסווגים שטח לפי הערך הצבאי שלו</strong>.
          </p>
        </div>
      </motion.div>
    </section>
  );
}

function TerrainStage({ view }: { view: View }) {
  const showHeights = view !== 'flat';
  const showHidden = view === 'valley' || view === 'analyzed';
  const showTactical = view === 'analyzed';

  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ground-4" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f5f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" fill="url(#ground-4)" />

        {/* Mountain silhouettes */}
        <path d="M0 65 L18 38 L34 55 L50 30 L66 48 L82 35 L100 60 L100 75 L0 75 Z" className="fill-terrain-ridge/30 stroke-terrain-ridge/50" strokeWidth="0.3" />
        <path d="M0 70 L25 50 L45 60 L65 45 L85 58 L100 65 L100 75 L0 75 Z" className="fill-terrain-sand/15" />

        {/* Peak markers shown when "heights" view onwards */}
        <motion.g initial={false} animate={{ opacity: showHeights ? 1 : 0 }} transition={{ duration: 0.4 }}>
          {[
            { x: 18, y: 38, h: '420 מ׳' },
            { x: 50, y: 30, h: '540 מ׳' },
            { x: 82, y: 35, h: '480 מ׳' },
          ].map((p, i) => (
            <g key={i}>
              <polygon points={`${p.x},${p.y - 2} ${p.x - 2},${p.y + 2} ${p.x + 2},${p.y + 2}`} className="fill-accent" />
              <text x={p.x} y={p.y - 4} textAnchor="middle" className="fill-accent text-[2.3px] font-mono font-bold">{p.h}</text>
            </g>
          ))}
        </motion.g>

        {/* Hidden valley overlay */}
        <motion.g initial={false} animate={{ opacity: showHidden ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <rect x="34" y="50" width="16" height="13" rx="1" className="fill-status-ok/20 stroke-status-ok/60" strokeWidth="0.4" strokeDasharray="1 0.8" />
          <text x="42" y="59" textAnchor="middle" className="fill-status-ok text-[2.5px] font-mono font-bold">שטח מת</text>
          <text x="42" y="62" textAnchor="middle" className="fill-status-ok text-[1.8px] font-mono">סמוי לאויב</text>
        </motion.g>

        {/* Tactical overlay (commanding terrain + key terrain) */}
        <motion.g initial={false} animate={{ opacity: showTactical ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          {/* Commanding terrain — circle around the highest peak */}
          <circle cx="50" cy="30" r="8" fill="none" className="stroke-accent" strokeWidth="0.5" strokeDasharray="1.2 0.8" />
          <text x="50" y="22" textAnchor="middle" className="fill-accent text-[2.5px] font-mono font-bold">שטח שולט</text>

          {/* Key terrain — a junction in valley */}
          <circle cx="65" cy="58" r="2" className="fill-accent-hot" />
          <text x="65" y="68" textAnchor="middle" className="fill-accent-hot text-[2.3px] font-mono font-bold">שטח חיוני</text>
          <text x="65" y="71" textAnchor="middle" className="fill-accent-hot text-[1.8px] font-mono">צומת אספקה</text>
        </motion.g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        אותו הר · 4 שכבות הסתכלות
      </div>
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
