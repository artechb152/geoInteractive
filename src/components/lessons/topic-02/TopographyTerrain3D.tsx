'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Bvh, Html, Line, OrbitControls, useGLTF, useProgress, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TOPO } from './topographyTerrain.data';
import {
  COLLAR,
  SHEET,
  STACK_GAP,
  VIEWBOX,
  WORLD,
  goalFor,
  heightToY,
  radiusFor,
  sheetToWorld,
  type CameraGoal,
  type Mode,
} from './topographyLayout';
import { TopographyMapSheet } from './TopographyMapSheet';
import { MAP } from './topographyTerrainStyle';

/**
 * The topography scene's viewer: ONE generated terrain
 * (scripts/blender/build_topography_terrain.py) shown three ways, with the
 * camera and the map sheet morphing between them instead of swapping images.
 *
 *   3d     the diorama from the south-south-east; drag to orbit, wheel to zoom.
 *   photo  the camera rises to straight down while its field of view narrows
 *          (a dolly-zoom), ending near-orthographic: the same ground becomes an
 *          aerial photograph, and the relief visibly "flattens".
 *   topo   same camera; the SVG map sheet (TopographyMapSheet) fades in over
 *          the very ground it describes — its contours, roads and buildings
 *          settle onto what was just visible.
 *   stacked ("all together") the diorama lifts off a thin slab carrying the
 *          map (the sheet's own SVG, rasterized). Dashed guides drop from the
 *          summit and both building groups to the map; hovering either layer
 *          marks the same spot, its elevation and its contour on both.
 *          It is the fourth tab in TopographyScene; choosing a layer opens that view.
 *
 * Registration: sheetRect() (topographyLayout) is the only place that decides
 * where the neatline sits in the container; the top-down camera goal and the
 * SVG's viewBox both derive from it.
 *
 * Nothing loads until the viewer nears the viewport; frames render on demand.
 * Rendered client-only via next/dynamic from TopographyScene.
 */

export type TopoView = '3d' | 'photo' | 'topo';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const ASSETS = `${BASE}/assets/lessons/topic02/topography-terrain`;
const MODEL_URL = `${ASSETS}/terrain.glb`;
const ALBEDO_URL = `${ASSETS}/albedo.jpg`;
const DRACO_PATH = `${BASE}/draco/`;

const ACCENT = MAP.accent;
const INK = MAP.ink;
const SLAB_EDGE = '#E8DCC4';
const SLAB_H = 0.035;
/** Plinth bottom below the diorama's y = 0 (build_topography_terrain.py BASE_DEPTH_U). */
const PLINTH_DEPTH = 0.12;
/** How close a zoomed-in camera may come to the ground above it. */
const CAM_CLEARANCE = 0.08;
const TEX_W = 2048;
const TEX_H = 1536;
/** Diorama y-scale that undoes the ×2 vertical exaggeration: the ground at its true relief. */
const TRUE_RELIEF = 1 / WORLD.ve;

/** "All together" compares the model with the map — the two ends of the abstraction. */
const LAYERS: { view: TopoView; label: string; y: number }[] = [
  { view: '3d', label: 'מודל תלת־ממדי', y: STACK_GAP },
  { view: 'topo', label: 'מפה טופוגרפית', y: 0 },
];

// ---------------------------------------------------------------- map features
// The named things on the sheet. Pointing at one — on either layer of the
// stack, or at its name in the legend row — outlines it on both layers.

export type FeatureId = 'woodland' | 'sparse' | 'orchard' | 'buildings' | 'road' | 'path';
export const FEATURES: { id: FeatureId; label: string }[] = [
  { id: 'woodland', label: 'חורש' },
  { id: 'sparse', label: 'חורש דליל' },
  { id: 'orchard', label: 'מטע' },
  { id: 'buildings', label: 'מבנים' },
  { id: 'road', label: 'דרך עפר' },
  { id: 'path', label: 'שביל רגלי' },
];
const FEATURE_LABEL = Object.fromEntries(FEATURES.map((f) => [f.id, f.label])) as Record<FeatureId, string>;

type Pt = readonly [number, number];
/** Hit tolerance around roads, paths and buildings (sheet units, 1 = 14 m). */
const ROAD_HIT = 1.6;
const PATH_HIT = 1.2;
const BUILDING_PAD = 0.5;
/** Spacing of the points a highlight is draped with (sheet units). */
const DRAPE_STEP = 0.6;

function buildingRing(b: (typeof TOPO.buildings)[number], pad: number): Pt[] {
  const a = THREE.MathUtils.degToRad(b.angle);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const hw = b.w / 2 + pad;
  const hh = b.h / 2 + pad;
  // SVG rotate(): clockwise on the map (y points south).
  return ([[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]] as const).map(([dx, dy]) => [b.x + dx * c - dy * s, b.y + dx * s + dy * c]);
}

