'use client';

/**
 * AppHeader — שורה רכה אחת (Design 1, §7).
 *
 * פס כתום (ember) עם גבול תחתון דק. סמל + שם קורס בימין, ניווט + תפריט
 * מובייל בשמאל — שניהם ב-3% inset, סימטרי לסמל.
 * גובה: 48px מובייל · 56px דסקטופ — מסונכרן עם --header-h ב-globals.css.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { BrandEmblem } from './BrandEmblem';

const NAV_LINKS: { href: string; label: string }[] = [
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

  // דף הבית החדש (design/mockup.png) מביא Header פנימי משלו — אין Header גלובלי ב-/.
  if (pathname === '/') return null;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="h-12 border-b border-ember-deep bg-ember-deep lg:h-14">
        <nav className="relative flex h-full w-full items-center justify-between px-[3%]">
          {/* מותג — 3% מהצד הכי ימני של המסך */}
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5"
            aria-label="עמוד הבית"
          >
            <BrandEmblem className="size-8" />
            <span className="min-w-0 font-display text-lg font-extrabold leading-none tracking-tight text-paper-bright">
              גיאוגרפיה צבאית
            </span>
          </Link>

          {/* ניווט + תפריט מובייל — 3% מהצד הכי שמאלי, סימטרי לסמל */}
          <div className="flex items-center gap-2">
            <ul className="hidden items-center md:flex">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="group relative flex items-center px-4 py-2 text-sm font-display font-semibold text-paper-bright/80 transition-colors hover:text-paper-bright"
                  >
                    {l.label}
                    <span
                      aria-hidden
                      className="absolute inset-x-4 bottom-0.5 h-0.5 scale-x-0 rounded-full bg-paper-bright transition-transform duration-200 ease-snap group-hover:scale-x-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'סגירת תפריט' : 'פתיחת תפריט'}
              aria-expanded={open}
              className="grid size-9 place-items-center rounded-xl bg-white/15 text-paper-bright transition-colors hover:bg-white/25 md:hidden"
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
            className="border-b border-border bg-bg/95 shadow-elevated backdrop-blur-xl md:hidden"
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
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
