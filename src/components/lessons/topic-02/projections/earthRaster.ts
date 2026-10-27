/* ─────────── the projections lab's flat images: the Earth reprojected ───────────
   The maps are not a world picture squeezed into a shape: every map pixel is taken back
   through the method's inverse projection (projectionsModel.unproject) to a latitude /
   longitude, and the Earth is sampled there — the same plate carrée images the globe
   wears (geo-globe/ASSET-MANIFEST.md, loaded once by geo-globe/globeAssets.ts).
   - Sea: the shared colour image keeps its steel-blue sea for the explorer; here it is
     re-toned locally to the reference's natural medium blue, driven by the image's own
     bathymetric brightness and the relief image's water weight (B). Land is untouched.
   - Relief: the relief image's R / G normals give a soft hillshade on land.
   Without the images, the same pipeline runs on a raster of Natural Earth land
   (utm-atlas basemap), so the maps keep their land in the fallback. */

import { unproject, type Box, type Method } from './projectionsModel';

export type EarthPixels = {
  color: Uint8ClampedArray;
  cw: number;
  ch: number;
  /** R / G: relief normal (128 = flat), B: water weight (255 = water) */
  relief: Uint8ClampedArray;
  rw: number;
  rh: number;
  source: 'imagery' | 'basemap';
};

/* ── the sea ── */

/** The shared image's water ramp ends (ASSET-MANIFEST: deep #2A5466 … banks #679DA4). */
export const SRC_RAMP = { deep: '#2A5466', bank: '#679DA4' } as const;
const SRC_DEEP = [42, 84, 102];
const SRC_BANK = [103, 157, 164];
const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
export const SRC_LUM: [number, number] = [lum(SRC_DEEP[0], SRC_DEEP[1], SRC_DEEP[2]), lum(SRC_BANK[0], SRC_BANK[1], SRC_BANK[2])];

/** The maps' sea (sRGB): the reference map's open ocean (#67A9D2 sampled) to its shallow banks. */
export const MAP_SEA: { deep: number[]; bank: number[] } = { deep: [86, 154, 201], bank: [139, 194, 226] };
/** The globe's sea albedo (sRGB, before light): the reference's lit Atlantic (#2B679D sampled). */
export const GLOBE_SEA: { deep: string; bank: string } = { deep: '#2F6EA6', bank: '#6FA9D2' };

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Bilinear sample of an RGBA array at (u, v) ∈ [0, 1)², u wrapping across 180°. */
function bilinear(data: Uint8ClampedArray, w: number, h: number, u: number, v: number, out: number[]) {
  const x = u * w - 0.5;
  const y = v * h - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const xa = ((x0 % w) + w) % w;
  const xb = (xa + 1) % w;
  const ya = Math.min(h - 1, Math.max(0, y0));
  const yb = Math.min(h - 1, Math.max(0, y0 + 1));
  const i00 = (ya * w + xa) * 4;
  const i10 = (ya * w + xb) * 4;
  const i01 = (yb * w + xa) * 4;
  const i11 = (yb * w + xb) * 4;
  for (let c = 0; c < 3; c++) {
    const top = data[i00 + c] * (1 - fx) + data[i10 + c] * fx;
    const bot = data[i01 + c] * (1 - fx) + data[i11 + c] * fx;
    out[c] = top * (1 - fy) + bot * fy;
  }
}

const LIGHT = (() => {
  const l = [-0.55, 0.62, 0.56];
  const n = Math.hypot(l[0], l[1], l[2]);
  return l.map((v) => v / n);
})();

/** The map colour of the Earth at (lat, lon): sea re-toned, land with a soft hillshade. */
export function sampleEarth(px: EarthPixels, lat: number, lon: number, out: number[], tmp: number[] = [0, 0, 0]) {
  const u = (((lon + 180) / 360) % 1 + 1) % 1;
  const v = clamp01((90 - lat) / 180);
  bilinear(px.color, px.cw, px.ch, u, v, out);
  bilinear(px.relief, px.rw, px.rh, u, v, tmp);
  const L = lum(out[0], out[1], out[2]);
  // water: the mask, never the bright ice of sea ice and ice shelves
  const w = (tmp[2] / 255) * (1 - smoothstep(150, 196, L));
  if (w > 0.002) {
    const t = smoothstep(0, 1, (L - SRC_LUM[0]) / (SRC_LUM[1] - SRC_LUM[0]));
    for (let c = 0; c < 3; c++) out[c] = out[c] * (1 - w) + (MAP_SEA.deep[c] + (MAP_SEA.bank[c] - MAP_SEA.deep[c]) * t) * w;
  }
  if (w < 0.998) {
    const tE = ((tmp[0] - 128) / 127) * 0.8;
    const tN = ((tmp[1] - 128) / 127) * 0.8;
    const up = Math.sqrt(Math.max(0, 1 - tE * tE - tN * tN));
    const shade = (tE * LIGHT[0] + tN * LIGHT[1] + up * LIGHT[2]) / LIGHT[2];
    const k = 1 + (Math.min(1.35, Math.max(0.62, shade)) - 1) * 0.6 * (1 - w);
    for (let c = 0; c < 3; c++) out[c] = Math.min(255, out[c] * k);
  }
  return out;
}

