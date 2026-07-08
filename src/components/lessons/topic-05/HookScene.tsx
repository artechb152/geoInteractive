'use client';

import { motion } from 'framer-motion';

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[70vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropPath />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <h1 className="text-accent text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          שיח <span className="text-accent">לא עוצר</span>
          <br />
          כדור.
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          שני חיילים תופסים מחסה. אחד מאחורי סלע — השני מאחורי שיח עבות.
          מבחוץ הם נראים זהים. רק אחד מהם יחיה. בשיעור הזה נלמד למה.
        </p>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="mt-14 flex justify-center"
        >
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('learn:next'))}
            className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-[3px] bg-accent text-bg-elevated font-display font-semibold text-base hover:bg-accent-hover transition-all duration-200"
            aria-label="התחל את השיעור"
          >
            <span>לחץ כדי להתחיל</span>
          </button>
        </motion.div>
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
