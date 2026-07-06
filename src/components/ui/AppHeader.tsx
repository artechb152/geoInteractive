'use client';

/**
 * AppHeader V2 — "פס פיקוד" דו-קומתי (design-system §7, שפת V2).
 *
 * קומה עליונה (lg+): פס מרווה כהה דק — קוד קורס, קואורדינטות דקורטיביות,
 *                    תת-הכותרת. היפוך צבע נקודתי, לא רקע ראשי.
 * קומה ראשית: לבן, סמל + שם קורס בימין, ניווט ממוספר במרכז, CTA בשמאל.
 * גובה: 56px מובייל · 80px דסקטופ — מסונכרן עם --header-h ב-globals.css.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { BrandEmblem } from './BrandEmblem';
import { ContinueLearningButton } from '@/components/landing/ContinueLearningButton';

const NAV_LINKS: { href: string; num: string; label: string }[] = [
  { href: '/', num: '01', label: 'בית' },
  { href: '/#syllabus', num: '02', label: 'תכנית הלימודים' },
  { href: '/#prototypes', num: '03', label: 'פרוטוטייפים' },
  { href: '/recap-demos', num: '04', label: 'תרגול חוזר' },
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
      {/* ── קומה עליונה: פס פיקוד מרווה כהה (דסקטופ בלבד) ── */}
      <div className="hidden h-6 items-center bg-brand-dark text-bg lg:flex">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="font-mono text-[10px] tracking-[0.3em]" dir="ltr">
            GEO-9900
          </span>
          <span className="text-[10px] font-display font-medium tracking-[0.2em]">
            לקרוא שטח · להבין החלטה
          </span>
          <span className="font-mono text-[10px] tracking-[0.25em] opacity-70" dir="ltr">
            32°N · 35°E
          </span>
        </div>
      </div>

      {/* ── קומה ראשית ── */}
      <div className="h-14 border-b-2 border-brand-dark/30 bg-bg-elevated/95 backdrop-blur-md">
        <nav className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* מותג — ימין ב-RTL */}
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="עמוד הבית">
            <BrandEmblem className="size-9" />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="font-display text-base font-extrabold tracking-tight text-fg">
                גיאוגרפיה צבאית
              </span>
              <span className="mt-1 hidden items-center gap-1.5 sm:flex" aria-hidden>
                <span className="h-0.5 w-5 bg-accent" />
                <span className="text-[10px] font-display font-semibold tracking-[0.18em] text-fg-dim">
                  מערכת הכשרה דיגיטלית
                </span>
              </span>
            </span>
          </Link>

          {/* ניווט ממוספר — מרכז */}
          <ul className="hidden items-center md:flex">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="group relative flex items-baseline gap-1.5 px-3.5 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
                >
                  <span className="font-mono text-[10px] text-brand transition-colors group-hover:text-accent">
                    {l.num}
                  </span>
                  <span className="font-display font-semibold">{l.label}</span>
                  <span
                    aria-hidden
                    className="absolute inset-x-3.5 bottom-0 h-0.5 scale-x-0 bg-accent transition-transform duration-200 ease-snap group-hover:scale-x-100"
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
              className="oct-sm grid size-10 place-items-center bg-bg-accent text-fg transition-colors hover:bg-brand/15 md:hidden"
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
            className="border-b-2 border-brand-dark/30 bg-bg-elevated/95 backdrop-blur-xl md:hidden"
          >
            <ul className="flex flex-col gap-1 px-4 py-4">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex items-baseline gap-2 px-3 py-2.5 text-fg-muted transition-colors hover:bg-bg-accent hover:text-fg"
                  >
                    <span className="font-mono text-[10px] text-brand">{l.num}</span>
                    <span className="font-display font-semibold">{l.label}</span>
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
