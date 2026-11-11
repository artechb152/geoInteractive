'use client';
/**
 * Everything the replay's live view shows of the land, around one prepared
 * world (a station, or the walking corridor): the sky, the light, the ground,
 * the maquis, dwarf shrubs, grass, rocks and trees. ReplayScene3D owns the
 * camera, the walk and the world's preparation; this file owns the look.
 *
 *   sky        the photographed dome, haze over the horizon (and the same sky,
 *              prefiltered, as the light of every surface — lighting.ts)
 *   sun        one sun, a static shadow map over the whole world and a fine one
 *              round the eye, redrawn as the eye walks
 *   ground     the four ground scans (groundMaterial.ts) and a contact-shadow
 *              map round the eye (contactMap.ts)
 *   plants     scanned maquis, dwarf shrubs and dry grass with two levels of
 *              detail each, culled per frame (instanceField.ts); far maquis as
 *              billboards out to 1.5 km
 *   rocks      scanned limestone, the same scans as stones and stream cobbles
 *   trees      the lab's oaks, olives and pines at their map positions
 *
 * Budget (desktop, the 820 × 470 panel at DPR 2 or 1920 × 1080 at ~1.3): a few
 * million triangles in view, three shadow-map draws only when something moved
 * far enough, frameloop "demand".
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import {
  BackSide,
  Color,
  DirectionalLight,
  Euler,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  NeutralToneMapping,
  Object3D,
  PCFShadowMap,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  NoColorSpace,
  FogExp2,
  ImageBitmapLoader,
  Texture,
  Vector4,
  type BufferGeometry,
  type Scene,
  type WebGLRenderer,
} from 'three';
import type { PreparedWorld } from '../replayPreparation';
import type { Instance } from '../replayScatter';
import { replayTrees } from '../replayLandmarks';
import {
  ENV_INTENSITY,
  EXPOSURE,
  FAR_SHRUB_URL,
  FOG_DENSITY,
  GROUND_URLS,
  HAZE,
  PLANT_TEXTURE_URLS,
  PLANTS_URL,
  PINES_URL,
  PT,
  ROCK_COUNT,
  ROCK_TEXTURE_URLS,
  ROCKS_URL,
  SKY_U_OFFSET,
  SKY_URL,
  SUN_COLOR,
  SUN_DIR,
  SUN_INTENSITY,
} from './visualConfig';
import { NEAR_SHADOW_M, NEAR_SHADOW_MAP, NEAR_SHADOW_STEP_M, createSkyEnvironment } from './lighting';
import { LINE_SEGMENTS, averageColor, createGroundMaterial, prepareGroundTextures, type GroundTextures } from './groundMaterial';
import { ROAD_LINE, STREAM_LINE } from '../replayTerrain';
import { waterCourses } from '../../planning-lab/planningLabTerrain';
import type { W2 } from '../replayWorld';
import { ContactMap, CONTACT_STEP_M, type Footprint } from './contactMap';
import { InstanceField, type CasterSet, type FieldVariant } from './instanceField';
import { meshesByName, preparePlant, prepareRock, type CrownFrame } from './plantModels';
import { createFoliageMaterial, createRockMaterial, createWoodMaterial } from './plantMaterials';
import { buildBillboardGeometry, createBillboardMaterial } from './vegetation';

// ───────────────────────────────────────────── canvas settings

/** The Canvas's gl options. */
export const REPLAY_GL = { antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false } as const;

/**
 * Draws the frame, then sets the drawing buffer's alpha to 1. Alpha-to-coverage writes each leaf
 * edge's partial coverage into the colour's alpha as well, and three.js always asks for a canvas
 * with alpha (`alpha: false` only clears to opaque) — so without this the page behind the canvas
 * would show through as a pale, dotted rim round every leaf. Clearing only the alpha channel leaves
 * the picture untouched. (Taking the frame with priority 1 makes this the one place that renders.)
 */
function RenderOpaque({ built }: { built: PreparedWorld }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  // Compile every material of the world up front, while the loading line still shows: a rock or
  // plant first turned into view would otherwise stall its first frame on a shader compile.
  useEffect(() => {
    gl.compile(scene, camera);
  }, [gl, scene, camera, built]);
  useFrame(() => {
    gl.render(scene, camera);
    const ctx = gl.getContext();
    ctx.colorMask(false, false, false, true);
    ctx.clearColor(0, 0, 0, 1);
    ctx.clear(ctx.COLOR_BUFFER_BIT);
    ctx.colorMask(true, true, true, true);
    // three's state cache no longer matches the context: let it set everything again
    gl.resetState();
  }, 1);
  return null;
}
/** Pixels to draw (CSS px × DPR²): ~3.6 M — DPR 2 in the lesson's panel, ~1.3 at 1920 × 1080 full screen. */
const PIXEL_BUDGET = 3.6e6;

/** For the Canvas's onCreated: tone mapping, shadows drawn on demand, the haze. */
export function setupReplayRenderer(gl: WebGLRenderer, scene: Scene) {
  gl.toneMapping = NeutralToneMapping;
  gl.toneMappingExposure = EXPOSURE;
  gl.outputColorSpace = SRGBColorSpace;
  gl.shadowMap.type = PCFShadowMap;
  gl.shadowMap.autoUpdate = false;
  scene.fog = new FogExp2(HAZE.getHex(), FOG_DENSITY);
  scene.background = HAZE.clone();
}

