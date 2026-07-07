'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useReducedMotion } from 'framer-motion';
import { COMPOSITION, FIELD_HALF_SIZE, clamp01, sampleField } from './terrainField';

/**
 * InteractiveHomeTerrainModel — premium isometric-papercut terrain diorama
 * for the home hero (replaces the static home-hero-terrain-mockup.png
 * render used by HomeHero).
 *
 * v3 structural rewrite. The changes that mattered most against the "still
 * reads as a simple scene inside a tray" verdict on v2:
 *
 * 1. SILHOUETTE — a two-card slab (a wide "core" plinth + a narrower "lip"
 *    on top, unequal corner radii, a hair of rotation between them) reads
 *    as furniture the terrain sits ON, not a frame it sits IN. The height
 *    field's own edge-taper (terrainField.ts, FIELD_HALF_SIZE) brings the
 *    relief down to the lip's plateau height at the mesh's own boundary, so
 *    only a thin, intentional rim of the lip shows around it. (An earlier
 *    pass fused a hand-built perimeter "skirt" into the terrain geometry for
 *    an even tighter seal — reverted: the manually-spliced BufferGeometry
 *    dropped its UV attribute and produced degenerate normals along the
 *    seam, reading as a flat grey/white band across much of the surface.
 *    The plain displaced PlaneGeometry + edge-taper is simpler and correct.)
 * 2. MATERIAL — matte vertex-coloured terrain with a procedural grain
 *    canvas as a bump/roughness map, plus a distinct river bank-edge tint;
 *    a standalone curvature-based AO pass was also tried and reverted (see
 *    inline comment in `useTerrainGeometry`) — it fought the terrace
 *    grooves rather than reinforcing them.
 * 3. LIGHTING — a soft key/fill/rim rig plus ACES filmic tone mapping (the
 *    lightest palette tones were clipping toward flat white without it),
 *    and drei's <ContactShadows> for the soft ground contact.
 *
 * Terrain relief itself (real hills/ridges/valleys, slope-adaptive carved
 * terracing, a spline-based carved river channel, organic composition) is
 * built in terrainField.ts — see that file's header for the full technique
 * rundown. Trees/flag/camera framing follow COMPOSITION exported from
 * there, so the height-field bumps and the props standing on them can never
 * drift apart.
 *
 * Colours are the approved "illustration palette" from design/design-spec.md
 * §8 (sand/sage/river/base-rim) plus the ember accent from
 * tailwind.config.ts; the river/strata tones are in-family lerps of those
 * approved hexes — see design/assumptions.md. Orange is confined to the
 * flag's pennant fabric only.
 *
 * Rendered client-only via next/dynamic from HomeTerrainDiorama.tsx
 * (Canvas can't SSR); WebGL support + runtime errors are gated there.
 */

const PALETTE = {
  sand: '#E8DCC4',
  sandDeep: '#C9B892',
  creamHigh: '#F8F2E7',
  sageLight: '#8A9163',
  sage: '#6E7A4E',
  sageDeep: '#55613C',
  charcoal: '#38432E',
  ember: '#D97E2B',
  riverBase: '#7FB4C6',
};

// creamHigh alone is close enough to paper-white that under studio lighting
// (even with tone mapping) it can read as a blown-out patch; warmed with a
// little sand for a plinth/high-ground tone that's still clearly the
// lightest thing in the scene without clipping toward pure white.
const PLINTH_COLOR = new THREE.Color(PALETTE.creamHigh).lerp(new THREE.Color(PALETTE.sand), 0.42);

// ---------------------------------------------------------------------------
// Slab — two thick, confidently-profiled cards instead of a stack of thin
// pancakes (a "stack of coasters" reads just as tray-like as one flat
// panel). A wide sandDeep "core" (the plinth) with a narrower creamHigh
// "lip" on top, each an independently-bevelled ExtrudeGeometry built from an
// asymmetric-corner-radius rounded rect. Bevel is always clamped to a
// fraction of the card's own thickness — the exact guard that fixed the
// project's earlier degenerate-blob bug (drei's <RoundedBox> silently
// inflating when radius exceeds a thin layer's own thickness) — so neither
// card can ever balloon past its intended profile.
// ---------------------------------------------------------------------------

