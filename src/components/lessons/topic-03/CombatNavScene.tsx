'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Method = 'handrail' | 'dead' | 'pace';

type MethodData = {
  id: Method;
  label: string;
  english: string;
  icon: IconName;
  oneLiner: string;
  detail: string;
  whenToUse: string[];
  example: string;
};

const METHODS: MethodData[] = [
  {
    id: 'handrail',
    label: 'הליכה לאורך מעקה',
    english: 'Handrailing',
    icon: 'route' as never, // Not used
    oneLiner: 'הולכים במקביל למאפיין בולט בשטח, לא ישר ליעד',
    detail: 'במקום ללכת בקו ישר ליעד (שעלול להיות חשוף לאויב או ממולכד), בוחרים מאפיין בשטח שנמשך לאורך הדרך — נחל, ערוץ, רכס, כביש — והולכים במקביל אליו. ה"מעקה" הזה מנחה את הכוח גם בחושך מוחלט.',
    whenToUse: ['בלילה כשקשה לראות פרטים', 'בשטח לא מוכר', 'כשרוצים להימנע מאזורים חשופים או ממולכדים'],
    example: 'במקום לחצות שטח פתוח באזימוט ישר, הכוח נצמד לתחתית רכס שמוביל לכיוון היעד — חבוי, וגם קשה לאבד התמצאות.',
  },
  {
    id: 'dead',
    label: 'ניווט עיוור',
    english: 'Dead Reckoning',
    icon: 'compass',
    oneLiner: 'הולכים רק על אזימוט וספירת צעדים, בלי להסתכל סביב',
    detail: 'שיטה קשה — מסתמכים אך ורק על אזימוט מדויק וספירת צעדים, בלי לקרוא את השטח. דורש משמעת מוחלטת: לסמוך על המצפן והספירה גם כשנדמה לך שאתה הולך לכיוון "לא נכון".',
    whenToUse: ['סופת חול / ערפל כבד — אין מה לראות', 'דיונות חול ענקיות — אין סימני זיהוי', 'ימות מלח, מדבר פתוח חסר תכסית'],
    example: 'יחידה במדבר נגב נכנסת לסופת חול. הראות אפסית. הם ממשיכים לאזימוט קבוע (62°) וסופרים 800 זוגות צעדים — אחרי 1.2 ק"מ הם בדיוק במקום הנכון.',
  },
  {
    id: 'pace',
    label: 'שליטה בקצב',
    english: 'Pace & Path Control',
    icon: 'spark',
    oneLiner: 'מתאימים את מהירות ההליכה לשטח ולסכנה',
    detail: 'לא תמיד הולכים באותה מהירות. בשטח פתוח שבו האויב עלול לראות אותך — תנועה איטית, מאובטחת, עם דילוגים בין מחסה למחסה. בשטח סגור (יער, ערוץ עמוק) שבו אתה מוסתר — תנועה רצופה ומהירה.',
    whenToUse: ['שטח חשוף — איטי, מאובטח, דילוגים', 'שטח מוסתר — מהיר, רציף, בטור', 'מעבר בין סוגי שטח — מתאמים בזמן אמת'],
    example: 'כוח מתקדם דרך שדות פתוחים בלילה — קצב איטי, חוליה מקדימה מחפה. ברגע שנכנסים ליער עבות — עוברים לטור צבאי מהיר ורצוף.',
  },
];