/** Resolution follows the panel's size: supersampled when small, a fixed pixel budget at full screen. */
function AdaptiveDpr() {
  const size = useThree((s) => s.size);
  const setDpr = useThree((s) => s.setDpr);
  useEffect(() => {
    const px = Math.max(1, size.width * size.height);
    setDpr(Math.min(2, Math.max(1, Math.sqrt(PIXEL_BUDGET / px))));
  }, [size.width, size.height, setDpr]);
  return null;
}

// ───────────────────────────────────────────── the visuals

const ALL_TEXTURES = [SKY_URL, ...GROUND_URLS, ...ROCK_TEXTURE_URLS];
const NG = GROUND_URLS.length;
/** Cut-out atlases (alpha): decoded without premultiplying (below). */
const ALPHA_TEXTURES = [FAR_SHRUB_URL, ...PLANT_TEXTURE_URLS];

/**
 * Textures with a cut-out mask, decoded as stored. An <img> upload goes through the browser's
 * premultiplied decode: the colour of every faint edge texel comes back amplified quantisation noise
 * (pale specks round each leaf once the mask's mip-maps are sharpened) and the colour dilated under
 * the mask is lost. ImageBitmap with premultiplyAlpha 'none' keeps both.
 */
const bitmapOptions = (loader: unknown) => {
  (loader as ImageBitmapLoader).setOptions({ imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
};
function useAlphaTextures(urls: string[]): Texture[] {
  const bitmaps = useLoader(ImageBitmapLoader, urls, bitmapOptions) as unknown as ImageBitmap[];
  const textures = useMemo(
    () =>
      bitmaps.map((b) => {
        const t = new Texture(b);
        // already flipped by the decoder (the TextureLoader convention); ImageBitmaps ignore flipY
        t.flipY = false;
        t.needsUpdate = true;
        return t;
      }),
    [bitmaps],
  );
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  return textures;
}

export function ReplayVisuals({ built }: { built: PreparedWorld }) {
  const tex = useTexture(ALL_TEXTURES) as Texture[];
  const alphaTex = useAlphaTextures(ALPHA_TEXTURES);
  const plants = useGLTF(PLANTS_URL, false) as unknown as { scene: Object3D };
  const pines = useGLTF(PINES_URL, false) as unknown as { scene: Object3D };
  const rocks = useGLTF(ROCKS_URL, false) as unknown as { scene: Object3D };
  const gl = useThree((s) => s.gl);
  // stable slices: the view's parent re-renders on every turn, and a new array would rebuild every
  // material, field and texture downstream on every frame
  const { skyTex, groundTex, rockTex, detail } = useMemo(() => {
    const groundTex = tex.slice(1, 1 + NG);
    return { skyTex: tex[0], groundTex, rockTex: tex.slice(1 + NG), detail: { albedo: groundTex[2], normal: groundTex[2 + NG / 2] } };
  }, [tex]);
  const { farAtlas, plantTex } = useMemo(() => ({ farAtlas: alphaTex[0], plantTex: alphaTex.slice(1) }), [alphaTex]);
  // the plants' geometry, once per file (the shrubs and the trees share plants.glb)
  const plantGeos = useMemo(() => {
    const m = meshesByName(plants.scene);
    meshesByName(pines.scene).forEach((g, k) => m.set(k, g));
    return m;
  }, [plants, pines]);
  useEffect(() => () => plantGeos.forEach((g) => g.dispose()), [plantGeos]);

  useMemo(() => {
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    for (const t of [skyTex, farAtlas, ...plantTex]) {
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = 4;
      t.needsUpdate = true;
    }
    rockTex.forEach((t, k) => {
      t.colorSpace = k < ROCK_COUNT ? SRGBColorSpace : NoColorSpace;
      t.anisotropy = aniso;
      t.needsUpdate = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tex, alphaTex, gl]);

  return (
    <>
      {process.env.NODE_ENV !== 'production' && <DevEye built={built} />}
      <AdaptiveDpr />
      <RenderOpaque built={built} />
      <Sky texture={skyTex} />
      <SkyLight sky={skyTex} />
      <Sun built={built} />
      <Ground built={built} textures={groundTex} />
      <Plants built={built} geos={plantGeos} textures={plantTex} farAtlas={farAtlas} />
      <Rocks built={built} gltf={rocks} textures={rockTex} detail={detail} />
      <Woodland built={built} geos={plantGeos} textures={plantTex} />
    </>
  );
}

useGLTF.preload(PLANTS_URL, false);
useGLTF.preload(PINES_URL, false);
useGLTF.preload(ROCKS_URL, false);

/**
 * Dev-only probe for the graphics QA scripts: `__replayVisualEye.set(x, z)` stands the eye (ground
 * + 1.7 m) anywhere in the prepared world for close-ups of a material or a model, `.clear()` hands
 * it back to the camera rig. It runs after the rig in the frame, so the rig's eye is simply replaced.
 */
function DevEye({ built }: { built: PreparedWorld }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const at = useRef<{ x: number; z: number } | null>(null);
  useEffect(() => {
    const w = window as unknown as { __replayVisualEye?: object };
    w.__replayVisualEye = {
      set: (x: number, z: number) => {
        at.current = { x, z };
        invalidate();
      },
      clear: () => {
        at.current = null;
        invalidate();
      },
      road: (x: number, z: number) => built.terrain.road(x, z),
      stream: (x: number, z: number) => built.terrain.stream(x, z),
      trees: () => replayTrees().map((t) => ({ kind: t.kind, x: t.x, z: t.z, r: t.crown.radiusM, bottom: t.crown.centerM - t.crown.halfHeightM - t.baseM })),
    };
    return () => {
      delete w.__replayVisualEye;
    };
  }, [built, invalidate]);
  useFrame(() => {
    const a = at.current;
    if (a) camera.position.set(a.x, built.terrain.height(a.x, a.z) + 1.7, a.z);
  });
  return null;
}

// ───────────────────────────────────────────── sky and light

function Sky({ texture }: { texture: Texture }) {
  const camera = useThree((s) => s.camera);
  const mesh = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uSky: { value: texture }, uOffset: { value: SKY_U_OFFSET }, uHaze: { value: HAZE }, uExposure: { value: 1.1 } },
        side: BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uSky; uniform float uOffset; uniform vec3 uHaze; uniform float uExposure;
          varying vec3 vDir;
          #include <common>
          void main() {
            vec3 d = normalize(vDir);
            float az = atan(d.x, -d.z);
            float u = fract(az / (2.0 * PI) + uOffset);
            float el = asin(clamp(d.y, -1.0, 1.0));
            float vImg = (0.5 - el / PI) / 0.625;
            vec2 uv = vec2(u, 1.0 - clamp(vImg, 0.0, 0.995));
            // where u wraps 1 → 0 its screen derivative explodes and the lowest mip draws a pale line
            // down the sky: take the derivatives of a copy that is continuous there (Tarini's trick)
            float u2 = fract(u + 0.5) - 0.5;
            float dux = fwidth(u) <= fwidth(u2) ? dFdx(u) : dFdx(u2);
            float duy = fwidth(u) <= fwidth(u2) ? dFdy(u) : dFdy(u2);
            vec3 c = textureGrad(uSky, uv, vec2(dux, dFdx(uv.y)), vec2(duy, dFdy(uv.y))).rgb * uExposure;
            // haze over the horizon, the same colour as the ground's fog
            c = mix(c, uHaze, smoothstep(0.12, -0.005, d.y));
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [texture],
  );
  useEffect(() => () => material.dispose(), [material]);
  const geo = useMemo(() => new SphereGeometry(1000, 64, 32), []);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame(() => mesh.current?.position.copy(camera.position));
  return <mesh ref={mesh} geometry={geo} material={material} renderOrder={-1} frustumCulled={false} />;
}

/** The sky photograph as the image-based light of every standard material. */
function SkyLight({ sky }: { sky: Texture }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const rt = createSkyEnvironment(gl, sky);
    scene.environment = rt.texture;
    scene.environmentIntensity = ENV_INTENSITY;
    return () => {
      if (scene.environment === rt.texture) scene.environment = null;
      rt.dispose();
    };
  }, [gl, scene, sky]);
  return null;
}

/** Layers seen only by a shadow camera (casters that never draw in the view). */
export const LAYER_NEAR_CASTERS = 1;
export const LAYER_FAR_CASTERS = 2;

type SunHandles = { far: DirectionalLight | null; near: DirectionalLight | null };
const sunHandles: SunHandles = { far: null, near: null };

/**
 * The sun: its own static map over the prepared world, and a black light that
 * carries the fine map round the eye (lighting.ts explains the pairing).
 */
function Sun({ built }: { built: PreparedWorld }) {
  const far = useRef<DirectionalLight>(null);
  const near = useRef<DirectionalLight>(null);
  const gl = useThree((s) => s.gl);
  const station = built.anchor;
  const radius = built.shadowRadius;
  useLayoutEffect(() => {
    const l = far.current;
    if (!l) return;
    l.position.set(station.x + SUN_DIR.x * 600, 900 + SUN_DIR.y * 600, station.z + SUN_DIR.z * 600);
    l.target.position.set(station.x, 380, station.z);
    l.target.updateMatrixWorld();
    const c = l.shadow.camera;
    c.left = -radius;
    c.right = radius;
    c.top = radius;
    c.bottom = -radius;
    c.near = 10;
    c.far = 2400;
    c.updateProjectionMatrix();
    c.layers.set(0);
    c.layers.enable(LAYER_FAR_CASTERS);
    l.shadow.autoUpdate = false;
    l.shadow.needsUpdate = true;
    gl.shadowMap.needsUpdate = true;
  }, [station, radius, gl]);
  useLayoutEffect(() => {
    const l = near.current;
    if (!l) return;
    const c = l.shadow.camera;
    c.left = -NEAR_SHADOW_M;
    c.right = NEAR_SHADOW_M;
    c.top = NEAR_SHADOW_M;
    c.bottom = -NEAR_SHADOW_M;
    c.near = 1;
    c.far = 400;
    c.updateProjectionMatrix();
    c.layers.set(0);
    c.layers.enable(LAYER_NEAR_CASTERS);
    l.shadow.autoUpdate = false;
    // drawn on the very first shadow pass: a light without a map would leave its slot in the
    // shadow-sampler array to three's colour placeholder, and every draw that reads it fails
    l.shadow.needsUpdate = true;
    gl.shadowMap.needsUpdate = true;
  }, [gl]);
  useEffect(() => {
    sunHandles.far = far.current;
    sunHandles.near = near.current;
    return () => {
      sunHandles.far = null;
      sunHandles.near = null;
    };
  }, []);
  return (
    <>
      <directionalLight
        ref={far}
        color={SUN_COLOR}
        intensity={SUN_INTENSITY}
        castShadow
        shadow-mapSize={[3072, 3072]}
        // about one texel of the ~0.3 m map: without it the ground shadows itself in a lattice
        // (acne) on slopes the sun grazes; small casters near the eye take the fine map
        shadow-bias={-0.0002}
        shadow-normalBias={0.4}
        shadow-radius={2}
      />
      {/* black: only its shadow map counts (the replay's materials read it as the sun's near shadow) */}
      <directionalLight
        ref={near}
        color="#000000"
        intensity={0}
        castShadow
        shadow-mapSize={[NEAR_SHADOW_MAP, NEAR_SHADOW_MAP]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-radius={2.5}
      />
    </>
  );
}

/** Move the near shadow box to (x, z) at ground height y, snapped to its texels so edges don't crawl. */
function placeNearSun(l: DirectionalLight, x: number, y: number, z: number) {
  const texel = (2 * NEAR_SHADOW_M) / NEAR_SHADOW_MAP;
  // snap in the light's own frame: along two axes perpendicular to the sun
  const sx = Math.round(x / texel) * texel;
  const sz = Math.round(z / texel) * texel;
  l.target.position.set(sx, y, sz);
  l.target.updateMatrixWorld();
  l.position.set(sx + SUN_DIR.x * 150, y + SUN_DIR.y * 150, sz + SUN_DIR.z * 150);
  l.updateMatrixWorld();
}

// ───────────────────────────────────────────── ground

function Ground({ built, textures }: { built: PreparedWorld; textures: Texture[] }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const { material, uniforms } = useMemo(() => {
    const t: GroundTextures = { albedo: textures.slice(0, 4) as GroundTextures['albedo'], normal: textures.slice(4, 8) as GroundTextures['normal'] };
    prepareGroundTextures(t, Math.min(16, gl.capabilities.getMaxAnisotropy()));
    return createGroundMaterial(t, t.albedo.map(averageColor));
  }, [textures, gl]);
  useEffect(() => () => material.dispose(), [material]);

  // the road's and the water courses' segments round this world, for the shader's exact distances
  useEffect(() => {
    const c = built.anchor;
    const fill = (lines: W2[][], target: { value: Vector4[] }, count: { value: number }) => {
      const segs: [W2, W2][] = [];
      for (const l of lines) for (let i = 0; i + 1 < l.length; i++) if (Math.hypot(l[i].x - c.x, l[i].z - c.z) < 2600) segs.push([l[i], l[i + 1]]);
      // too many: join neighbours (the lines are smooth curves sampled densely)
      let s = segs;
      while (s.length > LINE_SEGMENTS) {
        const next: [W2, W2][] = [];
        for (let i = 0; i < s.length; i += 2) next.push(i + 1 < s.length && s[i][1] === s[i + 1][0] ? [s[i][0], s[i + 1][1]] : s[i]);
        if (next.length === s.length) break;
        s = next;
      }
      s.slice(0, LINE_SEGMENTS).forEach(([a, b], k) => target.value[k].set(a.x, a.z, b.x, b.z));
      count.value = Math.min(LINE_SEGMENTS, s.length);
    };
    const ravine = waterCourses().ravine.pts.map(([E, N]) => ({ x: E - 500, z: 600 - N }));
    fill([ROAD_LINE.pts], uniforms.uRoadSeg, uniforms.uRoadN);
    fill([STREAM_LINE.pts, ravine], uniforms.uWaterSeg, uniforms.uWaterN);
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __replayGround?: object }).__replayGround = uniforms;
    invalidate();
  }, [built, uniforms, invalidate]);

  // the contact map, redrawn round the eye as it moves
  const contact = useMemo(() => new ContactMap(), []);
  useEffect(() => () => contact.dispose(), [contact]);
  const prints = useMemo(() => footprints(built), [built]);
  useEffect(() => {
    contact.center = null;
    invalidate();
  }, [prints, contact, invalidate]);
  useFrame(() => {
    const c = contact.center;
    const p = camera.position;
    if (!c || Math.hypot(p.x - c.x, p.z - c.z) > CONTACT_STEP_M) {
      contact.draw(gl, p.x, p.z, prints);
      uniforms.uContact.value = contact.target.texture;
      uniforms.uContactRect.value.copy(contact.rect);
    }
  });
  return <mesh geometry={built.geometry} material={material} position={[built.anchor.x, 0, built.anchor.z]} receiveShadow />;
}

