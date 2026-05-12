import { type ReactNode } from 'react';

/**
 * ReadyCallout — milestone marker placed at the end of every OnboardingScene.
 *
 * Distinguishes itself from regular IntelCards by living on the warm peach
 * surface (`bg-warm` — the brand's reserved "warm accent band" colour).
 * Static, no animation, server-renderable.
 *
 * Visual signature: a short orange-dark stroke acts as the typographic mark,
 * the title leads, the body explains. No icon container, no glow, no chrome.
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
    <section className="mt-8 bg-warm rounded-md p-5 md:p-6">
      <span
        aria-hidden
        className="inline-block h-[3px] w-7 rounded-full bg-accent-hover mb-3"
      />
      <h3 className="font-display font-bold text-lg md:text-xl leading-tight text-balance text-fg mb-2.5">
        {title}
      </h3>
      <div className="text-sm md:text-[15px] text-fg/85 leading-relaxed text-pretty">
        {children}
      </div>
    </section>
  );
}