export function CombatNavScene() {
  const [active, setActive] = useState<Method>('handrail');
  const meta = METHODS.find((m) => m.id === active)!;

  return (
    <section id="scene-combat" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="03.3"
        eyebrow="ניווט קרבי"
        title={
          <>
            כששטח אויב משנה את <span className="gradient-text">כל הכללים</span>
          </>
        }
        intro="ניווט בשטח אויב זה לא טיול. צריך להישאר חבוי, להימנע ממוקשים, ולשמור על קצב נכון לתנאי השטח. שלוש טכניקות שכל לוחם חייב להכיר."
      />

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-stretch">
        <div className="space-y-2">
          {METHODS.map((m, i) => {
            const isActive = active === m.id;
            return (
              <motion.button
                key={m.id}
                onClick={() => setActive(m.id)}
                whileHover={{ x: -3 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full surface p-4 text-right transition-all flex items-center gap-3 relative overflow-hidden',
                  isActive
                    ? 'border-accent shadow-glow bg-accent/5'
                    : 'hover:border-border-strong hover:bg-bg-accent/30'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="t3-combat-bar"
                    className="absolute inset-y-0 end-0 w-1 bg-accent rounded-l-full"
                  />
                )}
                <span
                  className={cn(
                    'size-9 rounded-xl flex items-center justify-center shrink-0 transition-all',
                    isActive ? 'bg-accent text-bg shadow-glow' : 'bg-bg-accent text-fg-muted'
                  )}
                >
                  <span className="font-mono text-sm font-bold">{i + 1}</span>
                </span>
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-[10px] font-mono text-fg-dim mb-0.5 tracking-widest uppercase">
                    טכניקה {i + 1}
                  </div>
                  <div className={cn('font-display font-bold leading-tight', isActive ? 'text-accent' : 'text-fg')}>
                    {m.label}
                  </div>
                  <div className="text-[10px] font-mono text-fg-dim mt-0.5">{m.english}</div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="surface-elevated relative overflow-hidden min-h-[320px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              {active === 'handrail' && <HandrailVisual />}
              {active === 'dead' && <DeadReckoningVisual />}
              {active === 'pace' && <PaceControlVisual />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mt-6 grid md:grid-cols-2 gap-4"
        >
          <div className="surface-elevated p-5 sm:p-6">
            <div className="text-[10px] font-mono text-accent mb-2 tracking-widest uppercase">
              מה זה ולמה זה עובד
            </div>
            <p className="text-sm text-fg leading-relaxed mb-4">{meta.detail}</p>
            <div className="pt-4 border-t border-border-subtle">
              <div className="text-[10px] font-mono text-fg-dim mb-2 tracking-widest uppercase">
                דוגמה
              </div>
              <p className="text-sm text-fg-muted leading-relaxed">{meta.example}</p>
            </div>
          </div>

          <div className="surface p-5 sm:p-6 border-r-4 border-r-accent-cool">
            <div className="text-[10px] font-mono text-accent-cool mb-3 tracking-widest uppercase">
              מתי משתמשים בזה
            </div>
            <ul className="space-y-2 text-sm">
              {meta.whenToUse.map((u) => (
                <li key={u} className="flex gap-2">
                  <Icon name="check" size={14} className="text-accent-cool mt-1 shrink-0" strokeWidth={2.5} />
                  <span className="text-fg leading-relaxed">{u}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </AnimatePresence>

      <ConclusionCard />
    </section>
  );
}

function HandrailVisual() {
  return (
    <div className="aspect-[4/3] sm:aspect-auto h-full relative">
      <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width="100" height="75" className="fill-bg-elevated" />

        {/* Open ground */}
        <rect x="0" y="35" width="100" height="40" className="fill-terrain-sand/10" />

        {/* The "handrail" — a long ridge along the path */}
        <path d="M5 50 Q 30 48 50 47 T 95 45" fill="none" className="stroke-terrain-ridge" strokeWidth="3" />
        <text x="50" y="58" textAnchor="middle" className="fill-terrain-ridge text-[3px] font-mono">תחתית רכס · המעקה</text>

        {/* Direct path (red — risky) */}
        <line x1="10" y1="62" x2="90" y2="20" className="stroke-status-danger/50" strokeWidth="0.5" strokeDasharray="1.5 1" />
        <text x="50" y="38" textAnchor="middle" className="fill-status-danger text-[2.5px] font-mono">קו ישר · חשוף לאויב</text>

        {/* Handrail path (green — safe) */}
        <path d="M10 62 Q 25 55 50 49 T 90 20" fill="none" className="stroke-accent" strokeWidth="0.7" />

        {/* Start */}
        <circle cx="10" cy="62" r="2" className="fill-accent-cool" />
        <text x="10" y="69" textAnchor="middle" className="fill-accent-cool text-[2.5px] font-mono">A</text>

        {/* End */}
        <circle cx="90" cy="20" r="2" className="fill-accent-hot" />
        <text x="90" y="16" textAnchor="middle" className="fill-accent-hot text-[2.5px] font-mono">B</text>

        {/* Threats along direct path */}
        {[[35, 50], [55, 38], [70, 30]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="1.5" className="fill-status-danger" />
            <text x={x} y={y - 2} textAnchor="middle" className="fill-status-danger text-[2px] font-mono">!</text>
          </g>
        ))}
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <Icon name="spark" size={11} className="text-accent" />
        איגוף לאורך מעקה
      </div>
    </div>
  );
}

function DeadReckoningVisual() {
  return (
    <div className="aspect-[4/3] sm:aspect-auto h-full relative">
      <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="storm" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#3a4452" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#11161f" stopOpacity="0.95" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="75" className="fill-bg-elevated" />

        {/* Featureless desert */}
        <rect x="0" y="55" width="100" height="20" className="fill-terrain-sand/10" />

        {/* Sandstorm overlay */}
        <rect x="0" y="0" width="100" height="75" fill="url(#storm)" />

        {/* "Dust particles" */}
        {Array.from({ length: 40 }).map((_, i) => {
          const x = (i * 37) % 100;
          const y = (i * 23) % 75;
          return <circle key={i} cx={x} cy={y} r="0.4" className="fill-fg/30" />;
        })}

        {/* Path is a dashed line — invisible to the navigator */}
        <line x1="15" y1="60" x2="85" y2="20" className="stroke-accent/80" strokeWidth="0.6" strokeDasharray="2 1" />

        {/* Soldier with compass */}
        <circle cx="40" cy="44" r="2" className="fill-accent" />
        <line x1="40" y1="44" x2="46" y2="40" className="stroke-accent" strokeWidth="0.6" />
        <polygon points="46,40 44,42 45,38" className="fill-accent" />

        {/* Azimuth label */}
        <text x="50" y="36" textAnchor="middle" className="fill-accent text-[3px] font-mono font-bold">62° · 800 צעדים</text>

        {/* Start */}
        <circle cx="15" cy="60" r="2" className="fill-accent-cool" />
        <text x="15" y="68" textAnchor="middle" className="fill-accent-cool text-[2.5px] font-mono opacity-80">A</text>

        {/* End */}
        <circle cx="85" cy="20" r="2" className="fill-accent-hot" />
        <text x="85" y="14" textAnchor="middle" className="fill-accent-hot text-[2.5px] font-mono opacity-80">B</text>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <Icon name="spark" size={11} className="text-accent" />
        סופת חול · ראות אפסית
      </div>
    </div>
  );
}

function PaceControlVisual() {
  return (
    <div className="aspect-[4/3] sm:aspect-auto h-full relative">
      <svg viewBox="0 0 100 75" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width="100" height="75" className="fill-bg-elevated" />

        {/* Open terrain (left half) */}
        <rect x="0" y="0" width="50" height="75" className="fill-terrain-sand/10" />
        <text x="25" y="12" textAnchor="middle" className="fill-fg-muted text-[3.5px] font-mono">שטח פתוח</text>
        <text x="25" y="68" textAnchor="middle" className="fill-status-warn text-[2.5px] font-mono">חשוף · קצב איטי + דילוגים</text>

        {/* Forest (right half) */}
        <rect x="50" y="0" width="50" height="75" className="fill-terrain-olive/30" />
        {[
          [60, 25], [65, 35], [70, 22], [75, 40], [80, 30], [85, 50], [90, 28],
          [55, 45], [62, 55], [78, 62], [88, 58],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" className="fill-terrain-olive/70" />
        ))}
        <text x="75" y="12" textAnchor="middle" className="fill-fg-muted text-[3.5px] font-mono">יער עבות</text>
        <text x="75" y="68" textAnchor="middle" className="fill-status-ok text-[2.5px] font-mono">מוסתר · קצב מהיר ורציף</text>

        {/* Boundary */}
        <line x1="50" y1="5" x2="50" y2="70" className="stroke-fg-dim" strokeWidth="0.3" strokeDasharray="1 1" />

        {/* Path with units */}
        {/* Open terrain - units in formation with overwatch */}
        <g>
          <circle cx="10" cy="52" r="1.5" className="fill-accent-cool" />
          <circle cx="18" cy="48" r="1.5" className="fill-accent-cool" />
          <circle cx="26" cy="52" r="1.5" className="fill-accent-cool" />
          <line x1="10" y1="52" x2="18" y2="48" className="stroke-accent-cool/40" strokeWidth="0.3" strokeDasharray="0.6 0.4" />
          <line x1="18" y1="48" x2="26" y2="52" className="stroke-accent-cool/40" strokeWidth="0.3" strokeDasharray="0.6 0.4" />
          <text x="18" y="42" textAnchor="middle" className="fill-accent-cool text-[2px] font-mono">חוליה + חיפוי</text>
        </g>

        {/* Forest - units in fast column */}
        <g>
          <circle cx="60" cy="40" r="1.5" className="fill-accent-cool" />
          <circle cx="65" cy="40" r="1.5" className="fill-accent-cool" />
          <circle cx="70" cy="40" r="1.5" className="fill-accent-cool" />
          <circle cx="75" cy="40" r="1.5" className="fill-accent-cool" />
          <line x1="60" y1="40" x2="75" y2="40" className="stroke-accent-cool" strokeWidth="0.5" />
          <text x="67" y="34" textAnchor="middle" className="fill-accent-cool text-[2px] font-mono">טור מהיר</text>
        </g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <Icon name="spark" size={11} className="text-accent" />
        מתאימים קצב לסביבה
      </div>
    </div>
  );
}

function ConclusionCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="mt-6 surface-elevated p-6 border-r-4 border-r-accent flex gap-4 items-start"
    >
      <Icon name="spark" size={22} className="text-accent shrink-0 mt-0.5" />
      <div>
        <div className="text-[10px] font-mono text-accent mb-1 tracking-widest uppercase">
          המסקנה
        </div>
        <p className="text-fg leading-relaxed text-pretty">
          ניווט בשטח אויב זה לא להגיע מהר — זה להגיע <strong className="text-fg">חי, חבוי, ובמקום הנכון</strong>.
          לפעמים זה אומר ללכת ב"איגוף" של 1.5 ק"מ במקום קו ישר של 800 מטר. לפעמים זה ספירת צעדים בעיניים עצומות בסופת חול.
          ולפעמים זה לדעת לעבור מטור צבאי מהיר ביער — לדילוגים איטיים בשטח פתוח. הגמישות היא הניווט.
        </p>
      </div>
    </motion.div>
  );
}