/** The footprints of everything standing on the ground (x, z, radius, strength). */
function footprints(b: PreparedWorld): Footprint[] {
  const out: Footprint[] = [];
  for (const it of b.rocks) out.push([it.x, it.z, it.scale * 0.68, 0.62]);
  for (const it of b.stones) out.push([it.x, it.z, it.scale * 0.62 + 0.02, 0.32]);
  for (const it of b.shrubsNear) out.push([it.x, it.z, it.scale * SHRUB_SIZE * 0.62, 0.58]);
  for (const it of b.cushions) out.push([it.x, it.z, it.scale * DWARF_SIZE * 0.4, 0.5]);
  for (const it of b.grass) out.push([it.x, it.z, 0.06 + it.scale * GRASS_SIZE * 0.32, 0.32]);
  for (const t of replayTrees()) {
    out.push([t.x, t.z, t.crown.radiusM * 0.95, 0.34]);
    out.push([t.x, t.z, 0.5 + t.crown.radiusM * 0.12, 0.5]);
  }
  return out;
}

// ───────────────────────────────────────────── instances

const tmpObj = new Object3D();
const tmpE = new Euler();
const tmpQ = new Quaternion();
const tmpC = new Color();

/** An instance's matrix: on the ground, turned, tipped a little, its proportions varied by its tint. */
function writer(size: number, sink: number, scaleY: number, tint: (it: Instance, c: Color) => void) {
  return (it: Instance, m: Float32Array, mo: number, c: Float32Array, co: number) => {
    tmpE.set(it.tilt, it.rot, it.tilt * 0.6, 'YXZ');
    tmpQ.setFromEuler(tmpE);
    const s = it.scale * size;
    tmpObj.position.set(it.x, it.y - sink * s, it.z);
    tmpObj.quaternion.copy(tmpQ);
    tmpObj.scale.set(s * (0.86 + 0.28 * it.tint), s * scaleY * (0.84 + 0.3 * it.tint), s * (1.12 - 0.22 * it.tint));
    tmpObj.updateMatrix();
    tmpObj.matrix.toArray(m, mo);
    tint(it, tmpC);
    c[co] = tmpC.r;
    c[co + 1] = tmpC.g;
    c[co + 2] = tmpC.b;
  };
}

