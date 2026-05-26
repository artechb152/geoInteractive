'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { InsightCard } from '@/components/lesson/InsightCard';
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
    label: 'רכב גלגלי (על גלגלים)',
    english: 'Wheeled',
    example: `לדוגמה: משאית, ג'יפ סיור, האמר`,
    maxSlope: 30,
    icon: 'truck',
  },
  tracked: {
    id: 'tracked',
    label: 'רכב זחלי (עם שרשראות)',
    english: 'Tracked',
    example: 'לדוגמה: טנק, נגמ"ש (רכב משוריין), או דחפור D9',
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
    label: 'אדמה סלעית קשה',
    english: 'למשל: סלעי גיר, דולומיט או בזלת',
    icon: 'mountain',
    color: 'text-terrain-ridge',
    bg: 'bg-terrain-ridge/10',
    border: 'border-terrain-ridge/40',
    desc: 'קרקע חזקה ויציבה שיוצרת נוף תלול ומחוספס. תמצאו בה מצוקים, "מדרגות" אבן טבעיות, ו"טרשים" (סלעים חדים שבולטים מהאדמה).',
    effect: 'היתרון: האדמה יציבה ולכן רכבים לא ישקעו בה. החיסרון: סלעים חדים עלולים לקרוע צמיגים ואפילו שרשראות של טנקים, ומצוקים גבוהים פשוט יחסמו לכם את הדרך.',
    tip: 'באזורים שמלאים בסלעים בולטים, מומלץ לנוע רק ברגל. רכבים יצטרכו לחפש מסלול עוקף, או לחכות שדחפורים של חיל ההנדסה יפנו להם את הדרך.',
  },
  {
    id: 'soft',
    label: 'אדמה סלעית רכה',
    english: 'למשל: סלעי קירטון או אדמת חרסית',
    icon: 'layers',
    color: 'text-terrain-sand',
    bg: 'bg-terrain-sand/15',
    border: 'border-terrain-sand/40',
    desc: 'סלע חלש שמתפורר בקלות ויוצר נוף של גבעות עגולות ומתונות. קל מאוד לחפור בו ולשנות אותו, ולכן הרבה פעמים תראו באזורים האלה "טראסות" (מדרגות חקלאיות שנחצבו בהר).',
    effect: 'שטח שנוח מאוד למעבר. האדמה הרכה מאפשרת לפלס דרכים בקלות, לחפור עמדות מסתור מתחת לאדמה ולבנות חומות עפר להגנה.',
    tip: 'גן עדן לחיל ההנדסה: בולדוזרים (דחפורים כבדים) יכולים פשוט "לחתוך" את הגבעות ולפרוץ מסלולי נסיעה חדשים לגמרי תוך שעות בודדות.',
  },
  {
    id: 'sand',
    label: 'חול ודיונות',
    english: 'Sand & Dunes',
    icon: 'wave',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/40',
    desc: 'חול יבש גורם לגלגלים להחליק, "לפרפר" במקום ולאבד אחיזה. חול רטוב ליד הים מסוכן אפילו יותר – ברגע שתעצרו עליו עם רכב, הוא עלול לשקוע פנימה מיד.',
    effect: 'רכבים רגילים פשוט ישקעו כאן. טנקים יצליחו לעבור, אבל כל עצירה מסכנת אותם. הטיפ לנהיגת טנק על חוף הים: סעו כך שזחל (שרשרת) אחד יהיה בתוך המים והשני על החול הרטוב, כדי לאזן ולמנוע שקיעה.',
    tip: 'החוק הכי חשוב: לא לעצור לרגע! חייבים לשמור על נסיעה רציפה. לפני שנכנסים לשטח כזה, חובה לבדוק במפות מיוחדות איפה החול ספוג במים ואיפה בטוח לנסוע.',
  },
  {
    id: 'mud',
    label: 'אדמה בוצית / אדמת לס',
    english: 'Saturated / Loess',
    icon: 'fuel',
    color: 'text-status-warn',
    bg: 'bg-status-warn/10',
    border: 'border-status-warn/40',
    desc: 'אדמה שספגה המון מים (אחרי גשם חזק). היא הופכת לחלשה ולא מסוגלת להחזיק עליה משקל. רכבים משוריינים כבדים (רק"ם), משאיות ותותחים פשוט ירסקו אותה וישקעו עמוק בבוץ.',
    effect: 'אחרי גשם, שביל עפר שהיה נוח אתמול הופך למלכודת טובענית. טנקים שוקעים, גלגלים מסתחררים ומפרפרים במקום, ומשאיות האספקה פשוט נתקעות הרחק מאחור.',
    tip: 'ההמלצה: חובה לחכות יום-יומיים אחרי סערה כדי שהאדמה תתייבש קצת, לפני שמכניסים אליה רכבים כבדים. אם המשימה דחופה, חייבים למצוא מסלול חלופי שעובר על כביש סלול או על אדמה סלעית קשה.',
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
        eyebrow="האם אפשר לעבור פה? (עבירות וניידות)"
        title={
          <>
            <span className="gradient-text">30% או 60%</span>? המספרים שעושים את ההבדל
          </>
        }
        intro='היכולת שלנו לעבור בשטח היא לא עניין של "תחושת בטן", אלא חישוב מתמטי פשוט. שני נתונים יקבעו אם הרכב יעבור או ייתקע: כמה העלייה תלולה (השיפוע), ועד כמה האדמה יציבה. טעות קטנה בחישוב, והרכב שלכם פשוט לא יצליח לחזור.'
      />

      <div className="mb-6">
        <InsightCard tone="cool" icon="spark" label="כמה מושגים שחובה להכיר">
          <ul className="space-y-2">
            <li>· <strong className="text-fg">עבִירוּת הקרקע (Trafficability)</strong> — היכולת של האדמה לשאת משקל של כלי רכב כבד מבלי לקרוס, להתפורר או לשקוע בתוכה.</li>
            <li>· <strong className="text-fg">מדרון פנים ושיפוע צד</strong> — "מדרון פנים" אומר שהרכב מטפס ישר בעלייה או בירידה, שזה המצב הבטוח יחסית. לעומת זאת, נסיעה באלכסון על הצלע של ההר נקראת "שיפוע צד", והיא מסוכנת מאוד כי הרכב עלול בקלות לאבד שיווי משקל ולהתהפך לתהום.</li>
            <li>· <strong className="text-fg">לחץ סגולי (הלחץ על האדמה)</strong> — איך המשקל של הרכב מתפזר על הקרקע. תחשבו על הליכה בבוץ עם עקבים לעומת מגפי גומי רחבים. ככל שהגלגלים או השרשראות ("זחלים") של הרכב רחבים יותר, המשקל מתפזר על שטח גדול יותר, והלחץ יורד. בגלל זה לטנק יש פחות סיכוי לשקוע מאשר לג'יפ רגיל.</li>
          </ul>
        </InsightCard>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-stretch mb-10">
        {/* Visualization */}
        <div className="surface-elevated p-5 rounded-2xl overflow-hidden flex flex-col">
          <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">
            הדמיה: איך יתמודד {meta.label} בעלייה של {slope}%?
          </div>
          <div className="flex-1 min-h-[260px]">
            <VehicleOnSlope slope={slope} vehicle={vehicle} status={status} />
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Vehicle selector */}
          <div className="surface-elevated p-5">
            <div className="text-sm font-display font-semibold text-fg-muted mb-3 tracking-wider">
              באיזה רכב אנחנו נוסעים?
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
                        ? 'border-accent bg-accent/5'
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
                      שיפוע מקסימלי: כ-{v.maxSlope}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slope slider */}
          <div className="surface-elevated p-5">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">רמת השיפוע (עד כמה תלול?)</div>
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
                      <strong className="text-status-ok">בטוח לנסיעה.</strong>{' '}
                      תנועה אפשרית אבל עם איבוד אחיזה. הימנע משיפוע צד והאט.
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

      <SoftDivider text="סוג האדמה — החצי השני של המשוואה" />

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
                isActive ? `${s.border} ${s.bg}` : 'hover:border-border-strong'
              )}
            >
              <Icon name={s.icon} size={32} className={cn('mb-3', s.color)} />
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
            className="mb-10"
          >
            <div className="grid md:grid-cols-3 gap-3">
              <InsightCard tone="cool" label="במילים פשוטות">
                {s.desc}
              </InsightCard>
              <InsightCard tone="warn" label="איך זה ישפיע על הנסיעה?">
                {s.effect}
              </InsightCard>
              <InsightCard tone="accent" label="תכל'ס, מה עושים בשטח?">
                {s.tip}
              </InsightCard>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Maneuver corridor concept */}
      <InsightCard
        tone="accent"
        icon="compass"
        label="מסדרון תמרון (המסלול המושלם)"
        title="המסלול המהיר שמאפשר לצבא שלם לדהור קדימה"
      >
        כשמחברים את שני המדדים שלמדנו (גם העליות מתונות וגם האדמה יציבה) – אפשר למצוא ולשרטט במפה את ה<strong className="text-fg">"מסדרון"</strong>.
        מדובר בנתיב ארוך ונוח, נקי ממכשולים, שדרכו אפשר להעביר כוח צבאי ענק (כמו אוגדה שלמה עם מאות רכבים) מבלי שהם יצטרכו להתפצל לצוותים קטנים או להתעכב בדרך. היתרון הגדול הוא שכל הכלים נשארים ביחד, וככה הם יכולים לאבטח אחד את השני מכל הכיוונים (הגנה של 360 מעלות).
        כשמפקדים מתכננים את המסלול הזה, הם בודקים 3 שאלות קריטיות: רוחב (האם כל כמות הרכבים שלנו תצליח לעבור שם יחד?), אורך (האם הוא מביא אותנו מספיק עמוק אל היעד?), ורציפות (האם יש פתאום איזה נהר או צוק שתוקע אותנו באמצע הדרך?).
      </InsightCard>
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
    <div className="relative w-full h-full min-h-[260px]">
      <svg viewBox="0 0 100 75" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
        {/* Sky */}
        <rect x="0" y="0" width="100" height="75" className="fill-bg-elevated" />

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
          className="fill-accent font-display font-bold font-bold"
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
            'font-display font-bold font-bold',
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
          {status === 'ok' ? 'בטוח' : status === 'caution' ? 'סכנת החלקה' : 'אין מעבר'}
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
      <span className="text-sm font-display font-semibold text-fg-muted tracking-wider">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
