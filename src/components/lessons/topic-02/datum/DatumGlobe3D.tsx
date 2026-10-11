'use client';

/* ─────────────── דאטום — the guided 3-D globe ───────────────
   A live R3F scene of the datum exercise
   (design/mockups/datum-concepts/01-guided-3d-site-palette.png; briefs:
   claude-hologram-refinement-prompt.md, claude-realism-and-inset-prompt.md,
   claude-material-match-prompt.md):
   - the Earth: a lit globe with real relief — NASA/GEBCO land elevation and
     Natural Earth coasts as albedo, normal and roughness maps (datumEarth),
     the land a mineral satin, the sea a warm ivory glaze with a thin
     decorative engraving, almost solid — opened by a cutaway on the side
     facing the camera. The back wall of the cutaway IS the original 2-D
     exercise plane (z = 0): the geoid line, the posed ellipse and the marked
     local arc are drawn from datumGeometry.ts, the numbers the score uses.
     The cut faces carry the Earth's material above the geoid: an ivory skin
     at the surface over a warm crust that deepens toward the geoid;
   - the geoid: a whole, present blue body whose own waves read in light and
     shade, with a few faint contour lines; the ellipsoid: a quiet, thin
     orange skin holding a dense graticule cage, crisp in front, thinner
     (still orange) seen through the geoid, faint on its own far side (depth
     passes, below);
   - one studio light for everything (datumHolo STUDIO_GLSL), fixed to the
     view, so a turned globe stays lit;
   - everything sits in one display transform (datumGeometry DISPLAY_K) that
     makes the globe read almost round; the exercise numbers are untouched;
   - the camera widens (camera.zoom) only when the displaced ellipsoid would
     leave the stage, and eases back as it comes in;
   - the linked close-up is drawn by the same renderer into its circle
     (DatumInset3D).
   All learning state comes in as props; this file only owns the camera.
   Labels and the inspection marker are HTML/SVG overlays projected from 3-D
   anchors every rendered frame, hidden when their anchor is hidden. Frames
   render on demand only. */

import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  CUT, DISPLAY_K, ELL, GC, GEOID, REGION, angleOf, bodyPoint, ellipsoidSectionX0, geoidAt, geoidW3, inCutaway, planeToWorld,
  posedEllipse, poseToWorld, surfaceEnvelopeW, svgToPlane, type DatumMode, type Pose, type Vec3,
} from './datumGeometry';
import { earthTextures, heightAt, loadEarth, LON_AT_WALL, type EarthImages } from './datumEarth';
import { bodyMaterial, clearDepthBefore, depthMaterial, earthMaterial, setUniforms, wallMaterial } from './datumHolo';
import { InsetPass } from './DatumInset3D';
import type { Interaction, Surface } from './datumDemo';
import { INSET, MARKER_R, type ChipId, type OverlayRefs } from './datumOverlays';

/* ── palette: lesson tokens only (tailwind.config.ts) ── */
const C = {
  geoid: '#5B9DD9', // accent.cool — geoid only (as in the original block)
  ellipsoid: '#D97E2B', // accent — the body the learner manipulates
  sage: '#749C75', // brand — the Earth's rim
  cream: '#F6EFE6', // bg.accent — the cut panes
  sand: '#ECE4D2', // border.subtle — the Earth's material on the cut
  tan: '#C9A56B', // border.strong — its shaded inner edge
  ink: '#38432E', // fg — rim of the cut
  white: '#FFFFFF',
  /** the cut's lip: the sand of the cut faces, a shade toward the relief tan */
  lip: '#E3D3B2',
} as const;
/** Radius of the lip along the cut (section units): a rounded edge, not a tube. */
const LIP_R = 2.1;

/** World units per section (viewBox) unit. */
const S = 1 / 100;
const RELIEF = 0.022; // land rises ≤ 2.2 % — real relief, exaggerated, still restrained
const FOV = 26;
const CAM = { az: -0.21, el: 0.18, dist: 8.9 } as const;
/** The globe sits right of the stage centre (as in the mockup): a lens shift
    in stage fractions, so orbiting stays centred on the globe. */
const SHIFT = { x: 0.12, y: 0.0 } as const;

const terrainW = (beta: number, lam: number) =>
  surfaceEnvelopeW(beta, lam) + RELIEF * heightAt(LON_AT_WALL - (lam * 180) / Math.PI, (beta * 180) / Math.PI);
/** Terrain radial factor (the loaded relief; the smooth envelope before it loads). */
const terrainR = terrainW;

/** (β, λ, w) of a section-unit point on the oblate frame. */
function toParam(x: number, y: number, z: number) {
  const rho = Math.hypot(x, z);
  return { beta: Math.atan2(y / ELL.ry, rho / ELL.rx), lam: Math.atan2(z, x), w: Math.hypot(rho / ELL.rx, y / ELL.ry) };
}

/** Section units → world (display mapping + scene scale). */
const toWorld = (p: Vec3) => new THREE.Vector3(p[0] * S, p[1] * S * DISPLAY_K, p[2] * S);

/* ───────────────────────── geometry builders (section units) ───────────────────────── */

/** A (β, λ) grid on the oblate frame. Vertex normals come from `shade` (the
    smooth envelope for the Earth — the relief's light is the normal map's
    job), positions from `radius`; `aEast` carries the local east direction
    for the normal map. */