/** Model sizes: a unit instance's maquis is 1 m tall ×SHRUB_SIZE, a dwarf shrub 0.5 m ×DWARF_SIZE, a grass clump 0.35 m. */
const SHRUB_SIZE = 1.25;
const DWARF_SIZE = 1.5;
const GRASS_SIZE = 1.0;

// colour variation: dark glossy lentisk ↔ grey-green ↔ olive
const SHRUB_TINTS = [new Color(0.82, 0.92, 0.74), new Color(0.98, 1.02, 0.88), new Color(0.9, 0.94, 0.82), new Color(1.04, 1.0, 0.84)];
const shrubTint = (i: Instance, c: Color) => c.copy(SHRUB_TINTS[Math.floor(i.tint * SHRUB_TINTS.length)]).multiplyScalar(0.86 + 0.26 * i.tint);
const dwarfTint = (i: Instance, c: Color) => c.setRGB(0.9 + 0.2 * i.tint, 0.9 + 0.16 * i.tint, 0.88 + 0.1 * i.tint);
const grassTint = (i: Instance, c: Color) => c.setRGB(0.88 + 0.26 * i.tint, 0.86 + 0.22 * i.tint, 0.8 + 0.16 * i.tint);
/** Each rock a shade of its own: paler and greyer, a little warmer, the odd one stained with terra rossa. */
const rockTint = (i: Instance, c: Color) => {
  const v = 0.82 + 0.3 * i.tint;
  return i.tint > 0.88 ? c.setRGB(v * 1.06, v * 0.95, v * 0.84) : c.setRGB(v * (0.99 + 0.03 * i.tint), v, v * (1.0 - 0.05 * i.tint));
};

