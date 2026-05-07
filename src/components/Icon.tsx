import { cn } from '@/lib/utils';

export type IconName =
  | 'globe' | 'compass' | 'target' | 'crosshair'
  | 'mountain' | 'wave' | 'plane' | 'satellite' | 'bolt'
  | 'tank' | 'ship' | 'truck' | 'flag'
  | 'capital' | 'oil' | 'port' | 'star'
  | 'pyramid' | 'layers' | 'eye' | 'shield'
  | 'arrow-right' | 'arrow-left' | 'check' | 'spark'
  | 'fuel' | 'clock' | 'box'
  | 'scale' | 'people' | 'megaphone' | 'hourglass' | 'mask';

const PATHS: Record<IconName, React.ReactNode> = {
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M16.2 7.8 13 13l-5.2 3.2L11 11l5.2-3.2Z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </>
  ),
  mountain: <path d="M3 20 9 9l4.5 7L17 11l4 9H3Z" />,
  wave: <path d="M3 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2M3 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" />,
  plane: <path d="M3 17 21 7l-2 5 2 6-5-2-6 5-1-5-6-1Z" />,
  satellite: (
    <>
      <path d="m9 9 6 6M14.5 4.5l5 5L17 12l-5-5zM4.5 14.5l5 5L12 17l-5-5z" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16 16a4 4 0 0 1-4 4M20 16a8 8 0 0 1-8 8" />
    </>
  ),
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  tank: (
    <>
      <rect x="2" y="13" width="14" height="5" rx="1" />
      <path d="M5 13V9h7v4M16 14h4M18 11h-2v3" />
      <circle cx="5.5" cy="19.5" r="1" />
      <circle cx="13" cy="19.5" r="1" />
    </>
  ),
  ship: <path d="M3 17h18l-2 4H5l-2-4ZM5 17V8l7-4 7 4v9M9 13h6" />,
  truck: (
    <>
      <path d="M2 16V6h11v10M13 9h4l3 4v3h-7" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  flag: <path d="M5 22V3M5 4h12l-3 4 3 4H5" />,
  capital: (
    <>
      <path d="M3 21h18M5 21V11l7-7 7 7v10" />
      <path d="M9 21v-6M15 21v-6M9 11h6" />
    </>
  ),
  oil: (
    <>
      <path d="M5 21V8l4-3v16M9 8l5 3v10M14 21V11l5 3v7" />
      <path d="M3 21h18" />
    </>
  ),
  port: (
    <>
      <path d="M12 3v18M5 21h14M8 9h8M3 17c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1" />
      <circle cx="12" cy="6" r="2" />
    </>
  ),
  star: <path d="M12 2.5 14.7 9l6.8.6-5.1 4.6L18 21l-6-3.6L6 21l1.6-6.8L2.5 9.6 9.3 9 12 2.5Z" />,
  pyramid: <path d="M12 3 3 21h18L12 3ZM12 3v18M3 21l9-6M21 21l-9-6" />,
  layers: <path d="m12 2 10 6-10 6L2 8l10-6Zm-10 12 10 6 10-6M2 18l10 6 10-6" />,
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  shield: <path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Z" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  check: <path d="m4 12 5 5L20 6" />,
  spark: <path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.5 5.5l4 4M14.5 14.5l4 4M5.5 18.5l4-4M14.5 9.5l4-4" />,
  fuel: (
    <>
      <path d="M3 21V5l8-2v18M3 9h8M14 21V8l3 1v12" />
      <path d="M3 21h14M17 12v3a2 2 0 0 0 4 0V8l-2-2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  box: <path d="m3 8 9-5 9 5-9 5-9-5Zm0 0v8l9 5 9-5V8M12 13v10" />,
  scale: (
    <>
      <path d="M12 3v18M5 21h14M5 8h14M5 8 2 14h6L5 8Zm14 0-3 6h6l-3-6Z" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-1a6 6 0 0 1 12 0v1" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M14 21v-1a4 4 0 0 1 8 0v1" />
    </>
  ),
  megaphone: (
    <>
      <path d="M3 11v3a1 1 0 0 0 1 1h2l9 5V5L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M19 8a4 4 0 0 1 0 9" />
      <path d="M7 15v4a2 2 0 0 0 4 0v-2" />
    </>
  ),
  hourglass: (
    <>
      <path d="M5 3h14M5 21h14" />
      <path d="M6 3v3a6 6 0 0 0 12 0V3" />
      <path d="M6 21v-3a6 6 0 0 1 12 0v3" />
    </>
  ),
  mask: (
    <>
      <path d="M2 8c0-2 2-3 4-3s4 1 6 4c2-3 4-4 6-4s4 1 4 3c0 5-3 11-10 11S2 13 2 8Z" />
      <circle cx="8" cy="10" r="0.8" fill="currentColor" />
      <circle cx="16" cy="10" r="0.8" fill="currentColor" />
    </>
  ),
};

export function Icon({
  name,
  className,
  size = 24,
  strokeWidth = 1.5,
}: {
  name: IconName;
  className?: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('inline-block shrink-0', className)}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
