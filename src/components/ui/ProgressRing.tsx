import { cn } from '@/lib/utils';

/**
 * ProgressRing — טבעת ההתקדמות של דף הבית (design lock), כפרימיטיב משותף.
 * חולץ מ-ProgressCard ללא שינוי רינדור: קשת olive-ring על מסילה לבנה
 * שקופה (מיועד למשטח pine כהה), אחוז מרכזי כ-HTML ממורכז — לא <text>
 * (עוקף את באג ה-textAnchor המוכר ב-RTL). הקשת מונפשת אל הערך
 * (motion-reduce מבטל).
 */
export function ProgressRing({
  percent,
  size = 170,
  caption = 'הושלם',
  className,
}: {
  /** 0–100 */
  percent: number;
  /** קוטר בפיקסלים (ברירת מחדל — 170 כמו בדף הבית) */
  size?: number;
  /** כיתוב מתחת לאחוז; מחרוזת ריקה מסתירה */
  caption?: string;
  className?: string;
}) {
  const R = 77;
  const C = 2 * Math.PI * R;
  const arc = (percent / 100) * C;

  return (
    <div className={className}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 170 170" className="size-full -rotate-90" aria-hidden>
          <circle cx="85" cy="85" r={R} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="10" />
          <circle
            cx="85"
            cy="85"
            r={R}
            fill="none"
            className="stroke-olive-ring transition-[stroke-dasharray] duration-700 ease-snap motion-reduce:transition-none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${C}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            dir="ltr"
            className={cn(
              'font-extrabold leading-none text-white',
              size >= 150 ? 'text-[44px]' : 'text-3xl',
            )}
          >
            {percent}
            <span className={size >= 150 ? 'text-2xl font-bold' : 'text-base font-bold'}>%</span>
          </span>
          {caption && (
            <span className="mt-1.5 text-base font-medium text-paper-bright/90">{caption}</span>
          )}
        </div>
      </div>
    </div>
  );
}
