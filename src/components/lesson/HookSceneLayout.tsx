'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Crosshair } from 'lucide-react';

/**
 * `basePath` from next.config.mjs is applied automatically to `next/image`,
 * `next/link` and static imports, but NOT to a raw `url()` inside an inline
 * style — so the backdrop has to prefix it by hand (same pattern as
 * `IsometricAsset` / `BrandEmblem`). Empty string in the default root export,
 * so nothing changes unless the site is exported under a subpath.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Isometric terrain backdrop, portaled straight to `document.body` instead
 * of rendered as a plain child of the hook scene. `PagedLearn` wraps every
 * active scene in an animated `motion.div`; a `position:fixed` descendant
 * of a transformed ancestor gets trapped as if `absolute` within that
 * ancestor instead of the real viewport (framer-motion leaves a
 * non-identity `transform` — even `translateY(0px)` — on that wrapper),
 * which is why the image used to render scene-sized and visibly "grow"
 * once the enter transition's transform settled. Portaling escapes that
 * tree entirely, and — being scoped to this component's own mount/unmount
 * — can't leak onto another scene or topic the way a global, event-driven
 * singleton previously did.
 */
function HookBackdrop({ bgSrc, bgPositionX = 'left' }: { bgSrc: string; bgPositionX?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Below xl the three lesson modes still sit in a sticky strip above the
    // content (`data-lesson-tabs-header` in LessonShell.tsx), which paints an
    // opaque fill so it reads as part of the cream content area — on a hook
    // scene that cuts the backdrop off at the strip's own edge instead of
    // letting it run all the way to the top, and the labels/icons already read
    // fine directly on the image. Drop the fill via inline style (wins over
    // the Tailwind utility class on specificity) only while a hook scene is
    // mounted, and restore it on cleanup so no other scene is ever affected.
    //
    // At xl+ that strip is `display:none` — the modes moved into the
    // full-height side nav, which is opaque by design and must stay that way
    // — so this is simply a no-op there. Kept (rather than deleted) because
    // the strip is still the real navigation below the desktop breakpoint.
    const header = document.querySelector<HTMLElement>('[data-lesson-tabs-header]');
    if (header) header.style.backgroundColor = 'transparent';
    return () => {
      if (header) header.style.backgroundColor = '';
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 select-none bg-paper-page bg-cover bg-no-repeat"
      style={{
        backgroundImage: `url('${BASE_PATH}${bgSrc}')`,
        backgroundPosition: `${bgPositionX} center`,
      }}
    />,
    document.body,
  );
}

type HookSceneLayoutProps = {
  /**
   * Per-topic backdrop image, by convention
   * `/assets/lessons/topic{NN}/scene-hook/TOPIC{NN}-HOOK-BG.png`.
   */
  bgSrc: string;
  /**
   * Horizontal `background-position` keyword/percentage for `bgSrc`, e.g.
   * `'left'` (default) or `'38%'`. The backdrop is a fixed, full-viewport,
   * `bg-cover` image anchored at `left center` by default, matching every
   * asset's "busy focal subject on the left, calm paper continuation on the
   * right" composition (see the lesson-heroes asset README) — the text
   * column then sits on that calm continuation. Cover-fit at this project's
   * 1440×1122 target crops a taller slice than the asset's own 16:9 frame,
   * so an asset whose calm area only starts past ~45% of its own width gets
   * that calm area pushed mostly behind the fixed content column (or off
   * the visible frame entirely) at the default `left` anchor. Override only
   * for such assets, tuned by eye against a 1440px screenshot.
   */
  bgPositionX?: string;
  /** Headline content, rendered inside the shared `<h1>`. */
  title: ReactNode;
  /** Body copy, rendered inside the shared `<p>`. */
  body: ReactNode;
};

/**
 * Shared cover/hook layout for every lesson: full-bleed isometric terrain
 * backdrop with the copy pinned to the inline-start (the visual right in RTL),
 * a crosshair divider, and the single `learn:next` call-to-action.
 *
 * The scene must be mounted inside `PagedLearn` under the `hook` id — the CTA
 * dispatches a global `learn:next` event rather than calling a prop, and
 * PagedLearn hides its own prev/next pair on the hook, so this button is the
 * only forward affordance on the page.
 */
export function HookSceneLayout({ bgSrc, bgPositionX, title, body }: HookSceneLayoutProps) {
  return (
    <section
      id="scene-hook"
      className="min-h-[calc(100dvh-var(--header-h)-5rem)] relative flex items-center justify-start overflow-hidden ps-6 pe-4 py-10 sm:ps-20 lg:ps-32"
    >
      <HookBackdrop bgSrc={bgSrc} bgPositionX={bgPositionX} />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[600px] bg-transparent px-6 py-12 text-center sm:px-8 sm:py-14"
      >
        <h1 className="text-[clamp(1.375rem,2.4vw,2.25rem)] font-display font-extrabold tracking-tight text-balance leading-[1.15] text-olive-ink">
          {title}
        </h1>

        <div aria-hidden className="relative my-8 flex items-center justify-center">
          <div className="h-px w-full bg-tanline" />
          <Crosshair className="absolute size-5 text-olive-ink/60" />
        </div>

        <p className="mx-auto max-w-md text-sm leading-relaxed text-olive-soft text-pretty sm:text-base">
          {body}
        </p>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="mt-10 flex justify-center"
        >
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('learn:next'))}
            className="inline-flex items-center justify-center select-none rounded-xl bg-cta-ember px-7 py-4 font-display text-base font-bold text-white shadow-cta-ember transition-all duration-200 ease-snap hover:brightness-105 active:translate-y-px"
            aria-label="התחל את השיעור"
          >
            <span>לחץ כדי להתחיל</span>
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
