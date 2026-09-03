'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Crosshair } from 'lucide-react';

const HOOK_BG_SRC = '/assets/lessons/topic01/scene-hook/TOPIC01-HOOK-BG.png';

/**
 * Isometric terrain backdrop, portaled straight to `document.body` instead
 * of rendered as a plain child of this scene. `PagedLearn` wraps every
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
function HookBackdrop() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // The sticky sub-nav header (`לימוד`/`תרגול`/`בדיקת ידע`, see
    // `data-lesson-tabs-header` in LessonShell.tsx) normally paints an
    // opaque `bg-bg` so it reads as part of the cream content area — on
    // this scene that cuts the backdrop off at the header's own edge
    // instead of letting it run all the way to the top, and the tab
    // labels/icons already read fine directly on the image. Drop the fill
    // via inline style (wins over the Tailwind utility class on
    // specificity) only while this scene is mounted, and restore it on
    // cleanup so no other scene is ever affected.
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
      className="pointer-events-none fixed inset-0 -z-10 select-none bg-paper-page bg-cover bg-[position:left_center] bg-no-repeat"
      style={{ backgroundImage: `url('${HOOK_BG_SRC}')` }}
    />,
    document.body,
  );
}

export function HookScene() {
  return (
    <section
      id="scene-hook"
      className="min-h-[calc(100dvh-var(--header-h)-5rem)] relative flex items-center justify-start overflow-hidden ps-6 pe-4 py-10 sm:ps-20 lg:ps-32"
    >
      <HookBackdrop />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[600px] bg-transparent px-6 py-12 text-center sm:px-8 sm:py-14"
      >
        <h1 className="text-[clamp(1.375rem,2.4vw,2.25rem)] font-display font-extrabold tracking-tight text-balance leading-[1.15] text-olive-ink">
          המרחב איננו רק זירת הפעולה.
          <br />
          הוא המימד המערכתי <span className="text-ember">שמכריע אותה.</span>
        </h1>

        <div aria-hidden className="relative my-8 flex items-center justify-center">
          <div className="h-px w-full bg-tanline" />
          <Crosshair className="absolute size-5 text-olive-ink/60" />
        </div>

        <p className="mx-auto max-w-md text-sm leading-relaxed text-olive-soft text-pretty sm:text-base">
          המלחמה המודרנית לא מוכרעת ביחס כוחות — היא מוכרעת ב-5 ממדים,
          3 רמות פיקוד, ובתלות במימד הזמן והמרחב. בשיעור הזה תבין
          איך המרחב הופך לשחקן הראשי, ולמה רחפן של 300 דולר מפיל מטוס של 80 מיליון.
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
            className="inline-flex items-center justify-center rounded-xl bg-cta-ember px-7 py-4 font-display text-base font-bold text-bg-elevated shadow-cta-ember transition-all duration-200 hover:brightness-105 active:translate-y-px"
            aria-label="התחל את השיעור"
          >
            <span>לחץ כדי להתחיל</span>
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
