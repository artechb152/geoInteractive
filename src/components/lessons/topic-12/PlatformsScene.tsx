'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Platform = 'leo' | 'swarm' | 'drone' | 'sar' | 'photogram';

type PlatformData = {
  id: Platform;
  label: string;
  english: string;
  icon: IconName;
  altitude: string;
  resolution: string;
  revisit: string;
  weather: string;
  desc: string;
  example: string;
  color: string;
  bg: string;
  border: string;
};

const PLATFORMS: PlatformData[] = [
  {
    id: 'leo',
    label: 'לוויין LEO יחיד',
    english: 'Single LEO Satellite',
    icon: 'satellite',
    altitude: '300–800 ק"מ',
    resolution: '~30 ס"מ (סופר-גבוהה)',
    revisit: '~24 שעות',
    weather: 'תלוי במזג אוויר (אופטי)',
    desc: 'פלטפורמה אסטרטגית. בגובה של מאות ק"מ בודדים, נותנת תמונות ברזולוציה סופר-גבוהה. דוגמה: לוויין "אופק" הישראלי.',
    example: 'לפני 30 שנה הצליחו לזהות באתר טילים מסוים. היום זה שגרה — ובסטנדרט אזרחי.',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/40',
  },
  {
    id: 'swarm',
    label: 'להקת לוויינים',
    english: 'Satellite Swarm',
    icon: 'layers',
    altitude: '500 ק"מ',
    resolution: '50 ס"מ–1 מ׳',
    revisit: '~1 שעה (!)',
    weather: 'תלוי במזג אוויר (אופטי)',
    desc: 'מהפכת ה-Swarm: מאות ננו-לוויינים זולים. רזולוציה בינונית — אבל Revisit Time גבוה. בכל שעה תמונה חדשה.',
    example: 'Planet Labs מפעילה ~200 לוויינים שמצלמים את כל היבשה כל יום. שום בסיס סודי לא נשאר סודי 24 שעות.',
    color: 'text-accent-cool',
    bg: 'bg-accent-cool/10',
    border: 'border-accent-cool/40',
  },
  {
    id: 'drone',
    label: 'רחפן / כטב"ם טקטי',
    english: 'Tactical Drone',
    icon: 'plane',
    altitude: '50 מ׳–5 ק"מ',
    resolution: '~5 ס"מ',
    revisit: 'רציף (שעות טייסת)',
    weather: 'מוגבל ברוח חזקה / סופה',
    desc: 'פלטפורמה זולה וזמינה. טסה ברוק"ק (רום קרוב לקרקע) — מתחת לרדאר אויב, מתחת לעננים. רואה "מעבר לגבעה" מיידית.',
    example: 'בעזה 2023-24, רחפנים סיפקו תמונה מיידית של כל מבנה לפני כניסת חי"ר. שינוי בקצב פעולה.',
    color: 'text-accent-hot',
    bg: 'bg-accent-hot/10',
    border: 'border-accent-hot/40',
  },
  {
    id: 'sar',
    label: 'מכ"ם פתח סינתטי',
    english: 'SAR (Synthetic Aperture Radar)',
    icon: 'bolt',
    altitude: 'לוויין / כטב"ם / מטוס',
    resolution: '0.5–3 מ׳',
    revisit: '~12 שעות (לוויין) / רציף (מטוס)',
    weather: 'כל מזג אוויר ✓',
    desc: 'סנסור אקטיבי שולח גלי רדיו. <strong>חודר עננים, ערפל, חושך מוחלט, רשתות הסוואה.</strong> רגיש למתכות ולצורות גיאומטריות.',
    example: 'במלחמת המפרץ 1991, AWACS אמריקאי איתר טנקים עיראקיים תחת רשתות הסוואה ב-לילות עננים. אופטיקה רגילה לא יכלה לעשות זאת.',
    color: 'text-status-warn',
    bg: 'bg-status-warn/10',
    border: 'border-status-warn/40',
  },
  {
    id: 'photogram',
    label: 'מודלים תלת-ממדיים',
    english: 'Photogrammetry / 3D',
    icon: 'pyramid',
    altitude: 'מולטי-פלטפורמה',
    resolution: 'מודל מדויק ל-ס"מ',
    revisit: 'לפי דרישה',
    weather: 'דורש תמונות נקיות',
    desc: 'יצירת מודל תלת-ממדי וירטואלי של אתר מתוך עשרות תמונות דו-ממדיות (פוטוגרמטריה).',
    example: 'לפני תקיפת בניין: יוצרים מודל VR שהקומנדו "הולך" בתוכו וירטואלית. כל זווית, כל חלון — נלמד בעל-פה לפני שיוצאים.',
    color: 'text-status-ok',
    bg: 'bg-status-ok/10',
    border: 'border-status-ok/40',
  },
];

