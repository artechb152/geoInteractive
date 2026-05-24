'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

const STATS: { value: string; label: string; icon: IconName }[] = [
  { value: '60%', label: 'שיפוע מקסימלי לזחליל', icon: 'tank' },
  { value: '4',   label: 'תצורות צומח לזיהוי',   icon: 'layers' },
  { value: '2',   label: 'Cover מול Concealment', icon: 'shield' },
  { value: '~55', label: 'דקות',                  icon: 'clock' },
];

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropPath />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <div className="chip border-accent/40 bg-accent/10 text-accent mb-8 mx-auto w-fit">
          <Icon name="target" size={14} className="text-accent" />
          <span className="font-mono text-[11px]">שיעור 05</span>
          <span className="text-fg-dim">·</span>
          <span>ניידות ותמרון: עבירות, כיסוי והסתרה</span>
        </div>

        <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          שיח <span className="gradient-text">לא עוצר</span>
          <br />
          כדור.
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          שני חיילים תופסים מחסה. אחד מאחורי סלע — השני מאחורי שיח עבות.
          מבחוץ הם נראים זהים. רק אחד מהם יחיה. בשיעור הזה נלמד למה.
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

function BackdropPath() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {/* Animated movement paths through terrain */}
        <motion.path
          d="M5 75 Q 25 70 40 55 T 70 30 T 95 15"
          fill="none"
          stroke="currentColor"
          className="text-accent"
          strokeWidth="0.4"
          strokeDasharray="2 1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.25 }}
          transition={{ duration: 3, delay: 0.5 }}
        />
        <motion.path
          d="M5 75 L 25 60 L 30 45 L 50 40 L 70 25 L 90 18"
          fill="none"
          stroke="currentColor"
          className="text-accent-cool"
          strokeWidth="0.4"
          strokeDasharray="1.5 1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.25 }}
          transition={{ duration: 3.4, delay: 0.8 }}
        />

        {/* Terrain hints: slopes */}
        {[
          { x1: 10, y1: 80, x2: 20, y2: 65 },
          { x1: 30, y1: 70, x2: 45, y2: 55 },
          { x1: 55, y1: 60, x2: 70, y2: 40 },
          { x1: 75, y1: 45, x2: 88, y2: 25 },
        ].map((s, i) => (
          <motion.line
            key={i}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke="currentColor"
            className="text-fg-dim"
            strokeWidth="0.15"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.3 }}
            transition={{ duration: 1.5, delay: 1 + i * 0.2 }}
          />
        ))}

        {/* Start and end markers */}
        <motion.circle
          cx="5"
          cy="75"
          r="1.2"
          className="fill-accent-cool"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.5 }}
        />
        <motion.circle
          cx="95"
          cy="15"
          r="1.2"
          className="fill-accent-hot"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.7 }}
        />
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