function gridGeometry(
  nb: number,
  nl: number,
  lam0: number,
  lam1: number,
  radius: (beta: number, lam: number) => number,
  uvOf?: (beta: number, lam: number) => [number, number],
  shade?: (beta: number, lam: number) => number,
) {
  const n = (nb + 1) * (nl + 1);
  const pos = new Float32Array(n * 3);
  const flat = shade ? new Float32Array(n * 3) : pos;
  const east = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  let k = 0;
  for (let i = 0; i <= nb; i++) {
    const beta = -Math.PI / 2 + (i / nb) * Math.PI;
    for (let j = 0; j <= nl; j++) {
      const lam = lam0 + (j / nl) * (lam1 - lam0);
      pos.set(bodyPoint(radius(beta, lam), beta, lam), k * 3);
      if (shade) flat.set(bodyPoint(shade(beta, lam), beta, lam), k * 3);
      // east = toward increasing longitude = decreasing λ
      east.set([Math.sin(lam), 0, -Math.cos(lam)], k * 3);
      const t = uvOf ? uvOf(beta, lam) : [j / nl, i / nb];
      uv[k * 2] = t[0];
      uv[k * 2 + 1] = t[1];
      k++;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < nb; i++) {
    for (let j = 0; j < nl; j++) {
      const a = i * (nl + 1) + j;
      const b = a + 1;
      const c = a + nl + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d); // CCW from outside: (∂β × ∂λ) points outward
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(flat, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aEast', new THREE.BufferAttribute(east, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (shade) g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return g;
}

/** A few faint contour lines on the geoid — three parallels and two meridians
    that follow its waves. The body itself carries the waviness (light and
    shade); the orange cage stays the one grid in the picture. One segment list. */
const GEOID_LINES: Vec3[] = (() => {
  const lift = 1.004;
  const segs: Vec3[] = [];
  const run = (pts: Vec3[]) => pts.slice(1).forEach((p, i) => segs.push(pts[i], p));
  for (const beta of [-0.52, 0, 0.52]) {
    run(Array.from({ length: 145 }, (_, i) => {
      const lam = (i / 144) * Math.PI * 2;
      return bodyPoint(geoidW3(beta, lam) * lift, beta, lam);
    }));
  }
  for (const lam of [Math.PI / 4, (5 * Math.PI) / 4, (3 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    run(Array.from({ length: 73 }, (_, i) => {
      const beta = -Math.PI / 2 + (i / 72) * Math.PI;
      return bodyPoint(geoidW3(beta, lam) * lift, beta, lam);
    }));
  }
  return segs;
})();

/** The geoid's light follows its own waves, a little emphasised: vertex
    normals from the same surface with its departure from the mean × 2.6,
    and `aWave` (the departure itself, −1…1) shading crests and troughs. The
    positions stay geoidW3 — nothing new is drawn into the shape. */
const GEOID_SHADE = { normals: 2.6, wave: 0.09 } as const;
function geoidGeometry() {
  const g = gridGeometry(120, 240, 0, 2 * Math.PI, geoidW3, undefined, (b, l) => 1 + (geoidW3(b, l) - 1) * GEOID_SHADE.normals);
  const pos = g.getAttribute('position');
  const wave = new Float32Array(pos.count);
  for (let i = 0; i <= 120; i++) {
    const beta = -Math.PI / 2 + (i / 120) * Math.PI;
    for (let j = 0; j <= 240; j++) wave[i * 241 + j] = Math.max(-1, Math.min(1, (geoidW3(beta, (j / 240) * 2 * Math.PI) - 1) / GEOID_SHADE.wave));
  }
  g.setAttribute('aWave', new THREE.BufferAttribute(wave, 1));
  // one normal per point where the grid meets itself: the λ = 0 / 2π seam and the two poles
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i <= 120; i++) {
    a.fromBufferAttribute(nrm, i * 241).add(b.fromBufferAttribute(nrm, i * 241 + 240)).normalize();
    nrm.setXYZ(i * 241, a.x, a.y, a.z);
    nrm.setXYZ(i * 241 + 240, a.x, a.y, a.z);
  }
  for (const row of [0, 120]) {
    a.set(0, 0, 0);
    for (let j = 0; j <= 240; j++) a.add(b.fromBufferAttribute(nrm, row * 241 + j));
    a.normalize();
    for (let j = 0; j <= 240; j++) nrm.setXYZ(row * 241 + j, a.x, a.y, a.z);
  }
  return g;
}

/** The ellipsoid's cage on the unit sphere, a dense even graticule (cells
    tuned to the reference's at the same globe size): parallels every 10° from
    −80° to 80°, meridians every 10° up to ±60° and every 30° on to ±80°, as
    on a printed graticule — 36 lines never knot into a bright spot at the
    poles. One segment list (pairs of points): each pass of the cage is a
    single draw. */
const CAGE_STEP = Math.PI / 18;
const CAGE: Vec3[] = (() => {
  const lift = 1.004;
  const at = (beta: number, lam: number): Vec3 => [Math.cos(beta) * Math.cos(lam) * lift, Math.sin(beta) * lift, Math.cos(beta) * Math.sin(lam) * lift];
  const segs: Vec3[] = [];
  const run = (pts: Vec3[]) => pts.slice(1).forEach((p, i) => segs.push(pts[i], p));
  for (let k = 0; k < 36; k++) {
    const cap = (k % 3 ? 6 : 8) * CAGE_STEP;
    run(Array.from({ length: 49 }, (_, i) => at(-cap + (i / 48) * 2 * cap, k * CAGE_STEP)));
  }
  for (let j = -8; j <= 8; j++) run(Array.from({ length: 145 }, (_, i) => at(j * CAGE_STEP, (i / 144) * Math.PI * 2)));
  return segs;
})();

/* ───────────────────────── cutaway walls ───────────────────────── */

/** Canvas frame of a wall: horizontal h ∈ [0, H1] from the axis, y ∈ [−Y1, Y1] (section units). */
const WALL = { h1: 205, y1: 185, k: 3 } as const;
type WallKind = 'exercise' | 'side';

function wallProfile(lam: number, n = 160) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const beta = -Math.PI / 2 + (i / n) * Math.PI;
    const w = terrainW(beta, lam);
    return { h: w * ELL.rx * Math.cos(beta), y: w * ELL.ry * Math.sin(beta) };
  });
}

function makeWall(kind: WallKind) {
  const lam = kind === 'exercise' ? CUT.from : CUT.to;
  const prof = wallProfile(lam);
  const shape = new THREE.Shape();
  shape.moveTo(0, prof[0].y);
  for (const p of prof) shape.lineTo(p.h, p.y);
  shape.lineTo(0, prof[prof.length - 1].y);
  shape.closePath();
  const geom = new THREE.ShapeGeometry(shape, 1);
  // UVs: the canvas frame (h / H1, y from −Y1 … Y1)
  const pos = geom.getAttribute('position');
  const uv = geom.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / WALL.h1, (pos.getY(i) + WALL.y1) / (2 * WALL.y1));
  uv.needsUpdate = true;
  const canvas = document.createElement('canvas');
  canvas.width = WALL.h1 * WALL.k;
  canvas.height = 2 * WALL.y1 * WALL.k;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = wallMaterial(tex);
  return { geom, canvas, tex, mat, prof };
}

const exerciseToWall = (pts: { x: number; y: number }[]) =>
  pts.map((q) => {
    const { u, v } = svgToPlane(q.x, q.y);
    return { h: u, y: v };
  });

/** The cut faces: a faint pane, shaded toward the axis (the inner corner of
    the opening), with the Earth's material above the geoid as a sand band —
    a lit lip at the surface, a shaded inner edge at the geoid — and the
    crisp section lines: the exact 2-D exercise on the back wall. */
