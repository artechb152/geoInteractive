'use client';
/* ─────────── "מהכדור למפה" — the short projection explainer before the atlas ───────────
   Three steps the learner chooses: a zone on the globe → the transverse cylinder
   touching the globe along the zone's central meridian → the flat transverse
   Mercator map, where equal ground circles grow away from the central meridian.
   Geometry: explainerGeometry.ts (step 3 is the real projection, via toUtm). */

import { useId, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { L } from '../Ltr';
import { useRovingKeys } from '../scale/controls';
import { BODY, HEADING } from './atlasControls';
import { decodeRings } from './atlasGeometry';
import {
  CM, EXPLAINER_ZONE, TM_REGION, clipToFront, clipToRegion, discPath, frontRuns, groundCircle, meridian, parallel, pathOf, tmFrame,
} from './explainerGeometry';
import { useBasemap } from './useBasemap';
import { zoneEast, zoneWest } from './utmAtlas';

type Step = 'globe' | 'cylinder' | 'map';
const STEPS: readonly Step[] = ['globe', 'cylinder', 'map'];
const TITLE: Record<Step, string> = { globe: 'פלח על הכדור', cylinder: 'גליל רוחבי', map: 'מפה מקומית' };

const W = 600;
const H = 340;
const G = { cx: 300, cy: 170, r: 132 };
const W36 = zoneWest(EXPLAINER_ZONE);
const E36 = zoneEast(EXPLAINER_ZONE);
const CIRCLE_LAT = 24;
const CIRCLE_OFFSETS = [-36, -18, 0, 18, 36];

const STEP_TEXT: Record<Step, ReactNode> = {
  globe: (
    <>
      כדור הארץ מחולק ל־60 פלחים צרים, בדרך כלל ברוחב <L>6°</L> של אורך. כל פלח מקבל מפה משלו. כאן פלח 36, מ־<L>30°E</L> עד <L>36°E</L>.
    </>
  ),
  cylinder: (
    <>
      בהיטל מרקטור רוחבי מדמיינים גליל שוכב על צדו סביב הכדור. הוא נוגע בכדור לאורך קו האמצע של הפלח, <L>33°E</L>. זה רק ציור להמחשה: ההיטל
      עצמו הוא חישוב מתמטי.
    </>
  ),
  map: (
    <>
      ההיטל מעביר את הפלח למישור בחישוב מתמטי, לא בפריסה של הגליל. בשטח כל העיגולים שווים; במפה הם גדלים ככל שמתרחקים מקו האמצע. בתוך פלח צר
      העיוות קטן מאוד, ולכן לכל פלח יש היטל משלו.
    </>
  ),
};

/** `header` — the block's heading and lead, set at the top of the card (one envelope per activity). */
export function UtmProjectionExplainer({ header }: { header?: ReactNode }) {
  const [step, setStep] = useState<Step>('globe');
  const uid = useId();
  const { onKeyDown, register } = useRovingKeys(STEPS, step, setStep);
  const { basemap } = useBasemap();

  const land = useMemo(() => (basemap ? decodeRings(basemap.LAND_D, basemap.BASEMAP_UNIT) : null), [basemap]);
  const globeLand = useMemo(() => (land ? discPath(land.map(clipToFront).filter(Boolean) as [number, number][][], G.cx, G.cy, G.r, true) : ''), [land]);
  const frame = useMemo(() => tmFrame(W, H, 18), []);
  const tmLand = useMemo(() => {
    if (!land) return '';
    return land
      .map((ring) => {
        const c = clipToRegion(ring);
        return c ? pathOf(c.map(([lon, lat]) => frame.xy(lat, lon)), true) : '';
      })
      .join('');
  }, [land, frame]);

  return (
    <div className="surface-elevated mb-6 p-6 lg:p-8" data-activity="utm-projection">
      {header}
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)] lg:gap-10">
        <div className="min-w-0">
          <h4 className={cn(HEADING, 'mb-4')}>מהכדור למפה: היטל מרקטור רוחבי</h4>
          <div role="tablist" aria-orientation="vertical" aria-label="שלבי ההיטל" className="flex flex-col gap-2" onKeyDown={onKeyDown}>
            {STEPS.map((s, i) => {
              const on = s === step;
              return (
                <button
                  key={s}
                  ref={register(s)}
                  type="button"
                  role="tab"
                  id={`${uid}-tab-${s}`}
                  aria-selected={on}
                  aria-controls={`${uid}-panel`}
                  tabIndex={on ? 0 : -1}
                  data-step={s}
                  onClick={() => setStep(s)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-1.5 text-start transition-colors duration-200 ease-snap motion-reduce:transition-none cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated',
                    on ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-xl font-display text-sm font-bold transition-colors duration-200 motion-reduce:transition-none',
                      on ? 'bg-accent text-white' : 'bg-bg-accent text-fg-muted',
                    )}
                  >
                    <L>{i + 1}</L>
                  </span>
                  <span className="min-w-0 flex-1 font-display text-base font-bold leading-tight text-fg">{TITLE[s]}</span>
                </button>
              );
            })}
          </div>
          <div id={`${uid}-panel`} role="tabpanel" tabIndex={0} aria-labelledby={`${uid}-tab-${step}`} className="mt-4 rounded-xl bg-bg-accent/60 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <p className={BODY} data-step-text={step}>
              {STEP_TEXT[step]}
            </p>
          </div>
        </div>

        <figure className="min-w-0">
          <div dir="ltr" role="img" aria-label={FIGURE_LABEL[step]} className="relative overflow-hidden rounded-xl border border-border/70 bg-paper-card [container-type:inline-size]">
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden>
              <Layer on={step !== 'map'}>
                <GlobeScene landPath={globeLand} cylinder={step === 'cylinder'} />
              </Layer>
              <Layer on={step === 'map'}>
                <MapScene landPath={tmLand} frame={frame} />
              </Layer>
            </svg>
            <Labels step={step} frame={frame} />
          </div>
        </figure>
      </div>
    </div>
  );
}

