'use client';

/* ─────────────── דאטום — the linked close-up, rendered live ───────────────
   A small 3-D scene drawn by the globe's own renderer, into the close-up's
   circle (a scissored viewport after the globe — one WebGL context): the
   local section of the exercise wall around the inspection point, with the
   geoid and the posed ellipse as two lit bands — a wavy blue one and a
   smooth orange one — each with a lit crest, a little depth and a soft
   shadow on a quiet cream ground (the Earth's side of the geoid a shade
   deeper). Same studio light as the globe (datumHolo STUDIO_GLSL).

   Everything comes from datumInset.ts — the same view the SVG arrow uses —
   so the arrow lands on the two band crests. Buffers are allocated once and
   rewritten in place when the pose, the inspection point, the mode or the
   chosen surface change; nothing is allocated per frame, everything is
   disposed when the view unmounts. */

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { DISPLAY_K, ELL, LOCAL_ARC, type DatumMode, type Pose } from './datumGeometry';
import type { Surface } from './datumDemo';
import { STUDIO_GLSL } from './datumHolo';
import {
  INSET_BAND, curveRun, ellipseCentrePlane, ellipsePhiAt, ellipsePlane, geoidPlane, insetView, ribbonFill, tubeFill, type InsetView,
} from './datumInset';
import { INSET } from './datumOverlays';

const N = 220; // samples along each band
const RING = 20; // around each band
const ARC_N = 96;

const COLORS = {
  geoid: '#5B9DD9', // accent.cool
  ellipsoid: '#D97E2B', // accent
  ground: '#F3E9DC', // bg — the Earth's side of the geoid
  air: '#F6EFE6', // bg.accent — outside, lifted toward white
  shade: '#38432E', // fg — shadows
} as const;

/* every fragment of the close-up stays inside its circle */
const CLIP_GLSL = /* glsl */ `
uniform vec3 uClip;
void clipCircle() { if (distance(gl_FragCoord.xy, uClip.xy) > uClip.z) discard; }`;

const tubeVertex = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
/* The globe's body language at band scale: a soft satin finish, broad
   highlights in the band's own hue, a lit rim mostly in its own hue. */
const tubeFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uRim;
uniform float uGain;
varying vec3 vN;
varying vec3 vV;
${CLIP_GLSL}
${STUDIO_GLSL}
void main() {
  clipCircle();
  vec3 n = normalize(vN);
  vec3 v = normalize(vV);
  float spec;
  vec3 col = studio(uColor, n, v, 0.4, 1.6, 1.0, spec);
  col = ((col - vec3(spec)) + mix(vec3(1.0), min(uColor * 1.8, vec3(1.0)), 0.55) * spec) * uGain;
  float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.5);
  col += mix(uColor, vec3(1.0), 0.2) * fres * uRim;
  gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const flatVertex = /* glsl */ `
attribute float aSide;
varying float vSide;
void main() {
  vSide = aSide;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const shadowFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
uniform float uSoft;
varying float vSide;
${CLIP_GLSL}
void main() {
  clipCircle();
  // uSoft: where the fade to the ribbon's edge starts (a soft shadow fades early, the arc's band late)
  float a = uAlpha * (1.0 - smoothstep(uSoft, 1.0, abs(vSide)));
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}`;

/* The ground: a screen quad; each pixel is traced back to the section plane
   (z = 0), so the Earth's side of the geoid lines up with the geoid band. */
