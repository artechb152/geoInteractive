import Link from 'next/link';
import { notFound } from 'next/navigation';

/**
 * Dedicated page per prototype. The actual prototype is a Vite+React
 * SPA pre-built into `public/embeds/<id>/index.html`. This page just
 * wraps it in our site's chrome (the global Navbar comes from
 * `app/layout.tsx`), adds a back-to-home link, and gives the iframe
 * the full remaining viewport.
 *
 * Static-generated for both prototypes via `generateStaticParams`.
 */

type Prototype = {
  id: string;
  title: string;
  tagline: string;
  embedPath: string;
};

const PROTOTYPES: Prototype[] = [
  {
    id: 'terrain-3d',
    title: 'סימולטור שטח תלת־ממדי',
    tagline: 'ניווט וחקירה במודל גובה אינטראקטיבי',
    embedPath: '/embeds/terrain-3d/index.html',
  },
  {
    id: 'terrain-overlay',
    title: 'שכבות מידע על מפת שטח',
    tagline: 'הלבשת שכבות גיאו־מידע על מפה',
    embedPath: '/embeds/terrain-overlay/index.html',
  },
];

export function generateStaticParams() {
  return PROTOTYPES.map((p) => ({ id: p.id }));
}

export default async function PrototypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = PROTOTYPES.find((x) => x.id === id);
  if (!p) notFound();

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3rem)' }}>
      {/* Header strip — orange eyebrow, title, back link, in the
          site's design language. */}
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
            href="/#prototypes"
            className="inline-flex items-center px-4 py-2 rounded-md font-medium text-sm border border-accent/40 text-accent-hover hover:bg-accent/10 transition-colors"
          >
            חזרה לעמוד הבית
          </Link>
        </div>
      </header>

      {/* The prototype itself — sized to leave breathing room around
          it. Width capped at the same max-w as lesson content, height
          stops short of the bottom edge so the page doesn't feel
          edge-clipped. */}
      <div className="flex-1 min-h-0 bg-bg-accent/20 flex items-stretch p-3 sm:p-4 md:p-6">
        <div className="w-full max-w-6xl mx-auto rounded-xl overflow-hidden border border-border bg-bg-elevated">
          <iframe
            src={p.embedPath}
            title={p.title}
            className="block w-full h-full border-0"
            allow="fullscreen; accelerometer; gyroscope"
          />
        </div>
      </div>
    </div>
  );
}
