import { Icon, type IconName } from '@/components/Icon';
import { cn } from '@/lib/utils';

/**
 * IntelCard — editorial pull-quote card.
 *
 * Structural choices that make it read as a magazine excerpt, not a card:
 *  - No border. Whitespace + the white surface on the cream page define it.
 *  - Headline first. No kicker, no eyebrow — the claim leads.
 *  - A short colour stroke under the headline acts as a typographic signature
 *    in the card's accent colour, replacing the generic eyebrow dot.
 *  - The "place" lives at the bottom as a quote attribution (em-dash + text),
 *    not as a metadata header.
 *  - The icon is the smallest typographic element on the card (11–12px),
 *    sitting inline with the attribution like a typesetter's mark.
 *
 * Server-renderable. Fully static — no hover, no animation, no client JS.
 */
type IntelCardProps = {
  place: string;
  headline: string;
  lesson: string;
  icon: IconName;
  /** Tailwind text-* class for the byline icon, e.g. `text-accent-cool` */
  accent: string;
};

// Static map so Tailwind JIT compiles every bg-* variant we hand off.
const STROKE_BY_ACCENT: Record<string, string> = {
  'text-accent': 'bg-accent',
  'text-accent-hover': 'bg-accent-hover',
  'text-accent-cool': 'bg-accent-cool',
  'text-accent-hot': 'bg-accent-hot',
  'text-accent-intel': 'bg-accent-intel',
  'text-brand': 'bg-brand',
  'text-brand-dark': 'bg-brand-dark',
  'text-terrain-sky': 'bg-terrain-sky',
  'text-terrain-ridge': 'bg-terrain-ridge',
  'text-terrain-olive': 'bg-terrain-olive',
  'text-terrain-sand': 'bg-terrain-sand',
  'text-terrain-steel': 'bg-terrain-steel',
};

export function IntelCard({
  place,
  headline,
  lesson,
  icon,
  accent,
}: IntelCardProps) {
  const stroke = STROKE_BY_ACCENT[accent] ?? 'bg-accent';

  return (
    <article className="bg-bg-elevated rounded-md p-3.5 md:p-4">
      {/* Headline as the lead */}
      <h3 className="font-display font-bold text-[15px] md:text-base leading-snug text-balance text-fg">
        {headline}
      </h3>

      {/* Typographic signature — short coloured stroke */}
      <span
        aria-hidden
        className={cn(
          'mt-2 mb-2.5 inline-block h-[3px] w-8 rounded-full',
          stroke,
        )}
      />

      {/* Body */}
      <p className="text-[13px] md:text-sm text-fg-muted leading-relaxed text-pretty">
        {lesson}
      </p>

      {/* Quote-style attribution at the bottom */}
      <div className="mt-3.5 flex items-center gap-1.5 text-[11px] md:text-xs font-display font-medium tracking-wide text-fg-dim">
        <Icon name={icon} size={11} className={accent} />
        <span aria-hidden className="text-fg-dim/55">—</span>
        <span>{place}</span>
      </div>
    </article>
  );
}
