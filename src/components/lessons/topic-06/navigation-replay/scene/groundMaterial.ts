/**
 * The ground's material, second generation: MeshStandardMaterial (sun, sky
 * light, both shadow maps, fog and tone mapping stay three.js') whose colour,
 * relief and occlusion come from four CC0 ground scans, each tiled at the
 * width of ground it photographed — a pebble is as big as it was:
 *
 *   cover   dry turf, dead grass and roots (grass_ground, 2.5 m) — the hillside
 *   soil    brown earth with stones and broken rock (rocks_ground_02, 2 m) — bare patches
 *   karst   pale limestone knobs breaking through the soil (rocks_ground_05, 3 m)
 *   gravel  pale broken stone and grit (rocks_ground_09, 3 m) — the road and the stream bed
 *
 * No visible repeat: each layer is read twice, the second time rotated and
 * shifted, mixed by a noise of a few metres, and the mix is re-contrasted so it
 * keeps one photo's crispness (a variance-preserving blend); from the middle
 * distance a third, coarser read joins in. The layers are blended by their own
 * heights (stones poke through soil, soil fills the hollows). Large-scale
 * variation — straw ↔ olive ↔ terra rossa, light and dark ground, thick maquis
 * as darker ground far away — is layered on top. Near the eye the scans' low
 * parts hold shade (crevices) and the contact map (contactMap.ts) darkens the
 * soil under every stone, tuft, shrub and trunk. Far away each layer fades to
 * its own average colour, so nothing shimmers.
 */
import { DataTexture, MeshStandardMaterial, NoColorSpace, RepeatWrapping, SRGBColorSpace, Vector3, Vector4, type Texture } from 'three';
import { GROUND_TILE_M } from './visualConfig';
import { patchLights } from './lighting';

export type GroundTextures = {
  albedo: [Texture, Texture, Texture, Texture];
  /** normal X / Y in RG, height in B */
  normal: [Texture, Texture, Texture, Texture];
};

export function prepareGroundTextures(t: GroundTextures, anisotropy: number) {
  t.albedo.forEach((x) => {
    x.colorSpace = SRGBColorSpace;
    x.wrapS = x.wrapT = RepeatWrapping;
    x.anisotropy = anisotropy;
    x.needsUpdate = true;
  });
  t.normal.forEach((x) => {
    x.colorSpace = NoColorSpace;
    x.wrapS = x.wrapT = RepeatWrapping;
    x.anisotropy = anisotropy;
    x.needsUpdate = true;
  });
}

/** Average linear colour of an albedo texture (its far colour), read from a small copy of its image. */
export function averageColor(t: Texture): Vector3 {
  const img = t.image as CanvasImageSource & { width: number; height: number };
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, 0, 0, 16, 16);
    const d = g.getImageData(0, 0, 16, 16).data;
    const lin = (v: number) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const out = new Vector3();
    for (let i = 0; i < d.length; i += 4) out.add(new Vector3(lin(d[i]), lin(d[i + 1]), lin(d[i + 2])));
    return out.multiplyScalar(1 / 256);
  } catch {
    return new Vector3(0.25, 0.22, 0.17);
  }
}

const GLSL_NOISE = /* glsl */ `
float nrHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float nrNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(nrHash(i), nrHash(i + vec2(1.0, 0.0)), u.x), mix(nrHash(i + vec2(0.0, 1.0)), nrHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// fbm with every octave turned ~37° off the last (and the first off the world axes): value noise on an
// axis-aligned lattice, thresholded into patches, otherwise leaves square blobs that read as a grid far away
float nrFbm(vec2 p) { const mat2 R = mat2(1.6, 1.2, -1.2, 1.6); p = mat2(0.8, 0.6, -0.6, 0.8) * p; float s = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { s += a * nrNoise(p); p = R * p + 17.1; a *= 0.5; } return s; }
// one octave, off the axes
float nrNoiseR(vec2 p) { return nrNoise(mat2(0.6, 0.8, -0.8, 0.6) * p + 3.1); }
vec2 nrRot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
`;

