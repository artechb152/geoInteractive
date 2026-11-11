'use client';

import { useEffect } from 'react';
import { holdPrefetch } from '@/lib/prefetch/prefetchHold';

/** Holds the background prefetcher off while mounted (rendered by ModelLoading). */
export function HoldBackgroundPrefetch() {
  useEffect(() => holdPrefetch(), []);
  return null;
}
