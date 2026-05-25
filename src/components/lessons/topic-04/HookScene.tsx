'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

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
        <div className="inline-flex items-center gap-2.5 mb-10 mx-auto px-4 py-2 rounded-full border border-accent/50 bg-accent/12 shadow-glow w-fit">
          <Icon name="mountain" size={16} className="text-accent" />
          <span className="font-display font-bold text-sm text-accent-hover tracking-wider">שיעור 04</span>
          <span className="text-fg-dim text-sm" aria-hidden>·</span>
          <span className="text-sm font-display font-semibold text-fg">טופוגרפיה ומורפולוגיית שטח</span>
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
