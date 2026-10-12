'use client';
/* The baked Natural Earth paths (~220 KB) load as their own chunk, after the lesson.
   Until they arrive — or if they fail — every map still works: zones, grid, point,
   numbers and feedback are computed, only the land is missing. */

import { useEffect, useState } from 'react';

export type Basemap = typeof import('./utmAtlasBasemap.data');

let cache: Basemap | null = null;
let pending: Promise<Basemap> | null = null;

export function useBasemap(): { basemap: Basemap | null; failed: boolean } {
  const [basemap, setBasemap] = useState<Basemap | null>(cache);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (cache) return;
    let live = true;
    pending ??= import('./utmAtlasBasemap.data');
    pending
      .then((m) => {
        cache = m;
        if (live) setBasemap(m);
      })
      .catch(() => {
        pending = null;
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, []);
  return { basemap, failed };
}
