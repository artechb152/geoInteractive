/**
 * נוצר אוטומטית ע"י tools/gen-area.mjs — אין לערוך ידנית.
 */
import type { TerrainArea } from '../types';
import area_gilboa from './gilboa';
import area_tavor from './tavor';
import area_sharon from './sharon';
import area_bental from './bental';
import area_meron from './meron';
import area_darga from './darga';
import area_ramon from './ramon';
import area_yizrael from './yizrael';

export const TERRAIN_AREAS: TerrainArea[] = [
  area_gilboa,
  area_tavor,
  area_sharon,
  area_bental,
  area_meron,
  area_darga,
  area_ramon,
  area_yizrael,
].sort((a, b) => a.order - b.order);

export const DEFAULT_AREA_ID = TERRAIN_AREAS[0].id;

export function getAreaById(id: string | null | undefined): TerrainArea {
  return TERRAIN_AREAS.find((a) => a.id === id) ?? TERRAIN_AREAS[0];
}