/** Segments of the road / the water courses the shader measures exact distances to (max). */
export const LINE_SEGMENTS = 192;
const emptySegments = () => Array.from({ length: LINE_SEGMENTS }, () => new Vector4());

/** No occlusion until a contact map is drawn. */
const OPEN = (() => {
  const t = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
})();

export function createGroundMaterial(t: GroundTextures, far: Vector3[]) {
  const m = new MeshStandardMaterial({ roughness: 0.94, metalness: 0, envMapIntensity: 1 });
  const uniforms = {
    uAlb0: { value: t.albedo[0] },
    uAlb1: { value: t.albedo[1] },
    uAlb2: { value: t.albedo[2] },
    uAlb3: { value: t.albedo[3] },
    uNor0: { value: t.normal[0] },
    uNor1: { value: t.normal[1] },
    uNor2: { value: t.normal[2] },
    uNor3: { value: t.normal[3] },
    uTile: { value: [...GROUND_TILE_M] },
    uFar0: { value: far[0] },
    uFar1: { value: far[1] },
    uFar2: { value: far[2] },
    uFar3: { value: far[3] },
    uContact: { value: OPEN as Texture },
    /** xz of the contact map's corner, 1 / its size (0: none) */
    uContactRect: { value: new Vector4(0, 0, 0, 0) },
    /** the road's and the water courses' segments (ax, az, bx, bz) round the world, and how many */
    uRoadSeg: { value: emptySegments() },
    uRoadN: { value: 0 },
    uWaterSeg: { value: emptySegments() },
    uWaterN: { value: 0 },
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    patchLights(shader);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aRoad;
attribute float aStream;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vRoad;
varying float vStream;`,
      )
      .replace(
        '#include <fog_vertex>',
        `#include <fog_vertex>
vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
vNormalW = normalize(mat3(modelMatrix) * objectNormal);
vRoad = aRoad;
vStream = aStream;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
uniform sampler2D uAlb0; uniform sampler2D uAlb1; uniform sampler2D uAlb2; uniform sampler2D uAlb3;
uniform sampler2D uNor0; uniform sampler2D uNor1; uniform sampler2D uNor2; uniform sampler2D uNor3;
uniform float uTile[4];
uniform vec3 uFar0; uniform vec3 uFar1; uniform vec3 uFar2; uniform vec3 uFar3;
uniform sampler2D uContact;
uniform vec4 uContactRect;
uniform vec4 uRoadSeg[${LINE_SEGMENTS}];
uniform int uRoadN;
uniform vec4 uWaterSeg[${LINE_SEGMENTS}];
uniform int uWaterN;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vRoad;
varying float vStream;
${GLSL_NOISE}
const float GR_ROT = 1.93;
const float GR_ROT3 = -1.07;
// Exact distance (and the direction away) from p to the nearest of n segments: the grids' interpolated
// distances (aRoad / aStream) are only metres-accurate, which would blur a road's edge into a smear.
vec3 grLineDist(vec2 p, int n, bool road) {
  float best = 1e9;
  vec2 dir = vec2(1.0, 0.0);
  for (int i = 0; i < ${LINE_SEGMENTS}; i++) {
    if (i >= n) break;
    vec4 s = road ? uRoadSeg[i] : uWaterSeg[i];
    vec2 a = s.xy, v = s.zw - s.xy;
    float t = clamp(dot(p - a, v) / max(dot(v, v), 1e-6), 0.0, 1.0);
    vec2 q = p - (a + v * t);
    float d2 = dot(q, q);
    if (d2 < best) { best = d2; dir = q; }
  }
  float d = sqrt(best);
  return vec3(d, dir / max(d, 1e-4));
}
// the three reads of a layer: base, rotated + shifted (same size), coarse (mid distance)
struct GrUV { vec2 a; vec2 b; vec2 c; };
GrUV grUV(vec2 xz, float tile) {
  GrUV u;
  u.a = xz / tile;
  u.b = nrRot(xz, GR_ROT) / (tile * 1.17) + vec2(0.37, 0.71);
  u.c = nrRot(xz, GR_ROT3) / (tile * 7.3) + vec2(0.61, 0.13);
  return u;
}`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
vec2 xz = vWorld.xz;
float camDist = distance(vWorld, cameraPosition);
vec3 nW = normalize(vNormalW);
float slope = 1.0 - nW.y;
float n1 = nrNoise(xz / 3.1);
float n2 = nrFbm(xz / 23.0);
float n3 = nrFbm(xz / 140.0 + 7.3);
// which read where: a few metres of noise; the coarse read only once single tiles could repeat as a pattern
float sB = smoothstep(0.32, 0.68, nrFbm(xz / 3.4 + 3.7));
float sC = smoothstep(0.3, 0.7, nrFbm(xz / 37.0 - 5.3)) * smoothstep(12.0, 50.0, camDist) * 0.45;

GrUV u0 = grUV(xz, uTile[0]);
GrUV u1 = grUV(xz, uTile[1]);
GrUV u2 = grUV(xz, uTile[2]);
GrUV u3 = grUV(xz, uTile[3]);
vec3 N0a = texture2D(uNor0, u0.a).rgb, N0b = texture2D(uNor0, u0.b).rgb, N0c = texture2D(uNor0, u0.c).rgb;
vec3 N1a = texture2D(uNor1, u1.a).rgb, N1b = texture2D(uNor1, u1.b).rgb, N1c = texture2D(uNor1, u1.c).rgb;
vec3 N2a = texture2D(uNor2, u2.a).rgb, N2b = texture2D(uNor2, u2.b).rgb, N2c = texture2D(uNor2, u2.c).rgb;
vec3 N3a = texture2D(uNor3, u3.a).rgb, N3b = texture2D(uNor3, u3.b).rgb, N3c = texture2D(uNor3, u3.c).rgb;
vec4 hgt = vec4(
  mix(mix(N0a.b, N0b.b, sB), N0c.b, sC), mix(mix(N1a.b, N1b.b, sB), N1c.b, sC),
  mix(mix(N2a.b, N2b.b, sB), N2c.b, sC), mix(mix(N3a.b, N3b.b, sB), N3c.b, sC));

// layer weights before height blending: open garrigue — dry turf and bare stony earth in patches,
// limestone breaking through where the ground is rocky
float wCover = 1.0;
float wSoil = smoothstep(0.3, 0.58, nrFbm(xz / 11.0 - 4.1)) * 1.15 + 0.35 * smoothstep(0.16, 0.4, slope) + 0.45;
// limestone patches: the threshold softens with distance so far slopes are mottled, not stencilled
float rockyEdge = mix(0.16, 0.3, smoothstep(30.0, 220.0, camDist));
float rocky = smoothstep(0.58 - rockyEdge, 0.58 + rockyEdge, nrFbm(xz / 26.0 + 2.9) + 0.18 * nrNoiseR(xz / 120.0));
float wKarst = rocky * 1.05 + smoothstep(0.3, 0.55, slope) * 0.4;

// exact distances near the road and the water courses (elsewhere the grids' are close enough)
float roadD = vRoad;
vec2 roadDir = vec2(0.0);
if (vRoad < 14.0 && uRoadN > 0) { vec3 r = grLineDist(xz, uRoadN, true); roadD = r.x; roadDir = r.yz; }
float waterD = vStream;
vec2 waterDir = vec2(0.0);
if (vStream < 16.0 && uWaterN > 0) { vec3 r = grLineDist(xz, uWaterN, false); waterD = r.x; waterDir = r.yz; }

// The dirt road (roadD: metres from its centre line): a compacted bed ~4.4 m wide, two wheel ruts
// worn into it with a strip of dry grass between them, and a low verge of loose earth and stones.
float rn = (n1 - 0.5);
float roadBed = 1.0 - smoothstep(1.95, 2.45, roadD + rn * 0.25);
float rut = (1.0 - smoothstep(0.22, 0.5, abs(roadD - 1.05) + rn * 0.12)) * roadBed;
float median = (1.0 - smoothstep(0.32, 0.55, roadD + rn * 0.15)) * roadBed;
float verge = smoothstep(1.9, 2.45, roadD + rn * 0.25) * (1.0 - smoothstep(2.9, 3.9, roadD + rn * 0.5));
// The dry stream (waterD: metres from the channel's centre line): a bed of cobbles and grit, and
// banks of bare, eroded earth rising out of it.
float sn = (n2 - 0.5);
float bed = 1.0 - smoothstep(2.0, 2.9, waterD + sn * 1.2);
float bank = smoothstep(1.9, 2.9, waterD + sn * 1.2) * (1.0 - smoothstep(4.2, 6.0, waterD + sn * 1.6));

float wGravel = max(roadBed * (0.85 - 0.5 * median), bed * 1.25);
wCover = wCover * (1.0 - roadBed * (1.0 - median * 0.8)) * (1.0 - bed) * (1.0 - bank * 0.7) + verge * 0.4;
wSoil = wSoil * (1.0 - roadBed * 0.6) + bank * 1.3 + verge * 0.5;
wKarst = max(wKarst * (1.0 - roadBed) * (1.0 - bank * 0.5), bed * (0.35 + 0.45 * n1));

// the scans' heights shape the layer edges only near the eye: further out they repeat with every
// tile, and a tile-periodic choice of layer reads as a lattice on a far slope
float hFade = 1.0 - smoothstep(22.0, 95.0, camDist);
vec4 score = vec4(wCover, wSoil, wKarst, wGravel) * 1.35 + hgt * vec4(0.45, 0.55, 0.75, 0.6) * hFade;
score *= step(0.001, vec4(wCover, wSoil, wKarst, wGravel));
float top = max(max(score.x, score.y), max(score.z, score.w));
vec4 bw = max(score - (top - 0.26), 0.0);
bw /= (bw.x + bw.y + bw.z + bw.w + 1e-4);

vec3 A0 = mix(mix(texture2D(uAlb0, u0.a).rgb, texture2D(uAlb0, u0.b).rgb, sB), texture2D(uAlb0, u0.c).rgb, sC);
vec3 A1 = mix(mix(texture2D(uAlb1, u1.a).rgb, texture2D(uAlb1, u1.b).rgb, sB), texture2D(uAlb1, u1.c).rgb, sC);
vec3 A2 = mix(mix(texture2D(uAlb2, u2.a).rgb, texture2D(uAlb2, u2.b).rgb, sB), texture2D(uAlb2, u2.c).rgb, sC);
vec3 A3 = mix(mix(texture2D(uAlb3, u3.a).rgb, texture2D(uAlb3, u3.b).rgb, sB), texture2D(uAlb3, u3.c).rgb, sC);
// one palette: the turf dried to autumn straw-grey, the soil towards terra rossa, the limestone a
// warm light grey (the scan's knobs are paper-white), the grit a touch warmer
const vec3 LUMW = vec3(0.2126, 0.7152, 0.0722);
#define GR_GRADE0(c) mix(c, dot(c, LUMW) * vec3(1.12, 1.0, 0.8), 0.5)
#define GR_GRADE1(c) (mix(c, dot(c, LUMW) * vec3(1.1, 1.0, 0.86), 0.5) * vec3(1.05, 0.98, 0.93))
#define GR_GRADE2(c) (mix(c, dot(c, LUMW) * vec3(1.08, 1.0, 0.88), 0.7) * 0.95)
#define GR_GRADE3(c) (c * vec3(1.03, 1.0, 0.94))
A0 = GR_GRADE0(A0);
A1 = GR_GRADE1(A1);
A2 = GR_GRADE2(A2);
A3 = GR_GRADE3(A3);
vec3 col = A0 * bw.x + A1 * bw.y + A2 * bw.z + A3 * bw.w;
vec3 farCol = GR_GRADE0(uFar0) * bw.x + GR_GRADE1(uFar1) * bw.y + GR_GRADE2(uFar2) * bw.z + GR_GRADE3(uFar3) * bw.w;
// averaging two reads flattens a photo: restore the contrast round the layers' mean
float sm = mix(sB, 0.5, sC);
col = max(farCol + (col - farCol) * inversesqrt(sm * sm + (1.0 - sm) * (1.0 - sm)), 0.0);
float hBlend = dot(hgt, bw);
// the road's bed is compacted: paler, finer and flatter than the loose ground beside it; the ruts
// a shade darker and smoother still, the verge loose and stony
float compact = roadBed * (1.0 - median * 0.85);
// (blended only a little towards the flat average: the bed keeps the grit's detail up close)
col = mix(col, mix(col, farCol, 0.18) * vec3(1.14, 1.09, 1.0), compact * 0.8);
col *= 1.0 - rut * 0.12;
col = mix(col, col * vec3(0.9, 0.86, 0.8), verge * 0.35);
// the channel: a pale, sun-bleached cobble bed; its banks bare earth, darker where they face away
col = mix(col, col * vec3(1.3, 1.26, 1.18) + vec3(0.02, 0.018, 0.014), bed * 0.75);
col = mix(col, col * vec3(0.86, 0.76, 0.66), bank * 0.45);
float far = smoothstep(35.0, 170.0, camDist);
col = mix(col, farCol, far);
// large-scale tints: dry straw ↔ olive ↔ red-brown soil, and light / dark ground
col *= mix(vec3(1.0, 0.96, 0.84), vec3(0.86, 0.93, 0.78), n3);
col = mix(col, col * vec3(1.1, 0.88, 0.74), smoothstep(0.55, 0.8, nrFbm(xz / 60.0 + 3.0)) * 0.5);
col *= 0.84 + 0.3 * n2;
// mottling at the scale a hillside is read from a few hundred metres: turf and bare patches, lighter
// and darker ground, so a far slope is never one even colour (nor a repeat of one tile)
float m1 = nrFbm(xz / 9.0 + 5.1);
float m2 = nrFbm(xz / 34.0 - 2.7);
col *= mix(1.0, 0.8 + 0.42 * m1 * m2 * 2.0, smoothstep(25.0, 160.0, camDist));
col = mix(col, col * vec3(1.08, 1.02, 0.86), smoothstep(0.55, 0.75, m2) * 0.5 * smoothstep(25.0, 160.0, camDist));
// low green-grey herbs mottling the dry cover
col = mix(col, col * vec3(0.76, 0.86, 0.66), smoothstep(0.5, 0.78, nrFbm(xz / 5.5 + 1.7)) * 0.55 * bw.x);
// thick maquis reads as darker ground where single shrubs are too small to draw
float cover = smoothstep(0.45, 0.8, nrFbm(xz / 75.0 + 11.0)) * smoothstep(300.0, 1400.0, camDist);
col *= 1.0 - 0.36 * cover;
diffuseColor.rgb = col;

// relief: the blended normal of the reads, turned back with the rotated ones
vec2 nA = (N0a.rg * 2.0 - 1.0) * bw.x + (N1a.rg * 2.0 - 1.0) * bw.y + (N2a.rg * 2.0 - 1.0) * bw.z + (N3a.rg * 2.0 - 1.0) * bw.w;
vec2 nB = (N0b.rg * 2.0 - 1.0) * bw.x + (N1b.rg * 2.0 - 1.0) * bw.y + (N2b.rg * 2.0 - 1.0) * bw.z + (N3b.rg * 2.0 - 1.0) * bw.w;
vec2 nC = (N0c.rg * 2.0 - 1.0) * bw.x + (N1c.rg * 2.0 - 1.0) * bw.y + (N2c.rg * 2.0 - 1.0) * bw.z + (N3c.rg * 2.0 - 1.0) * bw.w;
vec2 nxy = mix(mix(nA, nrRot(nB, -GR_ROT), sB), nrRot(nC, -GR_ROT3), sC);
nxy *= (1.0 - smoothstep(25.0, 120.0, camDist)) * mix(1.6, 1.15, smoothstep(5.0, 40.0, camDist)) * (1.0 - 0.55 * compact);

// Shape the height field cannot hold (its grid is metres): the road's bed sunk a hand's breadth
// between its verges, the ruts worn into it, the channel's banks — as a bump on the shading normal,
// from each profile's slope along the gradient of its distance field (Mikkelsen's surface gradient).
vec3 sigX = dFdx(vWorld);
vec3 sigY = dFdy(vWorld);
vec3 R1 = cross(sigY, nW);
vec3 R2 = cross(nW, sigX);
float det = dot(sigX, R1);
// the exact fields' own direction where measured, else the grid field's screen-space gradient
vec3 gRoad = (dFdx(vRoad) * R1 + dFdy(vRoad) * R2) / (abs(det) > 1e-12 ? det : 1e-12);
vec3 gStream = (dFdx(vStream) * R1 + dFdy(vStream) * R2) / (abs(det) > 1e-12 ? det : 1e-12);
gRoad = dot(roadDir, roadDir) > 0.5 ? vec3(roadDir.x, 0.0, roadDir.y) : gRoad / max(length(gRoad), 1e-4);
gStream = dot(waterDir, waterDir) > 0.5 ? vec3(waterDir.x, 0.0, waterDir.y) : gStream / max(length(gStream), 1e-4);
// onto the surface
gRoad = normalize(gRoad - nW * dot(gRoad, nW) + 1e-5);
gStream = normalize(gStream - nW * dot(gStream, nW) + 1e-5);
float dr = roadD;
// d(profile)/d(distance): the bed's edge rising to the verge, the verge falling away, the ruts
float slopeRoad = 0.16 * (smoothstep(1.7, 2.3, dr) - smoothstep(2.3, 2.6, dr)) - 0.07 * smoothstep(2.7, 3.6, dr) * (1.0 - smoothstep(3.6, 4.2, dr))
  + 0.1 * (dr - 1.05) / 0.22 * exp(-pow((dr - 1.05) / 0.22, 2.0));
float ds = waterD + sn * 1.2;
float slopeStream = 0.75 * smoothstep(1.9, 2.8, ds) * (1.0 - smoothstep(3.6, 5.6, ds));
float bumpFade = 1.0 - smoothstep(60.0, 240.0, camDist);
nW = normalize(nW - (gRoad * slopeRoad * step(roadD, 6.0) + gStream * slopeStream * step(waterD, 8.0)) * bumpFade);

// occlusion: the scans' low parts near the eye, and the contact map round everything that stands on the ground
vec2 cuv = (xz - uContactRect.xy) * uContactRect.z;
vec2 cedge = smoothstep(vec2(0.0), vec2(0.08), cuv) * smoothstep(vec2(1.0), vec2(0.92), cuv);
float contactRaw = texture2D(uContact, clamp(vec2(cuv.x, 1.0 - cuv.y), 0.0, 1.0)).r;
// many overlapping footprints (a cobble bed) would multiply into black: keep a floor of sky light
float contact = mix(1.0, max(contactRaw, 0.42), cedge.x * cedge.y * step(1e-6, uContactRect.z));
float crevice = mix(1.0, clamp(0.5 + 0.75 * hBlend, 0.5, 1.06), (1.0 - smoothstep(25.0, 110.0, camDist)) * (1.0 - 0.5 * bed));
float groundAO = crevice * contact;
float roughnessGround = mix(0.97, 0.86, bw.z + bw.w * 0.5) - 0.08 * compact;
`,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughnessGround;')
      .replace(
        '#include <aomap_fragment>',
        `
reflectedLight.indirectDiffuse *= groundAO;
reflectedLight.indirectSpecular *= groundAO;
reflectedLight.directDiffuse *= mix(1.0, groundAO, 0.55);
`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `{
  // world-aligned tangent frame (x east, z south), perturbed by the splat normal
  vec3 T = normalize(vec3(1.0, 0.0, 0.0) - nW * nW.x);
  vec3 B = normalize(cross(T, nW));
  vec3 pn = normalize(T * nxy.x + B * nxy.y + nW * sqrt(max(0.05, 1.0 - dot(nxy, nxy))));
  normal = normalize((viewMatrix * vec4(pn, 0.0)).xyz);
}`,
      );
  };
  m.customProgramCacheKey = () => 'nr-ground-v5';
  return { material: m, uniforms };
}
