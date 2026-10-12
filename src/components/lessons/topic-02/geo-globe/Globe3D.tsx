'use client';

/* ─────────── מערכת קואורדינטות גיאוגרפית — the explorer's 3-D globe ───────────
   Reference: design/mockups/geographic-coordinates-2026-10-12/01-globe-explorer.png.
   - The body is the WGS84 ellipsoid at true flattening (geoCoords.ellipsoidMesh):
     a geodetic (lat, lon) grid whose uv IS the plate carrée texture's parameter.
   - Its surface (geo-globe/ASSET-MANIFEST.md): NASA Blue Marble Next Generation
     colour, relief normals from GEBCO land elevation, a water mask for the sea's
     soft sheen. Relief is light only — the geometry is never displaced, so the
     silhouette and the lines stay true.
   - The graticule (every 30°), the equator and Greenwich, and the selected
     parallel and meridian are drawn in the same fragment shader from the same
     lat / lon the texture is sampled with: they cannot drift from the map, and
     the body itself hides them on its far side. Widths are in screen pixels.
   - One soft key light fixed to the view (upper left, as the source imagery's own
     relief shading), so a turned globe stays lit and its shaded side readable.
   - Labels and the marker are HTML overlays projected every rendered frame, each
     anchored on the line it names, hidden by the exact occlusion test
     (geoCoords.facing / segmentHitsEllipsoid) — never moved to fake a view.
   - A "find" task's lettered choices are overlays too (buttons, placed like the marker).
   - Turning and zooming move the camera only. Frames render on demand. All GPU
     resources are disposed when the canvas unmounts (the explorer unmounts it
     away from the viewport). */

import { Component, useEffect, useMemo, useRef, type MutableRefObject, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  B, CAM_DIST, CAM_FOV, CAM_MAX, CAM_MIN, VIEW_START, ellipsoidMesh, facing, geodeticToScene, pickLabel, segmentHitsEllipsoid, viewDir,
  type Rect, type Signed, type Vec3,
} from './geoCoords';
import type { GlobeImages } from './globeAssets';

/* ── palette: lesson tokens only (tailwind.config.ts); the Earth's own colours are the imagery's ── */
const C = {
  accent: '#D97E2B', // accent — the selected parallel / meridian (and the marker, in the overlay)
  brand: '#749C75', // brand — the equator and Greenwich
  ink: '#38432E', // fg — the polar axis
  white: '#FFFFFF', // the fine graticule
} as const;

/** Key light in view space: from the upper left, a little in front. */
const KEY_VIEW = new THREE.Vector3(-0.36, 0.4, 0.84).normalize();
/** The north pole's short axis (scene units above the pole) and its label's anchor. */
const AXIS_LEN = 0.075;
const AXIS_TIP: Vec3 = [0, B + AXIS_LEN, 0];
const AXIS_PTS: Vec3[] = [[0, B, 0], [0, B + AXIS_LEN, 0]];

/* ───────────────────────── the shader ───────────────────────── */

const VERT = /* glsl */ `
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

const FRAG = /* glsl */ `
uniform sampler2D uColor;
uniform sampler2D uRelief;
uniform vec3 uLight;
uniform vec3 uCam;
uniform float uBump;
uniform float uAmb;
uniform float uKey;
uniform float uPx;
uniform vec2 uSel;
uniform float uSelOn;
uniform float uWin;
uniform vec3 uGridC;
uniform vec3 uStructC;
uniform vec3 uSelC;
varying vec2 vUv;
varying vec3 vPos;
varying vec3 vN;

// coverage of a line dDeg away, at degPerPx degrees per device pixel, wPx wide
float lineMask(float dDeg, float degPerPx, float wPx) {
  float d = dDeg / max(degPerPx, 1e-5);
  return clamp(0.5 * wPx + 0.5 - d, 0.0, 1.0);
}

