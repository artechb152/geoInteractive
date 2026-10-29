'use client';
/**
 * The live view of the navigation replay: the ground around one station, seen
 * from the navigator's eye (ground + 1.7 m). Loaded lazily (next/dynamic,
 * ssr:false) by ReplayView, which owns the frame, the controls, the loading
 * line and the fallback.
 *
 * Budget (desktop): one polar ground mesh (~0.7 M triangles out to 16 km),
 * instanced maquis (leaf-card shrubs near, billboards to 1.5 km), grass tufts
 * to 30 m, scanned stones and rocks; one sun shadow map around the
 * station (3072², ±165 m), refreshed only when the station changes; frameloop "demand" (a
 * frame only when the look changes), paused off-screen; DPR ≤ 1.5.
 */
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import {
  NeutralToneMapping,
  BackSide,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  FogExp2,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Euler,
  Vector3,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three';
import { LESSON_FIT_CANVAS_RESIZE } from '@/components/lesson/LessonViewportFit';
import { StationTerrain, buildGrid, type TerrainGrid } from './replayTerrain';
import { scatter, type Ground, type Instance } from './replayScatter';
import { EYE_HEIGHT_M, type ViewStore } from './replayViewStore';
import type { W2 } from './replayWorld';
import { buildTerrainGeometry } from './scene/terrainMesh';
import { createTerrainMaterial, prepareGroundTextures } from './scene/terrainMaterial';
import { buildBillboardGeometry, buildGrassGeometry, buildShrubGeometry, createBillboardMaterial, createGrassMaterial, createShrubMaterial } from './scene/vegetation';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const REPLAY_ASSETS = `${BASE}/assets/lessons/topic06/navigation-replay`;
const LAYERS = ['grass', 'soil', 'limestone', 'gravel'] as const;
const TEXTURE_URLS = [
  ...LAYERS.map((l) => `${REPLAY_ASSETS}/ground/${l}_albedo.webp`),
  ...LAYERS.map((l) => `${REPLAY_ASSETS}/ground/${l}_normal.webp`),
  `${REPLAY_ASSETS}/sky.webp`,
  `${REPLAY_ASSETS}/shrub_leaves.webp`,
  `${REPLAY_ASSETS}/shrub_far.webp`,
];
const ROCKS_URL = `${REPLAY_ASSETS}/rocks.glb`;

/** Afternoon sun from the south-west, 50° up — where the sky photograph has it. */
const SUN_AZ = 235;
const SUN_EL = 50;
const D2R = Math.PI / 180;
const SUN_DIR = new Vector3(Math.sin(SUN_AZ * D2R) * Math.cos(SUN_EL * D2R), Math.sin(SUN_EL * D2R), -Math.cos(SUN_AZ * D2R) * Math.cos(SUN_EL * D2R));
/** The sky photo's sun sits at u = 0.588 of its width. */
const SKY_U_OFFSET = 0.588 - SUN_AZ / 360;
/** Horizon haze (sRGB) — the sky's own colour just above the horizon. */
const HAZE = new Color().setStyle('#bcc6d2', SRGBColorSpace);
const FOG_DENSITY = 0.000105;
const SUN_COLOR = new Color(1, 0.95, 0.88);
const SKY_LIGHT = new Color().setStyle('#c4d6ec', SRGBColorSpace);
const GROUND_LIGHT = new Color().setStyle('#6e5d45', SRGBColorSpace);

export type SceneProps = {
  stationKey: string;
  station: W2;
  view: ViewStore;
  /** In view: draw on demand; off-screen: no frames at all. */
  active: boolean;
  onReady: () => void;
  /** A new station is being built (true) / drawn (false). */
  onBusy: (busy: boolean) => void;
  onLost: () => void;
  /** Every station of the replay: prepared in the background once the first is drawn. */
  prefetch: [string, W2][];
  /** The lazy chunk is in: the wrapper's loading line takes over from next/dynamic's. */
  onMount?: () => void;
};

export default function ReplayScene3D(props: SceneProps) {
  const { onMount } = props;
  // before the first paint, so no frame goes by without a loading line
  useLayoutEffect(() => onMount?.(), [onMount]);
  return (
    <Canvas
      frameloop={props.active ? 'demand' : 'never'}
      dpr={[1, 1.5]}
      shadows
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 54, near: 0.1, far: 30000, position: [props.station.x, 400, props.station.z] }}
      resize={LESSON_FIT_CANVAS_RESIZE}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = NeutralToneMapping;
        gl.toneMappingExposure = 0.82;
        gl.shadowMap.type = PCFShadowMap;
        gl.shadowMap.autoUpdate = false;
        scene.fog = new FogExp2(HAZE.getHex(), FOG_DENSITY);
        scene.background = HAZE.clone();
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          props.onLost();
        });
      }}
      style={{ position: 'absolute', inset: 0 }}
      data-replay-canvas=""
    >
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  );
}