function drawWall(wall: ReturnType<typeof makeWall>, kind: WallKind, pose: Pose, mode: DatumMode, surface: Surface, showEllipsoid: boolean) {
  const ctx = wall.canvas.getContext('2d')!;
  const { k, h1, y1 } = WALL;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, wall.canvas.width, wall.canvas.height);
  ctx.setTransform(k, 0, 0, -k, 0, y1 * k); // wall units, y up
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const path = (pts: { h: number; y: number }[], close = false) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.h, p.y) : ctx.moveTo(p.h, p.y)));
    if (close) ctx.closePath();
  };
  const geoid =
    kind === 'exercise'
      ? exerciseToWall(GEOID.filter((q) => Math.cos(q.t) >= -0.05)).sort((p, q) => p.y - q.y)
      : Array.from({ length: 121 }, (_, i) => {
          const beta = -Math.PI / 2 + (i / 120) * Math.PI;
          const p = bodyPoint(geoidW3(beta, CUT.to), beta, CUT.to);
          return { h: p[2], y: p[1] };
        });
  const inside = [{ h: 0, y: wall.prof[0].y }, ...wall.prof, { h: 0, y: wall.prof[wall.prof.length - 1].y }];

  // the pane: faint, a little deeper toward the axis where the two cut faces meet
  ctx.save();
  path(inside, true);
  ctx.clip();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, -y1, h1, 2 * y1);
  const ao = ctx.createLinearGradient(0, 0, 100, 0);
  ao.addColorStop(0, 'rgba(201,165,107,0.42)');
  ao.addColorStop(1, 'rgba(201,165,107,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = ao;
  ctx.fillRect(0, -y1, h1, 2 * y1);
  ctx.restore();

  // the Earth's material above the geoid: the ivory skin at the surface, then
  // a warm crust that deepens toward the geoid (tan, a breath of ink at the
  // bottom) — the cut reads as depth, not as a bright ring
  ctx.save();
  path([...wall.prof, ...geoid.slice().reverse()], true);
  ctx.clip('evenodd');
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = C.tan;
  ctx.fillRect(0, -y1, h1, 2 * y1);
  ctx.strokeStyle = C.ink;
  for (const [w, a] of [[18, 0.1], [9, 0.16], [3.5, 0.24]] as const) {
    ctx.globalAlpha = a;
    ctx.lineWidth = w;
    path(geoid);
    ctx.stroke();
  }
  ctx.strokeStyle = C.sand;
  for (const [w, a] of [[12, 0.25], [6, 0.45], [2.6, 0.85]] as const) {
    ctx.globalAlpha = a;
    ctx.lineWidth = w;
    path(wall.prof);
    ctx.stroke();
  }
  ctx.strokeStyle = C.white;
  for (const [w, a] of [[1.4, 0.4]] as const) {
    ctx.globalAlpha = a;
    ctx.lineWidth = w;
    path(wall.prof);
    ctx.stroke();
  }
  ctx.restore();

  // the cut's outline
  ctx.globalAlpha = surface === 'surface' ? 0.75 : 0.5;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = surface === 'surface' ? 1.8 : 1.2;
  path(wall.prof);
  ctx.stroke();

  if (kind === 'exercise' && mode === 'local') {
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = C.geoid;
    ctx.lineWidth = 9;
    path(exerciseToWall(REGION.local));
    ctx.stroke();
  }
  ctx.globalAlpha = surface === 'geoid' ? 1 : 0.85;
  ctx.strokeStyle = C.geoid;
  ctx.lineWidth = surface === 'geoid' ? 3.4 : 2.4;
  path(geoid);
  ctx.stroke();

  if (showEllipsoid) {
    const sec = kind === 'exercise' ? exerciseToWall(posedEllipse(pose, 160)) : (ellipsoidSectionX0(pose, 160) ?? []).map((q) => ({ h: q.z, y: q.y }));
    if (sec.length) {
      ctx.globalAlpha = surface === 'ellipsoid' ? 1 : 0.85;
      ctx.strokeStyle = C.ellipsoid;
      ctx.lineWidth = surface === 'ellipsoid' ? 3.4 : 2.4;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, -y1, h1 + 50, 2 * y1);
      ctx.clip();
      path(sec, true);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  wall.tex.needsUpdate = true;
}

/* ───────────────────────── look per state ───────────────────────── */

// Each body keeps a presence when it is not the chosen one; choosing it
// strengthens its body, rim and lines — it never appears from nothing.
// The geoid is a present, almost solid blue body (as in the reference); it
// opens up a little while the ellipsoid inside it is the chosen one ("under").
// Cage lines: `lines` is their final strength in front of everything,
// `behind` seen through the geoid — thinner there, but kept nearly opaque:
// orange blended half-way into blue turns grey, so the cage stays orange —
// and `hidden` on the body's own far side. The ellipsoid's surface, seen
// through the geoid, takes what the geoid lets through (see `through`).
const LOOK = {
  geoid: {
    on: { opacity: 0.94, rimStrength: 0.26, rimAlpha: 0.06, back: 0.6, lines: 0.18, width: 1 },
    off: { opacity: 0.88, rimStrength: 0.2, rimAlpha: 0.06, back: 0.5, lines: 0.12, width: 1 },
    under: { opacity: 0.74, rimStrength: 0.18, rimAlpha: 0.05, back: 0.4, lines: 0.1, width: 1 },
  },
  ellipsoid: {
    on: { opacity: 0.07, rimStrength: 0.7, rimAlpha: 0.42, back: 0.05, lines: 1, behind: 0.88, hidden: 0.1, width: 1.35 },
    off: { opacity: 0.035, rimStrength: 0.5, rimAlpha: 0.3, back: 0.03, lines: 0.9, behind: 0.74, hidden: 0.06, width: 1.1 },
  },
} as const;
const geoidLook = (s: Surface) => LOOK.geoid[s === 'geoid' ? 'on' : s === 'ellipsoid' ? 'under' : 'off'];
/** How much of the ellipsoid's surface shows behind the geoid: what the geoid lets through, helped a little. */
const through = (s: Surface) => Math.min(0.6, (1 - geoidLook(s).opacity) * 2.5);

/* Draw order (all in the transparent queue, so renderOrder is the sequence):
    1     Earth, inside of the shell (seen through the opening)
    2     cut faces — the panes and the section drawing
   10–11  geoid, inner side: depth reset → cut faces into depth → inner side
   12–15  ellipsoid, its own far side: depth reset → cut faces into depth →
          inner side → its inner side into depth (pushed back) → the cage
          (tested against both: the far side shows through its own surface,
          never through the cut faces) — all of it under the geoid's surface
   16–19  geoid: depth reset → cut faces into depth → depth → surface → a few
          faint contour lines on it
   28–29  Earth, near side: depth reset → cut faces into depth → the shell
          (writes depth) — it covers whatever lies inside it
   31–35  ellipsoid, seen side: depth (tested against the shell) → cage and
          surface as seen through the geoid → the geoid's front into depth →
          surface and cage in front of the geoid again (crisp). So the cage
          is crisp in front, subdued behind the geoid, faint on its own far
          side, and hidden inside the globe — never pasted over the scene.
   40     glass over the open quarter — almost clear, only a rim: the globe
          keeps its round silhouette */
const ORDER = { earthBack: 1, walls: 2, geoidBack: 10, ellHidden: 12, geoid: 16, earthFront: 28, ellSeen: 31, glass: 40 } as const;

/* ───────────────────────── scene ───────────────────────── */

type OrbitControlsLike = { enabled: boolean; update: () => void; target: THREE.Vector3 };

type SceneProps = {
  images: EarthImages;
  pose: Pose;
  mode: DatumMode;
  surface: Surface;
  interaction: Interaction;
  capture: boolean;
  onMovePose: (p: Pose) => void;
  onDragging: (d: boolean) => void;
  controlsRef: React.MutableRefObject<OrbitControlsLike | null>;
  isVisible: (p: Vec3) => boolean;
};

function Globe({ images, pose, mode, surface, interaction, capture, onMovePose, onDragging, controlsRef, isVisible }: SceneProps) {
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);

  const terrain = useMemo(() => {
    const geom = gridGeometry(
      180,
      360,
      CUT.to,
      CUT.from + 2 * Math.PI, // everything but the cutaway
      terrainW,
      (b, l) => [(LON_AT_WALL - (l * 180) / Math.PI + 180) / 360, 0.5 + b / Math.PI],
      surfaceEnvelopeW,
    );
    const tex = earthTextures(images, Math.min(8, gl.capabilities.getMaxAnisotropy()));
    const front = earthMaterial({ ...tex, land: 1, sea: 0.985, rim: C.white, rimStrength: 0.12, rimAlpha: 0.2, warm: C.tan, warmth: 0.42, depthWrite: true });
    const back = earthMaterial({ ...tex, land: 0.3, sea: 0.2, inner: true });
    return { geom, tex, front, back };
  }, [images, gl]);

  const geoid = useMemo(() => {
    const geom = geoidGeometry();
    return {
      geom,
      back: bodyMaterial({ color: C.geoid, opacity: 0.5, rimStrength: 0, rimAlpha: 0, side: THREE.BackSide, shade: 0.55, rough: 0.5, spec: 0.3, wave: 0.2 }),
      depth: depthMaterial(),
      // a soft, satin blue: broad highlights in its own hue, a blue rim, the waves in light and shade
      front: bodyMaterial({ color: C.geoid, opacity: 0.88, rimStrength: 0.2, rimAlpha: 0.06, rimPower: 2.4, rough: 0.42, spec: 1.2, specTint: 0.5, rimWhite: 0.1, wave: 0.22, wallShade: 0.5 }),
      // the geoid's front, slightly pushed back: the ellipsoid's cage on (or just above) it stays crisp
      depthBehind: depthMaterial(THREE.FrontSide, 2),
    };
  }, []);

  const walls = useMemo(() => ({ exercise: makeWall('exercise'), side: makeWall('side') }), []);
  const glass = useMemo(
    () => ({
      geom: gridGeometry(72, 36, CUT.from, CUT.to, terrainW),
      mat: bodyMaterial({ color: C.cream, rim: C.sage, opacity: 0.03, rimStrength: 0.34, rimAlpha: 0.3, rimPower: 3.2, rough: 0.3, spec: 0.5 }),
    }),
    [],
  );
  const wallDepth = useMemo(() => depthMaterial(THREE.DoubleSide), []);
  const lip = useMemo(() => {
    const tube = (lam: number) => {
      const pts = Array.from({ length: 121 }, (_, i) => {
        const beta = -Math.PI / 2 + (i / 120) * Math.PI;
        return new THREE.Vector3(...bodyPoint(terrainW(beta, lam) - 0.009, beta, lam));
      });
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, LIP_R, 10, false);
    };
    return {
      geoms: [tube(CUT.from), tube(CUT.to)],
      // the ivory's own edge: matte, a soft highlight, no glow
      mat: bodyMaterial({ color: C.lip, opacity: 1, rimStrength: 0.03, rimAlpha: 0, rough: 0.78, spec: 0.25, depthWrite: true }),
    };
  }, []);
  const sphere = useMemo(() => new THREE.SphereGeometry(1, 96, 64), []);

  useEffect(
    () => () => {
      terrain.geom.dispose();
      Object.values(terrain.tex).forEach((t) => t.dispose());
      terrain.front.dispose();
      terrain.back.dispose();
      geoid.geom.dispose();
      geoid.back.dispose();
      geoid.depth.dispose();
      geoid.front.dispose();
      geoid.depthBehind.dispose();
      for (const w of [walls.exercise, walls.side]) {
        w.geom.dispose();
        w.tex.dispose();
        w.mat.dispose();
      }
      glass.geom.dispose();
      glass.mat.dispose();
      wallDepth.dispose();
      sphere.dispose();
      lip.geoms.forEach((g) => g.dispose());
      lip.mat.dispose();
    },
    [terrain, geoid, walls, glass, wallDepth, sphere, lip],
  );

  useEffect(() => {
    drawWall(walls.exercise, 'exercise', pose, mode, surface, !capture);
    drawWall(walls.side, 'side', pose, mode, surface, !capture);
    invalidate();
  }, [walls, pose, mode, surface, capture, invalidate]);

  const g = geoidLook(surface);
  useEffect(() => {
    setUniforms(geoid.front, { uOpacity: g.opacity, uRimStrength: g.rimStrength, uRimAlpha: g.rimAlpha });
    setUniforms(geoid.back, { uOpacity: g.back });
    // The shell reads as warm ivory: almost solid, the sea letting through only a breath of the
    // bodies inside — more of it turned the ivory grey-blue.
    setUniforms(terrain.front, surface === 'surface' ? { uLand: 1, uSea: 0.985 } : { uLand: 0.99, uSea: 0.965 });
    invalidate();
  }, [g, geoid, terrain, surface, invalidate]);

  const shadowTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    // a wide soft penumbra and a darker core under the globe
    const wide = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    wide.addColorStop(0, 'rgba(56,67,46,0.2)');
    wide.addColorStop(0.5, 'rgba(56,67,46,0.09)');
    wide.addColorStop(1, 'rgba(56,67,46,0)');
    ctx.fillStyle = wide;
    ctx.fillRect(0, 0, 256, 256);
    const core = ctx.createRadialGradient(128, 128, 0, 128, 128, 54);
    core.addColorStop(0, 'rgba(56,67,46,0.22)');
    core.addColorStop(1, 'rgba(56,67,46,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => shadowTex.dispose(), [shadowTex]);

  // A fresh depth: clear, then the cut faces into depth (so what lies behind a
  // wall reads as hidden). Distinct orders keep the clear first.
  const wallsIntoDepth = (order: number) => (
    <>
      <mesh geometry={walls.exercise.geom} material={wallDepth} renderOrder={order} onBeforeRender={clearDepthBefore} frustumCulled={false} />
      <mesh geometry={walls.side.geom} material={wallDepth} rotation={[0, -Math.PI / 2, 0]} renderOrder={order + 0.5} />
    </>
  );

  return (
    <>
      {/* everything in section units, under one display mapping (DISPLAY_K) */}
      <group scale={[S, S * DISPLAY_K, S]}>
        {/* the inside of the shell, in its own shade, seen through the opening */}
        <mesh geometry={terrain.geom} material={terrain.back} renderOrder={ORDER.earthBack} />

        {/* cut faces — the back one, facing the camera, is the exercise plane (z = 0) */}
        <mesh geometry={walls.exercise.geom} material={walls.exercise.mat} renderOrder={ORDER.walls} />
        <mesh geometry={walls.side.geom} material={walls.side.mat} rotation={[0, -Math.PI / 2, 0]} renderOrder={ORDER.walls} />

        {/* geoid, inner side: under everything that lies inside it */}
        {wallsIntoDepth(ORDER.geoidBack)}
        <mesh geometry={geoid.geom} material={geoid.back} renderOrder={ORDER.geoidBack + 1} />

        {!capture && (
          <>
            {wallsIntoDepth(ORDER.ellHidden)}
            <Ellipsoid
              stage="hidden"
              sphere={sphere}
              pose={pose}
              surface={surface}
              interaction={interaction}
              onMovePose={onMovePose}
              onDragging={onDragging}
              controlsRef={controlsRef}
              isVisible={isVisible}
            />
          </>
        )}

        {/* geoid: a whole, wavy blue body — always present, stronger when chosen */}
        {wallsIntoDepth(ORDER.geoid)}
        <mesh geometry={geoid.geom} material={geoid.depth} renderOrder={ORDER.geoid + 1} />
        <mesh geometry={geoid.geom} material={geoid.front} renderOrder={ORDER.geoid + 2} />
        <Line points={GEOID_LINES} segments color={C.geoid} lineWidth={g.width} transparent opacity={g.lines} depthWrite={false} renderOrder={ORDER.geoid + 3} />

        {/* the Earth's near side: covers what lies inside it; the sea lets a little through */}
        {wallsIntoDepth(ORDER.earthFront)}
        <mesh geometry={terrain.geom} material={terrain.front} renderOrder={ORDER.earthFront + 1} />
        {lip.geoms.map((geom, i) => (
          <mesh key={i} geometry={geom} material={lip.mat} renderOrder={ORDER.earthFront + 1.5} />
        ))}

        {!capture && (
          <>
            <Ellipsoid
              stage="seen"
              sphere={sphere}
              pose={pose}
              surface={surface}
              interaction={interaction}
              onMovePose={onMovePose}
              onDragging={onDragging}
              controlsRef={controlsRef}
              isVisible={isVisible}
            />
            <mesh geometry={geoid.geom} material={geoid.depthBehind} renderOrder={ORDER.ellSeen + 3} />
          </>
        )}

        <mesh geometry={glass.geom} material={glass.mat} renderOrder={ORDER.glass} />
      </group>

      {/* soft contact shadow, a little away from the key light */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.22, -1.92, -0.1]} scale={[1.12, 0.92, 1]} renderOrder={0}>
        <planeGeometry args={[5.6, 5.6]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}

const planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

/** The posed ellipsoid, in two stages of the draw order (see ORDER): its own
    far side ("hidden"), and the side the camera sees ("seen" — the handle). */
function Ellipsoid({
  stage,
  sphere,
  pose,
  surface,
  interaction,
  onMovePose,
  onDragging,
  controlsRef,
  isVisible,
}: Omit<SceneProps, 'mode' | 'capture' | 'images'> & { stage: 'hidden' | 'seen'; sphere: THREE.SphereGeometry }) {
  const { center, rotZ, radii } = poseToWorld(pose);
  const look = LOOK.ellipsoid[surface === 'ellipsoid' ? 'on' : 'off'];
  const drag = useRef<{ start: THREE.Vector3; pose: Pose; id: number } | null>(null);
  const [hover, setHover] = useState(false);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  const mats = useMemo(
    () => ({
      back: bodyMaterial({ color: C.ellipsoid, opacity: 0.04, rimStrength: 0, rimAlpha: 0, side: THREE.BackSide, shade: 0.75, rough: 0.4, spec: 0.3 }),
      // its inner side, pushed back a little: the far side's cage passes, the cut faces still hide it
      backDepth: depthMaterial(THREE.BackSide, 4),
      depth: depthMaterial(),
      // the surface holding the cage: a quiet, lit orange skin — kept thin (orange laid over blue turns
      // it grey); its rim and soft highlights carry it — once as seen through the geoid, then in front of it
      through: bodyMaterial({ color: C.ellipsoid, opacity: 0.03, rimStrength: 0.3, rimAlpha: 0.1, rimPower: 2.2, rough: 0.36, spec: 1, specTint: 0.4 }),
      front: bodyMaterial({ color: C.ellipsoid, opacity: 0.08, rimStrength: 0.7, rimAlpha: 0.4, rimPower: 2.2, rough: 0.36, spec: 1, specTint: 0.4 }),
    }),
    [],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  // seen through the geoid, the surface takes what it lets through; the second pass
  // (in front of the geoid) tops the surface and the cage up to their full strength
  const t = through(surface);
  const surfaceThrough = look.opacity * t;
  const surfaceAgain = 1 - (1 - look.opacity) / (1 - surfaceThrough);
  const again = 1 - (1 - look.lines) / (1 - look.behind);
  useEffect(() => {
    setUniforms(mats.front, { uOpacity: surfaceAgain, uRimStrength: look.rimStrength, uRimAlpha: look.rimAlpha });
    setUniforms(mats.through, { uOpacity: surfaceThrough, uRimStrength: look.rimStrength * t, uRimAlpha: look.rimAlpha * t });
    setUniforms(mats.back, { uOpacity: look.back });
    invalidate();
  }, [look, mats, t, surfaceThrough, surfaceAgain, invalidate]);

  useEffect(() => {
    if (stage === 'seen') gl.domElement.style.cursor = drag.current ? 'grabbing' : hover && interaction === 'manual' ? 'grab' : '';
  }, [hover, interaction, gl, stage]);

  /** World hit → section units (undo the scene scale and the display mapping). */
  const hit = (e: ThreeEvent<PointerEvent>) => isVisible([e.point.x / S, e.point.y / (S * DISPLAY_K), e.point.z / S]);

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    // Only a visible part of the body, and only in manual mode, is a handle;
    // everything else falls through to the camera (background drag rotates).
    if (interaction !== 'manual' || e.button !== 0 || !hit(e)) return;
    const p = e.ray.intersectPlane(planeZ0, new THREE.Vector3());
    if (!p) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { start: p, pose, id: e.pointerId };
    if (controlsRef.current) controlsRef.current.enabled = false;
    onDragging(true);
    gl.domElement.style.cursor = 'grabbing';
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d) {
      if (interaction === 'manual') setHover(hit(e));
      return;
    }
    const p = e.ray.intersectPlane(planeZ0, new THREE.Vector3());
    if (!p) return;
    // world → section: x / S, y / (S·K); dx = u, dy = −v
    onMovePose({ ...d.pose, dx: d.pose.dx + (p.x - d.start.x) / S, dy: d.pose.dy - (p.y - d.start.y) / (S * DISPLAY_K) });
  };
  const end = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    (e.target as Element).releasePointerCapture?.(drag.current.id);
    drag.current = null;
    if (controlsRef.current) controlsRef.current.enabled = true;
    onDragging(false);
    gl.domElement.style.cursor = '';
  };

  if (stage === 'hidden') {
    const o = ORDER.ellHidden;
    return (
      <group position={center} rotation={[0, 0, rotZ]} scale={radii}>
        <mesh geometry={sphere} material={mats.back} renderOrder={o + 1} />
        <mesh geometry={sphere} material={mats.backDepth} renderOrder={o + 2} />
        <Line points={CAGE} segments color={C.ellipsoid} lineWidth={1} transparent opacity={look.hidden} depthWrite={false} renderOrder={o + 3} />
      </group>
    );
  }
  const o = ORDER.ellSeen;
  return (
    <group position={center} rotation={[0, 0, rotZ]} scale={radii}>
      <mesh
        geometry={sphere}
        material={mats.depth}
        renderOrder={o}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerOut={() => setHover(false)}
      />
      <Line points={CAGE} segments color={C.ellipsoid} lineWidth={look.width * 0.75} transparent opacity={look.behind} depthWrite={false} renderOrder={o + 1} />
      <mesh geometry={sphere} material={mats.through} renderOrder={o + 2} />
      {/* o + 3: the geoid's front into depth (Globe) */}
      <mesh geometry={sphere} material={mats.front} renderOrder={o + 3.5} />
      <Line points={CAGE} segments color={C.ellipsoid} lineWidth={look.width} transparent opacity={again} depthWrite={false} renderOrder={o + 4} />
    </group>
  );
}