type Scenario = {
  id: string;
  label: string;
  desc: string;
  recommended: Platform[];
};

const SCENARIOS: Scenario[] = [
  {
    id: 'cloudy',
    label: 'עננות כבדה',
    desc: 'מזג אוויר חורפי. לא רואים כלום אופטית.',
    recommended: ['sar', 'drone'],
  },
  {
    id: 'persistent',
    label: 'מעקב רציף',
    desc: 'צריך תמונה כל שעה לעקוב אחר שינויים.',
    recommended: ['swarm', 'drone'],
  },
  {
    id: 'detail',
    label: 'זיהוי כלי ספציפי',
    desc: 'דרושה רזולוציה סופר-גבוהה — מספר זנב של טנק.',
    recommended: ['leo', 'drone'],
  },
  {
    id: 'strike',
    label: 'תכנון תקיפה',
    desc: 'דרוש מודל מבנה מדויק לתכנון כניסת חימוש.',
    recommended: ['photogram', 'drone'],
  },
];

export function PlatformsScene() {
  const [active, setActive] = useState<Platform>('leo');
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);

  const meta = PLATFORMS.find((p) => p.id === active)!;

  return (
    <section id="scene-platforms" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="12.2"
        eyebrow="פלטפורמות וסנסורים"
        title={
          <>
            <span className="gradient-text">5 פלטפורמות</span> שמספקות את הראייה
          </>
        }
        intro={`לוויין סופר-גבוה ב-500 ק"מ. רחפן זול 50 מ׳ מעל הקרקע. SAR שחודר עננים. מודל תלת-ממדי שמדמה את הבניין מבפנים. כל אחד עם תפקיד אחר — והבחירה היא חצי מהמודיעין.`}
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">Remote Sensing</strong> — "לראות מבלי להיות שם". משלבת סנסורים בחלל (לוויינים), בסטרטוספירה (בלוני תצפית) ובאטמוספירה (רחפנים, מטוסים). כל פלטפורמה עם
            <strong className="text-fg"> רזולוציה, Revisit Time, וכיסוי מזג אוויר</strong> שונים.
            <strong className="text-fg block mt-1.5">הבחירה היא הקרב המרכזי:</strong> פלטפורמה לא נכונה = מודיעין לא רלוונטי בזמן שצריך.
          </div>
        </div>
      </div>

      {/* Platform selector + visualization */}
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-stretch mb-12">
        {/* Altitude scale visualization */}
        <div className="surface-elevated p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-fg-dim mb-3 tracking-widest uppercase">
            סקלת גובה תפעולי · 0 עד 800 ק"מ
          </div>
          <AltitudeScale activePlatform={active} />
        </div>

        {/* Platform list */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono text-fg-dim tracking-widest uppercase mb-2">
            פלטפורמות זמינות
          </div>
          {PLATFORMS.map((p) => {
            const isActive = active === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActive(p.id)}
                className={cn(
                  'surface p-3 text-right transition-all rounded-xl flex items-center gap-2.5 w-full',
                  isActive ? `${p.border} shadow-glow ${p.bg}` : 'hover:border-border-strong'
                )}
              >
                <div className={cn('size-10 rounded-lg flex items-center justify-center border-2 shrink-0', p.border, p.bg)}>
                  <Icon name={p.icon} size={18} className={p.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn('font-display font-bold text-sm leading-tight', isActive && p.color)}>
                    {p.label}
                  </div>
                  <div className="text-[10px] font-mono text-fg-dim">{p.altitude}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Platform details */}
      <AnimatePresence mode="wait">
        <motion.div
          key={meta.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={cn('surface-elevated p-6 rounded-2xl border-r-4 mb-12', meta.border.replace('border-', 'border-r-'))}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('size-14 rounded-2xl flex items-center justify-center border-2 shrink-0', meta.border, meta.bg)}>
              <Icon name={meta.icon} size={24} className={meta.color} />
            </div>
            <div>
              <div className={cn('font-display font-bold text-2xl leading-tight', meta.color)}>{meta.label}</div>
              <div className="text-[10px] font-mono text-fg-dim mt-0.5">{meta.english}</div>
            </div>
          </div>

          <p
            className="text-sm text-fg leading-relaxed mb-4"
            dangerouslySetInnerHTML={{ __html: meta.desc }}
          />

          {/* Spec stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <Spec label="גובה" value={meta.altitude} color={meta.color} />
            <Spec label="רזולוציה" value={meta.resolution} color={meta.color} />
            <Spec label="Revisit Time" value={meta.revisit} color={meta.color} />
            <Spec label="מזג אוויר" value={meta.weather} color={meta.color} />
          </div>

          <div className="surface p-3 rounded-lg bg-bg-accent/30 border border-border">
            <div className="text-[10px] font-mono text-fg-dim mb-1 tracking-widest uppercase">דוגמה</div>
            <p className="text-xs text-fg leading-relaxed italic">{meta.example}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <SoftDivider text="איזו פלטפורמה לאיזו מטרה?" />

      {/* Scenario picker */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {SCENARIOS.map((s) => {
          const isActive = scenario.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setScenario(s)}
              className={cn(
                'surface p-3 text-right transition-all rounded-xl',
                isActive ? 'border-accent shadow-glow bg-accent/5' : 'hover:border-border-strong'
              )}
            >
              <div className={cn('font-display font-bold text-sm leading-tight mb-1', isActive && 'text-accent')}>
                {s.label}
              </div>
              <div className="text-[10px] text-fg-muted">{s.desc}</div>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={scenario.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="surface-elevated p-5 rounded-2xl"
        >
          <div className="text-[10px] font-mono text-fg-dim mb-2 tracking-widest uppercase">
            תרחיש: {scenario.label}
          </div>
          <p className="text-sm text-fg-muted leading-relaxed mb-4">{scenario.desc}</p>

          <div className="grid sm:grid-cols-2 gap-2">
            {PLATFORMS.map((p) => {
              const isRecommended = scenario.recommended.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={cn(
                    'surface p-3 rounded-xl flex items-center gap-2.5',
                    isRecommended ? 'border-status-ok/50 bg-status-ok/5' : 'opacity-50'
                  )}
                >
                  <div className={cn(
                    'size-9 rounded-lg flex items-center justify-center border-2 shrink-0',
                    isRecommended ? 'border-status-ok/40 bg-status-ok/10' : 'border-border bg-bg-accent'
                  )}>
                    <Icon name={p.icon} size={16} className={isRecommended ? 'text-status-ok' : 'text-fg-dim'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('font-display font-bold text-sm leading-tight', isRecommended && 'text-status-ok')}>
                        {p.label}
                      </span>
                      {isRecommended && <Icon name="check" size={12} strokeWidth={2.5} className="text-status-ok" />}
                    </div>
                    <div className="text-[10px] font-mono text-fg-dim">{p.altitude}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function AltitudeScale({ activePlatform }: { activePlatform: Platform }) {
  // Map altitudes to y-positions
  const positions: Record<Platform, { y: number; label: string }> = {
    leo:       { y: 8,  label: '500 ק"מ — LEO' },
    swarm:     { y: 14, label: '500 ק"מ — Swarm' },
    drone:     { y: 70, label: '3 ק"מ — רחפן' },
    sar:       { y: 30, label: 'משתנה — SAR' },
    photogram: { y: 55, label: 'מולטי — Photogrammetry' },
  };

  return (
    <div className="aspect-[3/4] sm:aspect-[5/6] relative rounded-xl overflow-hidden">
      <svg viewBox="0 0 100 90" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="space-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c1525" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="80%" stopColor="#475569" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="90" fill="url(#space-bg)" />

        {/* Stars in space */}
        {Array.from({ length: 30 }).map((_, i) => {
          const x = (i * 7) % 100;
          const y = (i * 3) % 25;
          return <circle key={i} cx={x} cy={y} r="0.2" className="fill-white" opacity={0.4 + (i % 3) * 0.2} />;
        })}

        {/* Altitude markers */}
        {[
          { y: 5,  label: '800 ק"מ' },
          { y: 15, label: '500 ק"מ · LEO' },
          { y: 30, label: '100 ק"מ · קרמן' },
          { y: 50, label: '15 ק"מ · סטרטוספירה' },
          { y: 70, label: '3 ק"מ · רחפנים' },
          { y: 85, label: '0 — קרקע' },
        ].map((m, i) => (
          <g key={i}>
            <line x1="2" y1={m.y} x2="98" y2={m.y} className="stroke-white" strokeWidth="0.1" strokeDasharray="0.6 0.4" opacity="0.3" />
            <text x="3" y={m.y - 0.5} className="fill-white font-mono" fontSize="2" opacity="0.7">
              {m.label}
            </text>
          </g>
        ))}

        {/* Ground */}
        <path d="M0 87 L20 85 L40 87 L60 84 L80 86 L100 85 L100 90 L0 90 Z" className="fill-terrain-sand/60" />

        {/* All platforms positioned */}
        {Object.entries(positions).map(([id, p]) => {
          const platform = PLATFORMS.find((pl) => pl.id === id)!;
          const isActive = activePlatform === id;
          const xPos = id === 'leo' ? 30 : id === 'swarm' ? 60 : id === 'drone' ? 50 : id === 'sar' ? 75 : 25;
          return (
            <g key={id}>
              {/* Pulse on active */}
              {isActive && (
                <circle cx={xPos} cy={p.y} r="2" fill="none" className={cn('stroke-current', platform.color)} strokeWidth="0.3">
                  <animate attributeName="r" values="1.5;4;1.5" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0.1;0.9" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Platform marker */}
              <rect
                x={xPos - 1.5}
                y={p.y - 0.8}
                width="3"
                height="1.6"
                className={cn(
                  'transition-all',
                  isActive ? `${platform.color.replace('text-', 'fill-')} stroke-current` : 'fill-white/40'
                )}
                stroke={isActive ? 'currentColor' : 'transparent'}
                strokeWidth="0.2"
                style={{ color: isActive ? `var(--${platform.color.replace('text-', '')})` : undefined }}
              />
              <text x={xPos} y={p.y + 3} textAnchor="middle" className={cn('font-mono font-bold', isActive ? platform.color : 'fill-white/60')} fontSize="1.6">
                {platform.label.split(' ')[0]}
              </text>

              {/* For swarm, show multiple */}
              {id === 'swarm' && isActive && (
                <>
                  {[55, 62, 68].map((x, i) => (
                    <rect key={i} x={x - 1} y={p.y - 0.5} width="2" height="1" className="fill-accent-cool" opacity={0.4 + i * 0.2} />
                  ))}
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Spec({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="surface p-3 rounded-lg">
      <div className="text-[10px] font-mono text-fg-dim mb-0.5 tracking-widest uppercase">{label}</div>
      <div className={cn('text-sm font-medium leading-tight', color)}>{value}</div>
    </div>
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
