'use client';

import { motion } from 'framer-motion';

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[70vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropMap />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          14 קילומטרים.
          <br />
          כל ההגנה <span className="text-accent">של מדינה</span>.
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          רוסיה איבדה את מוסקבה — וזכתה בזמן. ישראל לא יכולה לאבד שום עיר.
          העומק האסטרטגי קובע איך מדינה <strong className="text-fg">בכלל יכולה</strong> להגן על עצמה.
          בוא נראה איך.
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
          strokeWidth="0.4"
          strokeDasharray="2 1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.25 }}
          transition={{ duration: 2.5, delay: 0.5 }}
        />

        {/* Capital / heart of country — marker only, no overlapping
            label (text used to sit right behind the H1 headline). */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.5, duration: 0.4 }}
        >
          <circle cx="48" cy="50" r="1.2" className="fill-accent" opacity="0.6" />
          <circle cx="48" cy="50" r="3" fill="none" className="stroke-accent/30" strokeWidth="0.18">
            <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
          </circle>
        </motion.g>

        {/* Threat markers along border — muted so they don't fight the
            headline copy. */}
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
            <circle cx={p.cx} cy={p.cy} r="0.7" className="fill-accent-hot" opacity="0.4" />
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

      {/* Soft cream backdrop right behind the headline — bumps the
          contrast of the title against the country silhouette and
          dashed border without removing them. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(255,251,247,0.94) 0%, rgba(255,251,247,0.65) 45%, transparent 80%)',
        }}
      />
      {/* Bottom fade so the map dissolves into the page bg. */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