/* ───────────────────────── camera ───────────────────────── */

const camPosition = (az: number, el: number, dist: number): Vec3 => [dist * Math.cos(el) * Math.sin(az), dist * Math.sin(el), dist * Math.cos(el) * Math.cos(az)];

/** Unit directions for bounds: the 26 neighbours of a cube, normalised. */
const BOUND_DIRS: Vec3[] = (() => {
  const out: Vec3[] = [];
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) {
    if (!x && !y && !z) continue;
    const l = Math.hypot(x, y, z);
    out.push([x / l, y / l, z / l]);
  }
  return out;
})();
/** World radius of a sphere around the DISPLAYED Earth (incl. relief and the rise): the display
    mapping makes it nearly round, so the bound is taken in world units, not stretched again. */
const GLOBE_R_WORLD = 1.97;
const MARGIN = { x: 0.92, y: 0.88 } as const;

function CameraRig({ viewNonce, reduce, controlsRef, pose }: { viewNonce: number; reduce: boolean; controlsRef: React.MutableRefObject<OrbitControlsLike | null>; pose: Pose }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const anim = useRef<{ from: THREE.Vector3; t: number } | null>(null);
  const first = useRef(true);
  /** Current framing: zoom and the lens shift in NDC (x right, y up). */
  const frame = useRef<{ z: number; sx: number; sy: number } | null>(null);
  const v = useMemo(() => new THREE.Vector3(), []);
  const saved = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => invalidate(), [pose, size.width, size.height, invalidate]);
  useEffect(() => () => camera.clearViewOffset(), [camera]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const goal = new THREE.Vector3(...camPosition(CAM.az, CAM.el, CAM.dist));
    if (reduce) {
      camera.position.copy(goal);
      controlsRef.current?.target.set(0, 0, 0);
      controlsRef.current?.update();
    } else anim.current = { from: camera.position.clone(), t: 0 };
    invalidate();
  }, [viewNonce, reduce, camera, controlsRef, invalidate]);

  /* Shared framing by bounds. Project the globe and the posed ellipsoid from
     the current viewing direction at the DEFAULT distance (so the learner's
     own dolly is not fought), unzoomed and unshifted; then pick the largest
     zoom ≤ 1 that fits both, and the lens shift nearest the reference's
     composition (globe right of centre) that keeps everything on stage. */
  const target = () => {
    const pts: THREE.Vector3[] = BOUND_DIRS.map((d) => new THREE.Vector3(d[0] * GLOBE_R_WORLD, d[1] * GLOBE_R_WORLD, d[2] * GLOBE_R_WORLD));
    const { center, rotZ, radii } = poseToWorld(pose);
    const c = Math.cos(rotZ);
    const sn = Math.sin(rotZ);
    for (const d of BOUND_DIRS) {
      const lx = d[0] * radii[0];
      const ly = d[1] * radii[1];
      pts.push(toWorld([center[0] + lx * c - ly * sn, center[1] + lx * sn + ly * c, center[2] + d[2] * radii[2]]));
    }
    saved.copy(camera.position);
    const z0 = camera.zoom;
    camera.position.setLength(CAM.dist);
    camera.zoom = 1;
    camera.clearViewOffset();
    camera.updateMatrixWorld();
    let uMin = Infinity, uMax = -Infinity, wMin = Infinity, wMax = -Infinity;
    for (const p of pts) {
      v.copy(p).project(camera);
      uMin = Math.min(uMin, v.x);
      uMax = Math.max(uMax, v.x);
      wMin = Math.min(wMin, v.y);
      wMax = Math.max(wMax, v.y);
    }
    camera.position.copy(saved);
    camera.zoom = z0;
    camera.updateMatrixWorld();
    const z = Math.max(0.45, Math.min(1, (2 * MARGIN.x) / (uMax - uMin), (2 * MARGIN.y) / (wMax - wMin)));
    const pick = (pref: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, pref)));
    // final NDC = z·u + s  ⇒  s ∈ [−M − z·uMin, M − z·uMax]
    const sx = pick(2 * SHIFT.x, -MARGIN.x - z * uMin, MARGIN.x - z * uMax);
    const sy = pick(-2 * SHIFT.y, -MARGIN.y - z * wMin, MARGIN.y - z * wMax);
    return { z, sx, sy };
  };

  const apply = (f: { z: number; sx: number; sy: number }) => {
    camera.zoom = f.z;
    // lens shift in pixels: NDC x = −2·offX/W, NDC y = 2·offY/H
    camera.setViewOffset(size.width, size.height, (-f.sx * size.width) / 2, (f.sy * size.height) / 2, size.width, size.height);
  };

  const sFrom = useMemo(() => new THREE.Spherical(), []);
  const sTo = useMemo(() => new THREE.Spherical(), []);
  useFrame((_, dt) => {
    const t = target();
    const cur = frame.current;
    if (!cur || reduce) {
      frame.current = t;
      apply(t);
    } else {
      const k = 1 - Math.exp(-dt * 6);
      const d = Math.abs(t.z - cur.z) + Math.abs(t.sx - cur.sx) + Math.abs(t.sy - cur.sy);
      if (d > 0.002) {
        cur.z += (t.z - cur.z) * k;
        cur.sx += (t.sx - cur.sx) * k;
        cur.sy += (t.sy - cur.sy) * k;
        invalidate();
      } else Object.assign(cur, t);
      apply(cur);
    }

    const a = anim.current;
    if (!a) return;
    a.t = Math.min(1, a.t + dt / 0.6);
    const e = a.t * a.t * (3 - 2 * a.t);
    sFrom.setFromVector3(a.from);
    sTo.setFromVector3(new THREE.Vector3(...camPosition(CAM.az, CAM.el, CAM.dist)));
    let dTheta = sTo.theta - sFrom.theta;
    if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
    if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
    camera.position.setFromSpherical(new THREE.Spherical(sFrom.radius + (sTo.radius - sFrom.radius) * e, sFrom.phi + (sTo.phi - sFrom.phi) * e, sFrom.theta + dTheta * e));
    controlsRef.current?.target.set(0, 0, 0);
    controlsRef.current?.update();
    if (a.t >= 1) anim.current = null;
    invalidate();
  });
  return null;
}

