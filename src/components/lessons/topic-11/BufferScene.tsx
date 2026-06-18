'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

type Layer = 'physical' | 'fence' | 'sensors' | 'radar';

type LayerData = {
  id: Layer;
  label: string;
  english: string;
  icon: IconName;
  capability: string;
  cost: string;
  replaces: string;
};

const LAYERS: LayerData[] = [
  {
    id: 'physical',
    label: 'רצועה מפורזת',
    english: 'Physical Buffer',
    icon: 'mountain',
    capability:
      'שטח פיזי ריק ברוחב קילומטרים ספורים. הכניסה לכוחות צבא אסורה, ולעיתים קרובות אין בו גם אזרחים.',
    cost: 'תשלום במטבע של קרקע: דורש מהמדינה לוותר על שטח ריבוני.',
    replaces:
      'זהו בסיס ההגנה המסורתי. עצם קיום המרחק הוא מה שמעכב את האויב ומונע חיכוך סתמי.',
  },
  {
    id: 'fence',
    label: 'גדר חכמה',
    english: 'Smart Fence',
    icon: 'shield',
    capability:
      'מכשול פיזי משולב בטכנולוגיה — מזהה ניסיונות טיפוס, חיתוך רשת או תנועה קרובה. מתריע מיד בזמן אמת.',
    cost: 'כ-1 עד 3 מיליון דולר לכל קילומטר, פלוס עלויות תחזוקה גבוהות מאוד.',
    replaces:
      'מחליפה את הצורך בחייל שעומד פיזית על הקו. עם זאת, היא מתריעה רק כשנוגעים בה — כלומר לא מספקת עומק התרעתי.',
  },
  {
    id: 'sensors',
    label: 'חיישנים סייסמיים',
    english: 'Seismic Sensors',
    icon: 'wave',
    capability:
      'חיישנים הקבורים באדמה (או פרוסים סביבה) שמזהים תנודות ורעידות. יודעים להבחין בין אדם הולך, רכב נוסע או חפירת מנהרה.',
    cost: '200,000$ עד מיליון דולר לקילומטר. מחייב חיבור למערכת שליטה ובקרה (חמ"ל) מתקדמת.',
    replaces:
      'מחליפה סיורי שטח (פטרולים). מספקת "עיניים ואוזניים" שקופות על הקרקע בכיסוי של 24/7.',
  },
  {
    id: 'radar',
    label: 'רדאר ותצפית',
    english: 'Radar / Observation',
    icon: 'eye',
    capability:
      '"לראות מעבר לגבעה". מכ"מים שחודרים עננים, בלוני תצפית ומצלמות חום, שסורקים למרחק של עשרות קילומטרים לתוך שטח האויב.',
    cost: '5 עד 50 מיליון דולר למערכת תצפית בודדת, בהתאם לטווח ולרזולוציה.',
    replaces:
      'זו ההחלפה האמיתית של עומק אסטרטגי. מאפשרת למדינה קטנה לזהות תנועות אויב הרבה לפני שהוא בכלל מתקרב לגבול שלה.',
  },
];

const BUFFER_EXAMPLES = [
  {
    name: 'האזור המפורז הקוריאני (DMZ)',
    english: 'Korean DMZ · 1953',
    width: '~4 ק"מ',
    length: '~250 ק"מ',
    desc: 'הרצועה הצבאית המתוחה בעולם שעדיין פעילה. מלאה ב-2 מיליון מוקשים, מצלמות, ואלפי חיילים החמושים עד השיניים משני צידי המתרס.',
    success: 'הרתעה קפואה אך יציבה — למרות המתח האדיר, מ-1953 לא פרצה שם מלחמה כוללת.',
    icon: 'shield' as IconName,
  },
  {
    name: 'כוח אונדו"ף (UNDOF) ברמת הגולן',
    english: 'UN Disengagement Observer Force · 1974',
    width: '~10 ק"מ',
    length: '~80 ק"מ',
    desc: 'רצועת שטח שחוצצת בין צה"ל לצבא סוריה מאז מלחמת יום הכיפורים (1974). אסור להכניס אליה נשק כבד, והיא מפוקחת על ידי חיילי או"ם.',
    success: 'הצליחה לשמור על גבול שקט כמעט לחלוטין במשך 40 שנה, עד שפרצה מלחמת האזרחים בסוריה ב-2011.',
    icon: 'flag' as IconName,
  },
  {
    name: '"הקו הירוק" בקפריסין',
    english: 'Green Line · 1974',
    width: '~7 ק"מ ברוחב המקסימלי',
    length: '~180 ק"מ',
    desc: 'שטח הפרדה שחוצה את האי קפריסין (ואת הבירה ניקוסיה) לשניים, ומפריד בין הקפריסאים היוונים לטורקים כדי למנוע מלחמת אזרחים.',
    success: 'מנע בהצלחה הידרדרות אלימה, אך הנציח סטטוס-קוו בעייתי שמונע פתרון פוליטי כבר מעל ל-50 שנה.',
    icon: 'compass' as IconName,
  },
];

