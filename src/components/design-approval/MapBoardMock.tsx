/**
 * MapBoardMock — לוח המפה של מוקאפ מסך השיעור (design-lock §3.7).
 *
 * שכבה 1: MapBoardBackground — עיצוב SVG קבוע (§5.3), אינו slot נכס Magnific.
 * שכבה 2: ציר A→B, סמנים ומקרא — SVG/HTML סמנטי אמיתי, לצמיתות (לא ראסטר, גם
 * אחרי שנכסים יגיעו). viewBox יציב ו-preserveAspectRatio="xMidYMid meet" — המפה
 * לא מתהפכת ב-RTL. כל <text> נושא הילה לבנה + textAnchor מפורש (§7 כלל 5).
 */
import { cn } from '@/lib/utils';
import { PAPERCUT_COLORS } from './motifs';
import { MapBoardBackground } from './placeholders';

const C = PAPERCUT_COLORS;

// קואורדינטות בתוך אותה מערכת צירים (0 0 800 600) של MapBoardBackground.
const ROUTE_D = 'M 655 145 C 560 190, 470 255, 395 300 C 310 350, 220 400, 150 465';
const MID_POINT = { x: 395, y: 300 };
const POINT_A = { x: 655, y: 145 };
const POINT_B = { x: 150, y: 465 };

function haloTextProps() {
  return {
    paintOrder: 'stroke' as const,
    stroke: C.elevated,
    strokeWidth: 0.8,
    strokeLinejoin: 'round' as const,
  };
}

export function MapBoardMock({ className }: { className?: string }) {
  return (
    <div className={cn('relative aspect-[4/3] overflow-hidden rounded-2xl border border-border', className)}>
      <MapBoardBackground className="absolute inset-0" />

      <svg
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="ציר מתוכנן מנקודה A לנקודה B, עם נקודת ביניים"
        className="absolute inset-0 size-full"
      >
        {/* הציר המתוכנן — מקווקו כתום */}
        <path
          d={ROUTE_D}
          fill="none"
          stroke={C.accent}
          strokeWidth="4"
          strokeDasharray="14 10"
          strokeLinecap="round"
        />
        {/* נקודת ביניים */}
        <circle cx={MID_POINT.x} cy={MID_POINT.y} r="7" fill={C.elevated} stroke={C.accent} strokeWidth="3.5" />

        {/* סמן A — דיסק מרווה עם טבעת כתומה דקה */}
        <g transform={`translate(${POINT_A.x} ${POINT_A.y})`}>
          <ellipse cx="0" cy="20" rx="16" ry="5" fill={C.fg} opacity="0.14" />
          <circle r="17" fill={C.brand} stroke={C.accent} strokeWidth="3" />
          <text
            x="0"
            y="1"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="18"
            fontWeight="700"
            fill={C.elevated}
            {...haloTextProps()}
          >
            A
          </text>
        </g>

        {/* סמן B — סיכת מיקום כתומה */}
        <g transform={`translate(${POINT_B.x} ${POINT_B.y})`}>
          <ellipse cx="0" cy="24" rx="14" ry="4.5" fill={C.fg} opacity="0.14" />
          <path
            d="M0 24C-13 8 -18 -2 -18 -13C-18 -25 -9.9 -34 0 -34C9.9 -34 18 -25 18 -13C18 -2 13 8 0 24Z"
            fill={C.accent}
            stroke={C.elevated}
            strokeWidth="2"
          />
          <circle cy="-13" r="9" fill={C.elevated} />
          <text
            x="0"
            y="-12"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="14"
            fontWeight="700"
            fill={C.accent}
            {...haloTextProps()}
          >
            B
          </text>
        </g>
      </svg>

      <div className="chip absolute top-3 start-3 border-border bg-bg/60 text-fg-muted backdrop-blur">
        ציר מתוכנן
      </div>
    </div>
  );
}
