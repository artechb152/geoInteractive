import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { PrtPrototype } from '@/lib/prt-prototypes';

/**
 * Full-screen viewer for a single prototype inside the secret area.
 * Thin site-styled header (eyebrow + title + back-to-/prt link) over the
 * prototype itself, which renders full-bleed in an iframe pointing at its
 * prebuilt embed under public/embeds/<id>/. Mirrors the public
 * /prototypes/<id> viewer but stays within /prt.
 */
export function PrtPrototypeView({ p }: { p: PrtPrototype }) {
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3rem)' }}>
      <header className="shrink-0 bg-bg-elevated border-b border-brand">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent mb-1">
              פרוטוטייפ · {p.tagline}
            </div>
            <h1 className="font-display font-bold text-lg sm:text-xl text-accent-hover leading-tight">
              {p.title}
            </h1>
          </div>
          <Link
            href="/prt/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md font-medium text-sm border border-accent/40 text-accent-hover hover:bg-accent/10 transition-colors"
          >
            <ArrowRight className="size-3.5" aria-hidden />
            חזרה לרשימה
          </Link>
        </div>
      </header>

      <div className="flex-1 min-h-0 bg-bg-accent/20 flex items-stretch p-3 sm:p-4 md:p-6">
        <div className="w-full max-w-6xl mx-auto rounded-xl overflow-hidden border border-border bg-bg-elevated">
          <iframe
            src={`/embeds/${p.id}/index.html`}
            title={p.title}
            className="block w-full h-full border-0"
            allow="fullscreen; accelerometer; gyroscope"
          />
        </div>
      </div>
    </div>
  );
}
