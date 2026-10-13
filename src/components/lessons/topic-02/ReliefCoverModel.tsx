'use client';

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import type { StateId } from './reliefCoverCompare.data';

/**
 * The "בשטח" board of „אותה גבעה, שלושה נופים”: the live model (ReliefCover3D, loaded only near the
 * viewport; drag turns it), or — without WebGL — a still of the same model in the same state
 * (captured from it by scripts/qa/capture-relief-cover-fallback.mjs).
 */

const ReliefCover3D = dynamic(() => import('./ReliefCover3D'), { ssr: false, loading: () => null });

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const FALLBACK = (s: StateId) => `${BASE}/assets/lessons/topic02/relief-cover-compare/${s}.jpg`;
const HAZE = 'bg-[#E4E1D6]';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** A canvas that fails to start (no context, shader error) switches the board to the still. */
class CanvasErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function ReliefCoverModel({ state, reduce, ariaLabel }: { state: StateId; reduce: boolean; ariaLabel: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [renderer, setRenderer] = useState<'pending' | 'live' | 'static'>('pending');
  const [activated, setActivated] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => setRenderer(hasWebGL() ? 'live' : 'static'), []);
  const fallBack = useCallback(() => setRenderer('static'), []);
  const onReady = useCallback(() => setReady(true), []);

  // Start the 3D only near the viewport; once started it stays (frames render on demand only).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setActivated(true), { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const live = renderer === 'live';

  return (
    <div
      ref={rootRef}
      className={cn('relative aspect-[518/352] w-full overflow-hidden', HAZE)}
      data-renderer={renderer}
      data-ready={ready || undefined}
    >
      {live && activated && (
        <CanvasErrorBoundary onError={fallBack}>
          <ReliefCover3D state={state} reduce={reduce} command={null} onReady={onReady} />
        </CanvasErrorBoundary>
      )}
      {renderer === 'static' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={FALLBACK(state)} alt="" className="absolute inset-0 size-full object-cover" data-fallback />
      )}

      {/* the figure's name for assistive tech; the canvas itself is aria-hidden */}
      <div role="img" aria-label={ariaLabel} className="pointer-events-none absolute inset-0" />

      {live && !ready && (
        <div className={cn('pointer-events-none absolute inset-0 flex items-center justify-center', HAZE)} data-loading>
          <span className="rounded-lg bg-bg-elevated/90 px-3 py-1.5 font-display text-sm font-semibold text-fg shadow-sm">טוען את מודל השטח…</span>
        </div>
      )}

      {live && (
        <div className="pointer-events-none absolute end-2.5 top-2.5" data-overlay>
          <span className="rounded-lg bg-pine/80 px-2 py-0.5 font-display text-sm font-semibold text-paper-bright">גררו לסיבוב</span>
        </div>
      )}
    </div>
  );
}
