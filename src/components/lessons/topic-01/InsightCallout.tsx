'use client';

import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

type Tone = 'accent' | 'cool' | 'warn' | 'danger' | 'ok';

const TONE_CLASSES: Record<Tone, { border: string; text: string; bg: string }> = {
  accent: { border: 'border-r-accent',        text: 'text-accent',        bg: 'bg-accent/5' },
  cool:   { border: 'border-r-accent-cool',   text: 'text-accent-cool',   bg: 'bg-accent-cool/5' },
  warn:   { border: 'border-r-status-warn',   text: 'text-status-warn',   bg: 'bg-status-warn/5' },
  danger: { border: 'border-r-status-danger', text: 'text-status-danger', bg: 'bg-status-danger/5' },
  ok:     { border: 'border-r-status-ok',     text: 'text-status-ok',     bg: 'bg-status-ok/5' },
};

export function InsightCallout({
  tone = 'cool',
  icon = 'spark',
  eyebrow,
  children,
  elevated = false,
  className,
}: {
  tone?: Tone;
  icon?: IconName;
  eyebrow: string;
  children: React.ReactNode;
  elevated?: boolean;
  className?: string;
}) {
  const t = TONE_CLASSES[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'p-5 sm:p-6 border-r-4 flex gap-3 sm:gap-4 items-start rounded-2xl border border-border',
        elevated ? 'bg-bg-elevated shadow-elevated' : 'bg-bg-card',
        t.border,
        t.bg,
        className
      )}
    >
      <Icon name={icon} size={22} className={cn('shrink-0 mt-0.5', t.text)} />
      <div className="flex-1 min-w-0">
        <div className={cn('text-sm font-display font-semibold mb-1.5 tracking-wider', t.text)}>
          {eyebrow}
        </div>
        <div className="text-fg leading-relaxed text-pretty text-sm sm:text-base">
          {children}
        </div>
      </div>
    </motion.div>
  );
}
