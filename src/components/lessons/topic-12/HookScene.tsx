'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

const STATS: { value: string; label: string; icon: IconName }[] = [
  { value: '9+',  label: 'לוויינים מעלינו בכל רגע',    icon: 'satellite' },
  { value: '~30', label: 'ס"מ — רזולוציית לוויין',   icon: 'eye' },
  { value: 'SAR', label: 'רואה דרך עננים וערפל',     icon: 'bolt' },
  { value: '~50', label: 'דקות',                       icon: 'clock' },
];

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropSatellites />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <div className="chip border-accent/40 bg-accent/10 text-accent mb-8 mx-auto w-fit">
          <Icon name="satellite" size={14} className="text-accent" />
          <span className="font-mono text-[11px]">שיעור 12</span>
          <span className="text-fg-dim">·</span>
          <span>GEOINT וחישה מרחוק</span>
        </div>

        <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          9 לוויינים <span className="gradient-text">מסתכלים</span>
          <br />
          עליך. עכשיו.
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          תמונה בוורוד? סנסור תרמי. עננים? SAR חודר. רחפן? רואה מתחת לרדאר.
          וכל זה — הצלב על מפה אחת בזמן אמת. בשיעור הזה נלמד את המודיעין שמשנה מלחמות.
        </p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1, delayChildren: 0.6 } },
          }}
          className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto"
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

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          onClick={() => document.getElementById('scene-onboarding')?.scrollIntoView({ behavior: 'smooth' })}
          className="mt-14 group flex flex-col items-center gap-3 text-fg-dim text-xs hover:text-accent transition-colors mx-auto cursor-pointer"
          aria-label="התחל את השיעור"
        >
          <span className="font-mono tracking-widest uppercase group-hover:text-accent transition-colors">לחץ כדי להתחיל</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="size-10 rounded-full border border-border-strong group-hover:border-accent flex items-center justify-center transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 5l4 4 4-4" />
            </svg>
          </motion.div>
        </motion.button>
      </motion.div>
    </section>
  );
}

function BackdropSatellites() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {/* Earth curve at the bottom */}
        <motion.ellipse
          cx="50"
          cy="120"
          rx="80"
          ry="40"
          className="fill-terrain-sand/10 stroke-terrain-sand/30"
          strokeWidth="0.2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1.5 }}
        />

        {/* Orbital paths */}
        {[
          { ry: 35, opacity: 0.15, dur: 30 },
          { ry: 45, opacity: 0.12, dur: 45 },
          { ry: 55, opacity: 0.09, dur: 60 },
        ].map((o, i) => (
          <ellipse
            key={i}
            cx="50"
            cy="80"
            rx="60"
            ry={o.ry}
            fill="none"
            className="stroke-accent-cool"
            strokeWidth="0.15"
            strokeDasharray="2 1.5"
            opacity={o.opacity}
          />
        ))}

        {/* Satellites orbiting */}
        {[
          { delay: 0, dur: 24 },
          { delay: 3, dur: 28 },
          { delay: 8, dur: 32 },
          { delay: 12, dur: 36 },
          { delay: 5, dur: 30, ring: 1 },
          { delay: 9, dur: 38, ring: 1 },
          { delay: 14, dur: 42, ring: 2 },
        ].map((s, i) => {
          const ring = s.ring || 0;
          const ry = 35 + ring * 10;
          return (
            <motion.g
              key={i}
              animate={{ rotate: 360 }}
              transition={{ duration: s.dur, repeat: Infinity, ease: 'linear', delay: s.delay }}
              style={{ transformOrigin: '50px 80px' }}
            >
              <g transform={`translate(${50 + 60} ${80})`}>
                <rect x="-1" y="-0.5" width="2" height="1" className="fill-accent" />
                {/* Solar panels */}
                <rect x="-3" y="-0.4" width="1.5" height="0.8" className="fill-accent-cool" opacity="0.7" />
                <rect x="1.5" y="-0.4" width="1.5" height="0.8" className="fill-accent-cool" opacity="0.7" />
                {/* Beam to ground */}
                <line x1="0" y1="0.5" x2="0" y2="40" className="stroke-accent" strokeWidth="0.1" strokeDasharray="0.5 0.4" opacity="0.4" />
              </g>
              <ellipse cx="50" cy="80" rx="60" ry={ry} fill="none" stroke="transparent" />
            </motion.g>
          );
        })}

        {/* Cone of view from a satellite */}
        <motion.polygon
          points="50,5 32,55 68,55"
          className="fill-accent"
          opacity="0.05"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.06 }}
          transition={{ duration: 2, delay: 1 }}
        />

        {/* Ground target */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.8 }}
        >
          <circle cx="50" cy="55" r="1.5" className="fill-accent-hot" />
          <circle cx="50" cy="55" r="3" fill="none" className="stroke-accent-hot/50" strokeWidth="0.2">
            <animate attributeName="r" values="2;5;2" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2.5s" repeatCount="indefinite" />
          </circle>
        </motion.g>
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