function inPolygon(x: number, y: number, ring: readonly Pt[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToLine(x: number, y: number, pts: readonly Pt[]) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const dx = bx - ax;
    const dy = by - ay;
    const t = THREE.MathUtils.clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return best;
}

/** The feature under a sheet point — the smallest target wins. */
function featureAt(x: number, y: number): FeatureId | null {
  if (TOPO.buildings.some((b) => inPolygon(x, y, buildingRing(b, BUILDING_PAD)))) return 'buildings';
  if (distToLine(x, y, TOPO.path) < PATH_HIT) return 'path';
  if (distToLine(x, y, TOPO.road) < ROAD_HIT) return 'road';
  for (const v of TOPO.vegetation) if (inPolygon(x, y, v.ring)) return v.kind;
  return null;
}

/** The feature's outlines on the sheet: closed rings (areas) and open lines. */
function featureShapes(id: FeatureId): { rings: Pt[][]; lines: Pt[][] } {
  if (id === 'road') return { rings: [], lines: [[...TOPO.road]] };
  if (id === 'path') return { rings: [], lines: [[...TOPO.path]] };
  if (id === 'buildings') return { rings: TOPO.buildings.map((b) => buildingRing(b, 0.25)), lines: [] };
  return { rings: TOPO.vegetation.filter((v) => v.kind === id).map((v) => [...v.ring]), lines: [] };
}

/** Evenly spaced points along a polyline, kept inside the neatline. */
function densify(pts: readonly Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / DRAPE_STEP));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out.filter(([x, y]) => x >= 0 && x <= SHEET.w && y >= 0 && y <= SHEET.h);
}

type Size = { w: number; h: number };
// OrbitControls instance, typed loosely (only enabled/target/update/events are used).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ControlsRef = React.MutableRefObject<any>;

// ---------------------------------------------------------------- camera

function CameraRig({
  mode,
  size,
  reduce,
  controlsRef,
  onNearTop,
}: {
  mode: Mode;
  size: Size;
  reduce: boolean;
  controlsRef: ControlsRef;
  onNearTop: (near: boolean) => void;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  const cur = useRef<CameraGoal | null>(null);
  const animating = useRef(true);
  const nearTop = useRef<boolean | null>(null);
  const sph = useMemo(() => new THREE.Spherical(), []);
  const off = useMemo(() => new THREE.Vector3(), []);
  const probe = useMemo(() => new THREE.Vector3(), []);

  // A new goal: resume from wherever the camera actually is (the learner may
  // have orbited), then glide.
  useEffect(() => {
    const c = cur.current;
    const controls = controlsRef.current;
    if (c && controls) {
      off.copy(camera.position).sub(controls.target);
      sph.setFromVector3(off);
      c.phi = sph.phi;
      c.theta = sph.theta;
      c.fov = camera.fov;
      c.frameHalf = sph.radius * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      c.target = [controls.target.x, controls.target.y, controls.target.z];
    }
    // OrbitControls clamps the distance on every update(): release the limits
    // while the rig travels (a top view sits ~5× farther than the 3D view).
    if (controls) {
      controls.minDistance = 0;
      controls.maxDistance = Infinity;
    }
    animating.current = true;
    invalidate();
  }, [mode, size.w, size.h, camera, controlsRef, invalidate, off, sph]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const stop = () => {
      animating.current = false;
    };
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [controlsRef]);

  // Dev-only registration probe for scripts/qa/shot-topography.mjs:
  // sheet point + height → container px.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __topoProbe?: (x: number, y: number, h: number) => [number, number] };
    w.__topoProbe = (x, y, h) => {
      const [wx, wz] = sheetToWorld(x, y);
      probe.set(wx, heightToY(h), wz).project(camera);
      return [((probe.x + 1) / 2) * size.w, ((1 - probe.y) / 2) * size.h];
    };
    return () => {
      delete w.__topoProbe;
    };
  }, [camera, probe, size.w, size.h]);

  useFrame((_, dt) => {
    const controls = controlsRef.current;
    if (!controls || size.w === 0) return;
    const goal = goalFor(mode, size.w, size.h, TOPO.groundY);
    if (!cur.current) cur.current = { ...goal, target: [...goal.target] as [number, number, number] };
    if (!animating.current) return;
    const c = cur.current;
    const k = reduce ? 1 : 1 - Math.exp(-4.2 * Math.min(dt, 0.1));
    let dTheta = goal.theta - c.theta;
    dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
    c.phi += (goal.phi - c.phi) * k;
    c.theta += dTheta * k;
    c.fov += (goal.fov - c.fov) * k;
    c.frameHalf += (goal.frameHalf - c.frameHalf) * k;
    for (let i = 0; i < 3; i++) c.target[i] += (goal.target[i] - c.target[i]) * k;

    camera.fov = c.fov;
    // Small enough for the closest zoom (minDistance below) to skim the ground.
    camera.near = Math.max(0.02, radiusFor(c) * 0.004);
    camera.far = radiusFor(c) * 3 + 10;
    camera.updateProjectionMatrix();
    sph.set(radiusFor(c), Math.max(1e-4, c.phi), c.theta);
    off.setFromSpherical(sph);
    controls.target.set(c.target[0], c.target[1], c.target[2]);
    camera.position.copy(controls.target).add(off);
    camera.lookAt(controls.target);
    controls.update();

    // "Near the top" a few degrees early: the map starts fading in while the
    // camera finishes its rise, so 3D → map stays one continuous move.
    const near = c.phi < 0.12 && c.fov < 12;
    if (near !== nearTop.current) {
      nearTop.current = near;
      onNearTop(near);
    }
    const settled =
      Math.abs(goal.phi - c.phi) < 1e-4 &&
      Math.abs(dTheta) < 1e-4 &&
      Math.abs(goal.fov - c.fov) < 1e-3 &&
      Math.abs(goal.frameHalf - c.frameHalf) < 1e-4 &&
      c.target.every((v, i) => Math.abs(goal.target[i] - v) < 1e-4);
    if (settled) {
      animating.current = false;
      // Zoom limits around the settled framing (only orbit modes zoom at all).
      controls.minDistance = radiusFor(c) * 0.15;
      controls.maxDistance = radiusFor(c) * 1.6;
    }
    invalidate();
  });

  return null;
}

