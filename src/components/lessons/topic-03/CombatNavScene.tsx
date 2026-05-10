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
    oneLiner: 'נעזרים בסימן דרך טבעי וארוך בשטח כדי לשמור על הכיוון, במקום ללכת בקו ישר.',
    detail: 'ללכת בקו ישר אל היעד נשמע כמו הדרך ההגיונית והקצרה ביותר, אבל בשטח מסוכן היא לרוב תהיה חשופה וגלויה מדי. במקום זאת, בוחרים צורת נוף ארוכה ובולטת – כמו ערוץ נחל, שרשרת הרים (רכס) או שביל – והולכים במקביל אליה. ממש כמו שמעקה במדרגות עוזר לנו להרגיש בטוחים בחושך, ה"מעקה" הטבעי בשטח עוזר לנו לשמור על הכיוון מבלי ללכת לאיבוד, גם כשלא רואים כלום.',
    whenToUse: ['בלילה, כשקשה לזהות פרטים קטנים בסביבה.', 'כשמנווטים באזור חדש ולחלוטין לא מוכר.', 'כשיש צורך לעקוף שטחים פתוחים שבהם קל להתגלות.'],
    example: 'במקום לחצות שדה פתוח וחשוף בקו ישר (על בסיס כיוון המצפן), הקבוצה בוחרת ללכת בצמוד לתחתית של הר שמוביל לאותו כיוון. כך כולם נשארים מוסתרים מעיני האויב, ויודעים שהם בכיוון הנכון כל עוד ההר לצידם.',
  },
  {
    id: 'dead',
    label: 'ניווט עיוור',
    english: 'Dead Reckoning',
    icon: 'compass',
    oneLiner: 'מנווטים "על עיוור" בעזרת מצפן וספירת צעדים בלבד.',
    detail: 'זוהי שיטת ניווט למצבי קיצון שבהם אי אפשר להיאחז בשום סימן בשטח. מתבססים רק על שני דברים: הליכה בכיוון מוגדר מראש במצפן (שנקרא "אזימוט") וספירת צעדים מדויקת כדי לדעת איזה מרחק עברנו. השיטה הזו דורשת משמעת ברזל – להמשיך לסמוך על המצפן והספירה שלכם, גם אם תחושת הבטן צועקת שאתם הולכים בכיוון הלא נכון.',
    whenToUse: ['בזמן סופת חול או ערפל כבד, כשהראות יורדת לאפס.', 'באזורים כמו דיונות חול ענקיות שבהם הכל נראה אותו דבר.', 'במדבר פתוח או ימת מלח – שטחים ריקים לגמרי שאין בהם צמחייה, מבנים או הרים (מה שנקרא בשפה המקצועית שטח "חסר תכסית").'],
    example: 'כוח שמנווט במדבר נקלע לפתע לסופת חול, ואי אפשר לראות מטר קדימה. במקום להתבלבל, הלוחמים מכוונים את המצפן לזווית קבועה מראש (למשל 62 מעלות) ופשוט צועדים וסופרים 800 צעדים. כך, למרות "העיוורון" המוחלט בדרך, הם עוברים 1.2 קילומטרים ומגיעים בדיוק ליעד המתוכנן.ד',
  },
  {
    id: 'pace',
    label: 'שליטה בקצב',
    english: 'Pace & Path Control',
    icon: 'spark',
    oneLiner: 'משנים את קצב ההליכה וצורת התנועה בהתאם לתנאי השטח והסכנה.',
    detail: 'בניווט אי אפשר לשמור על קצב הליכה אחיד. באזור פתוח שבו קל מאוד להתגלות, ההתקדמות תהיה איטית וזהירה – נעבור בריצות קצרות ("דילוגים") ממקום מסתור אחד לאחר (למשל, מסלע לשיח). לעומת זאת, כשאנחנו באזור שמעניק לנו הסתרה טבעית (כמו יער צפוף או ערוץ נחל עמוק), ננצל את ההזדמנות ונתקדם בתנועה רציפה ומהירה כדי לחסוך זמן.',
    whenToUse: ['כשחוצים אזור פתוח וחשוף – מתקדמים לאט ובקפיצות ממחסה למחסה.', 'בתנועה באזור מוסתר – מתקדמים מהר, ברצף, אחד אחרי השני (בטור).', 'בכל מעבר בין סוגי שטח שונים – נדרשת ערנות כדי לשנות את קצב ההליכה מיד.'],
    example: 'קבוצה צריכה לחצות שדה פתוח בלילה. הם יתקדמו לאט מאוד, כשחלקם עוצרים בכל פעם עם נשק מוכן כדי לשמור ולהגן ("לחפות") על אלו שמתקדמים קדימה. ברגע שהם יסיימו לחצות את השדה וייכנסו ליער סבוך שמסתיר אותם, כולם יסתדרו מיד בשורה ארוכה (טור) ויעברו להליכה מהירה ורצופה.',
  },
];

