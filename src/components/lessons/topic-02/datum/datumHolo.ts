/* ─────────────── דאטום — materials and the studio light ───────────────
   One lighting language for every surface of the guided datum view — the
   globe, its cut faces, the two reference bodies and the linked close-up
   (DatumInset3D) — so they read as one illustration:
   - a soft studio rig fixed to the view (a turned globe is always lit): a
     broad key from the upper left, a weak fill from the right, a warm
     ambient a little brighter from above, a soft GGX highlight driven by
     roughness, and a gentle rim;
   - the Earth: albedo + relief normals + roughness/valley maps (datumEarth),
     land a mineral satin, the sea a warm ivory glaze with a soft sheen whose
     shade turns toward the relief tan (not grey) — the greens untouched;
   - the geoid and the ellipsoid: lit bodies in their own colour, a Fresnel
     rim mostly in their own hue, highlights that can keep the body's hue
     (specTint), the highlight adding a little opacity so curvature reads;
     the geoid near-solid, its own waves in light and shade (aWave) and a
     contact shade where it meets the cut faces; their inner side is darker,
     so the inside reads as a volume;
   - the cut faces: the canvas section drawing, lit as a pane.
   No bloom, no additive glow: normal alpha blending, so the white card never
   washes out. Colours come in as lesson tokens; three converts them to
   linear and the output back to sRGB. */

import * as THREE from 'three';

/** The shared studio rig (view space). `studio` returns the lit colour and
    the specular amount (for see-through bodies, whose highlight also adds a
    little opacity). */
export const STUDIO_GLSL = /* glsl */ `
const vec3 KEY_DIR = vec3(-0.46, 0.72, 0.52);
const vec3 FILL_DIR = vec3(0.8, -0.15, 0.58);
float dGGX(float ndh, float r) {
  float a = r * r;
  float a2 = a * a;
  float d = ndh * ndh * (a2 - 1.0) + 1.0;
  return a2 / (3.14159265 * d * d);
}
vec3 studio(vec3 base, vec3 n, vec3 v, float rough, float specular, float occ, out float spec) {
  vec3 lk = normalize(KEY_DIR);
  vec3 lf = normalize(FILL_DIR);
  float ndl = dot(n, lk);
  float key = clamp((ndl + 0.25) / 1.25, 0.0, 1.0);
  float fill = max(dot(n, lf), 0.0);
  float amb = mix(0.22, 0.38, 0.5 + 0.5 * n.y) * occ;
  vec3 col = base * (amb + 0.8 * key * mix(1.0, occ, 0.5) + 0.1 * fill);
  vec3 h = normalize(lk + v);
  float fr = 0.04 + 0.96 * pow(1.0 - max(dot(h, v), 0.0), 5.0);
  spec = dGGX(max(dot(n, h), 0.0), max(rough, 0.08)) * fr * max(ndl, 0.0) * 0.25 * specular;
  return col + vec3(spec);
}`;