/** A set of plant variants: their glTF names, and per variant its foliage look. */
type PlantSet = { kind: 'shrub' | 'dwarf' | 'grass' | 'tree'; variants: string[]; looks: string[] };
const MAQUIS: PlantSet = { kind: 'shrub', variants: ['maquis_0', 'maquis_1', 'maquis_2', 'maquis_3'], looks: ['maquis', 'maquis', 'lucida', 'maquis'] };
const DWARF: PlantSet = { kind: 'dwarf', variants: ['dwarf_0', 'dwarf_1', 'dwarf_2', 'dwarf_3'], looks: ['dwarf', 'sage', 'dwarf', 'sage'] };
const GRASS: PlantSet = { kind: 'grass', variants: ['grass_0', 'grass_1', 'grass_2'], looks: ['grass', 'grass', 'grass'] };

/**
 * Foliage looks: leaf atlas, wood atlas, colour. The crowns' clusters are renders of the scans'
 * own outer foliage; the colours move each towards its Mediterranean counterpart — the dark, dull
 * green of lentisk and kermes oak, the grey-green of the olive, the dusty brown-grey of a dwarf
 * shrub dried in autumn, straw grass.
 */
function foliageKit(textures: Texture[]) {
  const looks = {
    maquis: { leaf: PT.cMaquis, wood: PT.burchellii, look: { tint: new Color(1.0, 1.06, 0.88), desat: 0.15, translucency: 0.3, fill: 0.12, coverage: 0.3, key: 'maquis' } },
    lucida: { leaf: PT.cLucida, wood: PT.lucida, look: { tint: new Color(0.98, 1.02, 0.86), desat: 0.25, translucency: 0.3, fill: 0.12, coverage: 0.3, key: 'lucida' } },
    // thorny burnet and dry sage: grey-brown and grey-green cushions, dried in autumn
    dwarf: { leaf: PT.cDwarf, wood: PT.rooibos, look: { tint: new Color(1.3, 1.22, 1.08), desat: 0.5, translucency: 0.12, fill: 0.12, key: 'dwarf' } },
    sage: { leaf: PT.cLucida, wood: PT.rooibos, look: { tint: new Color(1.12, 1.14, 1.04), desat: 0.62, translucency: 0.15, fill: 0.12, key: 'sage' } },
    grass: { leaf: PT.grass, wood: PT.grass, look: { tint: new Color(0.74, 0.68, 0.58), desat: 0.2, translucency: 0.25, fill: 0.04, key: 'grass' } },
    oak: { leaf: PT.cMaquis, wood: PT.oakBark, look: { tint: new Color(1.0, 1.08, 0.86), desat: 0.15, translucency: 0.35, fill: 0.16, coverage: 0.5, key: 'oak' } },
    olive: { leaf: PT.cLucida, wood: PT.oakBark, look: { tint: new Color(1.04, 1.08, 0.98), desat: 0.6, translucency: 0.25, fill: 0.12, coverage: 0.5, key: 'olive' } },
    pine: { leaf: PT.cPine, wood: PT.pineBark, look: { tint: new Color(0.92, 1.0, 0.86), desat: 0.1, translucency: 0.25, fill: 0.1, coverage: 0.5, key: 'pine' } },
  };
  const foliage = new Map<string, MeshStandardMaterial>();
  const wood = new Map<string, MeshStandardMaterial>();
  for (const [name, l] of Object.entries(looks)) {
    foliage.set(name, createFoliageMaterial(textures[l.leaf], l.look));
    // the barks: the oak's a mid grey-brown, the Aleppo pine's paler and greyer up the bole
    const bark = name === 'pine' ? new Color(1.45, 1.38, 1.3) : name === 'oak' || name === 'olive' ? new Color(1.05, 1.0, 0.95) : new Color(0.86, 0.84, 0.8);
    wood.set(name, createWoodMaterial(textures[l.wood], bark, name));
  }
  return { foliage, wood, dispose: () => [...foliage.values(), ...wood.values()].forEach((m) => m.dispose()) };
}

