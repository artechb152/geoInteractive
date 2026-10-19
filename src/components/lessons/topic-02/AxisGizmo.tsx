'use client';

import { useEffect, useState } from 'react';

/**
 * AxisGizmo — the X · Y · Z axes marker of 3D editors and games, as a "this turns" cue over a live
 * model before the learner first drags it. The axes rock gently around the vertical (still under
 * reduced motion). Conventional colours: X red, Y green, Z blue. Decorative (aria-hidden).
 */

const AXES = [
  { key: 'X', v: [1, 0, 0], color: '#D2453A' },
  { key: 'Y', v: [0, 1, 0], color: '#4E9A2F' },
  { key: 'Z', v: [0, 0, 1], color: '#2F6FD2' },
] as const;
const C = 50; // viewBox centre
const L = 34; // axis length
const TILT = (28 * Math.PI) / 180; // seen from above
const YAW = (-35 * Math.PI) / 180; // X to the lower right, Z to the lower left
const ROCK = (22 * Math.PI) / 180;
const PERIOD_MS = 4200;

/** An axis seen at `yaw`: its tip on screen (y down) and its depth (toward the viewer > 0). */
function project([x, y, z]: readonly number[], yaw: number) {
  const xr = x * Math.cos(yaw) + z * Math.sin(yaw);
  const zr = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const sy = y * Math.cos(TILT) - zr * Math.sin(TILT);
  return { x: C + xr * L, y: C - sy * L, depth: zr * Math.cos(TILT) + y * Math.sin(TILT) };
}

export function AxisGizmo({ reduce, size = 128 }: { reduce: boolean; size?: number }) {
  const [yaw, setYaw] = useState(YAW);
  useEffect(() => {
    if (reduce) {
      setYaw(YAW);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      setYaw(YAW + ROCK * Math.sin(((now - t0) / PERIOD_MS) * Math.PI * 2));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  // far axes first, so the near one draws over them
  const axes = AXES.map((a) => ({ ...a, ...project(a.v, yaw) })).sort((p, q) => p.depth - q.depth);
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 100 100" className="overflow-visible [direction:ltr]">
      <circle cx={C} cy={C} r={48} fill="#FFFFFF" fillOpacity={0.62} />
      {axes.map((a) => {
        const dx = a.x - C;
        const dy = a.y - C;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        // arrowhead: tip on the axis end, 7 long, 4.5 wide
        const bx = a.x - ux * 7;
        const by = a.y - uy * 7;
        const head = `${a.x},${a.y} ${bx - uy * 4.5},${by + ux * 4.5} ${bx + uy * 4.5},${by - ux * 4.5}`;
        return (
          <g key={a.key}>
            <line x1={C} y1={C} x2={bx} y2={by} stroke={a.color} strokeWidth={4} strokeLinecap="round" />
            <polygon points={head} fill={a.color} />
            <text
              x={a.x + ux * 8}
              y={a.y + uy * 8}
              textAnchor="middle"
              dominantBaseline="central"
              fill={a.color}
              fontSize={14}
              fontWeight={800}
              className="font-display"
            >
              {a.key}
            </text>
          </g>
        );
      })}
      <circle cx={C} cy={C} r={3.5} fill="#3A3A36" />
    </svg>
  );
}
