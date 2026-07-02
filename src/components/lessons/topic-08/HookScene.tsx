'use client';

import { motion } from 'framer-motion';
import { Icon } from '@/components/Icon';

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
        <div className="inline-flex items-center gap-2.5 mb-10 mx-auto px-4 py-2 rounded-full border border-accent/50 bg-accent/12 w-fit">
          <Icon name="truck" size={16} className="text-accent" />
          <span className="font-display font-bold text-sm text-accent tracking-wider">שיעור 08</span>
          <span className="text-fg-dim text-sm" aria-hidden>·</span>
          <span className="text-sm font-display font-semibold text-fg">תשתיות וגיאוגרפיה של לוגיסטיקה</span>
        </div>


        <h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          20% <span className="text-accent">נלחמים</span>.
          <br />
          80% מאכילים אותם.
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          רומל דרס את חיל המשוריינים הבריטי בצפון אפריקה במשך שנתיים. אבל כשחתכו לו את קווי האספקה
          דרך הים התיכון, הוא נסוג 1,500 קילומטרים תוך מספר חודשים. בשיעור הזה נלמד למה קווי האספקה,
          ולא כמות הטנקים, קובעים מי ממשיך להילחם.
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
            className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-xl bg-accent text-bg-elevated font-display font-semibold text-base hover:bg-accent-hover transition-all duration-200"
            aria-label="התחל את השיעור"
          >
            <span>לחץ כדי להתחיל</span>
          </button>
        </motion.div>
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
