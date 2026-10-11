import { cn } from '@/lib/utils';

/**
 * ARCHIVED SNAPSHOT — the papercut origin vignettes of the „תכסית טבעית / תכסית מלאכותית”
 * cards, as they were before the 2026-10-11 realistic redesign. Used only by LandCoverSceneV1
 * (/archive/topic-02/landcover-v1/). Do not edit; the live ones are in LandCoverVisuals.tsx.
 */

type GlyphProps = { className?: string };

/** Natural cover: irregular, lumpy crowns of mixed size — no rows, no edges. */
export function NaturalVignetteV1({ className }: GlyphProps) {
  const crowns: [number, number, number][] = [
    [22, 22, 8], [37, 17, 6], [34, 33, 9], [52, 26, 6.5], [18, 40, 5.5], [50, 42, 7.5], [66, 33, 5], [70, 46, 4], [28, 48, 3.5], [62, 18, 3.8],
  ];
  return (
    <svg viewBox="0 0 88 60" aria-hidden className={cn('w-[88px] h-[60px] shrink-0', className)}>
      <path d="M8,30 C6,14 22,6 40,8 C58,6 80,12 80,30 C82,46 68,56 48,54 C30,58 10,50 8,30 Z" fill="#C2C68F" />
      <g fill="#3E3018" opacity={0.2}>
        {crowns.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x + 1.3} cy={y + 1.6} r={r} />
        ))}
      </g>
      <g fill="#5A6A3F">
        {crowns.map(([x, y, r]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r={r} />
            <circle cx={x + r * 0.5} cy={y + r * 0.3} r={r * 0.62} />
          </g>
        ))}
      </g>
      <g fill="#7A8A55" opacity={0.85}>
        {crowns.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x - r * 0.28} cy={y - r * 0.3} r={r * 0.5} />
        ))}
      </g>
    </svg>
  );
}

/** Artificial cover: sharp parcel edge, straight rows, fixed spacing, identical crowns. */
export function PlantedVignetteV1({ className }: GlyphProps) {
  const pts = Array.from({ length: 12 }, (_, i) => ({ x: 20 + (i % 4) * 16, y: 16 + Math.floor(i / 4) * 14 }));
  return (
    <svg viewBox="0 0 88 60" aria-hidden className={cn('w-[88px] h-[60px] shrink-0', className)}>
      <rect x={8} y={5} width={72} height={50} rx={1} fill="#D3CAA3" />
      <rect x={8} y={5} width={72} height={50} rx={1} fill="none" stroke="#A99B72" strokeWidth={1} />
      <g fill="#CEC69D">
        {[16, 30, 44].map((y) => (
          <rect key={y} x={11} y={y - 4} width={66} height={8} rx={4} />
        ))}
      </g>
      <g fill="#3E3018" opacity={0.22}>
        {pts.map((t) => (
          <circle key={`${t.x}-${t.y}`} cx={t.x + 1.2} cy={t.y + 1.5} r={5} />
        ))}
      </g>
      <g fill="#4A5A36">
        {pts.map((t) => (
          <circle key={`${t.x}-${t.y}`} cx={t.x} cy={t.y} r={5} />
        ))}
      </g>
      <g fill="#687852" opacity={0.85}>
        {pts.map((t) => (
          <circle key={`${t.x}-${t.y}`} cx={t.x - 1.4} cy={t.y - 1.5} r={2.5} />
        ))}
      </g>
    </svg>
  );
}
