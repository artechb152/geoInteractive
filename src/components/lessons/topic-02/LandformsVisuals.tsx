'use client';

/**
 * LandformsVisuals — illustrations for LandformsScene ("תבניות נוף").
 *
 * Every landform is defined ONCE as a height field h(x, y) over a 100×50 map
 * tile. From that single source we derive both boards, so they always agree:
 *
 *   - "במציאות": a terrain block — the continuous surface in a gentle
 *     axonometric view, coloured by elevation and hill-shaded by the sun, cut
 *     out of the ground with cream paper edges (the course's papercut look).
 *     No contour layers here: the rings belong to the map.
 *   - "במפה": the same surface traced as contour lines (marching squares) with
 *     a constant 10 m interval and a heavier index contour at 150.
 *
 * The landform's key feature (summit ring / spur axis / drainage line / saddle
 * point / depression rim) is marked the same way in both views. Copy strings
 * are passed in from the scene (single source of copy).
 */

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { animate, cubicBezier, motion, useReducedMotion } from 'framer-motion';
import {
  BASE, C, INDEX_LEVEL, LEVELS, MAP_H, MAP_Y, REAL_H, REAL_W, REAL_X, TH, TW, VB_W, VB_X,
  buildContours, buildTerrain, contourRings, drape, f2, getMorphMesh, identity, isInterior, isVisible, lerpArr, mix,
  nearestOnLevel, pointsAttr, ringsPath,
  type Contours, type Grid, type HeightFn, type Pt, type Terrain, type TerrainLook, type TerrainSpec,
} from './terrainBlockGeometry';

/* ── Shared geometry ─────────────────────────────────────────────────────── */

export type LandformId = 'hill' | 'spur' | 'valley' | 'saddle' | 'depression';

const E = Math.exp;

// Sheet colours by elevation — sand base, then sage → deep olive as the ground
// rises (the map tint follows the same logic: deeper tint = higher ground).
// Neighbouring sheets alternate slightly so every paper layer reads on its own.
const SAND = mix(C.rim, C.paperEdge, 0.45);
const LOW_FACE = mix(C.greenLight, C.paperEdge, 0.55);
function faceColor(z: number): string {
  if (z <= BASE) return SAND;
  const t = (z - LEVELS[0]) / (LEVELS[LEVELS.length - 1] - LEVELS[0]);
  const c = t < 0.5 ? mix(LOW_FACE, C.greenLight, t / 0.5) : mix(C.greenLight, C.greenMid, (t - 0.5) / 0.5);
  return Math.round((z - BASE) / 10) % 2 ? c : mix(c, C.paperEdge, 0.1);
}

// Terrain block: elevation ramp (sand plain → sage slopes → olive tops), lit by a
// sun from the viewer's front-left so slopes facing the reader stay readable.
const GROUND_RAMP: [number, string][] = [
  [0, mix(SAND, LOW_FACE, 0.35)],
  [0.3, LOW_FACE],
  [0.62, C.greenLight],
  [1, C.greenMid],
];

/* ── Landform definitions ────────────────────────────────────────────────── */

type Spec = {
  h: HeightFn;
  kz: number; // oblique: screen-y per metre of elevation (vertical exaggeration)
  ky?: number; // camera: foreshortening of the ground plane (default KY)
  highlight?: number; // level whose closed contour is the key feature
  numbers: { level: number; at: Pt }[]; // elevation labels on the map
};

const SPECS: Record<LandformId, Spec> = {
  hill: {
    h: (x, y) => {
      const dx = (x - 50) / 23;
      const dy = (y - 25) / 12.5;
      const th = Math.atan2(dy, dx);
      const r2 = (dx * dx + dy * dy) * (1 + 0.08 * Math.sin(2 * th + 0.7) + 0.05 * Math.cos(3 * th - 0.4));
      return BASE + 68 * E(-0.9 * r2);
    },
    kz: 0.28,
    highlight: 160,
    numbers: [
      { level: 150, at: [66, 25] },
      { level: 110, at: [84, 25] },
    ],
  },
  spur: {
    h: (x, y) => {
      const b = 22 * E(-(((x - 50) / 11) ** 2));
      return 170 - 1.8 * (y + 3 - b) + 0.8 * Math.sin(x * 0.19);
    },
    kz: 0.23,
    numbers: [
      { level: 150, at: [16, 12] },
      { level: 120, at: [16, 29] },
    ],
  },
  valley: {
    h: (x, y) => {
      const v = 18 * Math.max(0, 1 - Math.abs(x - 50) / 17) ** 1.5;
      const s = 5 * (E(-(((x - 16) / 10) ** 2)) + E(-(((x - 84) / 10) ** 2)));
      return 160 - 1.8 * (y - 20 + v - s);
    },
    kz: 0.23,
    numbers: [
      { level: 150, at: [86, 27] },
      { level: 120, at: [86, 44] },
    ],
  },
  saddle: {
    h: (x, y) => {
      const q = (cx: number) => ((x - cx) / 11) ** 2 + ((y - 25) / 11.5) ** 2;
      return (
        BASE +
        42.6 * (E(-q(26)) + E(-q(74))) +
        35.3 * E(-(((y - 25) / 10.5) ** 2)) * E(-(((x - 50) / 30) ** 4))
      );
    },
    kz: 0.24,
    numbers: [
      { level: 150, at: [26, 17] },
      { level: 130, at: [50, 13] },
    ],
  },
  depression: {
    h: (x, y) => {
      const dx = (x - 50) / 31;
      const dy = (y - 24) / 18;
      const th = Math.atan2(dy, dx);
      const r = Math.sqrt(dx * dx + dy * dy) * (1 + 0.05 * Math.sin(3 * th + 1));
      // smooth min(1, r): a rounded rim instead of a sharp crease
      const k = Math.max(0.08 - Math.abs(1 - r), 0) / 0.08;
      // steep walls around a wide, flat floor — a makhtesh, not a funnel
      return 112 + 40 * (Math.min(1, r) - k * k * 0.02) ** 1.8;
    },
    kz: 0.3,
    // looked at from a little higher than the rest, so the eye sees INTO the pit
    ky: 0.52,
    highlight: 150,
    numbers: [
      { level: 150, at: [82, 24] },
      { level: 130, at: [64, 24] },
    ],
  },
};

