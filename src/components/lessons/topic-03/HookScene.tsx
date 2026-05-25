'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropCompass />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <div className="inline-flex items-center gap-2.5 mb-10 mx-auto px-4 py-2 rounded-full border border-accent/50 bg-accent/12 shadow-glow w-fit">
          <Icon name="compass" size={16} className="text-accent" />
          <span className="font-display font-bold text-sm text-accent-hover tracking-wider">שיעור 03</span>
          <span className="text-fg-dim text-sm" aria-hidden>·</span>
          <span className="text-sm font-display font-semibold text-fg">ניווטים</span>
        </div>


<h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          להגיע ליעד בדיוק מושלם,
          <br />
          <span className="gradient-text">גם כשהטכנולוגיה מפסיקה לעבוד.</span>
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

function BackdropCompass() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="-50 -50 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
      >
        {/* Outer compass rings */}
        {[40, 32, 24].map((r, i) => (
          <motion.circle
            key={r}
            cx="0"
            cy="0"
            r={r}
            fill="none"
            stroke="currentColor"
            className="text-accent"
            strokeWidth="0.15"
            opacity={0.2 - i * 0.03}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.2 - i * 0.03 }}
            transition={{ duration: 2, delay: i * 0.2 }}
          />
        ))}

        {/* Cardinal markers */}
        {[
          { angle: 0, label: 'N' },
          { angle: 90, label: 'E' },
          { angle: 180, label: 'S' },
          { angle: 270, label: 'W' },
        ].map((m) => {
          const a = ((m.angle - 90) * Math.PI) / 180;
          const x = Math.cos(a) * 36;
          const y = Math.sin(a) * 36;
          return (
            <text
              key={m.label}
              x={x}
              y={y + 1}
              textAnchor="middle"
              className="fill-fg-dim text-[3px] font-display font-bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
      >
              {m.label}
            </text>
          );
        })}

        {/* Tick marks every 30° */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 - 90) * (Math.PI / 180);
          return (
            <line
              key={i}
              x1={Math.cos(a) * 28}
              y1={Math.sin(a) * 28}
              x2={Math.cos(a) * 30}
              y2={Math.sin(a) * 30}
              className="stroke-fg-dim"
              strokeWidth="0.2"
              opacity="0.3"
            />
          );
        })}

        {/* Rotating needle */}
        <motion.g
          animate={{ rotate: [0, 30, -10, 45, 15, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '0 0' }}
        >
          <polygon points="0,-22 -2,0 0,2 2,0" className="fill-accent" />
          <polygon points="0,22 -2,0 0,-2 2,0" className="fill-fg-dim opacity-50" />
        </motion.g>

        {/* Center pin */}
        <circle cx="0" cy="0" r="1.2" className="fill-bg stroke-accent" strokeWidth="0.4" />
        <circle cx="0" cy="0" r="3" fill="none" className="stroke-accent/40" strokeWidth="0.3">
          <animate attributeName="r" values="2;5;2" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
