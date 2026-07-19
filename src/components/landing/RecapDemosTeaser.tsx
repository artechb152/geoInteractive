import Link from 'next/link';
import { DEMOS } from '@/components/recap-demos/demos';

/**
 * Landing-page section that links to the 4 recap-format demos.
 * Each card is the entry point for one format ("trial"), built on
 * lesson-1 content.
 */
export function RecapDemosTeaser() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-14 md:py-20 border-t border-border-subtle">
      <div className="mb-8 md:mb-10">
        <p className="section-eyebrow mb-1.5">דמו · בדיקת פורמט</p>
        <h2 className="font-display font-bold text-2xl md:text-4xl text-balance leading-tight mb-2">
          איך לסכם שיעור — 4 דרכים אינטראקטיביות
        </h2>
        <p className="text-fg-muted text-base md:text-lg max-w-3xl">
          בחר פורמט וכנס לניסיון — אותם 8 מושגים של שיעור 1, ארבעה אופנים שונים של תרגול
          פעיל.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {DEMOS.map((d, i) => (
          <Link
            key={d.id}
            href={d.href}
            className="group rounded-2xl border border-border bg-bg-elevated p-5 hover:border-accent/40 transition-all relative overflow-hidden"
          >
            <div
              aria-hidden
              className="absolute -top-10 -end-10 size-28 rounded-full bg-accent/8 blur-3xl pointer-events-none group-hover:bg-accent/15 transition-colors"
            />
            <div className="relative">
              <div className="font-mono text-[10px] text-fg-dim tracking-widest mb-1.5">
                {String(i + 1).padStart(2, '0')} / 04
              </div>
              <h3 className="font-display font-bold text-lg mb-1.5 text-fg group-hover:text-brand-dark transition-colors">
                {d.title}
              </h3>
              <p className="text-sm text-fg-muted leading-relaxed mb-4">{d.tagline}</p>
              <div className="inline-flex items-center gap-1.5 text-sm font-display font-semibold text-accent">
                <span>כנס לניסיון</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