const vertex = /* glsl */ `
attribute vec3 aEast;
attribute float aWave;
varying vec3 vN;
varying vec3 vE;
varying vec3 vV;
varying vec2 vUv;
varying float vWave;
varying vec3 vPos;
void main() {
  vUv = uv;
  vWave = aWave;
  vPos = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vE = mat3(modelViewMatrix) * aEast;
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

/* ─────────────── the Earth ─────────────── */

const earthFragment = /* glsl */ `
uniform sampler2D uAlbedo;
uniform sampler2D uNormal;
uniform sampler2D uSurface;
uniform float uBump;
uniform float uLand;
uniform float uSea;
uniform vec3 uRim;
uniform float uRimStrength;
uniform float uRimAlpha;
uniform float uInner;
uniform vec3 uWarm;
uniform float uWarmth;
varying vec3 vN;
varying vec3 vE;
varying vec3 vV;
varying vec2 vUv;
${STUDIO_GLSL}
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
void main() {
  vec3 v = normalize(vV);
  vec3 n = normalize(vN);
  vec3 e = normalize(vE - n * dot(n, vE));
  vec3 no = cross(n, e);
  vec4 s = texture2D(uSurface, vUv);
  // relief only on the land: the sea stays one smooth ceramic surface
  vec3 tn = texture2D(uNormal, vUv).xyz * 2.0 - 1.0;
  tn.xy *= uBump * smoothstep(0.0, 0.4, s.r);
  vec3 nn = normalize(n * tn.z + e * tn.x + no * tn.y);
  if (!gl_FrontFacing) nn = -nn;
  vec3 base = texture2D(uAlbedo, vUv).rgb;
  float land = s.r;
  float spec;
  vec3 col;
  float fres = pow(1.0 - clamp(dot(nn, v), 0.0, 1.0), 3.0);
  if (uInner > 0.5) {
    // the inside of the shell, seen through the opening: in the shell's own shade
    col = studio(base, nn, v, 0.9, 0.0, 1.0, spec) * 0.6;
  } else {
    // land a mineral satin; the sea a warm ivory glaze with a soft sheen
    col = studio(base, nn, v, s.g, mix(1.5, 0.7, smoothstep(0.0, 0.2, land)), s.b, spec);
    // the ivory's shade turns warm, toward the relief tan, instead of grey;
    // the land keeps its own greens
    // (and stays light: an ivory is lit from all round, its shade is soft)
    float ivory = 1.0 - smoothstep(0.0, 0.3, land);
    vec3 diffuse = mix(col - vec3(spec), base, 0.14 * ivory);
    float lit = dot(diffuse, LUMA) / max(dot(base, LUMA), 1e-3);
    float warm = uWarmth * ivory * (1.0 - smoothstep(0.3, 1.0, lit));
    col = diffuse * mix(vec3(1.0), uWarm, warm) + vec3(spec);
    col += uRim * fres * uRimStrength;
  }
  gl_FragColor = vec4(min(col, vec3(1.0)), clamp(mix(uSea, uLand, land) + fres * uRimAlpha, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export type EarthOptions = {
  albedo: THREE.Texture;
  normal: THREE.Texture;
  surface: THREE.Texture;
  land: number;
  sea: number;
  bump?: number;
  rim?: string;
  rimStrength?: number;
  rimAlpha?: number;
  inner?: boolean;
  depthWrite?: boolean;
  /** how far the ivory's shade turns toward `warm` (0 = plain grey falloff) */
  warmth?: number;
  /** the warm shade hue (a lesson token) */
  warm?: string;
};

/** A token as a linear tint of unit luminance: multiplies a colour's hue toward it, not its brightness. */
function tint(hex: string) {
  const c = new THREE.Color(hex);
  const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return new THREE.Vector3(c.r / l, c.g / l, c.b / l);
}

export function earthMaterial(o: EarthOptions) {
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: earthFragment,
    transparent: true,
    side: o.inner ? THREE.BackSide : THREE.FrontSide,
    depthWrite: o.depthWrite ?? false,
    uniforms: {
      uAlbedo: { value: o.albedo },
      uNormal: { value: o.normal },
      uSurface: { value: o.surface },
      uBump: { value: o.bump ?? 1 },
      uLand: { value: o.land },
      uSea: { value: o.sea },
      uRim: { value: new THREE.Color(o.rim ?? '#FFFFFF') },
      uRimStrength: { value: o.rimStrength ?? 0 },
      uRimAlpha: { value: o.rimAlpha ?? 0 },
      uInner: { value: o.inner ? 1 : 0 },
      uWarm: { value: tint(o.warm ?? '#C9A56B') },
      uWarmth: { value: o.warmth ?? 0 },
    },
  });
}

/* ─────────────── reference bodies (geoid, ellipsoid) and the glass ─────────────── */

const bodyFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uRimColor;
uniform float uOpacity;
uniform float uRimStrength;
uniform float uRimAlpha;
uniform float uRimPower;
uniform float uRough;
uniform float uSpec;
uniform float uShade;
uniform float uRimWhite;
uniform float uSpecTint;
uniform float uWave;
uniform float uWallShade;
varying vec3 vN;
varying vec3 vV;
varying float vWave;
varying vec3 vPos;
${STUDIO_GLSL}
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vV);
  float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), uRimPower);
  float spec;
  // crests of the body's own waves a touch lighter, troughs deeper (aWave, from the data)
  vec3 base = uColor * (1.0 + uWave * vWave);
  // a soft contact shade where the body meets the cut faces (the planes x = 0 and z = 0,
  // section units): the opening reads deep, as in the reference
  float toWall = min(max(vPos.x, 0.0), max(vPos.z, 0.0));
  float occ = 1.0 - uWallShade * (1.0 - smoothstep(0.0, 34.0, toWall));
  vec3 col = studio(base, n, v, uRough, uSpec, occ, spec);
  // a highlight in the body's own hue (uSpecTint) keeps a coloured body coloured
  col = ((col - vec3(spec)) + mix(vec3(1.0), min(uColor * 1.8, vec3(1.0)), uSpecTint) * spec) * uShade;
  col += mix(uRimColor, vec3(1.0), uRimWhite) * fres * uRimStrength;
  float a = uOpacity + fres * uRimAlpha + min(spec, 1.0) * 0.5;
  gl_FragColor = vec4(min(col, vec3(1.0)), clamp(a, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export type BodyOptions = {
  color: string;
  /** rim hue (defaults to the body's own colour) */
  rim?: string;
  opacity: number;
  rimStrength: number;
  rimAlpha: number;
  rimPower?: number;
  rough?: number;
  spec?: number;
  shade?: number;
  /** how far the rim turns white (0 = the rim's own hue) */
  rimWhite?: number;
  /** 0 = white highlights, 1 = highlights in the body's own hue */
  specTint?: number;
  /** strength of the crest/trough shading from the geometry's `aWave` attribute */
  wave?: number;
  /** contact shade near the cutaway's planes (bodies centred in the globe, section units) */
  wallShade?: number;
  side?: THREE.Side;
  depthWrite?: boolean;
  colorWrite?: boolean;
};

export function bodyMaterial(o: BodyOptions) {
  const m = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: bodyFragment,
    transparent: true,
    side: o.side ?? THREE.FrontSide,
    depthWrite: o.depthWrite ?? false,
    uniforms: {
      uColor: { value: new THREE.Color(o.color) },
      uRimColor: { value: new THREE.Color(o.rim ?? o.color) },
      uOpacity: { value: o.opacity },
      uRimStrength: { value: o.rimStrength },
      uRimAlpha: { value: o.rimAlpha },
      uRimPower: { value: o.rimPower ?? 2.4 },
      uRough: { value: o.rough ?? 0.4 },
      uSpec: { value: o.spec ?? 1 },
      uShade: { value: o.shade ?? 1 },
      uRimWhite: { value: o.rimWhite ?? 0.45 },
      uSpecTint: { value: o.specTint ?? 0 },
      uWave: { value: o.wave ?? 0 },
      uWallShade: { value: o.wallShade ?? 0 },
    },
  });
  if (o.colorWrite === false) m.colorWrite = false;
  return m;
}

