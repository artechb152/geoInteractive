'use client';

/**
 * ReliefCoverVisuals — the two boards of „אותה גבעה, שלושה נופים” (screen 3 of
 * ReliefCoverIntroScene; spec §6). Both come from reliefCoverCompare.data:
 *   - ReliefCoverBlock: the papercut block; trees and houses stand on the ground
 *     (terrain.at), painted back to front, hidden behind the hill (isVisible). On a
 *     cover change only the objects move; on the quarry the ground itself morphs.
 *   - ReliefCoverMap: the same tile from above; contours from the same height
 *     function, cover as schematic symbols, the pre-quarry contours dashed.
 * Inside this illustration green = vegetation only. Never mirrored for RTL; every
 * <text> sets textAnchor (MapLabel does).
 */

import { useMemo, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  C, LEVELS, PIT_ROCK, contourRings, f2, getMorphMesh, identity, isVisible, mix, nearestOnLevel, ringsPath, sampleGrid,
  type Pt, type Terrain,
} from './terrainBlockGeometry';
import { ContourMapSheet, MapLabel, TerrainBlockView, useContourMorph, useIdlePrefetch } from './terrainBlock';
import {
  COVER, HILL, ORCHARD_PARCEL, QUARRY, contoursFor, quarryMask, terrainFor,
  type House, type LegendKey, type StateId, type Tree,
} from './reliefCoverCompare.data';

const EASE = [0.22, 1, 0.36, 1] as const;
const CROWNS = [C.greenDeep, C.greenMid, C.greenLight] as const;

/* ── "בשטח" — objects on the block ───────────────────────────────────────── */

const TRUNK = 0.8; // screen units

function TreeArt({ base, r, fill }: { base: Pt; r: number; fill: string }) {
  const [x, y] = base;
  const cy = y - TRUNK - r * 0.85;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={r * 0.8} ry={r * 0.28} fill={C.ink} opacity={0.18} />
      <line x1={x} y1={y} x2={x} y2={cy} stroke={C.contourIndex} strokeWidth={0.32} strokeLinecap="round" />
      <circle cx={x} cy={cy} r={r} fill={fill} />
      {/* lit from the front-left, like the block's hill-shading */}
      <circle cx={x - r * 0.3} cy={cy - r * 0.3} r={r * 0.45} fill={mix(fill, '#FFFFFF', 0.22)} />
    </g>
  );
}

/** A flat-roofed papercut box: lit south wall, shaded east wall, roof on top. */
function HouseArt({ t, h }: { t: Terrain; h: House }) {
  const { x, y, w, d, tall } = h;
  const sw = t.at(x - w / 2, y + d / 2);
  const se = t.at(x + w / 2, y + d / 2);
  const ne = t.at(x + w / 2, y - d / 2);
  const nw = t.at(x - w / 2, y - d / 2);
  const up = (p: Pt): Pt => [p[0], p[1] - tall];
  const pts = (ps: Pt[]) => ps.map(([a, b]) => `${f2(a)},${f2(b)}`).join(' ');
  return (
    <g strokeLinejoin="round">
      <polygon points={pts([sw, se, up(se), up(sw)])} fill={C.paper} stroke={C.paperEdge} strokeWidth={0.12} />
      <polygon points={pts([se, ne, up(ne), up(se)])} fill={C.paperEdge} stroke={C.paperEdge} strokeWidth={0.12} />
      <polygon points={pts([up(sw), up(se), up(ne), up(nw)])} fill={C.contourIndex} />
    </g>
  );
}

type Placed = { key: string; y: number; node: ReactNode };

function placeCover(t: Terrain, state: StateId): Placed[] {
  const c = COVER[state];
  const out: Placed[] = [];
  const tree = (tr: Tree, fill: string) => {
    if (!isVisible(t, tr.x, tr.y)) return;
    const base = t.at(tr.x, tr.y);
    out.push({ key: tr.id, y: base[1], node: <TreeArt base={base} r={tr.r} fill={fill} /> });
  };
  for (const tr of c.grove) tree(tr, CROWNS[tr.tone ?? 0]);
  for (const tr of c.orchard) tree(tr, C.greenMid);
  for (const h of c.houses) {
    if (!isVisible(t, h.x, h.y)) continue;
    out.push({ key: h.id, y: t.at(h.x, h.y + h.d / 2)[1], node: <HouseArt t={t} h={h} /> });
  }
  return out.sort((a, b) => a.y - b.y); // painter's order: far → near
}

