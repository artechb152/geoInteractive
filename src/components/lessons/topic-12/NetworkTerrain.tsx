'use client';

/**
 * Topic-12 · 12.3 — one terrain under both maps of the scene.
 *
 * The road network (nodes/edges from the scene) is drawn as roads on a light
 * relief, and the Buffer map reuses the same terrain and the same roads, so
 * "Network + Buffer" really is one map. Coordinates are the scene's own
 * (0–100 × 0–56); nothing is mirrored for RTL.
 *
 * Bridge E spans a short ravine. The ravine starts and ends inside the two
 * road-faces that meet at E, so it never crosses another road — the network's
 * topology stays exactly as given. Relief and ravine are schematic.
 */

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Pt = [number, number];
export type NetNode = { id: string; x: number; y: number; label: string; isCritical?: boolean };
export type NetThreat = { id: string; x: number; y: number; label: string; range: number };

export const VB_W = 100;
export const VB_H = 56;
/** keeps the whole friendly-force marker (and its focus ring) inside the frame */
const EDGE = 3.6;

// ── Terrain ──────────────────────────────────────────────────────────────

function heightAt(x: number, y: number): number {
  const g = (cx: number, cy: number, sx: number, sy: number) =>
    Math.exp(-(((x - cx) ** 2) / (2 * sx * sx) + ((y - cy) ** 2) / (2 * sy * sy)));
  // a few overlapping, elongated hills so the relief doesn't read as bull's-eyes
  return (
    55 * g(30, 7, 10, 5) + 30 * g(40, 11, 6, 4) +
    45 * g(82, 9, 9, 5) + 25 * g(92, 16, 5, 6) +
    40 * g(14, 51, 10, 5) + 22 * g(6, 44, 5, 5) +
    48 * g(89, 52, 10, 6) + 26 * g(62, 51, 7, 3.5) +
    6 * Math.sin(x * 0.21 + y * 0.13)
  );
}
const CONTOURS: string = (() => {
  const N = 2; // samples per unit
  const sx = VB_W * N, sy = VB_H * N;
  const v: number[][] = [];
  for (let j = 0; j <= sy; j++) {
    v[j] = [];
    for (let i = 0; i <= sx; i++) v[j][i] = heightAt(i / N, j / N);
  }
  let d = '';
  for (let level = 10; level < 60; level += 10) {
    for (let j = 0; j < sy; j++) {
      for (let i = 0; i < sx; i++) {
        const a = v[j][i], b = v[j][i + 1], c = v[j + 1][i + 1], e = v[j + 1][i];
        const x0 = i / N, y0 = j / N, s = 1 / N;
        const t = (p: number, q: number) => (level - p) / (q - p);
        const p: Pt[] = [];
        if ((a < level) !== (b < level)) p.push([x0 + t(a, b) * s, y0]);
        if ((b < level) !== (c < level)) p.push([x0 + s, y0 + t(b, c) * s]);
        if ((e < level) !== (c < level)) p.push([x0 + t(e, c) * s, y0 + s]);
        if ((a < level) !== (e < level)) p.push([x0, y0 + t(a, e) * s]);
        for (let k = 0; k + 1 < p.length; k += 2) d += `M${p[k][0].toFixed(2)} ${p[k][1].toFixed(2)}L${p[k + 1][0].toFixed(2)} ${p[k + 1][1].toFixed(2)}`;
      }
    }
  }
  return d;
})();
/** Ravine under bridge E — stays inside faces D·G·E and E·H·F. */
const RAVINE = 'M54.5 23.5 C 53.5 27, 51.2 30.5, 50 35 C 49.2 38.5, 52.8 42.5, 56.5 46.5';