/** A depth-only copy of a body (no colour): the per-body passes in DatumGlobe3D. */
export function depthMaterial(side: THREE.Side = THREE.FrontSide, offset = 0) {
  const m = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, transparent: true, side });
  if (offset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = offset;
    m.polygonOffsetUnits = offset;
  }
  return m;
}

/** Update a material's uniforms in place (no recompile). */
export function setUniforms(m: THREE.ShaderMaterial, values: Record<string, number>) {
  for (const [k, v] of Object.entries(values)) m.uniforms[k].value = v;
}

/* ─────────────── the cut faces ─────────────── */

const wallFragment = /* glsl */ `
uniform sampler2D uMap;
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
${STUDIO_GLSL}
void main() {
  vec4 t = texture2D(uMap, vUv);
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  float spec;
  // the pane takes the room's light; the drawn section lines keep their colour
  float lit = dot(studio(vec3(1.0), n, normalize(vV), 0.7, 0.4, 1.0, spec), vec3(0.3333));
  gl_FragColor = vec4(min(t.rgb * mix(1.0, lit, 0.55), vec3(1.0)), t.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function wallMaterial(map: THREE.Texture) {
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: wallFragment,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: { uMap: { value: map } },
  });
}

/** Clear the depth buffer right before an object draws — the per-body passes
    in DatumGlobe3D each start from their own depth. */
export function clearDepthBefore(renderer: THREE.WebGLRenderer) {
  renderer.state.buffers.depth.setMask(true);
  renderer.clearDepth();
}
