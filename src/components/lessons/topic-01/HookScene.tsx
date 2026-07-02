'use client';

import { motion } from 'framer-motion';
import { Icon } from '@/components/Icon';

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[88vh] relative flex items-center justify-center overflow-hidden"
    >
      <BackdropConstellation />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-4xl px-6"
      >
        <div className="inline-flex items-center gap-2.5 mb-10 mx-auto px-4 py-2 rounded-full border border-accent/50 bg-accent/12 w-fit">
          <Icon name="globe" size={16} className="text-accent" />
          <span className="font-display font-bold text-sm text-accent tracking-wider">שיעור 01</span>
          <span className="text-fg-dim text-sm" aria-hidden>·</span>
          <span className="text-sm font-display font-semibold text-fg">מבוא · מרחב, כוח, אסטרטגיה</span>
        </div>


<h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          המרחב איננו רק זירת הפעולה.
          <br />
          <span className="gradient-text text-accent">הוא המימד המערכתי שמכריע אותה.</span>
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          המלחמה המודרנית לא מוכרעת ביחס כוחות — היא מוכרעת ב-5 ממדים,
          3 רמות פיקוד, ובתלות במימד הזמן והמרחב. בשיעור הזה תבין
          איך המרחב הופך לשחקן הראשי, ולמה רחפן של 300 דולר מפיל מטוס של 80 מיליון.
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
            className="inline-flex items-center gap-3 px-7 py-3.5 rounded-xl bg-accent text-bg-elevated font-display font-semibold text-base hover:bg-accent-hover transition-all duration-200"
            aria-label="התחל את השיעור"
          >
            <span>לחץ כדי להתחיל</span>
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}

function BackdropConstellation() {
  // Pseudo-random but deterministic dot field + concentric rings
  const dots = Array.from({ length: 60 }, (_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const x = (seed % 1000) / 10;
    const y = ((seed * 13) % 1000) / 10;
    const r = ((seed * 7) % 30) / 100 + 0.2;
    return { x, y, r, delay: (i % 10) * 0.2 };
  });

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={d.r}
            className="fill-fg/40"
          >
            <animate
              attributeName="opacity"
              values="0.2;0.6;0.2"
              dur={`${3 + (i % 3)}s`}
              begin={`${d.delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-accent/10"
            style={{ width: `${i * 240}px`, height: `${i * 240}px` }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 0.5, scale: 1 }}
            transition={{ duration: 1.4, delay: i * 0.12 }}
          />
        ))}
        <motion.div
          className="absolute size-2.5 rounded-full bg-accent"
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
