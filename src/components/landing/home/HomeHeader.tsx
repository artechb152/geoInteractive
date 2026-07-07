/**
 * HomeHeader — כותרת פנימית של דף הבית (design/mockup.png, פס עליון).
 * מותג + שושנת רוחות בימין (inline-start).
 */
export function HomeHeader() {
  return (
    <header className="relative z-10 flex items-start justify-between">
      {/* מותג — ילד ראשון = ימין ויזואלי ב-RTL */}
      <div className="flex items-center gap-4">
        <CompassRose className="size-16 shrink-0" />
        <div className="flex flex-col gap-1.5">
          <span className="text-[28px] font-extrabold leading-none text-olive-ink">
            גיאוגרפיה צבאית
          </span>
          <span className="text-[15px] font-medium leading-none text-olive-muted">
            למי שמבינים מרחב מנצחים
          </span>
        </div>
      </div>
    </header>
  );
}

/** שושנת רוחות זהובה-זיתית — קירוב וקטורי ללוגו במוקאפ. לא מתהפכת ב-RTL. */
function CompassRose({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="-50 -50 100 100" className={className}>
      <circle r="46" fill="none" stroke="#8A6F4D" strokeWidth="3" />
      <circle r="39" fill="none" stroke="#8A6F4D" strokeWidth="1" opacity="0.55" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="0"
          y1="-46"
          x2="0"
          y2="-41"
          stroke="#8A6F4D"
          strokeWidth="1.5"
          transform={`rotate(${deg})`}
        />
      ))}
      {/* חודים ראשיים */}
      {[0, 90, 180, 270].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path d="M 0 -36 L 5.5 -4 L 0 0 Z" fill="#6B5A3E" />
          <path d="M 0 -36 L -5.5 -4 L 0 0 Z" fill="#B39A6B" />
        </g>
      ))}
      {/* חודים משניים */}
      {[45, 135, 225, 315].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path d="M 0 -22 L 4 -3 L 0 0 Z" fill="#8A6F4D" />
          <path d="M 0 -22 L -4 -3 L 0 0 Z" fill="#C9B48C" />
        </g>
      ))}
      <circle r="3.5" fill="#38432E" />
      <circle r="1.4" fill="#F3E9DC" />
    </svg>
  );
}
