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
 { id: 'snow', label: 'שלג / קרח', english: 'Snow', icon: 'shield', color: 'text-terrain-sky', bg: 'bg-terrain-sky/10', border: 'border-terrain-sky/40' },
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
clear: 'ראות מקסימלית. גילוי וזיהוי בטווח מלא.',
fog: 'חלקיקי מים מפזרים את האור. ראות נופלת מתחת ל-500 מ׳.',
rain: 'טיפות מסננות את האות. מטרות מטושטשות.',
sandstorm: 'חלקיקים גסים — חסימה כמעט מוחלטת של גלים נראים.',
snow: 'שלג מחזיר אור ויוצר רעש. זיהוי בעיקר ע"י ניגוד.',
 },
 },
 {
id: 'ir',
label: 'תרמי IR',
english: 'Thermal Infrared',
icon: 'fuel',
effect: { clear: 90, fog: 35, rain: 30, sandstorm: 45, snow: 75 },
notes: {
clear: 'אידיאלי בלילה ובאור. מטרות חמות בולטות מהרקע.',
fog: 'אדי מים בולעים IR. תופעת Thermal Crossover גוברת.',
rain: 'טיפות + תיקון רטוב על המטרה = חתימה מטושטשת.',
sandstorm: 'חלקיקי חול חמים מהרקע — רעש גבוה, אבל יותר טוב מאופטי.',
snow: 'הרקע הקר בולט מאוד מטנק חם. אחד התרחישים הטובים ל-IR.',
 },
 },
 {
id: 'radar',
label: 'ראדאר',
english: 'Radar',
icon: 'satellite',
effect: { clear: 95, fog: 90, rain: 65, sandstorm: 75, snow: 80 },
notes: {
clear: 'גלים מילימטריים פועלים מצוין. כיסוי לטווח ארוך.',
fog: 'גלי ראדיו חוצים ערפל כמעט בלי בליעה. יתרון גדול על IR ואופטי.',
rain: 'גשם חזק מפזר גלים מילימטריים — תלוי בתדר.',
sandstorm: 'חודר חלקיקים. מערכת בחירה כשהאופטי מת.',
snow: 'גרגרי קרח בעננים יוצרים החזרים בלתי רצויים — clutter.',
 },
 },
 {
id: 'laser',
label: 'ציין לייזר',
english: 'Laser Designator',
icon: 'crosshair',
effect: { clear: 95, fog: 25, rain: 40, sandstorm: 15, snow: 50 },
notes: {
clear: 'נעילה מדויקת. תאורת מטרה לחימוש מונחה.',
fog: 'הקרן מתפזרת על מולקולות מים. נעילה אובדת.',
rain: 'מילימטרי — אבל גשם חזק גורם להחזרים שוליים.',
sandstorm: 'חלקיקים מבטלים את הקוהרנטיות של הקרן.',
snow: 'שלג טרי = יצירת רעש. שלג ישן יציב יותר.',
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
title={
 <>
 <span className="gradient-text">האוויר אוכל</span> את הסנסור שלך
 </>
 }
intro="כל גל אלקטרומגנטי שיוצא מהסנסור חייב לעבור דרך מולקולות של מים, חלקיקי אבק וטיפות גשם. כל אחד מהם הוא קיר. הזיזו את התנאים, ראו איזה סנסור עובד באיזה תנאי."
 />

 <div className="p-5 mb-6">
 <div className="flex gap-3 items-start">
 <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
 <div className="text-sm leading-relaxed">
 <strong className="text-fg">בליעה אטמוספרית (Atmospheric Attenuation)</strong> — תופעה פיזיקלית שבה גלים אלקטרומגנטיים <strong>מתפזרים, נשברים או נבלעים</strong> ע"י אדי מים, אבק מדברי או גשם.
 המשמעות: סנסור שעבד מצוין אתמול עלול להיות חצי-עיוור היום.
 <strong className="text-fg block mt-1.5">הצלבת סנסורים</strong> = ביטוח: כשהאופטי מת, הראדאר עוד עובד.
 </div>
 </div>
 </div>

 {/* Weather selector */}
 <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
 {WEATHER.map((w) => {
const isActive = weather === w.id;
return (
 <button
key={w.id}
onClick={() => setWeather(w.id)}
className={cn(
 'surface p-3 text-right transition-all rounded-xl flex items-center gap-2',
isActive ? `${w.border} shadow-glow ${w.bg}` : 'hover:border-border-strong'
 )}
 >
 <div className={cn('size-9 rounded-lg flex items-center justify-center border-2 shrink-0', w.border, w.bg)}>
 <Icon name={w.icon} size={16} className={w.color} />
 </div>
 <div>
 <div className={cn('font-display font-bold text-sm leading-tight', isActive && w.color)}>
 {w.label}
 </div>
 <div className="text-[10px] font-mono text-fg-dim">{w.english}</div>
 </div>
 </button>
 );
 })}
 </div>

 {/* Sensor effectiveness chart */}
 <div className="surface-elevated p-5 rounded-2xl mb-12">
 <div className="text-sm font-display font-semibold text-fg-muted mb-4 tracking-wider flex items-center justify-between flex-wrap gap-2">
 <span>יעילות הסנסורים בתנאי {WEATHER.find((w) => w.id === weather)?.label}</span>
 <span className="text-[10px] text-fg-dim normal-case">% יעילות לעומת אוויר נקי</span>
 </div>

 <div className="space-y-3">
 {SENSORS.map((s) => {
const pct = s.effect[weather];
const barColor = pct >= 75 ? 'bg-status-ok' : pct >= 50 ? 'bg-status-warn' : pct >= 30 ? 'bg-accent-hot' : 'bg-status-danger';
const labelColor = pct >= 75 ? 'text-status-ok' : pct >= 50 ? 'text-status-warn' : pct >= 30 ? 'text-accent-hot' : 'text-status-danger';
return (
 <div key={s.id} className="surface p-3 rounded-xl">
 <div className="flex items-center gap-3 mb-2">
 <div className="size-9 rounded-lg bg-bg-accent border border-border flex items-center justify-center shrink-0">
 <Icon name={s.icon} size={16} className="text-fg" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="font-display font-bold text-sm leading-tight">{s.label}</div>
 <div className="text-[10px] font-mono text-fg-dim">{s.english}</div>
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

 <SoftDivider text="Thermal Crossover · כשהטנק נעלם מה-IR" />

 {/* Thermal Crossover interactive */}
 <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-stretch mb-12">
 <div className="surface-elevated p-5 rounded-2xl">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div className="text-sm font-display font-semibold text-fg-muted tracking-wider">
 חתימה תרמית במהלך היממה · {hour.toString().padStart(2, '0')}:00
 </div>
 <div className={cn('chip', isCrossover ? 'border-status-danger/40 bg-status-danger/10 text-status-danger' : 'border-status-ok/40 bg-status-ok/10 text-status-ok')}>
 <Icon name={isCrossover ? 'spark' : 'check'} size={12} strokeWidth={2.5} />
 <span className="font-mono">{isCrossover ? 'Crossover!' : 'IR פעיל'}</span>
 </div>
 </div>

 <ThermalViz tank={tankTemp} background={backgroundTemp} hour={hour} crossover={isCrossover} />

 <div className="mt-3 grid grid-cols-3 gap-2 text-center">
 <div>
 <div className="text-[10px] font-mono text-accent-hot">טנק</div>
 <div className="font-display font-bold text-xl text-accent-hot tabular-nums">{tankTemp}°</div>
 </div>
 <div>
 <div className="text-[10px] font-mono text-terrain-sky">רקע</div>
 <div className="font-display font-bold text-xl text-terrain-sky tabular-nums">{backgroundTemp.toFixed(1)}°</div>
 </div>
 <div>
 <div className="text-[10px] font-mono text-fg-dim">הפרש (ΔT)</div>
 <div className={cn('font-display font-bold text-xl tabular-nums', isCrossover ? 'text-status-danger' : 'text-status-ok')}>
 {delta.toFixed(1)}°
 </div>
 </div>
 </div>
 </div>

 <div className="space-y-3">
 <div className="surface-elevated p-5 rounded-2xl">
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
 <div className="flex justify-between text-[10px] font-mono text-fg-dim mt-1">
 <span>00:00</span>
 <span>06:00</span>
 <span>12:00</span>
 <span>18:00</span>
 <span>23:00</span>
 </div>
 <p className="text-[11px] text-fg-muted mt-3 leading-relaxed">
 גלגל את היום. בבוקר ובערב מוקדם — חתימת הטנק קרובה לרקע = ה-IR מתעוור. במלחמות בלחות גבוהה ובלילות קרים, החלון הזה נמשך שעות.
 </p>
 </div>

 <div className="surface p-4 rounded-xl bg-status-danger/5">
 <div className="text-sm font-display font-semibold text-status-danger mb-1 tracking-wider">סיכון מבצעי</div>
 <div className="font-display font-bold mb-1.5 leading-tight">חלון 04:00-08:00</div>
 <p className="text-xs text-fg-muted leading-relaxed">
 שעות שבהן הקרקע התקררה בלילה אבל השמש עוד לא חיממה אותה — והטנק עוד לא הגיע לטמפ׳ הפעלה.
 שני הגופים באותו ערך תרמי. <strong className="text-fg">חלון הזדמנות אסטרטגי</strong> לאויב שמתכנן תקיפה: נסיעה בלי שייראה ב-IR.
 </p>
 </div>
 </div>
 </div>
 </section>
 );
}
function ThermalViz({ tank, background, hour, crossover }: { tank: number; background: number; hour: number; crossover: boolean }) {
 // Map temps to colors: cold = blue, warm = red
const bgIntensity = Math.max(0, Math.min(1, (background - 5) / 25));
const tankIntensity = Math.max(0, Math.min(1, (tank - 5) / 25));
const bgColor = `rgba(${Math.round(255 * bgIntensity)}, ${Math.round(150 * (1 - bgIntensity * 0.5))}, ${Math.round(220 * (1 - bgIntensity))}, 0.85)`;
const tankColor = `rgba(${Math.round(255 * tankIntensity)}, ${Math.round(150 * (1 - tankIntensity * 0.5))}, ${Math.round(220 * (1 - tankIntensity))}, 0.95)`;
return (
 <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
 <svg viewBox="0 0 100 56" className="w-full h-full">
 {/* Background heatmap */}
 <rect x="0" y="0" width="100" height="56" fill={bgColor} />

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
fill="rgba(255,255,255,0.08)"
 />
 );
 })}

 {/* Ground / terrain hint */}
 <path d="M0 40 L25 36 L50 42 L75 38 L100 41 L100 56 L0 56 Z" fill="rgba(0,0,0,0.1)" />

 {/* Tank silhouette */}
 <g transform="translate(45 32)">
 <rect x="-8" y="-5" width="16" height="5" rx="0.5" fill={tankColor} stroke={crossover ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.4)'} strokeWidth="0.3" />
 <rect x="-3" y="-7.5" width="6" height="2.5" rx="0.4" fill={tankColor} stroke={crossover ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.4)'} strokeWidth="0.3" />
 <rect x="2" y="-7" width="5" height="0.6" fill={tankColor} />
 <rect x="-9" y="-0.5" width="18" height="2.4" rx="1" fill={tankColor} stroke={crossover ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.4)'} strokeWidth="0.3" />
 </g>

 {/* Time indicator */}
 <text x="6" y="9" className="fill-bg font-display font-bold font-bold" fontSize="4" paintOrder="stroke" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" strokeLinejoin="round">
 {hour.toString().padStart(2, '0')}:00
 </text>

 {/* Crossover overlay */}
 {crossover && (
 <g>
 <rect x="0" y="0" width="100" height="56" fill="rgba(239,68,68,0.08)" />
 <text x="50" y="14" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="4.5" paintOrder="stroke" stroke="#ffffff" strokeWidth="1.4" strokeLinejoin="round">
 ⚠ Thermal Crossover
 </text>
 <text x="50" y="20" textAnchor="middle" className="fill-status-danger font-display font-bold" fontSize="2.8" paintOrder="stroke" stroke="#ffffff" strokeWidth="0.9" strokeLinejoin="round">
 הטנק"נעלם" מהמסך התרמי
 </text>
 </g>
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
