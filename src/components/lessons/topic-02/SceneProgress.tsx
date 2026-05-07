'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const SCENES = [
  { id: 'hook', label: 'פתיחה' },
  { id: 'onboarding', label: 'לפני שמתחילים' },
  { id: 'topography', label: 'טופוגרפיה' },
  { id: 'scale', label: 'קנה מידה' },
  { id: 'coordinates', label: 'קואורדינטות' },
  { id: 'contours', label: 'קווי גובה' },
  { id: 'recap', label: 'סיכום' },
];

export function SceneProgress() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const els = SCENES.map((s) => document.getElementById(`scene-${s.id}`)).filter(
      (e): e is HTMLElement => !!e
    );
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = SCENES.findIndex((s) => `scene-${s.id}` === e.target.id);
            if (i >= 0) setActive(i);
          }
        });
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  function go(id: string) {
    document.getElementById(`scene-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <aside
      className="hidden xl:flex fixed start-4 2xl:start-8 top-1/2 -translate-y-1/2 z-20 flex-col gap-2 pointer-events-auto"
      aria-label="ניווט סצנות"
    >
      {SCENES.map((s, i) => {
        const isActive = i === active;
        return (
          <button
            key={s.id}
            onClick={() => go(s.id)}
            className="group flex items-center gap-3 cursor-pointer"
            aria-label={s.label}
          >
            <span className="font-mono text-[10px] text-fg-dim group-hover:text-accent transition-colors w-3 text-end">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="relative">
              <motion.span
                className={cn(
                  'block h-px transition-all duration-300',
                  isActive ? 'w-12 bg-accent' : 'w-6 bg-border-strong group-hover:bg-fg-dim'
                )}
              />
            </span>
            <span
              className={cn(
                'text-xs transition-all duration-300 whitespace-nowrap',
                isActive ? 'text-fg opacity-100' : 'text-fg-dim opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
              )}
            >
              {s.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