// The landforms' look: the elevation ramp above, and on the hill its key summit
// ring tinted toward the accent (the same ring is highlighted on the map).
const LANDFORM_LOOK: TerrainLook = { ramp: GROUND_RAMP };
const HILL_LOOK: TerrainLook = {
  ramp: GROUND_RAMP,
  tint: (col, q) => (q.raw >= (SPECS.hill.highlight as number) ? mix(col, C.accent, 0.32) : col),
};
const TERRAIN_SPECS = Object.fromEntries(
  (Object.keys(SPECS) as LandformId[]).map((f) => {
    const { h, kz, ky } = SPECS[f];
    return [f, { h, kz, ky, look: f === 'hill' ? HILL_LOOK : LANDFORM_LOOK } satisfies TerrainSpec];
  }),
) as Record<LandformId, TerrainSpec>;

const getTerrain = (form: LandformId): Terrain => buildTerrain(TERRAIN_SPECS[form]);

type Landform = Contours & { spec: Spec };

const cache = new Map<LandformId, Landform>();

function getLandform(id: LandformId): Landform {
  const hit = cache.get(id);
  if (hit) return hit;
  const lf: Landform = { spec: SPECS[id], ...buildContours(SPECS[id].h) };
  cache.set(id, lf);
  return lf;
}

/* ── Feature overlays (the key feature of each landform) ─────────────────── */

type Line = { from: Pt; to: Pt };

// Plan-view geometry of each key feature, shared by both boards.
const FEATURES: Record<LandformId, { axis?: Line; ridge?: Line; drain?: Line; point?: Pt }> = {
  hill: {},
  spur: { axis: { from: [50, 9], to: [50, 41] } },
  valley: { drain: { from: [50, 1], to: [50, 49.5] } },
  saddle: { ridge: { from: [26, 25], to: [74, 25] }, point: [50, 25] },
  depression: { point: [50, 24] },
};

function sampleLine(l: Line, step = 0.25): Pt[] {
  const [x1, y1] = l.from;
  const [x2, y2] = l.to;
  const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / step));
  return Array.from({ length: n + 1 }, (_, i) => [x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n] as Pt);
}

function Arrowhead({ tip, dir, size = 2.2, fill }: { tip: Pt; dir: Pt; size?: number; fill: string }) {
  const len = Math.hypot(dir[0], dir[1]) || 1;
  const ux = dir[0] / len;
  const uy = dir[1] / len;
  const bx = tip[0] - ux * size;
  const by = tip[1] - uy * size;
  const w = size * 0.55;
  return (
    <polygon
      points={`${f2(tip[0])},${f2(tip[1])} ${f2(bx - uy * w)},${f2(by + ux * w)} ${f2(bx + uy * w)},${f2(by - ux * w)}`}
      fill={fill}
    />
  );
}

function Summit({ at, fill, size = 2.4 }: { at: Pt; fill: string; size?: number }) {
  const [x, y] = at;
  return (
    <polygon
      points={`${f2(x)},${f2(y - size)} ${f2(x - size * 0.62)},${f2(y + size * 0.1)} ${f2(x + size * 0.62)},${f2(y + size * 0.1)}`}
      fill={fill}
      stroke="#FFFFFF"
      strokeWidth={0.35}
      strokeLinejoin="round"
    />
  );
}

/* ── "במציאות" — terrain block ───────────────────────────────────────────── */

// Build-up (the board's first showing): the flat block fades in, then its
// relief rises into place.
const BUILD_S = 1.05;
const BUILD_FADE = 0.14; // share of BUILD_S
const BUILD_HOLD = 0.1; // flat, before the rise starts
// Switching landforms: the shown ground reshapes straight into the next form.
const MORPH_S = 0.9;
const MOVE_EASE = cubicBezier(0.45, 0, 0.2, 1);

const MORPH_VS = `
attribute vec2 a_pos0;
attribute vec3 a_col0;
attribute vec2 a_pos1;
attribute vec3 a_col1;
uniform float u_s;
uniform vec4 u_view;
varying vec3 v_col;
void main() {
  vec2 p = (mix(a_pos0, a_pos1, u_s) - u_view.xy) / u_view.zw * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
  v_col = mix(a_col0, a_col1, u_s);
}`;
const MORPH_FS = `
precision mediump float;
varying vec3 v_col;
void main() { gl_FragColor = vec4(v_col, 1.0); }`;

