'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Feature = 'flat' | 'mountain' | 'river' | 'narrow';

type Step = {
  id: Feature;
  label: string;
  buttonIcon: IconName;
  caption: string;
  insight: string;
  popupTitle: string;
  popupBody: string;
};

const STEPS: Step[] = [
  {
    id: 'flat',
    label: 'שטח פתוח (בלי מכשולים)',
    buttonIcon: 'globe',
    caption: 'אין הרים, אין נהרות. שני הצבאות יכולים פשוט ללכת ישר זה לעבר זה. שום דבר בשטח לא עוזר ולא מפריע לאף אחד.',
    insight: 'בלי השפעה של השטח, מי שיגבר הוא מי שיש לו יותר חיילים, נשק טוב יותר או אימון טוב יותר. כלומר: כוח מול כוח, ניקוד טהור.',
    popupTitle: 'שטח פתוח: כוח מול כוח',
    popupBody:
      'בשטח פתוח וחלק, בלי הרים או נהרות שיפריעו, שני הצבאות פשוט צועדים ישירות אחד מול השני. כשאין לטופוגרפיה שום השפעה, הקרב הופך למתמטיקה פשוטה של כוח מול כוח: מי שיש לו יותר חיילים, נשק מתקדם יותר או אימון טוב יותר – הוא זה שינצח.',
  },
  {
    id: 'mountain',
    label: 'מוסיפים הר באמצע',
    buttonIcon: 'mountain',
    caption: 'פתאום יש מכשול. אי אפשר ללכת ישר יותר — חייבים לעקוף מימין או משמאל. מי שמטפס לראש ההר ראשון רואה את כל מי שזז למטה.',
    insight: 'מי שמחזיק את הנקודה הגבוהה ביותר רואה את האויב ראשון, יורה אליו ראשון, וקשה מאוד לתקוף אותו מלמטה. זאת הסיבה שצבאות תמיד נלחמים על פסגות.',
    popupTitle: 'הר באמצע: מי שלמעלה — מנצח',
    popupBody:
      'ברגע שיש הר במרכז המפה, חוקי המשחק משתנים. הצבא שיגיע ראשון לפסגה מרוויח יתרון עצום: הוא רואה את כל השטח, קל לו יותר לירות כלפי מטה, ויש לו מחסה טבעי. פתאום, מספיק כוח קטן שתפס את הגובה כדי לבלום צבא גדול שמתעייף וחשוף לגמרי בזמן שהוא מנסה לטפס אליו.',
  },
  {
    id: 'river',
    label: 'מוסיפים נהר חוצה',
    buttonIcon: 'wave',
    caption: 'טנקים, משאיות ותותחים לא יכולים פשוט לחצות נהר בשחייה. הם חייבים גשר. ואם יש רק גשר אחד — כל הצבא חייב להצטופף ולעבור דרכו.',
    insight: 'מי ששולט בגשר היחיד — שולט בכל הקרב. אפילו קבוצה קטנה של 50 חיילים, אם היא חוסמת או מפוצצת את הגשר, יכולה לעצור צבא של עשרות אלפים.',
    popupTitle: 'נהר חוצה: חומת מים',
    popupBody:
      "נהר מתפקד כמו חומת מים שמחסלת את מהירות ההתקפה. אי אפשר פשוט להסתער – הצבא התוקף חייב לעצור, לחפש גשר או לחצות את המים באטיות. בזמן החצייה החיילים תקועים, צפופים ופגיעים לחלוטין. זה נותן לצד השני הזדמנות פז לחכות מוגן בגדה ממול, ולתקוף בדיוק כשהאויב חסר אונים.",
  },
  {
    id: 'narrow',
    label: 'מצמצמים את המעבר',
    buttonIcon: 'crosshair',
    caption: 'הוספנו שני רכסי הרים בצדדים. עכשיו המעבר באמצע הצטמצם לסדק. צבא של 10,000 חיילים נאלץ לעבור אחד מאחורי השני — לא 1,000 בשורה אלא 50, חשופים מכל צד.',
    insight: 'כשהמרחב הצר מאלץ אותך להצטופף בטור — היתרון המספרי שלך נעלם. כוח קטן עם נשק טוב יכול לעצור צבא ענק. זאת הסיבה שכל מפקד מחפש את "נקודות החנק" של האויב.',
    popupTitle: "צוואר בקבוק: היתרון המספרי נמחק",
    popupBody:
      "כשהשטח נסגר למעבר צר ויוצר 'צוואר בקבוק', היתרון של צבא גדול פשוט נמחק. אי אפשר לדחוף מאות טנקים או חיילים בבת אחת למעבר, והם נאלצים להידחס בטור ארוך ואיטי. ככה בדיוק כוח קטן שמחכה ביציאה יכול לעצור אימפריה שלמה, פשוט כי הוא מכריח אותה להילחם מולו 'בתורות'.",
  },
];

