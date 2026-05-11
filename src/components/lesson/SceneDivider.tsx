'use client';

import { motion } from 'framer-motion';

/**
 * Scene-to-scene divider used between scenes inside a lesson.
 * Single source of truth — every topic's local `./SceneDivider.tsx` re-exports this.
 *
 * Visual language matches the landing page: sage-tinted vertical light beam,
 * pill label in font-display semibold with a small brand dot.
 */
export function SceneDivider({ next }: { next?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center py-6"
      aria-hidden
    >
      <div className="relative h-16 w-px overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-brand/45 to-transparent"
          initial={{ y: '-100%' }}
          whileInView={{ y: '100%' }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-border-strong/50 to-transparent" />
      </div>
      {next && (
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-subtle bg-bg-elevated text-sm font-display font-semibold tracking-wider text-fg-muted">
          <span className="size-1.5 rounded-full bg-brand shrink-0" aria-hidden />
          {next}
        </div>
      )}
    </motion.div>
  );
}