export function BufferScene() {
  const [activeLayers, setActiveLayers] = useState<Set<Layer>>(new Set(['physical']));

  // Accordion value (multi-open) is the SAME as the active layers — opening
  // a panel turns the layer on in the viz, closing turns it off. One click,
  // one mental model: each accordion IS its layer.
  const accordionValue = Array.from(activeLayers);
  const handleAccordionChange = (vals: string[]) => {
    setActiveLayers(new Set(vals as Layer[]));
  };

  const detectionRange = activeLayers.has('radar')
    ? 25
    : activeLayers.has('sensors')
      ? 8
      : activeLayers.has('fence')
        ? 1
        : 0;
  const reactionTime = activeLayers.has('radar')
    ? '15+ דקות'
    : activeLayers.has('sensors')
      ? '5–10 דקות'
      : activeLayers.has('fence')
        ? '1–2 דקות'
        : 'מיידי בלבד';

  return (
    <section id="scene-buffer" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="11.2"
        eyebrow="אזורי חיץ וטכנולוגיה"
title = {
  <>
    כשאין עומק למדינה — <span className="text-accent-hover">הטכנולוגיה צריכה לקנות לה זמן</span>
  </>
}
        intro={`מדינה צרה לא יכולה להרשות לעצמה אזור הפרדה של 100 ק"מ. במקום זה, היא משתמשת במודיעין וסנסורים: גדרות חכמות, חיישני קרקע ומערכות רדאר. הטכנולוגיה מנסה לקנות את מה שהגיאוגרפיה לא נותנת — זמן התרעה. לחצו על שכבה ברשימה — היא תיפתח להסבר ותידלק בתצוגה.`}
      />

      <div className="grid md:grid-cols-2 gap-4 mb-12 items-stretch">
        <div className="surface-elevated p-6 rounded-2xl">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wide text-accent mb-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            הגדרת היסוד
          </div>
          <h3 className="font-display font-bold text-xl leading-tight mb-3 text-accent-hover">
            אזור חיץ — שטח שמרכך את המכה הראשונה
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            שטח "נקי" מצבא (מפורז) או דליל מאוד בכוחות, שמפריד בין שתי מדינות עוינות. המטרה שלו כפולה: <strong className="text-fg">למנוע חיכוך יומיומי</strong>, ו<strong className="text-fg">לקלוט את המכה הראשונה</strong> במקרה של פלישה כדי לתת התרעה מוקדמת.
          </p>
        </div>
        <div className="surface-elevated p-6 rounded-2xl">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wide text-accent mb-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            כשאין שטח
          </div>
          <h3 className="font-display font-bold text-xl leading-tight mb-3 text-accent-hover">
            אזור חיץ וירטואלי — טכנולוגיה במקום מרחק
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            צבאות מתקדמים פורסים "שכבות איסוף" (גדרות חכמות, מכ"מים, לוויינים) שיוצרות "אזור חיץ וירטואלי" ומספקות התרעה מרחוק, במקום להסתמך על מרחק פיזי שאין למדינה.
          </p>
        </div>
      </div>

      {/* Main 2-column block — accordions right (source first), viz left.
          Same layout family as topic-01 OnboardingScene. */}
      <div className="grid lg:grid-cols-[2fr_3fr] gap-6 mb-12">
        {/* Right (RTL): 4 accordion items, one per layer */}
        <Accordion
          type="multiple"
          value={accordionValue}
          onValueChange={handleAccordionChange}
          className="space-y-3"
        >
          {LAYERS.map((l, i) => {
            const isActive = activeLayers.has(l.id);
            return (
              <AccordionItem
                key={l.id}
                value={l.id}
                className={cn(
                  'transition-all duration-300 ease-snap',
                  isActive
                    ? 'border-brand/45 bg-bg-elevated'
                    : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                )}
              >
                <AccordionTrigger>
                  {isActive && (
                    <motion.span
                      layoutId="t11-buffer-bar"
                      className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
                    />
                  )}
                  <span
                    className={cn(
                      'size-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                      isActive
                        ? 'bg-brand-dark text-bg-elevated border-brand-dark'
                        : 'bg-bg-accent text-fg-muted border-border',
                    )}
                  >
                    <span className="font-display text-sm font-bold">{i + 1}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold leading-tight text-fg">
                      {l.label}
                    </div>
                    <div className="font-display font-medium tracking-wide text-[11px] text-fg-dim mt-0.5">
                      {l.english}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-brand-dark mt-3 mb-2.5">
                    <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                    מה השכבה הזו עושה
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-fg-muted mb-1">
                        יכולת
                      </div>
                      <p className="text-sm text-fg leading-relaxed text-pretty">{l.capability}</p>
                    </div>
                    <div>
                      <div className="text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-fg-muted mb-1">
                        עלות
                      </div>
                      <p className="text-sm text-fg-muted leading-relaxed text-pretty">{l.cost}</p>
                    </div>
                    <div>
                      <div className="text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent-hover mb-1">
                        מה היא מחליפה
                      </div>
                      <p className="text-sm text-fg leading-relaxed text-pretty">{l.replaces}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Left (RTL): cumulative buffer visualisation */}
        <div className="surface-elevated bg-bg-accent/30 rounded-2xl p-4 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 text-sm font-display font-semibold text-brand-dark tracking-wider">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              אזור חיץ עם שכבות טכנולוגיה
            </div>
            <div className="chip border-accent/40 bg-accent/10 text-accent">
              <Icon name="eye" size={12} strokeWidth={2.5} />
              <span className="font-display font-medium tracking-wide tabular-nums">
                זיהוי {detectionRange} ק"מ · התרעה {reactionTime}
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-[360px] flex">
            <BufferViz activeLayers={activeLayers} />
          </div>
        </div>
      </div>

      <SoftDivider text="3 אזורי חיץ מהעולם שבאמת עובדים (בדרך כלל)" />

      {/* Examples */}
      <div className="grid lg:grid-cols-3 gap-3 mb-6">
        {BUFFER_EXAMPLES.map((e, i) => (
          <motion.div
            key={e.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.08 }}
            className="surface p-5 rounded-xl"
          >
            <div className="mb-3">
              <div className="font-display font-bold leading-tight">{e.name}</div>
              <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim">{e.english}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="surface p-2 rounded-lg">
                <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim">רוחב</div>
                <div className="font-display font-bold text-sm text-accent">{e.width}</div>
              </div>
              <div className="surface p-2 rounded-lg">
                <div className="text-[11px] font-display font-medium tracking-wide text-fg-dim">אורך</div>
                <div className="font-display font-bold text-sm text-accent">{e.length}</div>
              </div>
            </div>

            <p className="text-sm text-fg-muted leading-relaxed mb-3">{e.desc}</p>
            <div className="text-sm text-fg bg-bg-accent/40 rounded-lg p-3 leading-relaxed">
              <strong className="text-fg block mb-1 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-fg-muted">
                תוצאה
              </strong>
              {e.success}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function BufferViz({ activeLayers }: { activeLayers: Set<Layer> }) {
  return (
    <div className="relative w-full h-full min-h-[360px] rounded-xl overflow-hidden">
      <svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
        {/* Enemy territory (left) */}
        <rect x="0" y="0" width="20" height="56" className="fill-status-danger/10" />
        <text x="10" y="9" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
          שטח אויב
        </text>

        {/* Buffer zone (physical layer) */}
        {activeLayers.has('physical') && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <rect x="20" y="0" width="35" height="56" className="fill-status-warn/15" />
            <text x="37.5" y="9" textAnchor="middle" className="fill-status-warn font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
              אזור חיץ מפורז
            </text>
          </motion.g>
        )}

        {/* Own territory (right) */}
        <rect x="55" y="0" width="45" height="56" className="fill-terrain-ridge/15" />
        <text x="77" y="9" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
          שטחנו
        </text>

        {/* Borders */}
        <line x1="20" y1="0" x2="20" y2="56" className="stroke-status-danger" strokeWidth="0.5" strokeDasharray="1.5 0.8" />
        <line x1="55" y1="0" x2="55" y2="56" className="stroke-accent" strokeWidth="0.5" strokeDasharray="1.5 0.8" />

        {/* Smart fence */}
        {activeLayers.has('fence') && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <line x1="55" y1="20" x2="55" y2="46" className="stroke-accent" strokeWidth="0.8" />
            {[20, 24, 28, 32, 36, 40, 44].map((y, i) => (
              <line key={i} x1="54.5" y1={y} x2="55.5" y2={y} className="stroke-accent" strokeWidth="0.4" />
            ))}
            {[25, 35].map((y, i) => (
              <circle key={i} cx="55" cy={y} r="0.6" className="fill-accent" />
            ))}
            <text x="55" y="50" textAnchor="middle" className="fill-accent font-display font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
              גדר חכמה
            </text>
          </motion.g>
        )}

        {/* Seismic sensors */}
        {activeLayers.has('sensors') && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {[
              { x: 60, y: 25 },
              { x: 65, y: 32 },
              { x: 70, y: 26 },
              { x: 60, y: 40 },
              { x: 70, y: 42 },
            ].map((s, i) => (
              <g key={i}>
                <circle cx={s.x} cy={s.y} r="0.8" className="fill-accent-cool" />
                <circle cx={s.x} cy={s.y} r="2" fill="none" className="stroke-accent-cool" strokeWidth="0.2" strokeDasharray="0.4 0.3" />
              </g>
            ))}
            <text x="65" y="50" textAnchor="middle" className="fill-accent-cool font-display font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
              חיישנים סייסמיים
            </text>
          </motion.g>
        )}

        {/* Radar dome */}
        {activeLayers.has('radar') && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <line x1="85" y1="32" x2="85" y2="40" className="stroke-fg" strokeWidth="0.5" />
            <ellipse cx="85" cy="30" rx="2.5" ry="1.4" className="fill-accent-hot stroke-accent-hot" strokeWidth="0.3" />
            <path
              d="M 85 30 A 35 35 0 0 0 50 30 A 35 35 0 0 0 50 30 L 85 30"
              fill="none"
              className="stroke-accent-hot"
              strokeWidth="0.3"
              strokeDasharray="1 0.7"
              opacity="0.5"
            />
            <path d="M 85 30 L 18 5 L 18 55 Z" fill="currentColor" className="text-accent-hot" opacity="0.08" />
            <text x="85" y="44" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
              רדאר
            </text>
            <text x="40" y="14" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="2.2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.75" strokeLinejoin="round">
              ↤ סריקה לטווח 25 ק"מ עמוק לשטח האויב
            </text>
          </motion.g>
        )}

        {/* Approaching enemy figure */}
        <motion.g
          animate={{ x: [0, 15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx="5" cy="32" r="1.2" className="fill-status-danger" />
        </motion.g>

        {/* Status label */}
        {activeLayers.size === 0 && (
          <text x="50" y="28" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="4" paintOrder="stroke" stroke="#ffffff" strokeWidth="1.4" strokeLinejoin="round">
            ⚠ אין הגנה
          </text>
        )}
      </svg>
    </div>
  );
}

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-sm font-display font-semibold text-fg-muted tracking-wider">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