const HISTORICAL: { headline: string; place: string; lesson: string; icon: IconName; accent: string }[] = [
  {
    headline: 'הצבא הגדול בעולם נחרב — בלי קרב גדול',
    place: 'נפוליאון פולש לרוסיה · 1812',
    lesson: 'נפוליאון, השליט החזק באירופה, פלש לרוסיה עם 600,000 חיילים. הוא לא הפסיד בקרב — אבל המרחק העצום והחורף הקטלני הרגו 90% מהצבא לפני שהגיעו בכלל למוסקבה. המרחק והקור היו האויב האמיתי.',
    icon: 'fuel',
    accent: 'text-accent-cool',
  },
  {
    headline: '32 ק"מ של מים שמרו על אימפריה',
    place: 'בריטניה · 200 שנה',
    lesson: 'תעלת למאנש היא רצועת הים בין אנגליה לצרפת — רק 32 ק"מ ברוחב הצר ביותר. אבל זה הספיק כדי למנוע פלישה צרפתית, גרמנית ונאצית במשך מאות שנים. רצועת המים הזו הייתה החייל הטוב ביותר של בריטניה.',
    icon: 'wave',
    accent: 'text-terrain-sky',
  },
  {
    headline: 'ישראל ברוחבה הצר ביותר: 14 ק"מ בלבד',
    place: 'אזור השרון · ישראל',
    lesson: 'במרכז ישראל — מנתניה ועד הגבול הירדני — יש רק 14 ק"מ ברוחב. כלומר, צבא אויב יכול לכאורה לחצות את המדינה לשניים בכמה שעות נסיעה. זה מחייב תפיסה צבאית שונה לחלוטין מאשר במדינות גדולות כמו רוסיה או ארה"ב.',
    icon: 'flag',
    accent: 'text-accent-hot',
  },
  {
    headline: 'מדינה קטנה ששרדה שתי מלחמות עולם',
    place: 'שוויץ · 1914 ו-1939',
    lesson: 'שוויץ — מדינה זעירה במרכז אירופה — לא נכבשה בשום מלחמה גדולה. ההרים הגבוהים שמקיפים אותה הופכים פלישה ליקרה ולמסוכנת מדי, גם בעיני צבא ענק כמו זה הנאצי. ההרים שווים יותר מצבא חזק.',
    icon: 'mountain',
    accent: 'text-terrain-ridge',
  },
];