const CORE_THICKNESS = 0.2;
const CORE_BEVEL = 0.05;
const CORE_WIDTH = 2.9;
// [bottomRight, topRight, topLeft, bottomLeft] — deliberately unequal so the
// footprint reads as a hand-set object, not a CAD-perfect coaster.
const CORE_RADII: [number, number, number, number] = [0.16, 0.22, 0.18, 0.12];

const LIP_THICKNESS = 0.035;
const LIP_BEVEL = 0.014;
const LIP_WIDTH = 2.6;
const LIP_RADII: [number, number, number, number] = [0.11, 0.16, 0.13, 0.08];
// A barely-perceptible rotation so the lip isn't a perfectly concentric
// copy of the core — real stacked objects are never quite square to
// each other.
const LIP_ROTATION_Y = THREE.MathUtils.degToRad(1.2);

const SLAB_TOP_Y = CORE_THICKNESS + LIP_THICKNESS;

const TERRAIN_SIZE = FIELD_HALF_SIZE * 2;
const TERRAIN_SEGMENTS = 128;
const TERRAIN_EPSILON = 0.003;

function roundedRectShape(
  width: number,
  depth: number,
  radius: number | [bottomRight: number, topRight: number, topLeft: number, bottomLeft: number],
) {
  const w = width / 2;
  const d = depth / 2;
  const raw = typeof radius === 'number' ? [radius, radius, radius, radius] : radius;
  const [rBR, rTR, rTL, rBL] = raw.map((r) => Math.min(r, w, d));
  const shape = new THREE.Shape();
  shape.moveTo(-w + rBL, -d);
  shape.lineTo(w - rBR, -d);
  shape.quadraticCurveTo(w, -d, w, -d + rBR);
  shape.lineTo(w, d - rTR);
  shape.quadraticCurveTo(w, d, w - rTR, d);
  shape.lineTo(-w + rTL, d);
  shape.quadraticCurveTo(-w, d, -w, d - rTL);
  shape.lineTo(-w, -d + rBL);
  shape.quadraticCurveTo(-w, -d, -w + rBL, -d);
  return shape;
}

function SlabCard({
  width,
  thickness,
  y,
  color,
  radii,
  bevel,
  rotationY = 0,
  grain,
}: {
  width: number;
  thickness: number;
  y: number;
  color: string;
  radii: [number, number, number, number];
  bevel: number;
  rotationY?: number;
  grain: THREE.Texture | null;
}) {
  const geometry = useMemo(() => {
    const b = Math.min(bevel, thickness * 0.3);
    const shape = roundedRectShape(width, width, radii);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness - b * 2,
      bevelEnabled: true,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: 5,
      curveSegments: 24,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -thickness / 2, 0);

    // Vertical AO-gradient tint: darker toward the base, true colour at the
    // top. Mostly hidden on the top/bottom caps (covered by the neighbouring
    // card) but does real work on the visible side walls, faking occlusion/
    // weight without any extra geometry or render pass.
    const position = geo.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const top = new THREE.Color(color);
    const base = top.clone().lerp(new THREE.Color(PALETTE.charcoal), 0.32);
    const tone = new THREE.Color();
    for (let i = 0; i < position.count; i++) {
      const t = clamp01((position.getY(i) + thickness / 2) / thickness);
      tone.copy(base).lerp(top, t);
      colors[i * 3] = tone.r;
      colors[i * 3 + 1] = tone.g;
      colors[i * 3 + 2] = tone.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [width, thickness, color, radii, bevel]);

  return (
    <mesh geometry={geometry} position={[0, y, 0]} rotation={[0, rotationY, 0]} castShadow receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.87}
        metalness={0}
        bumpMap={grain ?? undefined}
        bumpScale={0.005}
        roughnessMap={grain ?? undefined}
      />
    </mesh>
  );
}

