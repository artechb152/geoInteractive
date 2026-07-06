'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Weather = 'clear' | 'fog' | 'rain' | 'sandstorm' | 'snow';

type WeatherData = {
  id: Weather;
  label: string;
  english: string;
  icon: IconName;
  color: string;
  bg: string;
  border: string;
};

const WEATHER: WeatherData[] = [
  { id: 'clear', label: 'אוויר נקי', english: 'Clear', icon: 'star', color: 'text-status-ok', bg: 'bg-status-ok/10', border: 'border-status-ok/40' },
  { id: 'fog', label: 'ערפל', english: 'Fog', icon: 'wave', color: 'text-fg-dim', bg: 'bg-fg-dim/10', border: 'border-fg-dim/40' },
  { id: 'rain', label: 'גשם כבד', english: 'Heavy Rain', icon: 'wave', color: 'text-accent-cool', bg: 'bg-accent-cool/10', border: 'border-accent-cool/40' },
  { id: 'sandstorm', label: 'סופת חול', english: 'Sandstorm', icon: 'bolt', color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/40' },
  { id: 'snow', label: 'שלג / קרח', english: 'Snow', icon: 'spark', color: 'text-terrain-sky', bg: 'bg-terrain-sky/10', border: 'border-terrain-sky/40' },
];

type Sensor = {
  id: string;
  label: string;
  english: string;
  icon: IconName;
  // Effectiveness 0-100 per weather condition
  effect: Record<Weather, number>;
  notes: Record<Weather, string>;
};

const SENSORS: Sensor[] = [
  {
    id: 'optical',
    label: 'אופטי רגיל',
    english: 'Visible Light',
    icon: 'eye',
    effect: { clear: 95, fog: 15, rain: 45, sandstorm: 10, snow: 30 },
    notes: {
      clear: 'ראות מושלמת למרחק המקסימלי.',
      fog: 'אדי המים באוויר חוסמים את קרני האור, אי אפשר לראות מעבר ל-500 מטרים.',
      rain: 'מסך הטיפות מפריע לראייה והמטרות נראות מטושטשות לחלוטין.',
      sandstorm: 'גרגרי החול חוסמים את האור כמעט לגמרי - המצלמה עיוורת.',
      snow: 'השלג הלבן מחזיר אור ומסנוור. אפשר לזהות מטרות רק אם הן בצבע כהה שבולט על הרקע הלבן.',
    },
  },
  {
    id: 'ir',
    label: 'תרמי IR',
    english: 'Thermal Infrared',
    icon: 'bolt',
    effect: { clear: 90, fog: 35, rain: 30, sandstorm: 45, snow: 75 },
    notes: {
      clear: 'מעולה ליום וללילה. מטרות שפולטות חום (כמו כלי רכב ואנשים) פשוט זוהרות על המסך.',
      fog: 'אדי מים "בולעים" את חום המטרה בדרך למצלמה, והתמונה מיטשטשת מאוד.',
      rain: 'הגשם מקרר את המטרות ו"שוטף" את החום שלהן, קשה מאוד לזהות אותן.',
      sandstorm: 'גרגרי החול החמים באוויר מפריעים ומייצרים כתמי חום בתמונה, אבל זה עדיין עדיף על מצלמה רגילה.',
      snow: 'מושלם! הרקע הקפוא של השלג מבליט בצורה פסיכית מטרות חמות כמו מנוע של טנק.',
    },
  },
  {
    id: 'radar',
    label: 'מכ"ם (ראדאר)',
    english: 'Radar',
    icon: 'satellite',
    effect: { clear: 95, fog: 90, rain: 65, sandstorm: 75, snow: 80 },
    notes: {
      clear: 'המכ"ם עובד מעולה ומכסה טווחים ארוכים מאוד.',
      fog: 'גלי המכ"ם חותכים את הערפל בקלות. כאן יש לו יתרון עצום על פני מצלמות!',
      rain: 'גשם כבד במיוחד יכול לפזר חלק מגלי המכ"ם ולשבש מעט את הקריאה.',
      sandstorm: 'גלי המכ"ם חודרים את סופת החול בלי למצמץ. זה הכלי המנצח בתנאים האלו.',
      snow: 'חלקיקי קרח גדולים באוויר עלולים לבלבל את המכ"ם ולייצר "לכלוך" והתראות שווא במסך.',
    },
  },
  {
    id: 'laser',
    label: 'ציין לייזר',
    english: 'Laser Designator',
    icon: 'crosshair',
    effect: { clear: 95, fog: 25, rain: 40, sandstorm: 15, snow: 50 },
    notes: {
      clear: 'קרן הלייזר ננעלת "בול" על המטרה כדי להנחות אליה טילים מדויקים.',
      fog: 'הלייזר פוגע בטיפות הערפל ומתפזר לכל כיוון. אי אפשר להינעל על המטרה.',
      rain: 'הגשם מפריע לקרן, והיא עלולה לפגוע בטיפות באוויר במקום במטרה עצמה.',
      sandstorm: 'גרגרי החול שוברים ומפזרים את קרן הלייזר לחלוטין. הנשק הופך ללא מדויק.',
      snow: 'פתיתי שלג טריים שיורדים באוויר שוברים ומחזירים את קרן הלייזר.',
    },
  },
];

export function SensorsScene() {
  const [weather, setWeather] = useState<Weather>('clear');
  const [hour, setHour] = useState(14); // 0-24

  // Thermal Crossover: heat differential between tank and background
  // Tank stays around 25-35°C operational, background varies with sun
  const tankTemp = 30; // °C
  const ambient = 5 + 18 * Math.max(0, Math.sin(((hour - 6) / 24) * Math.PI * 2));
  // Background heated by sun, lags slightly
  const lag = Math.max(0, Math.sin(((hour - 8) / 24) * Math.PI * 2));
  const backgroundTemp = 8 + 16 * lag;

  const delta = Math.abs(tankTemp - backgroundTemp);
  const isCrossover = delta < 5;

  return (
    <section id="scene-sensors" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="07.2"
        eyebrow="בליעה אטמוספרית ו-Thermal Crossover"
title = {
  <>
    <span className="text-accent-hover">לא כל חיישן רואה</span> בכל מזג אוויר
  </>
}
        intro={`דמיינו שכל קרן או שידור שיוצאים מהמצלמות והמכ"מים שלנו צריכים לעבור מסלול מכשולים של מולקולות מים, אבק וגשם. כל חלקיק כזה מתפקד כמו חומה קטנה שחוסמת את הראות. שחקו עם תנאי מזג האוויר למטה ובדקו איזו טכנולוגיה שורדת באילו תנאים.`}
      />

      <div className="grid md:grid-cols-2 gap-4 mb-12 items-stretch">
        <div className="surface-elevated p-5 rounded-[4px]">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-accent mb-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            התופעה
          </div>
          <h3 className="font-display font-bold text-lg leading-tight text-accent-hover mb-2">
            בליעה אטמוספרית
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            חלקיקים באוויר — אדי מים, אבק או גשם — <strong className="text-fg">"בולעים"</strong>, שוברים או מפזרים את גלי השידור של המערכות שלנו. מצלמה שעבדה מושלם אתמול יכולה להיות עיוורת לחלוטין היום.
          </p>
        </div>
        <div className="surface-elevated p-5 rounded-[4px]">
          <div className="inline-flex items-center gap-2 text-sm font-display font-semibold tracking-wider text-accent mb-2">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            הביטוח
          </div>
          <h3 className="font-display font-bold text-lg leading-tight text-accent-hover mb-2">
            הצלבת חיישנים
          </h3>
          <p className="text-base text-fg leading-relaxed text-pretty">
            הצבא תמיד משתמש בכמה סוגי חיישנים <strong className="text-fg">יחד</strong> — אופטי, תרמי, מכ"ם ולייזר. כשאחד קורס בגלל מזג האוויר, השני מחפה עליו, וכך אף פעם לא נשארים עיוורים לחלוטין.
          </p>
        </div>
      </div>

      {/* Weather selector */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {WEATHER.map((w) => {
          const isActive = weather === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setWeather(w.id)}
              className={cn(
                'surface p-3 text-right transition-all rounded-[3px] flex items-center gap-2.5 relative overflow-hidden',
                isActive
                  ? 'border-accent bg-bg-elevated'
                  : 'border-border bg-bg-elevated hover:border-accent/50'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="t7-weather-bar"
                  className="absolute inset-y-0 end-0 w-1 bg-brand-dark rounded-l-full"
                />
              )}
              <span
                className={cn(
                  'size-10 rounded-[3px] flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
                  isActive
                    ? 'bg-accent text-bg-elevated border-accent'
                    : 'bg-bg-accent text-fg-muted border-border'
                )}
              >
                <Icon name={w.icon} size={18} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <div className="font-display font-bold text-base text-fg leading-tight">
                  {w.label}
                </div>
                <div className="font-display font-medium tracking-wide text-[10px] text-fg-dim mt-0.5">
                  {w.english}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sensor effectiveness chart */}
      <div className="surface-elevated p-5 rounded-[4px] mb-12">
        <div className="text-sm font-display font-semibold text-fg-muted mb-4 tracking-wider flex items-center justify-between flex-wrap gap-2">
          <span>יעילות החיישנים בתנאי {WEATHER.find((w) => w.id === weather)?.label}</span>
          <span className="text-[10px] text-fg-dim normal-case">% יעילות לעומת אוויר נקי</span>
        </div>

        <div className="space-y-3">
          {SENSORS.map((s) => {
            const pct = s.effect[weather];
            const barColor = pct >= 75 ? 'bg-status-ok' : pct >= 50 ? 'bg-status-warn' : pct >= 30 ? 'bg-accent-hot' : 'bg-status-danger';
            const labelColor = pct >= 75 ? 'text-status-ok' : pct >= 50 ? 'text-status-warn' : pct >= 30 ? 'text-accent-hot' : 'text-status-danger';

            return (
              <div key={s.id} className="surface p-3 rounded-[3px]">
                <div className="flex items-center gap-3 mb-2">
                  <Icon name={s.icon} size={26} className="text-fg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-sm leading-tight">{s.label}</div>
                    <div className="text-[10px] font-display font-medium tracking-wide text-fg-dim">{s.english}</div>
                  </div>
                  <div className={cn('font-display font-bold text-2xl tabular-nums', labelColor)}>
                    {pct}<span className="text-xs">%</span>
                  </div>
                </div>
                <div className="h-2 bg-bg-accent rounded-full overflow-hidden mb-2">
                  <motion.div
                    className={cn('h-full rounded-full', barColor)}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 18 }}
                  />
                </div>
                <p className="text-xs text-fg-muted leading-relaxed">{s.notes[weather]}</p>
              </div>
            );
          })}
        </div>
      </div>

      <SoftDivider text="היעלמות תרמית (Thermal Crossover) · כשהטנק נבלע ברקע" />

      {/* Thermal Crossover interactive */}
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-stretch mb-12">
        <div className="surface-elevated p-5 rounded-[4px]">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
              חתימה תרמית במהלך היממה · {hour.toString().padStart(2, '0')}:00
            </div>
            <div className={cn('chip', isCrossover ? 'border-status-danger/40 bg-status-danger/10 text-status-danger' : 'border-status-ok/40 bg-status-ok/10 text-status-ok')}>
              <Icon name={isCrossover ? 'spark' : 'check'} size={12} strokeWidth={2.5} />
              <span className="font-display font-medium tracking-wide">{isCrossover ? 'Crossover!' : 'IR פעיל'}</span>
            </div>
          </div>

          <ThermalViz tank={tankTemp} background={backgroundTemp} hour={hour} crossover={isCrossover} />

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] font-display font-medium tracking-wide text-accent-hot">טנק</div>
              <div className="font-display font-bold text-xl text-accent-hot tabular-nums">{tankTemp}°</div>
            </div>
            <div>
              <div className="text-[10px] font-display font-medium tracking-wide text-terrain-sky">רקע (אדמה)</div>
              <div className="font-display font-bold text-xl text-terrain-sky tabular-nums">{backgroundTemp.toFixed(1)}°</div>
            </div>
            <div>
              <div className="text-[10px] font-display font-medium tracking-wide text-fg-dim">הפרש (ΔT)</div>
              <div className={cn('font-display font-bold text-xl tabular-nums', isCrossover ? 'text-status-danger' : 'text-status-ok')}>
                {delta.toFixed(1)}°
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="surface-elevated p-5 rounded-[4px]">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">
              שעת היום
            </div>
            <input
              type="range"
              min={0}
              max={23}
              step={1}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="w-full accent-accent"
              aria-label="שעה"
            />
            <div className="flex justify-between text-[10px] font-display font-medium tracking-wide text-fg-dim mt-1">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
            <p className="text-[11px] text-fg-muted mt-3 leading-relaxed">
              שחקו עם השעות לאורך היממה. שימו לב שבשעות הבוקר המוקדמות ובערב, הטמפרטורה של הטנק קרובה מאוד לטמפרטורה של האדמה שסביבו. במצב כזה, המצלמה התרמית פשוט לא מסוגלת להבדיל ביניהם והטנק "נעלם" מהמסך! באזורים עם לחות גבוהה או לילות קרים, רגעי העיוורון האלו יכולים להימשך שעות.
            </p>
          </div>

          <div className="surface p-4 rounded-[3px] bg-status-danger/5">
            <div className="text-sm font-display font-semibold text-status-danger mb-1 tracking-wider">סיכון מבצעי</div>
            <div className="font-display font-bold mb-1.5 leading-tight">חלון 04:00-08:00</div>
            <p className="text-xs text-fg-muted leading-relaxed">
              אלו השעות שבהן האדמה עדיין קרה מהלילה, השמש טרם הספיקה לחמם אותה, וגם מנוע הטנק של האויב עדיין קר. מכיוון שהטנק והאדמה נמצאים בדיוק באותה טמפרטורה, מצלמות החום הופכות לחסרות תועלת. זהו <strong className="text-fg">חלון הזדמנויות אסטרטגי וקטלני</strong> לאויב, שיכול לנצל את ה"עיוורון" הזה כדי לנוע בשטח מבלי להתגלות.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ThermalViz({ tank, background, hour, crossover }: { tank: number; background: number; hour: number; crossover: boolean }) {
  // Map temps (5°..30°) to a 0..1 intensity. Low → "cool" tint, high → "hot" tint.
  // We layer two palette-token rects (accent-cool + accent-hot) per surface
  // and opacity-blend them, so all colour comes from the design system.
  const bgIntensity = Math.max(0, Math.min(1, (background - 5) / 25));
  const tankIntensity = Math.max(0, Math.min(1, (tank - 5) / 25));

  return (
    <div className="aspect-[16/9] relative rounded-[3px] overflow-hidden">
      <svg viewBox="0 0 100 56" className="w-full h-full">
        {/* Background heatmap — two stacked palette layers, opacity by intensity */}
        <rect x="0" y="0" width="100" height="56" className="fill-accent-cool" opacity={0.85 * (1 - bgIntensity)} />
        <rect x="0" y="0" width="100" height="56" className="fill-accent-hot" opacity={0.85 * bgIntensity} />

        {/* Noise pattern */}
        {Array.from({ length: 40 }).map((_, i) => {
          const x = (i * 13) % 100;
          const y = (i * 17) % 56;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1"
              className="fill-bg-elevated"
              opacity="0.08"
            />
          );
        })}

        {/* Ground / terrain hint */}
        <path d="M0 40 L25 36 L50 42 L75 38 L100 41 L100 56 L0 56 Z" className="fill-fg" opacity="0.1" />

        {/* Tank silhouette — same two-layer cool/hot blend on top of a base */}
        <g transform="translate(45 32)">
          {[
            { x: -8, y: -5, w: 16, h: 5, rx: 0.5 },
            { x: -3, y: -7.5, w: 6, h: 2.5, rx: 0.4 },
            { x: 2, y: -7, w: 5, h: 0.6, rx: 0 },
            { x: -9, y: -0.5, w: 18, h: 2.4, rx: 1 },
          ].map((r, i) => (
            <g key={i}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx} className="fill-accent-cool" opacity={0.95 * (1 - tankIntensity)} />
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx} className="fill-accent-hot" opacity={0.95 * tankIntensity} />
              {r.w > 0.6 && (
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx={r.rx}
                  fill="none"
                  className={crossover ? 'stroke-fg' : 'stroke-fg'}
                  strokeWidth="0.3"
                  opacity={crossover ? 0.2 : 0.4}
                />
              )}
            </g>
          ))}
        </g>

        {/* Crossover overlay */}
        {crossover && (
          <g>
            <rect x="0" y="0" width="100" height="56" className="fill-status-danger" opacity="0.08" />
            <text x="50" y="14" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="4.5" paintOrder="stroke" stroke="#ffffff" strokeWidth="1.4" strokeLinejoin="round">
              ⚠ Thermal Crossover
            </text>
            <text x="50" y="20" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
              הטנק "נעלם" מהמסך התרמי
            </text>
          </g>
        )}

        {/* Thermal-camera HUD timestamp — top-left OSD chip, drawn last so it
            stays crisp over the heatmap and the crossover wash. The old readout
            was a bare <text> at x=6 with the default text-anchor="start"; on the
            RTL page "start" resolves to the text's RIGHT edge, so the HH:00
            numerals flowed left, off the frame, and were clipped — only a
            "…:00" fragment peeked out at the border. Anchoring "middle" +
            direction="ltr" pins the numerals inside the frame. */}
        <g>
          <rect x="2.5" y="2.5" width="23" height="8" rx="1.6" className="fill-bg-elevated" opacity="0.9" />
          <rect x="2.5" y="2.5" width="23" height="8" rx="1.6" fill="none" className="stroke-accent" strokeWidth="0.3" opacity="0.5" />
          <circle cx="6.3" cy="6.5" r="1.1" className="fill-accent-hot" />
          <text
            x="16"
            y="7.6"
            textAnchor="middle"
            direction="ltr"
            className="fill-fg font-display font-bold"
            fontSize="3.4"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.7"
            strokeLinejoin="round"
          >
            {hour.toString().padStart(2, '0')}:00
          </text>
        </g>
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