// Draws the block blended from pose `from` to pose `to` at s (0 → 1) onto the
// canvas, in the board's viewBox. Null when WebGL isn't available.
function morphRenderer(canvas: HTMLCanvasElement, index: Uint16Array, from: Float32Array, to: Float32Array) {
  const gl = canvas.getContext('webgl', { antialias: true, depth: false, stencil: false });
  if (!gl) return null;
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, MORPH_VS));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, MORPH_FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
  // one buffer per pose, each interleaved x, y, r, g, b
  [from, to].forEach((data, n) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const attr = (name: string, size: number, offset: number) => {
      const loc = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 20, offset);
    };
    attr(`a_pos${n}`, 2, 0);
    attr(`a_col${n}`, 3, 8);
  });
  const uS = gl.getUniformLocation(prog, 'u_s');
  gl.uniform4f(gl.getUniformLocation(prog, 'u_view'), REAL_X, 0, REAL_W, REAL_H);
  return {
    draw(s: number) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uS, s);
      gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
    },
    // free the context right away — the page runs other WebGL scenes too
    dispose() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

export function LandformReality({ form, ariaLabel }: { form: LandformId; ariaLabel: string }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const terrain = getTerrain(form);

  // The moving frames are drawn on a canvas over the board; the finished board
  // is painted underneath before the canvas goes.
  //  - First showing — build-up, bottom to top: the block lands flat, then the
  //    ground rises out of it to full relief, one continuous surface the whole
  //    way (user decision 2026-09-28: no stacked contour sheets).
  //  - Switching landforms — shape to shape: the ground on screen reshapes
  //    straight into the next form, without going flat again (user decision
  //    2026-09-28). A click mid-move carries on from the shape on screen.
  const layerRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<SVGPolygonElement>(null);
  // what the canvas shows: pose `from` blended toward `to` by s (and the shadow with it)
  const shownRef = useRef<{ from: Float32Array; to: Float32Array; foot: [number[], number[]]; s: number } | null>(null);
  const [stage, setStage] = useState<{ form: LandformId; step: 'landed' | 'done' } | null>(null);
  // a new form is moving until its own run lands
  const step = stage?.form === form ? stage.step : 'moving';
  const built = step !== 'moving';
  // run by the landing: drops the canvas once the finished board has painted
  const releaseRef = useRef<() => void>(() => {});

  // A layout effect: the canvas takes over in the same paint as the click, so
  // the old shape never blinks out.
  useLayoutEffect(() => {
    const layer = layerRef.current;
    const mesh = getMorphMesh(terrain);
    const prev = shownRef.current;
    const build = !prev;
    const run = {
      from: prev ? lerpArr(prev.from, prev.to, prev.s) : mesh.flat,
      to: mesh.pose,
      foot: [prev ? Array.from(lerpArr(prev.foot[0], prev.foot[1], prev.s)) : terrain.footprint, terrain.footprint] as [
        number[],
        number[],
      ],
      s: 0,
    };
    shownRef.current = run;
    // a fresh canvas per run: a context once released can't be drawn on again
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `display:block;width:100%;height:100%;opacity:${build ? 0 : 1}`;
    layer?.appendChild(canvas);
    const gl = !reduce && layer ? morphRenderer(canvas, mesh.index, run.from, run.to) : null;
    if (!gl) {
      canvas.remove();
      run.s = 1;
      setStage({ form, step: 'done' });
      return;
    }
    const frame = (p: number) => {
      if (build) canvas.style.opacity = String(Math.min(1, p / BUILD_FADE));
      run.s = MOVE_EASE(build ? Math.max(0, (p - BUILD_HOLD) / (1 - BUILD_HOLD)) : p);
      gl.draw(run.s);
      footRef.current?.setAttribute('points', pointsAttr(lerpArr(run.foot[0], run.foot[1], run.s)));
    };
    frame(0);
    const controls = animate(0, 1, {
      duration: build ? BUILD_S : MORPH_S,
      ease: 'linear',
      onUpdate: frame,
      onComplete: () => {
        run.s = 1;
        releaseRef.current = () => {
          gl.dispose();
          setStage({ form, step: 'done' });
        };
        setStage({ form, step: 'landed' });
      },
    });
    return () => {
      controls.stop();
      gl.dispose();
      canvas.remove();
      // stopped before anything rose (or re-run by Strict Mode): build up afresh
      if (build && run.s === 0) shownRef.current = null;
    };
  }, [form, reduce, terrain]);

  // Landed: the finished board is committed under the canvas's last frame. Two
  // frames later it has painted, and the canvas goes.
  useEffect(() => {
    if (step !== 'landed') return;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => releaseRef.current());
    });
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // While the ground moves, the hidden board keeps the last settled form: the
  // next form's thousands of strips are laid in under the canvas once it lands,
  // not in the frame of the click.
  const boardForm = built || !stage ? form : stage.form;
  const board = useMemo(() => {
    const t = getTerrain(boardForm);
    return (
      <>
        {/* each strip is stroked in its own colour to close hairline seams */}
        <g strokeWidth={0.32} strokeLinejoin="round" filter={`url(#${uid}-smooth)`}>
          {t.surface.map((s, i) => (
            <path key={i} d={s.d} fill={s.fill} stroke={s.fill} />
          ))}
        </g>
        {t.walls.map((w, i) => (
          <path key={i} d={w.d} fill={w.fill} stroke={w.fill} strokeWidth={0.1} strokeLinejoin="round" />
        ))}
      </>
    );
  }, [boardForm, uid]);
  const overlays = useMemo(
    () => (built ? realityOverlays(form, getLandform(form), terrain) : null),
    [built, form, terrain],
  );

  // Prepare the other landforms while the reader is idle, so switching is quick.
  useEffect(() => {
    let alive = true;
    const queue = Object.keys(SPECS) as LandformId[]; // cached getters make repeats free
    const next = () => {
      const f = queue.shift();
      if (!alive || !f) return;
      getMorphMesh(getTerrain(f));
      getLandform(f);
      schedule();
    };
    // Safari has no requestIdleCallback
    const idle = window.requestIdleCallback as ((cb: () => void) => number) | undefined;
    const schedule = () => (idle ? idle.call(window, next) : window.setTimeout(next, 120));
    schedule();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="relative">
      <svg
        viewBox={`${f2(REAL_X)} 0 ${f2(REAL_W)} ${REAL_H}`}
        className="block w-full h-auto"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#F6EFE6" />
          </linearGradient>
          <filter id={`${uid}-soft`} x="-20%" y="-80%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
          {/* smooths the mesh's shading steps inside the terrain while keeping its
              silhouette crisp: blur, re-solidify, clip back to the sharp shape */}
          <filter id={`${uid}-smooth`} colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.4" result="blur" />
            <feComponentTransfer in="blur" result="solid">
              <feFuncA type="linear" slope="40" />
            </feComponentTransfer>
            <feComposite in="solid" in2="SourceAlpha" operator="in" />
          </filter>
        </defs>

        <rect x={REAL_X} y={0} width={REAL_W} height={REAL_H} fill={`url(#${uid}-sky)`} />
        {/* soft contact shadow under the block */}
        <polygon
          ref={footRef}
          points={pointsAttr(terrain.footprint)}
          fill="#5A4628"
          opacity={0.2}
          filter={`url(#${uid}-soft)`}
        />

        <g visibility={built ? undefined : 'hidden'}>{board}</g>

        {/* key feature, draped on the ground once the block is in place */}
        {built && (
          <motion.g
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduce ? 0 : 0.3 }}
          >
            {overlays}
          </motion.g>
        )}
      </svg>
      {/* the moving frames (canvas added by the effect above) */}
      {step !== 'done' && <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0" />}
    </div>
  );
}

