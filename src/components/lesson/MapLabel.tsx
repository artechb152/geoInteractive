import { cn } from '@/lib/utils';

/**
 * MapLabel — תווית טקסט בתוך SVG של דיאגרמה, במקום מאות העתקי
 * `paintOrder="stroke" stroke="#ffffff"` הפזורים בסצנות.
 *
 * - `anchor` הוא prop חובה — אוכף את כלל הפרויקט: לעולם לא להשאיר
 *   text-anchor ברירת-מחדל ב-RTL (באג החיתוך המוכר).
 * - ההילה היא לבן-הטוקן (bg-elevated) דרך מחלקה — בלי hex קשיח.
 */
export function MapLabel({
  x,
  y,
  anchor,
  halo = true,
  haloWidth = 3,
  className,
  children,
  ...rest
}: {
  x: number | string;
  y: number | string;
  /** חובה — 'start' | 'middle' | 'end' (כלל ה-RTL של הפרויקט) */
  anchor: 'start' | 'middle' | 'end';
  /** הילת לבן סביב האותיות לקריאות על מפה */
  halo?: boolean;
  haloWidth?: number;
  className?: string;
  children: React.ReactNode;
} & Omit<React.SVGProps<SVGTextElement>, 'x' | 'y' | 'textAnchor' | 'children'>) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      paintOrder="stroke"
      strokeWidth={halo ? haloWidth : 0}
      strokeLinejoin="round"
      className={cn('fill-fg', halo && 'stroke-bg-elevated', className)}
      {...rest}
    >
      {children}
    </text>
  );
}