// ───────────────────────────────────────────── terrain building (cached per station)

let sharedGrids: Promise<{ core: TerrainGrid; coarse: TerrainGrid }> | null = null;
const localGrids = new Map<string, Promise<TerrainGrid>>();

function getShared() {
  sharedGrids ??= (async () => {
    const coarse = await buildGrid(0, 0, 17000, 140, false);
    const core = await buildGrid(0, 0, 1650, 8, true);
    return { core, coarse };
  })();
  return sharedGrids;
}
function getLocal(key: string, s: W2) {
  let p = localGrids.get(key);
  if (!p) {
    p = buildGrid(s.x, s.z, 320, 2, true);
    localGrids.set(key, p);
  }
  return p;
}

type Built = {
  key: string;
  terrain: StationTerrain;
  geometry: BufferGeometry;
  eyeY: number;
  shrubsNear: Instance[];
  shrubsFar: Instance[];
  grass: Instance[];
  cushions: Instance[];
  stones: Instance[];
  rocks: Instance[];
};

async function buildStation(key: string, s: W2): Promise<Built> {
  const [{ core, coarse }, local] = await Promise.all([getShared(), getLocal(key, s)]);
  const terrain = new StationTerrain([local, core, coarse]);
  const ground: Ground = {
    height: (x, z) => terrain.height(x, z),
    road: (x, z) => terrain.road(x, z),
    stream: (x, z) => terrain.stream(x, z),
  };
  const geometry = buildTerrainGeometry(terrain, s.x, s.z);
  await new Promise((r) => setTimeout(r, 0));
  return {
    key,
    terrain,
    geometry,
    eyeY: terrain.height(s.x, s.z) + EYE_HEIGHT_M,
    shrubsNear: scatter('shrub', s.x, s.z, ground, { far: 240 }),
    shrubsFar: scatter('shrub', s.x, s.z, ground, { near: 240, far: 1500, stride: 2 }),
    grass: scatter('grass', s.x, s.z, ground),
    cushions: scatter('cushion', s.x, s.z, ground),
    stones: [...scatter('stone', s.x, s.z, ground), ...scatter('cobble', s.x, s.z, ground)],
    rocks: [...scatter('rock', s.x, s.z, ground), ...scatter('rockNear', s.x, s.z, ground)],
  };
}

// ───────────────────────────────────────────── the world

