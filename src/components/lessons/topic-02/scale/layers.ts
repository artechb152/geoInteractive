import { ATTRIBUTION, SHEETS, type SheetId, type SheetMeta } from './scaleSheets.data';
import type { ViewMode } from './controls';
import type { LayerSpec } from './SheetViewport';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Public asset URL with the static-export basePath. */
export const asset = (src: string) => `${BASE}${src}`;

export const CURTAIN_LABELS = { left: 'תצ״א', right: 'מפה טופוגרפית' } as const;

/** Orthophoto is the base layer, the map is on top; the representation decides what shows. */
export function layersFor(sheet: SheetMeta, mode: ViewMode): {
  base: LayerSpec;
  top: LayerSpec;
  display: 'base' | 'top' | 'curtain';
  attribution: string;
} {
  return {
    base: { key: `${sheet.id}-ortho`, src: asset(sheet.ortho.src) },
    top: { key: `${sheet.id}-map`, src: asset(sheet.map.src) },
    display: mode === 'map' ? 'top' : mode === 'ortho' ? 'base' : 'curtain',
    attribution: mode === 'map' ? ATTRIBUTION.map : mode === 'ortho' ? ATTRIBUTION.ortho : `${ATTRIBUTION.map} · ${ATTRIBUTION.ortho}`,
  };
}

export function preloadFor(ids: readonly SheetId[]): string[] {
  return ids.flatMap((id) => [asset(SHEETS[id].ortho.src), asset(SHEETS[id].map.src)]);
}
