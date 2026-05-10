'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

const STATS: { value: string; label: string; icon: IconName }[] = [
  { value: '3',   label: 'שיטות ניווט',         icon: 'compass' },
  { value: '3',   label: 'סוגי "צפון"',         icon: 'star' },
  { value: '360°', label: 'מעלות אזימוט',       icon: 'crosshair' },
  { value: '~45', label: 'דקות',                icon: 'clock' },
];

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropCompass />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <div className="chip border-accent/40 bg-accent/10 text-accent mb-8 mx-auto w-fit">
          <Icon name="compass" size={14} className="text-accent" />
          <span className="font-mono text-[11px]">שיעור 03</span>
          <span className="text-fg-dim">·</span>
          <span>ניווטים</span>
        </div>

        <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          לילה. בלי <span className="gradient-text">GPS</span>.
          <br />
          איך תגיע <span className="gradient-text">בדיוק לשם</span>?
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          לוויינים נופלים. רחפנים מאבדים אות. האויב משבש את ה-GPS.
          ניווט הוא לא רק טכניקה — זאת היכולת שמחזירה את הכוח שלך הביתה.
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
              className="surface px-3 py-4 text-center"
            >
              <Icon name={s.icon} size={18} className="text-accent mx-auto mb-2" />
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

function BackdropCompass() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="-50 -50 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
      >
        {/* Outer compass rings */}
        {[40, 32, 24].map((r, i) => (
          <motion.circle
            key={r}
            cx="0"
            cy="0"
            r={r}
            fill="none"
            stroke="currentColor"
            className="text-accent"
            strokeWidth="0.15"
            opacity={0.2 - i * 0.03}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.2 - i * 0.03 }}
            transition={{ duration: 2, delay: i * 0.2 }}
          />
        ))}

        {/* Cardinal markers */}
        {[
          { angle: 0, label: 'N' },
          { angle: 90, label: 'E' },
          { angle: 180, label: 'S' },
          { angle: 270, label: 'W' },
        ].map((m) => {
          const a = ((m.angle - 90) * Math.PI) / 180;
          const x = Math.cos(a) * 36;
          const y = Math.sin(a) * 36;
          return (
            <text
              key={m.label}
              x={x}
              y={y + 1}
              textAnchor="middle"
              className="fill-fg-dim text-[3px] font-mono opacity-50"
            >
              {m.label}
            </text>
          );
        })}

        {/* Tick marks every 30° */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 - 90) * (Math.PI / 180);
          return (
            <line
              key={i}
              x1={Math.cos(a) * 28}
              y1={Math.sin(a) * 28}
              x2={Math.cos(a) * 30}
              y2={Math.sin(a) * 30}
              className="stroke-fg-dim"
              strokeWidth="0.2"
              opacity="0.3"
            />
          );
        })}

        {/* Rotating needle */}
        <motion.g
          animate={{ rotate: [0, 30, -10, 45, 15, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '0 0' }}
        >
          <polygon points="0,-22 -2,0 0,2 2,0" className="fill-accent" />
          <polygon points="0,22 -2,0 0,-2 2,0" className="fill-fg-dim opacity-50" />
        </motion.g>

        {/* Center pin */}
        <circle cx="0" cy="0" r="1.2" className="fill-bg stroke-accent" strokeWidth="0.4" />
        <circle cx="0" cy="0" r="3" fill="none" className="stroke-accent/40" strokeWidth="0.3">
          <animate attributeName="r" values="2;5;2" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