export function CombatNavScene() {
  const [active, setActive] = useState<Method>('handrail');

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
        intro="ניווט בשטח עוין הוא לא עוד טיול בטבע. המטרה היא לא רק להגיע ליעד, אלא להגיע אליו בבטחה: להישאר מוסתרים, להימנע מסכנות בדרך, ולהתאים את ההליכה לתנאי השטח. הנה שלוש טכניקות ניווט מיוחדות למצבי קיצון שכל אחד יכול להבין."
      />

      <div className="grid lg:grid-cols-[1fr_1.7fr] gap-6 items-start">
        {/* Accordion list — first child → RIGHT in RTL (text on right) */}
        <div className="space-y-3">
          {METHODS.map((m, i) => {
            const isActive = active === m.id;
            return (
              <div
                key={m.id}
                className={cn(
                  'surface overflow-hidden transition-colors relative',
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
                <button
                  type="button"
                  onClick={() => setActive(m.id)}
                  aria-expanded={isActive}
                  className="w-full p-4 text-right flex items-center gap-3"
                >
                  <span
                    className={cn(
                      'size-9 rounded-xl flex items-center justify-center shrink-0 transition-all',
                      isActive ? 'bg-accent text-bg shadow-glow' : 'bg-bg-accent text-fg-muted'
                    )}
                  >
                    <span className="font-mono text-sm font-bold">{i + 1}</span>
                  </span>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="text-xs font-mono text-fg-dim mb-0.5 tracking-widest uppercase">
                      טכניקה {i + 1}
                    </div>
                    <div className={cn('font-display font-bold leading-tight', isActive ? 'text-accent' : 'text-fg')}>
                      {m.label}
                    </div>
                    <div className="text-xs font-mono text-fg-dim mt-0.5">{m.english}</div>
                  </div>
                  <motion.span
                    animate={{ rotate: isActive ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', isActive ? 'text-accent' : 'text-fg-dim')}
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
                  {isActive && (
                    <motion.div
                      key={`panel-${m.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-accent/20 space-y-3">
                        <div className="mt-3">
                          <div className="text-xs font-mono text-accent mb-1 tracking-widest uppercase">
                            מה זה ולמה זה עובד
                          </div>
                          <p className="text-sm text-fg leading-relaxed">{m.detail}</p>
                        </div>

                        <div>
                          <div className="text-xs font-mono text-accent-cool mb-1 tracking-widest uppercase">
                            מתי משתמשים בזה
                          </div>
                          <ul className="space-y-1.5 text-sm">
                            {m.whenToUse.map((u) => (
                              <li key={u} className="flex gap-2">
                                <Icon name="check" size={14} className="text-accent-cool mt-0.5 shrink-0" strokeWidth={2.5} />
                                <span className="text-fg leading-relaxed">{u}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-2 border-t border-border-subtle">
                          <div className="text-xs font-mono text-fg-dim mb-1 tracking-widest uppercase">
                            דוגמה
                          </div>
                          <p className="text-sm text-fg-muted leading-relaxed">{m.example}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Visualization — second child → LEFT in RTL */}
        <div className="surface-elevated relative overflow-hidden min-h-[480px] sticky top-6">
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
בניווט בסביבה עוינת, המטרה היא לא להגיע הכי מהר, אלא להגיע בבטחה, ללא התגלות, ובדיוק לנקודה הנכונה.
המשמעות היא שלפעמים ההחלטה החכמה ביותר תהיה לעשות מסלול עוקף וארוך של קילומטר וחצי (פעולה שנקראת "איגוף"), במקום לחתוך 800 מטר בקו ישר וחשוף. לפעמים המשמעות היא לסמוך נטו על ספירת הצעדים שלכם בתוך סופת חול עיוורת, ולפעמים – לדעת מתי לרוץ מהר בתוך יער, ומתי להתקדם לאט ובזהירות בשטח פתוח. סוד ההצלחה האמיתי בניווט הוא הגמישות והיכולת "לקרוא" את השטח.        </p>
      </div>
    </motion.div>
  );
}
