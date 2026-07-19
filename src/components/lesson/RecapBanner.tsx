'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

/**
 * RecapBanner — באנר "כל הכבוד" של סצנת הסיכום (מקור אמת יחיד; מחליף את
 * CompletionBanner המקומי המשוכפל ב-11 קבצי RecapScene).
 *
 * שפת דף הבית: כרטיס לבן rounded-2xl (מנרמל את סחף ה-rounded-[4px]),
 * מסגרת ember רכה, זוהר ember + מרווה (במקום ה-cool הכחול הדקורטיבי).
 * `pulse` — עיגול ה-V הפועם הקנוני; false ⇒ אייקון V פשוט (וריאנט 01).
 * `children` — slot לתוכן סוגר נוסף (כמו FinalCard של שיעור 12).
 */
export function RecapBanner({
  eyebrow,
  title,
  pulse = true,
  className,
  children,
}: {
  /** שורת ה"כל הכבוד" הקטנה */
  eyebrow: React.ReactNode;
  /** הכותרת המודגשת */
  title: React.ReactNode;
  pulse?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn(
        'relative mb-8 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-bl from-accent/10 via-bg-elevated to-bg-elevated p-6 sm:p-7',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -end-16 -top-16 size-48 rounded-full bg-accent/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -start-16 size-48 rounded-full bg-brand/10 blur-3xl"
      />

      <div className="relative flex items-center gap-4 sm:gap-5">
        {pulse ? (
          <div className="relative shrink-0">
            {!reduce && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute inset-0 size-14 rounded-full bg-accent/20"
              />
            )}
            <div className="relative flex size-14 items-center justify-center rounded-full bg-accent text-bg-elevated">
              <Icon name="check" size={28} strokeWidth={3} />
            </div>
          </div>
        ) : (
          <Icon name="check" size={48} strokeWidth={3} className="shrink-0 text-accent" />
        )}
        <div className="flex-1">
          <div className="mb-1 text-sm font-display font-semibold tracking-wider text-accent">
            {eyebrow}
          </div>
          <div className="font-display text-xl font-bold leading-tight text-balance sm:text-2xl">
            {title}
          </div>
        </div>
      </div>

      {children && <div className="relative mt-5">{children}</div>}
    </motion.div>
  );
}
