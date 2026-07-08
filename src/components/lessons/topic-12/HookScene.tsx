'use client';

import { motion } from 'framer-motion';

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[70vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropGrid />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          המפה שמסבירה
          <br />
          איזה גשר <span className="text-accent">תפוצץ</span>.
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          לחיצה אחת על "Show Layers". בחירה שנייה: "Cost Surface". המפה מחזירה מסלול
          שעוקף 3 מארבים, חוסך 12 ק"מ דלק, ומגיע ליעד שעה לפני האויב. זה לא קסם —
          זה GIS מבצעי.
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

function BackdropGrid() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {/* Grid lines */}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`x${i}`} x1={i * 10} y1="0" x2={i * 10} y2="100" className="stroke-accent" strokeWidth="0.08" opacity="0.2" />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`y${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} className="stroke-accent" strokeWidth="0.08" opacity="0.2" />
        ))}

        {/* Cost heatmap (random colored cells) */}
        {Array.from({ length: 100 }).map((_, i) => {
          const x = i % 10;
          const y = Math.floor(i / 10);
          const cost = (Math.sin(x * 0.7) + Math.cos(y * 0.5) + 2) / 4;
          return (
            <motion.rect
              key={i}
              x={x * 10}
              y={y * 10}
              width="10"
              height="10"
              className={cost > 0.7 ? 'fill-status-danger' : cost > 0.5 ? 'fill-status-warn' : cost > 0.3 ? 'fill-status-ok' : 'fill-accent-cool'}
              opacity={cost * 0.12}
              initial={{ opacity: 0 }}
              animate={{ opacity: cost * 0.12 }}
              transition={{ duration: 1, delay: 0.3 + (i % 10) * 0.03 }}
            />
          );
        })}

        {/* Animated path */}
        <motion.path
          d="M 10 80 L 20 70 L 30 65 L 45 55 L 55 45 L 70 35 L 85 25 L 95 18"
          fill="none"
          className="stroke-accent"
          strokeWidth="0.4"
          strokeDasharray="2 1"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ duration: 3, delay: 1 }}
        />

        {/* Start and end points */}
        <motion.circle cx="10" cy="80" r="1.5" className="fill-accent-cool" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2 }} />
        <motion.circle cx="95" cy="18" r="1.5" className="fill-accent-hot" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.8 }} />

        {/* Moving "blip" along path */}
        <motion.circle
          r="0.8"
          className="fill-accent"
          animate={{ offsetDistance: ['0%', '100%'] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          style={{
            offsetPath: 'path("M 10 80 L 20 70 L 30 65 L 45 55 L 55 45 L 70 35 L 85 25 L 95 18")',
          }}
        />
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
