import type { IconName } from '@/components/Icon';

/**
 * IntelCard — editorial pull-quote card for historical-example callouts.
 *
 * Structural choices that make it read as a magazine excerpt, not a card:
 *  - No border. Whitespace + the white surface on the cream page define it.
 *  - Headline first. No kicker, no eyebrow — the claim leads.
 *  - A short sage stroke under the headline acts as a typographic
 *    signature, matching the green accent bar on the OnboardingScene
 *    accordions so all "historical" surfaces read as one family.
 *  - The "place" lives at the bottom as a quote attribution
 *    (em-dash + text), not as a metadata header.
 *  - Per a site-wide design pass, the tiny topic icon that used to sit
 *    on the start side of the attribution row was removed.
 *
 * Server-renderable. Fully static — no hover, no animation, no client JS.
 *
 * `icon` and `accent` props are kept (optional) so every existing
 * caller continues to compile; they're intentionally unused now.
 */
type IntelCardProps = {
  place: string;
  headline: string;
  lesson: string;
  /** Unused. Kept for backwards compatibility with existing callers. */
  icon?: IconName;
  /** Unused. Kept for backwards compatibility with existing callers. */
  accent?: string;
};

export function IntelCard({ place, headline, lesson }: IntelCardProps) {
  return (
    <article className="bg-bg-elevated rounded-md p-3.5 md:p-4">
      {/* Headline as the lead */}
      <h3 className="font-display font-bold text-[15px] md:text-base leading-snug text-balance text-fg">
        {headline}
      </h3>

      {/* Typographic signature — always sage, mirrors the accordion bar
          in the OnboardingScene's "lesson context" accordions. */}
      <span
        aria-hidden
        className="mt-2 mb-2.5 inline-block h-[3px] w-8 rounded-full bg-brand-dark"
      />

      {/* Body */}
      <p className="text-[13px] md:text-sm text-fg-muted leading-relaxed text-pretty">
        {lesson}
      </p>

      {/* Quote-style attribution at the bottom */}
      <div className="mt-3.5 text-[11px] md:text-xs font-display font-medium tracking-wide text-fg-dim">
        <span aria-hidden className="text-fg-dim/55 me-1.5">—</span>
        <span>{place}</span>
      </div>
    </article>
  );
}