function Terrain() {
  return (
    <g aria-hidden>
      <rect width={VB_W} height={VB_H} className="fill-paper-card" />
      <path d={CONTOURS} fill="none" className="stroke-tanline-contour" strokeWidth="0.12" opacity="0.5" />
      {/* ravine: a soft band + the wadi line */}
      <path d={RAVINE} fill="none" className="stroke-terrain-sky/15" strokeWidth="3.4" strokeLinecap="round" />
      <path d={RAVINE} fill="none" className="stroke-terrain-sky" strokeWidth="0.5" strokeLinecap="round" opacity="0.75" />
    </g>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────

function Plate({ x, y, text, size = 2.2, className }: { x: number; y: number; text: string; size?: number; className: string }) {
  const w = text.length * size * 0.58 + size * 0.9;
  const h = size * 1.45;
  return (
    <g pointerEvents="none">
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} className="fill-bg-elevated" opacity={0.95} />
      <text x={x} y={y + size * 0.35} textAnchor="middle" fontSize={size} className={cn('font-display font-bold', className)}>
        {text}
      </text>
    </g>
  );
}

/** 0 → 1 over `ms` each time `runKey` changes (never loops). null = idle. */
function useRunOnce(runKey: number, ms: number, enabled: boolean): number | null {
  const [t, setT] = useState<number | null>(null);
  const raf = useRef(0);
  useEffect(() => {
    if (!enabled || runKey === 0) {
      setT(null);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setT(k);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [runKey, ms, enabled]);
  return t;
}

function pointAlong(pts: Pt[], t: number): Pt {
  const seg = pts.slice(1).map((b, i) => Math.hypot(b[0] - pts[i][0], b[1] - pts[i][1]));
  let left = seg.reduce((s, l) => s + l, 0) * t;
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i] || i === seg.length - 1) {
      const k = seg[i] === 0 ? 0 : Math.min(1, left / seg[i]);
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    left -= seg[i];
  }
  return pts[pts.length - 1];
}

/** Keeps a default-size plate fully inside the frame (the marker may sit near an edge, its label may not). */
const clampLabelX = (x: number, text: string, size = 2.2) => {
  const half = (text.length * size * 0.58 + size * 0.9) / 2 + 0.6;
  return Math.max(half, Math.min(VB_W - half, x));
};

const edgeKey = (a: string, b: string) => [a, b].sort().join('-');

/** Nodes still reachable from the base (A) once `disabled` junctions are gone. */
function reachableFrom(start: string, edges: [string, string][], disabled: Set<string>): Set<string> {
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const id = queue.shift()!;
    for (const [a, b] of edges) {
      const next = a === id ? b : b === id ? a : null;
      if (next && !seen.has(next) && !disabled.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

// ── Network analysis map ─────────────────────────────────────────────────

/**
 * Click (or Enter/Space on) a junction to blow it. Its roads are cut one after
 * another, outward from the junction (the domino), and whatever can no longer
 * be reached from the base fades. The orange route is the BFS path A → I; a
 * convoy drives it once after each change (and on replay).
 */
export function NetworkRoadMap({
  nodes,
  edges,
  disabled,
  path,
  onToggle,
  runKey,
}: {
  nodes: NetNode[];
  edges: [string, string][];
  disabled: Set<string>;
  path: string[];
  onToggle: (id: string) => void;
  runKey: number;
}) {
  const reduce = !!useReducedMotion();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pathEdges = new Set(path.slice(1).map((b, i) => edgeKey(path[i], b)));
  const reach = reachableFrom('A', edges, disabled);
  const pts = path.map((id) => [byId.get(id)!.x, byId.get(id)!.y] as Pt);
  const t = useRunOnce(runKey, Math.max(1600, path.length * 650), !reduce && path.length > 1);
  const convoy = t !== null && t < 1 && pts.length > 1 ? pointAlong(pts, t) : null;
  const isolatedFront = !reach.has('I');

  // the domino: for each blown junction, its roads in angular order, one by one
  const cutDelay = new Map<string, number>();
  for (const id of disabled) {
    const n = byId.get(id)!;
    edges
      .filter(([a, b]) => a === id || b === id)
      .map(([a, b]) => {
        const o = byId.get(a === id ? b : a)!;
        return { k: edgeKey(a, b), ang: Math.atan2(o.y - n.y, o.x - n.x) };
      })
      .sort((p, q) => p.ang - q.ang)
      .forEach(({ k }, i) => {
        if (!cutDelay.has(k)) cutDelay.set(k, reduce ? 0 : i * 0.16);
      });
  }

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="block h-full w-full">
      <Terrain />

      {/* roads */}
      {edges.map(([a, b]) => {
        const na = byId.get(a)!, nb = byId.get(b)!;
        const k = edgeKey(a, b);
        const blownEnd = disabled.has(a) ? na : disabled.has(b) ? nb : null;
        const cut = blownEnd !== null;
        const live = !cut && reach.has(a) && reach.has(b);
        const onPath = pathEdges.has(k);
        const delay = cutDelay.get(k) ?? 0;
        // cut mark sits 40% along the road from the blown junction
        const far = blownEnd === na ? nb : na;
        const cx = blownEnd ? blownEnd.x + (far.x - blownEnd.x) * 0.4 : 0;
        const cy = blownEnd ? blownEnd.y + (far.y - blownEnd.y) * 0.4 : 0;
        return (
          <g key={k} aria-hidden>
            <motion.g initial={false} animate={{ opacity: live ? 1 : 0.32 }} transition={{ delay: cut ? delay : reduce ? 0 : 0.2, duration: reduce ? 0 : 0.3 }}>
              <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} className="stroke-fg" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
              <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} className="stroke-paper-bright" strokeWidth="0.85" strokeLinecap="round" strokeDasharray={cut ? '1.4 1' : undefined} />
            </motion.g>
            {onPath && <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} className="stroke-accent" strokeWidth="0.85" strokeLinecap="round" />}
            {cut && (
              <motion.g
                initial={reduce ? false : { opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay, duration: reduce ? 0 : 0.25 }}
                style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: 'view-box' }}
              >
                <circle cx={cx} cy={cy} r="1.25" className="fill-bg-elevated" />
                <path d={`M${cx - 0.75} ${cy - 0.75}L${cx + 0.75} ${cy + 0.75}M${cx - 0.75} ${cy + 0.75}L${cx + 0.75} ${cy - 0.75}`} className="stroke-status-danger" strokeWidth="0.45" strokeLinecap="round" />
              </motion.g>
            )}
          </g>
        );
      })}

      {/* bridge brackets at E, across the ravine */}
      <g aria-hidden className="stroke-fg" strokeWidth="0.35" fill="none" strokeLinecap="round">
        <path d="M46.6 33.2 q 1 1.8 0 3.6" />
        <path d="M53.4 33.2 q -1 1.8 0 3.6" />
      </g>

      {/* junctions */}
      {nodes.map((n) => {
        const isEndpoint = n.id === 'A' || n.id === 'I';
        const blown = disabled.has(n.id);
        const onPath = path.includes(n.id);
        const cutOff = !blown && !reach.has(n.id);
        const body = (
          <>
            {n.isCritical && !blown && (
              <circle cx={n.x} cy={n.y} r="3.3" fill="none" className="stroke-tanline-badge" strokeWidth="0.3" strokeDasharray="0.7 0.5" />
            )}
            {isEndpoint ? (
              n.id === 'I' ? (
                <rect x={n.x - 2.15} y={n.y - 2.15} width="4.3" height="4.3" rx="0.8" transform={`rotate(45 ${n.x} ${n.y})`} className={cn(isolatedFront ? 'fill-bg-elevated stroke-status-danger' : 'fill-fg stroke-bg-elevated')} strokeWidth="0.4" />
              ) : (
                <rect x={n.x - 2.3} y={n.y - 2.3} width="4.6" height="4.6" rx="1.1" className="fill-fg stroke-bg-elevated" strokeWidth="0.4" />
              )
            ) : (
              <circle
                cx={n.x}
                cy={n.y}
                r="1.9"
                className={cn(
                  blown ? 'fill-bg-elevated stroke-status-danger' : onPath ? 'fill-accent stroke-bg-elevated' : 'fill-bg-elevated stroke-fg',
                )}
                strokeWidth="0.4"
                opacity={cutOff ? 0.4 : 1}
              />
            )}
            {blown ? (
              <path d={`M${n.x - 1.1} ${n.y - 1.1}L${n.x + 1.1} ${n.y + 1.1}M${n.x - 1.1} ${n.y + 1.1}L${n.x + 1.1} ${n.y - 1.1}`} className="stroke-status-danger" strokeWidth="0.55" strokeLinecap="round" />
            ) : (
              <text
                x={n.x}
                y={n.y + 0.75}
                textAnchor="middle"
                fontSize="2.2"
                className={cn('font-display font-bold pointer-events-none', isEndpoint ? (n.id === 'I' && isolatedFront ? 'fill-status-danger' : 'fill-bg-elevated') : onPath ? 'fill-bg-elevated' : 'fill-fg')}
                opacity={cutOff && !isEndpoint ? 0.45 : 1}
              >
                {n.id}
              </text>
            )}
            {n.isCritical && !blown && (
              <g pointerEvents="none">
                <circle cx={n.x + 2.9} cy={n.y - 2.6} r="1.45" className="fill-bg-elevated" />
                <text x={n.x + 2.9} y={n.y - 2} textAnchor="middle" fontSize="1.9" className="fill-tanline-badge font-display font-bold" style={{ fontVariantEmoji: 'text' } as React.CSSProperties}>
                  ⚠
                </text>
              </g>
            )}
          </>
        );
        if (isEndpoint) return <g key={n.id} aria-hidden>{body}</g>;
        const toggle = () => onToggle(n.id);
        return (
          <g
            key={n.id}
            role="button"
            tabIndex={0}
            aria-pressed={blown}
            aria-label={n.label}
            onClick={toggle}
            onKeyDown={(e: KeyboardEvent<SVGGElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
              }
            }}
            className="group cursor-pointer outline-none"
          >
            <circle cx={n.x} cy={n.y} r="3.6" fill="transparent" />
            <circle cx={n.x} cy={n.y} r="2.9" fill="none" className="stroke-accent opacity-0 group-focus-visible:opacity-100" strokeWidth="0.45" />
            {body}
          </g>
        );
      })}

      {/* place names that already belong to the network: base, front, bridge */}
      {nodes
        .filter((n) => n.id === 'A' || n.id === 'I' || n.id === 'E')
        .map((n) => (
          <Plate
            key={`l-${n.id}`}
            x={n.id === 'E' ? n.x - 8.2 : n.id === 'A' ? n.x + 0.6 : n.x}
            y={n.id === 'E' ? n.y - 3.4 : n.y - 6.6}
            text={n.label}
            className={n.id === 'I' && isolatedFront ? 'fill-status-danger' : 'fill-fg'}
          />
        ))}

      {/* convoy — drives the route once */}
      {convoy && <circle cx={convoy[0]} cy={convoy[1]} r="1.05" className="fill-fg stroke-paper-bright" strokeWidth="0.35" aria-hidden />}
    </svg>
  );
}