function realityOverlays(form: LandformId, lf: Landform, t: Terrain): ReactNode[] {
  const { highlight } = lf.spec;
  const feat = FEATURES[form];
  const out: ReactNode[] = [];

  // the same closed contour that is highlighted on the map (hill top, depression rim)
  if (highlight !== undefined) {
    const d = (lf.rings.get(highlight) ?? [])
      .filter(isInterior)
      .map((r) => drape(t, r, true))
      .join('');
    if (d) out.push(<path key="hl" d={d} fill="none" stroke={C.accent} strokeWidth={0.6} strokeLinecap="round" strokeLinejoin="round" />);
  }
  if (feat.axis) {
    out.push(
      <path
        key="ax"
        d={drape(t, sampleLine(feat.axis))}
        fill="none"
        stroke={C.accent}
        strokeWidth={0.65}
        strokeDasharray="1.6 1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />,
    );
    const [ex, ey] = feat.axis.to;
    if (isVisible(t, ex, ey + 2.6)) {
      const tip = t.at(ex, ey + 2.6);
      const from = t.at(ex, ey);
      out.push(<Arrowhead key="axh" tip={tip} dir={[tip[0] - from[0], tip[1] - from[1]]} fill={C.accent} />);
    }
  }
  if (feat.drain) {
    const d = drape(t, sampleLine(feat.drain));
    out.push(
      <g key="dr" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} stroke={C.riverDeep} strokeWidth={1.3} />
        <path d={d} stroke={C.river} strokeWidth={0.8} />
      </g>,
    );
  }
  if (feat.ridge) {
    out.push(
      <path
        key="rg"
        d={drape(t, sampleLine(feat.ridge))}
        fill="none"
        stroke={C.accent}
        strokeWidth={0.6}
        strokeDasharray="1.4 0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />,
    );
  }
  if (form === 'saddle' && feat.point && isVisible(t, feat.point[0], feat.point[1])) {
    const [sx, sy] = t.at(feat.point[0], feat.point[1]);
    out.push(<circle key="sp" cx={sx} cy={sy} r={1.3} fill={C.accent} stroke="#FFFFFF" strokeWidth={0.45} />);
  }
  return out;
}

/* ── "במפה" — contour map ─────────────────────────────────────────────────── */

export type LandformMapLabels = {
  toLow: string;
  toPeak: string;
  drainage: string;
  saddle: string;
  low: string;
};

