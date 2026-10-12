/* The globe's two surface images (public/assets/lessons/topic02/geo-globe/,
   ASSET-MANIFEST.md there): loaded once per page, as plain images so the flat
   fallback and the explorer can use them without pulling three.js in. The 3-D
   view makes (and disposes) its own GPU textures from them. */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const GLOBE_DIR = `${BASE}/assets/lessons/topic02/geo-globe`;

export type GlobeImages = { color: HTMLImageElement; relief: HTMLImageElement };

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`globe image failed: ${src}`));
    img.src = src;
  });

let pending: Promise<GlobeImages> | null = null;
export function loadGlobeImages(): Promise<GlobeImages> {
  if (pending) return pending;
  pending = Promise.all([load(`${GLOBE_DIR}/earth-color.webp`), load(`${GLOBE_DIR}/earth-relief.png`)]).then(([color, relief]) => ({ color, relief }));
  pending.catch(() => {
    pending = null;
  });
  return pending;
}
