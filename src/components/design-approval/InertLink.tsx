'use client';

/**
 * InertLink — קישור מוקאפ שאינו מנווט בפועל (href="#" + aria-disabled).
 *
 * בלי onClick שמונע ברירת מחדל, <a href="#"> עדיין מנווט בפועל בלחיצה (מדלג
 * לראש העמוד) — aria-disabled הוא רמז לקורא-מסך בלבד ואינו עוצר את הדפדפן.
 * זהו client island קטן (כמו AssetSlot) כדי ש-HomeMock/LessonRailCard עצמם
 * יישארו Server Components (design-lock §8.1: "סטטי + איי-לקוח קטנים בלבד").
 */
import type { AnchorHTMLAttributes, ReactNode } from 'react';

type InertLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  children: ReactNode;
};

export function InertLink({ children, ...rest }: InertLinkProps) {
  return (
    <a href="#" aria-disabled onClick={(e) => e.preventDefault()} {...rest}>
      {children}
    </a>
  );
}
