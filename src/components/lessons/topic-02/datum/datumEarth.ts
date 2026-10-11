/* ─────────────── דאטום — the globe's surface (browser only) ───────────────
   Four small plate-carrée textures, built offline by
   scripts/build-datum-textures.mjs from public-domain data (credited in
   public/assets/lessons/topic02/datum-guided/ASSET-MANIFEST.md):
   - land elevation: NASA Earth Observatory / GEBCO (Blue Marble Next
     Generation topography), under a gentle display curve;
   - coastlines and lakes: Natural Earth 1:50m.
   earth-albedo  colour in the lesson tokens, no lighting baked in;
   earth-normal  tangent-space relief normals (R east, G north, B up);
   earth-surface R land mask · G roughness · B valley (cavity) shading;
   earth-height  display relief 0…1, read here on the CPU for the
                 geometry, the cut faces and the label occlusion test.
   The images load once per page; textures are made (and disposed) by the
   3-D view itself. */

import * as THREE from 'three';

/** Longitude (degrees) at the globe's azimuth λ = 0 — the outer rim of the
    exercise wall. East is −λ (λ runs from +x toward the camera), so with the
    cutaway in the front-right quarter, Africa and Europe face the default
    camera whole, on the left; the cutaway opens over Asia. */
export const LON_AT_WALL = 150;

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const DIR = `${BASE}/assets/lessons/topic02/datum-guided/textures`;

export type EarthImages = {
  albedo: HTMLImageElement;
  normal: HTMLImageElement;
  surface: HTMLImageElement;
};

/* ── the CPU relief: 0 until the height map has loaded ── */
let relief: { data: Float32Array; w: number; h: number; north: number; south: number } | null = null;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Display relief 0…1 at a geographic point (bilinear, wraps in longitude).
    Within a few degrees of a pole it eases to that pole's mean, so every
    meridian meets in one point (no spike, no seam). */
export function heightAt(lonDeg: number, latDeg: number) {
  const r = relief;
  if (!r) return 0;
  const fx = (((((lonDeg + 180) % 360) + 360) % 360) / 360) * r.w - 0.5;
  const fy = ((90 - latDeg) / 180) * r.h - 0.5;
  const x0 = Math.floor(fx);
  const y0 = Math.max(0, Math.min(r.h - 1, Math.floor(fy)));
  const y1 = Math.min(r.h - 1, y0 + 1);
  const tx = fx - x0;
  const ty = Math.max(0, Math.min(1, fy - y0));
  const xa = (x0 + r.w) % r.w;
  const xb = (x0 + 1 + r.w) % r.w;
  const top = r.data[y0 * r.w + xa] * (1 - tx) + r.data[y0 * r.w + xb] * tx;
  const bot = r.data[y1 * r.w + xa] * (1 - tx) + r.data[y1 * r.w + xb] * tx;
  const v = top * (1 - ty) + bot * ty;
  const pole = smooth(84, 89.5, Math.abs(latDeg));
  return v * (1 - pole) + (latDeg > 0 ? r.north : r.south) * pole;
}

let pending: Promise<EarthImages> | null = null;

/** Load the surface images once (cached for the page). */
export function loadEarth(): Promise<EarthImages> {
  if (pending) return pending;
  const loader = new THREE.ImageLoader();
  pending = Promise.all([
    loader.loadAsync(`${DIR}/earth-albedo.webp`),
    loader.loadAsync(`${DIR}/earth-normal.png`),
    loader.loadAsync(`${DIR}/earth-surface.png`),
    loader.loadAsync(`${DIR}/earth-height.png`),
  ]).then(([albedo, normal, surface, height]) => {
    const c = document.createElement('canvas');
    c.width = height.width;
    c.height = height.height;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(height, 0, 0);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    const data = new Float32Array(c.width * c.height);
    for (let i = 0; i < data.length; i++) data[i] = px[i * 4] / 255;
    const rowMean = (y: number) => {
      let s = 0;
      for (let x = 0; x < c.width; x++) s += data[y * c.width + x];
      return s / c.width;
    };
    relief = { data, w: c.width, h: c.height, north: rowMean(0), south: rowMean(c.height - 1) };
    return { albedo, normal, surface };
  });
  pending.catch(() => {
    pending = null;
  });
  return pending;
}

/** Textures for one 3-D view (the caller disposes them on unmount). */
export function earthTextures(img: EarthImages, anisotropy: number) {
  const make = (image: HTMLImageElement, srgb: boolean) => {
    const t = new THREE.Texture(image);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = anisotropy;
    t.needsUpdate = true;
    return t;
  };
  return { albedo: make(img.albedo, true), normal: make(img.normal, false), surface: make(img.surface, false) };
}
