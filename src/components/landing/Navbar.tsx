'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { lessons } from '@/lib/lessons';

// Hidden while the Features and FAQ sections are off the landing page.
// To restore: put these entries back and they'll re-render in both the
// desktop nav and the mobile menu.
//   { href: '#features', label: 'מה לומדים' },
//   { href: '#faq', label: 'שאלות נפוצות' },
const NAV_LINKS: { href: string; label: string }[] = [];

const FIRST_LESSON_HREF = `/lessons/${lessons[0].id}/`;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <motion.header
      initial={reduce ? false : { y: -32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 bg-bg-elevated border-b border-brand"
    >
      {/* No `max-w-7xl mx-auto` so the brand starts flush against the
          viewport's start edge (right in RTL) with a tight `pe-4` —
          its position no longer depends on the viewport width. The
          `text-[15px]` is a fixed pixel size that doesn't scale with
          the viewport. */}
      <nav className="ps-4 pe-6 h-12 flex items-center justify-between gap-6">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="עמוד הבית">
          <span className="font-display font-bold text-[15px] tracking-tight text-fg">
            גיאוגרפיה <span className="text-brand">צבאית</span>
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="relative px-3 py-2 rounded-md text-sm text-fg-muted hover:text-fg transition-colors group"
              >
                {l.label}
                <span
                  className="absolute inset-x-3 -bottom-0.5 h-px bg-accent/0 group-hover:bg-accent/70 transition-colors"
                  aria-hidden
                />
              </a>
            </li>
          ))}
        </ul>

        {/* Top-left "התחלת הקורס" button removed — the Hero already has
            a primary CTA centred on the page, so this one was duplicate.
            To restore, uncomment:
        <div className="hidden md:flex items-center gap-2">
          <Link
            href={FIRST_LESSON_HREF}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-bg-elevated bg-accent hover:bg-accent-hover transition-colors"
          >
            <span>התחלת הקורס</span>
            <ArrowLeft
              className="size-3.5 transition-transform group-hover:-translate-x-1"
              aria-hidden
            />
          </Link>
        </div>
        */}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'סגירת תפריט' : 'פתיחת תפריט'}
          aria-expanded={open}
          className="md:hidden grid place-items-center size-10 rounded-md border border-border text-fg hover:bg-bg-accent transition-colors"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden border-b border-border-subtle bg-bg-elevated/95 backdrop-blur-xl"
          >
            <ul className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2.5 rounded-md text-fg-muted hover:text-fg hover:bg-bg-accent transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li className="pt-2">
                <Link
                  href={FIRST_LESSON_HREF}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-md text-sm font-medium text-bg-elevated bg-accent hover:bg-accent-hover transition-colors"
                >
                  <span>התחלת הקורס</span>
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
