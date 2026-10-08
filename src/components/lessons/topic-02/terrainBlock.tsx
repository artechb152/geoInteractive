'use client';

/**
 * terrainBlock — the React half of the terrain-block engine (geometry lives in
 * terrainBlockGeometry.ts). Extracted from LandformsVisuals so any scene can show
 * a height field as the papercut block ("בשטח") and its contour map ("במפה"):
 *   - TerrainBlockView: the block; a change of height field morphs on the GPU;
 *   - useContourMorph + ContourMapSheet: the contour map; contours re-trace
 *     every frame while the height field changes.
 * Diagrams — never mirrored for RTL; every <text> sets textAnchor.
 */

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { animate, cubicBezier, motion, useReducedMotion } from 'framer-motion';
import {
  C, INDEX_LEVEL, LEVELS, MAP_H, MAP_Y, REAL_H, REAL_W, REAL_X, TH, TW, VB_W, VB_X,
  contourRings, f2, getMorphMesh, identity, lerpArr, pointsAttr, ringsPath,
  type Contours, type Grid, type Pt, type Terrain,
} from './terrainBlockGeometry';

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

export function TerrainBlockView({
  terrain,
  ariaLabel,
  marks,
  objects,
}: {
  terrain: Terrain;
  ariaLabel: string;
  /** Lines draped on the ground (feature marks): fade in each time the block lands. */
  marks?: ReactNode;
  /** Things standing on the ground: an SVG layer above the moving canvas, from the block's first landing on. */
  objects?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  // The moving frames are drawn on a canvas over the board; the finished board
  // is painted underneath before the canvas goes.
  //  - First showing — build-up, bottom to top: the block lands flat, then the
  //    ground rises out of it to full relief, one continuous surface the whole
  //    way (user decision 2026-09-28: no stacked contour sheets).
  //  - Switching terrains — shape to shape: the ground on screen reshapes
  //    straight into the next one, without going flat again (user decision
  //    2026-09-28). A click mid-move carries on from the shape on screen.
  const layerRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<SVGPolygonElement>(null);
  // what the canvas shows: pose `from` blended toward `to` by s (and the shadow with it)
  const shownRef = useRef<{ from: Float32Array; to: Float32Array; foot: [number[], number[]]; s: number } | null>(null);
  const [stage, setStage] = useState<{ terrain: Terrain; step: 'landed' | 'done' } | null>(null);
  // a new terrain is moving until its own run lands
  const step = stage?.terrain === terrain ? stage.step : 'moving';
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
      setStage({ terrain, step: 'done' });
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
          setStage({ terrain, step: 'done' });
        };
        setStage({ terrain, step: 'landed' });
      },
    });
    return () => {
      controls.stop();
      gl.dispose();
      canvas.remove();
      // stopped before anything rose (or re-run by Strict Mode): build up afresh
      if (build && run.s === 0) shownRef.current = null;
    };
  }, [reduce, terrain]);

  // Landed: the finished board is committed under the canvas's last frame. Two
  // frames later it has painted, and the canvas goes.
  useEffect(() => {
    if (step !== 'landed') return;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => releaseRef.current());
    });
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // While the ground moves, the hidden board keeps the last settled terrain: the
  // next one's thousands of strips are laid in under the canvas once it lands,
  // not in the frame of the click.
  const boardTerrain = built || !stage ? terrain : stage.terrain;
  const board = useMemo(
    () => (
      <>
        {/* each strip is stroked in its own colour to close hairline seams */}
        <g strokeWidth={0.32} strokeLinejoin="round" filter={`url(#${uid}-smooth)`}>
          {boardTerrain.surface.map((s, i) => (
            <path key={i} d={s.d} fill={s.fill} stroke={s.fill} />
          ))}
        </g>
        {boardTerrain.walls.map((w, i) => (
          <path key={i} d={w.d} fill={w.fill} stroke={w.fill} strokeWidth={0.1} strokeLinejoin="round" />
        ))}
      </>
    ),
    [boardTerrain, uid],
  );

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
            {marks}
          </motion.g>
        )}
      </svg>
      {/* the moving frames (canvas added by the effect above) */}
      {step !== 'done' && <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0" />}
      {/* standing objects stay visible over the moving ground */}
      {objects !== undefined && stage && (
        <svg
          viewBox={`${f2(REAL_X)} 0 ${f2(REAL_W)} ${REAL_H}`}
          aria-hidden
          className="pointer-events-none absolute inset-0 block h-full w-full"
        >
          {objects}
        </svg>
      )}
    </div>
  );
}

