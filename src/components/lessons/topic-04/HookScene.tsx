'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

const STATS: { value: string; label: string; icon: IconName }[] = [
  { value: '5',   label: 'תבניות נוף',         icon: 'mountain' },
  { value: '4',   label: 'סוגי מדרונות',       icon: 'layers' },
  { value: '3',   label: 'סוגי שטח טקטי',     icon: 'crosshair' },
  { value: '~40', label: 'דקות',                icon: 'clock' },
];

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropTopo />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <div className="chip border-accent/40 bg-accent/10 text-accent mb-8 mx-auto w-fit">
          <Icon name="mountain" size={14} className="text-accent" />
          <span className="font-mono text-[11px]">שיעור 04</span>
          <span className="text-fg-dim">·</span>
          <span>טופוגרפיה ומורפולוגיית שטח</span>
        </div>

        <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          אותו <span className="gradient-text">הר</span>.
          <br />
          שני צדדים <span className="gradient-text">שונים לחלוטין</span>.
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          בקרב, צורת ההר היא לא רקע. היא הכלי הכי חזק שיש לך —
          או הכי מסוכן. בשיעור הזה תלמד לקרוא נוף כמו שמפקדים קוראים שדה קרב.
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

function BackdropTopo() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {/* Topographic contour rings forming a hill */}
        {[
          { rx: 42, ry: 30 },
          { rx: 35, ry: 25 },
          { rx: 28, ry: 20 },
          { rx: 22, ry: 16 },
          { rx: 16, ry: 11 },
          { rx: 10, ry: 7 },
          { rx: 5, ry: 3.5 },
        ].map((c, i) => (
          <motion.ellipse
            key={i}
            cx="50"
            cy="52"
            rx={c.rx}
            ry={c.ry}
            fill="none"
            stroke="currentColor"
            className="text-accent"
            strokeWidth="0.18"
            opacity={0.18 - i * 0.018}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.18 - i * 0.018 }}
            transition={{ duration: 2, delay: i * 0.12 }}
          />
        ))}

        {/* Peak marker */}
        <polygon points="50,49 47,55 53,55" className="fill-accent" opacity="0.4" />
        <circle cx="50" cy="52" r="0.8" className="fill-accent" />
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