function World({ stationKey, station, view, onReady, onBusy, prefetch }: SceneProps) {
  const tex = useTexture(TEXTURE_URLS) as Texture[];
  const rocks = useGLTF(ROCKS_URL, false) as unknown as { scene: Object3D };
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const [built, setBuilt] = useState<Built | null>(null);

  const ground = useMemo(() => {
    const t = { albedo: tex.slice(0, 4) as [Texture, Texture, Texture, Texture], normal: tex.slice(4, 8) as [Texture, Texture, Texture, Texture] };
    prepareGroundTextures(t, Math.min(8, gl.capabilities.getMaxAnisotropy()));
    return t;
  }, [tex, gl]);
  const [skyTex, leaves, farAtlas] = [tex[8], tex[9], tex[10]];
  useMemo(() => {
    for (const t of [skyTex, leaves, farAtlas]) {
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = 4;
      t.needsUpdate = true;
    }
  }, [skyTex, leaves, farAtlas]);

  // build the station (async); keep showing the previous one until the new one is ready
  useEffect(() => {
    let cancelled = false;
    onBusy(true);
    buildStation(stationKey, station).then((b) => {
      if (cancelled) {
        b.geometry.dispose();
        return;
      }
      setBuilt(b);
      // read by the QA scripts (instance budget, station)
      (window as unknown as { __replayStats?: object }).__replayStats = {
        station: b.key,
        terrainTriangles: (b.geometry.index?.count ?? 0) / 3,
        shrubsNear: b.shrubsNear.length,
        shrubsFar: b.shrubsFar.length,
        cushions: b.cushions.length,
        grass: b.grass.length,
        stones: b.stones.length,
        rocks: b.rocks.length,
        eyeY: b.eyeY,
      };
    });
    return () => {
      cancelled = true;
    };
    // station follows stationKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationKey]);

  // dispose a replaced terrain geometry
  useEffect(() => () => built?.geometry.dispose(), [built]);

  // shadows are static: redraw the shadow map once per station
  useEffect(() => {
    if (!built) return;
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [built, gl, invalidate]);

  // after idle time, prepare the other stations so moving between moments is quick
  useEffect(() => {
    if (!built) return;
    const id = window.setTimeout(() => {
      for (const [k, s] of prefetch) getLocal(k, s);
    }, 1500);
    return () => window.clearTimeout(id);
  }, [built, prefetch]);

  if (!built) return null;
  return (
    <>
      <CameraRig view={view} station={station} eyeY={built.eyeY} />
      <Sky texture={skyTex} />
      <Lights station={station} />
      <Terrain built={built} ground={ground} station={station} />
      <Shrubs built={built} leaves={leaves} farAtlas={farAtlas} />
      <Grass list={built.grass} />
      <Rocks gltf={rocks} stones={built.stones} rocks={built.rocks} />
      <FirstFrame stationKey={built.key} onReady={onReady} onBusy={onBusy} />
    </>
  );
}

function FirstFrame({ stationKey, onReady, onBusy }: { stationKey: string; onReady: () => void; onBusy: (b: boolean) => void }) {
  const frames = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    frames.current = 0;
    invalidate();
  }, [stationKey, invalidate]);
  useFrame(() => {
    frames.current++;
    if (frames.current === 2) {
      onBusy(false);
      onReady();
    } else if (frames.current < 2) invalidate();
  });
  return null;
}

function CameraRig({ view, station, eyeY }: { view: ViewStore; station: W2; eyeY: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const off = view.subscribe(() => invalidate());
    return () => {
      off();
    };
  }, [view, invalidate]);
  useEffect(() => invalidate(), [station, eyeY, invalidate]);
  useFrame(() => {
    const running = view.step(performance.now());
    const l = view.get();
    camera.position.set(station.x, eyeY, station.z);
    camera.rotation.set(l.pitchDeg * D2R, -l.yawDeg * D2R, 0, 'YXZ');
    if (Math.abs(camera.fov - l.vfovDeg) > 1e-3) {
      camera.fov = l.vfovDeg;
      camera.updateProjectionMatrix();
    }
    if (running) invalidate();
  });
  return null;
}

function Sky({ texture }: { texture: Texture }) {
  const camera = useThree((s) => s.camera);
  const mesh = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uSky: { value: texture }, uOffset: { value: SKY_U_OFFSET }, uHaze: { value: HAZE }, uExposure: { value: 1.12 } },
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
            vec3 c = texture2D(uSky, vec2(u, 1.0 - clamp(vImg, 0.0, 0.995))).rgb * uExposure;
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

function Lights({ station }: { station: W2 }) {
  const sun = useRef<DirectionalLight>(null);
  useLayoutEffect(() => {
    const l = sun.current;
    if (!l) return;
    l.position.set(station.x + SUN_DIR.x * 600, 900 + SUN_DIR.y * 600, station.z + SUN_DIR.z * 600);
    l.target.position.set(station.x, 380, station.z);
    l.target.updateMatrixWorld();
    const c = l.shadow.camera;
    c.left = -165;
    c.right = 165;
    c.top = 165;
    c.bottom = -165;
    c.near = 10;
    c.far = 2400;
    c.updateProjectionMatrix();
  }, [station]);
  return (
    <>
      <directionalLight ref={sun} color={SUN_COLOR} intensity={4.0} castShadow shadow-mapSize={[3072, 3072]} shadow-bias={-0.0004} shadow-normalBias={0.05} />
      <hemisphereLight args={[SKY_LIGHT, GROUND_LIGHT, 0.68]} />
    </>
  );
}