function SlabStack({ grain }: { grain: THREE.Texture | null }) {
  return (
    <group>
      <SlabCard
        width={CORE_WIDTH}
        thickness={CORE_THICKNESS}
        y={CORE_THICKNESS / 2}
        color={PALETTE.sandDeep}
        radii={CORE_RADII}
        bevel={CORE_BEVEL}
        grain={grain}
      />
      <SlabCard
        width={LIP_WIDTH}
        thickness={LIP_THICKNESS}
        y={CORE_THICKNESS + LIP_THICKNESS / 2}
        color={PALETTE.creamHigh}
        radii={LIP_RADII}
        bevel={LIP_BEVEL}
        rotationY={LIP_ROTATION_Y}
        grain={grain}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Terrain — a displaced, vertex-coloured grid sized directly from
// terrainField's FIELD_HALF_SIZE, whose height field tapers to zero at that
// same boundary — so the relief meets the lip's flat plateau flush, with
// only a thin, intentional rim of the lip showing around it.
// ---------------------------------------------------------------------------

function useTerrainGeometry() {
  return useMemo(() => {
    const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
    geometry.rotateX(-Math.PI / 2);

    const position = geometry.attributes.position as THREE.BufferAttribute;
    const vertexCount = position.count;
    const colorArray = new Float32Array(vertexCount * 3);

    const sageLight = new THREE.Color(PALETTE.sageLight);
    const sageDeep = new THREE.Color(PALETTE.sageDeep);
    const sand = PLINTH_COLOR.clone();
    const charcoal = new THREE.Color(PALETTE.charcoal);

    // River tones — both derived only from approved hexes. Shallow stays
    // close to the raw river hue (a little sage shows through near the
    // bank, like light through shallow water); deep pulls hard toward
    // charcoal for a believable "there is real depth here" read.
    const riverShallow = new THREE.Color(PALETTE.riverBase).lerp(sageLight, 0.35);
    const riverDeep = new THREE.Color(PALETTE.riverBase).lerp(charcoal, 0.55);
    // Slightly darker, damp-looking sand for the raised bank lip — reads as
    // compacted wet earth right at the waterline.
    const bankWet = new THREE.Color(PALETTE.sandDeep).lerp(charcoal, 0.12);

    const tone = new THREE.Color();
    const waterTone = new THREE.Color();

    // A standalone Laplacian-curvature AO was tried here and reverted: the
    // terrace grooves are themselves real concave notches (by design), so a
    // 4-neighbour curvature sample landed squarely on every groove and
    // clamped to full intensity at nearly every terrace ring — a redundant
    // signal fighting the `contour` darkening below rather than adding to
    // it. The grooves already read as genuine shaded creases via
    // `computeVertexNormals()` under the studio lights; `contour` carries
    // the colour side of that same seam.
    for (let i = 0; i < vertexCount; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const sample = sampleField(x, z);
      position.setY(i, sample.height);

      tone.copy(sageDeep).lerp(sageLight, sample.shade);
      tone.lerp(sand, sample.biome);
      tone.lerp(charcoal, sample.contour * 0.24);

      if (sample.bankLip > 0) {
        tone.lerp(bankWet, sample.bankLip * 0.55);
      }
      if (sample.riverMask > 0) {
        waterTone.copy(riverShallow).lerp(riverDeep, sample.riverDepth);
        tone.lerp(waterTone, sample.riverMask);
      }

      // Tiny deterministic grain so flat shelves (and the water surface)
      // don't read as a pasted-on flat colour patch.
      const grain = Math.sin(x * 91.7) * Math.sin(z * 63.1) * 0.015;
      tone.offsetHSL(0, 0, grain);

      colorArray[i * 3] = tone.r;
      colorArray[i * 3 + 1] = tone.g;
      colorArray[i * 3 + 2] = tone.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, []);
}

function Terrain({ grain }: { grain: THREE.Texture | null }) {
  const geometry = useTerrainGeometry();
  return (
    <mesh geometry={geometry} position={[0, SLAB_TOP_Y + TERRAIN_EPSILON, 0]} castShadow receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.95}
        metalness={0}
        bumpMap={grain ?? undefined}
        bumpScale={0.006}
        roughnessMap={grain ?? undefined}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Procedural grain — one small canvas, generated once client-side, reused
// as both a bump map (micro surface texture on top of the real terracing)
// and a roughness map (matte-ness varies subtly instead of one flat number
// across the whole object) — without pulling in any external asset.
// ---------------------------------------------------------------------------

function grainNoise(u: number, v: number) {
  let n = 0;
  n += Math.sin(u * 54 + Math.sin(v * 37 + 1.7) * 2.4);
  n += Math.sin(u * 131 - v * 97 + 4.1) * 0.6;
  n += Math.sin((u + v) * 211 + 2.3) * 0.35;
  n += Math.sin(u * 19 + 0.6) * Math.sin(v * 23 - 1.1) * 0.5;
  return n;
}

function useGrainTexture(): THREE.Texture | null {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const image = ctx.createImageData(size, size);
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const u = (px / size) * 10;
        const v = (py / size) * 10;
        const g = Math.round(clamp01(0.55 + grainNoise(u, v) * 0.16) * 255);
        const idx = (py * size + px) * 4;
        image.data[idx] = g;
        image.data[idx + 1] = g;
        image.data[idx + 2] = g;
        image.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5);
    texture.colorSpace = THREE.NoColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, []);
}

// ---------------------------------------------------------------------------
// Trees — layered flattened-icosahedron foliage lobes + a gently bent trunk,
// nothing like a generic stacked cone.
// ---------------------------------------------------------------------------

/** Builds one irregular, faceted foliage lobe: an icosahedron perturbed by a
 * couple of low-frequency sine terms, flattened vertically, then re-faceted
 * (toNonIndexed + computeVertexNormals) so it keeps a crisp low-poly
 * "cut facets" look instead of shading smooth like a rubber ball. `seed`
 * makes every lobe on every tree a distinct, deterministic shape — never a
 * repeated prefab — while staying stable across re-renders (no Math.random). */
function foliageLobeGeometry(radius: number, squash: number, seed: number) {
  const base = new THREE.IcosahedronGeometry(radius, 1);
  const pos = base.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const len = v.length() || 1;
    const theta = Math.atan2(v.z, v.x);
    const phi = Math.acos(THREE.MathUtils.clamp(v.y / len, -1, 1));
    const lobe =
      1 +
      0.18 * Math.sin(theta * 5 + seed) * Math.sin(phi * 2.2 + seed * 0.6) +
      0.09 * Math.sin(theta * 2 + seed * 2.4);
    v.multiplyScalar(lobe);
    v.y *= squash;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  const faceted = base.toNonIndexed();
  faceted.computeVertexNormals();
  return faceted;
}

/** A cylinder sheared by a gentle quadratic curve toward the top — a hint of
 * organic lean, not a ramrod-straight pole. */
function useBentTrunkGeometry(height: number, radiusBottom: number, radiusTop: number, lean: number) {
  return useMemo(() => {
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 8, 6, false);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) + height / 2;
      const t = y / height;
      pos.setX(i, pos.getX(i) + lean * t * t);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [height, radiusBottom, radiusTop, lean]);
}

function Tree({
  position,
  scale = 1,
  rotationY = 0,
  lean = 0,
  seed = 0,
}: {
  position: [number, number, number];
  scale?: number;
  rotationY?: number;
  lean?: number;
  seed?: number;
}) {
  const trunkHeight = 0.34;
  const trunkGeo = useBentTrunkGeometry(trunkHeight, 0.028, 0.014, lean);
  const lobeLower = useMemo(() => foliageLobeGeometry(0.19, 0.62, seed), [seed]);
  const lobeUpper = useMemo(() => foliageLobeGeometry(0.13, 0.68, seed + 4.2), [seed]);

  return (
    <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
      <mesh geometry={trunkGeo} position={[0, trunkHeight / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={PALETTE.charcoal} roughness={0.85} metalness={0} />
      </mesh>
      {/* Lower, larger lobe and an upper, smaller offset lobe — an
          asymmetric two-tier canopy instead of a single silhouette. */}
      <mesh
        geometry={lobeLower}
        position={[lean * 0.7, trunkHeight + 0.1, 0]}
        rotation={[0, seed, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={PALETTE.sageDeep} roughness={0.8} metalness={0} flatShading />
      </mesh>
      <mesh
        geometry={lobeUpper}
        position={[lean * 0.95, trunkHeight + 0.24, 0]}
        rotation={[0, seed + 1.4, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={PALETTE.sage} roughness={0.78} metalness={0} flatShading />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Flag — a taller, refined pole with a faceted finial, a single clean
// curved pennant (not a swallowtail), and its own lathe-turned podium
// plinth sitting atop the dedicated flag knoll.
// ---------------------------------------------------------------------------

/** Iconic single pennant: both edges are gentle quadratic curves converging
 * to a point — reads as "flag caught in a breeze". */
function pennantShape() {
  const h = 0.11;
  const len = 0.3;
  const shape = new THREE.Shape();
  shape.moveTo(0, h);
  shape.quadraticCurveTo(len * 0.65, h * 0.55, len, 0);
  shape.quadraticCurveTo(len * 0.65, -h * 0.55, 0, -h);
  shape.lineTo(0, h);
  return shape;
}

/** A small rounded-edge "podium" the flag stands on — the same lathe-turned
 * language a paper/clay maquette would use for a plinth, at a tiny scale. */
function plinthGeometry() {
  const pts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.16, 0),
    new THREE.Vector2(0.16, 0.02),
    new THREE.Vector2(0.13, 0.05),
    new THREE.Vector2(0.1, 0.055),
    new THREE.Vector2(0, 0.055),
  ];
  return new THREE.LatheGeometry(pts, 20);
}

function Flag({ position }: { position: [number, number, number] }) {
  const pennant = useMemo(() => pennantShape(), []);
  const plinth = useMemo(() => plinthGeometry(), []);
  const poleHeight = 0.56;
  const plinthTopY = 0.055;

  return (
    <group position={position}>
      <mesh geometry={plinth} castShadow receiveShadow>
        <meshStandardMaterial color={PLINTH_COLOR} roughness={0.85} metalness={0} />
      </mesh>

      {/* Subtle taper pole — hardware stays neutral charcoal so the pennant
          fabric is the ONLY orange surface anywhere in the scene. */}
      <mesh position={[0, poleHeight / 2 + plinthTopY, 0]} castShadow>
        <cylinderGeometry args={[0.009, 0.02, poleHeight, 12]} />
        <meshStandardMaterial color={PALETTE.charcoal} roughness={0.55} metalness={0} />
      </mesh>

      {/* Faceted finial cap — a small jewel-like point, not a plain ball. */}
      <mesh position={[0, poleHeight + plinthTopY + 0.02, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <octahedronGeometry args={[0.026, 0]} />
        <meshStandardMaterial color={PALETTE.charcoal} roughness={0.5} metalness={0} flatShading />
      </mesh>

      {/* Angled so it presents more face toward the camera's default
          framing — the flag should be legible as THE focal point from the
          very first, unrotated frame. */}
      <mesh position={[0.012, poleHeight * 0.72 + plinthTopY, 0]} rotation={[0, -0.5, 0]} castShadow>
        <extrudeGeometry args={[pennant, { depth: 0.008, bevelEnabled: false }]} />
        <meshStandardMaterial color={PALETTE.ember} roughness={0.65} metalness={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Props placement — reads exclusively from COMPOSITION (terrainField.ts),
// so the height-field bumps and the objects standing on them can't drift.
// ---------------------------------------------------------------------------

function terrainTopY(x: number, z: number) {
  return SLAB_TOP_Y + TERRAIN_EPSILON + sampleField(x, z).height;
}

function Props() {
  return (
    <>
      {COMPOSITION.trees.map((t, i) => (
        <Tree
          key={i}
          position={[t.x, terrainTopY(t.x, t.z), t.z]}
          scale={t.scale}
          rotationY={t.rotationY}
          lean={t.lean}
          seed={i * 2.7 + 1}
        />
      ))}
      <Flag position={[COMPOSITION.flag.x, terrainTopY(COMPOSITION.flag.x, COMPOSITION.flag.z), COMPOSITION.flag.z]} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Camera — off the mirrored-45° "generic isometric diamond": an asymmetric
// azimuth, sited on the flag's side of the object so the focal knoll reads
// near/large while the tree cluster recedes for depth.
// ---------------------------------------------------------------------------

const TARGET_WORLD_SPAN = 3.9;

function ResponsiveOrtho() {
  const camera = useThree((state) => state.camera) as THREE.OrthographicCamera;
  const size = useThree((state) => state.size);

  useEffect(() => {
    const shortSide = Math.min(size.width, size.height);
    camera.zoom = shortSide / TARGET_WORLD_SPAN;
    camera.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

/** Gently pauses auto-rotate while the user drags, resuming after a short idle delay. */
function useAutoRotateGate(reduce: boolean) {
  // Typed loosely: only `autoRotate` is toggled here, and drei's exported
  // OrbitControls ref type doesn't line up cleanly with a partial shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    },
    [],
  );

  const onStart = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    if (controlsRef.current) controlsRef.current.autoRotate = false;
  };
  const onEnd = () => {
    if (reduce) return;
    resumeTimer.current = setTimeout(() => {
      if (controlsRef.current) controlsRef.current.autoRotate = true;
    }, 2500);
  };

  return { controlsRef, onStart, onEnd };
}

// Elevation ~36° (a "product photography" angle — enough to read the
// terraces and river in plan, enough to read the flag's height in profile),
// azimuth ~30° off either axis (never the mirrored-45° diamond), positioned
// on the +x/-z side — the flag's side — so the knoll sits near and large
// while the tree cluster (-x/+z) recedes into the background for depth.
const INITIAL_CAMERA_POSITION: [number, number, number] = [2.55, 3.7, -4.42];
// Pivot nudged toward the flag site (not dead-centre on the slab) and
// raised to roughly the knoll's mid-height, so the very first frame already
// favours the focal point instead of centring on the flat base shelf.
const CONTROLS_TARGET: [number, number, number] = [0.14, SLAB_TOP_Y + 0.1, -0.09];

export default function InteractiveHomeTerrainModel() {
  const reduce = !!useReducedMotion();
  const { controlsRef, onStart, onEnd } = useAutoRotateGate(reduce);
  const grain = useGrainTexture();

  return (
    <Canvas
      className="size-full"
      orthographic
      camera={{ position: INITIAL_CAMERA_POSITION, zoom: 100, near: 0.1, far: 20 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      style={{ touchAction: 'none' }}
    >
      <ResponsiveOrtho />

      {/* Soft studio rig — broad ambient/hemisphere fill kept moderate (not
          flattened-high) so the terraced relief still reads through shading,
          a soft key light raking from the flag-front side (matches the
          camera azimuth), a gentle opposite fill, and a cool rim/kicker
          catching bevel edges and ridgelines from behind. Real-time
          shadow-casting was tried and reverted: at this geometric detail
          (ridged micro-relief + carved terrace grooves) a 1024px shadow map
          produced visible acne/noise rather than clean contact shadow —
          drei's <ContactShadows> below plus the vertex-colour curvature AO
          carry the "grounded, has depth" read instead. */}
      <ambientLight intensity={0.52} />
      <hemisphereLight color={PALETTE.sand} groundColor={PALETTE.sageDeep} intensity={0.32} />
      <directionalLight position={[3.0, 5.0, -2.4]} intensity={0.85} />
      <directionalLight position={[-2.6, 2.0, 2.8]} intensity={0.26} />
      <directionalLight position={[-1.4, 4.2, -0.9]} intensity={0.14} color={PALETTE.creamHigh} />

      <SlabStack grain={grain} />
      <Terrain grain={grain} />
      <Props />

      {/* Single baked contact-shadow pass (frames=1) — nothing in world
          space moves (only the camera orbits), so one soft blurred shadow
          under the slab/trees/flag is correct and free after the first
          frame. */}
      <ContactShadows
        position={[0, -SLAB_TOP_Y - 0.005, 0]}
        opacity={0.4}
        scale={5.5}
        blur={2.4}
        far={1.6}
        resolution={512}
        color={PALETTE.charcoal}
        frames={1}
      />

      <OrbitControls
        ref={controlsRef}
        target={CONTROLS_TARGET}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={0.68}
        maxPolarAngle={1.2}
        autoRotate={!reduce}
        autoRotateSpeed={0.25}
        enableDamping
        dampingFactor={0.08}
        onStart={onStart}
        onEnd={onEnd}
      />
    </Canvas>
  );
}
