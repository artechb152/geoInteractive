'use client';
/**
 * The live view of the navigation replay: the ground around one station, seen
 * from the navigator's eye (ground + 1.7 m). Loaded lazily (next/dynamic,
 * ssr:false) by ReplayView, which owns the frame, the controls, the loading
 * line and the fallback.
 *
 * Budget (desktop): one polar ground mesh (~0.7 M triangles at a station,
 * <1.4 M over the shared walking corridor, out to the same 16 km horizon),
 * instanced maquis (leaf-card shrubs near, billboards to 1.5 km), grass tufts
 * to 30 m, scanned stones and rocks; one sun shadow map around the
 * station/corridor (3072²), refreshed only when its prepared world changes;
 * frameloop "demand" (look or walking frames), paused off-screen; DPR ≤ 1.5.
 */
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import {
  NeutralToneMapping,
  BackSide,
  Color,
  CylinderGeometry,
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
import { createReplayPreparation, type PreparedWorld as Built } from './replayPreparation';
import { worldKey } from './replayBuildCache';
import type { WalkStore } from './replayWalk';
import type { Instance } from './replayScatter';
import { replayTrees } from './replayLandmarks';
import { EYE_HEIGHT_M, verticalFovForAspect, type ViewStore } from './replayViewStore';
import type { W2 } from './replayWorld';
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
  walk: WalkStore;
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

// ───────────────────────────────────────────── the world

function World({ stationKey, station, view, onReady, onBusy, onLost, walk }: SceneProps) {
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

  const preparation = useRef<ReturnType<typeof createReplayPreparation> | null>(null);
  const walkTarget = useSyncExternalStore(walk.subscribe, walk.target, walk.target);
  const desired = worldKey(walkTarget ?? stationKey);
  useEffect(() => {
    const cache = createReplayPreparation();
    preparation.current = cache;
    const qa = window as unknown as {__replayPreparation?:()=>object;__replayGpu?:()=>object};
    const inspect = () => ({ready:cache.ready,size:cache.size});
    const gpu = () => ({geometries:gl.info.memory.geometries,textures:gl.info.memory.textures});
    qa.__replayPreparation=inspect;qa.__replayGpu=gpu;
    return () => {
      cache.dispose(); preparation.current = null;
      if(qa.__replayPreparation===inspect)delete qa.__replayPreparation;
      if(qa.__replayGpu===gpu)delete qa.__replayGpu;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const id = walk.get().id;
    if (built?.key === desired) {
      onBusy(false);
      walk.ready(id);
      invalidate();
      return;
    }
    onBusy(true);
    preparation.current!.get(desired).then(b => {
      if (!cancelled) setBuilt(b);
    }).catch(() => { if (!cancelled) onLost(); });
    return () => { cancelled = true; };
    // A key identifies a prepared world. Camera/answer updates must not rebuild it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desired, walkTarget]);
  // dispose() frees the outgoing WebGL buffers; cached typed arrays remain
  // usable, so revisiting can upload them without another CPU build.
  useEffect(() => () => { built?.geometry.dispose(); }, [built]);
  useEffect(() => {
    if (!built) return;
    gl.shadowMap.needsUpdate = true;
    invalidate();
    (window as unknown as { __replayStats?: object }).__replayStats = {
      station: stationKey, world: built.key,
      terrainTriangles: (built.geometry.index?.count ?? 0) / 3,
      shrubsNear: built.shrubsNear.length, shrubsFar: built.shrubsFar.length,
      cushions: built.cushions.length, grass: built.grass.length,
      stones: built.stones.length, rocks: built.rocks.length,
      eyeY: built.terrain.height(station.x, station.z) + EYE_HEIGHT_M,
    };
  }, [built, stationKey, station, gl, invalidate]);
  // First draw the current station. Then spend small CPU batches preparing
  // the one future world; enroute and saddle share the same full corridor.
  useEffect(() => {
    if (!built) return;
    const cache = preparation.current!;
    const next = built.key === 'depart' ? 'approach' : built.key === 'approach' ? 'after' : null;
    if (!next) return;
    const id = window.setTimeout(() => { void cache.get(next).catch(() => {}); }, 180);
    return () => window.clearTimeout(id);
  }, [built]);

  if (!built) return null;
  return (
    <>
      <CameraRig view={view} station={station} built={built} walk={walk} />
      <Sky texture={skyTex} />
      <Lights station={built.anchor} radius={built.shadowRadius} />
      <Terrain built={built} ground={ground} station={built.anchor} />
      <Shrubs built={built} leaves={leaves} farAtlas={farAtlas} />
      <SharedWoodland leaves={leaves} />
      <Grass list={built.grass} />
      <Rocks gltf={rocks} stones={built.stones} rocks={built.rocks} />
      <FirstFrame stationKey={built.key} onReady={() => { onReady(); if (built.key === worldKey(walk.target() ?? stationKey)) walk.ready(); }} onBusy={onBusy} />
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

function CameraRig({ view, station, built, walk }: { view: ViewStore; station: W2; built: Built; walk: WalkStore }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const off = view.subscribe(() => invalidate());
    const offWalk = walk.subscribe(() => invalidate());
    return () => { off(); offWalk(); };
  }, [view, walk, invalidate]);
  useEffect(() => invalidate(), [station, built, invalidate]);
  useFrame((_, dt) => {
    walk.step(dt * 1000);
    const pose = walk.pose();
    const at = pose?.at ?? station;
    if (pose && walk.phase() !== 'preparing') view.set({yawDeg:pose.yawDeg,pitchDeg:pose.pitchDeg,vfovDeg:pose.vfovDeg});
    const running = view.step(performance.now());
    const l = view.get();
    camera.position.set(at.x, built.terrain.height(at.x,at.z) + EYE_HEIGHT_M, at.z);
    (window as unknown as {__replayEye?:object}).__replayEye={x:at.x,z:at.z,y:camera.position.y,ground:built.terrain.height(at.x,at.z),phase:walk.phase()};
    camera.rotation.set(l.pitchDeg * D2R, -l.yawDeg * D2R, 0, 'YXZ');
    const vfov = verticalFovForAspect(l.vfovDeg, camera.aspect);
    if (Math.abs(camera.fov - vfov) > 1e-3) { camera.fov = vfov; camera.updateProjectionMatrix(); }
    if (running || walk.phase() === 'walking') invalidate();
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

function Lights({ station, radius }: { station: W2; radius: number }) {
  const sun = useRef<DirectionalLight>(null);
  useLayoutEffect(() => {
    const l = sun.current;
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
  }, [station, radius]);
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
    tmpObj.scale.set(s * (0.8 + 0.4 * it.tint), s * (opts.scaleY ?? 1) * (0.78 + 0.35 * it.tint), s * (1.16 - 0.25 * it.tint));
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

/** Oaks, olives and pines occupy the exact lab landmark positions. Their
 * crowns use textured branch cards; the geometry remains genuinely 3D. */
function SharedWoodland({leaves}: {leaves: Texture}) {
  const resources = useMemo(() => {
    const list = replayTrees();
    const crownMaterial = createShrubMaterial(leaves);
    crownMaterial.roughness = 0.96;
    crownMaterial.color.setRGB(0.82,0.9,0.76);
    const trunkMaterial = new MeshStandardMaterial({color:'#66533c',roughness:1});
    const trunkGeometry = new CylinderGeometry(0.65,1,1,7);
    const crowns = [0,1,2,3].map(v=>{
      const geometry=buildShrubGeometry(v,280);
      const group=list.filter((_,i)=>i%4===v);
      const mesh=new InstancedMesh(geometry,crownMaterial,group.length);
      const transform=new Object3D();
      group.forEach((t,i)=>{
        const c=t.crown;
        const bottom=c.centerM-c.halfHeightM;
        transform.position.set(t.x,bottom,t.z);
        transform.rotation.set(0,t.spin,0);
        transform.scale.set(c.radiusM/0.68,c.halfHeightM*2/1.1,c.radiusM/0.65);
        transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
        mesh.setColorAt(i,new Color().setRGB(0.73+t.tone*.16,0.84+t.tone*.17,0.62+t.tone*.16));
      });
      mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();
      return mesh;
    });
    const trunks=new InstancedMesh(trunkGeometry,trunkMaterial,list.length);
    const transform=new Object3D();
    list.forEach((t,i)=>{
      const h=t.heightM*.68;
      transform.position.set(t.x,t.baseM+h/2,t.z);
      transform.rotation.set(0,t.spin,0);
      transform.scale.set(t.kind==='pine'?.18:.24,h,t.kind==='pine'?.18:.24);
      transform.updateMatrix();trunks.setMatrixAt(i,transform.matrix);
    });
    trunks.instanceMatrix.needsUpdate=true;trunks.castShadow=true;trunks.receiveShadow=true;trunks.computeBoundingSphere();
    return {crowns,trunks,crownMaterial,trunkMaterial,trunkGeometry};
  },[leaves]);
  useEffect(()=>()=>{
    resources.crowns.forEach(m=>{m.geometry.dispose();m.dispose();});
    resources.trunks.dispose();resources.trunkGeometry.dispose();resources.trunkMaterial.dispose();resources.crownMaterial.dispose();
  },[resources]);
  return <group>{resources.crowns.map((m,i)=><primitive key={i} object={m}/>)}<primitive object={resources.trunks}/></group>;
}

// shrub colours: dark glossy lentisk ↔ grey-green ↔ olive
const SHRUB_TINTS = [new Color(0.76, 0.9, 0.67), new Color(0.94, 1.01, 0.82), new Color(0.86, 0.9, 0.76), new Color(1.02, 0.98, 0.78)];
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
diffuseColor.rgb = mix(vec3(lum), diffuseColor.rgb, 0.3) * vec3(1.56, 1.52, 1.38) + 0.018;`,
          );
        };
        c.customProgramCacheKey = () => 'navigation-replay-rock-v2';
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

