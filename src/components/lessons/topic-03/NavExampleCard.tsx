'use client';

import { Icon, type IconName } from '@/components/Icon';

/**
 * Local topic-03 historical-example card. The shared `IntelCard` is
 * explicitly documented as a deliberately borderless/iconless "editorial"
 * pattern every other lesson's OnboardingScene relies on — this mockup
 * wants a bordered, icon-bearing card instead, so a local variant lives
 * here rather than changing the shared component. See
 * design-work/topic-03/shared-component-candidates.md.
 */
export function NavExampleCard({
  place,
  headline,
  lesson,
  icon,
}: {
  place: string;
  headline: string;
  lesson: string;
  icon: IconName;
}) {
  return (
    <article className="h-full flex flex-col rounded-2xl border border-border bg-bg-elevated p-5 sm:p-6 shadow-elevated">
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-fg-muted shrink-0">
          <Icon name={icon} size={26} strokeWidth={1.4} />
        </span>
        <span className="text-xs font-display font-medium text-fg-dim text-end leading-tight pt-1">
          {place}
        </span>
      </div>

      <h4 className="font-display font-bold text-lg leading-snug text-balance text-fg">
        {headline}
      </h4>

      <span aria-hidden className="mt-2.5 mb-3 inline-block h-[3px] w-8 rounded-full bg-accent" />

      <p className="text-sm text-fg-muted leading-relaxed text-pretty">{lesson}</p>
    </article>
  );
}
