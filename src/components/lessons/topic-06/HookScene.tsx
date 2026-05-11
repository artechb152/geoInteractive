'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

const STATS: { value: string; label: string; icon: IconName }[] = [
  { value: '1',    label: 'רכס מספיק לעוור צבא',  icon: 'mountain' },
  { value: '2',    label: 'סוגי שבירת LOS',         icon: 'eye' },
  { value: '100%', label: 'תלות חימוש מונחה ב-LOS', icon: 'crosshair' },
  { value: '~45',  label: 'דקות',                    icon: 'clock' },
];

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropRays />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <div className="chip border-accent/40 bg-accent/10 text-accent mb-8 mx-auto w-fit">
          <Icon name="eye" size={14} className="text-accent" />
          <span className="font-mono text-[11px]">שיעור 06</span>
          <span className="text-fg-dim">·</span>
          <span>קווי ראייה ותצפית · LOS / Viewshed</span>
        </div>

        <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          מי שרואה <span className="gradient-text">ראשון</span>,
          <br />
          יורה ראשון.
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          שני חיילים. 300 מטר אחד מהשני. אותו גובה. אחד רואה את חברו, השני לא רואה כלום.
          ההבדל? קו ישר אחד שעובר מעל גבעה אחת. בשיעור הזה נלמד איך לקרוא את הקו הזה.
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

function BackdropRays() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {/* Observer point with sight cone */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1.5, delay: 0.4 }}
        >
          {/* Sight cone */}
          <polygon
            points="20,50 100,18 100,82"
            className="fill-accent-cool"
            opacity="0.08"
          />
          {/* Observer eye marker */}
          <circle cx="20" cy="50" r="1.5" className="fill-accent-cool" />

          {/* LOS rays (going out) */}
          {[
            { x: 95, y: 18 },
            { x: 95, y: 30 },
            { x: 95, y: 50 },
            { x: 95, y: 70 },
            { x: 95, y: 82 },
          ].map((p, i) => (
            <motion.line
              key={i}
              x1="20"
              y1="50"
              x2={p.x}
              y2={p.y}
              stroke="currentColor"
              className="text-accent-cool"
              strokeWidth="0.15"
              strokeDasharray="1 0.8"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.4 }}
              transition={{ duration: 2, delay: 0.6 + i * 0.15 }}
            />
          ))}
        </motion.g>

        {/* Terrain silhouettes blocking some lines */}
        <motion.path
          d="M50 90 L58 60 L66 85 Z"
          className="fill-terrain-ridge/30 stroke-terrain-ridge/50"
          strokeWidth="0.2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
        />
        <motion.path
          d="M75 90 L82 45 L90 90 Z"
          className="fill-terrain-ridge/25 stroke-terrain-ridge/40"
          strokeWidth="0.2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
        />

        {/* Target marker */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.8 }}
        >
          <circle cx="92" cy="55" r="1.5" className="fill-accent-hot" />
          <circle cx="92" cy="55" r="3" fill="none" className="stroke-accent-hot/40" strokeWidth="0.2">
            <animate attributeName="r" values="2;5;2" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
          </circle>
        </motion.g>
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
