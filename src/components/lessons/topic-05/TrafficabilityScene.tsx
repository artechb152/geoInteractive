'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Vehicle = 'wheeled' | 'tracked';

type VehicleMeta = {
  id: Vehicle;
  label: string;
  english: string;
  example: string;
  maxSlope: number; // percent
  icon: IconName;
};

const VEHICLES: Record<Vehicle, VehicleMeta> = {
  wheeled: {
    id: 'wheeled',
    label: 'כלי גלגלי',
    english: 'Wheeled',
    example: 'משאית, רכב סיור, האמר',
    maxSlope: 30,
    icon: 'truck',
  },
  tracked: {
    id: 'tracked',
    label: 'כלי זחלילי',
    english: 'Tracked',
    example: 'טנק מערכה, נגמ"ש, ד"כ',
    maxSlope: 60,
    icon: 'tank',
  },
};

type SoilType = {
  id: string;
  label: string;
  english: string;
  icon: IconName;
  color: string;
  bg: string;
  border: string;
  desc: string;
  effect: string;
  tip: string;
};

const SOILS: SoilType[] = [
  {
    id: 'hard',
    label: 'מסלע קשה',
    english: 'גיר / דולומיט / בזלת',
    icon: 'mountain',
    color: 'text-terrain-ridge',
    bg: 'bg-terrain-ridge/10',
    border: 'border-terrain-ridge/40',
    desc: 'סלע יציב וקשה שיוצר נוף תלול ומחוספס: מצוקים, מדרגות סלע, טרשים בולטים.',
    effect: 'יציבות מצוינת — לא שוקעים. אבל טרשים קורעים צמיגים וזחלים, ומצוקים חוסמים תנועה מלאה.',
    tip: 'באזורים טרשיים — תנועה רגלית בלבד. כלי רכב חייבים לעקוף או לעשות פריצה הנדסית.',
  },
  {
    id: 'soft',
    label: 'מסלע רך',
    english: 'קרטון / חרסית',
    icon: 'layers',
    color: 'text-terrain-sand',
    bg: 'bg-terrain-sand/15',
    border: 'border-terrain-sand/40',
    desc: 'סלע פריך שמייצר נוף מעוגל וגבעי. ניתן לעיבוד הנדסי קל. טראסות מדרוניות נפוצות.',
    effect: 'עבירות טובה — קל לפלס דרכים, לחפור עמדות, לבנות סוללות.',
    tip: 'אידיאלי לקידום ניידות הנדסי: בולדוזרים יכולים לחתוך מסלולים חדשים תוך שעות.',
  },
  {
    id: 'sand',
    label: 'חול ודיונות',
    english: 'Sand & Dunes',
    icon: 'wave',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/40',
    desc: 'חול יבש פזיר, מאבד אחיזה. חול רטוב סמוך לקו המים — סיכון שקיעה חמור בעצירה.',
    effect: 'גלגלים שוקעים. זחלילים מתפקדים, אבל עוצרים = חוזרים לאט. בעצירה במים: זחל אחד במים, אחד על חול רטוב.',
    tip: 'תנועה רציפה היא הכלל. עצירה בחול רטוב = שקיעה. הסתמכו על מפת רוויה לפני התקדמות.',
  },
  {
    id: 'mud',
    label: 'קרקע רוויה / לס',
    english: 'Saturated / Loess',
    icon: 'fuel',
    color: 'text-status-warn',
    bg: 'bg-status-warn/10',
    border: 'border-status-warn/40',
    desc: 'קרקע ספוגה במים אחרי סערה. הלחץ הסגולי שלה נמוך. רק"ם, משאיות ותותחים יכולים להתפורר אותה.',
    effect: 'אחרי גשם — דרך עפר שעבדה אתמול נחסמת היום. הזחלים שוקעים, הגלגלים מתפוצצים, האספקה תקועה.',
    tip: 'לחכות 24–48 שעות אחרי גשם לפני מבצע משוריין רחב. או — לתכנן ציר חלופי על תשתית קשיחה.',
  },
];

