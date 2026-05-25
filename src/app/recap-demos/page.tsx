import Link from 'next/link';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { DEMOS } from '@/components/recap-demos/demos';

export const metadata = {
  title: 'דמו · 4 דרכים לסכם שיעור · גיאוגרפיה צבאית',
};

export default function RecapDemosIndex() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-brand-dark transition-colors shrink-0"
          >
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
            <span>חזרה לדף הבית</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 w-full">
        <div className="text-[11px] font-display font-semibold tracking-wider text-accent-hover uppercase mb-3">
          דמו · סיכום שיעור
        </div>
        <h1 className="font-display font-bold text-3xl md:text-5xl text-balance leading-tight mb-3">
          4 דרכים לסכם את <span className="gradient-text">שיעור 1</span> ולתרגל פעיל
        </h1>
        <p className="text-fg-muted text-base md:text-lg max-w-3xl mb-10">
          אותם 8 מושגים, ארבעה פורמטים אינטראקטיביים שונים — כדי שתוכל לבחור איזה מהם מתאים
          הכי טוב לסיום שיעור באתר. כל דמו לוקח 1-2 דקות.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {DEMOS.map((d) => (
            <Link
              key={d.id}
              href={d.href}
              className="group rounded-2xl border border-border bg-bg-elevated p-6 hover:border-accent/40 hover:shadow-elevated transition-all relative overflow-hidden"
            >
              <div aria-hidden className="absolute -top-12 -end-12 size-32 rounded-full bg-accent/8 blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="text-[11px] font-display font-semibold tracking-wider text-accent-hover uppercase mb-1.5">
                  פורמט {d.id}
                </div>
                <h2 className="font-display font-bold text-xl mb-1.5 group-hover:text-accent-hover transition-colors">
                  {d.title}
                </h2>
                <p className="text-sm text-fg-muted leading-relaxed mb-5">{d.tagline}</p>
                <div className="inline-flex items-center gap-2 text-sm font-display font-semibold text-accent-hover">
                  <span>פתח דמו</span>
                  <ArrowLeft
                    className="size-3.5 transition-transform group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