void main() {
  // geodetic latitude / longitude: the texture's own parameter (geoCoords.geoToUv)
  float lat = vUv.y * 180.0 - 90.0;
  float lon = vUv.x * 360.0 - 180.0;
  float pxLat = length(vec2(dFdx(lat), dFdy(lat)));
  float pxLon = length(vec2(dFdx(lon), dFdy(lon)));

  vec3 albedo = texture2D(uColor, vUv).rgb;
  vec3 rel = texture2D(uRelief, vUv).rgb;
  float water = rel.b;

  // relief normal in the local east / north / up frame of the ellipsoid
  float phi = radians(lat);
  float lam = radians(lon);
  vec3 up = normalize(vN);
  vec3 east = vec3(-sin(lam), 0.0, -cos(lam));
  vec3 north = vec3(-sin(phi) * cos(lam), cos(phi), sin(phi) * sin(lam));
  vec2 t = (rel.rg * 255.0 - 128.0) / 127.0 * uBump;
  vec3 n = normalize(t.x * east + t.y * north + sqrt(max(0.0, 1.0 - dot(t, t))) * up);

  // one soft key light (wrapped, so the shaded side stays readable) and an even fill
  vec3 L = normalize(uLight);
  vec3 V = normalize(uCam - vPos);
  float diff = clamp((dot(n, L) + 0.45) / 1.45, 0.0, 1.0);
  float body = clamp((dot(up, L) + 0.45) / 1.45, 0.0, 1.0);
  vec3 col = albedo * (uAmb + uKey * diff);

  // the sea: a broad, quiet sheen — never a plastic hotspot
  vec3 H = normalize(L + V);
  float nh = max(dot(up, H), 0.0);
  col += water * (pow(nh, 80.0) * 0.06 + pow(nh, 10.0) * 0.022) * body;

  // the limb: a thin, soft edge of light on the lit side
  float ndv = clamp(dot(up, V), 0.0, 1.0);
  float rim = pow(1.0 - ndv, 3.2);
  col = mix(col, vec3(0.62, 0.78, 0.86) * (0.55 + 0.45 * body), rim * 0.42 * (0.45 + 0.55 * body));

  // ── lines (screen-pixel widths) ──
  float lit = 0.74 + 0.26 * body;
  // the fine graticule every 30°; meridians ease out near the poles where they converge
  float gLat = abs(mod(lat + 15.0, 30.0) - 15.0);
  float gLon = abs(mod(lon + 15.0, 30.0) - 15.0);
  float merFade = 1.0 - smoothstep(80.0, 87.0, abs(lat));
  float grid = max(lineMask(gLat, pxLat, 1.0 * uPx), lineMask(gLon, pxLon, 1.0 * uPx) * merFade);
  col = mix(col, uGridC * lit, grid * 0.34);
  // the equator and Greenwich: structural, a sage line with a light core
  float gwFade = 1.0 - smoothstep(86.0, 89.6, abs(lat));
  float sO = max(lineMask(abs(lat), pxLat, 2.8 * uPx), lineMask(abs(lon), pxLon, 2.8 * uPx) * gwFade);
  float sI = max(lineMask(abs(lat), pxLat, 1.1 * uPx), lineMask(abs(lon), pxLon, 1.1 * uPx) * gwFade);
  col = mix(col, uStructC * lit, sO * 0.95);
  col = mix(col, mix(uStructC, vec3(1.0), 0.6) * lit, sI * 0.9);
  // the selected parallel and meridian (orange), stronger once the location is right
  float dLat = abs(lat - uSel.x);
  float dLon = abs(mod(lon - uSel.y + 180.0, 360.0) - 180.0);
  float w = mix(2.6, 3.4, uWin) * uPx;
  float glow = max(lineMask(dLat, pxLat, 11.0 * uPx), lineMask(dLon, pxLon, 11.0 * uPx)) * uWin * uSelOn;
  col = mix(col, mix(col, uSelC, 0.5), glow * 0.26);
  float sel = max(lineMask(dLat, pxLat, w), lineMask(dLon, pxLon, w)) * uSelOn;
  col = mix(col, uSelC * (0.86 + 0.14 * body), sel);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

function globeMaterial(color: THREE.Texture, relief: THREE.Texture) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uColor: { value: color },
      uRelief: { value: relief },
      uLight: { value: new THREE.Vector3() },
      uCam: { value: new THREE.Vector3() },
      uBump: { value: 0.85 },
      uAmb: { value: 0.47 },
      uKey: { value: 0.66 },
      uPx: { value: 1 },
      uSel: { value: new THREE.Vector2() },
      uSelOn: { value: 0 },
      uWin: { value: 0 },
      uGridC: { value: new THREE.Color(C.white) },
      uStructC: { value: new THREE.Color(C.brand) },
      uSelC: { value: new THREE.Color(C.accent) },
    },
  });
}

