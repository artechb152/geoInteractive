'use client';

/* ─────────── היטלים: מכדור למפה — the 3-D stage ───────────
   Reference: design/mockups/projections-concepts-2026-10-12/01-unfolding-lab.png.
   - The globe is the explorer's (geo-globe): the WGS84 ellipsoid mesh at true flattening
     (geoCoords.ellipsoidMesh), its NASA Blue Marble colour and GEBCO relief images (the page's
     one image cache), relief as light only, one soft key light riding with the camera. Its
     shader is this lab's own: the sea is re-toned locally (water weight × the image's own
     bathymetric brightness → the reference's natural medium blue) without touching land or
     the shared images; a 15° graticule; the sample parallel and point (orange); the line /
     point of contact (sage, dashed) while a surface is shown.
   - The surface is one sheet per method in its development's own coordinates
     (projectionsModel.sheetMesh). Its vertices are moved on the CPU, in place, only when the
     progress changes (projectionsModel.sheetPoint: the same function the tests check for
     contact, no cut into the globe and no stretching); the shader reads lat / lon back from the
     flat coordinates through the method's inverse, so its grid, parallel and point are the map's.
     Translucent cream, drawn far faces first; the globe stays readable through it.
   - The camera: a base view per method and progress (the plane's rises to straight above the
     pole) plus the learner's drag (bounded), fitted every frame so the globe and the whole sheet
     stay in frame (projectionsModel.fitCamera). Frames render on demand; GPU resources are
     disposed on unmount. */

import { Component, useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LESSON_FIT_CANVAS_RESIZE, useLessonViewportScale } from '@/components/lesson/LessonViewportFit';
import { ellipsoidMesh, geodeticToScene } from '../geo-globe/geoCoords';
import { GLOBE_SEA, SRC_RAMP } from './earthRaster';
import {
  AZ_LAT_MIN, CAM_FOV, CONE_LAT_MAX, CONE_LAT_MIN, CONE_N, CONE_PHI0, CONE_RHO0, CONE_THETA_MAX, CONTACT_LAT, CYL_LAT_MAX, DEMO, EL_MAX, EL_MIN,
  FLOOR_Y, OFFSET_AZ_MAX, OFFSET_EL_MAX, OFFSET_EL_MIN, baseView, fitCamera, framePoints, project, sheetMesh, sheetPoint, type Method, type Vec3,
} from './projectionsModel';

/* ── palette: lesson tokens (tailwind.config.ts); the Earth's own colours are the imagery's ── */
const C = {
  accent: '#D97E2B', // accent — the sample parallel and point
  brandDark: '#5B7C5C', // brand-dark — the line / point of contact
  ink: '#38432E', // fg — the contact shadow
  dim: '#8A8873', // fg-dim — the sheet's grid and edges
  paper: '#F6EFE6', // bg-accent — the sheet
  white: '#FFFFFF',
} as const;

/** Key light in view space: from the upper left, a little in front (as Globe3D). */
const KEY_VIEW = new THREE.Vector3(-0.36, 0.42, 0.83).normalize();
const D2R = Math.PI / 180;

export type StageImages = { color: TexImageSource; relief: TexImageSource };
export type StageView = {
  /** the surface shown (null: the globe alone) */
  m: Method | null;
  /** the process 0–1 */
  p: number;
  /** the sample parallel and point */
  demo: boolean;
};

/* ───────────────────────── shaders ───────────────────────── */

const LINE = /* glsl */ `
float lineMask(float d, float perPx, float wPx) {
  return clamp(0.5 * wPx + 0.5 - d / max(perPx, 1e-6), 0.0, 1.0);
}
// screen distance (px) of a surface offset r, given that surface coordinate's screen derivatives:
// a round dot in screen space even where the surface is seen edge-on
float screenDist(vec2 r, vec2 dx, vec2 dy) {
  float det = dx.x * dy.y - dx.y * dy.x;
  if (abs(det) < 1e-14) return 1e6;
  return length(vec2(dy.y * r.x - dy.x * r.y, -dx.y * r.x + dx.x * r.y) / det);
}`;

