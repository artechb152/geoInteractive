'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const SCENES = [
  { id: 'hook',        label: 'פתיחה' },
  { id: 'onboarding',  label: 'לפני שמתחילים' },
  { id: 'los',         label: '06.1 · קו ראייה' },
  { id: 'viewshed',    label: '06.2 · Viewshed' },
  { id: 'killchain',   label: '06.3 · Kill Chain' },
  { id: 'recap',       label: 'סיכום' },
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

  const pct = ((active + 1) / SCENES.length) * 100;

  return (
    <aside
      className="hidden xl:flex fixed start-4 2xl:start-8 top-1/2 -translate-y-1/2 z-20 flex-col gap-1 pointer-events-auto"
      aria-label="ניווט סצנות"
    >
      <div className="mb-3 ps-6">
        <div className="text-[10px] font-mono text-fg-dim tracking-widest uppercase mb-1">
          התקדמות
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-display font-bold text-2xl text-accent tabular-nums">
            {active + 1}
          </span>
          <span className="text-fg-dim text-sm">/ {SCENES.length}</span>
        </div>
        <div className="mt-2 h-0.5 w-20 rounded-full bg-bg-accent overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-cool"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {SCENES.map((s, i) => {
        const isActive = i === active;
        const isPassed = i < active;
        return (
          <button
            key={s.id}
            onClick={() => go(s.id)}
            className="group flex items-center gap-3 cursor-pointer py-1"
            aria-label={s.label}
            aria-current={isActive ? 'step' : undefined}
          >
            <span
              className={cn(
                'font-mono text-[10px] transition-colors w-3 text-end shrink-0',
                isActive ? 'text-accent' : isPassed ? 'text-fg-muted' : 'text-fg-dim',
                'group-hover:text-accent'
              )}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="relative shrink-0">
              <motion.span
                className={cn(
                  'block h-px transition-all duration-300',
                  isActive ? 'w-12 bg-accent' : isPassed ? 'w-8 bg-fg-muted' : 'w-6 bg-border-strong group-hover:bg-fg-dim'
                )}
              />
              {isActive && (
                <motion.span
                  layoutId="t6-active-dot"
                  className="absolute -end-1 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-accent shadow-glow"
                />
              )}
            </span>
            <span
              className={cn(
                'text-xs transition-all duration-300 whitespace-nowrap',
                isActive ? 'text-fg opacity-100 font-medium' : 'text-fg-dim opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
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
