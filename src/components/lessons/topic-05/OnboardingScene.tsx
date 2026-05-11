'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type View = 'access' | 'obstacles' | 'cover' | 'concealment';

type Step = {
  id: View;
  label: string;
  icon: IconName;
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'access',
    label: 'האם בכלל אפשר לעבור?',
    icon: 'truck',
    popupTitle: 'עבירות — שאלת הבסיס של כל תמרון',
    popupBody:
      'לפני שמתכננים מסלול, מפקד שואל שאלה אחת פשוטה: האם הכלים שלי יכולים פיזית לעבור כאן? התשובה תלויה בשני דברים — שיפוע הקרקע (כמה תלול?) וטיב המסלע והקרקע (סלע קשה? חול? בוץ?). כלי גלגלי ייעצר בשיפוע של 30%, כלי זחלילי יגיע עד 60%. חול רטוב יבלע משאית; טרשים יקרעו צמיגים. אם השטח לא עביר — אין משימה.',
  },
  {
    id: 'obstacles',
    label: 'מה חוסם אותי בדרך?',
    icon: 'shield',
    popupTitle: 'מכשולים — טבעיים והנדסיים',
    popupBody:
      'גם בשטח עביר, האויב מציב מכשולים מלאכותיים על מכשולים טבעיים: שדה מוקשים על גדת נחל, גשר מפוצץ, תעלת נ"ט בקצה ואדי. השילוב הסינרגטי הזה הופך את השטח מ"רגיל" ל"מבצר". המתמרן מפעיל פעולת קידום ניידות (Breaching) — פריצת דרך, השלכת גשר, פינוי מוקשים — כדי להגיע ליעד.',
  },
  {
    id: 'cover',
    label: 'איפה אני יכול לחיות?',
    icon: 'mountain',
    popupTitle: 'מחסה (Cover) — מה באמת עוצר אש',
    popupBody:
      'בקרב, חשיפה לאש = מוות. מפקד מתכנן מסלול שמדלג ממחסה למחסה: סלע ענק, קפל קרקע עמוק, קיר עבה. המחסה חייב להיות פיזית מספיק קשה כדי לעצור כדורים, רסיסים והדפים. שיח לא מספיק. גזע עץ דק לא מספיק. רק חומר קשיח שנפח לו די מסת חומר.',
  },
  {
    id: 'concealment',
    label: 'מה מסתיר אותי מהעין?',
    icon: 'eye',
    popupTitle: 'הסתרה (Concealment) — מה מטעה את החוש',
    popupBody:
      'הסתרה מונעת *גילוי* — לא פגיעה. שיח עבות, חורש סגור, ערפל, צללי עננים, מבנים נטושים — כולם יכולים להסתיר אותך מעין האויב ומסנסור התרמי שלו, אבל אף אחד מהם לא יעצור כדור. שילוב חכם של הסתרה + מחסה הוא הכלי החזק ביותר: לא רואים אותך, ואם רואים — לא יכולים לפגוע בך.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'הצבא חצה תעלה ענקית בלילה אחד',
    place: 'תעלת סואץ · יום הכיפורים 1973',
    lesson: 'חיל ההנדסה של צה"ל בנה גשרים צפים על תעלת סואץ בלילה — מכשול הנדסי בשילוב מכשול טבעי (תעלת מים רחבה ועמוקה). המעבר הזה הפך את עומק הקרקע המצרי מסגור לפתוח, וזיכה את צה"ל ביוזמה האסטרטגית.',
    icon: 'wave',
    accent: 'text-accent-cool',
  },
  {
    headline: 'גדרות שדה הפכו טנקים לבלתי שמישים',
    place: 'נורמנדי · קיץ 1944',
    lesson: 'בבוקאז\' הצרפתי, גדרות שדה בנויות מאדמה ושיחים עבים (Bocage) חצו את הנוף. הטנקים האמריקאים לא יכלו לפרוץ אותן — לחלקם הותקנו "מזלגות" מאולתרים. כל חלקה חקלאית הפכה למבצר. הסתרה? כן. מחסה? כן. גם וגם.',
    icon: 'mountain',
    accent: 'text-terrain-ridge',
  },
  {
    headline: 'הג\'ונגל הסתיר — אבל לא הגן',
    place: 'וייטנאם · 1965–1973',
    lesson: 'חיילים אמריקאים השתמשו בצמחיית הג\'ונגל הסבוכה בתור הסתרה. אבל בקליבר נמוך, ענפים ועלים לא עצרו כלום. הוייטקונג ירה דרך הצמחייה ופגע — כי הסתרה אינה מחסה. הלקח הקטלני: לסמוך רק על מה שעוצר כדור.',
    icon: 'eye',
    accent: 'text-status-warn',
  },
  {
    headline: 'בונקרי חזבאללה: מחסה + הסתרה',
    place: 'דרום לבנון · 2006',
    lesson: 'חזבאללה בנו בונקרי בטון עמוקים בתוך חורש ים-תיכוני סבוך. הצמחייה הסתירה את הפתחים מצילום אווירי; הבטון מתחת ספג פצצות. שילוב מושלם של תכסית טבעית + מחסה מלאכותי. צה"ל גילה בונקרים רק כשנכנס פיזית.',
    icon: 'shield',
    accent: 'text-status-danger',
  },
];

