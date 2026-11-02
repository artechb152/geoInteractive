'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { prefetchNavigate, startBackgroundPrefetch } from '@/lib/prefetch/backgroundPrefetch';

/**
 * Downloads the rest of the course in the background while the learner
 * browses (src/lib/prefetch/backgroundPrefetch.ts). Renders nothing; mounted
 * once in the root layout so it survives client-side navigation.
 */
export function BackgroundPrefetcher() {
  const pathname = usePathname();

  useEffect(() => {
    startBackgroundPrefetch(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- started once; later paths go through prefetchNavigate
  }, []);

  useEffect(() => {
    prefetchNavigate(pathname);
  }, [pathname]);

  return null;
}
