'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropCity />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <div className="inline-flex items-center gap-2.5 mb-10 mx-auto px-4 py-2 rounded-full border border-accent/50 bg-accent/12 shadow-glow w-fit">
          <Icon name="capital" size={16} className="text-accent" />
          <span className="font-display font-bold text-sm text-accent-hover tracking-wider">שיעור 10</span>
          <span className="text-fg-dim text-sm" aria-hidden>·</span>
          <span className="text-sm font-display font-semibold text-fg">לחימה אורבנית · MOUT</span>
        </div>


        <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          10 מ׳ בסמטה.
          <br />
          30 קומות <span className="gradient-text">מעל</span>.
          <br />
          20 מ׳ <span className="gradient-text">מתחת</span>.
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          בעיר, היתרון של טנק מצטמצם למטרים. הצלף בקומה ה-15 רואה אותך לפני שאתה רואה אותו.
          מתחת לרגליך — רשת מנהרות שלמה. בשיעור הזה נלמד את הקרב הכי מורכב שיש.
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

function BackdropCity() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {/* City skyline silhouettes (foreground) */}
        <motion.g
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.45, y: 0 }}
          transition={{ duration: 1.5, delay: 0.3 }}
        >
          {/* Buildings of different heights */}
          {[
            { x: 4,  w: 8, h: 35 },
            { x: 13, w: 5, h: 50 },
            { x: 19, w: 9, h: 28 },
            { x: 29, w: 6, h: 60 },
            { x: 36, w: 10, h: 42 },
            { x: 47, w: 5, h: 70 },
            { x: 53, w: 8, h: 48 },
            { x: 62, w: 7, h: 55 },
            { x: 70, w: 9, h: 32 },
            { x: 80, w: 6, h: 58 },
            { x: 87, w: 8, h: 38 },
            { x: 96, w: 4, h: 45 },
          ].map((b, i) => (
            <g key={i}>
              <rect
                x={b.x}
                y={100 - b.h}
                width={b.w}
                height={b.h}
                className="fill-terrain-ridge"
              />
              {/* Windows */}
              {Array.from({ length: Math.floor(b.h / 6) }).map((_, j) => (
                <rect
                  key={j}
                  x={b.x + 1}
                  y={100 - b.h + 3 + j * 6}
                  width={b.w - 2}
                  height="1.2"
                  className="fill-accent"
                  opacity={0.25 + (j % 3) * 0.15}
                />
              ))}
            </g>
          ))}
        </motion.g>

        {/* Underground tunnels (animated) */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1.5, delay: 0.8 }}
        >
          <line x1="0" y1="98" x2="100" y2="98" className="stroke-fg-dim" strokeWidth="0.2" strokeDasharray="0.5 0.3" />
          {/* Underground network */}
          <path
            d="M10 100 Q 30 105 50 102 T 90 100"
            fill="none"
            className="stroke-accent-hot"
            strokeWidth="0.3"
            strokeDasharray="1 0.8"
          />
          <path
            d="M5 105 L 25 108 L 50 106 L 75 108 L 95 105"
            fill="none"
            className="stroke-accent-hot"
            strokeWidth="0.2"
            strokeDasharray="0.8 0.6"
          />
        </motion.g>

        {/* Threat markers (snipers in high buildings) */}
        {[
          { x: 30, y: 45 },
          { x: 47, y: 32 },
          { x: 80, y: 47 },
        ].map((p, i) => (
          <motion.g
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.2 + i * 0.2, duration: 0.4 }}
          >
            <circle cx={p.x} cy={p.y} r="0.9" className="fill-accent-hot" />
            <circle cx={p.x} cy={p.y} r="2.5" fill="none" className="stroke-accent-hot/50" strokeWidth="0.15">
              <animate attributeName="r" values="1.5;4;1.5" dur="2.5s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
              <animate attributeName="opacity" values="0.7;0;0.7" dur="2.5s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
            </circle>
          </motion.g>
        ))}

        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