/* ───────────────────────── overlays ───────────────────────── */

function OverlaySync({
  refs,
  pose,
  inspect,
  capture,
  isVisible,
  cameraOut,
  showMarker,
  surface,
}: {
  surface: Surface;
  refs: OverlayRefs;
  pose: Pose;
  inspect: number;
  capture: boolean;
  isVisible: (p: Vec3) => boolean;
  cameraOut: React.MutableRefObject<THREE.Camera | null>;
  showMarker: boolean;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  cameraOut.current = camera;
  const v = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => invalidate(), [pose, inspect, showMarker, capture, surface, invalidate]);

  const project = (p: Vec3) => {
    v.copy(toWorld(p)).project(camera);
    return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height, front: v.z < 1 };
  };

  useFrame(() => {
    const stage = refs.stage.current;
    if (!stage) return;
    const sr = stage.getBoundingClientRect();
    const camPos = camera.position;

    const surfaceAnchor = bodyPoint(terrainR(0.72, 2.62), 0.72, 2.62); // Europe, upper left
    // the geoid's own section line on the exercise wall, right of centre
    const geoidAnchor = (() => {
      const g = geoidAt(0.35);
      const { u, v: vv } = svgToPlane(g.x, g.y);
      return planeToWorld(u, vv);
    })();
    // a point on the ellipsoid's surface toward the open quarter (front right)
    const ellAnchor = (() => {
      const { center, rotZ, radii } = poseToWorld(pose);
      const dir = new THREE.Vector3(Math.cos(0.3) * Math.cos(0.62), Math.sin(0.3), Math.cos(0.3) * Math.sin(0.62));
      const c = Math.cos(rotZ);
      const s = Math.sin(rotZ);
      const lx = dir.x * c + dir.y * s;
      const ly = -dir.x * s + dir.y * c;
      const q = Math.hypot(lx / radii[0], ly / radii[1], dir.z / radii[2]);
      return [center[0] + dir.x / q, center[1] + dir.y / q, center[2] + dir.z / q] as Vec3;
    })();

    const anchors: Record<ChipId, Vec3> = { surface: surfaceAnchor, geoid: geoidAnchor, ellipsoid: ellAnchor };
    (Object.keys(anchors) as ChipId[]).forEach((id) => {
      const chip = refs.chips[id].current;
      const line = refs.leaders[id].current;
      const dot = refs.dots[id].current;
      if (!chip || !line || !dot) return;
      const a = anchors[id];
      const pr = project(a);
      // a point on the wall is tested just in front of it (the wall itself is not an occluder)
      const seen = id === 'geoid' ? camPos.z > 0.05 && isVisible([a[0], a[1], a[2] + 0.5]) : isVisible(a);
      const visible = !capture && pr.front && seen && pr.x > 0 && pr.x < size.width && pr.y > 0 && pr.y < size.height;
      const cr = chip.getBoundingClientRect();
      const cx0 = cr.left - sr.left;
      const cy0 = cr.top - sr.top;
      const ex = pr.x > cx0 + cr.width ? cx0 + cr.width : pr.x < cx0 ? cx0 : cx0 + cr.width / 2;
      const ey = pr.x > cx0 + cr.width || pr.x < cx0 ? cy0 + cr.height / 2 : pr.y > cy0 ? cy0 + cr.height : cy0;
      line.setAttribute('x1', ex.toFixed(1));
      line.setAttribute('y1', ey.toFixed(1));
      line.setAttribute('x2', pr.x.toFixed(1));
      line.setAttribute('y2', pr.y.toFixed(1));
      dot.setAttribute('cx', pr.x.toFixed(1));
      dot.setAttribute('cy', pr.y.toFixed(1));
      const o = visible ? '1' : '0';
      line.style.opacity = o;
      dot.style.opacity = o;
      chip.style.opacity = visible ? (surface === id ? '1' : '0.72') : '0';
      chip.dataset.hidden = visible ? 'false' : 'true';
    });

    // inspection marker + the close-up's two tangent leaders
    const marker = refs.marker.current;
    const [l1, l2] = refs.insetLeaders.map((r) => r.current);
    if (marker && l1 && l2) {
      const g = geoidAt(inspect);
      const { u, v: vv } = svgToPlane(g.x, g.y);
      const p3 = planeToWorld(u, vv);
      const pr = project(p3);
      const visible = showMarker && !capture && pr.front && camPos.z > 0.05 && isVisible([p3[0], p3[1], p3[2] + 0.5]);
      marker.style.transform = `translate(${(pr.x - MARKER_R).toFixed(1)}px, ${(pr.y - MARKER_R).toFixed(1)}px)`;
      marker.style.opacity = visible ? '1' : '0';
      marker.style.pointerEvents = visible ? 'auto' : 'none';
      const R1 = INSET.size / 2;
      const c1 = { x: INSET.left + R1, y: size.height - INSET.bottom - R1 };
      const dx = pr.x - c1.x;
      const dy = pr.y - c1.y;
      const d = Math.hypot(dx, dy);
      const ok = visible && d > R1 + MARKER_R + 4;
      if (ok) {
        const th = Math.atan2(dy, dx);
        const al = Math.acos((R1 - MARKER_R) / d);
        [l1, l2].forEach((l, i) => {
          const ang = th + (i ? -al : al);
          l.setAttribute('x1', (c1.x + R1 * Math.cos(ang)).toFixed(1));
          l.setAttribute('y1', (c1.y + R1 * Math.sin(ang)).toFixed(1));
          l.setAttribute('x2', (pr.x + MARKER_R * Math.cos(ang)).toFixed(1));
          l.setAttribute('y2', (pr.y + MARKER_R * Math.sin(ang)).toFixed(1));
        });
      }
      l1.style.opacity = ok ? '1' : '0';
      l2.style.opacity = ok ? '1' : '0';
    }
  });
  return null;
}

