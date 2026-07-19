import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Button — שפת הכפתורים של דף הבית (design lock): פינות רכות, כתום רק לפעולה.
 *
 * primary   — גרדיאנט ember + צל cta-ember (כמו "המשך ללמוד" בהירו):
 *             התחלת שיעור, המשך לשלב הבא, בדיקת תשובה.
 * secondary — קרם בהיר עם מסגרת tanline (כמו "סקירת הקורס"): פעולות משנה.
 * ghost     — טקסטואלי, ללא מילוי.
 *
 * מקבל `href` ⇒ מרונדר כ-<Link>; אחרת <button>.
 */

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm gap-1.5 rounded-xl',
  md: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
  lg: 'h-14 px-8 text-base gap-2.5 rounded-2xl',
};

const BASE =
  'inline-flex items-center justify-center select-none whitespace-nowrap font-display transition-all duration-200 ease-snap';

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  'aria-label'?: string;
  title?: string;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  href,
  onClick,
  disabled,
  type = 'button',
  title,
  ...aria
}: ButtonProps) {
  const classes = cn(
    BASE,
    SIZE_CLASS[size],
    variant === 'primary' &&
      'bg-cta-ember font-bold text-white shadow-cta-ember hover:brightness-105 active:translate-y-px',
    variant === 'secondary' &&
      'border border-border bg-paper-bright/70 font-semibold text-fg hover:bg-paper-bright active:translate-y-px',
    variant === 'ghost' && 'font-semibold text-fg-muted hover:bg-bg-accent hover:text-fg',
    disabled && 'opacity-45 cursor-not-allowed hover:brightness-100 active:translate-y-0',
    className,
  );

  if (href !== undefined && !disabled) {
    return (
      <Link href={href} onClick={onClick} title={title} className={classes} {...aria}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={classes} {...aria}>
      {children}
    </button>
  );
}