// ── Buffer analysis map ──────────────────────────────────────────────────

/**
 * Same terrain and roads (muted) under the threat rings. Junctions that fall
 * inside a Kill Box get a red ring. The friendly force moves by click, by drag
 * or with the arrow keys; picking a threat card emphasises that threat's ring.
 */
export function BufferTerrainMap({
  nodes,
  edges,
  threats,
  showBuffers,
  friendlyPos,
  setFriendlyPos,
  threatsAffecting,
  focused,
  onBackground,
  labels,
}: {
  nodes: NetNode[];
  edges: [string, string][];
  threats: NetThreat[];
  showBuffers: boolean;
  friendlyPos: { x: number; y: number };
  setFriendlyPos: (p: { x: number; y: number }) => void;
  threatsAffecting: string[];
  focused: string | null;
  onBackground: () => void;
  labels: { friendly: string; killBox: string };
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const dragging = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const toLocal = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return {
      x: Math.max(EDGE, Math.min(VB_W - EDGE, ((clientX - r.left) / r.width) * VB_W)),
      y: Math.max(EDGE, Math.min(VB_H - EDGE, ((clientY - r.top) / r.height) * VB_H)),
    };
  };
  const inside = (x: number, y: number, t: NetThreat) => Math.hypot(t.x - x, t.y - y) <= t.range;
  const threatened = threatsAffecting.length > 0;
  // label placement chosen per threat so nothing collides (see assumptions.md)
  const labelAt = (t: NetThreat, i: number): Pt => (i === 0 ? [t.x, t.y - 4.2] : [t.x - 10.3, t.y + 0.2]);
  const killAt = (t: NetThreat, i: number): Pt => {
    const a = i === 0 ? -0.7 : 2.62; // radians, y down
    return [t.x + Math.cos(a) * t.range, t.y + Math.sin(a) * t.range];
  };
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    const step: Record<string, Pt> = { ArrowRight: [2, 0], ArrowLeft: [-2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] };
    const s = step[e.key];
    if (!s) return;
    e.preventDefault();
    setFriendlyPos({
      x: Math.max(EDGE, Math.min(VB_W - EDGE, friendlyPos.x + s[0])),
      y: Math.max(EDGE, Math.min(VB_H - EDGE, friendlyPos.y + s[1])),
    });
  };
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="block h-full w-full touch-none select-none"
      style={{ cursor: 'crosshair' }}
      onClick={(e) => {
        if (dragging.current) return;
        setFriendlyPos(toLocal(e.clientX, e.clientY));
        onBackground();
      }}
    >
      <Terrain />
      {/* the same roads, muted */}
      <g aria-hidden opacity="0.55">
        {edges.map(([a, b]) => {
          const na = byId.get(a)!, nb = byId.get(b)!;
          return (
            <g key={edgeKey(a, b)}>
              <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} className="stroke-fg" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
              <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} className="stroke-paper-bright" strokeWidth="0.65" strokeLinecap="round" />
            </g>
          );
        })}
      </g>

      {/* threat buffers */}
      {showBuffers &&
        threats.map((t, i) => {
          const dim = focused !== null && focused !== t.id;
          const strong = focused === t.id;
          const k = killAt(t, i);
          return (
            <g key={t.id} className="pointer-events-none" aria-hidden>
              <circle cx={t.x} cy={t.y} r={t.range} className="fill-status-danger/10 stroke-status-danger" strokeWidth={strong ? 0.6 : 0.4} strokeDasharray="1.5 0.8" opacity={dim ? 0.35 : 1} />
              {/* a dimmed threat keeps a legible label — only its ring fades */}
              <Plate x={k[0]} y={k[1]} text={labels.killBox} size={1.9} className={dim ? 'fill-fg-muted' : 'fill-status-danger'} />
            </g>
          );
        })}

      {/* junctions, small and muted; red ring = inside a Kill Box */}
      <g aria-hidden className="pointer-events-none">
        {nodes.map((n) => {
          const hot = showBuffers && threats.some((t) => inside(n.x, n.y, t));
          return (
            <g key={n.id}>
              {hot && <circle cx={n.x} cy={n.y} r="2.2" fill="none" className="stroke-status-danger" strokeWidth="0.45" />}
              <circle cx={n.x} cy={n.y} r="1.35" className="fill-bg-elevated stroke-fg-muted" strokeWidth="0.3" />
              <text x={n.x} y={n.y + 0.55} textAnchor="middle" fontSize="1.6" className="fill-fg-muted font-display font-bold">
                {n.id}
              </text>
            </g>
          );
        })}
      </g>

      {/* threat sites */}
      {threats.map((t, i) => {
        const [lx, ly] = labelAt(t, i);
        return (
          <g key={`m-${t.id}`} className="pointer-events-none" aria-hidden>
            <circle cx={t.x} cy={t.y} r="1.5" className="fill-status-danger stroke-bg-elevated" strokeWidth="0.4" opacity={focused !== null && focused !== t.id ? 0.45 : 1} />
            <Plate x={lx} y={ly} text={t.label} className={focused !== null && focused !== t.id ? 'fill-fg-muted' : 'fill-status-danger'} />
          </g>
        );
      })}

      {/* friendly force — drag, click the map, or arrow keys */}
      <g
        role="button"
        tabIndex={0}
        aria-label={labels.friendly}
        onKeyDown={onKey}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e: PointerEvent<SVGGElement>) => {
          e.stopPropagation();
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          dragging.current = true;
        }}
        onPointerMove={(e: PointerEvent<SVGGElement>) => {
          if (dragging.current) setFriendlyPos(toLocal(e.clientX, e.clientY));
        }}
        onPointerUp={(e: PointerEvent<SVGGElement>) => {
          (e.currentTarget as Element).releasePointerCapture(e.pointerId);
          window.setTimeout(() => (dragging.current = false), 0);
        }}
        className="group cursor-grab outline-none active:cursor-grabbing"
      >
        <circle cx={friendlyPos.x} cy={friendlyPos.y} r="4" fill="transparent" />
        <circle cx={friendlyPos.x} cy={friendlyPos.y} r="3.4" fill="none" className="stroke-accent opacity-0 group-focus-visible:opacity-100" strokeWidth="0.45" />
        {threatened && <circle cx={friendlyPos.x} cy={friendlyPos.y} r="2.9" fill="none" className="stroke-status-danger" strokeWidth="0.45" />}
        <circle cx={friendlyPos.x} cy={friendlyPos.y} r="2" className="fill-accent-cool stroke-bg-elevated" strokeWidth="0.4" />
        <Plate x={clampLabelX(friendlyPos.x, labels.friendly)} y={friendlyPos.y > VB_H - 7 ? friendlyPos.y - 5 : friendlyPos.y + 5} text={labels.friendly} className={threatened ? 'fill-status-danger' : 'fill-fg'} />
      </g>
    </svg>
  );
}