// Ready the quarry's morph mesh and contours while the reader is idle.
const PREFETCH = [() => void getMorphMesh(terrainFor('quarry')), () => void contoursFor('quarry')];

export function ReliefCoverBlock({ state, ariaLabel }: { state: StateId; ariaLabel: string }) {
  const reduce = useReducedMotion();
  const terrain = terrainFor(state);
  const placed = useMemo(() => placeCover(terrain, state), [terrain, state]);
  useIdlePrefetch(PREFETCH);
  return (
    <TerrainBlockView
      terrain={terrain}
      ariaLabel={ariaLabel}
      objects={
        <AnimatePresence initial={false}>
          {placed.map((p, i) => (
            <motion.g
              key={p.key}
              initial={reduce ? false : { opacity: 0, scale: 0.3 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: { duration: reduce ? 0 : 0.45, ease: EASE, delay: reduce ? 0 : Math.min(0.5, i * 0.012) },
              }}
              exit={{ opacity: 0, y: reduce ? 0 : 1.2, transition: { duration: reduce ? 0 : 0.35, ease: EASE } }}
              style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
            >
              {p.node}
            </motion.g>
          ))}
        </AnimatePresence>
      }
    />
  );
}

/* ── "במפה" — contours and schematic land-cover symbols ──────────────────── */

const MAP_NUMBERS: { level: number; at: Pt }[] = [
  { level: 150, at: [27, 18] },
  { level: 110, at: [11, 26] },
];

// The pre-quarry contours, drawn dashed under the quarry state's lines.
const BEFORE_PATHS = LEVELS.map((L) => ringsPath(contoursFor('bare').rings.get(L) ?? [], identity));

// Quarry site on the map = mask ≥ 0.5; short ticks along its cut faces, pointing into the cut.
const QUARRY_AREA = (() => {
  const rings = contourRings(sampleGrid(quarryMask), 0.5);
  const ticks: string[] = [];
  for (const ring of rings) {
    let acc = 0;
    for (let i = 1; i <= ring.length; i++) {
      const a = ring[i - 1];
      const b = ring[i % ring.length];
      acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc < 1.6) continue;
      acc = 0;
      if (HILL(b[0], b[1]) - QUARRY.floor < 3) continue; // faces only, not the open front
      const e = 0.3;
      const gx = (quarryMask(b[0] + e, b[1]) - quarryMask(b[0] - e, b[1])) / (2 * e);
      const gy = (quarryMask(b[0], b[1] + e) - quarryMask(b[0], b[1] - e)) / (2 * e);
      const g = Math.hypot(gx, gy) || 1;
      ticks.push(`M${f2(b[0])},${f2(b[1])}L${f2(b[0] + (gx / g) * 1.1)},${f2(b[1] + (gy / g) * 1.1)}`);
    }
  }
  return { d: ringsPath(rings, identity), ticks: ticks.join('') };
})();

