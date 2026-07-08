import { type ReactNode } from 'react';

/**
 * ReadyCallout — milestone marker placed at the end of every OnboardingScene.
 *
 * Distinguishes itself from regular IntelCards by living on a white/elevated
 * surface (`bg-bg-elevated`). Static, no animation, server-renderable.
 *
 * Visual signature: the title leads, a short orange-dark stroke separates it
 * from the body. No icon container, no glow, no chrome.
 */
type ReadyCalloutProps = {
  /** Headline text. Defaults to "עכשיו אתם מוכנים." */
  title?: string;
  children: ReactNode;
};

export function ReadyCallout({
  title = 'עכשיו אתם מוכנים.',
  children,
}: ReadyCalloutProps) {
  return (
    <section className="mt-8 bg-bg-elevated rounded-md p-5 md:p-6">
      <h3 className="font-display font-bold text-xl md:text-2xl leading-tight text-balance text-black mb-3">
        {title}
      </h3>
      <span
        aria-hidden
        className="inline-block h-[3px] w-7 rounded-full bg-accent-hover mb-3"
      />
      <div className="text-base md:text-lg text-black leading-relaxed text-pretty">
        {children}
      </div>
    </section>
  );
}
