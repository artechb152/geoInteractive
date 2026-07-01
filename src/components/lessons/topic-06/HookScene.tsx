'use client';

import { motion } from 'framer-motion';
import { Icon } from '@/components/Icon';

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
        <div className="inline-flex items-center gap-2.5 mb-10 mx-auto px-4 py-2 rounded-full border border-accent/50 bg-accent/12 w-fit">
          <Icon name="eye" size={16} className="text-accent" />
          <span className="font-display font-bold text-sm text-accent tracking-wider">שיעור 06</span>
          <span className="text-fg-dim text-sm" aria-hidden>·</span>
          <span className="text-sm font-display font-semibold text-fg">קווי ראייה ותצפית · LOS (Line of Sight) / Viewshed</span>
        </div>


        <h1 className="text-accent text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          מי שרואה <span className="text-accent">ראשון</span>,
          <br />
          יורה ראשון.
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          שני חיילים. 300 מטר אחד מהשני. אותו גובה. אחד רואה את חברו, השני לא רואה כלום.
          ההבדל? קו ישר אחד שעובר מעל גבעה אחת. בשיעור הזה נלמד איך לקרוא את הקו הזה.
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
            className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-xl bg-accent text-bg-elevated font-display font-semibold text-base hover:bg-accent-hover transition-all duration-200"
            aria-label="התחל את השיעור"
          >
            <span>לחץ כדי להתחיל</span>
          </button>
        </motion.div>
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