/** Field variants of a plant set (lod0 near, lod1 beyond), with occlusion and normals added. */
function variantsOf(set: PlantSet, geos: Map<string, BufferGeometry>, kit: ReturnType<typeof foliageKit>, levels: number[], frames?: CrownFrame[]): FieldVariant[] {
  return set.variants.map((v, vi) => {
    const lod = (l: string) => ({ leaf: geos.get(`${v}_${l}_leaf`), wood: geos.get(`${v}_${l}_wood`) });
    const l0 = lod('lod0');
    const l1 = lod('lod1');
    const f = preparePlant(set.kind, l0.leaf, l0.wood);
    preparePlant(set.kind, l1.leaf, l1.wood);
    frames?.push(f);
    const look = set.looks[vi];
    const parts = (l: { leaf?: BufferGeometry; wood?: BufferGeometry }) => [
      ...(l.leaf ? [{ geometry: l.leaf, material: kit.foliage.get(look)! }] : []),
      ...(l.wood ? [{ geometry: l.wood, material: kit.wood.get(look)! }] : []),
    ];
    return { levels: [{ parts: parts(l0), until: levels[0] }, { parts: parts(l1), until: levels[1] }] };
  });
}

/** Plants' level boundaries, m: [lod0 until, lod1 until]. */
const SHRUB_LEVELS = [30, 240];
const DWARF_LEVELS = [15, 72];
const GRASS_LEVELS = [9, 31];

function Plants({ built, geos, textures, farAtlas }: { built: PreparedWorld; geos: Map<string, BufferGeometry>; textures: Texture[]; farAtlas: Texture }) {
  const camera = useThree((s) => s.camera);
  const kit = useMemo(() => {
    const k = foliageKit(textures);
    return { k, maquis: variantsOf(MAQUIS, geos, k, SHRUB_LEVELS), dwarf: variantsOf(DWARF, geos, k, DWARF_LEVELS), grass: variantsOf(GRASS, geos, k, GRASS_LEVELS) };
  }, [geos, textures]);
  useEffect(() => () => kit.k.dispose(), [kit]);

  const fields = useMemo(() => {
    const maquis = new InstanceField(
      { variants: kit.maquis, cell: 24, fade: 0.1, write: writer(SHRUB_SIZE, 0.03, 1, shrubTint), radius: (it) => it.scale * SHRUB_SIZE },
      built.shrubsNear,
    );
    const dwarf = new InstanceField(
      { variants: kit.dwarf, cell: 12, fade: 0.1, write: writer(DWARF_SIZE, 0.05, 0.85, dwarfTint), radius: (it) => it.scale * DWARF_SIZE * 0.5 },
      built.cushions,
    );
    const grass = new InstanceField(
      { variants: kit.grass, cell: 8, fade: 0.12, write: writer(GRASS_SIZE, 0.02, 1, grassTint), radius: (it) => it.scale * GRASS_SIZE * 0.35 },
      built.grass,
    );
    return { maquis, dwarf, grass, all: [maquis, dwarf, grass] };
  }, [kit, built]);
  useEffect(() => () => fields.all.forEach((f) => f.dispose()), [fields]);

  const casters = useCasters(built, [
    { field: fields.maquis, near: 0, far: 1, farFilter: () => true },
    { field: fields.dwarf, near: 0, far: -1 },
    { field: fields.grass, near: 1, far: -1, nearRadius: 16 },
  ]);

  useFrame(() => {
    for (const f of fields.all) f.update(camera);
    if (process.env.NODE_ENV !== 'production') {
      const w = window as unknown as { __replayField?: object; __replayFields?: object };
      w.__replayField = { maquis: fields.maquis.stats(), dwarf: fields.dwarf.stats(), grass: fields.grass.stats() };
      w.__replayFields = { ...fields, kit, built };
    }
  });

  return (
    <>
      {fields.all.flatMap((f) => f.meshes).map((m) => (
        <primitive key={m.uuid} object={m} />
      ))}
      {casters.map((m) => (
        <primitive key={m.uuid} object={m} />
      ))}
      <FarShrubs list={built.shrubsFar} atlas={farAtlas} />
    </>
  );
}

