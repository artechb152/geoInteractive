'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

const STATS: { value: string; label: string; icon: IconName }[] = [
  { value: '5°',   label: 'סף Thermal Crossover',  icon: 'fuel' },
  { value: '2',    label: 'אזורי אקלים בעמק אחד',   icon: 'wave' },
  { value: '100%', label: 'תלות חימוש בתקרת ענן',   icon: 'plane' },
  { value: '~30',  label: 'דקות',                   icon: 'clock' },
];

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropWeather />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <div className="chip border-accent/40 bg-accent/10 text-accent mb-8 mx-auto w-fit">
          <Icon name="wave" size={14} className="text-accent" />
          <span className="font-mono text-[11px]">שיעור 07</span>
          <span className="text-fg-dim">·</span>
          <span>אקלים, מזג אוויר ועונתיות</span>
        </div>

        <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          הטנק <span className="gradient-text">נעלם</span>
          <br />
          מהמסך התרמי.
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          לילה קר. גשם. הטנק שעקבת אחריו 6 שעות פתאום מתמזג עם הרקע. זה לא כשל סנסור —
          זה Thermal Crossover. בשיעור הזה נלמד איך מזג האוויר משנה את כללי המשחק.
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
          onClick={() => window.dispatchEvent(new CustomEvent('learn:next'))}
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

function BackdropWeather() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {/* Cloud silhouettes (drifting) */}
        {[
          { cx: 22, cy: 18, r: 7, delay: 0 },
          { cx: 30, cy: 22, r: 9, delay: 0.2 },
          { cx: 70, cy: 14, r: 8, delay: 0.4 },
          { cx: 80, cy: 22, r: 6, delay: 0.6 },
        ].map((c, i) => (
          <motion.ellipse
            key={i}
            cx={c.cx}
            cy={c.cy}
            rx={c.r * 1.4}
            ry={c.r * 0.8}
            className="fill-fg-muted"
            opacity="0.08"
            initial={{ x: -8, opacity: 0 }}
            animate={{ x: 8, opacity: 0.1 }}
            transition={{
              duration: 8,
              repeat: Infinity,
              repeatType: 'reverse',
              delay: c.delay,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Rain streaks */}
        {Array.from({ length: 28 }).map((_, i) => {
          const x = (i * 11 + (i * 13) % 17) % 100;
          const y = 10 + (i * 7) % 30;
          return (
            <motion.line
              key={i}
              x1={x}
              y1={y}
              x2={x - 1.5}
              y2={y + 6}
              className="stroke-accent-cool"
              strokeWidth="0.18"
              opacity="0.5"
              initial={{ y: y - 18, opacity: 0 }}
              animate={{ y: y + 60, opacity: [0, 0.4, 0] }}
              transition={{
                duration: 1.6 + (i % 5) * 0.2,
                repeat: Infinity,
                delay: (i * 0.07) % 2,
                ease: 'linear',
              }}
            />
          );
        })}

        {/* Lightning flash (occasional) */}
        <motion.path
          d="M70 30 L67 45 L72 45 L68 60"
          fill="none"
          className="stroke-accent"
          strokeWidth="0.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0"
          animate={{ opacity: [0, 0, 0.6, 0, 0, 0, 0.45, 0] }}
          transition={{ duration: 6, repeat: Infinity, repeatDelay: 2 }}
        />

        {/* Bottom ridge silhouette */}
        <path
          d="M0 78 L15 70 L30 75 L50 65 L70 72 L85 68 L100 75 L100 100 L0 100 Z"
          className="fill-terrain-ridge/20"
        />
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
