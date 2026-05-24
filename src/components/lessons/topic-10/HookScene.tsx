'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

const STATS: { value: string; label: string; icon: IconName }[] = [
  { value: '3',   label: 'ממדי קרב (אופקי, אנכי, תת-קרקע)', icon: 'layers' },
  { value: '~10', label: 'מ׳ — טווח היתקלות בסמטה',          icon: 'crosshair' },
  { value: '1',   label: 'ציר הומניטרי = שעות עצירה',         icon: 'people' },
  { value: '~50', label: 'דקות',                              icon: 'clock' },
];

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropCity />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <div className="chip border-accent/40 bg-accent/10 text-accent mb-8 mx-auto w-fit">
          <Icon name="capital" size={14} className="text-accent" />
          <span className="font-mono text-[11px]">שיעור 10</span>
          <span className="text-fg-dim">·</span>
          <span>לחימה אורבנית · MOUT</span>
        </div>

        <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          10 מ׳ בסמטה.
          <br />
          30 קומות <span className="gradient-text">מעל</span>.
          <br />
          20 מ׳ <span className="gradient-text">מתחת</span>.
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          בעיר, היתרון של טנק מצטמצם למטרים. הצלף בקומה ה-15 רואה אותך לפני שאתה רואה אותו.
          מתחת לרגליך — רשת מנהרות שלמה. בשיעור הזה נלמד את הקרב הכי מורכב שיש.
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

function BackdropCity() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {/* City skyline silhouettes (foreground) */}
        <motion.g
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.45, y: 0 }}
          transition={{ duration: 1.5, delay: 0.3 }}
        >
          {/* Buildings of different heights */}
          {[
            { x: 4,  w: 8, h: 35 },
            { x: 13, w: 5, h: 50 },
            { x: 19, w: 9, h: 28 },
            { x: 29, w: 6, h: 60 },
            { x: 36, w: 10, h: 42 },
            { x: 47, w: 5, h: 70 },
            { x: 53, w: 8, h: 48 },
            { x: 62, w: 7, h: 55 },
            { x: 70, w: 9, h: 32 },
            { x: 80, w: 6, h: 58 },
            { x: 87, w: 8, h: 38 },
            { x: 96, w: 4, h: 45 },
          ].map((b, i) => (
            <g key={i}>
              <rect
                x={b.x}
                y={100 - b.h}
                width={b.w}
                height={b.h}
                className="fill-terrain-ridge"
              />
              {/* Windows */}
              {Array.from({ length: Math.floor(b.h / 6) }).map((_, j) => (
                <rect
                  key={j}
                  x={b.x + 1}
                  y={100 - b.h + 3 + j * 6}
                  width={b.w - 2}
                  height="1.2"
                  className="fill-accent"
                  opacity={0.25 + (j % 3) * 0.15}
                />
              ))}
            </g>
          ))}
        </motion.g>

        {/* Underground tunnels (animated) */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1.5, delay: 0.8 }}
        >
          <line x1="0" y1="98" x2="100" y2="98" className="stroke-fg-dim" strokeWidth="0.2" strokeDasharray="0.5 0.3" />
          {/* Underground network */}
          <path
            d="M10 100 Q 30 105 50 102 T 90 100"
            fill="none"
            className="stroke-accent-hot"
            strokeWidth="0.3"
            strokeDasharray="1 0.8"
          />
          <path
            d="M5 105 L 25 108 L 50 106 L 75 108 L 95 105"
            fill="none"
            className="stroke-accent-hot"
            strokeWidth="0.2"
            strokeDasharray="0.8 0.6"
          />
        </motion.g>

        {/* Threat markers (snipers in high buildings) */}
        {[
          { x: 30, y: 45 },
          { x: 47, y: 32 },
          { x: 80, y: 47 },
        ].map((p, i) => (
          <motion.g
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.2 + i * 0.2, duration: 0.4 }}
          >
            <circle cx={p.x} cy={p.y} r="0.9" className="fill-accent-hot" />
            <circle cx={p.x} cy={p.y} r="2.5" fill="none" className="stroke-accent-hot/50" strokeWidth="0.15">
              <animate attributeName="r" values="1.5;4;1.5" dur="2.5s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
              <animate attributeName="opacity" values="0.7;0;0.7" dur="2.5s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
            </circle>
          </motion.g>
        ))}

        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
