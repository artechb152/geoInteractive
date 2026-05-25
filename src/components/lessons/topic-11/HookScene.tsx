'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropMap />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <div className="inline-flex items-center gap-2.5 mb-10 mx-auto px-4 py-2 rounded-full border border-accent/50 bg-accent/12 shadow-glow w-fit">
          <Icon name="flag" size={16} className="text-accent" />
          <span className="font-display font-bold text-sm text-accent-hover tracking-wider">שיעור 11</span>
          <span className="text-fg-dim text-sm" aria-hidden>·</span>
          <span className="text-sm font-display font-semibold text-fg">גבולות, עומק אסטרטגי ואזורי חיץ</span>
        </div>


        <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          14 קילומטרים.
          <br />
          כל ההגנה <span className="gradient-text">של מדינה</span>.
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
            className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-xl bg-accent text-fg font-display font-semibold text-base hover:bg-accent-hover transition-all duration-200 shadow-glow"
            aria-label="התחל את השיעור"
          >
            <span>לחץ כדי להתחיל</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-1" aria-hidden>
              <path d="M11 4l-6 4 6 4" />
            </svg>
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
          strokeWidth="0.5"
          strokeDasharray="2 1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.5 }}
          transition={{ duration: 2.5, delay: 0.5 }}
        />

        {/* Capital / heart of country */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.5, duration: 0.4 }}
        >
          <circle cx="48" cy="50" r="1.4" className="fill-accent" />
          <circle cx="48" cy="50" r="3" fill="none" className="stroke-accent/50" strokeWidth="0.2">
            <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="48" y="46" textAnchor="middle" className="fill-accent font-display font-bold font-bold" fontSize="2.4" paintOrder="stroke" stroke="#0a0f1a" strokeWidth="0.8" strokeLinejoin="round" opacity="0.7">
            לב המדינה
          </text>
        </motion.g>

        {/* Threat markers along border */}
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
            <circle cx={p.cx} cy={p.cy} r="0.8" className="fill-accent-hot" opacity="0.7" />
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

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
