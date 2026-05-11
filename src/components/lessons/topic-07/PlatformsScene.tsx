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
    desc: 'AH-64, Cobra. דיוק מרבי, אבל פעיל בגובה נמוך = חשוף ל-MANPADS וירי קל.',
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
    desc: 'הרמס 450, סקיילארק. איסוף + תקיפה ברמת חטיבה. גובה בינוני = חלון פגיעות מסוים.',
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
    desc: 'הרמס 900, Reaper. שעות טייסת ארוכות מעל תקרת ענן רגילה. מטרה ל-SAM ארוך טווח בלבד.',
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
    desc: 'F-16, F-35. מהירות גבוהה + תמרון. תקיפה אווירית מדויקת — אבל יקר וקצר בכוננות.',
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
    desc: 'בפועל ב-400-2000 ק"מ. לא נחסם ע"י תקרת ענן רגילה — אבל מסלולים קבועים = חלון מוגבל.',
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
    desc: 'מערכת SkyDew, TARS. תצפית רציפה, זול להפעלה. סטטי = יעד נייח. שבירה בסערה.',
  },
];

const SCALE_MAX = 12000;

export function PlatformsScene() {
  const [ceiling, setCeiling] = useState(4500);
  const [scenario, setScenario] = useState<'all-weather' | 'covert' | 'precision' | 'persistent'>('all-weather');

  const recommendations: Record<typeof scenario, { ids: string[]; rationale: string }> = {
    'all-weather': {
      ids: ['satellite', 'male-uav'],
      rationale: 'מזג אוויר משתנה. נדרשות פלטפורמות שעובדות מעל תקרת ענן רוב הזמן ולא חשופות ל-MANPADS.',
    },
    covert: {
      ids: ['satellite', 'male-uav'],
      rationale: 'דרושה תצפית בלי לעורר חשד. פלטפורמות גבוהות ושקטות, ללא חתימה אקוסטית מהקרקע.',
    },
    precision: {
      ids: ['fighter', 'helo'],
      rationale: 'דרושה תקיפה מדויקת בחימוש כבד. מטוסי קרב להפלת רכבים משוריינים, מסוקים לתמיכה צמודה.',
    },
    persistent: {
      ids: ['balloon', 'male-uav'],
      rationale: 'כיסוי רציף 24/7 על אזור קבוע. בלון זול לאחזקה, מל"ט אסטרטגי לשעות טייסת ארוכות.',
    },
  };

  return (
    <section id="scene-platforms" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SceneHeader
        step="07.3"
        eyebrow="תקרת ענן ובחירת פלטפורמה"
        title={
          <>
            <span className="gradient-text">תקרה אחת</span>. שינוי כל מערך האיסוף.
          </>
        }
        intro="תקרת ענן נמוכה הופכת מטוסי קרב למכשירים יקרים שלא רואים כלום. הזיזו את הענן, ראו מי שורד מעליו ומי חייב לרדת מתחתיו — לתוך אש."
      />

      <div className="surface-elevated p-5 mb-6 border-r-4 border-r-accent-cool">
        <div className="flex gap-3 items-start">
          <Icon name="spark" size={20} className="text-accent-cool shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="text-fg">תקרת ענן (Cloud Ceiling)</strong> — הגובה האטמוספרי התחתון שבו מתחיל כיסוי עננים משמעותי.
            <strong className="text-fg block mt-1.5">המשמעות:</strong> פלטפורמות מתחת לתקרה — חשופות ל-<strong className="text-fg">MANPADS</strong> (טילי כתף קצרי טווח, ~5000 מ׳).
            פלטפורמות מעל התקרה — לא רואות מטרות אופטית. הבחירה: או חודרים את הענן ומחכים לחתימה, או יורדים ומתפללים שלא יורים בנו.
          </div>
        </div>
      </div>

      {/* Main visualization */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch mb-12">
        <div className="surface-elevated p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-[10px] font-mono text-fg-dim tracking-widest uppercase">
              חתך אנכי · 12 ק"מ
            </div>
            <div className="text-[10px] font-mono text-accent-cool">
              תקרת ענן: <strong>{ceiling.toLocaleString()} מ׳</strong>
            </div>
          </div>

          <AltitudeMap ceiling={ceiling} platforms={PLATFORMS} />

          <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-mono text-fg-dim flex-wrap">
            <span className="flex items-center gap-1">
              <span className="size-2 bg-accent-cool/40 rounded-sm border border-accent-cool" /> מעל תקרת ענן
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 bg-status-danger/30 rounded-sm border border-status-danger" /> אזור MANPADS
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <div className="surface-elevated p-5 rounded-2xl">
            <div className="text-[10px] font-mono text-fg-dim tracking-widest uppercase mb-3">
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
            <strong className="text-fg block mb-1">תרגיל:</strong>
            הנמך את התקרה ל-1500 מ׳ (חורף ים-תיכוני). ראה כמה פלטפורמות נשארו מעליה, וכמה נאלצות לחדור אליה (וכך לחשוף את עצמן).
          </div>
        </div>
      </div>

      <SoftDivider text="מטריצת החלטה · איזו פלטפורמה לאיזו משימה" />

      {/* Scenario selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {[
          { id: 'all-weather', label: 'כל מזג אוויר', english: 'All-Weather', icon: 'wave' as IconName },
          { id: 'covert',      label: 'חשאיות',      english: 'Covert',      icon: 'eye' as IconName },
          { id: 'precision',   label: 'תקיפה מדויקת', english: 'Precision',  icon: 'crosshair' as IconName },
          { id: 'persistent',  label: 'כיסוי רציף',   english: 'Persistent',  icon: 'clock' as IconName },
        ].map((sc) => {
          const isActive = scenario === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => setScenario(sc.id as typeof scenario)}
              className={cn(
                'surface p-3 text-right transition-all rounded-xl flex items-center gap-2',
                isActive ? 'border-accent shadow-glow bg-accent/5' : 'hover:border-border-strong'
              )}
            >
              <div className={cn(
                'size-9 rounded-lg flex items-center justify-center border-2 shrink-0',
                isActive ? 'border-accent/40 bg-accent/15' : 'border-border bg-bg-accent'
              )}>
                <Icon name={sc.icon} size={16} className={isActive ? 'text-accent' : 'text-fg-dim'} />
              </div>
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
                      ? 'border-status-ok/50 bg-status-ok/5 shadow-glow'
                      : 'opacity-50'
                  )}
                >
                  <div
                    className={cn(
                      'size-10 rounded-xl flex items-center justify-center border-2 shrink-0',
                      isRecommended ? 'border-status-ok/40 bg-status-ok/10' : 'border-border bg-bg-accent'
                    )}
                  >
                    <Icon name={p.icon} size={18} className={isRecommended ? 'text-status-ok' : 'text-fg-dim'} />
                  </div>
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
  // Map altitude (0..SCALE_MAX) to y (95..5) in viewBox
  const altToY = (alt: number) => 95 - (alt / SCALE_MAX) * 90;
  const ceilingY = altToY(ceiling);
  const manpadsCeilingY = altToY(5000);

  return (
    <div className="aspect-[3/4] sm:aspect-[5/4] relative rounded-xl overflow-hidden bg-gradient-to-b from-terrain-sky/20 via-bg-elevated to-bg-card">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        {/* Altitude grid lines + labels */}
        {[0, 2000, 4000, 6000, 8000, 10000, 12000].map((alt) => {
          const y = altToY(alt);
          return (
            <g key={alt}>
              <line x1="2" y1={y} x2="98" y2={y} className="stroke-border-subtle" strokeWidth="0.15" strokeDasharray="0.6 0.6" />
              <text x="2" y={y - 0.6} className="fill-fg-dim font-mono" fontSize="2">
                {(alt / 1000).toFixed(0)}k
              </text>
            </g>
          );
        })}

        {/* MANPADS threat zone */}
        <rect
          x="2"
          y={manpadsCeilingY}
          width="96"
          height={95 - manpadsCeilingY}
          className="fill-status-danger"
          opacity="0.08"
        />
        <text
          x="50"
          y={(manpadsCeilingY + 95) / 2 + 1}
          textAnchor="middle"
          className="fill-status-danger font-display font-bold"
          fontSize="3"
          opacity="0.7"
        >
          אזור MANPADS · 0-5,000 מ׳
        </text>

        {/* Cloud ceiling band */}
        <motion.g
          initial={false}
          animate={{ y: ceilingY }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        >
          <rect
            x="2"
            y="-3"
            width="96"
            height="6"
            className="fill-fg-dim"
            opacity="0.3"
          />
          {/* Cloud blobs */}
          {[10, 25, 40, 55, 70, 85].map((cx) => (
            <ellipse
              key={cx}
              cx={cx}
              cy="0"
              rx="6"
              ry="2.4"
              className="fill-fg-dim"
              opacity="0.5"
            />
          ))}
          <text
            x="50"
            y="6"
            textAnchor="middle"
            className="fill-fg font-display font-bold"
            fontSize="2.6"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth="0.85"
            strokeLinejoin="round"
          >
            תקרת ענן
          </text>
        </motion.g>

        {/* Ground */}
        <rect x="0" y="95" width="100" height="5" className="fill-terrain-ridge/50" />
        <text x="50" y="98.5" textAnchor="middle" className="fill-fg-dim font-mono" fontSize="2">קרקע</text>

        {/* Platforms positioned at their altitudes */}
        {platforms.map((p, i) => {
          const y = altToY(p.defaultAlt);
          const x = 18 + i * 11;
          const isAboveCeiling = p.defaultAlt > ceiling;
          const isInManpads = p.defaultAlt <= 5000;
          const statusColor = isAboveCeiling ? 'fill-status-ok' : isInManpads ? 'fill-status-danger' : 'fill-status-warn';
          const ringColor = isAboveCeiling ? 'stroke-status-ok' : isInManpads ? 'stroke-status-danger' : 'stroke-status-warn';

          return (
            <g key={p.id}>
              {/* Status ring */}
              <circle
                cx={x}
                cy={y}
                r="3"
                fill="none"
                className={ringColor}
                strokeWidth="0.4"
                opacity="0.5"
              />
              {/* Marker */}
              <circle cx={x} cy={y} r="2" className={statusColor} stroke="#ffffff" strokeWidth="0.4" />
              {/* Label */}
              <text
                x={x}
                y={y - 4}
                textAnchor="middle"
                className="fill-fg font-mono font-bold"
                fontSize="1.8"
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth="0.7"
                strokeLinejoin="round"
              >
                {p.label.length > 8 ? p.label.split(' ')[0] : p.label}
              </text>
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                className="fill-fg-dim font-mono"
                fontSize="1.6"
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth="0.6"
                strokeLinejoin="round"
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

function SoftDivider({ text }: { text: string }) {
  return (
    <div className="my-12 flex items-center gap-4">
      <div className="h-px flex-1 bg-border-subtle" />
      <span className="text-xs font-mono text-fg-dim tracking-widest uppercase">{text}</span>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}