/* ───────────────────────── wrapper ───────────────────────── */

export type DatumGlobeProps = {
  pose: Pose;
  mode: DatumMode;
  surface: Surface;
  interaction: Interaction;
  inspect: number;
  active: boolean;
  reduce: boolean;
  viewNonce: number;
  zoomEnabled: boolean;
  capture: boolean;
  showMarker: boolean;
  refs: OverlayRefs;
  onMovePose: (p: Pose) => void;
  onInspect: (t: number) => void;
  onReady: () => void;
  onFail: () => void;
  onCameraMoved: () => void;
};

class GlobeBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function DatumGlobe3D(props: DatumGlobeProps) {
  const { pose, mode, surface, interaction, inspect, active, reduce, viewNonce, zoomEnabled, capture, showMarker, refs, onMovePose, onInspect, onReady, onFail, onCameraMoved } = props;
  const controlsRef = useRef<OrbitControlsLike | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const [dragging, setDragging] = useState(false);
  const readyRef = useRef(false);

  // the surface textures (cached for the page); the canvas mounts once they are in
  const [images, setImages] = useState<EarthImages | null>(null);
  useEffect(() => {
    let live = true;
    loadEarth().then(
      (img) => live && setImages(img),
      () => live && onFail(),
    );
    return () => {
      live = false;
    };
  }, [onFail]);

