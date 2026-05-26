'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Spot = 'valley' | 'ridge';

type SpotData = {
  id: Spot;
  label: string;
  temp: string;
  humidity: string;
  visibility: string;
  ops: string;
  color: string;
  bg: string;
  border: string;
};

const SPOTS: SpotData[] = [
  {
    id: 'valley',
    label: 'עמק צר (06:00)',
    temp: '12°C',
    humidity: '95%',
    visibility: '< 500 מ׳ — ערפל כבד',
    ops: 'משקפות ומצלמות רגילות לא רואות כלום. מצלמות חום (IR) מתקשות לתפקד בגלל אדי המים. רחפנים ולוויינים לא מצליחים לראות דרך הענן, ואי אפשר לסמן מטרות בלייזר.',
    color: 'text-fg-dim',
    bg: 'bg-bg-card',
    border: 'border-fg-dim/40',
  },
  {
    id: 'ridge',
    label: 'רכס פתוח (06:00)',
    temp: '14°C',
    humidity: '40%',
    visibility: '20+ ק"מ — ראות חלקה',
    ops: 'כל האמצעים עובדים מעולה: מכ"ם, לייזר ומצלמות חום. תצפיות מהאוויר ומהחלל רואות הכל בבירור. זהו מיקום מושלם לתצפית ולצלפים (ירי לטווח ארוך).',
    color: 'text-accent-cool',
    bg: 'bg-accent-cool/10',
    border: 'border-accent-cool/40',
  },
];

// Simplified physiological strain calculator
function calculateStrain(tempC: number, humidity: number, windKmh: number) {
  if (tempC >= 18) {
    // Heat side
    const heatBase = (tempC - 18) * (1 + humidity / 100);
    const windCooling = Math.min(6, windKmh / 6);
    const score = heatBase - windCooling;
    return { score, mode: 'heat' as const };
  } else {
    // Cold side
    const coldBase = 18 - tempC;
    const windPenalty = Math.sqrt(Math.max(0, windKmh)) * 1.4;
    const score = coldBase + windPenalty;
    return { score: -score, mode: 'cold' as const };
  }
}

function classifyStrain(score: number, mode: 'heat' | 'cold') {
  const abs = Math.abs(score);
  if (abs < 6) return 'safe' as const;
  if (abs < 14) return 'caution' as const;
  if (abs < 22) return 'high' as const;
  return 'critical' as const;
}

function waterPerHour(score: number, mode: 'heat' | 'cold') {
  if (mode === 'cold') return 0.4; // baseline
  // Heat: scales with strain
  return Math.min(1.5, 0.5 + score * 0.04);
}