export function OnboardingScene() {
  const [step, setStep] = useState<Feature>('flat');

  const handleStepClick = (id: Feature) => {
    setStep((prev) => (prev === id ? prev : id));
  };

  return (
    <section id="scene-onboarding" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="01.0"
        eyebrow="לפני שמתחילים"
        title={
          <>
          <span className="gradient-text">איך גבעה קטנה, נהר או שביל צר יכולים להכריע מלחמה?</span>
          </>
        }
        intro="תארו לכם שני צבאות שעומדים להילחם. עכשיו, בואו נשחק עם השטח: תוסיפו הר, תזרימו נהר, ותראו איך כל שינוי טופוגרפי קטן משנה לגמרי את חוקי המשחק. לא צריך שום ידע צבאי – רק היגיון בריא"
      />

      <div className="grid lg:grid-cols-[3fr_2fr] gap-6 items-stretch">
        <div className="surface-elevated relative overflow-hidden">
          <TerrainStage feature={step} />
        </div>

        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const passed = STEPS.findIndex((x) => x.id === step) > i;
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
                  aria-expanded={active}
                  aria-controls={`accordion-panel-${s.id}`}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  {active && (
                    <motion.span
                      layoutId="active-step-bar"
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
                    name={s.buttonIcon}
                    size={20}
                    className={cn('transition-colors shrink-0', active ? 'text-accent' : 'text-fg-dim')}
                  />
                  <motion.span
                    animate={{ rotate: active ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', active ? 'text-accent' : 'text-fg-dim')}
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
                  {active && (
                    <motion.div
                      key={`panel-${s.id}`}
                      id={`accordion-panel-${s.id}`}
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
      </div>

      <SoftDivider text="ועכשיו 4 סיפורים אמיתיים מההיסטוריה" />

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
                <div className="text-xs font-mono text-fg-dim mb-1.5 tracking-widest uppercase flex items-center gap-2">
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
          <div className="text-xs font-mono text-accent mb-1.5 tracking-widest uppercase">
            עכשיו אתה מוכן
          </div>
          <p className="text-fg leading-relaxed text-pretty text-sm sm:text-base">
           הבנתם את ההיגיון? מעולה. כל מה שראיתם עכשיו מבוסס על אינסטינקט בריא. בצבא, לאינסטינקטים האלה יש שמות, חוקים והגדרות. עכשיו ניקח את ההיגיון שלכם ונתרגם אותו לשפה שבה גנרלים מתכננים מלחמות. נתחיל מהבסיס: שלוש הרמות של המלחמה
            <strong className="text-fg"> שלוש הרמות שבהן צבא חושב על מלחמה</strong>.
          </p>
        </div>
      </motion.div>

    </section>
  );
}

function TerrainStage({ feature }: { feature: Feature }) {
  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f5f9" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        {/* Base ground */}
        <rect x="0" y="0" width="100" height="75" fill="url(#ground)" />

        {/* Grid */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={'gx' + i}
            x1={i * 10}
            y1="0"
            x2={i * 10}
            y2="75"
            className="stroke-border-subtle"
            strokeWidth="0.1"
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={'gy' + i}
            x1="0"
            y1={i * 10}
            x2="100"
            y2={i * 10}
            className="stroke-border-subtle"
            strokeWidth="0.1"
          />
        ))}

        {/* Mountain */}
        <AnimatedShape show={['mountain', 'river', 'narrow'].includes(feature)}>
          <path
            d="M30 50 L42 25 L54 50 Z"
            className="fill-terrain-ridge/40 stroke-terrain-ridge"
            strokeWidth="0.4"
          />
          <path
            d="M50 50 L62 30 L74 50 Z"
            className="fill-terrain-ridge/30 stroke-terrain-ridge/80"
            strokeWidth="0.4"
          />
        </AnimatedShape>

        {/* River */}
        <AnimatedShape show={['river', 'narrow'].includes(feature)}>
          <path
            d="M0 60 Q 25 56 50 62 T 100 60"
            fill="none"
            className="stroke-terrain-sky"
            strokeWidth="2.4"
            opacity="0.7"
          />
          {/* Bridge marker */}
          <rect x="48" y="59" width="4" height="2.6" className="fill-accent" rx="0.4" />
          <text x="50" y="68" textAnchor="middle" className="fill-accent text-[3px] font-mono">
            גשר
          </text>
        </AnimatedShape>

        {/* Narrow corridor — extra ridges that channel movement */}
        <AnimatedShape show={feature === 'narrow'}>
          <path d="M0 12 L20 12 L26 18 L20 24 L0 24 Z" className="fill-terrain-ridge/40" />
          <path d="M100 12 L80 12 L74 18 L80 24 L100 24 Z" className="fill-terrain-ridge/40" />
          <text x="50" y="20" textAnchor="middle" className="fill-fg-muted text-[3px] font-mono">
            ↕ נקודת חנק
          </text>
        </AnimatedShape>

        {/* Movement arrows from blue to red */}
        <ArrowsByFeature feature={feature} />

        {/* Forces */}
        <UnitMarker x={6} y={66} color="cool" label="צבא כחול" />
        <UnitMarker x={94} y={10} color="hot" label="צבא אדום" />
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-xs text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        לחץ על שלב מימין — נבנה את השטח יחד, צעד אחר צעד
      </div>
    </div>
  );
}

function AnimatedShape({ show, children }: { show: boolean; children: React.ReactNode }) {
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

function UnitMarker({ x, y, color, label }: { x: number; y: number; color: 'cool' | 'hot'; label: string }) {
  const fill = color === 'cool' ? 'fill-accent-cool' : 'fill-accent-hot';
  const text = color === 'cool' ? 'fill-accent-cool' : 'fill-accent-hot';
  return (
    <g>
      <circle cx={x} cy={y} r="2.5" className={cn(fill, 'opacity-30')}>
        <animate attributeName="r" values="2.5;4;2.5" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx={x} cy={y} r="1.6" className={fill} />
      <text x={x} y={y + 6} textAnchor="middle" className={cn(text, 'text-[2.5px] font-mono opacity-80')}>
        {label}
      </text>
    </g>
  );
}

function ArrowsByFeature({ feature }: { feature: Feature }) {
  // Two arrows showing typical movement paths per feature
  const paths = (() => {
    switch (feature) {
      case 'flat':
        return [{ d: 'M10 64 Q 50 38 90 12', label: 'ישיר' }];
      case 'mountain':
        return [
          { d: 'M10 64 Q 30 64 30 50 Q 30 38 90 12', label: 'איגוף שמאל' },
          { d: 'M10 64 Q 70 64 78 50 Q 84 38 90 12', label: 'איגוף ימין' },
        ];
      case 'river':
        return [{ d: 'M10 64 Q 30 64 50 60 Q 70 56 90 12', label: 'דרך הגשר' }];
      case 'narrow':
        return [{ d: 'M10 64 Q 30 64 50 60 Q 50 30 50 18 Q 70 18 90 12', label: 'נקודת חנק' }];
      default:
        return [];
    }
  })();

  return (
    <>
      <defs>
        <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
          <polygon points="0,0 4,2 0,4" className="fill-accent" />
        </marker>
      </defs>
      {paths.map((p, i) => (
        <g key={i}>
          <motion.path
            d={p.d}
            fill="none"
            className="stroke-accent/60"
            strokeWidth="0.5"
            strokeDasharray="1.2 1"
            markerEnd="url(#arrowhead)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.9 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          />
        </g>
      ))}
    </>
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