const groundVertex = /* glsl */ `
varying vec2 vNdc;
void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.999, 1.0);
}`;
const groundFragment = /* glsl */ `
uniform vec2 uC;
uniform float uRho;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uDir;
uniform vec3 uGround;
uniform vec3 uAir;
varying vec2 vNdc;
${CLIP_GLSL}
float geoidW(float t) {
  float u = t < 0.0 ? t + 6.2831853 : t;
  float sg = u > 3.14159265 ? u - 6.2831853 : u;
  float b = (sg + 1.0) / 0.38;
  return 1.0 + 0.05 * sin(5.0 * u + 0.3) + 0.03 * sin(8.0 * u + 1.2) + 0.025 * sin(3.0 * u + 2.0) + 0.14 * exp(-b * b);
}
void main() {
  clipCircle();
  vec3 p = vec3(uC, 0.0) + uRho * (vNdc.x * uRight + vNdc.y * uUp);
  p -= uDir * (p.z / uDir.z);
  // plane → section (SVG y down, relative to the centre), then the geoid test
  vec2 sct = vec2(p.x / ${ELL.rx.toFixed(1)}, -p.y / ${DISPLAY_K.toFixed(4)} / ${ELL.ry.toFixed(1)});
  float w = length(sct);
  float inside = w - geoidW(atan(sct.y, sct.x));
  float aa = fwidth(inside) * 1.2;
  float earth = 1.0 - smoothstep(-aa, aa, inside);
  // the Earth's side a little deeper the further in, with a soft occlusion just under
  // the geoid (the band sits on it); a soft vignette at the rim
  float dpx = -inside / max(fwidth(inside), 1e-5);
  vec3 g = uGround * (1.0 - 0.07 * smoothstep(0.0, 0.14, -inside)) * (1.0 - 0.12 * exp(-max(dpx, 0.0) / 14.0));
  vec3 col = mix(uAir, g, earth);
  col *= 1.0 - 0.06 * smoothstep(0.55, 1.0, length(vNdc));
  col *= 1.0 + 0.03 * (vNdc.y - vNdc.x) * 0.5;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

type Tube = { geom: THREE.BufferGeometry; pos: THREE.BufferAttribute; nrm: THREE.BufferAttribute; run: Float32Array };
type Ribbon = { geom: THREE.BufferGeometry; pos: THREE.BufferAttribute; run: Float32Array; n: number };

function makeTube(): Tube {
  const geom = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(new Float32Array(N * RING * 3), 3);
  const nrm = new THREE.BufferAttribute(new Float32Array(N * RING * 3), 3);
  pos.setUsage(THREE.DynamicDrawUsage);
  nrm.setUsage(THREE.DynamicDrawUsage);
  geom.setAttribute('position', pos);
  geom.setAttribute('normal', nrm);
  const idx: number[] = [];
  for (let i = 0; i < N - 1; i++)
    for (let j = 0; j < RING; j++) {
      const a = i * RING + j;
      const b = i * RING + ((j + 1) % RING);
      const c = a + RING;
      const d = b + RING;
      idx.push(a, b, c, b, d, c);
    }
  geom.setIndex(idx);
  return { geom, pos, nrm, run: new Float32Array(N * 4) };
}

function makeRibbon(n: number): Ribbon {
  const geom = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(new Float32Array(n * 6), 3);
  pos.setUsage(THREE.DynamicDrawUsage);
  geom.setAttribute('position', pos);
  geom.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array(Array.from({ length: n * 2 }, (_, i) => (i % 2 ? 1 : -1))), 1));
  const idx: number[] = [];
  for (let i = 0; i < n - 1; i++) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
  geom.setIndex(idx);
  return { geom, pos, run: new Float32Array(n * 4), n };
}

function buildInset() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
  const clip = { value: new THREE.Vector3(0, 0, 0) };

  const ground = new THREE.ShaderMaterial({
    vertexShader: groundVertex,
    fragmentShader: groundFragment,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uClip: clip,
      uC: { value: new THREE.Vector2() },
      uRho: { value: 1 },
      uRight: { value: new THREE.Vector3(1, 0, 0) },
      uUp: { value: new THREE.Vector3(0, 1, 0) },
      uDir: { value: new THREE.Vector3(0, 0, 1) },
      uGround: { value: new THREE.Color(COLORS.ground) },
      uAir: { value: new THREE.Color(COLORS.air).lerp(new THREE.Color('#FFFFFF'), 0.6) },
    },
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ground);
  quad.frustumCulled = false;
  quad.renderOrder = 0;

  const shadowMat = (alpha: number) =>
    new THREE.ShaderMaterial({
      vertexShader: flatVertex,
      fragmentShader: shadowFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide, // flat ribbons: whichever way the curve runs
      uniforms: { uClip: clip, uColor: { value: new THREE.Color(COLORS.shade) }, uAlpha: { value: alpha }, uSoft: { value: 0.15 } },
    });
  const tubeMat = (color: string, gain: number) =>
    new THREE.ShaderMaterial({
      vertexShader: tubeVertex,
      fragmentShader: tubeFragment,
      side: THREE.DoubleSide, // a closed band: the nearest surface wins, whatever the winding
      // gains matched to the globe's bodies as rendered: the blue as the geoid's lit body, the orange a
      // little lifted (on the globe it is a cage of lines; here a small band that needs its colour)
      uniforms: { uClip: clip, uColor: { value: new THREE.Color(color) }, uRim: { value: 0.35 }, uGain: { value: gain } },
    });

  const tubes = { geoid: makeTube(), ellipsoid: makeTube() };
  const shadows = { geoid: makeRibbon(N), ellipsoid: makeRibbon(N) };
  const arc = makeRibbon(ARC_N);
  const mats = {
    tube: { geoid: tubeMat(COLORS.geoid, 0.96), ellipsoid: tubeMat(COLORS.ellipsoid, 1.06) },
    shadow: shadowMat(0.3),
    arc: new THREE.ShaderMaterial({
      vertexShader: flatVertex,
      fragmentShader: shadowFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide, // flat ribbons: whichever way the curve runs
      uniforms: { uClip: clip, uColor: { value: new THREE.Color(COLORS.geoid) }, uAlpha: { value: 0.32 }, uSoft: { value: 0.72 } },
    }),
  };
  const meshes = {
    shadowG: new THREE.Mesh(shadows.geoid.geom, mats.shadow),
    shadowE: new THREE.Mesh(shadows.ellipsoid.geom, mats.shadow),
    arc: new THREE.Mesh(arc.geom, mats.arc),
    geoid: new THREE.Mesh(tubes.geoid.geom, mats.tube.geoid),
    ellipsoid: new THREE.Mesh(tubes.ellipsoid.geom, mats.tube.ellipsoid),
  };
  meshes.shadowG.renderOrder = meshes.shadowE.renderOrder = 1;
  meshes.arc.renderOrder = 2;
  meshes.geoid.renderOrder = meshes.ellipsoid.renderOrder = 3;
  scene.add(quad, ...Object.values(meshes));
  Object.values(meshes).forEach((m) => (m.frustumCulled = false));

  const place = (v: InsetView) => {
    camera.left = -v.rho;
    camera.right = v.rho;
    camera.top = v.rho;
    camera.bottom = -v.rho;
    camera.position.set(v.c.x + v.dir[0] * 500, v.c.y + v.dir[1] * 500, v.dir[2] * 500);
    camera.up.set(v.up[0], v.up[1], v.up[2]);
    camera.lookAt(v.c.x, v.c.y, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    ground.uniforms.uC.value.set(v.c.x, v.c.y);
    ground.uniforms.uRho.value = v.rho;
    ground.uniforms.uRight.value.set(...v.right);
    ground.uniforms.uUp.value.set(...v.up);
    ground.uniforms.uDir.value.set(...v.dir);
  };

  return {
    scene,
    camera,
    update(pose: Pose, inspect: number, mode: DatumMode, surface: Surface) {
      const v = insetView(pose, inspect, INSET.size);
      place(v);
      const px = (p: number) => p / v.ppu; // screen pixels → plane units
      const depth = px(INSET_BAND.depth);
      const sh = INSET_BAND.shadow;

      const gRun = curveRun(geoidPlane, inspect, { x: 0, y: 0 }, v, N, tubes.geoid.run);
      const eRun = curveRun((s) => ellipsePlane(pose, s), ellipsePhiAt(pose, inspect), ellipseCentrePlane(pose), v, N, tubes.ellipsoid.run);
      const gHalf = px(INSET_BAND.half.geoid * (surface === 'geoid' ? 1.12 : 1));
      const eHalf = px(INSET_BAND.half.ellipsoid * (surface === 'ellipsoid' ? 1.12 : 1));
      tubeFill(gRun, N, RING, gHalf, depth, tubes.geoid.pos.array as Float32Array, tubes.geoid.nrm.array as Float32Array);
      tubeFill(eRun, N, RING, eHalf, depth, tubes.ellipsoid.pos.array as Float32Array, tubes.ellipsoid.nrm.array as Float32Array);
      ribbonFill(gRun, N, gHalf + px(sh.spread), -depth, px(sh.dx), px(sh.dy), shadows.geoid.pos.array as Float32Array);
      ribbonFill(eRun, N, eHalf + px(sh.spread), -depth, px(sh.dx), px(sh.dy), shadows.ellipsoid.pos.array as Float32Array);
      for (const t of Object.values(tubes)) {
        t.pos.needsUpdate = true;
        t.nrm.needsUpdate = true;
        t.geom.computeBoundingSphere();
      }
      for (const r of Object.values(shadows)) r.pos.needsUpdate = true;

      meshes.arc.visible = mode === 'local';
      if (mode === 'local') {
        // the marked arc, as a translucent underlay along the geoid
        const f = (s: number) => geoidPlane(LOCAL_ARC.from + ((s + Math.PI) / (2 * Math.PI)) * (LOCAL_ARC.to - LOCAL_ARC.from));
        const run = arc.run;
        for (let i = 0; i < ARC_N; i++) {
          const s = -Math.PI + (2 * Math.PI * i) / (ARC_N - 1);
          const p = f(s);
          const a = f(s - 1e-3);
          const b = f(s + 1e-3);
          let nx = b.y - a.y;
          let ny = -(b.x - a.x);
          const l = Math.hypot(nx, ny) || 1;
          nx /= l;
          ny /= l;
          if (nx * p.x + ny * p.y < 0) {
            nx = -nx;
            ny = -ny;
          }
          run[i * 4] = p.x;
          run[i * 4 + 1] = p.y;
          run[i * 4 + 2] = nx;
          run[i * 4 + 3] = ny;
        }
        ribbonFill(run, ARC_N, px(INSET_BAND.arc), -depth * 0.5, 0, 0, arc.pos.array as Float32Array);
        arc.pos.needsUpdate = true;
      }
      mats.tube.geoid.uniforms.uRim.value = surface === 'geoid' ? 0.62 : 0.45;
      mats.tube.ellipsoid.uniforms.uRim.value = surface === 'ellipsoid' ? 0.62 : 0.45;
    },
    setClip(x: number, y: number, r: number) {
      clip.value.set(x, y, r);
    },
    dispose() {
      quad.geometry.dispose();
      ground.dispose();
      for (const t of Object.values(tubes)) t.geom.dispose();
      for (const r of Object.values(shadows)) r.geom.dispose();
      arc.geom.dispose();
      mats.tube.geoid.dispose();
      mats.tube.ellipsoid.dispose();
      mats.shadow.dispose();
      mats.arc.dispose();
    },
  };
}

/** Renders the globe, then the close-up into its circle. Takes over the frame (useFrame priority 1). */
export function InsetPass({ pose, inspect, mode, surface, enabled }: { pose: Pose; inspect: number; mode: DatumMode; surface: Surface; enabled: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const inset = useMemo(() => buildInset(), []);
  useEffect(() => () => inset.dispose(), [inset]);
  useEffect(() => {
    inset.update(pose, inspect, mode, surface);
    invalidate();
  }, [inset, pose, inspect, mode, surface, invalidate]);

  useFrame(({ gl, scene, camera, size }) => {
    gl.render(scene, camera);
    if (!enabled) return;
    const dpr = gl.getPixelRatio();
    const s = INSET.size;
    inset.setClip((INSET.left + s / 2) * dpr, (INSET.bottom + s / 2) * dpr, (s / 2 - 1) * dpr);
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setViewport(INSET.left, INSET.bottom, s, s);
    gl.setScissor(INSET.left, INSET.bottom, s, s);
    gl.setScissorTest(true);
    gl.clearDepth();
    gl.render(inset.scene, inset.camera);
    gl.setScissorTest(false);
    gl.setViewport(0, 0, size.width, size.height);
    gl.autoClear = auto;
  }, 1);
  return null;
}
