'use client';

import { motion } from 'framer-motion';
import { Icon } from '@/components/Icon';

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropTerrain />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <div className="inline-flex items-center gap-2.5 mb-10 mx-auto px-4 py-2 rounded-full border border-accent/50 bg-accent/12 w-fit">
          <Icon name="compass" size={16} className="text-accent" />
          <span className="font-display font-bold text-sm text-accent tracking-wider">שיעור 03</span>
          <span className="text-fg-dim text-sm" aria-hidden>·</span>
          <span className="text-sm font-display font-semibold text-fg">ניווטים</span>
        </div>


<h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          להגיע ליעד בדיוק מושלם,
          <br />
          <span className="gradient-text text-accent">גם כשהטכנולוגיה מפסיקה לעבוד.</span>
        </h1>
        
        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          לוויינים נופלים. רחפנים מאבדים אות. האויב משבש את ה-GPS.
          ניווט הוא לא רק טכניקה — זאת היכולת שמחזירה את הכוח שלך הביתה.
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
            className="inline-flex items-center gap-3 px-7 py-3.5 rounded-[3px] bg-accent text-bg-elevated font-display font-semibold text-base hover:bg-accent-hover transition-all duration-200"
            aria-label="התחל את השיעור"
          >
            <span>לחץ כדי להתחיל</span>
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}

/**
 * Neutral-toned backdrop: organic topographic contour rings + a faint
 * dotted survey grid. Replaces the previous large rotating compass,
 * whose accent-orange needle sat right behind the orange gradient
 * title and made it unreadable. This version uses only fg-dim /
 * border tones, so the title (and the smaller "שיעור 03" chip with
 * its compass icon) remain the only colored elements on screen.
 */
function BackdropTerrain() {
  // Concentric, slightly offset closed paths — read as contour lines
  // around a peak, not as a measuring instrument.
  const CONTOURS = [
    'M -38 -2 C -32 -22, -10 -32, 10 -28 S 36 -8, 34 14 S 12 36, -8 30 S -42 16, -38 -2 Z',
    'M -28 -1 C -23 -16, -7 -23, 8 -20 S 27 -5, 25 11 S 9 27, -5 22 S -31 12, -28 -1 Z',
    'M -19 -0.5 C -16 -11, -5 -16, 6 -14 S 19 -3, 17 8 S 6 19, -3 15 S -22 8, -19 -0.5 Z',
    'M -11 0 C -9 -6, -3 -9, 3 -8 S 11 -1, 10 5 S 3 12, -2 9 S -13 5, -11 0 Z',
  ];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="-50 -50 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {/* Faint survey-grid dots — gives it a "map paper" feel without
            adding any chromatic weight. */}
        <defs>
          <pattern id="hookGrid" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="0" cy="0" r="0.25" className="fill-fg-dim" opacity="0.35" />
          </pattern>
        </defs>
        <rect x="-50" y="-50" width="100" height="100" fill="url(#hookGrid)" />

        {/* Concentric contour lines, animated in for a subtle reveal */}
        {CONTOURS.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            className="stroke-fg-dim"
            strokeWidth="0.18"
            opacity={0.22 - i * 0.035}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.22 - i * 0.035 }}
            transition={{ duration: 2.4, delay: i * 0.18, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}

        {/* Tiny summit marker — single point, no fill colour clash */}
        <circle cx="-1" cy="-2" r="0.6" className="fill-fg-dim" opacity="0.55" />

        {/* Corner crosshair (top-start) — gives a faint surveyor feel */}
        <g className="stroke-fg-dim" strokeWidth="0.18" opacity="0.45">
          <line x1="-44" y1="-40" x2="-38" y2="-40" />
          <line x1="-41" y1="-43" x2="-41" y2="-37" />
        </g>
        {/* Corner crosshair (bottom-end) */}
        <g className="stroke-fg-dim" strokeWidth="0.18" opacity="0.45">
          <line x1="38" y1="40" x2="44" y2="40" />
          <line x1="41" y1="37" x2="41" y2="43" />
        </g>
      </svg>

      {/* Soft vignette top + bottom so edges don't fight the chrome */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-bg to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
