'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Platform = {
  id: string;
  label: string;
  english: string;
  icon: IconName;
  minAlt: number; // meters
  maxAlt: number;
  defaultAlt: number;
  manpadsRisk: boolean; // exposed below 5000m
  desc: string;
};

const PLATFORMS: Platform[] = [
  {
    id: 'helo',
    label: 'מסוק תקיפה',
    english: 'Attack Helicopter',
    icon: 'plane',
    minAlt: 100,
    maxAlt: 3000,
    defaultAlt: 800,
    manpadsRisk: true,
    desc: 'מסוקים כמו ה"אפאצ\'י". מספקים כוח אש מדויק וקטלני, אבל טסים נמוך מאוד. זה אומר שהם מטרה קלה יחסית לטילי כתף (MANPADS) ולנשק קל שיורה מהקרקע.',
  },
  {
    id: 'mini-uav',
    label: 'מל"ט טקטי',
    english: 'Tactical UAV',
    icon: 'plane',
    minAlt: 1500,
    maxAlt: 5500,
    defaultAlt: 4000,
    manpadsRisk: true,
    desc: 'רחפנים ומל"טים קטנים (כמו "רוכב שמיים" ו"זיק"). משמשים לאיסוף מודיעין ותקיפה ממוקדת. הם טסים בגובה בינוני, ולכן עדיין נמצאים בסכנת פגיעה אם האויב מצויד היטב.',
  },
  {
    id: 'male-uav',
    label: 'מל"ט אסטרטגי',
    english: 'MALE UAV',
    icon: 'plane',
    minAlt: 5000,
    maxAlt: 9000,
    defaultAlt: 7500,
    manpadsRisk: false,
    desc: 'מל"טים ענקיים (כמו "כוכב" ו"שובל"). יכולים לטוס שעות ארוכות, לרוב מעל גובה העננים. מכיוון שהם טסים גבוה, רק מערכות נ"מ כבדות וארוכות טווח (SAM) יכולות לאיים עליהם.',
  },
  {
    id: 'fighter',
    label: 'מטוס קרב',
    english: 'Fighter Jet',
    icon: 'plane',
    minAlt: 3000,
    maxAlt: 12000,
    defaultAlt: 9000,
    manpadsRisk: false,
    desc: 'מטוסי קרב (כמו F-16 ו-F-35). מציעים מהירות עצומה ותקיפה עוצמתית, אבל הפעלתם יקרה מאוד וזמן השהייה שלהם באוויר (מעל המטרה) מוגבל מאוד בהשוואה למל"ט.',
  },
  {
    id: 'satellite',
    label: 'לוויין LEO',
    english: 'LEO Satellite',
    icon: 'satellite',
    minAlt: 11000,
    maxAlt: 12000,
    defaultAlt: 11500,
    manpadsRisk: false,
    desc: 'משייטים בחלל הרחק מכל סכנה, בגבהים של מאות קילומטרים. הבעיה: הם נעים במסלול קבוע סביב כדור הארץ, ולכן אפשר להשתמש בהם ולצלם רק כשהם חולפים בדיוק מעלינו לכמה רגעים.',
  },
  {
    id: 'balloon',
    label: 'בלון תצפית',
    english: 'Aerostat',
    icon: 'pyramid',
    minAlt: 2000,
    maxAlt: 4500,
    defaultAlt: 3500,
    manpadsRisk: true,
    desc: 'בלוני תצפית עצומים (כמו "טל שמיים"). מספקים תצפית רצופה 24/7 וזולים מאוד להפעלה. החיסרון: הם קשורים לקרקע, מה שהופך אותם למטרה קלה, והם עלולים להיקרע או לצאת מכלל שימוש בסופות ורוחות עזות.',
  },
];

const SCALE_MAX = 12000;