export function ClimateScene() {
  const [temp, setTemp] = useState(32);
  const [humidity, setHumidity] = useState(60);
  const [wind, setWind] = useState(8);

  const [activeSpot, setActiveSpot] = useState<Spot>('valley');

  const strain = calculateStrain(temp, humidity, wind);
  const status = classifyStrain(strain.score, strain.mode);
  const water = waterPerHour(Math.abs(strain.score), strain.mode);

  const statusColors = {
    safe: { color: 'text-status-ok', bg: 'bg-status-ok/10', border: 'border-status-ok/40', label: 'מצב תקין' },
    caution: { color: 'text-status-warn', bg: 'bg-status-warn/10', border: 'border-status-warn/40', label: 'דרושה זהירות' },
    high: { color: 'text-accent-hot', bg: 'bg-accent-hot/10', border: 'border-accent-hot/40', label: 'עומס גבוה' },
    critical: { color: 'text-status-danger', bg: 'bg-status-danger/10', border: 'border-status-danger/40', label: 'מצב קריטי!' },
  };

  const s = statusColors[status];

  const recommendations = (() => {
    if (status === 'safe') return ['אפשר לקיים פעילות רגילה.', 'שתייה: בקבוק מים כל כמה שעות.'];
    if (strain.mode === 'heat') {
      if (status === 'caution') return [`הנחיית שתייה: ~${water.toFixed(1)} ליטר בשעה.`, 'עצירת שתייה מרוכזת כל שעה.', 'להימנע ממאמץ פיזי קשה בשיא החום.'];
      if (status === 'high') return [`הנחיית שתייה: ~${water.toFixed(1)} ליטר בשעה.`, 'עצירת שתייה מרוכזת כל חצי שעה.', 'סכנה אמיתית למכת חום במאמץ (כמו מסע אלונקות). חובה להכין רכב פינוי.'];
      return [`הנחיית שתייה: ~${water.toFixed(1)} ליטר בשעה.`, 'לבטל כל פעילות שאינה דחופה וקריטית.', 'סכנה מיידית למכות חום, חובש חייב להיות צמוד.', 'החום פוגע בשיקול הדעת — מפקדים עייפים חייבים מנוחה.'];
    } else {
      if (status === 'caution') return ['בגדים רטובים מסוכנים עכשיו יותר מקור יבש.', 'הפסקות יזומות לחימום הגוף כל שעה.'];
      if (status === 'high') return ['סכנה למכת קור (היפותרמיה) ואיבוד תחושה באצבעות.', 'התנועה בשטח תהיה איטית משמעותית.', 'חובה להכין שמיכות מילוט וציוד רפואי לחימום.'];
      return ['סכנה לכוויות קור וקפיאת אצבעות תוך דקות.', 'יוצאים החוצה רק למשימות חירום חיוניות.', 'הקור משבש את המוח: כל החלטה של מפקד צריכה אישור נוסף.'];
    }
  })();

  return (
    <section id="scene-climate" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="07.1"
        eyebrow="מיקרו-אקלים (אקלים מקומי) ועומס על הגוף"
        title={
          <>
            <span className="text-accent-hover">קילומטר אחד</span>. שתי עונות.
          </>
        }
        intro="באותו אזור בדיוק ובאותה שעה — עמק צר והר סמוך יכולים להרגיש כמו שתי עונות שונות לגמרי. בנוסף, מזג האוויר משפיע פיזית על החיילים בכל אזור בצורה שונה. בואו נראה איך זה עובד במספרים. "
      />

      <div className="p-5 mb-6">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">מילון קצר לפני שמתחילים:</strong>
            <ul className="mt-2 space-y-1 text-fg-muted">
              <li>· <strong className="text-fg">מיקרו-אקלים (אקלים מקומי)</strong> — מצב שבו צורת השטח יוצרת מזג אוויר שונה באזור קטן. למשל: עמק שלוכד קור ולחות ויוצר ערפל, לעומת הר פתוח עם ראות מצוינת.</li>
              <li>· <strong className="text-fg">עומס חום/קור (WBGT)</strong> — מדד שמשקלל טמפרטורה, לחות, רוח וקרינת שמש. זהו המדד שקובע כמה מהר הגוף יתעייף, ולפיו הצבא מחליט אם מותר להתאמן או לצאת למבצע. </li>
              <li>· <strong className="text-fg">היפותרמיה (מכת קור)</strong> — ירידה מסוכנת של חום הגוף מתחת ל-35 מעלות. הסכנה הגדולה: היא פוגעת במוח וביכולת לקבל החלטות עוד לפני שהלוחם בכלל מבין שהוא בסכנה.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 1: Micro-climate side-by-side */}
      <div className="surface-elevated p-5 sm:p-6 rounded-2xl mb-12">
        <div className="text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider">
          אקלים מקומי · אותו אזור, שתי מציאויות
        </div>

        <MicroClimateViz active={activeSpot} />

        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          {SPOTS.map((spot) => {
            const isActive = activeSpot === spot.id;
            return (
              <button
                key={spot.id}
                onClick={() => setActiveSpot(spot.id)}
                className={cn(
                  'surface p-4 text-right transition-all rounded-xl flex flex-col gap-2',
                  isActive ? `${spot.border} ${spot.bg}` : 'hover:border-border-strong'
                )}
              >
                <div className={cn('font-display font-bold leading-tight', isActive && spot.color)}>
                  {spot.label}
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <div className="text-fg-dim">טמפ׳</div>
                    <div className="font-mono font-bold tabular-nums">{spot.temp}</div>
                  </div>
                  <div>
                    <div className="text-fg-dim">לחות</div>
                    <div className="font-mono font-bold tabular-nums">{spot.humidity}</div>
                  </div>
                  <div>
                    <div className="text-fg-dim">ראות</div>
                    <div className="font-mono font-bold">{spot.visibility.split(' ')[0]}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {SPOTS.filter((sp) => sp.id === activeSpot).map((sp) => (
            <motion.div
              key={sp.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className={cn('mt-3 p-3 rounded-xl border-2 text-xs leading-relaxed', sp.border, sp.bg)}
            >
              <strong className={cn('block mb-1', sp.color)}>איך זה משפיע בשטח:</strong>
              {sp.ops}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <SoftDivider text="עומס חום וקור — איך האקלים משפיע על גוף הלוחם" />

      {/* Section 2: Climatic load calculator */}
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-stretch mb-10">
        {/* Status visualization */}
        <div className="surface-elevated p-5 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
              מצב גופני (סטטוס)
            </div>
            <div className={cn('chip', s.border, s.bg, s.color)}>
              <Icon
                name={status === 'safe' ? 'check' : status === 'critical' ? 'spark' : 'shield'}
                size={12}
                strokeWidth={2.5}
              />
              <span className="font-mono font-bold">{s.label}</span>
            </div>
          </div>

          <PhysioGauge score={strain.score} mode={strain.mode} status={status} />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="surface p-3 rounded-lg">
              <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">מרגיש כמו</div>
              <div className="font-display font-bold text-2xl tabular-nums text-accent">
                {strain.mode === 'heat'
                  ? `${(temp + Math.max(0, strain.score)).toFixed(0)}°`
                  : `${(temp - Math.abs(strain.score) * 0.6).toFixed(0)}°`}
              </div>
              <div className="text-[10px] text-fg-dim mt-0.5">לעומת {temp}° בחוץ</div>
            </div>
            <div className="surface p-3 rounded-lg">
              <div className="text-sm font-display font-semibold text-fg-muted mb-1 tracking-wider">צריכת מים נדרשת</div>
              <div className="font-display font-bold text-2xl tabular-nums text-accent">
                {water.toFixed(1)}<span className="text-sm text-fg-muted"> ליטר לשעה</span>
              </div>
              <div className="text-[10px] text-fg-dim mt-0.5">
                {strain.mode === 'heat' ? 'מותאם להזעה' : 'צריכת בסיס + פעילות'}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.ul
              key={status}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mt-4 space-y-1.5"
            >
              {recommendations.map((r, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed">
                  <Icon
                    name={status === 'safe' ? 'check' : 'spark'}
                    size={12}
                    strokeWidth={2.5}
                    className={cn('shrink-0 mt-0.5', s.color)}
                  />
                  <span className="text-fg-muted">{r}</span>
                </li>
              ))}
            </motion.ul>
          </AnimatePresence>
        </div>

        {/* Sliders */}
        <div className="surface-elevated p-5 rounded-2xl space-y-4">
          <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
            מדדי מזג אוויר
          </div>
          <Slider
            label="טמפרטורת אוויר"
            value={temp}
            setValue={setTemp}
            min={-25}
            max={50}
            unit="°C"
            color={temp >= 18 ? 'text-accent-hot' : 'text-accent-cool'}
          />
          <Slider
            label="לחות יחסית"
            value={humidity}
            setValue={setHumidity}
            min={0}
            max={100}
            unit="%"
            color="text-accent"
          />
          <Slider
            label="מהירות רוח"
            value={wind}
            setValue={setWind}
            min={0}
            max={50}
            unit='קמ"ש'
            color="text-fg"
          />

          <div className="pt-3 border-t border-border-subtle text-xs text-fg-muted bg-bg-accent/20 rounded-lg p-3 leading-relaxed">
            <strong className="text-fg block mb-1">תנסו בעצמכם:</strong>
            הורידו את הטמפרטורה ל-10°C- והעלו את הרוח ל-30 קמ"ש. שימו לב איך הטמפרטורה ש"מרגישים" צונחת הרבה מתחת לזו האמיתית בגלל הרוח. לאפקט הזה קוראים ״אפקט מקרר הרוח״ (Wind Chill).
          </div>
        </div>
      </div>
    </section>
  );
}

function MicroClimateViz({ active }: { active: Spot }) {
  return (
    <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
      <svg viewBox="0 0 100 56" className="w-full h-full">
        <defs>
          <linearGradient id="mc-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dde6f0" />
            <stop offset="100%" stopColor="#f0f4f9" />
          </linearGradient>
          <radialGradient id="mc-fog" cx="50%" cy="80%" r="55%">
            <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="100" height="56" fill="url(#mc-sky)" />

        {/* Mountains forming valley */}
        <path d="M0 40 L18 18 L35 38 L48 45 L62 38 L78 22 L100 40 L100 56 L0 56 Z" className="fill-terrain-ridge/30 stroke-terrain-ridge/60" strokeWidth="0.3" />
        <path d="M30 38 L48 48 L62 38 L62 56 L30 56 Z" className="fill-terrain-sand/15" />

        {/* Fog in valley */}
        <ellipse cx="48" cy="48" rx="24" ry="7" fill="url(#mc-fog)" />
        <ellipse cx="38" cy="46" rx="12" ry="4" fill="url(#mc-fog)" opacity="0.6" />

        {/* Ridge marker */}
        <g>
          <circle cx="78" cy="22" r="1.8" className={cn(active === 'ridge' ? 'fill-accent-cool' : 'fill-fg-dim/60')} stroke="#ffffff" strokeWidth="0.4" />
          {active === 'ridge' && (
            <circle cx="78" cy="22" r="3.5" fill="none" className="stroke-accent-cool/50" strokeWidth="0.3">
              <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
            </circle>
          )}
          <text x="78" y="17" textAnchor="middle" className={cn(active === 'ridge' ? 'fill-accent-cool' : 'fill-fg-dim', 'font-display font-bold font-bold')} fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
            רכס פתוח · 14°
          </text>
          <text x="78" y="14" textAnchor="middle" className="fill-fg-dim font-sans" fontSize="2" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.7" strokeLinejoin="round">
            לחות 40% · ראות חלקה
          </text>
        </g>

        {/* Valley marker */}
        <g>
          <circle cx="48" cy="48" r="1.8" className={cn(active === 'valley' ? 'fill-accent-hot' : 'fill-fg-dim/60')} stroke="#ffffff" strokeWidth="0.4" />
          {active === 'valley' && (
            <circle cx="48" cy="48" r="3.5" fill="none" className="stroke-accent-hot/50" strokeWidth="0.3">
              <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
            </circle>
          )}
          <text x="48" y="54" textAnchor="middle" className={cn(active === 'valley' ? 'fill-accent-hot' : 'fill-fg-dim', 'font-display font-bold font-bold')} fontSize="2.6" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.85" strokeLinejoin="round">
            עמק (שטח נמוך) · 12°
          </text>
        </g>

        {/* Compass-like indicator */}
        <text x="50" y="9" textAnchor="middle" className="fill-fg-dim font-display font-bold" fontSize="2.4" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round">
          06:00 · עלות השחר
        </text>
      </svg>
    </div>
  );
}

function PhysioGauge({ score, mode, status }: { score: number; mode: 'heat' | 'cold'; status: 'safe' | 'caution' | 'high' | 'critical' }) {
  // Normalize score to -100..+100 for visualization
  const normalized = Math.max(-30, Math.min(30, score)) / 30; // -1..+1
  const angle = normalized * 75; // -75..+75 degrees

  const statusColor =
    status === 'safe' ? 'stroke-status-ok' :
    status === 'caution' ? 'stroke-status-warn' :
    status === 'high' ? 'stroke-accent-hot' :
    'stroke-status-danger';

  return (
    <div className="relative aspect-[2/1]">
      <svg viewBox="-50 -30 100 50" className="w-full h-full">
        {/* Cold zone arc */}
        <path
          d="M -40 0 A 40 40 0 0 1 -10 -38.7"
          fill="none"
          className="stroke-accent-cool/30"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Safe zone */}
        <path
          d="M -10 -38.7 A 40 40 0 0 1 10 -38.7"
          fill="none"
          className="stroke-status-ok/40"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Heat zone */}
        <path
          d="M 10 -38.7 A 40 40 0 0 1 40 0"
          fill="none"
          className="stroke-accent-hot/30"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Needle */}
        <motion.line
          x1="0"
          y1="0"
          x2="0"
          y2="-35"
          className={statusColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          animate={{ rotate: angle }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        />
        {/* Center */}
        <circle cx="0" cy="0" r="3" className="fill-bg-elevated stroke-fg" strokeWidth="0.5" />

        {/* Labels */}
        <text x="-39" y="6" textAnchor="middle" className="fill-accent-cool font-display font-bold" fontSize="3"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="0.9"
          strokeLinejoin="round"
        >קור</text>
        <text x="0" y="-43" textAnchor="middle" className="fill-status-ok font-display font-bold" fontSize="3"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="0.9"
          strokeLinejoin="round"
        >תקין</text>
        <text x="39" y="6" textAnchor="middle" className="fill-accent-hot font-display font-bold" fontSize="3"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="0.9"
          strokeLinejoin="round"
        >חום</text>
      </svg>

      <div className="absolute bottom-0 inset-x-0 text-center">
        <div className="font-mono text-[10px] text-fg-dim">
          ציון עומס: <span className="font-bold text-fg">{score.toFixed(0)}</span> · {mode === 'heat' ? 'עומס חום' : 'עומס קור'}
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  setValue,
  min,
  max,
  unit,
  color,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  unit: string;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-xs font-medium">{label}</div>
        <div className={cn('text-sm font-display font-bold tabular-nums', color)}>
          {value} <span className="text-[10px] text-fg-muted">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-accent"
        aria-label={label}
      />
      <div className="flex justify-between text-[10px] font-mono text-fg-dim mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
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