function MapLabel({
  at,
  text,
  fill,
  size = 2.7,
  bg = '#FFFFFF',
  charW = 0.56,
}: {
  at: Pt;
  text: string;
  fill: string;
  size?: number;
  bg?: string;
  charW?: number;
}) {
  const w = text.length * size * charW + 1.6;
  const h = size + 1.1;
  return (
    <g>
      <rect x={at[0] - w / 2} y={at[1] - h / 2} width={w} height={h} rx={h / 2} fill={bg} opacity={0.94} />
      <text
        x={at[0]}
        y={at[1] + size * 0.36}
        textAnchor="middle"
        fontSize={size}
        fill={fill}
        className="font-display font-bold"
      >
        {text}
      </text>
    </g>
  );
}

// Short ticks on each depression contour, pointing downhill (into the pit).
function hachures(lf: Landform, level: number): string {
  const out: string[] = [];
  const h = lf.spec.h;
  for (const ring of (lf.rings.get(level) ?? []).filter(isInterior)) {
    let acc = 0;
    for (let i = 1; i <= ring.length; i++) {
      const a = ring[i - 1];
      const b = ring[i % ring.length];
      acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc < 3.2) continue;
      acc = 0;
      const e = 0.3;
      const gx = (h(b[0] + e, b[1]) - h(b[0] - e, b[1])) / (2 * e);
      const gy = (h(b[0], b[1] + e) - h(b[0], b[1] - e)) / (2 * e);
      const g = Math.hypot(gx, gy) || 1;
      out.push(`M${f2(b[0])},${f2(b[1])}L${f2(b[0] - (gx / g) * 1.1)},${f2(b[1] - (gy / g) * 1.1)}`);
    }
  }
  return out.join('');
}