/* ── loading ── */

function pixelsOf(src: CanvasImageSource, w: number, h: number): Uint8ClampedArray {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, w, h);
  return g.getImageData(0, 0, w, h).data;
}

let imageryPixels: Promise<EarthPixels> | null = null;

/** The images' pixels, decoded once per page: colour at 2048 × 1024 (the maps never need
    more), relief at its own 2048 × 1024 without colour conversion (its channels are data). */
export function earthPixelsFrom(images: { color: HTMLImageElement; relief: HTMLImageElement }): Promise<EarthPixels> {
  if (imageryPixels) return imageryPixels;
  imageryPixels = (async () => {
    const cw = 2048;
    const ch = 1024;
    const color = pixelsOf(images.color, cw, ch);
    const rw = images.relief.naturalWidth || 2048;
    const rh = images.relief.naturalHeight || 1024;
    const bmp = await createImageBitmap(images.relief, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const relief = pixelsOf(bmp, rw, rh);
    bmp.close();
    return { color, cw, ch, relief, rw, rh, source: 'imagery' as const };
  })();
  imageryPixels.catch(() => {
    imageryPixels = null;
  });
  return imageryPixels;
}

/** The fallback Earth: Natural Earth land (and lakes) rasterised in plate carrée — a flat
    land tone, no relief, the same sea ramp through the same water channel. Returns the
    pixels (maps) and the two images as canvases (the 3-D globe's textures). */
export function earthFromRings(land: [number, number][][], lakes: [number, number][][]): { pixels: EarthPixels; color: HTMLCanvasElement; relief: HTMLCanvasElement } {
  const cw = 1024;
  const ch = 512;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const path = (rings: [number, number][][]) => {
    g.beginPath();
    for (const ring of rings) {
      ring.forEach(([lon, lat], i) => {
        const x = ((lon + 180) / 360) * cw;
        const y = ((90 - lat) / 180) * ch;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.closePath();
    }
  };
  // the sea in the source's own deep tone, so the shared ramp re-tones it like the imagery
  g.fillStyle = `rgb(${SRC_DEEP.join(',')})`;
  g.fillRect(0, 0, cw, ch);
  g.fillStyle = '#A9A47E';
  path(land);
  g.fill('evenodd');
  g.fillStyle = `rgb(${SRC_DEEP.join(',')})`;
  path(lakes);
  g.fill('evenodd');
  const color = g.getImageData(0, 0, cw, ch).data;
  const relief = new Uint8ClampedArray(cw * ch * 4);
  for (let i = 0; i < cw * ch; i++) {
    const sea = color[i * 4 + 2] > color[i * 4] + 20;
    relief[i * 4] = 128;
    relief[i * 4 + 1] = 128;
    relief[i * 4 + 2] = sea ? 255 : 0;
    relief[i * 4 + 3] = 255;
  }
  const rc = document.createElement('canvas');
  rc.width = cw;
  rc.height = ch;
  rc.getContext('2d')!.putImageData(new ImageData(relief, cw, ch), 0, 0);
  return { pixels: { color, cw, ch, relief, rw: cw, rh: ch, source: 'basemap' }, color: c, relief: rc };
}

/* ── a map image ── */

/** Pixel ↔ flat coordinates for a map drawn at `scale` px per unit, its box's top-left at 0. */
export const frameOf = (box: Box, scale: number) => ({
  w: Math.max(1, Math.round((box.x1 - box.x0) * scale)),
  h: Math.max(1, Math.round((box.y1 - box.y0) * scale)),
  toFlat: (i: number, j: number): [number, number] => [box.x0 + (i + 0.5) / scale, box.y1 - (j + 0.5) / scale],
});

const cache = new Map<string, ImageData>();

/** The map's raster (transparent outside the map), cached per method, size, box and source. */
export function mapImage(px: EarthPixels, m: Method, box: Box, scale: number): ImageData {
  const f = frameOf(box, scale);
  const key = `${px.source}|${m}|${f.w}x${f.h}|${box.x0.toFixed(4)},${box.y1.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const img = new ImageData(f.w, f.h);
  const d = img.data;
  const rgb = [0, 0, 0];
  const tmp = [0, 0, 0];
  for (let j = 0; j < f.h; j++)
    for (let i = 0; i < f.w; i++) {
      const [x, y] = f.toFlat(i, j);
      const g = unproject(m, x, y);
      if (!g) continue;
      sampleEarth(px, g.lat, g.lon, rgb, tmp);
      const k = (j * f.w + i) * 4;
      d[k] = rgb[0];
      d[k + 1] = rgb[1];
      d[k + 2] = rgb[2];
      d[k + 3] = 255;
    }
  if (cache.size > 12) cache.delete(cache.keys().next().value!);
  cache.set(key, img);
  return img;
}