// ---------------------------------------------------------------- terrain

type Diorama = {
  materials: THREE.Material[];
  terrain: THREE.Mesh;
  /** Plinth, trees and buildings. They don't take part in raycasting, so a
      hover falls through them onto the ground below. */
  rest: THREE.Object3D[];
  walls: THREE.Object3D | undefined;
  /** Ground height (world y, before any lift) at a world x/z, read from the terrain mesh's own vertex grid. */
  heightAt: (x: number, z: number) => number;
};

function useDiorama(): Diorama {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH);
  const albedo = useTexture(ALBEDO_URL);
  const gl = useThree((s) => s.gl);
  const diorama = useMemo(() => {
    albedo.flipY = false; // glTF UV v = 0 is the north edge = the image's first row
    albedo.colorSpace = THREE.SRGBColorSpace;
    albedo.anisotropy = gl.capabilities.getMaxAnisotropy();
    albedo.needsUpdate = true;
    const ground = new THREE.MeshStandardMaterial({ map: albedo, roughness: 0.96, metalness: 0 });
    const painted = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
    const root = scene.clone(true);
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.material = (o.material as THREE.Material).name === 'Terrain' ? ground : painted;
      o.castShadow = true;
      o.receiveShadow = true;
    });
    const terrain = root.getObjectByName('Terrain') as THREE.Mesh;
    const rest = root.children.filter((c) => c !== terrain);
    for (const o of rest) o.traverse((m) => ((m as THREE.Mesh).raycast = () => {}));

    // The terrain is a regular grid (build_topography_terrain.py); Draco may
    // reorder its vertices, so rebuild the grid from their positions.
    const pos = terrain.geometry.getAttribute('position');
    const nx1 = Math.round(Math.sqrt((pos.count * WORLD.w) / WORLD.h));
    const ny1 = Math.round(pos.count / nx1);
    const cx = WORLD.w / (nx1 - 1);
    const cz = WORLD.h / (ny1 - 1);
    const grid = new Float32Array(nx1 * ny1);
    for (let k = 0; k < pos.count; k++) {
      const i = Math.round((pos.getX(k) + WORLD.w / 2) / cx);
      const j = Math.round((pos.getZ(k) + WORLD.h / 2) / cz);
      if (i >= 0 && i < nx1 && j >= 0 && j < ny1) grid[j * nx1 + i] = pos.getY(k);
    }
    const heightAt = (x: number, z: number) => {
      const fi = THREE.MathUtils.clamp((x + WORLD.w / 2) / cx, 0, nx1 - 1.0001);
      const fj = THREE.MathUtils.clamp((z + WORLD.h / 2) / cz, 0, ny1 - 1.0001);
      const i = Math.floor(fi);
      const j = Math.floor(fj);
      const u = fi - i;
      const v = fj - j;
      const at = (a: number, b: number) => grid[b * nx1 + a];
      return (1 - u) * (1 - v) * at(i, j) + u * (1 - v) * at(i + 1, j) + (1 - u) * v * at(i, j + 1) + u * v * at(i + 1, j + 1);
    };
    return { terrain, rest, walls: root.getObjectByName('Walls'), heightAt, materials: [ground, painted] };
  }, [scene, albedo, gl]);
  // The clone shares useGLTF's cached geometry (never disposed here); only the
  // materials made above are ours to free.
  useEffect(() => () => diorama.materials.forEach((m) => m.dispose()), [diorama]);
  return diorama;
}

