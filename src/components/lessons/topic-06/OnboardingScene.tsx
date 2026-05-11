'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
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
    label: 'איפה אני יושב ומאיפה אני רואה',
    icon: 'eye',
    popupTitle: 'נקודת התצפית — נקודת המוצא של כל ניתוח',
    popupBody:
      'קו ראייה (Line of Sight) מתחיל תמיד מ<strong>נקודה</strong>: עין של תצפיתן, עדשת מצלמה, חיישן רדאר או רחפן. גובה הנקודה הוא קריטי — מטר אחד גובה נוסף יכול לחשוף שטחים שלמים. לכן ב-1973 הסורים והישראלים נלחמו בעיקר על פסגות, ולא בעמקים: מי שיש לו את הגובה — יש לו את העיניים.',
  },
  {
    id: 'visible',
    label: 'מה מואר לי',
    icon: 'crosshair',
    popupTitle: 'שטחים חשופים — היכן האויב חשוף לאש',
    popupBody:
      'מכל נקודת תצפית, כל קו ראייה הוא קו ישר. השטחים שמהם <strong>כל קו ישר עד הנקודה לא נחתך</strong> על ידי תכסית או תבליט — אלו השטחים החשופים. הם הקלאסיים לטיפול: אם רואים אותך, יורים בך. כל שטח חשוף בעמדה שלך הוא "ירוק" במפת הViewshed.',
  },
  {
    id: 'dead',
    label: 'מה חבוי ממני',
    icon: 'shield',
    popupTitle: 'שטחים מתים — איפה האויב מסתתר ממני',
    popupBody:
      'שטחים שמוסתרים מהעין שלך בגלל רכס, בניין, יער או צילו של הר נקראים <strong>"שטחים מתים"</strong> (Dead Space). זה גם המקום שבו האויב יבחר להתחפר, להחביא תותחים ולהקים מפקדה. ניתוח טוב של שטחים מתים = ניתוח טוב של מקומות שצריך לרגל בהם פיזית, כי הסנסור לא יראה.',
  },
  {
    id: 'intervisibility',
    label: 'הקו שבו אני מואר פתאום',
    icon: 'bolt',
    popupTitle: 'קו הנראות ההדדית — רגע החשיפה',
    popupBody:
      'בכל רכס יש <strong>קו דק</strong> שבו אתה עובר ממצב של "אני בצל הרכס" למצב של "האויב משני הצד רואה אותי לחלוטין". זו לא הדרגתיות — זה מתג. במלחמת יום הכיפורים, טנקים סורים שעלו מעבר לרכס הסיני בגולן חצו את הקו הזה — ובדיוק שם, באותה שנייה, ה-105 מ"מ של המגנים פגעו בהם. תכנון נכון של חציית הקו = תכנון של רגע החשיפה.',
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'תצפית אחת ששלטה על מדינה שלמה',
    place: 'הר חרמון · "השוסי" 1967–היום',
    lesson: 'תצפית "השוסי" על פסגת החרמון רואה את דמשק, את לבנון ואת כל הצפון. לכן ב-1973 חזית הקרבות הראשונה הייתה עליה. מי שמחזיק את הגובה — מחזיק את העיניים של המלחמה. כל פעולת אויב באזור עוברת תחת עינו.',
    icon: 'mountain',
    accent: 'text-accent',
  },
  {
    headline: 'הטנק חצה את הרכס — ומיד פגע בו טיל',
    place: 'הגולן · יום הכיפורים 1973',
    lesson: 'מאות טנקים סורים נמחקו ברגע שעלו מעבר לקו הנראות ההדדית של הרכסים. מעמדות הירי הישראליות, הם הופיעו "פתאום" וקטנים — אבל הם פשוט חצו את הקו. שנייה לפני: בלתי נראים. שנייה אחרי: ירוק מואר על המסך.',
    icon: 'bolt',
    accent: 'text-accent-hot',
  },
  {
    headline: 'הענן הגיע — והטיל נפל בשדה ריק',
    place: 'מבצעי מקוונים · שנות ה-2000',
    lesson: 'טילים מונחי לייזר ווידאו דורשים נעילה רציפה על המטרה. ב-2003 ב-Iraq, מספר תקיפות אבדו ברגע האחרון כי ענן או עשן שבר את ה-LOS בין הכטב"ם למטרה. החימוש עף לפי האחרון נתון שראה — ופספס. LOS = הצלחה.',
    icon: 'plane',
    accent: 'text-accent-cool',
  },
  {
    headline: 'שטחים מתים בעיר — צלפים בלתי נראים',
    place: 'סטלינגרד · 1942–43',
    lesson: 'בקרב סטלינגרד, צלפים סובייטים בנו עמדות בתוך חורבות בניינים — ניצול מושלם של "שטחים מתים" שנוצרו מקפלי הריסות. הגרמנים יצרו פטרולים יקרים כי הם לא יכלו לראות מאיפה האש. שטח מת בעיר = ארובה גרמנית.',
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
        title={
          <>
            <span className="gradient-text">לראות ולא להיראות</span> — בסיס שדה הקרב
          </>
        }
        intro="כל מה שקורה בקרב מתחיל מתשובה לשאלה אחת: אני רואה אותו או לא? בוא נראה איך אותה גבעה משתנה מ-4 פרספקטיבות — מה אני רואה, מה הוא רואה, ואיפה הקו שמשנה הכל."
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
                  aria-controls={`t6-onb-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="t6-onb-bar"
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
                      key={`t6-onb-panel-${s.id}`}
                      id={`t6-onb-panel-${s.id}`}
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
          <SightStage view={view} />
        </div>
      </div>

      <SoftDivider text="ראייה בקרב — ההבדל בין חיים למוות" />

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
            הבנת שראייה היא לא רק "מסתכלים" — היא ניתוח. בשלוש הסצנות הבאות נצלול:
            <strong className="text-fg"> איך מחשבים LOS ידני, איך אלגוריתם מחשב Viewshed שלם, ולמה כל זה קריטי ל-Kill Chain</strong>.
          </p>
        </div>
      </motion.div>
    </section>
  );
}

function SightStage({ view }: { view: View }) {
  const showVisible = view === 'visible' || view === 'dead' || view === 'intervisibility';
  const showDead = view === 'dead' || view === 'intervisibility';
  const showIntervisibility = view === 'intervisibility';

  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          <linearGradient id="ground-6" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f5f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="75" fill="url(#ground-6)" />

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
            שטחים מוארים
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
            כאן האויב מסתתר
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
      <span className="text-xs font-mono text-fg-dim tracking-widest uppercase">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