export function ReliefCoverMap({ state, ariaLabel }: { state: StateId; ariaLabel: string }) {
  const reduce = useReducedMotion();
  const contours = contoursFor(state);
  const { paths, still } = useContourMorph(contours);
  const c = COVER[state];
  const quarry = state === 'quarry';
  const fade = {
    initial: reduce ? false : { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: reduce ? 0 : 0.4, ease: EASE },
  } as const;
  const P = ORCHARD_PARCEL;

  return (
    <ContourMapSheet
      ariaLabel={ariaLabel}
      paths={paths}
      layerTint={C.contour}
      behind={
        <AnimatePresence initial={false}>
          {c.grove.length > 0 && (
            <motion.g key="grove-tint" {...fade}>
              <g opacity={0.3} fill={C.greenLight}>
                {c.grove.map((t) => (
                  <circle key={t.id} cx={t.x} cy={t.y} r={2.3} />
                ))}
              </g>
            </motion.g>
          )}
          {c.orchard.length > 0 && (
            <motion.rect
              key="orchard-parcel"
              {...fade}
              x={P.x0}
              y={P.y0}
              width={P.x1 - P.x0}
              height={P.y1 - P.y0}
              fill={C.greenLight}
              fillOpacity={0.22}
              stroke={C.greenMid}
              strokeOpacity={0.5}
              strokeWidth={0.2}
            />
          )}
          {quarry && (
            <motion.g key="quarry" {...fade}>
              <path d={QUARRY_AREA.d} fill={PIT_ROCK} fillOpacity={0.55} />
              {/* the previous state's contours — dashed; hidden wherever the new line lies on them */}
              <g fill="none" stroke={C.contourIndex} strokeOpacity={0.6} strokeWidth={0.3} strokeDasharray="0.8 0.6">
                {BEFORE_PATHS.map((d, i) => (
                  <path key={LEVELS[i]} d={d} />
                ))}
              </g>
            </motion.g>
          )}
        </AnimatePresence>
      }
      inClip={
        <AnimatePresence initial={false}>
          {c.grove.map((t) => (
            <motion.circle key={'g' + t.id} {...fade} cx={t.x} cy={t.y} r={0.6} fill={C.greenDeep} />
          ))}
          {c.orchard.map((t) => (
            <motion.circle key={'o' + t.id} {...fade} cx={t.x} cy={t.y} r={0.5} fill={C.greenDeep} />
          ))}
          {c.houses.map((h) => (
            <motion.rect key={'h' + h.id} {...fade} x={h.x - h.w / 2} y={h.y - h.d / 2} width={h.w} height={h.d} fill={C.ink} />
          ))}
          {quarry && (
            <motion.path
              key="quarry-ticks"
              {...fade}
              d={QUARRY_AREA.ticks}
              fill="none"
              stroke={C.contourIndex}
              strokeWidth={0.3}
              strokeLinecap="round"
            />
          )}
        </AnimatePresence>
      }
    >
      {/* elevation numbers on the lines (metres), once the contours have settled */}
      {still &&
        MAP_NUMBERS.map(({ level, at }) => {
          const p = nearestOnLevel(contours, level, at);
          return p ? <MapLabel key={level} at={p} text={String(level)} fill={C.contourIndex} size={2.3} charW={0.62} /> : null;
        })}
    </ContourMapSheet>
  );
}

/* ── Legend swatches (HTML legend in ReliefCoverCompare) ─────────────────── */

const ARC = 'M1,7 C5,2 11,2 15,7';

export function LegendSwatch({ k }: { k: LegendKey }) {
  return (
    <svg viewBox="0 0 16 10" className="h-3 w-5 shrink-0" aria-hidden>
      {k === 'contour' && <path d={ARC} fill="none" stroke={C.contour} strokeWidth={1.1} />}
      {k === 'index' && <path d={ARC} fill="none" stroke={C.contourIndex} strokeWidth={1.8} />}
      {k === 'before' && (
        <path d={ARC} fill="none" stroke={C.contourIndex} strokeOpacity={0.6} strokeWidth={1.1} strokeDasharray="2 1.5" />
      )}
      {k === 'grove' && (
        <>
          <g opacity={0.3} fill={C.greenLight}>
            <circle cx={6} cy={5} r={4} />
            <circle cx={11} cy={4.5} r={3.6} />
          </g>
          <g fill={C.greenDeep}>
            <circle cx={4.5} cy={4} r={1} />
            <circle cx={8.2} cy={6.4} r={1} />
            <circle cx={12} cy={3.6} r={1} />
          </g>
        </>
      )}
      {k === 'orchard' && (
        <>
          <rect x={1} y={1} width={14} height={8} fill={C.greenLight} fillOpacity={0.22} stroke={C.greenMid} strokeOpacity={0.5} strokeWidth={0.5} />
          <g fill={C.greenDeep}>
            {[4, 8, 12].flatMap((x) => [3.5, 6.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={0.9} />))}
          </g>
        </>
      )}
      {k === 'houses' && <rect x={5} y={2.5} width={6} height={5} fill={C.ink} />}
      {k === 'quarry' && (
        <>
          <rect x={1} y={2} width={14} height={6} fill={PIT_ROCK} fillOpacity={0.55} />
          <path d="M3,2 V4 M6,2 V4 M9,2 V4 M12,2 V4" stroke={C.contourIndex} strokeWidth={0.8} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
