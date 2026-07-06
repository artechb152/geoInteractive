/**
 * TopoField — שדה קווי-גובה דקורטיבי לרקעי Hero ורצועות (שפת V2).
 * SVG בלבד, ללא טקסט (כללי הגרפיקה של הפרויקט), aria-hidden, לא נוגע בעכבר.
 * ההורה חייב להיות relative; הרכיב ממלא אותו.
 */
export function TopoField({ className }: { className?: string }) {
  // איים קונטוריים אורגניים + סימוני מדידה "+" — טקסטורת שולחן מפות.
  const ISLANDS: { cx: number; cy: number; s: number }[] = [
    { cx: 200, cy: 70, s: 1.15 },
    { cx: 690, cy: 300, s: 1.6 },
    { cx: 1180, cy: 90, s: 0.95 },
  ];
  const RINGS = [1, 0.74, 0.5, 0.28];
  const PLUS: [number, number][] = [
    [90, 260], [430, 40], [960, 330], [1330, 250], [560, 180],
  ];

  return (
    <svg
      aria-hidden
      viewBox="0 0 1400 380"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 size-full select-none ${className ?? ''}`}
    >
      {ISLANDS.map(({ cx, cy, s }, i) => (
        <g key={i} transform={`translate(${cx} ${cy}) scale(${s})`}>
          {RINGS.map((r, j) => (
            <path
              key={j}
              d="M -150 8 C -138 -42, -66 -66, 6 -60 C 78 -54, 138 -28, 142 8 C 138 44, 66 66, -14 62 C -90 58, -158 46, -150 8 Z"
              fill="none"
              stroke="#5B7C5C"
              strokeWidth={1.1 / s}
              opacity={0.16 - j * 0.025}
              transform={`scale(${r}) rotate(${j * 4})`}
            />
          ))}
          <circle r="2" fill="#5B7C5C" opacity="0.25" />
        </g>
      ))}
      {PLUS.map(([x, y], i) => (
        <path
          key={i}
          d={`M ${x - 7} ${y} H ${x + 7} M ${x} ${y - 7} V ${y + 7}`}
          stroke="#EB9E48"
          strokeWidth="1.2"
          opacity="0.35"
          fill="none"
        />
      ))}
    </svg>
  );
}
