import { cn } from '@/lib/utils';

/**
 * BrandEmblem — סמל הקורס: שושנת מצפן נקייה בטוקני מרווה/כתום.
 * ללא טקסט בתוך ה-SVG (design-system §18). לא מתהפך ב-RTL.
 */
export function BrandEmblem({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="-50 -50 100 100" className={cn('size-10 shrink-0', className)}>
      {/* טבעת חיצונית */}
      <circle r="46" fill="none" stroke="#5B7C5C" strokeWidth="4" />
      <circle r="38" fill="none" stroke="#749C75" strokeWidth="1.5" opacity="0.5" />
      {/* שנתות */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="0"
          y1="-38"
          x2="0"
          y2={deg % 90 === 0 ? '-30' : '-34'}
          stroke="#5B7C5C"
          strokeWidth={deg % 90 === 0 ? 3 : 1.5}
          transform={`rotate(${deg})`}
        />
      ))}
      {/* מחט צפון — כתום */}
      <path d="M 0 -26 L 8 6 L 0 0 Z" fill="#EB9E48" />
      <path d="M 0 -26 L -8 6 L 0 0 Z" fill="#F2B872" />
      {/* מחט דרום — מרווה */}
      <path d="M 0 26 L 8 -2 L 0 4 Z" fill="#749C75" />
      <path d="M 0 26 L -8 -2 L 0 4 Z" fill="#5B7C5C" />
      <circle r="4" fill="#3a3a3a" />
      <circle r="1.6" fill="#FFFBF7" />
    </svg>
  );
}