const EARTH_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vPos;
varying vec3 vN;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPos = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const EARTH_FRAG = /* glsl */ `
uniform sampler2D uColor;
uniform sampler2D uRelief;
uniform vec3 uLight;
uniform vec3 uCam;
uniform float uBump;
uniform float uAmb;
uniform float uKey;
uniform float uPx;
uniform vec3 uSeaDeep;
uniform vec3 uSeaBank;
uniform vec2 uSrcL;
uniform float uDemo;
uniform float uSelLat;
uniform vec3 uPoint;
uniform vec3 uPointE;
uniform vec3 uPointN;
uniform float uContactOn;
uniform float uContactLat;
uniform vec3 uGridC;
uniform vec3 uSelC;
uniform vec3 uContactC;
varying vec2 vUv;
varying vec3 vPos;
varying vec3 vN;
${LINE}

void main() {
  float lat = vUv.y * 180.0 - 90.0;
  float lon = vUv.x * 360.0 - 180.0;
  float pxLat = length(vec2(dFdx(lat), dFdy(lat)));
  // longitude jumps by 360° across the image's seam: take the smaller of the two readings
  float lonB = mod(lon + 360.0, 360.0);
  float pxLon = min(length(vec2(dFdx(lon), dFdy(lon))), length(vec2(dFdx(lonB), dFdy(lonB))));

  vec3 albedo = texture2D(uColor, vUv).rgb;
  vec3 rel = texture2D(uRelief, vUv).rgb;
  // the sea, re-toned here only: water weight × the image's own bathymetric brightness
  float L = dot(albedo, vec3(0.2126, 0.7152, 0.0722));
  float water = rel.b * (1.0 - smoothstep(uSrcL.y * 1.3, uSrcL.y * 2.1, L));
  float tSea = smoothstep(0.0, 1.0, clamp((L - uSrcL.x) / (uSrcL.y - uSrcL.x), 0.0, 1.0));
  albedo = mix(albedo, mix(uSeaDeep, uSeaBank, tSea), water);

  // relief normal in the ellipsoid's local east / north / up frame (light only)
  float phi = radians(lat);
  float lam = radians(lon);
  vec3 up = normalize(vN);
  vec3 east = vec3(-sin(lam), 0.0, -cos(lam));
  vec3 north = vec3(-sin(phi) * cos(lam), cos(phi), sin(phi) * sin(lam));
  vec2 t = (rel.rg * 255.0 - 128.0) / 127.0 * uBump * (1.0 - water);
  vec3 n = normalize(t.x * east + t.y * north + sqrt(max(0.0, 1.0 - dot(t, t))) * up);

  vec3 Ld = normalize(uLight);
  vec3 V = normalize(uCam - vPos);
  float diff = clamp((dot(n, Ld) + 0.45) / 1.45, 0.0, 1.0);
  float body = clamp((dot(up, Ld) + 0.45) / 1.45, 0.0, 1.0);
  vec3 col = albedo * (uAmb + uKey * diff);

  // a broad, quiet sheen on the sea — never a plastic hotspot
  vec3 H = normalize(Ld + V);
  float nh = max(dot(up, H), 0.0);
  col += water * (pow(nh, 60.0) * 0.05 + pow(nh, 8.0) * 0.03) * body;
  // the limb: a thin soft edge on the lit side (on the body, no halo around it)
  float ndv = clamp(dot(up, V), 0.0, 1.0);
  col = mix(col, vec3(0.66, 0.8, 0.9) * (0.55 + 0.45 * body), pow(1.0 - ndv, 3.4) * 0.3 * (0.4 + 0.6 * body));

  float lit = 0.74 + 0.26 * body;
  // the 15° graticule; meridians ease out where they converge
  float gLat = abs(mod(lat + 7.5, 15.0) - 7.5);
  float gLon = abs(mod(lon + 7.5, 15.0) - 7.5);
  float merFade = 1.0 - smoothstep(76.0, 84.0, abs(lat));
  float grid = max(lineMask(gLat, pxLat, uPx), lineMask(gLon, pxLon, uPx) * merFade);
  col = mix(col, uGridC * lit, grid * 0.26);

  // the dots' surface coordinates (tangent planes at the point and at the pole), derivatives taken here
  vec2 tp = vec2(dot(vPos - uPoint, uPointE), dot(vPos - uPoint, uPointN));
  vec2 tpx = dFdx(tp);
  vec2 tpy = dFdy(tp);
  vec2 tq = vPos.zx;
  vec2 tqx = dFdx(tq);
  vec2 tqy = dFdy(tq);
  // the line of contact: sage, dashed; at the pole, a sage dot
  if (uContactOn > 0.5) {
    if (uContactLat < 89.0) {
      float dash = step(0.42, fract((lon + 180.0) / 7.5));
      float c = lineMask(abs(lat - uContactLat), pxLat, 2.6 * uPx) * dash;
      col = mix(col, uContactC * (0.82 + 0.18 * body), c);
    } else {
      float dp = vPos.y > 0.0 ? screenDist(tq, tqx, tqy) : 1e6;
      col = mix(col, vec3(1.0), clamp(6.6 * uPx - dp, 0.0, 1.0));
      col = mix(col, uContactC, clamp(4.6 * uPx - dp, 0.0, 1.0));
    }
  }
  // the sample parallel and its point
  if (uDemo > 0.5) {
    float s = lineMask(abs(lat - uSelLat), pxLat, 2.4 * uPx);
    col = mix(col, uSelC * (0.86 + 0.14 * body), s);
    float dp = dot(vPos, uPoint) > 0.0 ? screenDist(tp, tpx, tpy) : 1e6;
    col = mix(col, vec3(0.16, 0.18, 0.13), clamp(8.4 * uPx - dp, 0.0, 1.0) * 0.35);
    col = mix(col, vec3(1.0), clamp(7.6 * uPx - dp, 0.0, 1.0));
    col = mix(col, uSelC, clamp(5.4 * uPx - dp, 0.0, 1.0));
  }

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const SHEET_VERT = /* glsl */ `
attribute vec2 aFlat;
varying vec2 vFlat;
varying vec3 vPos;
varying vec3 vN;
void main() {
  vFlat = aFlat;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPos = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

/* The sheet: its flat coordinates ARE the map's — lat / lon come back through the method's
   inverse (projectionsModel.unproject), so its grid, parallel and point are the map's. */
const SHEET_FRAG = /* glsl */ `
uniform int uMethod;
uniform float uN;
uniform float uRho0;
uniform float uPhi0;
uniform float uThetaMax;
uniform float uLatMin;
uniform float uLatMax;
uniform float uSelLat;
uniform vec2 uPointFlat;
uniform float uDemo;
uniform float uContactLat;
uniform vec3 uPaper;
uniform vec3 uLineC;
uniform vec3 uSelC;
uniform vec3 uContactC;
uniform vec3 uLight;
uniform float uAlpha;
uniform float uFade;
uniform float uPx;
uniform float uPointOn;
uniform float uNear;
varying vec2 vFlat;
varying vec3 vPos;
varying vec3 vN;
${LINE}

void main() {
  vec2 f = vFlat;
  float lat;
  float lon;
  float th = 0.0;
  float r = length(f);
  if (uMethod == 0) {
    lon = degrees(f.x);
    lat = degrees(f.y);
  } else {
    th = atan(f.x, -f.y);
    if (uMethod == 1) {
      lat = degrees(uRho0 + uPhi0 - r);
      lon = degrees(th / uN);
    } else {
      lat = 90.0 - degrees(r);
      lon = degrees(th);
    }
  }
  float pxLat = length(vec2(dFdx(lat), dFdy(lat)));
  float lonB = mod(lon + 360.0, 360.0);
  float pxLon = min(length(vec2(dFdx(lon), dFdy(lon))), length(vec2(dFdx(lonB), dFdy(lonB))));
  float inMap = step(uLatMin - 0.02, lat) * step(lat, uLatMax + 0.02);

  vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  float diff = clamp((dot(n, normalize(uLight)) + 0.3) / 1.3, 0.0, 1.0);
  vec3 col = uPaper * (0.78 + 0.24 * diff);
  // the near face is lighter while it wraps the globe (the globe must read through it); flat, it
  // is the map in front of the globe — a little more paper, the globe still seen behind it
  float a = uAlpha * (gl_FrontFacing ? uNear : 1.0);

  // the graticule inside the map
  float gLat = abs(mod(lat + 7.5, 15.0) - 7.5);
  float gLon = abs(mod(lon + 7.5, 15.0) - 7.5);
  float merFade = uMethod == 2 ? 1.0 - smoothstep(83.0, 86.0, lat) : 1.0;
  float grid = inMap * max(lineMask(gLat, pxLat, uPx), lineMask(gLon, pxLon, uPx) * merFade);
  // the map's edges (and the cone's seam): a little stronger
  float edge = 0.0;
  if (uMethod == 0) {
    edge = max(lineMask(uLatMax - abs(lat), pxLat, 1.6 * uPx), lineMask(180.0 - abs(lon), pxLon, 1.6 * uPx));
  } else if (uMethod == 1) {
    float pxTh = length(vec2(dFdx(th), dFdy(th)));
    edge = max(max(lineMask(abs(lat - uLatMin), pxLat, 1.6 * uPx), lineMask(abs(lat - uLatMax), pxLat, 1.3 * uPx) * step(lat, uLatMax + 6.0)), lineMask(uThetaMax - abs(th), pxTh, 1.6 * uPx));
  } else {
    edge = lineMask(abs(lat - uLatMin), pxLat, 1.6 * uPx);
  }
  float ln = max(grid * 0.7, edge);
  col = mix(col, uLineC, ln * 0.85);
  a = max(a, ln * 0.82);

  // the line of contact (dashed) — or the plane's point of contact
  vec2 fdx = dFdx(f);
  vec2 fdy = dFdy(f);
  if (uMethod != 2) {
    float dash = step(0.42, fract((lon + 180.0) / 7.5));
    float c = lineMask(abs(lat - uContactLat), pxLat, 2.6 * uPx) * dash * inMap;
    col = mix(col, uContactC, c);
    a = max(a, c);
  } else {
    float dp = screenDist(f, fdx, fdy);
    float ring = clamp(6.6 * uPx - dp, 0.0, 1.0);
    float dot0 = clamp(4.6 * uPx - dp, 0.0, 1.0);
    col = mix(mix(col, vec3(1.0), ring), uContactC, dot0);
    a = max(a, ring);
  }
  // the sample parallel and its point
  if (uDemo > 0.5) {
    float s = lineMask(abs(lat - uSelLat), pxLat, 2.4 * uPx) * inMap;
    col = mix(col, uSelC, s);
    a = max(a, s);
    // the point rides on the sheet once it leaves the globe (wrapped, it sits on the globe's own)
    float dp = screenDist(f - uPointFlat, fdx, fdy);
    float ring = clamp(7.6 * uPx - dp, 0.0, 1.0) * uPointOn;
    float dot0 = clamp(5.4 * uPx - dp, 0.0, 1.0) * uPointOn;
    col = mix(mix(col, vec3(1.0), ring), uSelC, dot0);
    a = max(a, ring);
  }
  gl_FragColor = vec4(col, a * uFade);
  #include <colorspace_fragment>
}`;

const SHADOW_FRAG = /* glsl */ `
uniform vec3 uC;
uniform float uFade;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float a = 0.26 * exp(-r * r * 3.2) * (1.0 - smoothstep(0.85, 1.0, r));
  gl_FragColor = vec4(uC, a * uFade);
  #include <colorspace_fragment>
}`;

const lin = (hex: string) => new THREE.Color(hex);
/** The source sea ramp's ends, linear luminance (the shader works in linear). */
const SRC_L = (() => {
  const l = (h: string) => {
    const c = lin(h);
    return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  };
  return new THREE.Vector2(l(SRC_RAMP.deep), l(SRC_RAMP.bank));
})();
const METHOD_ID: Record<Method, number> = { cyl: 0, cone: 1, az: 2 };
const COVER: Record<Method, [number, number]> = { cyl: [-CYL_LAT_MAX, CYL_LAT_MAX], cone: [CONE_LAT_MIN, CONE_LAT_MAX], az: [AZ_LAT_MIN, 90] };
const MESH_RES: Record<Method, [number, number]> = { cyl: [192, 48], cone: [192, 48], az: [192, 40] };

/* ───────────────────────── the globe ───────────────────────── */

function Earth({ images, view }: { images: StageImages; view: StageView }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  const res = useMemo(() => {
    const m = ellipsoidMesh(160, 320);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(m.position, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(m.normal, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(m.uv, 2));
    geom.setIndex(new THREE.BufferAttribute(m.index, 1));
    geom.computeBoundingSphere();
    const tex = (img: TexImageSource, srgb: boolean) => {
      const t = new THREE.Texture(img as HTMLImageElement);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
      t.needsUpdate = true;
      return t;
    };
    const color = tex(images.color, true);
    const relief = tex(images.relief, false);
    const p = geodeticToScene(DEMO.lat, DEMO.lon);
    const mat = new THREE.ShaderMaterial({
      vertexShader: EARTH_VERT,
      fragmentShader: EARTH_FRAG,
      uniforms: {
        uColor: { value: color },
        uRelief: { value: relief },
        uLight: { value: new THREE.Vector3() },
        uCam: { value: new THREE.Vector3() },
        uBump: { value: 0.85 },
        uAmb: { value: 0.56 },
        uKey: { value: 0.66 },
        uPx: { value: 1 },
        uSeaDeep: { value: lin(GLOBE_SEA.deep) },
        uSeaBank: { value: lin(GLOBE_SEA.bank) },
        uSrcL: { value: SRC_L },
        uDemo: { value: 0 },
        uSelLat: { value: DEMO.lat },
        uPoint: { value: new THREE.Vector3(p[0], p[1], p[2]) },
        uPointE: { value: new THREE.Vector3(-Math.sin(DEMO.lon * D2R), 0, -Math.cos(DEMO.lon * D2R)) },
        uPointN: {
          value: new THREE.Vector3(-Math.sin(DEMO.lat * D2R) * Math.cos(DEMO.lon * D2R), Math.cos(DEMO.lat * D2R), Math.sin(DEMO.lat * D2R) * Math.sin(DEMO.lon * D2R)),
        },
        uContactOn: { value: 0 },
        uContactLat: { value: 0 },
        uGridC: { value: lin(C.white) },
        uSelC: { value: lin(C.accent) },
        uContactC: { value: lin(C.brandDark) },
      },
    });
    return { geom, color, relief, mat };
  }, [images, gl]);

  useEffect(
    () => () => {
      res.geom.dispose();
      res.color.dispose();
      res.relief.dispose();
      res.mat.dispose();
    },
    [res],
  );

  useEffect(() => {
    const u = res.mat.uniforms;
    u.uDemo.value = view.demo ? 1 : 0;
    u.uContactOn.value = view.m ? 1 : 0;
    u.uContactLat.value = view.m ? CONTACT_LAT[view.m] : 0;
    invalidate();
  }, [res, view.m, view.demo, invalidate]);

  useFrame(() => {
    const u = res.mat.uniforms;
    u.uLight.value.copy(KEY_VIEW).applyQuaternion(camera.quaternion);
    u.uCam.value.copy(camera.position);
    u.uPx.value = gl.getPixelRatio();
  });

  return <mesh geometry={res.geom} material={res.mat} renderOrder={0} />;
}

/* ───────────────────────── the surfaces ───────────────────────── */

function Sheets({ view, reduce }: { view: StageView; reduce: boolean }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  const res = useMemo(() => {
    const out = {} as Record<Method, { geom: THREE.BufferGeometry; flat: Float32Array; pos: Float32Array; nrm: Float32Array; back: THREE.ShaderMaterial; front: THREE.ShaderMaterial }>;
    for (const m of ['cyl', 'cone', 'az'] as Method[]) {
      const [nu, nv] = MESH_RES[m];
      const mesh = sheetMesh(m, nu, nv);
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(mesh.count * 3);
      const nrm = new Float32Array(mesh.count * 3);
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      geom.setAttribute('normal', new THREE.BufferAttribute(nrm, 3).setUsage(THREE.DynamicDrawUsage));
      geom.setAttribute('aFlat', new THREE.BufferAttribute(mesh.flat, 2));
      geom.setIndex(new THREE.BufferAttribute(mesh.index, 1));
      const pt = project(m, DEMO.lat, DEMO.lon);
      const uniforms = () => ({
        uMethod: { value: METHOD_ID[m] },
        uN: { value: CONE_N },
        uRho0: { value: CONE_RHO0 },
        uPhi0: { value: CONE_PHI0 * D2R },
        uThetaMax: { value: CONE_THETA_MAX },
        uLatMin: { value: COVER[m][0] },
        uLatMax: { value: COVER[m][1] },
        uSelLat: { value: DEMO.lat },
        uPointFlat: { value: new THREE.Vector2(pt[0], pt[1]) },
        uDemo: { value: 0 },
        uContactLat: { value: CONTACT_LAT[m] },
        uPaper: { value: lin(C.paper) },
        uLineC: { value: lin(C.dim) },
        uSelC: { value: lin(C.accent) },
        uContactC: { value: lin(C.brandDark) },
        uLight: { value: new THREE.Vector3() },
        uAlpha: { value: 0.42 },
        uPointOn: { value: m === 'az' ? 1 : 0 },
        uNear: { value: m === 'az' ? 1.1 : 0.62 },
        uFade: { value: 0 },
        uPx: { value: 1 },
      });
      const make = (side: THREE.Side) =>
        new THREE.ShaderMaterial({
          vertexShader: SHEET_VERT,
          fragmentShader: SHEET_FRAG,
          uniforms: uniforms(),
          side,
          transparent: true,
          depthWrite: false,
        });
      out[m] = { geom, flat: mesh.flat, pos, nrm, back: make(THREE.BackSide), front: make(THREE.FrontSide) };
    }
    return out;
  }, []);

  useEffect(
    () => () => {
      for (const r of Object.values(res)) {
        r.geom.dispose();
        r.back.dispose();
        r.front.dispose();
      }
    },
    [res],
  );

  // the sheet's shape: recomputed in place when the method or the progress changes
  const o = useMemo(() => ({ p: [0, 0, 0] as Vec3, n: [0, 0, 0] as Vec3 }), []);
  const shaped = useRef<Record<Method, number>>({ cyl: -1, cone: -1, az: -1 });
  useEffect(() => {
    const m = view.m;
    if (!m) return;
    const r = res[m];
    const e = m === 'az' ? 0 : view.p;
    if (shaped.current[m] === e) return;
    shaped.current[m] = e;
    const n = r.flat.length / 2;
    for (let k = 0; k < n; k++) {
      sheetPoint(m, e, r.flat[k * 2], r.flat[k * 2 + 1], o);
      r.pos[k * 3] = o.p[0];
      r.pos[k * 3 + 1] = o.p[1];
      r.pos[k * 3 + 2] = o.p[2];
      r.nrm[k * 3] = o.n[0];
      r.nrm[k * 3 + 1] = o.n[1];
      r.nrm[k * 3 + 2] = o.n[2];
    }
    r.geom.attributes.position.needsUpdate = true;
    r.geom.attributes.normal.needsUpdate = true;
    invalidate();
  }, [res, view.m, view.p, o, invalidate]);

  // a surface fades in when it changes (reduced motion: at once)
  const fade = useRef<Record<Method, number>>({ cyl: 0, cone: 0, az: 0 });
  useEffect(() => invalidate(), [view.m, view.demo, invalidate]);
  useFrame((_, dt) => {
    let moving = false;
    for (const m of ['cyl', 'cone', 'az'] as Method[]) {
      const goal = view.m === m ? 1 : 0;
      const f = fade.current;
      if (reduce || goal === 0) f[m] = goal;
      else if (f[m] < goal) {
        f[m] = Math.min(goal, f[m] + dt / 0.35);
        moving = true;
      }
      for (const mat of [res[m].back, res[m].front]) {
        mat.uniforms.uFade.value = f[m];
        mat.uniforms.uDemo.value = view.demo ? 1 : 0;
        if (m !== 'az') {
          // the sheet's own copy of the point shows once the sheet is (nearly) the flat map —
          // before that it would sit as a second dot beside the globe's
          mat.uniforms.uPointOn.value = Math.min(1, Math.max(0, (view.p - 0.72) / 0.22));
          mat.uniforms.uNear.value = 0.62 + 0.58 * Math.min(1, Math.max(0, (view.p - 0.5) / 0.5));
        }
        mat.uniforms.uLight.value.copy(KEY_VIEW).applyQuaternion(camera.quaternion);
        mat.uniforms.uPx.value = gl.getPixelRatio();
      }
    }
    if (moving) invalidate();
  });

  return (
    <>
      {(['cyl', 'cone', 'az'] as Method[]).map((m) => (
        <group key={m} visible={view.m === m}>
          <mesh geometry={res[m].geom} material={res[m].back} renderOrder={2} frustumCulled={false} />
          <mesh geometry={res[m].geom} material={res[m].front} renderOrder={3} frustumCulled={false} />
        </group>
      ))}
    </>
  );
}

/** The soft contact shadow on the stage's floor; it fades as the view rises over the pole. */
function Shadow({ fade }: { fade: MutableRefObject<number> }) {
  const res = useMemo(() => {
    const geom = new THREE.PlaneGeometry(2.3, 2.3);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: SHADOW_FRAG,
      uniforms: { uC: { value: lin(C.ink) }, uFade: { value: 1 } },
      transparent: true,
      depthWrite: false,
    });
    return { geom, mat };
  }, []);
  useEffect(
    () => () => {
      res.geom.dispose();
      res.mat.dispose();
    },
    [res],
  );
  useFrame(() => {
    res.mat.uniforms.uFade.value = fade.current;
  });
  return <mesh geometry={res.geom} material={res.mat} position={[0, FLOOR_Y, 0]} renderOrder={1} />;
}

