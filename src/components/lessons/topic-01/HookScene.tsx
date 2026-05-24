'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';

const STATS: { value: string; label: string; icon: IconName }[] = [
  { value: '5',   label: 'ממדי לחימה',           icon: 'layers' },
  { value: '3',   label: 'רמות מלחמה',           icon: 'pyramid' },
  { value: '20',  label: 'שנים — אפגניסטן',      icon: 'hourglass' },
  { value: '~35', label: 'דקות',                 icon: 'clock' },
];

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
        <div className="chip border-accent/40 bg-accent/10 text-accent mb-8 mx-auto w-fit">
          <Icon name="globe" size={14} className="text-accent" />
          <span className="font-mono text-xs">שיעור 01</span>
          <span className="text-fg-dim">·</span>
          <span>מבוא · מרחב, כוח, אסטרטגיה</span>
        </div>

<h1 className="text-[clamp(2.25rem,7vw,5.5rem)] font-bold tracking-tight text-balance leading-[1.05]">
          המרחב איננו רק זירת הפעולה.
          <br />
          <span className="gradient-text">הוא המימד המערכתי שמכריע אותה.</span>
        </h1>

        <p className="mt-8 text-fg-muted text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed text-pretty">
          המלחמה המודרנית לא מוכרעת ביחס כוחות — היא מוכרעת ב-5 ממדים,
          3 רמות פיקוד, ובצד השלישי שכולם שוכחים: הזמן. בשיעור הזה תבין
          איך המרחב הופך לשחקן הראשי, ולמה רחפן של 300 דולר מפיל מטוס של 80 מיליון.
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
          onClick={() => window.dispatchEvent(new CustomEvent('learn:next'))}
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
          className="absolute size-2.5 rounded-full bg-accent shadow-glow"
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
