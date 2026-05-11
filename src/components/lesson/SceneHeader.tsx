'use client';

import { motion } from 'framer-motion';

/**
 * Section header used at the top of each Scene inside a lesson.
 * Single source of truth — every topic's local `./SceneHeader.tsx` re-exports this.
 *
 * Visual language matches the landing page eyebrow pattern:
 *   - font-display (Rubik) semibold for the meta line
 *   - sage-dark step number with an orange dot
 *   - tracking-wider on meta, not the aggressive 0.25em from earlier drafts
 *   - leading-[1.05] balanced title
 */
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
      <div className="flex items-center gap-3 text-sm md:text-[15px] font-display font-semibold tracking-wider mb-5">
        <span className="inline-flex items-center gap-2 text-brand-dark">
          <span className="size-2 rounded-full bg-accent shrink-0" aria-hidden />
          {step}
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="text-fg-muted">{eyebrow}</span>
      </div>
      <h2 className="font-display font-bold tracking-tight text-balance leading-[1.05] text-[clamp(1.75rem,4.5vw,3.5rem)]">
        {title}
      </h2>
      {intro && (
        <p className="mt-5 text-fg-muted text-base sm:text-lg lg:text-xl leading-relaxed text-pretty">
          {intro}
        </p>
      )}
    </motion.header>
  );
}