/** The map sheet's own SVG (no text), rasterized — the map slab's texture. */
function useMapTexture(svg: SVGSVGElement | null) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    if (!svg) return;
    let cancelled = false;
    const W = Math.round((TEX_W * VIEWBOX.w) / SHEET.w);
    const H = Math.round((W * VIEWBOX.h) / VIEWBOX.w);
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(W));
    clone.setAttribute('height', String(H));
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
    const img = new Image();
    // Revoke only once the image has settled — revoking in the cleanup would
    // abort a load still in flight (React re-runs effects in development).
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = TEX_W;
      canvas.height = TEX_H;
      const sx = (COLLAR / VIEWBOX.w) * W;
      const sy = (COLLAR / VIEWBOX.h) * H;
      canvas.getContext('2d')!.drawImage(img, sx, sy, (SHEET.w / VIEWBOX.w) * W, (SHEET.h / VIEWBOX.h) * H, 0, 0, TEX_W, TEX_H);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = gl.capabilities.getMaxAnisotropy();
      setTexture(tex);
      invalidate();
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [svg, gl, invalidate]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function Outline({ y, active }: { y: number; active: boolean }) {
  const hw = WORLD.w / 2 + 0.01;
  const hh = WORLD.h / 2 + 0.01;
  const pts = useMemo(
    () =>
      [
        [-hw, y, -hh],
        [hw, y, -hh],
        [hw, y, hh],
        [-hw, y, hh],
        [-hw, y, -hh],
      ] as [number, number, number][],
    [hw, hh, y],
  );
  return <Line points={pts} color={active ? ACCENT : INK} lineWidth={active ? 2.6 : 1} transparent opacity={active ? 1 : 0.25} />;
}

/** Top face of the map slab (world y). */
const MAP_TOP = SLAB_H / 2;

/**
 * One feature outlined on both layers of the stack: tinted and outlined on the
 * map, and outlined along the ground of the model (draped point by point, so
 * the mountain hides whatever lies behind it, as with the contour lines).
 */