/* ───────────────────────── the scene ───────────────────────── */

function Earth({ images, sel, win, reduce }: { images: GlobeImages; sel: Signed | null; win: boolean; reduce: boolean }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  const res = useMemo(() => {
    const m = ellipsoidMesh(192, 384);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(m.position, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(m.normal, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(m.uv, 2));
    geom.setIndex(new THREE.BufferAttribute(m.index, 1));
    geom.computeBoundingSphere();
    const tex = (img: HTMLImageElement, srgb: boolean) => {
      const t = new THREE.Texture(img);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = THREE.RepeatWrapping; // across the 180° seam
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
      t.needsUpdate = true;
      return t;
    };
    const color = tex(images.color, true);
    const relief = tex(images.relief, false);
    const mat = globeMaterial(color, relief);
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

  // the selection and the success emphasis (eased unless reduced motion)
  const winNow = useRef(win ? 1 : 0);
  const lat = sel?.lat ?? 0;
  const lon = sel?.lon ?? 0;
  const on = !!sel;
  useEffect(() => {
    res.mat.uniforms.uSel.value.set(lat, lon);
    res.mat.uniforms.uSelOn.value = on ? 1 : 0;
    invalidate();
  }, [res, lat, lon, on, invalidate]);
  useEffect(() => invalidate(), [win, invalidate]);

  useFrame((_, dt) => {
    const u = res.mat.uniforms;
    // the light rides with the camera
    u.uLight.value.copy(KEY_VIEW).applyQuaternion(camera.quaternion);
    u.uCam.value.copy(camera.position);
    u.uPx.value = gl.getPixelRatio();
    const goal = win ? 1 : 0;
    if (reduce) winNow.current = goal;
    else if (Math.abs(goal - winNow.current) > 0.002) {
      winNow.current += (goal - winNow.current) * (1 - Math.exp(-dt * 7));
      invalidate();
    } else winNow.current = goal;
    u.uWin.value = winNow.current;
  });

  return (
    <>
      <mesh geometry={res.geom} material={res.mat} />
      {/* the north pole's axis: a short stub the "N" label sits on */}
      <Line points={AXIS_PTS} color={C.ink} lineWidth={2} />
    </>
  );
}

/* ───────────────────────── camera ───────────────────────── */

export type GlobeApi = {
  /** the opening view (camera only; the Home key) */
  resetView: () => void;
  /** turn the camera to a point */
  focus: (at: Signed) => void;
  /** only if one of these points is near the limb or behind it: turn to see them together */
  show: (pts: Signed[]) => void;
  /** keyboard: turn by (azimuth, elevation) radians; zoom by a factor */
  rotate: (dAz: number, dEl: number) => void;
  zoom: (f: number) => void;
};

type OrbitLike = { update: () => void; enabled: boolean };
/** A point counts as well in view while its surface faces the camera at least this much (cos). */
const SEEN = 0.35;
const POLAR_MIN = 0.14;
const POLAR_MAX = Math.PI - 0.14;
const v3 = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2]);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Clamp a direction away from the poles (the camera's up stays north). */
function clampPolar(d: THREE.Vector3) {
  const s = new THREE.Spherical().setFromVector3(d);
  s.phi = Math.min(POLAR_MAX, Math.max(POLAR_MIN, s.phi));
  s.radius = 1;
  return new THREE.Vector3().setFromSpherical(s);
}

function CameraRig({ api, reduce, memory }: { api: MutableRefObject<GlobeApi | null>; reduce: boolean; memory: MutableRefObject<Vec3 | null> }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;
  const invalidate = useThree((s) => s.invalidate);
  const tween = useRef<{ from: THREE.Vector3; q: THREE.Quaternion; d0: number; d1: number; t: number; dur: number } | null>(null);

  // opening view, or the view the learner left when the canvas was last unmounted
  useEffect(() => {
    const p = memory.current ?? (viewDir(VIEW_START.lat, VIEW_START.lon).map((c) => c * CAM_DIST) as Vec3);
    camera.position.set(p[0], p[1], p[2]);
    camera.lookAt(0, 0, 0);
    controls?.update();
    invalidate();
    return () => {
      memory.current = [camera.position.x, camera.position.y, camera.position.z];
    };
  }, [camera, controls, memory, invalidate]);

  useEffect(() => {
    const goTo = (dir: THREE.Vector3, dist: number) => {
      const to = clampPolar(dir.clone().normalize());
      const d1 = Math.min(CAM_MAX, Math.max(CAM_MIN, dist));
      if (reduce) {
        tween.current = null;
        camera.position.copy(to).multiplyScalar(d1);
        camera.lookAt(0, 0, 0);
        controls?.update();
        invalidate();
        return;
      }
      const from = camera.position.clone().normalize();
      const angle = from.angleTo(to);
      tween.current = { from, q: new THREE.Quaternion().setFromUnitVectors(from, to), d0: camera.position.length(), d1, t: 0, dur: Math.min(0.95, 0.35 + angle * 0.45) };
      invalidate();
    };
    api.current = {
      resetView: () => goTo(v3(viewDir(VIEW_START.lat, VIEW_START.lon)), CAM_DIST),
      focus: (at) => goTo(v3(viewDir(at.lat, at.lon)), Math.min(camera.position.length(), CAM_DIST)),
      show: (pts) => {
        const cam: Vec3 = [camera.position.x, camera.position.y, camera.position.z];
        if (!pts.length || pts.every((p) => facing(p.lat, p.lon, cam) > SEEN)) return;
        const d = pts.reduce((acc, p) => acc.add(v3(viewDir(p.lat, p.lon))), new THREE.Vector3());
        if (d.length() < 0.2) d.copy(v3(viewDir(pts[0].lat, pts[0].lon)));
        goTo(d, Math.min(camera.position.length(), CAM_DIST));
      },
      rotate: (dAz, dEl) => {
        const s = new THREE.Spherical().setFromVector3(camera.position);
        s.theta += dAz;
        s.phi -= dEl;
        goTo(new THREE.Vector3().setFromSpherical(s), camera.position.length());
      },
      zoom: (f) => goTo(camera.position.clone(), camera.position.length() * f),
    };
    return () => {
      api.current = null;
    };
  }, [api, camera, controls, reduce, invalidate]);

  // runs before OrbitControls' own update (−1) and the overlays (0)
  useFrame((_, dt) => {
    const tw = tween.current;
    if (!tw) return;
    tw.t = Math.min(1, tw.t + dt / tw.dur);
    const e = ease(tw.t);
    const dir = tw.from.clone().applyQuaternion(new THREE.Quaternion().slerp(tw.q, e));
    camera.position.copy(dir).multiplyScalar(tw.d0 + (tw.d1 - tw.d0) * e);
    camera.lookAt(0, 0, 0);
    controls?.update();
    if (tw.t >= 1) tween.current = null;
    invalidate();
  }, -2);
  return null;
}

/* ───────────────────────── overlays ───────────────────────── */

export type OverlayRefs = {
  stage: RefObject<HTMLDivElement | null>;
  /** the selected point (the explorer; a task's answer once the task is over) */
  marker: RefObject<HTMLDivElement | null>;
  latChip: RefObject<HTMLDivElement | null>;
  lonChip: RefObject<HTMLDivElement | null>;
  /** a "find" task's lettered choices, in order */
  choices: MutableRefObject<(HTMLButtonElement | null)[]>;
  /** the point a "read" task asks about */
  target: RefObject<HTMLDivElement | null>;
  /** a miss, said beside where it was made */
  note: RefObject<HTMLDivElement | null>;
  equator: RefObject<HTMLDivElement | null>;
  greenwich: RefObject<HTMLDivElement | null>;
  north: RefObject<HTMLDivElement | null>;
  /** the soft contact shadow under the globe (behind the canvas) */
  shadow: RefObject<HTMLDivElement | null>;
};

const MARKER = 20;
/** a choice's lettered disc, px */
export const CHOICE = 30;
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type OverlayProps = { refs: OverlayRefs; sel: Signed | null; choices: Signed[]; target: Signed | null; note: Signed | null; onFrame: () => void };

function OverlaySync({ refs, sel, choices, target, note, onFrame }: OverlayProps) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const v = useMemo(() => new THREE.Vector3(), []);
  const key = [sel, target, note, ...choices].map((p) => (p ? `${p.lat},${p.lon}` : '-')).join('|');
  useEffect(() => invalidate(), [key, size.width, size.height, invalidate]);

  useFrame(() => {
    const stage = refs.stage.current;
    if (!stage) return;
    camera.updateMatrixWorld();
    const cam: Vec3 = [camera.position.x, camera.position.y, camera.position.z];
    const W = size.width;
    const H = size.height;
    const project = (p: Vec3) => {
      v.set(p[0], p[1], p[2]).project(camera);
      return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
    };
    const show = (el: HTMLElement | null, r: Rect | null, opacity = 1) => {
      if (!el) return;
      if (!r) {
        el.style.opacity = '0';
        el.dataset.shown = 'false';
        return;
      }
      el.style.transform = `translate(${(r.x - r.w / 2).toFixed(1)}px, ${(r.y - r.h / 2).toFixed(1)}px)`;
      el.style.opacity = String(opacity);
      el.dataset.shown = opacity > 0.5 ? 'true' : 'false';
    };
    const sizeOf = (el: HTMLElement | null) => ({ w: el?.offsetWidth ?? 0, h: el?.offsetHeight ?? 0 });
    const placed: Rect[] = [];
    const bounds = { w: W, h: H, pad: 4 };

    // the contact shadow: under the body's projected disc (the light rides with the camera, so it stays below)
    const sh = refs.shadow.current;
    if (sh) {
      const c = project([0, 0, 0]);
      const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360;
      const rp = (H / 2) * (Math.tan(Math.asin(1 / camera.position.length())) / Math.tan(fov));
      sh.style.transform = `translate(${(c.x - rp * 0.62).toFixed(1)}px, ${(c.y + rp * 0.93).toFixed(1)}px)`;
      sh.style.width = `${(rp * 1.24).toFixed(1)}px`;
      sh.style.height = `${(rp * 0.17).toFixed(1)}px`;
    }

    // a point on the surface: set on it, faded out across the limb; where it shows, or null
    const point = (el: HTMLElement | null, p: Signed | null, d: number) => {
      if (!p) {
        show(el, null);
        return null;
      }
      const f = facing(p.lat, p.lon, cam);
      const q = project(geodeticToScene(p.lat, p.lon));
      const o = smoothstep(0.015, 0.09, f);
      show(el, { x: q.x, y: q.y, w: d, h: d }, o);
      if (o <= 0.5) return null;
      placed.push({ x: q.x, y: q.y, w: d + 6, h: d + 6 });
      return { ...q, f };
    };
    const m = point(refs.marker.current, sel, MARKER);
    point(refs.target.current, target, MARKER + 8);
    // the choices: buttons, so one behind the globe must not take a click
    refs.choices.current.forEach((el, i) => {
      const r = point(el, choices[i] ?? null, CHOICE);
      if (el) el.style.visibility = r ? 'visible' : 'hidden';
    });

    // the miss note: beside its point — east of it, else west, above, below
    const noteEl = refs.note.current;
    let noteR: Rect | null = null;
    const nf = note ? facing(note.lat, note.lon, cam) : 0;
    const at = note && nf > 0.09 ? { ...project(geodeticToScene(note.lat, note.lon)), f: nf } : null;
    if (at) {
      const ns = sizeOf(noteEl);
      const gx = ns.w / 2 + CHOICE / 2 + 6;
      const gy = ns.h / 2 + CHOICE / 2 + 6;
      noteR = pickLabel(
        [
          { x: at.x + gx, y: at.y, facing: at.f, cost: 0 },
          { x: at.x - gx, y: at.y, facing: at.f, cost: 1 },
          { x: at.x, y: at.y - gy, facing: at.f, cost: 2 },
          { x: at.x, y: at.y + gy, facing: at.f, cost: 3 },
        ],
        ns,
        placed.filter((q) => Math.hypot(q.x - at.x, q.y - at.y) > 1),
        bounds,
        0,
      );
    }
    show(noteEl, noteR);
    if (noteR) placed.push(noteR);

    // the selected meridian's value: on the meridian, just north of the point (else south)
    const lonEl = refs.lonChip.current;
    const lonSize = sizeOf(lonEl);
    const lonCands = [];
    for (let k = 1; k <= 60 && m && sel; k++)
      for (const sgn of [1, -1]) {
        const la = sel.lat + sgn * k * 1.5;
        if (Math.abs(la) > 89) continue;
        const p = project(geodeticToScene(la, sel.lon));
        const d = Math.hypot(p.x - m.x, p.y - m.y);
        if (d < lonSize.h / 2 + MARKER / 2 + 9) continue;
        lonCands.push({ x: p.x, y: p.y, facing: facing(la, sel.lon, cam), cost: d + (sgn < 0 ? 60 : 0) });
      }
    // on Greenwich / the equator the structural label already names the line and its 0°
    const lonR = !sel || sel.lon === 0 ? null : pickLabel(lonCands, lonSize, placed, bounds, 0.12);
    show(lonEl, lonR);
    if (lonR) placed.push(lonR);

    // the selected parallel's value: on the parallel, just east of the point (else west);
    // at a pole, where the parallel is the point itself, beside the marker
    const latEl = refs.latChip.current;
    const latSize = sizeOf(latEl);
    const latCands = [];
    if (m && sel && Math.abs(sel.lat) >= 89.5) {
      for (const sgn of [1, -1]) latCands.push({ x: m.x + sgn * (latSize.w / 2 + MARKER / 2 + 8), y: m.y, facing: m.f, cost: sgn < 0 ? 1 : 0 });
    } else
      for (let k = 1; k <= 80 && m && sel; k++)
        for (const sgn of [1, -1]) {
          const lo = sel.lon + sgn * k * 1.5;
          const p = project(geodeticToScene(sel.lat, lo));
          const d = Math.hypot(p.x - m.x, p.y - m.y);
          if (d < latSize.w / 2 + MARKER / 2 + 10) continue;
          latCands.push({ x: p.x, y: p.y, facing: facing(sel.lat, lo, cam), cost: d + (sgn < 0 ? 60 : 0) });
        }
    const latR = !sel || sel.lat === 0 ? null : pickLabel(latCands, latSize, placed, bounds, 0.12);
    show(latEl, latR);
    if (latR) placed.push(latR);

    // the pole's "N": above the axis tip, when nothing of the body lies in between
    const nEl = refs.north.current;
    const nSize = sizeOf(nEl);
    const tip = project(AXIS_TIP);
    const nR = { x: tip.x, y: tip.y - nSize.h / 2 - 2, w: nSize.w, h: nSize.h };
    const nOk = !segmentHitsEllipsoid(cam, AXIS_TIP) && nR.y - nR.h / 2 > 0 && nR.x > 0 && nR.x < W;
    show(nEl, nOk ? nR : null);
    if (nOk) placed.push(nR);

    // Greenwich: on its meridian, as near 25°N as the view allows
    const gEl = refs.greenwich.current;
    const gSize = sizeOf(gEl);
    const gCands = [];
    for (let la = -66; la <= 66; la += 2) {
      const p = project(geodeticToScene(la, 0));
      gCands.push({ x: p.x, y: p.y, facing: facing(la, 0, cam), cost: Math.abs(la - 25) });
    }
    const gR = pickLabel(gCands, gSize, placed, bounds, 0.08);
    show(gEl, gR);
    if (gR) placed.push(gR);

    // the equator: on it, toward the left limb (the reading starts there in the reference)
    const eEl = refs.equator.current;
    const eSize = sizeOf(eEl);
    const eCands = [];
    for (let lo = -180; lo < 180; lo += 2) {
      const p = project(geodeticToScene(0, lo));
      eCands.push({ x: p.x, y: p.y, facing: facing(0, lo, cam), cost: p.x });
    }
    const eR = pickLabel(eCands, eSize, placed, bounds, 0.34);
    show(eEl, eR);

    onFrame();
  });
  return null;
}

/* ───────────────────────── wrapper ───────────────────────── */

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

export type Globe3DProps = {
  images: GlobeImages;
  /** the parallel, meridian and point drawn (signed degrees, north / east positive); null: none */
  sel: Signed | null;
  /** the answer is right: lines and meeting point emphasised */
  win: boolean;
  choices: Signed[];
  target: Signed | null;
  /** where the miss note stands (the chosen or the checked point) */
  note: Signed | null;
  reduce: boolean;
  zoomEnabled: boolean;
  active: boolean;
  api: MutableRefObject<GlobeApi | null>;
  memory: MutableRefObject<Vec3 | null>;
  refs: OverlayRefs;
  onReady: () => void;
  /** the scene itself failed (shader, render error): show the flat map */
  onFail: () => void;
  /** the browser took the WebGL context away while the globe was showing (not our own unmount) */
  onLost: () => void;
};

export default function Globe3D({ images, sel, win, choices, target, note, reduce, zoomEnabled, active, api, memory, refs, onReady, onFail, onLost }: Globe3DProps) {
  const ready = useRef(false);
  // Unmounting (away from the viewport) disposes the renderer, which force-loses its context on
  // purpose: that loss is ours, not a failure — only a loss while mounted is reported.
  const gone = useRef(false);
  useEffect(() => {
    gone.current = false;
    return () => {
      gone.current = true;
    };
  }, []);
  const frames = useRef(0);
  const onFrame = () => {
    frames.current++;
    if (!ready.current && frames.current >= 2) {
      ready.current = true;
      onReady();
    }
  };
  const p = viewDir(VIEW_START.lat, VIEW_START.lon).map((c) => c * CAM_DIST) as Vec3;
  return (
    <GlobeBoundary onFail={onFail}>
      <Canvas
        flat
        dpr={[1, 2]}
        camera={{ position: memory.current ?? p, fov: CAM_FOV, near: 0.5, far: 20 }}
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
        <Earth images={images} sel={sel} win={win} reduce={reduce} />
        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          enablePan={false}
          enableZoom={zoomEnabled}
          zoomSpeed={0.6}
          rotateSpeed={0.42}
          minDistance={CAM_MIN}
          maxDistance={CAM_MAX}
          minPolarAngle={POLAR_MIN}
          maxPolarAngle={POLAR_MAX}
          enableDamping={!reduce}
          dampingFactor={0.12}
        />
        <CameraRig api={api} reduce={reduce} memory={memory} />
        <OverlaySync refs={refs} sel={sel} choices={choices} target={target} note={note} onFrame={onFrame} />
      </Canvas>
    </GlobeBoundary>
  );
}
