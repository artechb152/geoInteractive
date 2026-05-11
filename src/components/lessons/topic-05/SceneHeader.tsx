'use client';

import { motion } from 'framer-motion';

export function SceneHeader({
  step,
  eyebrow,
  title,
  intro,
}: {
  step: string;
  eyebrow: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-4xl mb-10"
    >
      <div className="flex items-center gap-3 text-xs font-mono text-fg-dim mb-4">
        <span className="text-accent">{step}</span>
        <span className="h-px flex-1 bg-border" />
        <span>{eyebrow}</span>
      </div>
      <h2 className="text-[clamp(1.75rem,4.5vw,3.5rem)] font-bold tracking-tight text-balance leading-tight">
        {title}
      </h2>
      {intro && (
        <p className="mt-5 text-fg-muted text-base sm:text-lg lg:text-xl leading-relaxed text-pretty">{intro}</p>
      )}
    </motion.header>
  );
}
