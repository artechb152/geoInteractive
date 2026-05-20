'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
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
  color: string;
  bg: string;
  border: string;
};

const LAYERS: LayerData[] = [
  {
    id: 'physical',
    label: 'רצועה מפורזת',
    english: 'Physical Buffer',
    icon: 'mountain',
    capability: 'שטח פיזי ריק ברוחב קילומטרים ספורים. הכניסה לכוחות צבא אסורה, ולעיתים קרובות אין בו גם אזרחים.',
    cost: 'תשלום במטבע של קרקע: דורש מהמדינה לוותר על שטח ריבוני.',
    replaces: 'זהו בסיס ההגנה המסורתי. עצם קיום המרחק הוא מה שמעכב את האויב ומונע חיכוך סתמי.',
    color: 'text-terrain-ridge',
    bg: 'bg-terrain-ridge/10',
    border: 'border-terrain-ridge/40',
  },
  {
    id: 'fence',
    label: 'גדר חכמה',
    english: 'Smart Fence',
    icon: 'shield',
    capability: 'מכשול פיזי משולב בטכנולוגיה — מזהה ניסיונות טיפוס, חיתוך רשת או תנועה קרובה. מתריע מיד בזמן אמת.',
    cost: 'כ-1 עד 3 מיליון דולר לכל קילומטר, פלוס עלויות תחזוקה גבוהות מאוד.',
    replaces: 'מחליפה את הצורך בחייל שעומד פיזית על הקו. עם זאת, היא מתריעה רק כשנוגעים בה — כלומר לא מספקת עומק התרעתי.',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/40',
  },
  {
    id: 'sensors',
    label: 'חיישנים סייסמיים',
    english: 'Seismic Sensors',
    icon: 'satellite',
    capability: 'חיישנים הקבורים באדמה (או פרוסים סביבה) שמזהים תנודות ורעידות. יודעים להבחין בין אדם הולך, רכב נוסע או חפירת מנהרה.',
    cost: '200,000$ עד מיליון דולר לקילומטר. מחייב חיבור למערכת שליטה ובקרה (חמ"ל) מתקדמת.',
    replaces: 'מחליפה סיורי שטח (פטרולים). מספקת "עיניים ואוזניים" שקופות על הקרקע בכיסוי של 24/7.',
    color: 'text-accent-cool',
    bg: 'bg-accent-cool/10',
    border: 'border-accent-cool/40',
  },
  {
    id: 'radar',
    label: 'רדאר ותצפית',
    english: 'Radar / Observation',
    icon: 'eye',
    capability: '"לראות מעבר לגבעה". מכ"מים שחודרים עננים, בלוני תצפית ומצלמות חום, שסורקים למרחק של עשרות קילומטרים לתוך שטח האויב.',
    cost: '5 עד 50 מיליון דולר למערכת תצפית בודדת, בהתאם לטווח ולרזולוציה.',
    replaces: 'זו ההחלפה האמיתית של עומק אסטרטגי. מאפשרת למדינה קטנה לזהות תנועות אויב הרבה לפני שהוא בכלל מתקרב לגבול שלה.',
    color: 'text-accent-hot',
    bg: 'bg-accent-hot/10',
    border: 'border-accent-hot/40',
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

  const toggleLayer = (id: Layer) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const detectionRange = activeLayers.has('radar') ? 25 : activeLayers.has('sensors') ? 8 : activeLayers.has('fence') ? 1 : 0;
  const reactionTime = activeLayers.has('radar') ? '15+ דקות' : activeLayers.has('sensors') ? '5–10 דקות' : activeLayers.has('fence') ? '1–2 דקות' : 'מיידי בלבד';

  return (
    <section id="scene-buffer" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="11.2"
        eyebrow="אזורי חיץ וטכנולוגיה"
        title={
          <>
            איך <span className="gradient-text">טכנולוגיה מנסה להחליף</span> מרחק וגיאוגרפיה?
          </>
        }
        intro={`מדינה צרה לא יכולה להרשות לעצמה אזור הפרדה של 100 ק"מ. במקום זה, היא משתמשת במודיעין וסנסורים: גדרות חכמות, חיישני קרקע ומערכות רדאר. הטכנולוגיה מנסה לקנות את מה שהגיאוגרפיה לא נותנת — זמן התרעה. הדליקו וכיבו את השכבות כדי לראות איך זה עובד.`}
      />

      <div className="p-5 mb-6">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">אזור חיץ (Buffer Zone)</strong> — שטח "נקי" מצבא (מפורז) או דליל מאוד בכוחות, שמפריד בין שתי מדינות עוינות. המטרה שלו כפולה: <strong className="text-fg">למנוע חיכוך יומיומי</strong>, ו<strong className="text-fg">לקלוט את המכה הראשונה</strong> במקרה של פלישה כדי לתת התרעה מוקדמת.
            <strong className="text-fg block mt-1.5">ומה עושים כשאין שטח?</strong> פונים לטכנולוגיה. צבאות מתקדמים פורסים "שכבות איסוף" (גדרות חכמות, מכ"מים, לוויינים) שיוצרות "אזור חיץ וירטואלי" ומספקות התרעה מרחוק, במקום להסתמך על מרחק פיזי.
          </div>
        </div>
      </div>

      {/* Buffer visualization */}
      <div className="surface-elevated p-4 rounded-2xl mb-6 overflow-hidden">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
            אזור חיץ עם שכבות טכנולוגיה
          </div>
          <div className="chip border-accent/40 bg-accent/10 text-accent">
            <Icon name="eye" size={12} strokeWidth={2.5} />
            <span className="font-mono">טווח זיהוי מוקדם: {detectionRange} ק"מ · זמן התרעה: {reactionTime}</span>
          </div>
        </div>

        <BufferViz activeLayers={activeLayers} />
      </div>

      {/* Layer toggles */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
        {LAYERS.map((l) => {
          const isActive = activeLayers.has(l.id);
          return (
            <button
              key={l.id}
              onClick={() => toggleLayer(l.id)}
              className={cn(
                'surface p-3 text-right transition-all rounded-xl flex items-center gap-2',
                isActive ? `${l.border} shadow-glow ${l.bg}` : 'hover:border-border-strong opacity-70'
              )}
            >
              <div className={cn('size-9 rounded-lg flex items-center justify-center border-2 shrink-0', l.border, l.bg)}>
                <Icon name={l.icon} size={16} className={l.color} />
              </div>
              <div className="min-w-0">
                <div className={cn('font-display font-bold text-sm leading-tight', isActive && l.color)}>
                  {l.label}
                </div>
                <div className="text-[10px] font-mono text-fg-dim">{isActive ? 'פעיל' : 'כבוי'}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Layer details */}
      <div className="grid sm:grid-cols-2 gap-3 mb-12">
        {LAYERS.filter((l) => activeLayers.has(l.id)).map((l) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('surface-elevated p-5 rounded-2xl border-r-4', l.border.replace('border-', 'border-r-'), l.bg)}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn('size-11 rounded-xl flex items-center justify-center border-2 shrink-0', l.border)}>
                <Icon name={l.icon} size={20} className={l.color} />
              </div>
              <div>
                <div className={cn('font-display font-bold leading-tight', l.color)}>{l.label}</div>
                <div className="text-[10px] font-mono text-fg-dim">{l.english}</div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="text-sm font-display font-semibold text-fg-muted mb-0.5 tracking-wider">יכולת</div>
                <div className="text-fg leading-relaxed">{l.capability}</div>
              </div>
              <div>
                <div className="text-sm font-display font-semibold text-fg-muted mb-0.5 tracking-wider">עלות</div>
                <div className="text-fg-muted leading-relaxed">{l.cost}</div>
              </div>
              <div>
                <div className={cn('text-sm font-display font-semibold mb-0.5 tracking-wider', l.color)}>מה היא מחליפה</div>
                <div className="text-fg leading-relaxed">{l.replaces}</div>
              </div>
            </div>
          </motion.div>
        ))}
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
            <div className="flex items-center gap-2.5 mb-3">
              <div className="size-10 rounded-xl bg-bg-accent border border-border flex items-center justify-center shrink-0">
                <Icon name={e.icon} size={18} className="text-accent" />
              </div>
              <div>
                <div className="font-display font-bold leading-tight">{e.name}</div>
                <div className="text-[10px] font-mono text-fg-dim">{e.english}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="surface p-2 rounded-lg">
                <div className="text-[10px] font-mono text-fg-dim">רוחב</div>
                <div className="font-display font-bold text-sm text-accent">{e.width}</div>
              </div>
              <div className="surface p-2 rounded-lg">
                <div className="text-[10px] font-mono text-fg-dim">אורך</div>
                <div className="font-display font-bold text-sm text-accent">{e.length}</div>
              </div>
            </div>

            <p className="text-xs text-fg-muted leading-relaxed mb-2">{e.desc}</p>
            <div className="text-[11px] text-status-ok bg-status-ok/5 rounded-lg p-2 leading-relaxed">
              <strong className="text-fg">תוצאה:</strong> {e.success}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function BufferViz({ activeLayers }: { activeLayers: Set<Layer> }) {
  return (
    <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
      <svg viewBox="0 0 100 56" className="w-full h-full">
        <defs>
          <linearGradient id="buffer-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dde6f0" />
            <stop offset="100%" stopColor="#e6ebf2" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="56" fill="url(#buffer-bg)" />

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
            {/* Two parallel fence lines */}
            <line x1="55" y1="20" x2="55" y2="46" className="stroke-accent" strokeWidth="0.8" />
            {/* Fence posts */}
            {[20, 24, 28, 32, 36, 40, 44].map((y, i) => (
              <line key={i} x1="54.5" y1={y} x2="55.5" y2={y} className="stroke-accent" strokeWidth="0.4" />
            ))}
            {/* Sensors on fence */}
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
            {/* Radar tower */}
            <line x1="85" y1="32" x2="85" y2="40" className="stroke-fg" strokeWidth="0.5" />
            <ellipse cx="85" cy="30" rx="2.5" ry="1.4" className="fill-accent-hot stroke-accent-hot" strokeWidth="0.3" />
            
            {/* Radar coverage arc */}
            <path
              d="M 85 30 A 35 35 0 0 0 50 30 A 35 35 0 0 0 50 30 L 85 30"
              fill="none"
              className="stroke-accent-hot"
              strokeWidth="0.3"
              strokeDasharray="1 0.7"
              opacity="0.5"
            />
            {/* Wide cone of detection */}
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