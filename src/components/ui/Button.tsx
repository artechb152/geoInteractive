import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Button — שפת הכפתורים V2: פלטות אוקטגון קטומות-פינה (design-system §16).
 *
 * primary   — פלטה כתומה מלאה: התחלת שיעור, המשך לשלב הבא, בדיקת תשובה.
 * secondary — פלטת נייר עם מסגרת מרווה (מסגרת מדומה בעטיפה, כי clip-path
 *             חותך border רגיל): חזרה לסילבוס, פעולות משנה.
 * ghost     — טקסטואלי, ללא פלטה.
 *
 * מקבל `href` ⇒ מרונדר כ-<Link>; אחרת <button>.
 */

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm gap-1.5',
  md: 'h-12 px-6 text-[15px] gap-2',
  lg: 'h-14 px-8 text-base gap-2.5',
};

const INNER_BASE =
  'inline-flex size-full items-center justify-center select-none whitespace-nowrap font-display transition-all duration-200 ease-snap oct';

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
  const sizing = SIZE_CLASS[size];

  // secondary: עטיפת "מסגרת" — פלטה חיצונית בצבע המסגרת, פנימית בנייר.
  if (variant === 'secondary') {
    const outer = cn(
      'oct inline-block bg-brand-dark/45 p-px transition-transform duration-200 ease-snap',
      !disabled && 'hover:bg-brand-dark active:scale-[0.985]',
      disabled && 'opacity-45 cursor-not-allowed',
      className,
    );
    const inner = cn(
      INNER_BASE,
      sizing,
      'bg-bg-elevated font-semibold text-brand-dark',
      !disabled && 'hover:bg-bg-accent',
    );
    if (href !== undefined && !disabled) {
      return (
        <Link href={href} onClick={onClick} title={title} className={outer} {...aria}>
          <span className={inner}>{children}</span>
        </Link>
      );
    }
    return (
      <button type={type} onClick={onClick} disabled={disabled} title={title} className={outer} {...aria}>
        <span className={inner}>{children}</span>
      </button>
    );
  }

  const classes = cn(
    INNER_BASE,
    'size-auto',
    sizing,
    variant === 'primary' &&
      'bg-accent font-bold text-bg-elevated hover:bg-accent-hover active:scale-[0.985]',
    variant === 'ghost' && 'font-semibold text-fg-muted hover:bg-bg-accent hover:text-fg',
    disabled && 'opacity-45 cursor-not-allowed hover:bg-accent active:scale-100',
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
