'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

const STATS: { value: string; label: string; icon: IconName }[] = [
  { value: '80%', label: 'שיעור הלוגיסטיקה בצבא',   icon: 'truck' },
  { value: '2',   label: 'צירי אספקה (MSR + ASR)',  icon: 'compass' },
  { value: '1',   label: 'חתך = אוגדה ללא דלק',     icon: 'fuel' },
  { value: '~40', label: 'דקות',                    icon: 'clock' },
];

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropSupplyLines />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <div className="chip border-accent/40 bg-accent/10 text-accent mb-8 mx-auto w-fit">
          <Icon name="truck" size={14} className="text-accent" />
          <span className="font-mono text-[11px]">שיעור 08</span>
          <span className="text-fg-dim">·</span>
          <span>תשתיות וגיאוגרפיה של לוגיסטיקה</span>
        </div>

        <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          20% <span className="gradient-text">נלחמים</span>.
          <br />
          80% מאכילים אותם.
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          רומל אכל את חיל המשוריינים האנגלי במשך שנתיים. בסוף — חתכו לו את קווי האספקה במזרח התיכון.
          תוך חודש הוא נסוג 1,500 קילומטרים. בשיעור הזה נלמד איך הצינור שקובע את המלחמה.
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

function BackdropSupplyLines() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {/* Network of supply lines */}
        {[
          { d: 'M5 80 Q 25 75 50 70 T 95 50', delay: 0 },
          { d: 'M5 80 Q 25 78 45 75 Q 65 72 95 65', delay: 0.3 },
          { d: 'M5 80 Q 35 70 55 55 Q 75 40 95 30', delay: 0.6 },
        ].map((p, i) => (
          <motion.path
            key={i}
            d={p.d}
            fill="none"
            stroke="currentColor"
            className="text-accent"
            strokeWidth="0.3"
            strokeDasharray="2 1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.25 }}
            transition={{ duration: 3, delay: p.delay }}
          />
        ))}

        {/* Hub markers along supply lines */}
        {[
          { cx: 5, cy: 80, r: 1.4, c: 'cool', delay: 1.2, label: 'בסיס' },
          { cx: 30, cy: 76, r: 0.9, c: 'fg-dim', delay: 1.4 },
          { cx: 55, cy: 65, r: 0.9, c: 'fg-dim', delay: 1.6 },
          { cx: 75, cy: 55, r: 0.9, c: 'fg-dim', delay: 1.8 },
          { cx: 95, cy: 45, r: 1.4, c: 'hot', delay: 2.0, label: 'חזית' },
        ].map((m, i) => (
          <motion.g
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: m.delay, duration: 0.4 }}
          >
            <circle
              cx={m.cx}
              cy={m.cy}
              r={m.r}
              className={
                m.c === 'cool' ? 'fill-accent-cool' :
                m.c === 'hot' ? 'fill-accent-hot' :
                'fill-fg-dim'
              }
              opacity={m.c === 'fg-dim' ? 0.4 : 0.6}
            />
          </motion.g>
        ))}

        {/* Moving supply blip along the main line */}
        <motion.circle
          r="0.7"
          className="fill-accent"
          animate={{ offsetDistance: ['0%', '100%'] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          style={{
            offsetPath: 'path("M5 80 Q 25 75 50 70 T 95 50")',
          }}
        />

        {/* Bottom ridge silhouette */}
        <path
          d="M0 88 L20 82 L40 86 L60 80 L80 84 L100 80 L100 100 L0 100 Z"
          className="fill-terrain-ridge/15"
        />
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
