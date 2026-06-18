import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PRT_PROTOTYPES } from '@/lib/prt-prototypes';

/**
 * The content of the secret /prt page: a short header plus a grid of
 * prototype cards (the "ריבועים"). Each card briefly describes what the
 * prototype does; clicking it opens the prototype full-screen at
 * /prt/<id>. Styled to match the public PrototypesShowcase section.
 */
export function PrtShowcase() {
  return (
    <main className="relative min-h-[calc(100vh-3rem)] bg-bg">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="mb-10 md:mb-12">
          <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent mb-2.5">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            אזור מוגן · בדיקת היתכנות
          </div>
          <h1 className="font-display font-bold text-2xl md:text-4xl text-balance leading-tight mb-3">
            פרוטוטייפים <span className="text-accent-hover">לבדיקה</span>
          </h1>
          <p className="text-fg-muted text-base md:text-lg max-w-2xl text-pretty leading-relaxed">
            כל ריבוע מתאר בקצרה מה הפרוטוטייפ עושה. לחיצה פותחת אותו כפי שהוא.
            יש הערה? השתמשו בכפתור המשוב בפינה — היא תגיע ישירות אליי.
          </p>
        </div>

        {PRT_PROTOTYPES.length === 0 ? (
          <div className="surface rounded-2xl p-8 text-center text-fg-muted">
            עדיין אין פרוטוטייפים זמינים.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {PRT_PROTOTYPES.map((p) => (
              <Link
                key={p.id}
                href={`/prt/${p.id}/`}
                className="group surface-elevated rounded-2xl p-6 sm:p-7 flex flex-col transition-colors border border-border hover:border-accent"
              >
                <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent mb-2.5">
                  <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                  {p.tagline}
                </div>
                <h2 className="font-display font-bold text-lg sm:text-xl text-balance leading-tight mb-3 text-accent-hover">
                  {p.title}
                </h2>
                <p className="text-sm text-fg leading-relaxed text-pretty mb-5">
                  {p.description}
                </p>
                <div className="mt-auto pt-4 border-t border-border-subtle">
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md font-medium text-sm bg-accent text-bg-elevated group-hover:bg-accent-hover transition-colors">
                    פתיחת הפרוטוטייפ
                    <ArrowLeft
                      className="size-3.5 transition-transform group-hover:-translate-x-1"
                      aria-hidden
                    />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