export function TrafficabilityScene() {
  const [vehicle, setVehicle] = useState<Vehicle>('wheeled');
  const [slope, setSlope] = useState(15);
  const [activeSoil, setActiveSoil] = useState<string>(SOILS[0].id);

  const meta = VEHICLES[vehicle];
  const max = meta.maxSlope;
  const ratio = slope / max;
  const status: 'ok' | 'caution' | 'fail' =
    ratio < 0.75 ? 'ok' : ratio < 1 ? 'caution' : 'fail';

  const slopeDegrees = (Math.atan(slope / 100) * 180) / Math.PI;

  return (
    <section id="scene-trafficability" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="05.1"
        eyebrow="עבירות וניידות"
        title={
          <>
            <span className="gradient-text">30% או 60%</span>? ההבדל בין משימה לאסון
          </>
        }
        intro="עבירות היא לא תחושה — היא מתמטיקה. שני מספרים מגדירים את החיים שלך בשטח: השיפוע (כמה תלול) וסוג הקרקע (כמה מחזיקה). מספר שגוי = כלי שלא חוזר."
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">מילון מהיר:</strong>
            <ul className="mt-2 space-y-1 text-fg-muted">
              <li>· <strong className="text-fg">עבירות (Trafficability)</strong> — היכולת הפיזית של מסת קרקע לתמוך במעבר רכב תחת לחץ סגולי נתון.</li>
              <li>· <strong className="text-fg">מדרון פנים</strong> — טיפוס במעלה השיפוע (קדימה). שיפוע צד = תנועה באלכסון = סכנת התהפכות.</li>
              <li>· <strong className="text-fg">לחץ סגולי</strong> — משקל הכלי חלקי שטח המגע שלו עם הקרקע. זחל גדול = פחות לחץ סגולי = פחות שקיעה.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-stretch mb-10">
        {/* Visualization */}
        <div className="surface-elevated p-5 rounded-2xl overflow-hidden">
          <div className="text-[10px] font-mono text-fg-dim tracking-widest uppercase mb-3">
            הדמיה · {meta.label} על שיפוע של {slope}%
          </div>
          <VehicleOnSlope slope={slope} vehicle={vehicle} status={status} />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Vehicle selector */}
          <div className="surface-elevated p-5">
            <div className="text-xs font-mono text-fg-dim mb-3 tracking-widest uppercase">
              סוג הכלי
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.values(VEHICLES)).map((v) => {
                const isActive = vehicle === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setVehicle(v.id)}
                    className={cn(
                      'p-3 rounded-xl border-2 text-right transition-all',
                      isActive
                        ? 'border-accent bg-accent/5 shadow-glow'
                        : 'border-border hover:border-border-strong'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name={v.icon} size={18} className={isActive ? 'text-accent' : 'text-fg-dim'} />
                      <div className={cn('font-display font-bold text-sm', isActive && 'text-accent')}>
                        {v.label}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-fg-dim">{v.english}</div>
                    <div className="text-xs text-fg-muted mt-1.5 leading-snug">{v.example}</div>
                    <div className={cn('mt-2 text-[10px] font-mono', isActive ? 'text-accent' : 'text-fg-dim')}>
                      גבול: ~{v.maxSlope}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slope slider */}
          <div className="surface-elevated p-5">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-xs font-mono text-fg-dim tracking-widest uppercase">שיפוע</div>
              <div className="text-[10px] font-mono text-fg-dim">≈ {slopeDegrees.toFixed(1)}°</div>
            </div>
            <div className="font-display font-bold text-4xl tabular-nums text-accent mb-3">
              {slope}<span className="text-xl text-fg-muted">%</span>
            </div>
            <input
              type="range"
              min={0}
              max={80}
              step={1}
              value={slope}
              onChange={(e) => setSlope(Number(e.target.value))}
              className="w-full accent-accent"
              aria-label="שיפוע באחוזים"
            />
            <div className="flex justify-between text-[10px] font-mono text-fg-dim mt-1">
              <span>0%</span>
              <span>30%</span>
              <span>60%</span>
              <span>80%</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={status}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'mt-4 p-3 rounded-xl border-2 flex items-start gap-2.5',
                  status === 'ok' && 'border-status-ok/40 bg-status-ok/5',
                  status === 'caution' && 'border-status-warn/40 bg-status-warn/5',
                  status === 'fail' && 'border-status-danger/40 bg-status-danger/5'
                )}
              >
                <Icon
                  name={status === 'ok' ? 'check' : status === 'caution' ? 'spark' : 'shield'}
                  size={16}
                  strokeWidth={2.5}
                  className={cn(
                    'shrink-0 mt-0.5',
                    status === 'ok' && 'text-status-ok',
                    status === 'caution' && 'text-status-warn',
                    status === 'fail' && 'text-status-danger'
                  )}
                />
                <div className="text-xs leading-relaxed">
                  {status === 'ok' && (
                    <>
                      <strong className="text-status-ok">בטוח לתנועה.</strong>{' '}
                      השיפוע נמצא בתוך מעטפת היכולת של הכלי. תנועה רציפה אפשרית.
                    </>
                  )}
                  {status === 'caution' && (
                    <>
                      <strong className="text-status-warn">קרוב לגבול.</strong>{' '}
                      תנועה אפשרית אבל עם איבוד אחיזה. הימנע משיפוע צד והאט.
                    </>
                  )}
                  {status === 'fail' && (
                    <>
                      <strong className="text-status-danger">לא עביר.</strong>{' '}
                      מעל הגבול של {max}%. הכלי יחליק, יתהפך או יתקע. חפש מסלול חלופי או הנדסה.
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <SoftDivider text="טיב הקרקע — הגורם השני בעבירות" />

      {/* Soil types */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        {SOILS.map((s) => {
          const isActive = activeSoil === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSoil(s.id)}
              className={cn(
                'surface p-4 text-right transition-all rounded-xl flex flex-col items-start',
                isActive ? `${s.border} shadow-glow ${s.bg}` : 'hover:border-border-strong'
              )}
            >
              <div className={cn('size-10 rounded-xl flex items-center justify-center mb-3 border-2', s.border, s.bg)}>
                <Icon name={s.icon} size={20} className={s.color} />
              </div>
              <div className={cn('font-display font-bold leading-tight', isActive && s.color)}>
                {s.label}
              </div>
              <div className="text-[10px] font-mono text-fg-dim mt-0.5">{s.english}</div>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {SOILS.filter((s) => s.id === activeSoil).map((s) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className={cn('surface-elevated p-6 rounded-2xl border-r-4 mb-10', s.border.replace('border-', 'border-r-'))}
          >
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <div className={cn('text-[10px] font-mono mb-1.5 tracking-widest uppercase', s.color)}>
                  מה זה בעצם
                </div>
                <p className="text-sm text-fg leading-relaxed">{s.desc}</p>
              </div>
              <div>
                <div className="text-[10px] font-mono text-fg-dim mb-1.5 tracking-widest uppercase">
                  השפעה על תנועה
                </div>
                <p className="text-sm text-fg-muted leading-relaxed">{s.effect}</p>
              </div>
              <div>
                <div className="text-[10px] font-mono text-accent mb-1.5 tracking-widest uppercase">
                  טיפ מבצעי
                </div>
                <p className="text-sm text-fg leading-relaxed">{s.tip}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Maneuver corridor concept */}
      <div className="surface-elevated p-6 rounded-2xl border-r-4 border-r-accent">
        <div className="flex gap-4 items-start">
          <div className="size-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center shrink-0">
            <Icon name="compass" size={22} className="text-accent" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-mono text-accent mb-1 tracking-widest uppercase">
              מסדרון תמרון (Mobility Corridor)
            </div>
            <h3 className="font-display font-bold text-lg mb-2 leading-tight">
              נתיב רציף שמאפשר לאוגדה לזוז במלוא עוצמתה
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed text-pretty">
              כשמשרשרים יחד שני המדדים — שיפוע + טיב קרקע — מקבלים את ה<strong className="text-fg">מסדרון</strong>:
              נתיב ארוך נטול מכשולים שמאפשר תנועה מסונכרנת של כוח גדול (גדוד-אוגדה) ב<strong className="text-fg">היווצרות הגנה רב-כיוונית</strong>
              {' '}— בלי להתפצל ובלי להתעכב. למתכנן יש 3 שאלות: רוחב המסדרון (האם סד"כ נכנס?), אורכו (האם מגיע לעומק?), ושלמותו (יש מכשולים באמצע?).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function VehicleOnSlope({ slope, vehicle, status }: { slope: number; vehicle: Vehicle; status: 'ok' | 'caution' | 'fail' }) {
  // Convert slope% to visual angle for the SVG (cap visual rise to avoid going off-canvas)
  const visualSlope = Math.min(slope, 80);
  const groundEndY = 65 - (visualSlope / 80) * 40; // 25 at max
  const tilt = Math.atan(visualSlope / 100) * (180 / Math.PI);
  const vehicleX = 60;
  const vehicleY = 65 - ((vehicleX - 10) / 80) * (65 - groundEndY);

  const statusColor =
    status === 'ok' ? 'fill-status-ok stroke-status-ok' : status === 'caution' ? 'fill-status-warn stroke-status-warn' : 'fill-status-danger stroke-status-danger';

  return (
    <div className="aspect-[16/9] relative">
      <svg viewBox="0 0 100 75" className="w-full h-full">
        <defs>
          <linearGradient id="sky-tr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eef2f7" />
            <stop offset="100%" stopColor="#f7f9fc" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="100" height="75" fill="url(#sky-tr)" />

        {/* Slope plane */}
        <polygon
          points={`0,65 10,65 90,${groundEndY} 100,${groundEndY} 100,75 0,75`}
          className="fill-terrain-sand/30 stroke-terrain-ridge"
          strokeWidth="0.3"
        />

        {/* Reference horizontal line */}
        <line x1="10" y1="65" x2="95" y2="65" className="stroke-fg-dim" strokeWidth="0.15" strokeDasharray="1 0.6" opacity="0.4" />

        {/* Angle marker */}
        <path
          d={`M 30 65 A 12 12 0 0 0 ${30 + 12 * Math.cos(((-tilt) * Math.PI) / 180)} ${65 + 12 * Math.sin(((-tilt) * Math.PI) / 180)}`}
          fill="none"
          className="stroke-accent"
          strokeWidth="0.3"
        />
        <text
          x="22"
          y="62"
          textAnchor="middle"
          className="fill-accent font-mono font-bold"
          fontSize="3.2"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinejoin="round"
        >
          {tilt.toFixed(0)}°
        </text>

        {/* Vehicle */}
        <g transform={`translate(${vehicleX} ${vehicleY}) rotate(${-tilt})`}>
          {vehicle === 'wheeled' ? <WheeledIcon failing={status === 'fail'} /> : <TrackedIcon failing={status === 'fail'} />}
        </g>

        {/* Status indicator */}
        <g>
          <circle cx="88" cy="10" r="3.5" className={statusColor} opacity="0.25" />
          <circle cx="88" cy="10" r="1.8" className={statusColor} />
        </g>
        <text
          x="88"
          y="18"
          textAnchor="middle"
          className={cn(
            'font-mono font-bold',
            status === 'ok' && 'fill-status-ok',
            status === 'caution' && 'fill-status-warn',
            status === 'fail' && 'fill-status-danger'
          )}
          fontSize="3"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinejoin="round"
        >
          {status === 'ok' ? 'בטוח' : status === 'caution' ? 'גבולי' : 'לא עביר'}
        </text>
      </svg>
    </div>
  );
}

function WheeledIcon({ failing }: { failing: boolean }) {
  return (
    <g className={failing ? 'text-status-danger' : 'text-fg'}>
      {/* Body */}
      <rect x="-7" y="-7" width="14" height="5" rx="0.6" className="fill-current" opacity="0.85" />
      <rect x="-4" y="-9" width="8" height="2.5" rx="0.4" className="fill-current" opacity="0.95" />
      {/* Wheels */}
      <circle cx="-4.5" cy="-1.8" r="1.6" className="fill-current" />
      <circle cx="4.5" cy="-1.8" r="1.6" className="fill-current" />
    </g>
  );
}

function TrackedIcon({ failing }: { failing: boolean }) {
  return (
    <g className={failing ? 'text-status-danger' : 'text-fg'}>
      {/* Body */}
      <rect x="-8" y="-7" width="16" height="5" rx="0.5" className="fill-current" opacity="0.85" />
      {/* Turret */}
      <rect x="-3" y="-9" width="6" height="2.5" rx="0.4" className="fill-current" opacity="0.95" />
      <rect x="2" y="-8.6" width="5" height="0.6" className="fill-current" opacity="0.95" />
      {/* Track */}
      <rect x="-8.5" y="-2.5" width="17" height="2.4" rx="1.2" className="fill-current" opacity="0.95" />
      {[-7, -4, -1, 2, 5].map((x, i) => (
        <circle key={i} cx={x} cy="-1.3" r="0.6" className="fill-current" opacity="0.4" />
      ))}
    </g>
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
