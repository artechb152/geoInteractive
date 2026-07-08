'use client';

import { motion } from 'framer-motion';

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[70vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropWeather />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <h1 className="text-accent text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          הטנק <span className="text-accent">נעלם</span>
          <br />
          מהמסך התרמי.
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          לילה קר. גשם. הטנק שעקבת אחריו 6 שעות פתאום מתמזג עם הרקע. זה לא כשל סנסור —
          זה Thermal Crossover. בשיעור הזה נלמד איך מזג האוויר משנה את כללי המשחק.
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
