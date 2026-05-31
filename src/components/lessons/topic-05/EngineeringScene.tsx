'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { InsightCard } from '@/components/lesson/InsightCard';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Mode = 'natural' | 'artificial' | 'mobility' | 'counter';

type ModeMeta = {
  id: Mode;
  label: string;
  english: string;
  icon: IconName;
  color: string;
  bg: string;
  border: string;
  popupTitle: string;
  popupBody: string;
};

const MODES: ModeMeta[] = [
  {
    id: 'natural',
    label: 'מכשול טבעי',
    english: 'Natural Obstacle',
    icon: 'wave',
    color: 'text-terrain-sky',
    bg: 'bg-terrain-sky/10',
    border: 'border-terrain-sky/40',
    popupTitle: 'המלכודות שהטבע מכין לנו מראש',
    popupBody:
      'נהר רחב, צוק גבוה, יער סבוך או ביצה טובענית — אלו מכשולים שתמיד היו שם, הרבה לפני שמישהו התחיל לתכנן את הקרב. התפקיד שלנו הוא <strong>לזהות אותם במפה</strong> ולתכנן את ההגנה כך שהאויב ייתקע בהם. המכשול הטבעי הוא ה"שלד" של ההגנה שלנו — הוא מספק בסיס חזק, אבל כשהוא לבד הוא אף פעם לא מספיק.',
  },
  {
    id: 'artificial',
    label: 'מכשול מלאכותי',
    english: 'Artificial Obstacle',
    icon: 'shield',
    color: 'text-accent-hot',
    bg: 'bg-accent-hot/10',
    border: 'border-accent-hot/40',
    popupTitle: 'כשההנדסה משדרגת את הטבע',
    popupBody:
      'מדובר במכשולים שאנחנו מציבים: שדה מוקשים, תעלה עמוקה שנועדה לעצור טנקים (תעלת נ"ט), גדרות תיל או חומות בטון. השילוב המנצח (סינרגיה) הוא לחבר אותם למכשול טבעי — למשל, לפזר מוקשים בדיוק ביציאה מנחל, או לפרוס גדר לאורך קצה של צוק. ככה נוצרת "רשת לכידה" שקשה מאוד לעבור. כלל ברזל בצבא: לעולם אל תסמכו על מכשול אחד בלבד.',
  },
  {
    id: 'mobility',
    label: 'קידום ניידות (לפנות לנו את הדרך)',
    english: 'Mobility',
    icon: 'truck',
    color: 'text-status-ok',
    bg: 'bg-status-ok/10',
    border: 'border-status-ok/40',
    popupTitle: 'איך פורצים את המלכודות של האויב?',
    popupBody:
      '<strong>פריצה (Breaching)</strong> — חיל ההנדסה נכנס לפעולה כדי לפנות לנו את הדרך ולשבור את החסימות של האויב. זה אומר לנטרל מוקשים כדי ליצור שביל בטוח, להניח גשרים מעל נחלים, לפוצץ חומות, או להפעיל דחפורי ענק (בולדוזרים) כדי לשטח אזורים מלאים בסלעים. המטרה: לחדור את קווי ההגנה של האויב בשיא המהירות, עוד לפני שהוא יספיק להבין מה קורה.',
  },
  {
    id: 'counter',
    label: 'שלילת ניידות (לעצור את האויב)',
    english: 'Counter-Mobility',
    icon: 'bolt',
    color: 'text-status-danger',
    bg: 'bg-status-danger/10',
    border: 'border-status-danger/40',
    popupTitle: 'לנעול לאויב את השטח',
    popupBody:
      'זה בדיוק הצד השני של המשימה — הפעם אנחנו אלה שחוסמים. אנחנו מפזרים לאויב המון מוקשים בדרך, מפוצצים לו גשרים חשובים, חופרים בורות ענקיים בכבישים או חוסמים מסלולי נסיעה נוחים. המטרה היא <strong>לנתב</strong> את הכוחות שלו (מבלי שהם ישימו לב) היישר לתוך "שטחי השמדה" — אזורים פתוחים שסימנו מראש כמארב, ושם יחכו להם הכוחות שלנו עם נשק מוכן מכל הכיוונים.',
  },
];