  /** Is a section-unit point seen from the camera? Hidden inside the solid
      globe (outside the cutaway) or behind it. The display mapping is
      linear, so the test runs in section units on the mapped-back camera. */
  const isVisible = useCallback((p: Vec3) => {
    const cam = cameraRef.current;
    if (!cam) return true;
    const cx = cam.position.x / S;
    const cy = cam.position.y / (S * DISPLAY_K);
    const cz = cam.position.z / S;
    const N = 40;
    for (let i = 1; i < N; i++) {
      const k = i / N;
      if (k > 0.985) break;
      const x = cx + (p[0] - cx) * k;
      const y = cy + (p[1] - cy) * k;
      const z = cz + (p[2] - cz) * k;
      if (inCutaway(x, z)) continue;
      const q = toParam(x, y, z);
      if (q.w < terrainR(q.beta, q.lam) - 0.004) return false;
    }
    return true;
  }, []);

  // marker drag + keyboard live in the DOM overlay; the 3-D ray comes from the camera
  useEffect(() => {
    const marker = refs.marker.current;
    const stage = refs.stage.current;
    if (!marker || !stage) return;
    let dragId: number | null = null;
    const ray = new THREE.Raycaster();
    const tFromEvent = (ev: PointerEvent) => {
      const cam = cameraRef.current;
      if (!cam) return null;
      const r = stage.getBoundingClientRect();
      const ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -(((ev.clientY - r.top) / r.height) * 2 - 1));
      ray.setFromCamera(ndc, cam);
      const hit = ray.ray.intersectPlane(planeZ0, new THREE.Vector3());
      if (!hit) return null;
      return angleOf(GC.x + hit.x / S, GC.y - hit.y / (S * DISPLAY_K));
    };
    const down = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      dragId = ev.pointerId;
      marker.setPointerCapture(ev.pointerId);
      marker.focus();
    };
    const move = (ev: PointerEvent) => {
      if (dragId !== ev.pointerId) return;
      const t = tFromEvent(ev);
      if (t !== null) onInspect(t);
    };
    const up = (ev: PointerEvent) => {
      if (dragId !== ev.pointerId) return;
      dragId = null;
      marker.releasePointerCapture?.(ev.pointerId);
    };
    marker.addEventListener('pointerdown', down);
    marker.addEventListener('pointermove', move);
    marker.addEventListener('pointerup', up);
    marker.addEventListener('pointercancel', up);
    return () => {
      marker.removeEventListener('pointerdown', down);
      marker.removeEventListener('pointermove', move);
      marker.removeEventListener('pointerup', up);
      marker.removeEventListener('pointercancel', up);
    };
  }, [refs, onInspect]);

  if (!images) return null;
  return (
    <GlobeBoundary onFail={onFail}>
      <Canvas
        flat
        dpr={[1, 2]}
        camera={{ position: camPosition(CAM.az, CAM.el, CAM.dist), fov: FOV, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: capture }}
        frameloop={active ? 'demand' : 'never'}
        style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            onFail();
          });
        }}
      >
        <Globe
          images={images}
          pose={pose}
          mode={mode}
          surface={surface}
          interaction={interaction}
          capture={capture}
          onMovePose={onMovePose}
          onDragging={setDragging}
          controlsRef={controlsRef}
          isVisible={isVisible}
        />

        <OrbitControls
          ref={controlsRef as never}
          target={[0, 0, 0]}
          enablePan={false}
          enableZoom={zoomEnabled}
          zoomSpeed={0.7}
          rotateSpeed={0.7}
          minDistance={CAM.dist * 0.82}
          maxDistance={CAM.dist * 1.35}
          minPolarAngle={Math.PI / 2 - 0.75}
          maxPolarAngle={Math.PI / 2 + 0.55}
          enableDamping
          dampingFactor={0.1}
          onStart={onCameraMoved}
        />
        <CameraRig viewNonce={viewNonce} reduce={reduce} controlsRef={controlsRef} pose={pose} />
        <InsetPass pose={pose} inspect={inspect} mode={mode} surface={surface} enabled={!capture} />
        <OverlaySync surface={surface} refs={refs} pose={pose} inspect={inspect} capture={capture} isVisible={isVisible} cameraOut={cameraRef} showMarker={showMarker} />
        <FirstFrame
          onFrame={() => {
            if (readyRef.current) return;
            readyRef.current = true;
            onReady();
          }}
        />
      </Canvas>
    </GlobeBoundary>
  );
}

function FirstFrame({ onFrame }: { onFrame: () => void }) {
  const n = useRef(0);
  useFrame(() => {
    n.current++;
    if (n.current === 1) onFrame();
  });
  return null;
}