/** The map's contours for a height field; when the field changes, every frame
 *  traces it part way from the shown one to the next (every level, so rings can
 *  appear, split and merge on the way). */
export function useContourMorph(c: Contours): { paths: string[]; still: boolean; switched: boolean } {
  const reduce = useReducedMotion();
  const settledPaths = useMemo(() => LEVELS.map((L) => ringsPath(c.rings.get(L) ?? [], identity)), [c]);
  const [moving, setMoving] = useState<string[] | null>(null);
  const [switched, setSwitched] = useState(false);
  const shownRef = useRef<{ from: ArrayLike<number>; to: ArrayLike<number>; s: number }>({
    from: c.grid.v,
    to: c.grid.v,
    s: 1,
  });
  useLayoutEffect(() => {
    const prev = shownRef.current;
    const to = c.grid.v;
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
      const g: Grid = { ...c.grid, v: lerpArr(run.from, run.to, run.s) };
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
  }, [c, reduce]);
  return { paths: moving ?? settledPaths, still: moving === null, switched };
}

/** The map sheet: paper, grid, contours (clipped to the tile) and the tile border.
 *  behind = under the height tint and contours; inClip = over the contours;
 *  children = over the border (labels, marks). */
export function ContourMapSheet({
  ariaLabel,
  paths,
  layerTint = C.greenLight,
  behind,
  inClip,
  children,
}: {
  ariaLabel: string;
  /** one path per LEVELS entry (useContourMorph().paths) */
  paths: string[];
  /** faint per-level height tint — deeper = higher ground; null = none */
  layerTint?: string | null;
  behind?: ReactNode;
  inClip?: ReactNode;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
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
        {behind}
        {/* faint layer tint — deeper tint = higher ground, like the diorama */}
        {layerTint &&
          LEVELS.map((L, i) => (
            <path key={'t' + L} d={paths[i]} fillRule="evenodd" fill={layerTint} fillOpacity={0.045} />
          ))}
        {LEVELS.map((L, i) => (
          <path
            key={L}
            data-contour={L}
            d={paths[i]}
            fill="none"
            stroke={L === INDEX_LEVEL ? C.contourIndex : C.contour}
            strokeWidth={L === INDEX_LEVEL ? 0.55 : 0.32}
            strokeLinejoin="round"
          />
        ))}
        {inClip}
      </motion.g>
      <rect x={0} y={0} width={TW} height={TH} fill="none" stroke={C.hairline} strokeWidth={0.35} />
      {children}
    </svg>
  );
}

export function MapLabel({
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

/** Runs each task once, one per idle slot, after mount — warms caches so a later switch is quick. */
export function useIdlePrefetch(tasks: readonly (() => void)[]) {
  useEffect(() => {
    let alive = true;
    const queue = [...tasks];
    const next = () => {
      const task = queue.shift();
      if (!alive || !task) return;
      task();
      schedule();
    };
    // Safari has no requestIdleCallback
    const idle = window.requestIdleCallback as ((cb: () => void) => number) | undefined;
    const schedule = () => (idle ? idle.call(window, next) : window.setTimeout(next, 120));
    schedule();
    return () => {
      alive = false;
    };
  }, [tasks]);
}