/** Map size of each equal ground circle relative to the one on the central meridian, as shown. */
const MAP_SCALES: Record<number, string> = (() => {
  const f = tmFrame(W, H, 18);
  const base = groundCircle(f, CIRCLE_LAT, CM).scale;
  return Object.fromEntries(CIRCLE_OFFSETS.map((d) => [d, (groundCircle(f, CIRCLE_LAT, CM + d).scale / base).toFixed(2)]));
})();

const FIGURE_LABEL: Record<Step, string> = {
  globe: 'כדור הארץ עם קווי גבול הפלחים. פלח 36, בין 30 ל־36 מעלות מזרח, מודגש, וקו האמצע שלו מסומן.',
  cylinder: 'גליל השוכב על צדו עוטף את הכדור ונוגע בו לאורך קו האמצע של פלח 36.',
  map: `מפה בהיטל מרקטור רוחבי סביב פלח 36. עיגולים שווים בשטח גדלים במפה ככל שמתרחקים מקו האמצע: ב־18 מעלות ממנו פי ${MAP_SCALES[18]}, ב־36 מעלות פי ${MAP_SCALES[36]}.`,
};

/** A short cross-fade between the steps; none under reduced motion. */
function Layer({ on, children }: { on: boolean; children: ReactNode }) {
  return <g className={cn('transition-opacity duration-300 ease-snap motion-reduce:transition-none', on ? 'opacity-100' : 'pointer-events-none opacity-0')}>{children}</g>;
}