function Terrain({ built, ground, station }: { built: Built; ground: Parameters<typeof createTerrainMaterial>[0]; station: W2 }) {
  const { material } = useMemo(() => createTerrainMaterial(ground, station), [ground, station]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={built.geometry} material={material} position={[station.x, 0, station.z]} receiveShadow />;
}

// ───────────────────────────────────────────── instancing helpers

const tmpObj = new Object3D();
const tmpQ = new Quaternion();
const tmpE = new Euler();

function fillInstances(mesh: InstancedMesh, list: Instance[], opts: { size: number; sink?: number; tint: (i: Instance) => Color; scaleY?: number }) {
  list.forEach((it, k) => {
    tmpE.set(it.tilt, it.rot, it.tilt * 0.6, 'YXZ');
    tmpQ.setFromEuler(tmpE);
    // sink: a fraction of the instance's own size (m), so rocks sit in the ground, not under it
    tmpObj.position.set(it.x, it.y - (opts.sink ?? 0) * it.scale, it.z);
    tmpObj.quaternion.copy(tmpQ);
    const s = it.scale * opts.size;
    tmpObj.scale.set(s, s * (opts.scaleY ?? 1), s);
    tmpObj.updateMatrix();
    mesh.setMatrixAt(k, tmpObj.matrix);
    mesh.setColorAt(k, opts.tint(it));
  });
  mesh.count = list.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function Instanced({
  geometry,
  material,
  list,
  size,
  sink,
  scaleY,
  tint,
  shadow,
}: {
  geometry: BufferGeometry;
  material: Material;
  list: Instance[];
  size: number;
  sink?: number;
  scaleY?: number;
  tint: (i: Instance) => Color;
  shadow: boolean;
}) {
  const mesh = useMemo(() => {
    const m = new InstancedMesh(geometry, material, Math.max(1, list.length));
    m.instanceMatrix.setUsage(DynamicDrawUsage);
    m.castShadow = shadow;
    m.receiveShadow = true;
    return m;
  }, [geometry, material, list.length, shadow]);
  useLayoutEffect(() => {
    if (list.length) fillInstances(mesh, list, { size, sink, scaleY, tint });
    else mesh.count = 0;
  }, [mesh, list, size, sink, scaleY, tint]);
  useEffect(() => () => mesh.dispose(), [mesh]);
  return <primitive object={mesh} />;
}

/** Shrubs nearer than this cast shadows (the map is drawn once per station, so a wide one is cheap). */
const SHADOW_R = 150;

// shrub colours: dark glossy lentisk ↔ grey-green ↔ olive
const SHRUB_TINTS = [new Color(0.82, 0.92, 0.72), new Color(1.0, 1.02, 0.85), new Color(0.9, 0.9, 0.78), new Color(1.08, 1.04, 0.82)];
const CUSHION_TINTS = [new Color(1.05, 1.08, 0.95), new Color(1.2, 1.15, 0.95), new Color(0.95, 1.0, 0.9)];
const cushionTint = (i: Instance) => CUSHION_TINTS[Math.floor(i.tint * CUSHION_TINTS.length)].clone().multiplyScalar(0.95 + 0.3 * i.tint);
const shrubTint = (i: Instance) => SHRUB_TINTS[Math.floor(i.tint * SHRUB_TINTS.length)].clone().multiplyScalar(0.85 + 0.25 * i.tint);

function Shrubs({ built, leaves, farAtlas }: { built: Built; leaves: Texture; farAtlas: Texture }) {
  const geos = useMemo(() => [0, 1, 2, 3].map((v) => buildShrubGeometry(v)), []);
  const mat = useMemo(() => createShrubMaterial(leaves), [leaves]);
  const bbGeo = useMemo(() => buildBillboardGeometry(), []);
  const bbMat = useMemo(() => createBillboardMaterial(farAtlas, SUN_DIR.clone(), SUN_COLOR.clone().multiplyScalar(2.2), SKY_LIGHT.clone().multiplyScalar(0.85), GROUND_LIGHT.clone().multiplyScalar(0.7)), [farAtlas]);
  useEffect(
    () => () => {
      geos.forEach((g) => g.dispose());
      mat.dispose();
      bbGeo.dispose();
      bbMat.dispose();
    },
    [geos, mat, bbGeo, bbMat],
  );
  const groups = useMemo(() => {
    const near: Instance[][] = [[], [], [], []];
    const mid: Instance[][] = [[], [], [], []];
    const low: Instance[][] = [[], [], [], []];
    for (const s of built.shrubsNear) (s.dist < SHADOW_R ? near : mid)[s.variant].push(s);
    for (const s of built.cushions) low[s.variant].push(s);
    return { near, mid, low };
  }, [built]);
  const far = useMemo(() => {
    const m = new InstancedMesh(bbGeo, bbMat, Math.max(1, built.shrubsFar.length));
    const variant = new Float32Array(built.shrubsFar.length);
    const tint = new Float32Array(built.shrubsFar.length * 3);
    built.shrubsFar.forEach((s, k) => {
      const sc = s.scale * 1.15;
      tmpObj.position.set(s.x, s.y - 0.05, s.z);
      tmpObj.quaternion.identity();
      tmpObj.scale.set(sc, sc, sc);
      tmpObj.updateMatrix();
      m.setMatrixAt(k, tmpObj.matrix);
      variant[k] = s.variant % 4;
      const c = shrubTint(s);
      tint[k * 3] = c.r;
      tint[k * 3 + 1] = c.g;
      tint[k * 3 + 2] = c.b;
    });
    m.geometry = bbGeo.clone();
    m.geometry.setAttribute('aVariant', new InstancedBufferAttribute(variant, 1));
    m.geometry.setAttribute('aTint', new InstancedBufferAttribute(tint, 3));
    m.count = built.shrubsFar.length;
    m.frustumCulled = false;
    return m;
  }, [built, bbGeo, bbMat]);
  useEffect(
    () => () => {
      far.geometry.dispose();
      far.dispose();
    },
    [far],
  );
  return (
    <>
      {geos.map((g, v) => (
        <Instanced key={'n' + v} geometry={g} material={mat} list={groups.near[v]} size={1.25} sink={0.04} tint={shrubTint} shadow />
      ))}
      {geos.map((g, v) => (
        <Instanced key={'m' + v} geometry={g} material={mat} list={groups.mid[v]} size={1.25} sink={0.04} tint={shrubTint} shadow={false} />
      ))}
      {geos.map((g, v) => (
        <Instanced key={'c' + v} geometry={g} material={mat} list={groups.low[v]} size={1} sink={0.06} scaleY={0.7} tint={cushionTint} shadow />
      ))}
      <primitive object={far} />
    </>
  );
}

const GRASS_TINTS = [new Color(1.05, 1.0, 0.92), new Color(0.92, 0.95, 0.88), new Color(1.12, 1.02, 0.85)];
const grassTint = (i: Instance) => GRASS_TINTS[Math.floor(i.tint * GRASS_TINTS.length)].clone().multiplyScalar(0.8 + 0.35 * i.tint);

function Grass({ list }: { list: Instance[] }) {
  const geos = useMemo(() => [0, 1, 2].map((v) => buildGrassGeometry(v)), []);
  const mat = useMemo(() => createGrassMaterial(), []);
  useEffect(
    () => () => {
      geos.forEach((g) => g.dispose());
      mat.dispose();
    },
    [geos, mat],
  );
  const byVariant = useMemo(() => {
    const out: Instance[][] = [[], [], []];
    for (const g of list) out[g.variant % 3].push(g);
    return out;
  }, [list]);
  return (
    <>
      {geos.map((g, v) => (
        <Instanced key={v} geometry={g} material={mat} list={byVariant[v]} size={1} sink={0.02} tint={grassTint} shadow={false} />
      ))}
    </>
  );
}

/** Rocks and stones from rocks.glb, graded towards the region's pale limestone. */
function Rocks({ gltf, stones, rocks }: { gltf: { scene: Object3D }; stones: Instance[]; rocks: Instance[] }) {
  const parts = useMemo(() => {
    // each scan is normalised to 1 m across, so an instance's scale is its size in metres
    const rock: { geometry: BufferGeometry; material: Material; unit: number }[] = [];
    const stone: { geometry: BufferGeometry; material: Material; unit: number }[] = [];
    const graded = new Map<Material, Material>();
    gltf.scene.traverse((o: Object3D) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as MeshStandardMaterial;
      let m = graded.get(src);
      if (!m) {
        const c = src.clone();
        c.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            `#include <map_fragment>
// limestone: lift and desaturate the scans (moss and red sandstone → pale grey), keep their detail
float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
diffuseColor.rgb = mix(vec3(lum), diffuseColor.rgb, 0.3) * vec3(2.05, 2.0, 1.86) + 0.06;`,
          );
        };
        c.customProgramCacheKey = () => 'navigation-replay-rock-v1';
        graded.set(src, c);
        m = c;
      }
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox!;
      const across = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) || 1;
      (mesh.name.startsWith('stone') ? stone : rock).push({ geometry: mesh.geometry, material: m, unit: 1 / across });
    });
    return { rock, stone, graded };
  }, [gltf]);
  useEffect(() => () => parts.graded.forEach((m) => m.dispose()), [parts]);
  const split = (list: Instance[], n: number) => {
    const out: Instance[][] = Array.from({ length: n }, () => []);
    for (const it of list) out[it.variant % n].push(it);
    return out;
  };
  const rockSets = useMemo(() => split(rocks, parts.rock.length || 1), [rocks, parts]);
  const stoneSets = useMemo(() => split(stones, parts.stone.length || 1), [stones, parts]);
  const white = useMemo(() => () => new Color(1, 1, 1), []);
  return (
    <>
      {parts.rock.map((p, k) => (
        <Instanced key={'r' + k} geometry={p.geometry} material={p.material} list={rockSets[k]} size={p.unit} sink={0.1} tint={white} shadow />
      ))}
      {parts.stone.map((p, k) => (
        <Instanced key={'s' + k} geometry={p.geometry} material={p.material} list={stoneSets[k]} size={p.unit} sink={0.08} tint={white} shadow />
      ))}
    </>
  );
}