export function LandformMap({
  form,
  labels,
  ariaLabel,
}: {
  form: LandformId;
  labels: LandformMapLabels;
  ariaLabel: string;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const lf = getLandform(form);
  const feat = FEATURES[form];
  const highlightRings = lf.spec.highlight ? (lf.rings.get(lf.spec.highlight) ?? []).filter(isInterior) : [];

  // Switching landforms: the contours reshape with the ground — every frame
  // traces the height field part way from the shown form to the next one (every
  // level, so rings can appear, split and merge on the way). The labels and
  // key-feature marks wait until the new form has settled.
  const settledPaths = useMemo(() => LEVELS.map((L) => ringsPath(lf.rings.get(L) ?? [], identity)), [lf]);
  const [moving, setMoving] = useState<string[] | null>(null);
  const [switched, setSwitched] = useState(false);
  const shownRef = useRef<{ from: ArrayLike<number>; to: ArrayLike<number>; s: number }>({
    from: lf.grid.v,
    to: lf.grid.v,
    s: 1,
  });
  useLayoutEffect(() => {
    const prev = shownRef.current;
    const to = lf.grid.v;
    if (prev.to === to && prev.s === 1) return;
    const run = { from: lerpArr(prev.from, prev.to, prev.s), to, s: 0 };
    shownRef.current = run;
    if (reduce) {
      run.s = 1;
      setMoving(null);
      return;
    }
    setSwitched(true);
    const trace = () => {
      const g: Grid = { ...lf.grid, v: lerpArr(run.from, run.to, run.s) };
      setMoving(LEVELS.map((L) => ringsPath(contourRings(g, L), identity)));
    };
    trace();
    const controls = animate(0, 1, {
      duration: MORPH_S,
      ease: 'linear',
      onUpdate: (p) => {
        run.s = MOVE_EASE(p);
        trace();
      },
      onComplete: () => {
        run.s = 1;
        setMoving(null);
      },
    });
    return () => controls.stop();
  }, [lf, reduce]);
  const paths = moving ?? settledPaths;
  const still = moving === null;
  // first showing: the marks follow the contours' fade-in; after a switch they come right away
  const marks = { duration: reduce ? 0 : 0.3, delay: reduce || switched ? 0 : 0.45 };
  const marksIn = reduce ? false : { opacity: 0 };

  return (
    <svg
      viewBox={`${VB_X} ${MAP_Y} ${VB_W} ${MAP_H}`}
      className="block w-full h-auto"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <clipPath id={`${uid}-tile`}>
          <rect x={0.2} y={0.2} width={TW - 0.4} height={TH - 0.4} />
        </clipPath>
      </defs>
      <rect x={VB_X} y={MAP_Y} width={VB_W} height={MAP_H} fill={C.paper} />
      <rect x={0} y={0} width={TW} height={TH} fill="#FFFFFF" />
      {/* map grid */}
      <g stroke={C.hairlineSoft} strokeWidth={0.18}>
        {Array.from({ length: 9 }, (_, i) => (
          <line key={'x' + i} x1={(i + 1) * 10} y1={0} x2={(i + 1) * 10} y2={TH} />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <line key={'y' + i} x1={0} y1={(i + 1) * 10} x2={TW} y2={(i + 1) * 10} />
        ))}
      </g>

      <motion.g
        clipPath={`url(#${uid}-tile)`}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.1 }}
      >
        {/* faint layer tint — deeper tint = higher ground, like the diorama */}
        {LEVELS.map((L, i) => (
          <path key={'t' + L} d={paths[i]} fillRule="evenodd" fill={C.greenLight} fillOpacity={0.045} />
        ))}
        {LEVELS.map((L, i) => (
          <path
            key={L}
            d={paths[i]}
            fill="none"
            stroke={L === INDEX_LEVEL ? C.contourIndex : C.contour}
            strokeWidth={L === INDEX_LEVEL ? 0.55 : 0.32}
            strokeLinejoin="round"
          />
        ))}
        {still && form === 'depression' && (
          <motion.path
            key={`hach-${form}`}
            initial={switched ? marksIn : false}
            animate={{ opacity: 1 }}
            transition={marks}
            d={lf.levels.map((L) => hachures(lf, L)).join('')}
            fill="none"
            stroke={C.contourIndex}
            strokeWidth={0.28}
            strokeLinecap="round"
          />
        )}
      </motion.g>
      <rect x={0} y={0} width={TW} height={TH} fill="none" stroke={C.hairline} strokeWidth={0.35} />

      {/* key contour — matches the highlighted sheet on the diorama */}
      {still && highlightRings.length > 0 && (
        <motion.path
          key={`hl-${form}`}
          initial={marksIn}
          animate={{ opacity: 1 }}
          transition={marks}
          d={ringsPath(highlightRings, identity)}
          fill={form === 'hill' ? C.accent : 'none'}
          fillOpacity={0.14}
          stroke={C.accent}
          strokeWidth={0.6}
          strokeLinejoin="round"
        />
      )}

      {/* elevation numbers on the lines (metres) */}
      {still && (
        <motion.g key={`num-${form}`} initial={switched ? marksIn : false} animate={{ opacity: 1 }} transition={marks}>
          {lf.spec.numbers.map(({ level, at }) => {
            const p = nearestOnLevel(lf, level, at);
            return p ? (
              <MapLabel key={level} at={p} text={String(level)} fill={C.contourIndex} size={2.3} charW={0.62} />
            ) : null;
          })}
        </motion.g>
      )}

      {/* key feature — matches the marks on the diorama */}
      {still && (
        <motion.g key={`feat-${form}`} initial={marksIn} animate={{ opacity: 1 }} transition={marks}>
          {form === 'spur' && feat.axis && (
            <>
              <line
                x1={feat.axis.from[0]}
                y1={feat.axis.from[1]}
                x2={feat.axis.to[0]}
                y2={feat.axis.to[1]}
                stroke={C.accent}
                strokeWidth={0.6}
                strokeDasharray="1.6 1"
                strokeLinecap="round"
              />
              <Arrowhead tip={[feat.axis.to[0], feat.axis.to[1] + 2.4]} dir={[0, 1]} fill={C.accent} />
              <MapLabel at={[50, 47]} text={labels.toLow} fill={C.accent} />
            </>
          )}

          {form === 'valley' && feat.drain && (
            <>
              <line
                x1={feat.drain.from[0]}
                y1={feat.drain.from[1]}
                x2={feat.drain.to[0]}
                y2={feat.drain.to[1]}
                stroke={C.river}
                strokeWidth={0.9}
                strokeLinecap="round"
              />
              {/* reading cue: the V's apex points up-valley, toward the high ground */}
              <line x1={59} y1={38} x2={59} y2={12} stroke={C.accent} strokeWidth={0.55} strokeLinecap="round" />
              <Arrowhead tip={[59, 9.4]} dir={[0, -1]} fill={C.accent} />
              <MapLabel at={[59, 5.6]} text={labels.toPeak} fill={C.accent} />
              <MapLabel at={[50, 45.5]} text={labels.drainage} fill={C.riverDeep} />
            </>
          )}

          {form === 'saddle' && feat.ridge && feat.point && (
            <>
              <line
                x1={feat.ridge.from[0] + 3}
                y1={feat.ridge.from[1]}
                x2={feat.ridge.to[0] - 3}
                y2={feat.ridge.to[1]}
                stroke={C.accent}
                strokeWidth={0.55}
                strokeDasharray="1.4 0.9"
                strokeLinecap="round"
              />
              <circle cx={feat.point[0]} cy={feat.point[1]} r={1.2} fill={C.accent} stroke="#FFFFFF" strokeWidth={0.4} />
              <MapLabel at={[50, 31]} text={labels.saddle} fill={C.accent} />
            </>
          )}

          {form === 'depression' && feat.point && <MapLabel at={feat.point} text={labels.low} fill={C.accent} />}
        </motion.g>
      )}
    </svg>
  );
}

/* ── Slopes — linked side profile + contour strip ────────────────────────── */

// [d, e] normalized — d = horizontal distance from the foot (0) to the crest (1),
// e = height in equal contour intervals (0 = foot, 1 = crest). The same crossings feed
// both the side profile and the map view, so a steep segment reads as tight contours.
export const SLOPE_GEO: Record<string, [number, number][]> = {
  even: [[0, 0], [0.2, 0.2], [0.4, 0.4], [0.6, 0.6], [0.8, 0.8], [1, 1]],
  convex: [[0, 0], [0.04, 0.2], [0.16, 0.4], [0.36, 0.6], [0.64, 0.8], [1, 1]],
  concave: [[0, 0], [0.36, 0.2], [0.64, 0.4], [0.84, 0.6], [0.96, 0.8], [1, 1]],
  shoulder: [[0, 0], [0.1, 0.2], [0.2, 0.4], [0.75, 0.6], [0.86, 0.8], [1, 1]],
};