function GlobeScene({ landPath, cylinder }: { landPath: string; cylinder: boolean }) {
  const { cx, cy, r } = G;
  const zoneLines = Array.from({ length: 60 }, (_, i) => -180 + 6 * i);
  const strip = useMemo(() => {
    // the zone as a lon/lat polygon, clipped to the front of the globe
    const ring: [number, number][] = [...meridian(W36), ...meridian(E36).reverse()];
    const c = clipToFront(ring);
    return c ? discPath([c], cx, cy, r, true) : '';
  }, [cx, cy, r]);
  const lines = (ls: [number, number][][]) => ls.flatMap(frontRuns);
  const capRx = 24;
  const half = 218;
  return (
    <g>
      {/* the cylinder's far side, behind the globe */}
      <g className={cn('transition-opacity duration-300 motion-reduce:transition-none', cylinder ? 'opacity-100' : 'opacity-0')}>
        <rect x={cx - half} y={cy - r} width={2 * half} height={2 * r} className="fill-accent/[0.07]" />
        <path d={`M${cx - half},${cy - r} A${capRx},${r} 0 0 0 ${cx - half},${cy + r}`} fill="none" className="stroke-accent/60" strokeWidth={1.5} strokeDasharray="5 4" />
        <path d={`M${cx + half},${cy - r} A${capRx},${r} 0 0 0 ${cx + half},${cy + r}`} fill="none" className="stroke-accent/60" strokeWidth={1.5} strokeDasharray="5 4" />
      </g>

      <circle cx={cx} cy={cy} r={r} className="fill-[#7FB4C6]/30" />
      <path d={landPath} className="fill-brand/45 stroke-brand-dark/40" strokeWidth={0.5} fillRule="evenodd" />
      <path d={discPath(lines(zoneLines.map((l) => meridian(l))), cx, cy, r, false)} fill="none" className="stroke-fg/20" strokeWidth={0.75} />
      <path d={discPath(lines([parallel(0)]), cx, cy, r, false)} fill="none" className="stroke-fg/50" strokeWidth={1} />
      <path d={strip} className="fill-accent/35 stroke-accent" strokeWidth={1.75} />
      <path d={discPath(frontRuns(meridian(CM, -90, 90)), cx, cy, r, false)} fill="none" className="stroke-fg" strokeWidth={1.5} strokeDasharray="5 4" />
      <circle cx={cx} cy={cy} r={r} fill="none" className="stroke-fg/70" strokeWidth={1.5} />

      {/* the cylinder's near side: translucent, so the globe reads as inside it */}
      <g className={cn('transition-opacity duration-300 motion-reduce:transition-none', cylinder ? 'opacity-100' : 'opacity-0')}>
        <rect x={cx - half} y={cy - r} width={2 * half} height={2 * r} className="fill-paper-bright/25" />
        <line x1={cx - half} x2={cx + half} y1={cy - r} y2={cy - r} className="stroke-accent" strokeWidth={1.75} />
        <line x1={cx - half} x2={cx + half} y1={cy + r} y2={cy + r} className="stroke-accent" strokeWidth={1.75} />
        <path d={`M${cx - half},${cy - r} A${capRx},${r} 0 0 1 ${cx - half},${cy + r}`} fill="none" className="stroke-accent" strokeWidth={1.75} />
        <ellipse cx={cx + half} cy={cy} rx={capRx} ry={r} className="fill-accent/[0.08] stroke-accent" strokeWidth={1.75} />
        <line x1={cx} x2={cx} y1={cy - r} y2={cy + r} className="stroke-fg" strokeWidth={4} strokeLinecap="round" data-touch-line />
      </g>
    </g>
  );
}

function MapScene({ landPath, frame }: { landPath: string; frame: ReturnType<typeof tmFrame> }) {
  const outline = useMemo(() => {
    const { w, e, s, n } = TM_REGION;
    const pts: [number, number][] = [
      ...meridian(w, s, n).map(([lon, lat]) => frame.xy(lat, lon)),
      ...parallel(n, w, e).map(([lon, lat]) => frame.xy(lat, lon)),
      ...meridian(e, s, n).reverse().map(([lon, lat]) => frame.xy(lat, lon)),
      ...parallel(s, w, e).reverse().map(([lon, lat]) => frame.xy(lat, lon)),
    ];
    return pathOf(pts, true);
  }, [frame]);
  const strip = useMemo(
    () =>
      pathOf(
        [...meridian(W36, TM_REGION.s, TM_REGION.n).map(([lon, lat]) => frame.xy(lat, lon)), ...meridian(E36, TM_REGION.s, TM_REGION.n).reverse().map(([lon, lat]) => frame.xy(lat, lon))],
        true,
      ),
    [frame],
  );
  const graticule = useMemo(() => {
    const ms = [-40, -30, -20, -10, 10, 20, 30, 40].map((d) => pathOf(meridian(CM + d, TM_REGION.s, TM_REGION.n).map(([lon, lat]) => frame.xy(lat, lon)), false));
    const ps = [-10, 10, 20, 30, 40, 50].map((lat) => pathOf(parallel(lat, TM_REGION.w, TM_REGION.e).map(([lon, la]) => frame.xy(la, lon)), false));
    return [...ms, ...ps].join('');
  }, [frame]);
  const equator = useMemo(() => pathOf(parallel(0, TM_REGION.w, TM_REGION.e).map(([lon, lat]) => frame.xy(lat, lon)), false), [frame]);
  const [cmTop, cmBottom] = [frame.xy(TM_REGION.n, CM), frame.xy(TM_REGION.s, CM)];
  const circles = CIRCLE_OFFSETS.map((d) => groundCircle(frame, CIRCLE_LAT, CM + d));
  return (
    <g>
      <defs>
        <clipPath id="utm-tm-region">
          <path d={outline} />
        </clipPath>
      </defs>
      <path d={outline} className="fill-[#7FB4C6]/25" />
      <g clipPath="url(#utm-tm-region)">
        <path d={landPath} className="fill-brand/45 stroke-brand-dark/40" strokeWidth={0.5} fillRule="evenodd" />
      </g>
      <path d={graticule} fill="none" className="stroke-fg/20" strokeWidth={0.75} />
      <path d={strip} className="fill-accent/30 stroke-accent" strokeWidth={1.75} />
      <path d={equator} fill="none" className="stroke-fg/60" strokeWidth={1.25} />
      <line x1={cmTop[0]} y1={cmTop[1]} x2={cmBottom[0]} y2={cmBottom[1]} className="stroke-fg" strokeWidth={1.5} strokeDasharray="5 4" />
      <path d={outline} fill="none" className="stroke-fg/70" strokeWidth={1.5} />
      {circles.map((c, i) => (
        <g key={i} data-ground-circle={CIRCLE_OFFSETS[i]}>
          <circle cx={c.x} cy={c.y} r={c.r} className="fill-bg-elevated/70 stroke-fg" strokeWidth={1.5} />
          {/* the central circle's size, for comparison */}
          {CIRCLE_OFFSETS[i] !== 0 && <circle cx={c.x} cy={c.y} r={circles[2].r} fill="none" className="stroke-fg/60" strokeWidth={1} strokeDasharray="3 3" />}
        </g>
      ))}
    </g>
  );
}

