'use client';

import { type ReactNode } from 'react';
import { Icon } from '@/components/Icon';

/**
 * Local topic-03 "ready" milestone band. The shared `ReadyCallout` renders
 * a plain white card with no icon; this mockup wants a tinted band with a
 * badge icon docked at the start (right) corner. A local variant lives
 * here rather than changing the shared component every other topic's
 * OnboardingScene uses. See design-work/topic-03/shared-component-candidates.md.
 */
export function ReadyBand({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 rounded-2xl bg-bg-accent p-6 sm:p-8 flex items-center gap-5 sm:gap-7">
      <div className="hidden sm:flex relative shrink-0 size-16 rounded-full bg-bg-elevated border border-border items-center justify-center">
        <Icon name="shield" size={28} className="text-brand-dark" />
        <Icon name="check" size={13} strokeWidth={3} className="absolute text-brand-dark" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-bold text-xl md:text-2xl leading-tight text-balance text-fg mb-3">
          {title}
        </h3>
        <div className="text-base text-fg-muted leading-relaxed text-pretty">{children}</div>
      </div>
    </section>
  );
}
