'use client';
/**
 * The replay's fallback when WebGL is missing, fails to start, an asset fails
 * or the context is lost: photographs of the SAME model from the SAME
 * stations — four per moment, a quarter turn apart, starting at the opening
 * view (captured from the live canvas by
 * scripts/qa/capture-navigation-replay-fallback.mjs). The learner can turn by
 * quarters and finish the activity; the decision data does not depend on the
 * view. Marked as a fallback in the panel's header.
 */
import { useSyncExternalStore } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { turnDeg } from './replayWorld';
import type { ViewStore } from './replayViewStore';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const FALLBACK_DIR = `${BASE}/assets/lessons/topic06/navigation-replay/fallback`;
export const fallbackSrc = (momentIndex: number, quarter: number) => `${FALLBACK_DIR}/m${momentIndex + 1}-${quarter}.webp`;
const QUARTER_NAMES = ['מבט הפתיחה', 'רבע סיבוב ימינה', 'מבט לאחור', 'רבע סיבוב שמאלה'];

export function ReplayFallback({ momentIndex, view, reduce }: { momentIndex: number; view: ViewStore; reduce: boolean }) {
  const look = useSyncExternalStore(view.subscribe, view.get, view.get);
  const home = view.home();
  const quarter = (((Math.round(turnDeg(home.yawDeg, look.yawDeg) / 90) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  const turn = (q: number) => view.goTo({ ...home, yawDeg: home.yawDeg + q * 90 }, true);
  return (
    <div className="absolute inset-0" data-fallback data-quarter={quarter}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fallbackSrc(momentIndex, quarter)}
        alt={`תצלום מהמודל, ${QUARTER_NAMES[quarter]}`}
        className="h-full w-full object-cover"
        draggable={false}
        style={{ transition: reduce ? undefined : 'opacity 150ms' }}
      />
      <div className="absolute inset-y-0 flex items-center" style={{ left: 8 }} dir="ltr">
        <button type="button" onClick={() => turn(quarter - 1)} className="grid size-10 place-items-center rounded-full border border-border/80 bg-bg-elevated/95 text-black shadow-sm hover:bg-bg-accent" aria-label="פנייה שמאלה (רבע סיבוב)">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      </div>
      <div className="absolute inset-y-0 flex items-center" style={{ right: 8 }} dir="ltr">
        <button type="button" onClick={() => turn(quarter + 1)} className="grid size-10 place-items-center rounded-full border border-border/80 bg-bg-elevated/95 text-black shadow-sm hover:bg-bg-accent" aria-label="פנייה ימינה (רבע סיבוב)">
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
