/**
 * TopoField — שדה קווי-גובה דקורטיבי לרקעי Hero ורצועות, בשפת דף הבית
 * (design lock): עקומות זורמות בגוון tan (tanline.contour) בשקיפות עדינה —
 * אותו מרקם כמו ContourField של דף הבית, בפורמט רצועה.
 * SVG בלבד, ללא טקסט, aria-hidden, לא נוגע בעכבר; ההורה חייב להיות relative.
 * ללא כתום — כתום שמור לפעולה/פוקוס בלבד.
 */
export function TopoField({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1400 380"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 size-full select-none ${className ?? ''}`}
      fill="none"
    >
      <g className="stroke-border-strong" strokeWidth="1.2" opacity="0.22">
        <path d="M-40 60 C 120 20, 220 110, 380 80 S 640 10, 780 70" />
        <path d="M-40 120 C 140 80, 240 170, 400 140 S 660 70, 820 130" />
        <path d="M-40 180 C 160 140, 260 230, 420 200 S 680 130, 860 190" />
        <path d="M880 40 C 1000 10, 1100 90, 1240 60 S 1400 20, 1480 50" />
        <path d="M920 100 C 1040 70, 1140 150, 1280 120 S 1440 80, 1500 110" />
        <path d="M960 160 C 1080 130, 1180 210, 1320 180 S 1460 140, 1520 170" />
        <path d="M-40 280 C 100 250, 220 320, 380 290 S 620 240, 760 290" />
        <path d="M520 350 C 660 320, 780 390, 940 360 S 1200 310, 1340 360" />
        <path d="M900 250 C 1020 220, 1120 300, 1260 270 S 1420 230, 1500 260" />
      </g>
    </svg>
  );
}
