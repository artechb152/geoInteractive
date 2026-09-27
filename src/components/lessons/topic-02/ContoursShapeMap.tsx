'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { DENSITY_RENDER_LABELS } from './contourDensityRenders.data';
import { GEOMETRY, type DensityKind } from './contourDensityGeometry';

export type { DensityKind } from './contourDensityGeometry';
export const DENSITY_ASSET_BASE = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/contour-density`;
const KINDS: DensityKind[] = ['gentle', 'steep', 'cliff'];
const INK = '#38432E';
const SECTION_Y = 120;

/**
 * Exact plan contours plus realistic illustrations guided by the same 3D model.
 * Fine surface appearance is illustrative; it is not a surveyed terrain model.
 * Map contours are exact 10 m isolines; the 50 m index is heavier.
 * All plates stay mounted for immediate selection and interruption-safe fades.
 */
export function ContoursShapeMap({
  kind,
  label,
  describedBy,
}: {
  kind: DensityKind;
  label: string;
  describedBy?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <svg
      viewBox="0 0 200 190"
      className="block w-full h-auto select-none"
      role="img"
      aria-label={label}
      aria-describedby={describedBy}
    >
      <rect width="200" height="119" rx="4" fill="#F6EFE6" />
      <rect y="123" width="200" height="67" rx="4" fill="#F6EFE6" />
      {KINDS.map((terrain) => {
        const anchors = DENSITY_RENDER_LABELS[terrain];
        const active = terrain === kind;
        return (
          <motion.g
            key={terrain}
            initial={false}
            animate={{ opacity: active ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden={!active}
            className="pointer-events-none"
          >
            <TopographicPlate kind={terrain} />
            {[16, 184].map((x, i) => (
              <g key={i} transform={`translate(${x} 58)`}>
                <circle r="3.6" fill="#FFFFFF" stroke={INK} strokeWidth="0.55" />
                <text textAnchor="middle" dominantBaseline="central" fontSize="4.2" fontWeight={700} fill={INK} className="font-display">
                  {i === 0 ? 'A' : 'B'}
                </text>
              </g>
            ))}
            <image
              href={`${DENSITY_ASSET_BASE}/dioramas/${terrain}-natural.webp`}
              y={SECTION_Y}
              width="200"
              height="70"
              aria-hidden="true"
            />
            {anchors.side.labels.map(({ text, point }) => (
              <g key={text}>
                <line x1={point[0] + 2} x2={point[0] + 4} y1={SECTION_Y + point[1]} y2={SECTION_Y + point[1]} stroke="#DCCDB2" strokeWidth="0.4" />
                <text x={point[0]} y={SECTION_Y + point[1]} textAnchor="end" dominantBaseline="central" fontSize="4" fill="#8A8873" className="font-display tabular-nums">
                  {text}
                </text>
              </g>
            ))}
            {anchors.side.ends.map((point, i) => (
              <text key={i} x={point[0]} y={SECTION_Y + point[1] + 4} textAnchor="middle" dominantBaseline="central" fontSize="4.2" fontWeight={700} fill={INK} className="font-display">
                {i === 0 ? 'A' : 'B'}
              </text>
            ))}
          </motion.g>
        );
      })}
    </svg>
  );
}

/** Flat cartography, without photographic terrain or perspective distortion. */
function TopographicPlate({ kind, miniature = false }: { kind: DensityKind; miniature?: boolean }) {
  const rings = GEOMETRY[kind].rings.filter((ring) => ring.visible);
  return (
    <g>
      <rect x="2" y="2" width="196" height="114" rx="3" fill="#F8F2E7" stroke="#DCCDB2" strokeWidth="0.35" />
      {!miniature && (
        <g stroke="#DCCDB2" strokeWidth="0.3" opacity="0.55">
          {[20, 40, 60, 80, 100, 120, 140, 160, 180].map((x) => <path key={x} d={`M${x} 3V115`} />)}
          {[18, 38, 58, 78, 98].map((y) => <path key={y} d={`M3 ${y}H197`} />)}
        </g>
      )}
      {rings.map((ring) => (
        <path key={ring.h} d={ring.d} fill="none" stroke="#8A6F4D" strokeWidth={miniature ? 1.8 : ring.h === 50 ? 1 : 0.5} strokeLinejoin="round" />
      ))}
      {kind === 'cliff' && <path d={GEOMETRY[kind].hachures} fill="none" stroke="#8A6F4D" strokeWidth="0.65" />}
      {!miniature && (
        <>
          <path d="M16 58H184" fill="none" stroke={INK} strokeWidth="0.55" strokeDasharray="2.4 1.6" />
          {rings.filter((ring) => ring.h === 10 || ring.h === (kind === 'gentle' ? 30 : 50)).map((ring) => (
            <g key={ring.h} transform={`translate(${ring.label[0]} ${ring.label[1]})`}>
              <rect x="-4" y="-3" width="8" height="6" rx="1" fill="#F8F2E7" />
              <text textAnchor="middle" dominantBaseline="central" fontSize="4.6" fontWeight={700} fill="#8A6F4D" className="font-display tabular-nums">{ring.h}</text>
            </g>
          ))}
          <circle cx="100" cy="58" r="0.9" fill={INK} />
        </>
      )}
    </g>
  );
}

export function ContourMapThumbnail({ kind }: { kind: DensityKind }) {
  return (
    <svg viewBox="0 0 200 120" aria-hidden="true" className="h-10 w-16 rounded-lg">
      <TopographicPlate kind={kind} miniature />
    </svg>
  );
}
