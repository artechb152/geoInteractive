'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

const STATS: { value: string; label: string; icon: IconName }[] = [
  { value: '14',   label: 'ק"מ — רוחב ישראל הצר',  icon: 'flag' },
  { value: '2',    label: 'סוגי גבולות',            icon: 'shield' },
  { value: '~250', label: 'ק"מ — DMZ קוריאני',     icon: 'crosshair' },
  { value: '~30',  label: 'דקות',                   icon: 'clock' },
];

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropMap />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <div className="chip border-accent/40 bg-accent/10 text-accent mb-8 mx-auto w-fit">
          <Icon name="flag" size={14} className="text-accent" />
          <span className="font-mono text-[11px]">שיעור 11</span>
          <span className="text-fg-dim">·</span>
          <span>גבולות, עומק אסטרטגי ואזורי חיץ</span>
        </div>

        <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          14 קילומטרים.
          <br />
          כל ההגנה <span className="gradient-text">של מדינה</span>.
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          רוסיה איבדה את מוסקבה — וזכתה בזמן. ישראל לא יכולה לאבד שום עיר.
          העומק האסטרטגי קובע איך מדינה <strong className="text-fg">בכלל יכולה</strong> להגן על עצמה.
          בוא נראה איך.
        </p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1, delayChildren: 0.6 } },
          }}
          className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto"
        >
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
              }}
              whileHover={{ y: -2 }}
              className="surface px-3 py-4 text-center group hover:border-accent/40 hover:shadow-glow transition-all duration-300"
            >
              <Icon name={s.icon} size={18} className="text-accent mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <div className="font-display font-bold text-2xl tabular-nums">{s.value}</div>
              <div className="text-[11px] text-fg-dim mt-0.5">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          onClick={() => document.getElementById('scene-onboarding')?.scrollIntoView({ behavior: 'smooth' })}
          className="mt-14 group flex flex-col items-center gap-3 text-fg-dim text-xs hover:text-accent transition-colors mx-auto cursor-pointer"
          aria-label="התחל את השיעור"
        >
          <span className="font-mono tracking-widest uppercase group-hover:text-accent transition-colors">לחץ כדי להתחיל</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="size-10 rounded-full border border-border-strong group-hover:border-accent flex items-center justify-center transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 5l4 4 4-4" />
            </svg>
          </motion.div>
        </motion.button>
      </motion.div>
    </section>
  );
}

function BackdropMap() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {/* Country silhouette */}
        <motion.path
          d="M 30 25 L 65 22 L 72 30 L 70 50 L 65 70 L 55 80 L 35 78 L 28 65 L 30 45 Z"
          className="fill-terrain-ridge stroke-terrain-ridge"
          strokeWidth="0.4"
          opacity="0.15"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 0.3 }}
        />
        <motion.path
          d="M 30 25 L 65 22 L 72 30 L 70 50 L 65 70 L 55 80 L 35 78 L 28 65 L 30 45 Z"
          fill="none"
          className="stroke-accent-hot"
          strokeWidth="0.5"
          strokeDasharray="2 1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.5 }}
          transition={{ duration: 2.5, delay: 0.5 }}
        />

        {/* Capital / heart of country */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.5, duration: 0.4 }}
        >
          <circle cx="48" cy="50" r="1.4" className="fill-accent" />
          <circle cx="48" cy="50" r="3" fill="none" className="stroke-accent/50" strokeWidth="0.2">
            <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="48" y="46" textAnchor="middle" className="fill-accent font-display font-bold font-bold" fontSize="2.4" paintOrder="stroke" stroke="#0a0f1a" strokeWidth="0.8" strokeLinejoin="round" opacity="0.7">
            לב המדינה
          </text>
        </motion.g>

        {/* Threat markers along border */}
        {[
          { cx: 70, cy: 32 },
          { cx: 65, cy: 75 },
          { cx: 30, cy: 70 },
          { cx: 30, cy: 35 },
        ].map((p, i) => (
          <motion.g
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.7 + i * 0.15, duration: 0.4 }}
          >
            <circle cx={p.cx} cy={p.cy} r="0.8" className="fill-accent-hot" opacity="0.7" />
          </motion.g>
        ))}

        {/* Depth indicator lines */}
        {[6, 14, 25].map((dist, i) => (
          <motion.path
            key={i}
            d="M 30 25 L 65 22 L 72 30 L 70 50 L 65 70 L 55 80 L 35 78 L 28 65 L 30 45 Z"
            fill="none"
            className="stroke-accent"
            strokeWidth="0.15"
            opacity={0.15 - i * 0.04}
            transform={`scale(${1 + dist * 0.04})`}
            style={{ transformOrigin: '50% 50%' }}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.8 + i * 0.2 }}
          />
        ))}
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
