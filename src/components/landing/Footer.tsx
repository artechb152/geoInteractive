import Link from 'next/link';
import { Compass } from 'lucide-react';
import { lessons } from '@/lib/lessons';

const NAV_GROUPS = [
  {
    heading: 'ניווט',
    links: [
      { href: '#hero', label: 'סקירה' },
      { href: '#features', label: 'מה לומדים' },
      { href: '#faq', label: 'שאלות נפוצות' },
      { href: '#lead', label: 'גישה מוקדמת' },
    ],
  },
  {
    heading: 'מידע',
    links: [
      { href: `/lessons/${lessons[0].id}/`, label: 'התחלת הקורס' },
      { href: '#', label: 'צרו קשר' },
      { href: '#', label: 'מדיניות פרטיות' },
      { href: '#', label: 'תנאי שימוש' },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-bg">
      {/* Soft brand-gradient divider — the only seam between page and footer */}
      <div
        aria-hidden
        className="h-px bg-gradient-to-l from-transparent via-brand/40 to-transparent"
      />

      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* ── Brand column ───────────────────── */}
          <div>
            <Link
              href="/"
              className="group inline-flex items-center gap-2.5"
              aria-label="עמוד הבית"
            >
              <span className="relative grid place-items-center size-9 rounded-md border border-accent/40 bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
                <Compass className="size-4" aria-hidden />
                <span
                  className="absolute -bottom-1 -left-1 size-1.5 rounded-full bg-accent"
                  aria-hidden
                />
              </span>
              <span className="font-display font-bold text-base text-fg">
                גיאוגרפיה <span className="text-accent">צבאית</span>
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm text-fg-muted leading-relaxed text-pretty">
              קורס אינטראקטיבי בגיאוגרפיה צבאית, GEOINT וניתוח מערכות שטח —
              מהבסיס ועד היישום המבצעי.
            </p>

            <a
              href="#hero"
              className="mt-6 inline-flex items-center gap-2 text-sm font-display font-semibold text-accent hover:text-accent-hover transition-colors"
            >
              חזרה למעלה
            </a>
          </div>

          {/* ── Navigation columns ─────────────── */}
          {NAV_GROUPS.map((group) => (
            <div key={group.heading}>
              <h3 className="font-display font-semibold text-sm tracking-wider text-fg mb-4">
                {group.heading}
              </h3>
              <ul className="space-y-2.5 text-sm">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-fg-muted hover:text-accent transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom row ─────────────────────── */}
        <div className="mt-10 md:mt-14 pt-6 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs text-fg-dim">
          <span>© {year} גיאוגרפיה צבאית · כל הזכויות שמורות</span>
          <span className="font-mono tracking-wider uppercase">v1·beta · made in IL</span>
        </div>
      </div>
    </footer>
  );
}
