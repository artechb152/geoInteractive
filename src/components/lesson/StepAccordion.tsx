import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

/**
 * StepAccordionItem — the "לפני שמתחילים" step-accordion chrome, lifted
 * verbatim from topic-01/OnboardingScene (the design reference every other
 * topic's onboarding accordion should visually match). Callers own their
 * own step data/copy and only pass the panel body as children, so content
 * never lives in this file.
 */
type StepAccordionItemProps = {
  index: number;
  label: ReactNode;
  active: boolean;
  expanded: boolean;
  passed: boolean;
  onToggle: () => void;
  panelId: string;
  children: ReactNode;
};

export function StepAccordionItem({
  index,
  label,
  active,
  expanded,
  passed,
  onToggle,
  panelId,
  children,
}: StepAccordionItemProps) {
  return (
    <div
      className={cn(
        'surface overflow-hidden transition-all duration-300 ease-snap',
        active
          ? 'border-brand/45 bg-bg-elevated'
          : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
        passed && !active && 'opacity-80'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="w-full p-4 text-right flex items-center gap-3 relative"
      >
        <span
          className={cn(
            'size-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ease-snap',
            active || passed ? 'bg-brand-dark text-bg-elevated border-brand-dark' : 'bg-bg-accent text-fg-muted border-border'
          )}
        >
          {passed && !active ? (
            <Icon name="check" size={16} strokeWidth={2.5} />
          ) : (
            <span className="font-display text-sm font-bold">{index + 1}</span>
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold leading-tight transition-colors text-black text-base md:text-lg">
            {label}
          </div>
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className={cn('shrink-0 inline-flex', expanded ? 'text-brand-dark' : 'text-fg-dim')}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key={`panel-${panelId}`}
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-brand/20 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** First block of a panel (`mt-3` top gap, matches topic-01's first section). */
export function AccordionSection({ bordered = false, children }: { bordered?: boolean; children: ReactNode }) {
  return <div className={bordered ? 'pt-2 border-t border-border-subtle' : 'mt-3'}>{children}</div>;
}

export function AccordionSectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-base font-display font-bold text-black mb-1.5 tracking-wider flex items-center gap-1.5">
      {children}
    </div>
  );
}

/**
 * Small eyebrow line used ONLY where a panel also has its own
 * AccordionSectionTitle (the topic's real headline) — that title carries
 * the primary-heading weight matching topic-01's accordion header, so this
 * kicker stays deliberately secondary instead of competing with it.
 */
export function AccordionKicker({ children }: { children: ReactNode }) {
  return (
    <div className="text-sm font-display font-semibold text-brand-dark mb-1 tracking-wider flex items-center gap-1.5">
      {children}
    </div>
  );
}

export function AccordionSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h4 className="font-display font-bold text-base sm:text-lg leading-tight text-balance text-black mb-2">
      {children}
    </h4>
  );
}

type AccordionSectionTextProps = { children?: ReactNode; dangerousHtml?: string };

export function AccordionSectionText({ children, dangerousHtml }: AccordionSectionTextProps) {
  if (dangerousHtml !== undefined) {
    return (
      <p
        className="text-base leading-relaxed text-black text-pretty"
        dangerouslySetInnerHTML={{ __html: dangerousHtml }}
      />
    );
  }
  return <p className="text-base leading-relaxed text-black text-pretty">{children}</p>;
}