type CasterSpec = { field: InstanceField; near: number; far: number; nearRadius?: number; farFilter?: () => boolean };

/**
 * Shadow casters of some fields: a near set refilled round the eye as it moves
 * (with the near shadow map), and a far set filled once over the world.
 */
function useCasters(built: PreparedWorld, specs: CasterSpec[]) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const sets = useMemo(() => {
    const near: { set: CasterSet; radius: number }[] = [];
    const far: CasterSet[] = [];
    for (const s of specs) {
      near.push({ set: s.field.casters(s.near, LAYER_NEAR_CASTERS), radius: s.nearRadius ?? NEAR_SHADOW_M + 6 });
      if (s.far >= 0) far.push(s.field.casters(s.far, LAYER_FAR_CASTERS));
    }
    for (const f of far) f.fill(built.anchor.x, built.anchor.z, built.shadowRadius);
    return { near, far };
    // the fields carry the world; specs are rebuilt with them
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built, ...specs.map((s) => s.field)]);
  useEffect(() => () => [...sets.near.map((n) => n.set), ...sets.far].forEach((s) => s.dispose()), [sets]);
  const at = useRef<{ x: number; z: number } | null>(null);
  useEffect(() => {
    at.current = null;
  }, [sets]);
  useFrame(() => {
    const p = camera.position;
    const c = at.current;
    const l = sunHandles.near;
    if (!l) return;
    if (!c || Math.hypot(p.x - c.x, p.z - c.z) > NEAR_SHADOW_STEP_M) {
      for (const n of sets.near) n.set.fill(p.x, p.z, n.radius);
      placeNearSun(l, p.x, p.y - 1.7, p.z);
      l.shadow.needsUpdate = true;
      gl.shadowMap.needsUpdate = true;
      at.current = { x: p.x, z: p.z };
    }
  });
  return useMemo(() => [...sets.near.flatMap((n) => n.set.meshes), ...sets.far.flatMap((f) => f.meshes)], [sets]);
}

/** Far maquis: a camera-facing card each, out to 1.5 km. */
function FarShrubs({ list, atlas }: { list: Instance[]; atlas: Texture }) {
  const bbGeo = useMemo(() => buildBillboardGeometry(), []);
  const bbMat = useMemo(
    () =>
      createBillboardMaterial(
        atlas,
        SUN_DIR.clone(),
        SUN_COLOR.clone().multiplyScalar(2.0),
        new Color().setStyle('#c4d6ec', SRGBColorSpace).multiplyScalar(0.8),
        new Color().setStyle('#6e5d45', SRGBColorSpace).multiplyScalar(0.7),
      ),
    [atlas],
  );
  useEffect(
    () => () => {
      bbGeo.dispose();
      bbMat.dispose();
    },
    [bbGeo, bbMat],
  );
  const far = useMemo(() => {
    const m = new InstancedMesh(bbGeo, bbMat, Math.max(1, list.length));
    const variant = new Float32Array(list.length);
    const tint = new Float32Array(list.length * 3);
    list.forEach((s, k) => {
      const sc = s.scale * 1.15;
      tmpObj.position.set(s.x, s.y - 0.05, s.z);
      tmpObj.quaternion.identity();
      tmpObj.scale.set(sc, sc, sc);
      tmpObj.updateMatrix();
      m.setMatrixAt(k, tmpObj.matrix);
      variant[k] = s.variant % 4;
      shrubTint(s, tmpC);
      tint[k * 3] = tmpC.r * 0.92;
      tint[k * 3 + 1] = tmpC.g * 0.92;
      tint[k * 3 + 2] = tmpC.b * 0.92;
    });
    m.geometry = bbGeo.clone();
    m.geometry.setAttribute('aVariant', new InstancedBufferAttribute(variant, 1));
    m.geometry.setAttribute('aTint', new InstancedBufferAttribute(tint, 3));
    m.count = list.length;
    m.frustumCulled = false;
    return m;
  }, [list, bbGeo, bbMat]);
  useEffect(
    () => () => {
      far.geometry.dispose();
      far.dispose();
    },
    [far],
  );
  return <primitive object={far} />;
}

// ───────────────────────────────────────────── rocks