export function OnboardingScene() {
  const [view, setView] = useState<View>('access');
  const [expandedStep, setExpandedStep] = useState<View | null>('access');

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
        step="05.0"
        eyebrow="לפני שמתחילים"
        title={
          <>
            <span className="gradient-text">איך מפקד "חושב" תנועה דרך השטח?</span>
          </>
        }
        intro="לא כל שטח נראה אותו דבר למפקד. הוא לא רואה רק נוף — הוא רואה שאלות. בוא נראה איך מפקד מנתח שטח לתנועה ב-4 שכבות שאלה — מהבסיסית ביותר ועד הקטלנית ביותר."
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
                  aria-controls={`t5-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t5-onb-bar"
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
                      key={`t5-onb-panel-${s.id}`}
                      id={`t5-onb-panel-${s.id}`}
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
                        <p className="text-sm leading-relaxed text-fg-muted text-pretty">
                          {s.popupBody}
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
          <ManeuverStage view={view} />
        </div>
      </div>

      <SoftDivider text="כל סיפור גדול בלחימה — הוא סיפור של תמרון" />

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
            הבנת ש"תמרון" זה לא רק "ללכת" — זה רצף של החלטות. בארבע הסצנות הבאות נצלול לעומק:
            <strong className="text-fg"> מה הופך שטח לעביר, איך פורצים מכשולים, איך שורדים בשטח חשוף, ואיך הצמחייה משנה הכל</strong>.
          </p>
        </div>
      </motion.div>
    </section>
  );
}

function ManeuverStage({ view }: { view: View }) {
  const showObstacles = view === 'obstacles' || view === 'cover' || view === 'concealment';
  const showCover = view === 'cover' || view === 'concealment';
  const showConcealment = view === 'concealment';

  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          <linearGradient id="ground-5" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f5f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" fill="url(#ground-5)" />

        {/* Background ridges (slopes) */}
        <path
          d="M0 55 L20 40 L35 50 L55 30 L75 45 L100 35 L100 75 L0 75 Z"
          className="fill-terrain-ridge/15 stroke-terrain-ridge/40"
          strokeWidth="0.3"
        />
        <path
          d="M0 65 L25 55 L50 65 L75 55 L100 60 L100 75 L0 75 Z"
          className="fill-terrain-sand/15"
        />

        {/* Start (A) and End (B) markers — always visible */}
        <g>
          <circle cx="10" cy="65" r="2.6" className="fill-accent-cool" />
          <text
            x="10"
            y="60"
            textAnchor="middle"
            className="fill-accent-cool font-display font-bold"
            fontSize="4.2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1.3"
            strokeLinejoin="round"
          >
            A
          </text>
        </g>
        <g>
          <circle cx="90" cy="25" r="2.6" className="fill-accent-hot" />
          <text
            x="90"
            y="21"
            textAnchor="middle"
            className="fill-accent-hot font-display font-bold"
            fontSize="4.2"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1.3"
            strokeLinejoin="round"
          >
            B
          </text>
        </g>

        {/* Layer 1: Access — direct path with slope warnings */}
        <motion.g initial={false} animate={{ opacity: view === 'access' ? 1 : 0.35 }} transition={{ duration: 0.4 }}>
          <line
            x1="10"
            y1="65"
            x2="90"
            y2="25"
            className="stroke-accent"
            strokeWidth="0.5"
            strokeDasharray="1.5 1"
          />
          <text
            x="50"
            y="42"
            textAnchor="middle"
            className="fill-accent font-display font-bold"
            fontSize="3.6"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeLinejoin="round"
          >
            מסלול ישיר
          </text>
        </motion.g>

        {/* Layer 2: Obstacles */}
        <motion.g initial={false} animate={{ opacity: showObstacles ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          {/* River */}
          <path
            d="M0 50 Q 30 48 50 52 T 100 50"
            fill="none"
            className="stroke-terrain-sky"
            strokeWidth="2"
            opacity="0.7"
          />
          <text
            x="22"
            y="46"
            textAnchor="middle"
            className="fill-terrain-sky font-display font-bold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeLinejoin="round"
          >
            נחל
          </text>

          {/* Minefield */}
          <rect
            x="55"
            y="30"
            width="14"
            height="8"
            rx="1"
            className="fill-status-danger/25 stroke-status-danger"
            strokeWidth="0.4"
            strokeDasharray="1 0.5"
          />
          <text
            x="62"
            y="35.5"
            textAnchor="middle"
            className="fill-status-danger font-display font-bold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeLinejoin="round"
          >
            שדה מוקשים
          </text>
        </motion.g>

        {/* Layer 3: Cover spots (physical protection) */}
        <motion.g initial={false} animate={{ opacity: showCover ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          {[
            { x: 25, y: 58 },
            { x: 42, y: 45 },
            { x: 78, y: 32 },
          ].map((c, i) => (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r="2.2" className="fill-terrain-ridge stroke-fg" strokeWidth="0.3" />
              <text
                x={c.x}
                y={c.y - 3.5}
                textAnchor="middle"
                className="fill-terrain-ridge font-display font-bold"
                fontSize="2.6"
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth="0.8"
                strokeLinejoin="round"
              >
                סלע
              </text>
            </g>
          ))}
          {/* Cover-hopping path */}
          <path
            d="M10 65 L25 58 L42 45 L78 32 L90 25"
            fill="none"
            className="stroke-status-ok"
            strokeWidth="0.7"
            strokeDasharray="2 1"
          />
        </motion.g>

        {/* Layer 4: Concealment (vegetation patches) */}
        <motion.g initial={false} animate={{ opacity: showConcealment ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          {[
            { x: 18, y: 60, r: 5 },
            { x: 35, y: 50, r: 4 },
            { x: 65, y: 55, r: 6 },
            { x: 82, y: 38, r: 4.5 },
          ].map((v, i) => (
            <ellipse
              key={i}
              cx={v.x}
              cy={v.y}
              rx={v.r}
              ry={v.r * 0.7}
              className="fill-terrain-olive/45 stroke-terrain-olive/70"
              strokeWidth="0.3"
            />
          ))}
          <text
            x="35"
            y="69"
            textAnchor="middle"
            className="fill-terrain-olive font-display font-bold"
            fontSize="3"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          >
            חורש סגור · הסתרה
          </text>
        </motion.g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        4 שכבות לקראת תמרון מוצלח
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
