'use client';

import { motion } from 'framer-motion';

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[70vh] relative flex items-center justify-center overflow-hidden bg-bg"
    >
      <BackdropMap />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-5xl px-6"
      >
        {/* Impact Title */}
<h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          טעות של <span className="gradient-text text-accent">מילימטר</span> במפה.
          <br />
          יכולה לעלות בחיי אדם בשטח.
        </h1>

        {/* Narrative Copy */}
        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty font-medium">
          מפה צבאית היא לא ציור — היא תרגום מתמטי של העולם לדף. 
          לקרוא אותה לא נכון זה להפציץ את המקום הלא נכון. בשיעור הזה נלמד 
          את <span className="text-accent">שפת המפה</span> מהבסיס, כדי להפוך דף שטוח לתמונה מבצעית חדה.
        </p>

        {/* Dashboard Stats */}
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

function BackdropMap() {
  // Enhanced tactical background with animated contours and scan-line feel
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Dynamic Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {/* Simulated Contour Lines */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <motion.path
            key={i}
            d={`M -10 ${40 + i * 2} C 20 ${30 + i * 5}, 50 ${60 - i * 3}, 110 ${40 + i * i * 0.2}`}
            fill="none"
            stroke="currentColor"
            className="text-accent"
            strokeWidth="0.1"
            opacity={0.15 - i * 0.01}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.15 - i * 0.01 }}
            transition={{ duration: 3, delay: i * 0.1, ease: 'linear' }}
          />
        ))}

        {/* Central Crosshair / Tactical Marker */}
        <g className="text-accent/40">
          <line x1="50" y1="45" x2="50" y2="55" stroke="currentColor" strokeWidth="0.1" />
          <line x1="45" y1="50" x2="55" y2="50" stroke="currentColor" strokeWidth="0.1" />
          <circle cx="50" cy="50" r="12" fill="none" stroke="currentColor" strokeWidth="0.05" strokeDasharray="1 2" />
          
          <motion.circle 
            cx="50" cy="50" r="1" 
            fill="currentColor" 
            animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, duration: 2 }}
          />
          
          <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="0.1" opacity="0.2">
            <animate attributeName="r" values="10;30;10" dur="8s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>

      {/* Vignette & Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--bg)_80%)]" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}