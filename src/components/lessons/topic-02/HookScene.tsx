'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

const STATS: { value: string; label: string; icon: IconName }[] = [
  { value: '4',   label: 'נושאים בשיעור',           icon: 'layers' },
  { value: '2',   label: 'שפות מפה צבאיות',         icon: 'crosshair' },
  { value: '5+',  label: 'צורות נוף לזיהוי',        icon: 'mountain' },
  { value: '~50', label: 'דקות למידה',               icon: 'clock' },
];

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden bg-bg"
    >
      <BackdropMap />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-5xl px-6"
      >
        {/* Breadcrumb Tag */}
        <div className="chip border-accent/40 bg-accent/10 text-accent mb-10 mx-auto w-fit px-4 py-1 rounded-full flex items-center gap-2">
          <Icon name="globe" size={14} className="text-accent" />
          <span className="font-mono text-[11px] tracking-wider uppercase">שיעור 02</span>
          <span className="text-fg-dim">|</span>
          <span className="text-sm font-medium">קרטוגרפיה וקריאת מפות</span>
        </div>

        {/* Impact Title */}
<h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          טעות של <span className="gradient-text">מילימטר</span> במפה.
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
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1, delayChildren: 0.6 } },
          }}
          className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
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

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="mt-16 flex flex-col items-center gap-3 text-fg-muted text-sm font-display font-semibold tracking-wider"
        >
          <span>גלול להתחלת המשימה</span>
          <motion.div
            animate={{ y: [0, 10, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="h-10 w-px bg-gradient-to-b from-accent to-transparent"
          />
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