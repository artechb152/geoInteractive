'use client';

/**
 * AppHeader — שורה רכה אחת (Design 1, §7).
 *
 * לבן/קרם עם blur עדין וגבול תחתון דק — בלי פס פיקוד כהה. סמל + שם קורס
 * בימין, ניווט מינימלי במרכז, CTA כתום ותפריט מובייל בשמאל.
 * גובה: 64px מובייל · 80px דסקטופ — מסונכרן עם --header-h ב-globals.css.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { BrandEmblem } from './BrandEmblem';
import { ContinueLearningButton } from '@/components/landing/ContinueLearningButton';

const NAV_LINKS: { href: string; label: string }[] = [
  { href: '/', label: 'בית' },
  { href: '/#syllabus', label: 'תכנית הלימודים' },
  { href: '/#prototypes', label: 'פרוטוטייפים' },
  { href: '/recap-demos', label: 'תרגול חוזר' },
];

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="h-16 border-b border-border bg-bg-elevated/90 backdrop-blur-md lg:h-20">
        <nav className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* מותג — ימין ב-RTL */}
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="עמוד הבית">
            <BrandEmblem className="size-9" />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="font-display text-base font-extrabold tracking-tight text-fg">
                גיאוגרפיה צבאית
              </span>
              <span className="mt-1 hidden items-center gap-1.5 sm:flex" aria-hidden>
                <span className="h-0.5 w-5 rounded-full bg-accent" />
                <span className="text-[10px] font-display font-semibold tracking-[0.18em] text-fg-dim">
                  לקרוא שטח · להבין החלטה
                </span>
              </span>
            </span>
          </Link>

          {/* ניווט — מרכז */}
          <ul className="hidden items-center md:flex">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="group relative flex items-center px-4 py-2 text-sm font-display font-semibold text-fg-muted transition-colors hover:text-fg"
                >
                  {l.label}
                  <span
                    aria-hidden
                    className="absolute inset-x-4 bottom-0.5 h-0.5 scale-x-0 rounded-full bg-accent transition-transform duration-200 ease-snap group-hover:scale-x-100"
                  />
                </Link>
              </li>
            ))}
          </ul>

          {/* פעולה — שמאל ב-RTL */}
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <ContinueLearningButton size="sm" />
            </div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'סגירת תפריט' : 'פתיחת תפריט'}
              aria-expanded={open}
              className="grid size-10 place-items-center rounded-xl bg-bg-accent text-fg transition-colors hover:bg-brand/15 md:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>
      </div>

      {/* ── תפריט מובייל ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="border-b border-border bg-bg-elevated/95 shadow-elevated backdrop-blur-xl md:hidden"
          >
            <ul className="flex flex-col gap-1 px-4 py-4">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 font-display font-semibold text-fg-muted transition-colors hover:bg-bg-accent hover:text-fg"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <ContinueLearningButton className="w-full" />
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
