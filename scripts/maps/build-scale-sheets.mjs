#!/usr/bin/env node
// Builds the three nested map sheets for the topic-02 scale scenes
// (docs/superpowers/specs/2026-10-08-scale-scene-redesign-design.md §4).
// Each sheet = one EPSG:3857 square box; the orthophoto and the topographic map are cut to the SAME box,
// so they register by construction.
// Run: node --experimental-strip-types scripts/maps/build-scale-sheets.mjs
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fromMerc, sheetBox } from '../../src/components/lessons/topic-02/scale/geo.ts';

const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', { paths: [dirname(require.resolve('next/package.json'))] }));

const CENTER = { lat: 32.687, lon: 35.39 }; // Mount Tavor (spec §3)
const SHEETS = [
  { id: '10k', denominator: 10000, groundWidthM: 2400, zoom: 15 },
  { id: '50k', denominator: 50000, groundWidthM: 12000, zoom: 13 },
  { id: '250k', denominator: 250000, groundWidthM: 60000, zoom: 11 },
];
const ORTHO_PX = 1600;
const ORIGIN = 20037508.342789244;
const OUT_DIR = 'public/assets/lessons/topic02/scene-scale/sheets';
const PUBLIC_PREFIX = '/assets/lessons/topic02/scene-scale/sheets';
const DATA_FILE = 'src/components/lessons/topic-02/scale/scaleSheets.data.ts';
const CACHE = join(tmpdir(), 'geo-scale-sheets-cache');
const UA = 'geoInteractive-course/1.0 (educational map sheets)';
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export';
const IHM = (z, x, y) => `https://israelhiking.osm.org.il/Hebrew/Tiles/${z}/${x}/${y}.png`;

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(CACHE, { recursive: true });

async function fetchCached(url, file) {
  if (existsSync(file)) return readFileSync(file);
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer()); // 204 → empty buffer (no tile)
      writeFileSync(file, buf);
      return buf;
    }
    if (attempt === 3) throw new Error(`${res.status} ${url}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

async function buildOrtho(s, box) {
  const url = `${ESRI}?bbox=${box.join(',')}&bboxSR=3857&imageSR=3857&size=${ORTHO_PX},${ORTHO_PX}&format=jpg&f=image`;
  const buf = await fetchCached(url, join(CACHE, `esri-${s.id}.jpg`));
  const meta = await sharp(buf).metadata();
  if (meta.width !== ORTHO_PX || meta.height !== ORTHO_PX) throw new Error(`esri ${s.id}: ${meta.width}x${meta.height}`);
  await sharp(buf).webp({ quality: 82 }).toFile(join(OUT_DIR, `${s.id}-ortho.webp`));
  return ORTHO_PX;
}

async function buildMap(s, box) {
  const res = (2 * ORIGIN) / (256 * 2 ** s.zoom);
  const px0 = (box[0] + ORIGIN) / res;
  const px1 = (box[2] + ORIGIN) / res;
  const py0 = (ORIGIN - box[3]) / res;
  const tx0 = Math.floor(px0 / 256);
  const tx1 = Math.floor(px1 / 256);
  const ty0 = Math.floor(py0 / 256);
  const ty1 = Math.floor((ORIGIN - box[1]) / res / 256);
  const tiles = [];
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      const buf = await fetchCached(IHM(s.zoom, tx, ty), join(CACHE, `ihm-${s.zoom}-${tx}-${ty}.png`));
      if (!buf.length) continue;
      tiles.push({ input: await sharp(buf).png().toBuffer(), left: (tx - tx0) * 256, top: (ty - ty0) * 256 });
      await new Promise((r) => setTimeout(r, 60)); // be polite to the tile server
    }
  }
  const mosaic = await sharp({
    create: { width: (tx1 - tx0 + 1) * 256, height: (ty1 - ty0 + 1) * 256, channels: 4, background: '#ffffff' },
  }).composite(tiles).png().toBuffer();
  const side = Math.round(px1 - px0);
  await sharp(mosaic)
    .extract({ left: Math.round(px0 - tx0 * 256), top: Math.round(py0 - ty0 * 256), width: side, height: side })
    .flatten({ background: '#ffffff' })
    .webp({ quality: 90 })
    .toFile(join(OUT_DIR, `${s.id}-map.webp`));
  return side;
}

const entries = [];
for (const s of SHEETS) {
  const box = sheetBox(CENTER, s.groundWidthM);
  const orthoPx = await buildOrtho(s, box);
  const mapPx = await buildMap(s, box);
  const sw = fromMerc(box[0], box[1]);
  const ne = fromMerc(box[2], box[3]);
  console.log(`[sheet] ${s.id}: ortho ${orthoPx}px, map ${mapPx}px (IHM z${s.zoom})`);
  entries.push(`  '${s.id}': {
    id: '${s.id}',
    denominator: ${s.denominator},
    center: { lat: ${CENTER.lat}, lon: ${CENTER.lon} },
    groundWidthM: ${s.groundWidthM},
    sheetCm: 24,
    bbox3857: [${box.map((v) => v.toFixed(3)).join(', ')}],
    corners: { sw: { lat: ${sw.lat.toFixed(6)}, lon: ${sw.lon.toFixed(6)} }, ne: { lat: ${ne.lat.toFixed(6)}, lon: ${ne.lon.toFixed(6)} } },
    ortho: { src: '${PUBLIC_PREFIX}/${s.id}-ortho.webp', px: ${orthoPx} },
    map: { src: '${PUBLIC_PREFIX}/${s.id}-map.webp', px: ${mapPx}, zoom: ${s.zoom} },
  },`);
}

const date = new Date().toISOString().slice(0, 10);
writeFileSync(DATA_FILE, `// GENERATED by scripts/maps/build-scale-sheets.mjs on ${date} — do not edit by hand.
// Orthophoto: Esri World Imagery (MapServer/export, EPSG:3857). Map: Israel Hiking Map Hebrew tiles
// (CC BY-NC-SA 3.0), mosaicked and cut to the same EPSG:3857 box. Sheets are 24 × 24 cm at their scale.
import type { LatLon, SheetGeometry } from './geo';

export type SheetId = '10k' | '50k' | '250k';
export type SheetMeta = SheetGeometry & {
  id: SheetId;
  corners: { sw: LatLon; ne: LatLon };
  ortho: { src: string; px: number };
  map: { src: string; px: number; zoom: number };
};

export const SHEET_IDS: readonly SheetId[] = ['10k', '50k', '250k'];

export const SHEETS: Record<SheetId, SheetMeta> = {
${entries.join('\n')}
};

export const ATTRIBUTION = {
  ortho: 'תצ״א: Esri, Vantor, Earthstar Geographics, GIS User Community',
  map: 'מפה: Israel Hiking Map · © תורמי OpenStreetMap · CC BY-NC-SA 3.0',
} as const;
`);
console.log(`[data] ${DATA_FILE}`);