/* ───────────────────────── the camera ───────────────────────── */

export type StageApi = {
  /** back to the base view (the learner's turn only; progress untouched) */
  resetView: () => void;
  /** keyboard / drag: turn the view by degrees (azimuth, elevation) */
  turn: (dAz: number, dEl: number) => void;
};

type Pose = { el: number; az: number; target: THREE.Vector3; dist: number };
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function Rig({ view, reduce, api, shadowFade }: { view: StageView; reduce: boolean; api: MutableRefObject<StageApi | null>; shadowFade: MutableRefObject<number> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const offset = useRef({ az: 0, el: 0 });
  const offsetTween = useRef<{ from: { az: number; el: number }; t: number } | null>(null);
  const poseTween = useRef<{ from: Pose; t: number } | null>(null);
  const last = useRef<Pose | null>(null);
  // the api reads the view at call time: it is not rebuilt on every progress step
  const viewNow = useRef(view);
  viewNow.current = view;

  useEffect(() => {
    api.current = {
      resetView: () => {
        if (reduce) offset.current = { az: 0, el: 0 };
        else offsetTween.current = { from: { ...offset.current }, t: 0 };
        invalidate();
      },
      turn: (dAz, dEl) => {
        offsetTween.current = null;
        const b = baseView(viewNow.current.m, viewNow.current.p);
        const o = offset.current;
        o.az = Math.max(-OFFSET_AZ_MAX, Math.min(OFFSET_AZ_MAX, o.az + dAz));
        // the total elevation stays within [EL_MIN, EL_MAX]
        const lo = Math.max(OFFSET_EL_MIN, EL_MIN - b.el);
        const hi = Math.min(OFFSET_EL_MAX, EL_MAX - b.el);
        o.el = Math.max(lo, Math.min(hi, o.el + dEl));
        invalidate();
      },
    };
    return () => {
      api.current = null;
    };
  }, [api, reduce, invalidate]);

  // a new surface (or the globe alone): glide from where the camera is
  const key = view.m ?? 'globe';
  const prevKey = useRef(key);
  useEffect(() => {
    if (prevKey.current === key) return;
    prevKey.current = key;
    if (!reduce && last.current) poseTween.current = { from: { ...last.current, target: last.current.target.clone() }, t: 0 };
    invalidate();
  }, [key, reduce, invalidate]);
  useEffect(() => invalidate(), [view.p, size.width, size.height, invalidate]);

  useFrame((_, dt) => {
    let moving = false;
    const ot = offsetTween.current;
    if (ot) {
      ot.t = Math.min(1, ot.t + dt / 0.6);
      const e = ease(ot.t);
      offset.current = { az: ot.from.az * (1 - e), el: ot.from.el * (1 - e) };
      if (ot.t >= 1) offsetTween.current = null;
      moving = true;
    }
    const b = baseView(view.m, view.p);
    const el = Math.max(EL_MIN, Math.min(EL_MAX, b.el + offset.current.el));
    const az = b.az + offset.current.az;
    const e = view.m === 'az' ? 0 : view.p;
    const fit = fitCamera(framePoints(view.m, e, el, az), el, az, size.width / Math.max(1, size.height), CAM_FOV, 0.96);
    let pose: Pose = { el, az, target: new THREE.Vector3(...fit.target), dist: fit.dist };
    const pt = poseTween.current;
    if (pt) {
      pt.t = Math.min(1, pt.t + dt / 0.7);
      const k = ease(pt.t);
      pose = {
        el: pt.from.el + (pose.el - pt.from.el) * k,
        az: pt.from.az + (pose.az - pt.from.az) * k,
        target: pt.from.target.clone().lerp(pose.target, k),
        dist: pt.from.dist + (pose.dist - pt.from.dist) * k,
      };
      if (pt.t >= 1) poseTween.current = null;
      moving = true;
    }
    last.current = pose;
    const ce = pose.el * D2R;
    const ca = pose.az * D2R;
    const d = new THREE.Vector3(Math.cos(ce) * Math.cos(ca), Math.sin(ce), -Math.cos(ce) * Math.sin(ca));
    camera.position.copy(pose.target).addScaledVector(d, pose.dist);
    camera.up.set(-Math.sin(ce) * Math.cos(ca), Math.cos(ce), Math.sin(ce) * Math.sin(ca));
    camera.lookAt(pose.target);
    camera.updateMatrixWorld();
    // the floor shadow belongs to side views
    shadowFade.current = 1 - Math.min(1, Math.max(0, (pose.el - 30) / 35));
    if (moving) invalidate();
  }, -1);
  return null;
}

/* ───────────────────────── pointer: turning the view ───────────────────────── */

/** `scale`: the laptop fit's scale (LessonViewportFit) — screen px are turned back into layout px,
    so the globe turns as much per px of the shrunk stage as it does at full size. */
function DragTurn({ api, onEngage, scale }: { api: MutableRefObject<StageApi | null>; onEngage: () => void; scale: number }) {
  const gl = useThree((s) => s.gl);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  useEffect(() => {
    const el = gl.domElement;
    let id: number | null = null;
    let x = 0;
    let y = 0;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      id = e.pointerId;
      x = e.clientX;
      y = e.clientY;
      el.setPointerCapture(id);
      onEngage();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const dx = (e.clientX - x) / scaleRef.current;
      const dy = (e.clientY - y) / scaleRef.current;
      x = e.clientX;
      y = e.clientY;
      // the globe's face follows the hand: dragging right brings the west into view
      api.current?.turn(-dx * 0.32, dy * 0.32);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      id = null;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [gl, api, onEngage]);
  return null;
}

/* ───────────────────────── wrapper ───────────────────────── */

class StageBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
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

function FrameCount({ onReady }: { onReady: () => void }) {
  const n = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    n.current++;
    if (!done.current && n.current >= 2) {
      done.current = true;
      onReady();
    }
  });
  return null;
}

