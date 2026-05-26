'use client';

/**
 * Common chrome for every recap-demo page — back link, title row,
 * an instructions strip, and a "more demos" footer that links to the
 * other three formats. Each demo page renders its activity as
 * children inside this shell.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { DEMOS, type DemoId } from './demos';

export function DemoShell({
  id,
  title,
  tagline,
  instructions,
  children,
}: {
  id: DemoId;
  title: string;
  tagline: string;
  instructions: string;
  children: ReactNode;
}) {
  const others = DEMOS.filter((d) => d.id !== id);
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-accent transition-colors shrink-0"
          >
            <span>חזרה לדף הבית</span>
          </Link>
          <span className="h-5 w-px bg-border-subtle" aria-hidden />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-display font-semibold tracking-wider text-accent uppercase">
              דמו · סיכום שיעור
            </div>
            <h1 className="font-display font-bold text-base md:text-lg truncate text-fg">
              {title}
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 w-full">
        <p className="text-fg-muted text-base md:text-lg max-w-2xl mb-2">{tagline}</p>
        <p className="text-fg-dim text-sm max-w-2xl mb-8">{instructions}</p>

        {children}

        <section className="mt-16 pt-8 border-t border-border-subtle">
          <div className="text-[11px] font-display font-semibold tracking-wider text-fg-muted uppercase mb-3">
            לנסות פורמט אחר
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {others.map((d) => (
              <Link
                key={d.id}
                href={d.href}
                className="group rounded-xl border border-border bg-bg-elevated p-3.5 hover:border-accent/40 transition-all"
              >
                <div className="font-display font-bold text-sm text-fg group-hover:text-accent transition-colors">
                  {d.title}
                </div>
                <div className="text-xs text-fg-muted mt-0.5">{d.tagline}</div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