const geoOf = (slope: string) => SLOPE_GEO[slope] ?? SLOPE_GEO.even;

// Monotone cubic (Fritsch–Carlson) through the crossings — a smooth slope that
// still passes exactly through every equal-height crossing.
function monotoneSegments(pts: [number, number][]): { c1: Pt; c2: Pt; to: Pt }[] {
  const n = pts.length;
  const h: number[] = [];
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(pts[i + 1][0] - pts[i][0]);
    delta.push((pts[i + 1][1] - pts[i][1]) / h[i]);
  }
  const m: number[] = new Array(n).fill(0);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * delta[i];
      m[i + 1] = t * b * delta[i];
    }
  }
  return pts.slice(0, -1).map(([d, e], i) => {
    const [d2, e2] = pts[i + 1];
    return {
      c1: [d + h[i] / 3, e + (m[i] * h[i]) / 3] as Pt,
      c2: [d2 - h[i] / 3, e2 - (m[i + 1] * h[i]) / 3] as Pt,
      to: [d2, e2] as Pt,
    };
  });
}

// Profile board geometry (viewBox 0 0 200 56)
const P_W = 200;
const P_H = 51;
const sx = (d: number) => 30 + d * 144; // foot → crest, shared with the contour strip
const py = (e: number) => 40 - e * 29;
const P_GROUND = 40;
const P_BOTTOM = 45;
const P_LEFT = 18;
const P_RIGHT = 190;

function surfacePath(slope: string, X = sx, Y = py, left = P_LEFT, right = P_RIGHT): string {
  const pts = geoOf(slope);
  const segs = monotoneSegments(pts);
  let d = `M${f2(left)},${f2(Y(0))}L${f2(X(0))},${f2(Y(0))}`;
  for (const s of segs) {
    d += `C${f2(X(s.c1[0]))},${f2(Y(s.c1[1]))} ${f2(X(s.c2[0]))},${f2(Y(s.c2[1]))} ${f2(X(s.to[0]))},${f2(Y(s.to[1]))}`;
  }
  d += `L${f2(right)},${f2(Y(1))}`;
  return d;
}

const BAND_COLORS = [0, 1, 2, 3, 4].map((k) => faceColor(BASE + ((k + 0.5) / 5) * 60));
const ELEV = (e: number) => String(Math.round(100 + e * 100));

export function SlopeProfile({
  slope,
  bottomLabel,
  topLabel,
  ariaLabel,
}: {
  slope: string;
  bottomLabel: string;
  topLabel: string;
  ariaLabel: string;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pts = geoOf(slope);
  const surface = surfacePath(slope);
  const body = `${surface}L${P_RIGHT},${P_BOTTOM}L${P_LEFT},${P_BOTTOM}Z`;
  const tr = { duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <svg viewBox={`0 0 ${P_W} ${P_H}`} className="block w-full h-auto" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F6EFE6" />
        </linearGradient>
        <clipPath id={`${uid}-body`}>
          <motion.path initial={false} animate={{ d: body }} transition={tr} />
        </clipPath>
        <filter id={`${uid}-lift`} x="-5%" y="-20%" width="110%" height="150%">
          <feDropShadow dx="0" dy="0.7" stdDeviation="0.8" floodColor="#3B3524" floodOpacity="0.22" />
        </filter>
      </defs>
      <rect x={0} y={0} width={P_W} height={P_H} fill={`url(#${uid}-sky)`} />

      {/* equal-height reference lines + elevations (m) */}
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((e) => (
        <g key={e}>
          <line
            x1={18}
            y1={py(e)}
            x2={P_RIGHT + 4}
            y2={py(e)}
            stroke={C.contour}
            strokeOpacity={0.55}
            strokeWidth={0.28}
            strokeDasharray="1.4 1.2"
          />
          <text
            x={11}
            y={py(e) + 1.05}
            textAnchor="middle"
            fontSize={2.9}
            fill={C.contourIndex}
            className="font-display font-semibold"
          >
            {ELEV(e)}
          </text>
        </g>
      ))}

      {/* the terrain as a papercut cross-section: one band per contour interval */}
      <g filter={`url(#${uid}-lift)`}>
        <g clipPath={`url(#${uid}-body)`}>
          <rect x={P_LEFT} y={P_GROUND} width={P_RIGHT - P_LEFT} height={P_BOTTOM - P_GROUND} fill={C.rim} />
          {BAND_COLORS.map((col, k) => (
            <rect
              key={k}
              x={P_LEFT}
              y={py((k + 1) / 5)}
              width={P_RIGHT - P_LEFT}
              height={py(k / 5) - py((k + 1) / 5) + 0.02}
              fill={col}
            />
          ))}
        </g>
        <motion.path
          initial={false}
          animate={{ d: surface }}
          transition={tr}
          fill="none"
          stroke={C.greenDeep}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
      </g>

      {/* drop lines — each crossing falls straight onto its contour line below */}
      {pts.map(([d, e], i) => (
        <motion.line
          key={'drop' + i}
          initial={false}
          animate={{ x1: sx(d), x2: sx(d), y1: py(e) }}
          transition={tr}
          y2={P_H}
          stroke={C.contourIndex}
          strokeOpacity={0.55}
          strokeWidth={0.3}
          strokeDasharray="0.9 0.9"
        />
      ))}
      {pts.slice(1, 5).map(([d, e], i) => (
        <motion.circle
          key={'dot' + i}
          initial={false}
          animate={{ cx: sx(d), cy: py(e) }}
          transition={tr}
          r={1.5}
          fill={C.accent}
          stroke="#FFFFFF"
          strokeWidth={0.5}
        />
      ))}

      {/* crest + foot */}
      <Summit at={[sx(1), py(1) - 0.9]} fill={C.ink} size={2.6} />
      <text x={sx(1) + 9} y={py(1) - 1.2} textAnchor="middle" fontSize={3.6} fill={C.ink} className="font-display font-bold">
        {topLabel}
      </text>
      <text x={sx(0) - 11} y={P_BOTTOM + 4.4} textAnchor="middle" fontSize={3.6} fill={C.ink} className="font-display font-bold">
        {bottomLabel}
      </text>
    </svg>
  );
}