/** HTML labels over the figure (never stretched SVG text); positions in % of the 600 × 340 frame. */
function Labels({ step, frame }: { step: Step; frame: ReturnType<typeof tmFrame> }) {
  const at = (x: number, y: number) => ({ left: `${((x / W) * 100).toFixed(3)}%`, top: `${((y / H) * 100).toFixed(3)}%` });
  const chip = 'absolute whitespace-nowrap rounded-md px-1.5 py-0.5 font-display text-[13px] font-bold leading-tight shadow-[0_1px_4px_rgba(0,0,0,0.1)]';
  if (step !== 'map') {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className={cn(chip, 'border border-accent bg-bg-elevated text-black')} style={{ ...at(G.cx + 30, G.cy - G.r + 4), transform: 'translate(0, 0)' }} dir="rtl">
          פלח 36
        </span>
        <span className={cn(chip, 'bg-bg-elevated/90 text-black')} style={{ ...at(G.cx, G.cy + G.r + 6), transform: 'translate(-50%, 0)' }} dir="rtl">
          קו האמצע <L>33°E</L>
        </span>
        {step === 'cylinder' && (
          <span className={cn(chip, 'border border-accent bg-bg-elevated text-black')} style={{ ...at(G.cx + 218 + 30, G.cy), transform: 'translate(0, -50%)' }} dir="rtl">
            גליל
          </span>
        )}
      </div>
    );
  }
  const circles = CIRCLE_OFFSETS.map((d) => groundCircle(frame, CIRCLE_LAT, CM + d));
  const base = circles[2].scale;
  const [cx, cyTop] = frame.xy(TM_REGION.n, CM);
  const eq = frame.xy(0, TM_REGION.w);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {circles.map((c, i) => (
        <span key={i} data-scale-label={CIRCLE_OFFSETS[i]} className={cn(chip, 'bg-bg-elevated/90 text-black tabular-nums')} style={{ ...at(c.x, c.y + c.r + 4), transform: 'translate(-50%, 0)' }}>
          <L>×{(c.scale / base).toFixed(2)}</L>
        </span>
      ))}
      <span className={cn(chip, 'bg-bg-elevated/90 text-black')} style={{ ...at(cx - 8, cyTop + 10), transform: 'translate(-100%, 0)' }} dir="rtl">
        קו האמצע · <L>E = 500000</L>
      </span>
      <span className={cn(chip, 'bg-bg-elevated/90 text-black')} style={{ ...at(eq[0] + 10, eq[1] + 5), transform: 'translate(0, 0)' }} dir="rtl">
        קו המשווה · <L>N = 0</L> בצפון
      </span>
      <span className={cn(chip, 'border border-accent bg-bg-elevated text-black')} style={{ ...at(frame.xy(TM_REGION.n, CM)[0] + 30, frame.xy(TM_REGION.n, CM)[1] + 10), transform: 'translate(0, 0)' }} dir="rtl">
        פלח 36
      </span>
    </div>
  );
}