export type ProjectionStage3DProps = {
  images: StageImages;
  view: StageView;
  reduce: boolean;
  active: boolean;
  api: MutableRefObject<StageApi | null>;
  onReady: () => void;
  onFail: () => void;
  onLost: () => void;
  /** the learner took hold of the view (a drag) */
  onEngage: () => void;
};

export default function ProjectionStage3D({ images, view, reduce, active, api, onReady, onFail, onLost, onEngage }: ProjectionStage3DProps) {
  const gone = useRef(false);
  useEffect(() => {
    gone.current = false;
    return () => {
      gone.current = true;
    };
  }, []);
  const shadowFade = useRef(1);
  const scale = useLessonViewportScale();
  return (
    <StageBoundary onFail={onFail}>
      <Canvas
        resize={LESSON_FIT_CANVAS_RESIZE}
        flat
        dpr={[1, 2]}
        camera={{ fov: CAM_FOV, near: 0.1, far: 60, position: [6, 1.6, -0.8] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        frameloop={active ? 'demand' : 'never'}
        style={{ touchAction: 'none' }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            if (!gone.current) onLost();
          });
        }}
      >
        <Rig view={view} reduce={reduce} api={api} shadowFade={shadowFade} />
        <Earth images={images} view={view} />
        <Shadow fade={shadowFade} />
        <Sheets view={view} reduce={reduce} />
        <DragTurn api={api} onEngage={onEngage} scale={scale} />
        <FrameCount onReady={onReady} />
      </Canvas>
    </StageBoundary>
  );
}