export function EngineeringScene() {
  const [active, setActive] = useState<Mode>('natural');
  const [expanded, setExpanded] = useState<Mode | null>('natural');

  const handleClick = (id: Mode) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setActive(id);
      setExpanded(id);
    }
  };

  return (
    <section id="scene-engineering" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="05.2"
        eyebrow="עיצוב השטח (הנדסה גיאוגרפית)"
        title={
          <>
            איך <span className="gradient-text">הנדסה</span> הופכת שטח פתוח למבצר קטלני
          </>
        }
        intro='הנדסה בשדה הקרב היא לא סתם "בונוס" נחמד, אלא חלק קריטי מהניצחון. שני דברים קורים פה באותו הזמן: מצד אחד אנחנו פותחים את הדרך לכוחות שלנו, ומצד שני אנחנו חוסמים את הדרך לאויב. מי שמצליח לשלוט בשני הדברים האלה בצורה הטובה ביותר — הוא זה שיכתיב את הקצב של כל הקרב.'
      />

      <div className="mb-6">
        <InsightCard tone="cool" icon="spark" label="חוק הברזל בשטח">
          לעולם אל תסמכו על מכשול אחד בלבד. השילוב החכם בין מה שהטבע נתן (כמו מצוק או נהר) למה שההנדסה מספקת (כמו מוקשים או חומות) הופך כל נחל תמים למלכודת, וכל עמק ל"קופסת הריגה" (אזור קטלני שקשה מאוד לצאת ממנו). זה בדיוק ההבדל בין צבא שסתם נמצא בשטח, לבין צבא שגורם לשטח לעבוד בשבילו.
        </InsightCard>
      </div>

      <div className="grid md:grid-cols-[2fr_3fr] gap-6 items-start mb-12">
        {/* Accordion */}
        <div className="space-y-3">
          {MODES.map((m) => {
            const isActive = active === m.id;
            const isExpanded = expanded === m.id;
            return (
              <div
                key={m.id}
                className={cn(
                  'surface overflow-hidden transition-colors relative',
                  isActive ? 'border-accent bg-bg-elevated' : 'border-border bg-bg-elevated hover:border-accent/50'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="t5-eng-bar"
                    className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleClick(m.id)}
                  aria-expanded={isExpanded}
                  className="w-full p-4 text-right flex items-center gap-3 relative"
                >
                  <span
                    className={cn(
                      'size-10 rounded-xl flex items-center justify-center shrink-0 border transition-all',
                      isActive ? 'bg-accent text-bg-elevated border-accent' : 'bg-bg-accent text-fg-muted border-border'
                    )}
                  >
                    <Icon name={m.icon} size={20} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-base text-fg leading-tight">
                      {m.label}
                    </div>
                    <div className="font-display font-medium tracking-wide text-xs text-fg-dim mt-0.5">{m.english}</div>
                  </div>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn('shrink-0 inline-flex', isExpanded ? 'text-brand-dark' : 'text-fg-dim')}
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
                      key={`panel-${m.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-brand/20">
                        <div className="text-sm font-display font-semibold text-brand-dark mt-3 mb-2 tracking-wider">
                          {m.english}
                        </div>
                        <h4 className="font-display font-bold text-base sm:text-lg leading-tight text-balance mb-2">
                          {m.popupTitle}
                        </h4>
                        <p
                          className="text-sm leading-relaxed text-fg-muted text-pretty"
                          dangerouslySetInnerHTML={{ __html: m.popupBody }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Visualization */}
        <div className="surface-elevated relative overflow-hidden sticky top-6">
          <EngineeringStage mode={active} />
        </div>
      </div>

      {/* Mobility vs Counter-Mobility comparison table */}
      <div>
        <div className="mb-5">
          <h3 className="font-display font-bold text-xl leading-tight mb-1">
            שני צדדים לאותו המטבע
          </h3>
          <p className="text-sm text-fg-muted leading-relaxed">
            חיל ההנדסה מבצע את שתי הפעולות האלו <strong className="text-fg">באותו הזמן</strong>: הוא גם סולל את הדרך קדימה עבורנו, וגם נועל אותה בפני האויב. המשימה הכפולה הזו, שמתבצעת בקו הראשון ותחת אש, מסבירה למה חיל ההנדסה הוא לא חיל של "בנאים" או יחידת עורפית, אלא כוח קרבי קדמי שמוביל את ההתקפה.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <InsightCard tone="ok" icon="truck" label="פילוס הדרך · Mobility" title="קידום ניידות">
            <ul className="space-y-2">
              {[
                'יישור סלעים ענקיים וסלילת שבילים חדשים',
                'הנחת גשרים ניידים (מפלדה) מעל נחלים',
                'נטרול מוקשים ליצירת שביל מעבר בטוח',
                'פיצוץ מבוקר כדי לחדור דרך חומות וגדרות',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Icon name="check" size={13} strokeWidth={2.5} className="text-status-ok shrink-0 mt-1" />
                  <span className="text-fg leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </InsightCard>

          <InsightCard tone="hot" icon="bolt" label="חסימת האויב · Counter-Mobility" title="שלילת ניידות">
            <ul className="space-y-2">
              {[
                'פיזור שדות מוקשים במסלולי נסיעה חשובים',
                'הריסת גשרים וצמתים כדי לתקוע את התקדמות האויב',
                'חפירת בורות ענקיים ("מכתשים") בכביש כדי למנוע נסיעה',
                'חסימת מעברים צרים (כמו ערוץ נחל או רווח בין הרים) בעזרת בניית קירות וחומות',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Icon name="spark" size={13} strokeWidth={2.5} className="text-status-danger shrink-0 mt-1" />
                  <span className="text-fg leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </InsightCard>
        </div>

        <InsightCard tone="accent" icon="eye" label="בדיקת השטח מראש (סיור הנדסי קדמי)">
          אי אפשר לתכנן את כל זה בלי לראות את השטח בעיניים. כוחות סיור נשלחים קדימה כדי לבדוק: מה באמת העומק של הנחל? האם הגשר הישן יצליח להחזיק משקל של טנק? האם האדמה בוצית מדי? אם המודיעין ההנדסי שלנו גרוע, יחכו לנו הפתעות מסוכנות בשטח, ואלפי חיילים עלולים להיתקע במקום.
        </InsightCard>
      </div>
    </section>
  );
}

function EngineeringStage({ mode }: { mode: Mode }) {
  const showNatural = mode === 'natural' || mode === 'mobility' || mode === 'counter';
  const showArtificial = mode === 'artificial' || mode === 'counter';
  const showMobility = mode === 'mobility';
  const showCounter = mode === 'counter';

  return (
    <div className="aspect-[4/3] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <rect x="0" y="0" width="100" height="75" className="fill-bg-accent" />

        {/* Background ridges */}
        <path d="M0 55 L20 40 L40 50 L60 35 L80 45 L100 38 L100 75 L0 75 Z" className="fill-terrain-sand/15" />

        {/* Natural obstacles: river + cliffs */}
        <motion.g initial={false} animate={{ opacity: showNatural ? 1 : 0.25 }} transition={{ duration: 0.3 }}>
          {/* River */}
          <path
            d="M0 55 Q 25 52 50 55 T 100 52"
            fill="none"
            className="stroke-terrain-sky"
            strokeWidth="2.2"
            opacity="0.75"
          />
          <text x="22" y="51" textAnchor="middle" className="fill-terrain-sky font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round">
            נהר זורם
          </text>
          {/* Cliff */}
          <path
            d="M60 25 L75 22 L78 30 L62 32 Z"
            className="fill-terrain-ridge/40 stroke-terrain-ridge"
            strokeWidth="0.4"
          />
          <text x="69" y="22" textAnchor="middle" className="fill-terrain-ridge font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
            מצוק
          </text>
        </motion.g>

        {/* Artificial obstacles: mines + AT ditch + wire */}
        <motion.g initial={false} animate={{ opacity: showArtificial ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          {/* Minefield */}
          <rect x="28" y="40" width="18" height="8" rx="1" className="fill-status-danger/25 stroke-status-danger" strokeWidth="0.5" strokeDasharray="1.2 0.6" />
          {[
            [30, 42], [33, 44], [36, 42.5], [38, 45], [42, 43.5], [44, 41.5],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="0.7" className="fill-status-danger" />
            </g>
          ))}
          <text x="37" y="38" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
            שדה מוקשים
          </text>

          {/* AT ditch */}
          <path d="M55 40 L80 42 L80 45 L55 43 Z" className="fill-fg/30 stroke-fg" strokeWidth="0.3" />
          <text x="67.5" y="48.5" textAnchor="middle" className="fill-fg font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
            תעלה נגד טנקים (נ"ט)
          </text>

          {/* Wire entanglement */}
          {[10, 14, 18, 22, 26].map((x) => (
            <path
              key={x}
              d={`M ${x} 60 q 1.2 -2 2.4 0 t 2.4 0`}
              fill="none"
              className="stroke-fg-muted"
              strokeWidth="0.3"
            />
          ))}
          <text x="18" y="65" textAnchor="middle" className="fill-fg-muted font-display font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
            גדר תיל סבוכה
          </text>
        </motion.g>

        {/* Mobility (breaching) overlay */}
        <motion.g initial={false} animate={{ opacity: showMobility ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          {/* Bridge over river */}
          <rect x="48" y="52" width="6" height="6" rx="0.6" className="fill-status-ok stroke-status-ok" strokeWidth="0.5" />
          <text x="51" y="65" textAnchor="middle" className="fill-status-ok font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
            גשר זמני
          </text>
          {/* Breaching arrow through */}
          <path
            d="M10 65 Q 30 60 51 55 Q 75 35 90 25"
            fill="none"
            className="stroke-status-ok"
            strokeWidth="0.7"
            strokeDasharray="2 1.2"
            markerEnd="url(#arrow-ok)"
          />
          <defs>
            <marker id="arrow-ok" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
              <polygon points="0,0 4,2 0,4" className="fill-status-ok" />
            </marker>
          </defs>
          <text x="40" y="58" textAnchor="middle" className="fill-status-ok font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round">
            פריצה
          </text>
        </motion.g>

        {/* Counter-mobility: channeling into kill zone */}
        <motion.g initial={false} animate={{ opacity: showCounter ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          {/* Kill zone */}
          <ellipse cx="80" cy="32" rx="9" ry="6" className="fill-status-danger/15 stroke-status-danger" strokeWidth="0.4" strokeDasharray="1.5 0.8" />
          <text x="80" y="22" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="3" paintOrder="stroke" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round">
            שטח השמדה
          </text>
          {/* Channeling arrows */}
          <path d="M20 65 Q 40 60 60 50 Q 70 42 80 32" fill="none" className="stroke-status-danger" strokeWidth="0.5" strokeDasharray="1 0.6" />
          <path d="M10 60 Q 25 55 45 48 Q 65 43 80 32" fill="none" className="stroke-status-danger" strokeWidth="0.5" strokeDasharray="1 0.6" />
        </motion.g>

        {/* Start/end markers */}
        <g>
          <circle cx="6" cy="68" r="1.6" className="fill-accent-cool" />
          <text x="6" y="73" textAnchor="middle" className="fill-accent-cool font-display font-bold font-bold" fontSize="2.8"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >A</text>
        </g>
        <g>
          <circle cx="92" cy="18" r="1.6" className="fill-accent-hot" />
          <text x="92" y="15" textAnchor="middle" className="fill-accent-hot font-display font-bold font-bold" fontSize="2.8"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >B</text>
        </g>
      </svg>

      <div className="absolute top-3 start-3 chip border-accent/30 bg-bg/60 backdrop-blur text-[10px] text-fg-muted">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        אותו השטח בדיוק, מ-4 זוויות מבט שונות של ההנדסה
      </div>
    </div>
  );
}