function Rocks({ built, gltf, textures, detail }: { built: PreparedWorld; gltf: { scene: Object3D }; textures: Texture[]; detail: { albedo: Texture; normal: Texture } }) {
  const camera = useThree((s) => s.camera);
  const kit = useMemo(() => {
    const geos = meshesByName(gltf.scene);
    const materials = Array.from({ length: ROCK_COUNT }, (_, k) => createRockMaterial(textures[k], textures[ROCK_COUNT + k], `r${k}`, detail));
    const variants = (levels: number[]): FieldVariant[] =>
      materials.map((mat, k) => {
        const g0 = geos.get(`rock_${k}_lod0`)!;
        const g1 = geos.get(`rock_${k}_lod1`)!;
        return { levels: [{ parts: [{ geometry: g0, material: mat }], until: levels[0] }, { parts: [{ geometry: g1, material: mat }], until: levels[1] }] };
      });
    geos.forEach((g) => prepareRock(g));
    return { rocks: variants([24, 240]), stones: variants([9, 55]), materials, geos };
  }, [gltf, textures, detail.albedo, detail.normal]);
  useEffect(
    () => () => {
      kit.materials.forEach((m) => m.dispose());
      kit.geos.forEach((g) => g.dispose());
    },
    [kit],
  );
  const fields = useMemo(() => {
    const rocks = new InstanceField(
      {
        variants: kit.rocks,
        cell: 24,
        fade: 0.1,
        // bigger rocks stay in view further
        reach: (it) => Math.min(1.7, Math.max(0.3, it.scale / 0.8)),
        write: writer(1, 0.12, 1, rockTint),
        radius: (it) => it.scale * 0.7,
      },
      built.rocks,
    );
    const stones = new InstanceField(
      { variants: kit.stones, cell: 10, fade: 0.12, reach: (it) => Math.min(1.3, Math.max(0.4, it.scale / 0.22)), write: writer(1, 0.1, 1, rockTint), radius: (it) => it.scale * 0.7 },
      built.stones,
    );
    return { rocks, stones, all: [rocks, stones] };
  }, [kit, built]);
  useEffect(() => () => fields.all.forEach((f) => f.dispose()), [fields]);
  const casters = useCasters(built, [
    { field: fields.rocks, near: 0, far: 1 },
    { field: fields.stones, near: 1, far: -1, nearRadius: 22 },
  ]);
  useFrame(() => {
    for (const f of fields.all) f.update(camera);
  });
  return (
    <>
      {fields.all.flatMap((f) => f.meshes).map((m) => (
        <primitive key={m.uuid} object={m} />
      ))}
      {casters.map((m) => (
        <primitive key={m.uuid} object={m} />
      ))}
    </>
  );
}

// ───────────────────────────────────────────── trees

/**
 * The lab's oaks, olives and pines at their map positions and crown sizes: two
 * scanned oak forms (gnarled trunks and their real branching, crowns rebuilt
 * from leaf clusters at the scans' leaf positions), the olive grove from the
 * second form in silver-green, and Aleppo pines — an open needle crown on a
 * tall bole. Each model is fitted to its tree's crown (radius, top) and turned
 * by the tree's own spin; near trees full, far ones lighter.
 */
type TreeInstance = Instance & { sxz: number; sy: number };
const TREE_SET: PlantSet = { kind: 'tree', variants: ['oak_0', 'oak_1', 'oak_1', 'pine_0', 'pine_1'], looks: ['oak', 'oak', 'olive', 'pine', 'pine'] };
const TREE_LEVELS = [55, 4000];

function Woodland({ built, geos, textures }: { built: PreparedWorld; geos: Map<string, BufferGeometry>; textures: Texture[] }) {
  const camera = useThree((s) => s.camera);
  const kit = useMemo(() => {
    const k = foliageKit(textures);
    const frames: CrownFrame[] = [];
    const variants = variantsOf(TREE_SET, geos, k, TREE_LEVELS, frames);
    return { k, variants, frames };
  }, [geos, textures]);
  useEffect(() => () => kit.k.dispose(), [kit]);
  const list = useMemo(
    () =>
      replayTrees().map((t, i): TreeInstance => {
        const variant = t.kind === 'pine' ? 3 + (i % 2) : t.kind === 'olive' ? 2 : i % 2;
        const f = kit.frames[variant];
        const top = t.crown.centerM + t.crown.halfHeightM - t.baseM;
        return { x: t.x, z: t.z, y: t.baseM, scale: 1, rot: t.spin, tilt: 0, variant, tint: t.tone, dist: 0, sxz: t.crown.radiusM / f.radius, sy: top / f.top };
      }),
    [kit],
  );
  const field = useMemo(
    () =>
      new InstanceField(
        {
          variants: kit.variants,
          cell: 40,
          fade: 0.12,
          write: (it, m, mo, c, co) => {
            const t = it as TreeInstance;
            tmpObj.position.set(t.x, t.y - 0.15, t.z);
            tmpObj.rotation.set(0, t.rot, 0);
            tmpObj.scale.set(t.sxz, t.sy, t.sxz);
            tmpObj.updateMatrix();
            tmpObj.matrix.toArray(m, mo);
            const v = 0.84 + 0.3 * t.tint;
            c[co] = v * (0.98 + 0.06 * t.tint);
            c[co + 1] = v;
            c[co + 2] = v * (0.96 - 0.04 * t.tint);
          },
          radius: (it) => (it as TreeInstance).sy * 6,
        },
        list,
      ),
    [kit, list],
  );
  useEffect(() => () => field.dispose(), [field]);
  const casters = useCasters(built, [{ field, near: 0, far: 1 }]);
  useFrame(() => field.update(camera));
  return (
    <>
      {field.meshes.map((m) => (
        <primitive key={m.uuid} object={m} />
      ))}
      {casters.map((m) => (
        <primitive key={m.uuid} object={m} />
      ))}
    </>
  );
}
