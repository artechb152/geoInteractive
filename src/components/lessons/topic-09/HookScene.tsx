'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

const STATS: { value: string; label: string; icon: IconName }[] = [
  { value: '21%', label: 'נפט עולמי במיצר הורמוז',  icon: 'oil' },
  { value: '4',   label: 'נקודות חנק קריטיות',     icon: 'crosshair' },
  { value: '1',   label: 'נילוס = 100 מיליון איש', icon: 'wave' },
  { value: '~35', label: 'דקות',                    icon: 'clock' },
];

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropGlobe />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <div className="chip border-accent/40 bg-accent/10 text-accent mb-8 mx-auto w-fit">
          <Icon name="globe" size={14} className="text-accent" />
          <span className="font-mono text-[11px]">שיעור 09</span>
          <span className="text-fg-dim">·</span>
          <span>משאבים, אנרגיה וגיאו־כלכלה</span>
        </div>

        <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          סכר אחד.
          <br />
          מיצר אחד. <span className="gradient-text">העולם רוטט.</span>
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          אתיופיה בונה סכר. 100 מיליון מצרים חוששים. החות'ים יורים על מיצר אחד —
          7% מסחר העולם עוצר. במאה ה-21, מים, נפט וגז הם נשק אסטרטגי. בוא נראה למה.
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

function BackdropGlobe() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {/* Globe outline with longitude/latitude */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1.5, delay: 0.3 }}
        >
          <circle cx="50" cy="50" r="32" fill="none" className="stroke-accent-cool" strokeWidth="0.15" opacity="0.6" />
          {[18, 24, 32].map((r, i) => (
            <ellipse key={i} cx="50" cy="50" rx={r} ry="32" fill="none" className="stroke-accent-cool" strokeWidth="0.1" opacity={0.3 - i * 0.05} />
          ))}
          {[-20, 0, 20].map((y, i) => (
            <ellipse key={i} cx="50" cy="50" rx="32" ry={Math.abs(28 - i * 4)} fill="none" className="stroke-accent-cool" strokeWidth="0.1" opacity="0.25" />
          ))}
        </motion.g>

        {/* Chokepoint markers around the globe */}
        {[
          { cx: 58, cy: 56, label: 'Hormuz' },
          { cx: 56, cy: 62, label: 'Bab' },
          { cx: 73, cy: 55, label: 'Malacca' },
          { cx: 35, cy: 58, label: 'Suez' },
        ].map((p, i) => (
          <motion.g
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1 + i * 0.2, duration: 0.4 }}
          >
            <circle cx={p.cx} cy={p.cy} r="1.1" className="fill-accent-hot" />
            <circle cx={p.cx} cy={p.cy} r="2.5" fill="none" className="stroke-accent-hot/50" strokeWidth="0.2">
              <animate attributeName="r" values="1.5;4;1.5" dur="2.5s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
              <animate attributeName="opacity" values="0.7;0;0.7" dur="2.5s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
            </circle>
          </motion.g>
        ))}

        {/* Shipping lanes */}
        {[
          'M30 70 Q 45 60 55 56 Q 65 52 80 50',
          'M20 50 Q 40 48 56 56 Q 68 60 85 65',
        ].map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            className="stroke-accent"
            strokeWidth="0.18"
            strokeDasharray="1.2 0.8"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.3 }}
            transition={{ duration: 2.5, delay: 0.8 + i * 0.4 }}
          />
        ))}

        {/* Animated ship */}
        <motion.circle
          r="0.5"
          className="fill-accent"
          animate={{ offsetDistance: ['0%', '100%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{
            offsetPath: 'path("M30 70 Q 45 60 55 56 Q 65 52 80 50")',
          }}
        />
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