export function PlatformsScene() {
  const [ceiling, setCeiling] = useState(4500);
  const [scenario, setScenario] = useState<'all-weather' | 'covert' | 'precision' | 'persistent'>('all-weather');

  const recommendations: Record<typeof scenario, { ids: string[]; rationale: string }> = {
    'all-weather': {
      ids: ['satellite', 'male-uav'],
      rationale: 'כשמזג האוויר סוער ובלתי צפוי, נצטרך כלים שיכולים לשייט בביטחה הרבה מעל העננים, הרחק מסכנת טילי הכתף של האויב.',
    },
    covert: {
      ids: ['satellite', 'male-uav'],
      rationale: 'כשהמטרה היא לרגל ולאסוף מודיעין בלי להתגלות. נשתמש בכלים שקטים שטסים גבוה מאוד, כך שהאויב למטה לא יוכל לשמוע אותם או לזהות אותם בעין.',
    },
    precision: {
      ids: ['fighter', 'helo'],
      rationale: 'כשיש צורך להשמיד מטרות כבדות ומשוריינות. מטוסי קרב יטילו פצצות כבדות ומדויקות, ומסוקים יספקו סיוע אש קטלני וצמוד לכוחות הקרקע שלנו.',
    },
    persistent: {
      ids: ['balloon', 'male-uav'],
      rationale: 'כשצריך "עיניים בשמיים" בלי הפסקה מעל תא שטח מסוים. בלוני תצפית ומל"טים ענקיים יכולים לשהות באוויר שעות (ואפילו ימים) ברצף, והעלות שלהם נמוכה יחסית.',
    },
  };

  return (
    <section id="scene-platforms" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="07.3"
        eyebrow="תקרת ענן ובחירת פלטפורמה"
        title={
          <>
            <span className="text-accent-hover">תקרה אחת</span>. שינוי כל מערך האיסוף.
          </>
        }
        intro="עננים נמוכים יכולים להפוך מטוסי קרב מתקדמים ויקרים לכלים חסרי תועלת שכמעט ולא רואים כלום. שחקו עם גובה העננים, ותראו אילו כלי טיס נשארים בטוחים מעליהם, ואילו חייבים לרדת מתחתיהם ולסכן את עצמם באש האויב רק כדי לראות את המטרה."
      />

      <div className="p-5 mb-6">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">תקרת ענן (Cloud Ceiling)</strong> — קו הגובה שבו מתחילים להופיע עננים שמסתירים את הקרקע.
            <strong className="text-fg block mt-1.5">מה זה אומר בתכלס?</strong>
            כלי טיס שיטוסו <strong className="text-fg">מתחת</strong> לעננים יצליחו לראות את המטרות שלהם, אבל יהיו חשופים ל-<strong className="text-fg">MANPADS</strong> (טילי נ"מ שנורים מהכתף, ומגיעים עד לגובה של כ-5 ק"מ) ולירי מהקרקע.<br/>
            כלי טיס שיטוסו <strong className="text-fg">מעל</strong> לעננים יהיו מוגנים מטילי הכתף, אבל המצלמות שלהם יהיו עיוורות בגלל הענן.<br/>
            זהו כאב הראש של המפקד: האם להישאר גבוה ובטוח אבל עיוור, או לצלול מתחת לעננים ולהסתכן בהפלה?
          </div>
        </div>
      </div>

      {/* Main visualization */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch mb-12">
        <div className="surface-elevated p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <div className="text-[10px] font-display font-semibold text-fg-muted tracking-[0.2em] uppercase">Altitude Profile</div>
              <div className="text-base font-display font-bold leading-tight text-fg">חתך אנכי · 12 ק"מ</div>
            </div>
            <div className="text-end">
              <div className="text-[10px] font-display font-semibold text-fg-muted tracking-wider">תקרת ענן נוכחית</div>
              <div className="font-display font-bold text-base tabular-nums text-accent leading-none">
                {ceiling.toLocaleString()}<span className="text-xs text-fg-muted ms-1">מ׳</span>
              </div>
            </div>
          </div>

          <AltitudeMap ceiling={ceiling} platforms={PLATFORMS} />

          <div className="mt-3 flex items-center justify-center gap-x-5 gap-y-1.5 text-[11px] font-display font-semibold text-fg-muted tracking-wider flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#10B981] ring-2 ring-[#10B981]/25" /> מעל תקרת הענן
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#F59E0B] ring-2 ring-[#F59E0B]/25" /> מתחת לעננים · בטוח מ-MANPADS
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#dc2626] ring-2 ring-[#dc2626]/25" /> בטווח MANPADS
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <div className="surface-elevated p-5 rounded-2xl">
            <div className="text-sm font-display font-semibold text-fg-muted tracking-wider mb-3">
              גובה תקרת ענן
            </div>
            <div className="font-display font-bold text-3xl tabular-nums text-accent mb-3">
              {ceiling.toLocaleString()}<span className="text-sm text-fg-muted ms-1">מ׳</span>
            </div>
            <input
              type="range"
              min={300}
              max={11000}
              step={100}
              value={ceiling}
              onChange={(e) => setCeiling(Number(e.target.value))}
              className="w-full accent-accent"
              aria-label="גובה תקרת ענן"
            />
            <div className="flex justify-between text-[10px] font-mono text-fg-dim mt-1">
              <span>300</span>
              <span>3,000</span>
              <span>7,000</span>
              <span>11,000</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
              {[
                { label: 'מונסון', alt: 300, color: 'text-status-danger' },
                { label: 'חורף ים-תיכוני', alt: 2500, color: 'text-status-warn' },
                { label: 'קיץ נקי', alt: 8000, color: 'text-status-ok' },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => setCeiling(p.alt)}
                  className={cn('px-2 py-1.5 rounded-md border border-border hover:border-border-strong', p.color)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="surface p-3 rounded-xl text-xs text-fg-muted bg-bg-accent/30 border border-border">
            <strong className="text-fg block mb-1">תנסו בעצמכם:</strong>
            הורידו את תקרת העננים ל-1,500 מטרים (מצב טיפוסי לחורף בישראל). שימו לב כמה כלי טיס מוגנים נשארים מעל העננים, וכמה מהם נאלצים לצלול פנימה כדי לראות משהו – ובכך להפוך למטרה קלה לאויב.
          </div>
        </div>
      </div>

      <SoftDivider text="מטריצת החלטה · איזו פלטפורמה לאיזו משימה" />

      {/* Scenario selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {[
          { id: 'all-weather', label: 'כל מזג אוויר', english: 'All-Weather', icon: 'wave' as IconName },
          { id: 'covert', label: 'חשאיות', english: 'Covert', icon: 'eye' as IconName },
          { id: 'precision', label: 'תקיפה מדויקת', english: 'Precision', icon: 'crosshair' as IconName },
          { id: 'persistent', label: 'כיסוי רציף', english: 'Persistent', icon: 'clock' as IconName },
        ].map((sc) => {
          const isActive = scenario === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => setScenario(sc.id as typeof scenario)}
              className={cn(
                'surface p-3 text-right transition-all rounded-xl flex items-center gap-2',
                isActive ? 'border-accent bg-accent/5' : 'hover:border-border-strong'
              )}
            >
              <Icon name={sc.icon} size={26} className={cn('shrink-0', isActive ? 'text-accent' : 'text-fg-dim')} />
              <div>
                <div className={cn('font-display font-bold text-sm leading-tight', isActive && 'text-accent')}>
                  {sc.label}
                </div>
                <div className="text-[10px] font-mono text-fg-dim">{sc.english}</div>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={scenario}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="surface-elevated p-5 rounded-2xl"
        >
          <p className="text-sm text-fg-muted leading-relaxed mb-4">{recommendations[scenario].rationale}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {PLATFORMS.map((p) => {
              const isRecommended = recommendations[scenario].ids.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={cn(
                    'surface p-3 rounded-xl flex items-start gap-3 transition-all',
                    isRecommended
                      ? 'border-status-ok/50 bg-status-ok/5'
                      : 'opacity-50'
                  )}
                >
                  <Icon name={p.icon} size={28} className={cn('shrink-0', isRecommended ? 'text-status-ok' : 'text-fg-dim')} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className={cn('font-display font-bold leading-tight', isRecommended && 'text-status-ok')}>
                        {p.label}
                      </div>
                      {isRecommended && (
                        <Icon name="check" size={12} strokeWidth={3} className="text-status-ok" />
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-fg-dim mb-1">
                      {p.english} · {(p.minAlt / 1000).toFixed(1)}–{(p.maxAlt / 1000).toFixed(1)} ק"מ
                    </div>
                    <p className="text-xs text-fg-muted leading-relaxed">{p.desc}</p>
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

function AltitudeMap({ ceiling, platforms }: { ceiling: number; platforms: Platform[] }) {
  // ViewBox 0 0 100 100. Altitude scale lives at x=0..8, content at x=10..98.
  const altToY = (alt: number) => 95 - (alt / SCALE_MAX) * 90;
  const ceilingY = altToY(ceiling);
  const manpadsCeilingY = altToY(5000);

  return (
    <div className="aspect-[3/4] sm:aspect-[5/4] relative rounded-2xl overflow-hidden ring-1 ring-black/5">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          {/* Atmospheric sky gradient — deep stratosphere → warm haze → cream */}
          <linearGradient id="atmosphere" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d1729" />
            <stop offset="14%" stopColor="#1c2a4a" />
            <stop offset="32%" stopColor="#3d5278" />
            <stop offset="55%" stopColor="#a4b8c8" />
            <stop offset="78%" stopColor="#f6d6a8" />
            <stop offset="92%" stopColor="#FFDCB5" />
            <stop offset="100%" stopColor="#FFFBF7" />
          </linearGradient>

          {/* MANPADS threat — soft red fade from ground up to 5km */}
          <linearGradient id="manpadsZone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.20" />
          </linearGradient>

          {/* Cloud band — denser core, soft edges */}
          <linearGradient id="cloudBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="35%" stopColor="#f1f4f8" stopOpacity="0.9" />
            <stop offset="65%" stopColor="#dde4ec" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#9aa9b8" stopOpacity="0.55" />
          </linearGradient>

          {/* Distant terrain silhouette */}
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9bab8c" />
            <stop offset="100%" stopColor="#5d6852" />
          </linearGradient>

          {/* Subtle blur for clouds */}
          <filter id="cloudBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.55" />
          </filter>

          {/* Soft drop shadow for platforms */}
          <filter id="platformShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.35" />
            <feOffset dy="0.35" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.55" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Diagonal hatching for MANPADS zone */}
          <pattern id="manpadsHatch" patternUnits="userSpaceOnUse" width="2.4" height="2.4" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="2.4" stroke="#dc2626" strokeWidth="0.18" opacity="0.35" />
          </pattern>
        </defs>

        {/* Sky atmosphere */}
        <rect x="0" y="0" width="100" height="100" fill="url(#atmosphere)" />

        {/* Stars in the upper atmosphere (visible above ~9km) */}
        {[
          { x: 14, y: 6, o: 0.85 },  { x: 22, y: 13, o: 0.6 },
          { x: 34, y: 8, o: 0.9 },   { x: 44, y: 15, o: 0.55 },
          { x: 56, y: 7, o: 0.75 },  { x: 66, y: 18, o: 0.5 },
          { x: 76, y: 11, o: 0.85 }, { x: 86, y: 5, o: 0.7 },
          { x: 92, y: 17, o: 0.55 }, { x: 30, y: 22, o: 0.45 },
          { x: 60, y: 24, o: 0.45 }, { x: 80, y: 22, o: 0.4 },
        ].map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={i % 3 === 0 ? 0.32 : 0.22} fill="#ffffff" opacity={s.o} />
        ))}

        {/* Tropopause marker (~10 km) — subtle hint of where troposphere ends */}
        <line x1="10" y1={altToY(10000)} x2="98" y2={altToY(10000)} stroke="#cbd5db" strokeWidth="0.18" strokeDasharray="0.7 0.5" opacity="0.7" />
        <text x="96" y={altToY(10000) - 0.7} textAnchor="end" fontSize="1.6" fill="#ffffff" opacity="0.55" fontStyle="italic">
          tropopause · ~10 km
        </text>

        {/* MANPADS threat zone — red gradient + diagonal hatching */}
        <rect x="10" y={manpadsCeilingY} width="88" height={95 - manpadsCeilingY} fill="url(#manpadsZone)" />
        <rect x="10" y={manpadsCeilingY} width="88" height={95 - manpadsCeilingY} fill="url(#manpadsHatch)" />

        {/* MANPADS pill label */}
        <g transform={`translate(54 ${(manpadsCeilingY + 95) / 2})`}>
          <rect x="-22" y="-2.4" width="44" height="4.6" rx="2.3" fill="#dc2626" fillOpacity="0.92" />
          <path d="M -19.6 1.2 L -18 -1.8 L -16.4 1.2 Z" fill="#ffffff" />
          <text x="-18" y="0.8" textAnchor="middle" fontSize="1.6" fontWeight="900" fill="#dc2626">!</text>
          <text x="-14" y="0.65" textAnchor="start" fontSize="2.2" fontWeight="700" fill="#ffffff">
            אזור MANPADS · 0–5,000 מ׳
          </text>
        </g>

        {/* Altitude scale on the left edge */}
        <line x1="8" y1={altToY(0)} x2="8" y2={altToY(12000)} stroke="#0d1729" strokeOpacity="0.3" strokeWidth="0.3" />
        {/* Major ticks every 2km */}
        {[0, 2000, 4000, 6000, 8000, 10000, 12000].map((alt) => {
          const y = altToY(alt);
          return (
            <g key={`maj-${alt}`}>
              <line x1="6" y1={y} x2="8" y2={y} stroke="#0d1729" strokeOpacity="0.55" strokeWidth="0.32" />
              <text
                x="5.4"
                y={y + 0.75}
                textAnchor="end"
                fontSize="2.2"
                fontWeight="700"
                fill="#0d1729"
                paintOrder="stroke"
                stroke="#FFFBF7"
                strokeWidth="0.95"
                strokeLinejoin="round"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {(alt / 1000).toFixed(0)}
              </text>
            </g>
          );
        })}
        {/* Minor ticks every 1km */}
        {[1000, 3000, 5000, 7000, 9000, 11000].map((alt) => (
          <line key={`min-${alt}`} x1="7" y1={altToY(alt)} x2="8" y2={altToY(alt)} stroke="#0d1729" strokeOpacity="0.3" strokeWidth="0.22" />
        ))}
        {/* "km" label */}
        <text
          x="3"
          y="7"
          fontSize="1.7"
          fontWeight="700"
          fill="#FFFBF7"
          opacity="0.85"
          letterSpacing="0.2"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          KM
        </text>

        {/* Cloud ceiling — animated */}
        <motion.g
          initial={false}
          animate={{ y: ceilingY }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        >
          {/* Cloud band base */}
          <rect x="10" y="-3.5" width="88" height="7" fill="url(#cloudBand)" />

          {/* Cloud puffs — back layer (large, soft) */}
          <g filter="url(#cloudBlur)" opacity="0.85">
            {[16, 32, 48, 64, 80, 94].map((cx, i) => (
              <ellipse
                key={`back-${cx}`}
                cx={cx}
                cy={i % 2 === 0 ? -0.4 : 0.6}
                rx={6 + (i % 3) * 0.6}
                ry={1.9}
                fill="#ffffff"
                opacity="0.7"
              />
            ))}
          </g>
          {/* Cloud puffs — mid layer (medium, denser) */}
          <g filter="url(#cloudBlur)">
            {[14, 28, 42, 56, 70, 84, 96].map((cx) => (
              <ellipse
                key={`mid-${cx}`}
                cx={cx}
                cy={0}
                rx={3.8}
                ry={1.35}
                fill="#e8edf2"
                opacity="0.95"
              />
            ))}
          </g>
          {/* Cloud puffs — front layer (small, crisp, bottom-shaded) */}
          {[22, 38, 54, 70, 88].map((cx, i) => (
            <ellipse
              key={`front-${cx}`}
              cx={cx}
              cy={i % 2 === 0 ? 0.6 : -0.1}
              rx="2.2"
              ry="0.9"
              fill="#ffffff"
              opacity="0.85"
            />
          ))}

          {/* Ceiling reference line */}
          <line x1="10" y1="2.6" x2="98" y2="2.6" stroke="#475569" strokeWidth="0.22" strokeDasharray="0.8 0.5" opacity="0.7" />

          {/* Pill label — bottom-left of the cloud band */}
          <g transform="translate(86 5.4)">
            <rect x="-13.5" y="-2.1" width="13.5" height="4.2" rx="2.1" fill="#0d1729" fillOpacity="0.92" />
            <text x="-6.75" y="0.75" textAnchor="middle" fontSize="2.05" fontWeight="700" fill="#ffffff" fontFamily="ui-sans-serif, system-ui, sans-serif">
              תקרת ענן
            </text>
          </g>
        </motion.g>

        {/* Ground — distant hills + base layer */}
        <path
          d="M 10 95 L 10 92 Q 22 88 32 91 Q 44 90 52 92 Q 62 88 72 90 Q 84 91 96 90 L 98 92 L 98 95 Z"
          fill="url(#ground)"
          opacity="0.75"
        />
        <rect x="0" y="95" width="100" height="5" fill="#5d6852" />
        <rect x="0" y="95" width="100" height="0.4" fill="#0d1729" opacity="0.3" />

        <text
          x="54"
          y="98.6"
          textAnchor="middle"
          fontSize="2"
          fontWeight="700"
          fill="#FFFBF7"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          קרקע · 0 מ׳
        </text>

        {/* Balloon tether — drawn under platforms */}
        {platforms.map((p, i) => {
          if (p.id !== 'balloon') return null;
          const y = altToY(p.defaultAlt);
          const x = 14 + i * 14;
          return (
            <line
              key={`tether-${p.id}`}
              x1={x}
              y1={y + 1.8}
              x2={x}
              y2="93"
              stroke="#0d1729"
              strokeOpacity="0.55"
              strokeWidth="0.2"
              strokeDasharray="0.5 0.4"
            />
          );
        })}

        {/* Platforms — glyphs with drop shadow */}
        {platforms.map((p, i) => {
          const y = altToY(p.defaultAlt);
          const x = 14 + i * 14;
          const isAboveCeiling = p.defaultAlt > ceiling;
          const isInManpads = p.defaultAlt <= 5000;
          const statusFill = isAboveCeiling ? '#10B981' : isInManpads ? '#dc2626' : '#F59E0B';
          return (
            <g key={p.id} filter="url(#platformShadow)">
              <PlatformGlyph type={p.id} x={x} y={y} color={statusFill} />
            </g>
          );
        })}

        {/* Platform labels — pill above, altitude pill below */}
        {platforms.map((p, i) => {
          const y = altToY(p.defaultAlt);
          const x = 14 + i * 14;
          const isAboveCeiling = p.defaultAlt > ceiling;
          const isInManpads = p.defaultAlt <= 5000;
          const statusFill = isAboveCeiling ? '#10B981' : isInManpads ? '#dc2626' : '#F59E0B';
          const shortName = p.label.length > 8 ? p.label.split(' ')[0] : p.label;
          const labelY = y - 4.8;
          return (
            <g key={`label-${p.id}`}>
              {/* Name pill above */}
              <rect
                x={x - 6.2}
                y={labelY - 1.7}
                width="12.4"
                height="3.4"
                rx="1.7"
                fill="#FFFBF7"
                stroke={statusFill}
                strokeWidth="0.32"
              />
              <text
                x={x}
                y={labelY + 0.55}
                textAnchor="middle"
                fontSize="1.85"
                fontWeight="700"
                fill="#0d1729"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {shortName}
              </text>
              {/* Altitude pill below */}
              <rect
                x={x - 4.2}
                y={y + 2.6}
                width="8.4"
                height="2.6"
                rx="1.3"
                fill={statusFill}
                fillOpacity="0.95"
              />
              <text
                x={x}
                y={y + 4.45}
                textAnchor="middle"
                fontSize="1.55"
                fontWeight="700"
                fill="#FFFBF7"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {(p.defaultAlt / 1000).toFixed(1)} ק"מ
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Custom platform glyphs — small but recognisable silhouettes.
function PlatformGlyph({ type, x, y, color }: { type: string; x: number; y: number; color: string }) {
  const stroke = '#0d1729';
  const sw = 0.28;
  const t = `translate(${x} ${y})`;

  if (type === 'helo') {
    return (
      <g transform={t}>
        {/* Rotor */}
        <line x1="-3" y1="-1.15" x2="3" y2="-1.15" stroke={stroke} strokeWidth="0.32" strokeLinecap="round" />
        <line x1="0" y1="-0.8" x2="0" y2="-1.15" stroke={stroke} strokeWidth={sw} />
        {/* Cabin */}
        <ellipse cx="0" cy="-0.05" rx="1.55" ry="0.78" fill={color} stroke={stroke} strokeWidth={sw} />
        {/* Cockpit highlight */}
        <ellipse cx="0.6" cy="-0.2" rx="0.55" ry="0.35" fill="#FFFBF7" opacity="0.5" />
        {/* Tail boom */}
        <path d="M 0.8 0.1 L 2.7 0.45 L 2.7 0.7 L 0.8 0.55 Z" fill={color} stroke={stroke} strokeWidth={sw} />
        {/* Tail rotor */}
        <line x1="2.7" y1="0.2" x2="3.1" y2="0" stroke={stroke} strokeWidth={sw} />
        <line x1="2.7" y1="0.85" x2="3.1" y2="1.05" stroke={stroke} strokeWidth={sw} />
        {/* Skids */}
        <line x1="-1.4" y1="0.95" x2="1.4" y2="0.95" stroke={stroke} strokeWidth="0.28" strokeLinecap="round" />
        <line x1="-1" y1="0.78" x2="-1" y2="0.95" stroke={stroke} strokeWidth={sw} />
        <line x1="1" y1="0.78" x2="1" y2="0.95" stroke={stroke} strokeWidth={sw} />
      </g>
    );
  }
  if (type === 'mini-uav') {
    // Quadcopter — top-down
    return (
      <g transform={t}>
        <line x1="-1.7" y1="-1.7" x2="1.7" y2="1.7" stroke={stroke} strokeWidth="0.32" strokeLinecap="round" />
        <line x1="1.7" y1="-1.7" x2="-1.7" y2="1.7" stroke={stroke} strokeWidth="0.32" strokeLinecap="round" />
        {[[-1.7,-1.7],[1.7,-1.7],[-1.7,1.7],[1.7,1.7]].map(([cx,cy],i)=>(
          <g key={i}>
            <circle cx={cx} cy={cy} r="0.7" fill="#FFFBF7" stroke={stroke} strokeWidth={sw} opacity="0.7" />
            <circle cx={cx} cy={cy} r="0.25" fill={color} />
          </g>
        ))}
        <rect x="-0.55" y="-0.55" width="1.1" height="1.1" rx="0.2" fill={color} stroke={stroke} strokeWidth={sw} />
      </g>
    );
  }
  if (type === 'male-uav') {
    // Long-endurance UAV — side profile with long wings
    return (
      <g transform={t}>
        {/* Long wing */}
        <path d="M -4 -0.2 L 4 -0.2 L 4 0.2 L -4 0.2 Z" fill={color} stroke={stroke} strokeWidth={sw} />
        {/* Fuselage */}
        <ellipse cx="0" cy="0" rx="1" ry="0.55" fill={color} stroke={stroke} strokeWidth={sw} />
        {/* Engine bulge */}
        <ellipse cx="-1" cy="0" rx="0.35" ry="0.45" fill="#FFFBF7" stroke={stroke} strokeWidth="0.22" opacity="0.85" />
        {/* V-tail */}
        <path d="M 1.1 0 L 2.2 -0.8 L 2.3 -0.65 L 1.3 0 Z" fill={color} stroke={stroke} strokeWidth={sw} />
        <path d="M 1.1 0 L 2.2 0.8 L 2.3 0.65 L 1.3 0 Z" fill={color} stroke={stroke} strokeWidth={sw} />
      </g>
    );
  }
  if (type === 'fighter') {
    // Fighter jet — side view, swept wings
    return (
      <g transform={t}>
        <path d="M -2.6 0 L 1.7 -0.45 L 2.3 0 L 1.7 0.45 Z" fill={color} stroke={stroke} strokeWidth={sw} />
        {/* Upper wing */}
        <path d="M -0.4 -0.35 L 0 -1.5 L 0.9 -1.2 L 1 -0.3 Z" fill={color} stroke={stroke} strokeWidth={sw} />
        {/* Lower wing */}
        <path d="M -0.4 0.35 L 0 1.5 L 0.9 1.2 L 1 0.3 Z" fill={color} stroke={stroke} strokeWidth={sw} />
        {/* Tail fin */}
        <path d="M 1.5 -0.25 L 2.1 -0.9 L 2.4 -0.55 L 2.2 -0.05 Z" fill={color} stroke={stroke} strokeWidth="0.22" />
        {/* Cockpit canopy */}
        <ellipse cx="0.4" cy="-0.05" rx="0.45" ry="0.2" fill="#FFFBF7" opacity="0.65" />
      </g>
    );
  }
  if (type === 'satellite') {
    return (
      <g transform={t}>
        {/* Solar panels */}
        <rect x="-3" y="-0.55" width="2" height="1.1" fill="#fef3c7" stroke={stroke} strokeWidth="0.22" />
        <rect x="1" y="-0.55" width="2" height="1.1" fill="#fef3c7" stroke={stroke} strokeWidth="0.22" />
        {/* Panel gridlines */}
        <line x1="-2.5" y1="-0.55" x2="-2.5" y2="0.55" stroke={stroke} strokeWidth="0.12" opacity="0.5" />
        <line x1="-2" y1="-0.55" x2="-2" y2="0.55" stroke={stroke} strokeWidth="0.12" opacity="0.5" />
        <line x1="1.5" y1="-0.55" x2="1.5" y2="0.55" stroke={stroke} strokeWidth="0.12" opacity="0.5" />
        <line x1="2" y1="-0.55" x2="2" y2="0.55" stroke={stroke} strokeWidth="0.12" opacity="0.5" />
        {/* Connecting struts */}
        <line x1="-1" y1="0" x2="-0.7" y2="0" stroke={stroke} strokeWidth="0.2" />
        <line x1="1" y1="0" x2="0.7" y2="0" stroke={stroke} strokeWidth="0.2" />
        {/* Body */}
        <rect x="-0.7" y="-0.7" width="1.4" height="1.4" rx="0.18" fill={color} stroke={stroke} strokeWidth={sw} />
        {/* Antenna */}
        <line x1="0" y1="-0.7" x2="0" y2="-1.5" stroke={stroke} strokeWidth="0.22" />
        <circle cx="0" cy="-1.65" r="0.22" fill={color} stroke={stroke} strokeWidth="0.18" />
      </g>
    );
  }
  if (type === 'balloon') {
    return (
      <g transform={t}>
        {/* Envelope */}
        <ellipse cx="0" cy="-0.35" rx="1.45" ry="1.75" fill={color} stroke={stroke} strokeWidth={sw} />
        {/* Highlight */}
        <ellipse cx="-0.45" cy="-0.85" rx="0.4" ry="0.65" fill="#FFFBF7" opacity="0.45" />
        {/* Equator seam */}
        <line x1="-1.4" y1="-0.4" x2="1.4" y2="-0.4" stroke={stroke} strokeWidth="0.15" opacity="0.45" />
        {/* Suspension ropes */}
        <line x1="-0.7" y1="1.25" x2="-0.3" y2="1.8" stroke={stroke} strokeWidth="0.16" />
        <line x1="0.7" y1="1.25" x2="0.3" y2="1.8" stroke={stroke} strokeWidth="0.16" />
        {/* Gondola */}
        <rect x="-0.55" y="1.75" width="1.1" height="0.6" rx="0.12" fill={color} stroke={stroke} strokeWidth="0.22" />
      </g>
    );
  }
  // Fallback
  return <circle cx={x} cy={y} r="1.6" fill={color} stroke={stroke} strokeWidth={sw} />;
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