// Contour strip (viewBox 0 0 200 40) — the same slope from above. Every line is the
// same gentle curve shifted to its crossing's x, so spacing is the only variable.
const M_H = 36;
const M_TOP = 7.5;
const M_BOT = 28.5;
const contourD = (x: number) =>
  `M${f2(x)},${M_TOP}C${f2(x + 1.8)},${f2(M_TOP + 8)} ${f2(x - 1.8)},${f2(M_BOT - 8)} ${f2(x)},${M_BOT}`;

export function SlopeContours({
  slope,
  bottomLabel,
  topLabel,
  ruleLabel,
  ariaLabel,
}: {
  slope: string;
  bottomLabel: string;
  topLabel: string;
  ruleLabel: string;
  ariaLabel: string;
}) {
  const reduce = useReducedMotion();
  const pts = geoOf(slope);
  const tr = { duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] as const };
  const mid = (M_TOP + M_BOT) / 2;

  return (
    <svg viewBox={`0 0 ${P_W} ${M_H}`} className="block w-full h-auto" role="img" aria-label={ariaLabel}>
      <rect x={0} y={0} width={P_W} height={M_H} fill={C.paper} />
      <rect x={P_LEFT} y={M_TOP} width={P_RIGHT - P_LEFT} height={M_BOT - M_TOP} fill="#FFFFFF" />
      <g stroke={C.hairlineSoft} strokeWidth={0.2}>
        {Array.from({ length: 17 }, (_, i) => (
          <line key={i} x1={P_LEFT + (i + 1) * 10} y1={M_TOP} x2={P_LEFT + (i + 1) * 10} y2={M_BOT} />
        ))}
        <line x1={P_LEFT} y1={18} x2={P_RIGHT} y2={18} />
      </g>
      {/* drop-line stubs continuing from the profile above */}
      {pts.map(([d], i) => (
        <motion.line
          key={'stub' + i}
          initial={false}
          animate={{ x1: sx(d), x2: sx(d) }}
          transition={tr}
          y1={0}
          y2={M_TOP}
          stroke={C.contourIndex}
          strokeOpacity={0.55}
          strokeWidth={0.3}
          strokeDasharray="0.9 0.9"
        />
      ))}
      {pts.map(([d], i) => {
        const isIndex = i === 0 || i === pts.length - 1;
        return (
          <g key={i}>
            <motion.path
              initial={false}
              animate={{ d: contourD(sx(d)) }}
              transition={tr}
              fill="none"
              stroke={isIndex ? C.contourIndex : C.contour}
              strokeWidth={isIndex ? 0.75 : 0.55}
              strokeLinecap="round"
            />
            {/* downhill tick — points toward the foot (lower ground) */}
            <motion.line
              initial={false}
              animate={{ x1: sx(d), x2: sx(d) - 2.2 }}
              transition={tr}
              y1={mid}
              y2={mid}
              stroke={isIndex ? C.contourIndex : C.contour}
              strokeWidth={0.5}
              strokeLinecap="round"
            />
          </g>
        );
      })}
      <rect x={P_LEFT} y={M_TOP} width={P_RIGHT - P_LEFT} height={M_BOT - M_TOP} fill="none" stroke={C.hairline} strokeWidth={0.35} />
      <text x={P_W / 2} y={5} textAnchor="middle" fontSize={3.3} fill={C.ink} className="font-display font-bold">
        {ruleLabel}
      </text>
      <text x={sx(0)} y={33.3} textAnchor="middle" fontSize={3.4} fill={C.ink} className="font-display font-bold">
        {bottomLabel}
      </text>
      <text x={sx(1)} y={33.3} textAnchor="middle" fontSize={3.4} fill={C.ink} className="font-display font-bold">
        {topLabel}
      </text>
    </svg>
  );
}

// Tiny profile glyph for the slope tabs.
export function SlopeGlyph({ slope, className }: { slope: string; className?: string }) {
  const X = (d: number) => 4 + d * 32;
  const Y = (e: number) => 19 - e * 15;
  return (
    <svg viewBox="0 0 40 22" className={className} aria-hidden>
      <path d={`${surfacePath(slope, X, Y, 1, 39)}L39,21L1,21Z`} fill="currentColor" fillOpacity={0.16} />
      <path
        d={surfacePath(slope, X, Y, 1, 39)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