function FeatureHighlight({ id, heightAt }: { id: FeatureId; heightAt: Diorama['heightAt'] }) {
  const invalidate = useThree((s) => s.invalidate);
  const { lines, fills } = useMemo(() => {
    const { rings, lines: open } = featureShapes(id);
    const onMap = (pts: Pt[]) =>
      pts.map(([sx, sy]) => {
        const [wx, wz] = sheetToWorld(sx, sy);
        return [wx, MAP_TOP + 0.005, wz] as [number, number, number];
      });
    const onModel = (pts: Pt[]) =>
      pts.map(([sx, sy]) => {
        const [wx, wz] = sheetToWorld(sx, sy);
        return [wx, STACK_GAP + heightAt(wx, wz) + 0.012, wz] as [number, number, number];
      });
    const paths = [...rings.map((r) => densify([...r, r[0]])), ...open.map((l) => densify(l))];
    const fills = rings.map((r) => {
      // ShapeGeometry lies in x/y; laid flat by rotating −90° about x, so y ↦ −z.
      const shape = new THREE.Shape(
        r.map(([sx, sy]) => {
          const [wx, wz] = sheetToWorld(sx, sy);
          return new THREE.Vector2(wx, -wz);
        }),
      );
      return new THREE.ShapeGeometry(shape);
    });
    return { lines: paths.flatMap((p) => [onMap(p), onModel(p)]), fills };
  }, [id, heightAt]);
  useEffect(() => {
    invalidate();
    return () => fills.forEach((g) => g.dispose());
  }, [fills, invalidate]);

  return (
    <group>
      {fills.map((g, i) => (
        <mesh key={i} geometry={g} rotation={[-Math.PI / 2, 0, 0]} position={[0, MAP_TOP + 0.003, 0]}>
          <meshBasicMaterial color={ACCENT} transparent opacity={0.22} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {lines.map((pts, i) => (
        <Line key={i} points={pts} color={ACCENT} lineWidth={3} />
      ))}
    </group>
  );
}

function Scene({
  view,
  stacked,
  topDown,
  reduce,
  mapSvg,
  labelPortal,
  controlsRef,
  onSelectView,
  feature,
  onFeature,
}: {
  view: TopoView;
  stacked: boolean;
  /** The camera has (nearly) reached straight-down in the photo / map view. */
  topDown: boolean;
  reduce: boolean;
  mapSvg: SVGSVGElement | null;
  labelPortal: React.MutableRefObject<HTMLElement>;
  controlsRef: ControlsRef;
  onSelectView: (v: TopoView) => void;
  /** The highlighted map feature (pointed at on a layer or in the legend row). */
  feature: FeatureId | null;
  onFeature: (f: FeatureId | null) => void;
}) {
  const { terrain, rest, walls, heightAt } = useDiorama();
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const dioramaGroup = useRef<THREE.Group>(null);
  const lift = useRef({ top: 0, relief: 1 });
  const [showStack, setShowStack] = useState(false);
  // BVH-accelerated raycasting on the ~470k-triangle terrain, built the first
  // time the stack opens (the only view with hover), not on page load.
  const [bvhOn, setBvhOn] = useState(false);

  // From straight above the plinth walls would show as slivers at the sheet's
  // edges; a photo and a map have no walls.
  useEffect(() => {
    if (walls) walls.visible = !topDown;
    invalidate();
  }, [walls, topDown, invalidate]);

  const mapTex = useMapTexture(mapSvg);
  const slabSide = useMemo(() => new THREE.MeshStandardMaterial({ color: SLAB_EDGE, roughness: 0.95 }), []);
  const mapTop = useMemo(
    () => new THREE.MeshBasicMaterial({ map: mapTex, color: mapTex ? '#FFFFFF' : MAP.paper, toneMapped: false }),
    [mapTex],
  );
  useEffect(() => () => slabSide.dispose(), [slabSide]);
  useEffect(() => () => mapTop.dispose(), [mapTop]);
  // BoxGeometry face order: +x, −x, +y (top), −y, +z, −z.
  const mapMats = useMemo(() => [slabSide, slabSide, mapTop, slabSide, slabSide, slabSide], [slabSide, mapTop]);

  useFrame((_, dt) => {
    const L = lift.current;
    const k = reduce ? 1 : 1 - Math.exp(-4.5 * Math.min(dt, 0.1));
    const kSlow = reduce ? 1 : 1 - Math.exp(-3.4 * Math.min(dt, 0.1));
    const goalTop = stacked ? STACK_GAP : 0;
    // The model keeps its ×2 vertical exaggeration; the photo and the map show
    // the ground as it is, so the relief settles to true height as the camera
    // rises — the "flattened" look the photo is criticised for.
    const goalRelief = !stacked && view !== '3d' ? TRUE_RELIEF : 1;
    L.top += (goalTop - L.top) * k;
    L.relief += (goalRelief - L.relief) * kSlow;
    if (dioramaGroup.current) {
      dioramaGroup.current.position.y = L.top;
      dioramaGroup.current.scale.y = L.relief;
    }
    const moving = Math.abs(goalTop - L.top) > 1e-4 || Math.abs(goalRelief - L.relief) > 1e-4;
    if (moving) invalidate();
    else if (!stacked && showStack) setShowStack(false);

    // Zoomed in close, a low orbit would swing the camera into the hill: keep
    // it above the ground. (Runs after OrbitControls' own update this frame;
    // below the plinth — the stack seen from underneath — it is left alone.)
    const p = camera.position;
    if (Math.abs(p.x) < WORLD.w / 2 && Math.abs(p.z) < WORLD.h / 2 && p.y > L.top - PLINTH_DEPTH) {
      const floor = L.top + heightAt(p.x, p.z) * L.relief + CAM_CLEARANCE;
      if (p.y < floor) {
        p.y = floor;
        if (controlsRef.current) camera.lookAt(controlsRef.current.target);
      }
    }
  });

  // ---- hover probe: point anywhere on the map or the model, see the same spot on both.
  const probe = useRef<THREE.Group>(null);
  const stem = useRef<THREE.Group>(null);
  const dots = useRef<(THREE.Mesh | null)[]>([]);
  const chipAnchor = useRef<THREE.Group>(null);
  const chip = useRef<HTMLSpanElement>(null);
  const levelRef = useRef<number | null>(null);
  const [level, setLevel] = useState<number | null>(null);

  const pointedRef = useRef<FeatureId | null>(null);

  const setPointed = (f: FeatureId | null) => {
    if (f === pointedRef.current) return;
    pointedRef.current = f;
    onFeature(f);
  };

  const hideProbe = () => {
    if (probe.current) probe.current.visible = false;
    if (chip.current) chip.current.style.opacity = '0';
    if (levelRef.current !== null) {
      levelRef.current = null;
      setLevel(null);
    }
    setPointed(null);
    invalidate();
  };

  useEffect(() => {
    if (stacked) {
      setShowStack(true);
      setBvhOn(true);
    } else hideProbe();
    invalidate();
    // hideProbe only touches refs/state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stacked, invalidate]);

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!stacked) return;
    e.stopPropagation();
    const x = THREE.MathUtils.clamp(e.point.x, -WORLD.w / 2, WORLD.w / 2);
    const z = THREE.MathUtils.clamp(e.point.z, -WORLD.h / 2, WORLD.h / 2);
    const ground = heightAt(x, z);
    const top = STACK_GAP + ground;
    [MAP_TOP, top].forEach((y, i) => dots.current[i]?.position.set(x, y + 0.008, z));
    if (stem.current) {
      stem.current.position.set(x, MAP_TOP, z);
      stem.current.scale.y = top - MAP_TOP;
    }
    chipAnchor.current?.position.set(x, top + 0.07, z);
    const metres = Math.round((ground * WORLD.mPerUnit) / WORLD.ve + WORLD.datumM);
    // Over a named feature the chip names it and the feature is outlined on
    // both layers; over bare ground it reads the height and its contour.
    const f = featureAt((x / WORLD.w + 0.5) * SHEET.w, (z / WORLD.h + 0.5) * SHEET.h);
    setPointed(f);
    if (chip.current) {
      chip.current.textContent = f ? FEATURE_LABEL[f] : `${metres} מ׳`;
      chip.current.style.opacity = '1';
    }
    const nearest = Math.round(metres / 10) * 10;
    const lv = !f && TOPO.contours.some((c) => c.heightM === nearest) ? nearest : null;
    if (lv !== levelRef.current) {
      levelRef.current = lv;
      setLevel(lv);
    }
    if (probe.current) probe.current.visible = true;
    invalidate();
  };

  // The contour through the hovered spot on both layers — draped on the
  // mountain itself, where the terrain hides the stretches behind it.
  const levelLines = useMemo(() => {
    if (level === null) return [];
    const rings = TOPO.contours.find((c) => c.heightM === level)?.rings ?? [];
    const ys = [MAP_TOP + 0.004, STACK_GAP + heightToY(level) + 0.004];
    return ys.flatMap((y, layer) =>
      rings.map((r, k) => ({
        key: `${layer}-${k}`,
        points: [...r, r[0]].map(([sx, sy]) => {
          const [wx, wz] = sheetToWorld(sx, sy);
          return [wx, y, wz] as [number, number, number];
        }),
      })),
    );
  }, [level]);

  const pick = (v: TopoView) => (e: ThreeEvent<MouseEvent>) => {
    if (!stacked || e.delta > 4) return;
    e.stopPropagation();
    onSelectView(v);
  };
  const layerEvents = (v: TopoView) => ({
    onClick: pick(v),
    onPointerMove: onMove,
    onPointerOver: () => {
      if (stacked) gl.domElement.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      gl.domElement.style.cursor = '';
      hideProbe();
    },
  });

  const guides = useMemo(
    () =>
      TOPO.guides.map((g) => {
        const [x, z] = sheetToWorld(g.x, g.y);
        return { x, z, top: STACK_GAP + heightToY(g.heightM) + 0.03 };
      }),
    [],
  );

  return (
    <>
      <group ref={dioramaGroup} {...layerEvents('3d')}>
        <Bvh firstHitOnly enabled={bvhOn}>
          <primitive object={terrain} dispose={null} />
        </Bvh>
        {rest.map((o) => (
          <primitive key={o.uuid} object={o} dispose={null} />
        ))}
      </group>

      {/* The map slab. At rest it sits hidden inside the diorama's plinth, so
          when the model lifts off it the map is what it leaves behind. */}
      <group visible={showStack}>
        <mesh material={mapMats} {...layerEvents('topo')} castShadow receiveShadow>
          <boxGeometry args={[WORLD.w, SLAB_H, WORLD.h]} />
        </mesh>
        {stacked &&
          guides.map((g, i) => (
            <group key={i}>
              <Line
                points={[
                  [g.x, MAP_TOP + 0.002, g.z],
                  [g.x, g.top, g.z],
                ]}
                color={INK}
                lineWidth={1.4}
                dashed
                dashSize={0.045}
                gapSize={0.035}
                transparent
                opacity={0.8}
              />
              <mesh position={[g.x, MAP_TOP + 0.004, g.z]}>
                <sphereGeometry args={[0.022, 12, 8]} />
                <meshBasicMaterial color={INK} />
              </mesh>
            </group>
          ))}

        {stacked &&
          levelLines.map((l) => <Line key={l.key} points={l.points} color={ACCENT} lineWidth={2.4} />)}

        {stacked && feature && <FeatureHighlight id={feature} heightAt={heightAt} />}

        <group ref={probe} visible={false}>
          <group ref={stem}>
            <Line
              points={[
                [0, 0, 0],
                [0, 1, 0],
              ]}
              color={ACCENT}
              lineWidth={1.8}
            />
          </group>
          {[0, 1].map((i) => (
            <mesh
              key={i}
              ref={(el) => {
                dots.current[i] = el;
              }}
              renderOrder={10}
            >
              <sphereGeometry args={[0.03, 16, 12]} />
              <meshBasicMaterial color={ACCENT} depthTest={false} toneMapped={false} />
            </mesh>
          ))}
          <group ref={chipAnchor}>
            {/* left:0 — screen-space anchor for drei's absolute box under dir="rtl", as below. */}
            <Html portal={labelPortal} center zIndexRange={[30, 20]} style={{ left: 0 }} className="pointer-events-none select-none">
              <span
                ref={chip}
                className="block whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-display font-bold tabular-nums shadow-sm transition-opacity duration-150"
                style={{ opacity: 0, color: ACCENT, background: 'rgba(255,255,255,0.95)', outline: `1.5px solid ${ACCENT}` }}
              />
            </Html>
          </group>
        </group>

        {stacked &&
          LAYERS.map((l) => (
            <group key={l.view}>
              <Outline y={l.view === '3d' ? l.y + 0.1 : l.y + SLAB_H / 2 + 0.002} active={view === l.view} />
              {/* left:0 is a screen-space anchor, not content alignment: drei
                  positions the chip with an absolute box that has no inline
                  offset, and under dir="rtl" it would hang off the anchor. */}
              <Html
                position={[WORLD.w / 2 + 0.12, l.y + (l.view === '3d' ? 0.3 : 0), WORLD.h / 2]}
                portal={labelPortal}
                zIndexRange={[20, 0]}
                style={{ left: 0 }}
              >
                <button
                  type="button"
                  onClick={() => onSelectView(l.view)}
                  aria-pressed={view === l.view}
                  className={cn(
                    'relative isolate -translate-y-1/2 flex items-center gap-2 whitespace-nowrap rounded-xl border bg-bg-elevated px-2.5 py-1.5 font-display text-sm font-bold text-fg shadow-sm transition-colors duration-200 ease-snap cursor-pointer',
                    'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit]',
                    view === l.view ? 'border-accent before:bg-accent/10' : 'border-border hover:border-brand/30',
                  )}
                >
                  {l.label}
                </button>
              </Html>
            </group>
          ))}
      </group>
    </>
  );
}

// ---------------------------------------------------------------- shell

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active && progress >= 100) return null;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
      <div className="text-sm font-display font-bold text-fg-muted">טוען שטח תלת־ממדי…</div>
      <div className="h-1.5 w-40 rounded-full bg-border/60 overflow-hidden" dir="ltr">
        <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${Math.round(progress)}%` }} />
      </div>
    </div>
  );
}

function Fallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
      <TopographyMapSheet reveal animated={false} className="w-full max-h-full" />
      <p className="text-sm text-fg-muted">התצוגה התלת־ממדית אינה זמינה בדפדפן זה</p>
    </div>
  );
}

export default function TopographyTerrain3D({
  view,
  stacked,
  onSelectView,
  ariaLabel,
}: {
  view: TopoView;
  stacked: boolean;
  onSelectView: (v: TopoView) => void;
  /** The active view's description (the former image alt), read instead of the canvas. */
  ariaLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelPortal = useRef<HTMLDivElement>(null) as React.MutableRefObject<HTMLDivElement>;
  const [mapSvg, setMapSvg] = useState<SVGSVGElement | null>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const [inView, setInView] = useState(false);
  const [activated, setActivated] = useState(false);
  const [nearTop, setNearTop] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [feature, setFeature] = useState<FeatureId | null>(null);
  const reduce = !!useReducedMotion();
  const controlsRef = useRef(null) as ControlsRef;
  const mode: Mode = stacked ? 'stack' : view;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setActivated(true);
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen?.();
  };

  const orbit = mode === '3d' || mode === 'stack';

  return (
    <div ref={containerRef} className={cn('relative h-full w-full overflow-hidden bg-bg-elevated', fullscreen ? '' : 'rounded-xl')}>
      <div role="img" aria-label={ariaLabel} className="absolute inset-0" style={{ cursor: orbit ? 'grab' : 'default' }}>
        {activated && (
          <Canvas
            aria-hidden
            shadows={{ type: THREE.PCFShadowMap }}
            dpr={[1.5, 2]}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            camera={{ fov: 30, near: 0.05, far: 120, position: [1.2, 3.2, 5.2] }}
            frameloop={inView ? 'demand' : 'never'}
            // Neutral (Khronos PBR) tone mapping keeps the ground's colours
            // true to the albedo — ACES darkens and shifts them.
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.NeutralToneMapping;
            }}
            fallback={<Fallback />}
          >
            <hemisphereLight color="#FFF4E0" groundColor="#6B6A45" intensity={0.65} />
            {/* The sun: high in the south-west — above the steepest (exaggerated)
                slope, so no face falls into a hard-edged terminator shadow —
                while the east-flank ravines still read in relief and every tree
                casts a shadow, in 3D and from above. */}
            <directionalLight
              position={[-3.4, 6.2, 2.4]}
              intensity={2.7}
              color="#FFF1DC"
              castShadow
              shadow-mapSize={[4096, 4096]}
              shadow-camera-left={-4.5}
              shadow-camera-right={4.5}
              shadow-camera-top={4.5}
              shadow-camera-bottom={-4.5}
              shadow-camera-near={0.5}
              shadow-camera-far={30}
              shadow-bias={-0.0004}
              shadow-normalBias={0.01}
            />
            <Suspense fallback={null}>
              <Scene
                view={view}
                stacked={stacked}
                topDown={!stacked && view !== '3d' && nearTop}
                reduce={reduce}
                mapSvg={mapSvg}
                labelPortal={labelPortal}
                controlsRef={controlsRef}
                onSelectView={onSelectView}
                feature={stacked ? feature : null}
                onFeature={setFeature}
              />
            </Suspense>
            {/* Soft grounding shadow under the plinth. */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13, 0]} receiveShadow visible={!stacked}>
              <planeGeometry args={[12, 12]} />
              <shadowMaterial opacity={0.12} />
            </mesh>
            <OrbitControls
              ref={controlsRef}
              enabled={orbit}
              enablePan={false}
              enableZoom={orbit}
              enableRotate={orbit}
              maxPolarAngle={Math.PI / 2.1}
              enableDamping
              dampingFactor={0.08}
            />
            <CameraRig mode={mode} size={size} reduce={reduce} controlsRef={controlsRef} onNearTop={setNearTop} />
          </Canvas>
        )}
        {/* The map sheet, registered on the canvas through sheetRect(). */}
        <TopographyMapSheet reveal={mode === 'topo' && nearTop} className="pointer-events-none absolute inset-0 size-full" />
      </div>

      {/* Stack-layer buttons render here (outside the role="img" box) so they stay reachable. */}
      <div ref={labelPortal} className="pointer-events-none absolute inset-0 [&_button]:pointer-events-auto" />

      {/* The static, text-free sheet that the map slab rasterizes. */}
      <div aria-hidden className="pointer-events-none invisible absolute start-0 top-0 h-0 w-0 overflow-hidden">
        <TopographyMapSheet reveal labels={false} animated={false} svgRef={setMapSvg} />
      </div>

      {activated && <LoadingOverlay />}

      {/* "All together": the sheet's named features. Pointing at one outlines
          it on the model and on the map, as pointing at it on a layer does. */}
      {stacked && (
        <div className="absolute inset-x-2 bottom-2 z-10 flex flex-wrap items-center justify-center gap-1.5">
          {FEATURES.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={feature === f.id}
              onPointerEnter={() => setFeature(f.id)}
              onPointerLeave={() => setFeature(null)}
              onFocus={() => setFeature(f.id)}
              onBlur={() => setFeature(null)}
              className={cn(
                'rounded-[3px] border bg-bg-elevated/95 px-2.5 py-1 text-xs font-display font-bold transition-colors cursor-default',
                feature === f.id ? 'border-accent text-fg' : 'border-border text-fg-muted',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={fullscreen ? 'יציאה ממסך מלא' : 'מסך מלא'}
        title={fullscreen ? 'יציאה ממסך מלא' : 'מסך מלא'}
        className="absolute top-2 start-2 z-10 size-8 flex items-center justify-center rounded-[3px] border border-border bg-bg-elevated/95 text-fg-muted hover:border-accent/50 hover:text-fg transition-colors cursor-pointer"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          {fullscreen ? <path d="M6 1v5H1M10 1v5h5M6 15v-5H1M10 15v-5h5" /> : <path d="M1 6V1h5M15 6V1h-5M1 10v5h5M15 10v5h-5" />}
        </svg>
      </button>
    </div>
  );
}
