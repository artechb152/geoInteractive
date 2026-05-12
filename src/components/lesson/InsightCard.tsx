import { type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

/**
 * InsightCard — the canonical static-text card across lessons.
 *
 * Shares the visual language of IntelCard:
 *   - White surface (`bg-bg-elevated`) on the cream page
 *   - A short coloured stroke as the typographic signature
 *   - font-display for the headline
 *   - No chrome (no border, no shadow, no hover)
 *   - Server-renderable
 *
 * Use for:
 *   - "Tip / insight" callouts (`icon` + body)
 *   - Definition cards (`title` + body)
 *   - Grid items with a labelled section (`label` + `title` + body)
 *   - Anything that's a static, text-bearing rectangle in a lesson scene.
 */
export type InsightTone =
  | 'accent'
  | 'accentHover'
  | 'brand'
  | 'brandDark'
  | 'cool'
  | 'sky'
  | 'hot'
  | 'warn'
  | 'ok'
  | 'intel'
  | 'ridge'
  | 'sand';

const STROKE_BY_TONE: Record<InsightTone, string> = {
  accent: 'bg-accent',
  accentHover: 'bg-accent-hover',
  brand: 'bg-brand',
  brandDark: 'bg-brand-dark',
  cool: 'bg-accent-cool',
  sky: 'bg-terrain-sky',
  hot: 'bg-accent-hot',
  warn: 'bg-status-warn',
  ok: 'bg-status-ok',
  intel: 'bg-accent-intel',
  ridge: 'bg-terrain-ridge',
  sand: 'bg-terrain-sand',
};

const TEXT_BY_TONE: Record<InsightTone, string> = {
  accent: 'text-accent-hover',
  accentHover: 'text-accent-hover',
  brand: 'text-brand-dark',
  brandDark: 'text-brand-dark',
  cool: 'text-accent-cool',
  sky: 'text-terrain-sky',
  hot: 'text-accent-hot',
  warn: 'text-status-warn',
  ok: 'text-status-ok',
  intel: 'text-accent-intel',
  ridge: 'text-terrain-ridge',
  sand: 'text-terrain-sand',
};

type InsightCardProps = {
  /** Small kicker label above the title, e.g. "בחורף", "שכבה 1", "מחסה" */
  label?: string;
  /** Bold lead headline */
  title?: string;
  /** Small inline icon next to the label */
  icon?: IconName;
  /** Colours the stroke + label + icon */
  tone?: InsightTone;
  /** Body text — required */
  children: ReactNode;
  /** Optional extra classes for the outer article */
  className?: string;
};

export function InsightCard({
  label,
  title,
  icon,
  tone = 'accent',
  children,
  className,
}: InsightCardProps) {
  const stroke = STROKE_BY_TONE[tone];
  const textTone = TEXT_BY_TONE[tone];
  const hasEyebrow = !!label || !!icon;

  return (
    <article
      className={cn(
        'bg-bg-elevated rounded-md p-3 md:p-3.5',
        className,
      )}
    >
      {hasEyebrow ? (
        <div className="flex items-center gap-2 mb-2.5">
          <span
            aria-hidden
            className={cn('inline-block h-[3px] w-7 rounded-full shrink-0', stroke)}
          />
          {icon && <Icon name={icon} size={13} className={cn('shrink-0', textTone)} />}
          {label && (
            <span
              className={cn(
                'text-sm font-display font-semibold tracking-wider',
                textTone,
              )}
            >
              {label}
            </span>
          )}
        </div>
      ) : (
        <span
          aria-hidden
          className={cn('inline-block h-[3px] w-7 rounded-full mb-3', stroke)}
        />
      )}

      {title && (
        <h4 className="font-display font-bold text-[15px] md:text-base leading-snug text-balance text-fg mb-2">
          {title}
        </h4>
      )}

      <div className="text-sm md:text-[15px] text-fg-muted leading-relaxed text-pretty">
        {children}
      </div>
    </article>
  );
}
