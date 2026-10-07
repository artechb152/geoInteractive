'use client';
import { useState } from 'react';
import { SceneHeader } from './SceneHeader';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

/* ─────────── קואורדינטות 2 — היטלים ומערכות קואורדינטות ───────────
   Content source: ONLY the deck "מבוא לגיאודזיה חלק ב׳" (project root) —
   slides 3–5 projections · 6–9 geographic coordinates (+ the deck's own
   example and exercise) · 10–11 base-60 and the formats table (the deck's
   own sample values) · 12 pros/cons · 13–16 UTM · 17 reference systems ·
   21 summary. Part א׳ (geodesy, ellipsoid, geoid, datum) is CoordinatesScene.
   Azimuth (slides 18–20) is not a coordinates topic and stays out. */

export function CoordinatesPart2Scene() {
  return (
    <section id="scene-coordinates-2" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SceneHeader
        step="02.3"
        eyebrow="קואורדינטות · היטלים"
        title="קואורדינטות 2: היטלים ומערכות קואורדינטות"
        intro="אחרי שהגדרנו על מה מודדים, נלמד כיצד עוברים מהגוף התלת־ממדי למפה, וכיצד מציינים מיקום בשני ההיטלים המרכזיים: היטל גיאוגרפי והיטל UTM."
      />

      <ProjectionsBlock />
      <LatLonExplorer />
      <DmsFormats />
      <GeoProsCons />
      <UtmBlock />
      <ReferenceSystemBlock />
      <Part2Summary />
    </section>
  );
}

/** Latin, digits and symbols inside Hebrew text: in an RTL paragraph the bidi
    algorithm would otherwise render "15°N" as "N°15" and reverse "a × b = c". */
function L({ children }: { children: React.ReactNode }) {
  return <bdi dir="ltr">{children}</bdi>;
}

const H3 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-4 text-balance';
const LEAD = 'text-fg leading-relaxed text-pretty mb-8 max-w-3xl';
const CHOICE =
  'rounded-xl border cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const choiceTone = (on: boolean) => (on ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]');

/* ─────────────────── היטלים (slides 3–5) ─────────────────── */

type ProjId = 'cyl' | 'cone' | 'az';
const PROJECTIONS: { id: ProjId; name: string; surface: string }[] = [
  { id: 'cyl', name: 'גלילי', surface: 'הטלה על גליל העוטף את הכדור. המפה המתקבלת: רשת מלבנית.' },
  { id: 'cone', name: 'חרוטי', surface: 'הטלה על חרוט המונח על הכדור. המפה המתקבלת: רשת בצורת מניפה.' },
  { id: 'az', name: 'אזימוטלי', surface: 'הטלה על מישור הנוגע בכדור. המפה המתקבלת: רשת עגולה סביב נקודת המגע.' },
];

function ProjectionsBlock() {
  const [p, setP] = useState<ProjId>('cyl');
  const active = PROJECTIONS.find((x) => x.id === p)!;
  return (
    <div className="mb-10">
      <h3 className={H3}>היטלים</h3>
      <p className={LEAD}>
        <strong className="text-fg">היטל</strong> הוא מעבר מעולם תלת־ממדי לדו־ממדי. קיימות שלוש שיטות הטלה: גלילית, חרוטית ואזימוטלית. בחרו
        שיטה ובחנו על איזה משטח מטילים את הכדור ואיזו מפה מתקבלת.
      </p>

      <div className="surface-elevated p-6 lg:p-8 grid lg:grid-cols-[1fr_1.6fr] gap-6 lg:gap-10 items-center">
        <div className="min-w-0">
          <div role="group" aria-label="שיטת ההטלה" className="flex flex-col gap-2">
            {PROJECTIONS.map((x) => (
              <button
                key={x.id}
                type="button"
                aria-pressed={p === x.id}
                onClick={() => setP(x.id)}
                className={cn(CHOICE, choiceTone(p === x.id), 'px-4 py-3 text-start')}
              >
                <span className="block font-display text-lg font-bold text-fg">{x.name}</span>
                <span className="block text-sm text-fg-muted">{x.surface}</span>
              </button>
            ))}
          </div>
          <p className="mt-5 text-base leading-relaxed text-fg text-pretty">
            קיימים שני היטלים מרכזיים: <strong className="text-fg">היטל גיאוגרפי</strong> ו<strong className="text-fg">היטל <L>UTM</L></strong>.
            נכיר את שניהם בהמשך.
          </p>
        </div>
        <div className="min-w-0">
          <div role="img" aria-label={`שיטת הטלה ${active.name}: ${active.surface}`} className="rounded-xl border border-border/70 bg-paper-panel p-3">
            <ProjectionArt id={p} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Schematic after deck ב׳ slide 5: the globe with its projection surface
   (left), the resulting flat map (right). A diagram, so left→right is fixed. */
function ProjectionArt({ id }: { id: ProjId }) {
  const ink = 'stroke-fg';
  const faint = 'stroke-fg/40';
  const surf = 'stroke-accent';
  return (
    <svg viewBox="0 0 320 170" className="block w-full h-auto" aria-hidden>
      {/* globe */}
      <g transform="translate(78 92)">
        <circle r="46" className="fill-[#7FB4C6]/45" />
        <path d="M-26,-22 q14,-14 30,-6 q8,14 -6,24 q-18,4 -24,-18z M8,10 q14,-2 18,10 q-6,14 -16,6z" className="fill-[#8A9163]" />
        <ellipse rx="46" ry="12" fill="none" className={faint} strokeWidth="1.25" />
        <ellipse rx="20" ry="46" fill="none" className={faint} strokeWidth="1.25" />
        <circle r="46" fill="none" className={ink} strokeWidth="2" />
        {id === 'cyl' && (
          <g fill="none" className={surf} strokeWidth="2">
            <ellipse cy="-58" rx="46" ry="9" />
            <ellipse cy="58" rx="46" ry="9" strokeDasharray="4 3" />
            <line x1="-46" y1="-58" x2="-46" y2="58" />
            <line x1="46" y1="-58" x2="46" y2="58" />
          </g>
        )}
        {id === 'cone' && (
          <g fill="none" className={surf} strokeWidth="2">
            <path d="M0,-82 L-44,12 M0,-82 L44,12" />
            <ellipse cy="12" rx="44" ry="9" strokeDasharray="4 3" />
          </g>
        )}
        {id === 'az' && (
          <g fill="none" className={surf} strokeWidth="2">
            <ellipse cy="-50" rx="52" ry="10" />
            <circle cy="-46" r="3" className="fill-accent" stroke="none" />
          </g>
        )}
      </g>

      {/* arrow */}
      <path d="M140,92 h28 m-7,-6 l7,6 l-7,6" fill="none" className="stroke-fg/60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* resulting map */}
      <g transform="translate(184 22)">
        {id === 'cyl' && (
          <g>
            <rect width="124" height="128" className="fill-[#7FB4C6]/45 stroke-fg" strokeWidth="2" />
            {[1, 2, 3, 4, 5].map((k) => (
              <line key={`v${k}`} x1={(124 / 6) * k} y1="0" x2={(124 / 6) * k} y2="128" className={faint} strokeWidth="1.25" />
            ))}
            {[1, 2, 3].map((k) => (
              <line key={`h${k}`} x1="0" y1={32 * k} x2="124" y2={32 * k} className={faint} strokeWidth="1.25" />
            ))}
          </g>
        )}
        {id === 'cone' && (
          <g transform="translate(62 -24)">
            <path d="M-58,118 A132,132 0 0 0 58,118 L28,48 A64,64 0 0 1 -28,48 Z" className="fill-[#7FB4C6]/45 stroke-fg" strokeWidth="2" strokeLinejoin="round" />
            {[-0.3, -0.1, 0.1, 0.3].map((a) => (
              <line key={a} x1={Math.sin(a) * 64} y1={Math.cos(a) * 64 - 16} x2={Math.sin(a) * 132} y2={Math.cos(a) * 132 - 16} className={faint} strokeWidth="1.25" />
            ))}
            <path d="M-43,78 A98,98 0 0 0 43,78" fill="none" className={faint} strokeWidth="1.25" />
          </g>
        )}
        {id === 'az' && (
          <g transform="translate(62 64)">
            <circle r="62" className="fill-[#7FB4C6]/45 stroke-fg" strokeWidth="2" />
            <circle r="40" fill="none" className={faint} strokeWidth="1.25" />
            <circle r="20" fill="none" className={faint} strokeWidth="1.25" />
            {[0, 30, 60, 90, 120, 150].map((d) => (
              <line
                key={d}
                x1={-62 * Math.cos((d * Math.PI) / 180)}
                y1={-62 * Math.sin((d * Math.PI) / 180)}
                x2={62 * Math.cos((d * Math.PI) / 180)}
                y2={62 * Math.sin((d * Math.PI) / 180)}
                className={faint}
                strokeWidth="1.25"
              />
            ))}
            <circle r="3" className="fill-accent" />
          </g>
        )}
      </g>
    </svg>
  );
}

/* ─────────────────── מערכת קואורדינטות גיאוגרפית — היטל GEO (slides 6–9) ─────────────────── */
/* Plate carrée graticule, no coastlines (no invented geography): x = lon + 180,
   y = 90 − lat in a 360 × 180 viewBox. East is right, north is up — a map,
   so never mirrored for RTL; overlay labels use physical left/top on purpose.
   Items and their notation are the deck's own: example (90E,30S), then
   "ומה הנ.צ הבא?" (75E,15N). */

type LatLonOption = { text: string; correct: boolean; why?: string };
type LatLonItem = { lat: number; lon: number; ref: string; latChip: string; lonChip: string; options?: LatLonOption[] };

const LATLON_ITEMS: LatLonItem[] = [
  { lat: -30, lon: 90, ref: '(90E,30S)', latChip: '30°S', lonChip: '90°E' },
  {
    lat: 15,
    lon: 75,
    ref: '(75E,15N)',
    latChip: '15°N',
    lonChip: '75°E',
    options: [
      { text: '(75E,15N)', correct: true },
      { text: '(15E,75N)', correct: false, why: 'הערכים הוחלפו. רוחב נמדד מקו המשווה צפונה או דרומה, ואורך נמדד מגריניץ׳ מזרחה או מערבה.' },
      { text: '(75E,15S)', correct: false, why: 'הנקודה נמצאת מצפון לקו המשווה, ולכן הרוחב שלה צפוני (N) – ערך חיובי.' },
    ],
  },
];

const GRAT_STEP = 30;
// The 0° lines carry their own chips (גריניץ׳ / קו המשווה); a margin "0°" would sit on the line.
const LON_LABELS = [-120, -60, 60, 120];
const LAT_LABELS = [60, 30, -30, -60];
const fmtLon = (v: number) => `${Math.abs(v)}°${v > 0 ? 'E' : 'W'}`;
const fmtLat = (v: number) => `${Math.abs(v)}°${v > 0 ? 'N' : 'S'}`;
const xPct = (lon: number) => ((lon + 180) / 360) * 100;
const yPct = (lat: number) => ((90 - lat) / 180) * 100;

function LatLonExplorer() {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const item = LATLON_ITEMS[idx];
  const choice = picked !== null && item.options ? item.options[picked] : null;
  const revealed = !item.options || choice?.correct === true;

  const go = (next: number) => {
    setIdx(next);
    setPicked(null);
  };

  return (
    <div className="my-10">
      <h3 className={H3}>מערכת קואורדינטות גיאוגרפית – היטל GEO</h3>
      <p className={LEAD}>
        האליפסואיד מחולק ל־360 חלקים לאורך ול־180 חלקים לרוחב, וכל נקודה או עצם מוגדרים בשני פרמטרים: רוחב ואורך.{' '}
        <strong className="text-fg">
          רוחב (<L>ϕ</L>)
        </strong>{' '}
        נמדד מקו המשווה צפונה (ערך חיובי) ודרומה (ערך שלילי); קווי הרוחב נקראים <strong className="text-fg">פרללות</strong>.{' '}
        <strong className="text-fg">
          אורך (<L>λ</L>)
        </strong>{' '}
        נמדד מקו האורך של גריניץ׳, שנקבע כאפס, מזרחה (ערך חיובי) ומערבה (ערך שלילי); קווי האורך נקראים <strong className="text-fg">מרידיאנים</strong>.
      </p>

      <div className="surface-elevated p-6 lg:p-8 grid lg:grid-cols-[1fr_1.6fr] gap-6 lg:gap-10 items-start">
        {/* text column — DOM-first → visual right in RTL */}
        <div className="min-w-0">
          <div className="mb-2 flex items-baseline gap-2">
            <div className="font-display text-sm font-bold tabular-nums text-fg">{String(idx + 1).padStart(2, '0')}</div>
            <div className="text-sm font-display font-semibold text-fg-muted">{item.options ? 'תרגיל' : 'דוגמה לנ״צ גיאוגרפי'}</div>
          </div>

          {item.options ? (
            <>
              <h4 className="font-display text-lg font-bold leading-snug text-fg md:text-xl mb-4">ומה הנ״צ הבא?</h4>
              <div role="group" aria-label="בחרו את הנ״צ של הנקודה" className="flex flex-col gap-2 mb-4">
                {item.options.map((o, i) => {
                  const isPicked = picked === i;
                  return (
                    <button
                      key={o.text}
                      type="button"
                      aria-pressed={isPicked}
                      disabled={revealed}
                      onClick={() => setPicked(i)}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-4 py-3 text-start font-display text-lg font-bold text-fg transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                        isPicked && o.correct && 'border-status-ok bg-status-ok/10',
                        isPicked && !o.correct && 'border-status-danger bg-status-danger/10',
                        !isPicked && 'border-border bg-bg-elevated',
                        !isPicked && !revealed && 'cursor-pointer hover:border-brand/30 hover:bg-brand/[0.03]',
                        revealed && !isPicked && 'opacity-50',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn('inline-block size-2 shrink-0 rounded-full', isPicked ? (o.correct ? 'bg-status-ok' : 'bg-status-danger') : 'bg-border-strong/60')}
                      />
                      <L>{o.text}</L>
                    </button>
                  );
                })}
              </div>
              <div aria-live="polite">
                {choice && (
                  <div className={cn('rounded-xl p-4 text-base leading-relaxed text-fg mb-4', choice.correct ? 'bg-status-ok/10' : 'bg-status-danger/10')}>
                    {choice.correct ? (
                      <>
                        נכון: רוחב <L>15N</L> – צפונה מקו המשווה, ואורך <L>75E</L> – מזרחה מגריניץ׳.
                      </>
                    ) : (
                      choice.why
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <h4 className="font-display text-2xl font-bold leading-snug text-fg mb-2">
                <L>{item.ref}</L>
              </h4>
              <p className="text-base text-fg-muted leading-relaxed mb-5">
                הנקודה נמצאת 30 מעלות דרומה מקו המשווה – רוחב <L>30S</L> (ערך שלילי) – ו־90 מעלות מזרחה מגריניץ׳ – אורך <L>90E</L> (ערך חיובי).
              </p>
            </>
          )}

          <div className="flex gap-2">
            {idx > 0 && (
              <button type="button" onClick={() => go(idx - 1)} className="btn-secondary text-sm px-4 py-2">
                לדוגמה
              </button>
            )}
            {choice && !choice.correct && (
              <button type="button" onClick={() => setPicked(null)} className="btn-secondary text-sm px-4 py-2">
                נסו שוב
              </button>
            )}
            {idx === 0 && (
              <button type="button" onClick={() => go(1)} className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5">
                לתרגיל
                <Icon name="arrow-left" size={16} />
              </button>
            )}
          </div>
        </div>

        <Graticule item={item} revealed={revealed} />
      </div>
    </div>
  );
}

function Graticule({ item, revealed }: { item: LatLonItem; revealed: boolean }) {
  const px = item.lon + 180;
  const py = 90 - item.lat;
  const label = revealed
    ? `רשת קווי רוחב ואורך כל 30 מעלות. הנקודה המסומנת: ${item.ref}.`
    : 'רשת קווי רוחב ואורך כל 30 מעלות, עם נקודה מסומנת.';

  return (
    // dir="ltr": west stays on the left whatever the page direction.
    <div dir="ltr" className="flex flex-col gap-1.5">
      <div className="grid grid-cols-3">
        <span />
        <AxisCaption arrow="↑" className="justify-center">
          צפון
        </AxisCaption>
        <span />
      </div>

      <div role="img" aria-label={label} className="relative aspect-[2/1] overflow-hidden rounded-xl border border-border/70 bg-paper-panel">
        <svg viewBox="0 0 360 180" preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full">
          <rect
            x={item.lon >= 0 ? 180 : 0}
            y={item.lat >= 0 ? 0 : 90}
            width="180"
            height="90"
            className={cn('fill-accent/[0.07] transition-opacity duration-200 motion-reduce:transition-none', revealed ? 'opacity-100' : 'opacity-0')}
          />
          {Array.from({ length: 360 / GRAT_STEP - 1 }, (_, i) => (i + 1) * GRAT_STEP).map((x) =>
            x === 180 ? null : <line key={`v${x}`} x1={x} y1="0" x2={x} y2="180" className="stroke-fg/15" strokeWidth="1" vectorEffect="non-scaling-stroke" />,
          )}
          {Array.from({ length: 180 / GRAT_STEP - 1 }, (_, i) => (i + 1) * GRAT_STEP).map((y) =>
            y === 90 ? null : <line key={`h${y}`} x1="0" y1={y} x2="360" y2={y} className="stroke-fg/15" strokeWidth="1" vectorEffect="non-scaling-stroke" />,
          )}
          <line x1="0" y1="90" x2="360" y2="90" className="stroke-fg/75" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <line x1="180" y1="0" x2="180" y2="180" className="stroke-fg/75" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <g className={cn('transition-opacity duration-200 motion-reduce:transition-none', revealed ? 'opacity-100' : 'opacity-0')}>
            <line x1={px} y1={py} x2={px} y2="90" className="stroke-accent" strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <line x1={px} y1={py} x2="180" y2={py} className="stroke-accent" strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>

        {LON_LABELS.map((v) => (
          <span key={`lon${v}`} className="absolute bottom-1 -translate-x-1/2 font-display text-[13px] font-semibold leading-none text-fg-muted" style={{ left: `${xPct(v)}%` }}>
            {fmtLon(v)}
          </span>
        ))}
        {LAT_LABELS.map((v) => (
          <span key={`lat${v}`} className="absolute -translate-y-1/2 font-display text-[13px] font-semibold leading-none text-fg-muted" style={{ left: 6, top: `${yPct(v)}%` }}>
            {fmtLat(v)}
          </span>
        ))}

        <MapChip style={{ left: '50%', top: 8, transform: 'translateX(6px)' }}><span dir="rtl">גריניץ׳ <L>0°</L></span></MapChip>
        <MapChip style={{ right: 8, top: '50%', transform: 'translateY(calc(-100% - 4px))' }}><span dir="rtl">קו המשווה <L>0°</L></span></MapChip>

        {revealed && (
          <>
            <MapChip accent style={{ left: `${xPct(item.lon)}%`, top: `${(yPct(item.lat) + 50) / 2}%`, transform: 'translate(8px, -50%)' }}>
              {item.latChip}
            </MapChip>
            <MapChip accent style={{ left: `${(xPct(item.lon) + 50) / 2}%`, top: `${yPct(item.lat)}%`, transform: 'translate(-50%, 8px)' }}>
              {item.lonChip}
            </MapChip>
          </>
        )}

        <span
          aria-hidden
          className="absolute grid size-[22px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-accent bg-paper-bright shadow-[0_2px_6px_rgba(40,50,35,0.35)]"
          style={{ left: `${xPct(item.lon)}%`, top: `${yPct(item.lat)}%` }}
        >
          <span className="size-2 rounded-full bg-accent" />
        </span>
      </div>

      <div className="grid grid-cols-3">
        <AxisCaption arrow="←" className="justify-start">
          מערב
        </AxisCaption>
        <AxisCaption arrow="↓" className="justify-center">
          דרום
        </AxisCaption>
        <AxisCaption arrow="→" className="justify-end">
          מזרח
        </AxisCaption>
      </div>
    </div>
  );
}

const AXIS_SIGN: Record<string, { code: string; sign: string }> = {
  צפון: { code: 'N', sign: '+' },
  דרום: { code: 'S', sign: '−' },
  מערב: { code: 'W', sign: '−' },
  מזרח: { code: 'E', sign: '+' },
};

/** "מזרח E (+) →" — arrow on the outer side for W/E, leading for N/S. */
function AxisCaption({ children, arrow, className }: { children: string; arrow: string; className: string }) {
  const { code, sign } = AXIS_SIGN[children];
  const arrowEl = (
    <span aria-hidden className="text-fg-dim">
      {arrow}
    </span>
  );
  return (
    <span className={cn('flex items-center gap-1.5 font-display text-[13px] font-semibold leading-tight text-fg-muted whitespace-nowrap', className)}>
      {arrow !== '→' && arrowEl}
      <span dir="rtl">{children}</span>
      <span className="font-bold text-fg">{code}</span>
      <span>({sign})</span>
      {arrow === '→' && arrowEl}
    </span>
  );
}

function MapChip({ children, style, accent }: { children: React.ReactNode; style: React.CSSProperties; accent?: boolean }) {
  return (
    <span
      className={cn(
        'absolute whitespace-nowrap rounded-md bg-paper-card/90 px-1.5 py-0.5 font-display text-[13px] font-bold leading-tight shadow-[0_1px_4px_rgba(0,0,0,0.1)]',
        accent ? 'border border-accent/60 text-fg' : 'text-fg-muted',
      )}
      style={style}
    >
      {children}
    </span>
  );
}

/* ─────────────────── חלוקה ב־60 · סוגי הצגה (slides 10–11) ─────────────────── */
/* The deck's own table and values. Steps are the arithmetic that turns the
   D row into the others (longitude column):
   0.1234 × 60 = 7.404′ · 0.404 × 60 = 24.24″ · 35×3600 + 7×60 + 24.24 = 126444.24″. */

type FormatId = 'D' | 'DM' | 'DMS' | 'S';
const FORMATS: { id: FormatId; lon: string; lat: string; steps: React.ReactNode[] }[] = [
  { id: 'D', lon: '35.1234°', lat: '33.5678°', steps: ['הצגה במעלות בלבד.'] },
  {
    id: 'DM',
    lon: '35°07.404′',
    lat: '33°34.068′',
    steps: [
      <>
        שומרים את המעלות השלמות: <L>35°</L>
      </>,
      <>
        כופלים את השבר ב־60 כדי לקבל דקות: <L>0.1234 × 60 = 7.404′</L>
      </>,
    ],
  },
  {
    id: 'DMS',
    lon: '35°07′24.24″',
    lat: '33°34′04.08″',
    steps: [
      <>
        מחשבים דקות כמו ב־<L>DM</L>: <L>35°07.404′</L>
      </>,
      <>
        כופלים את שבר הדקה ב־60 כדי לקבל שניות: <L>0.404 × 60 = 24.24″</L>
      </>,
    ],
  },
  {
    id: 'S',
    lon: '126444.24″',
    lat: '120844.08″',
    steps: [
      <>
        ממירים הכול לשניות: מעלה = <L>3600″</L>, דקה = <L>60″</L>
      </>,
      <>
        <L>35 × 3600 + 7 × 60 + 24.24 = 126444.24″</L>
      </>,
    ],
  },
];

function DmsFormats() {
  const [fmt, setFmt] = useState<FormatId>('DM');
  const active = FORMATS.find((f) => f.id === fmt)!;

  return (
    <div className="my-10">
      <h3 className={H3}>חלוקה ב־60: סוגי הצגה של קואורדינטות גיאוגרפיות</h3>
      <p className={LEAD}>
        דיבור על קואורדינטות גיאוגרפיות במעלות שלמות שקול לדיבור על זמן בשעות שלמות, או על מרחק בקילומטרים שלמים. ישנן יחידות מידה קטנות יותר,
        שבעזרתן נביע את הקואורדינטות בצורה מדויקת יותר – בחלוקה ב־60, כמו בשעון.
      </p>

      <div className="surface-elevated p-6 lg:p-8 grid lg:grid-cols-[1fr_1.5fr] gap-6 lg:gap-10 items-start">
        {/* time ↔ angle (DOM-first → visual right) */}
        <div className="min-w-0">
          <h4 className="font-display text-lg font-bold leading-snug text-fg mb-3">יחידות מידה</h4>
          <table className="w-full border-collapse text-base">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2 text-start font-display text-sm font-semibold text-fg-muted" />
                <th scope="col" className="py-2 text-center font-display text-sm font-semibold text-fg-muted">יחידה</th>
                {[0, 1].map((i) => (
                  <th key={i} scope="col" className="py-2 text-center font-display text-sm font-semibold text-fg-muted">
                    חלוקה ב־60
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60">
                <th scope="row" className="py-2.5 text-start font-display font-bold text-fg">זמן</th>
                <td className="py-2.5 text-center text-fg">שעה</td>
                <td className="py-2.5 text-center text-fg">דקה</td>
                <td className="py-2.5 text-center text-fg">שנייה</td>
              </tr>
              <tr>
                <th scope="row" className="py-2.5 text-start font-display font-bold text-fg">זווית</th>
                <td className="py-2.5 text-center text-fg">
                  מעלה <L>°</L>
                </td>
                <td className="py-2.5 text-center text-fg">
                  דקה <L>′</L>
                </td>
                <td className="py-2.5 text-center text-fg">
                  שנייה <L>″</L>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="min-w-0">
          <h4 className="font-display text-lg font-bold leading-snug text-fg mb-3">אותה נקודה בארבעה סוגי הצגה</h4>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] border-collapse text-base">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2 pe-3 text-start font-display text-sm font-semibold text-fg-muted">סוג ההצגה</th>
                  <th scope="col" className="py-2 pe-3 text-start font-display text-sm font-semibold text-fg-muted">
                    קו אורך <L>(Longitude)</L>
                  </th>
                  <th scope="col" className="py-2 pe-3 text-start font-display text-sm font-semibold text-fg-muted">
                    קו רוחב <L>(Latitude)</L>
                  </th>
                  <th scope="col" className="py-2 text-start font-display text-sm font-semibold text-fg-muted">
                    גובה <L>(Height)</L>
                  </th>
                </tr>
              </thead>
              <tbody>
                {FORMATS.map((f) => (
                  <tr key={f.id} className={cn('border-b border-border/60 last:border-b-0 transition-colors', fmt === f.id && 'bg-accent/10')}>
                    <th scope="row" className="py-1.5 pe-3 text-start">
                      <button
                        type="button"
                        aria-pressed={fmt === f.id}
                        onClick={() => setFmt(f.id)}
                        className={cn(CHOICE, choiceTone(fmt === f.id), 'min-w-[3.5rem] px-2.5 py-1 font-display text-base font-bold text-fg')}
                      >
                        <L>{f.id}</L>
                      </button>
                    </th>
                    <td className="py-1.5 pe-3 font-display text-lg font-bold tabular-nums text-fg">
                      <L>{f.lon}</L>
                    </td>
                    <td className="py-1.5 pe-3 font-display text-lg font-bold tabular-nums text-fg">
                      <L>{f.lat}</L>
                    </td>
                    <td className="py-1.5 font-display text-lg tabular-nums text-fg-muted">0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl bg-bg-accent/60 p-4">
            <div className="text-sm font-display font-semibold text-fg-muted mb-1.5">
              איך מגיעים ל־<L>{active.id}</L>? (קו האורך)
            </div>
            <ol className="space-y-1 text-base leading-relaxed text-fg">
              {active.steps.map((s, i) => (
                <li key={`${active.id}-${i}`} className="flex gap-2">
                  <span className="font-display font-bold tabular-nums text-fg-muted">{i + 1}.</span>
                  <span className="text-pretty">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── יתרונות וחסרונות (slide 12) ─────────────────── */

function GeoProsCons() {
  const lists = [
    { title: 'יתרונות', tone: 'bg-status-ok', items: ['גלובלית', 'אינטואיטיבית'] },
    { title: 'חסרונות', tone: 'bg-status-danger', items: ['דורשת מתמטיקה גבוהה', 'יחידות זוויתיות ולא מטריות', 'פיזור לא אחיד'] },
  ];
  return (
    <div className="my-10 surface p-5 sm:p-6">
      <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl mb-4">מערכת קואורדינטות גיאוגרפית: יתרונות וחסרונות</h3>
      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        {lists.map((l) => (
          <div key={l.title}>
            <h4 className="mb-2 font-display text-base font-bold text-fg-muted">{l.title}</h4>
            <ul className="space-y-1.5 text-base leading-relaxed text-fg">
              {l.items.map((it) => (
                <li key={it} className="flex items-center gap-2">
                  <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', l.tone)} />
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── היטל UTM (slides 13–16) ─────────────────── */
/* 60 zones × 6°, zone 1 starting at 180° ⇒ Greenwich (0°) starts zone 31.
   The zone detail follows the deck's slide-16 figure: 200…800 km across the
   zone, its centre line, and 0 at the equator. */

const zoneWest = (z: number) => -180 + 6 * (z - 1);
/** Centred on the zone, but pinned inside the frame for the outermost zones. */
const zoneLabelPos = (z: number): React.CSSProperties =>
  z <= 2 ? { left: 4 } : z >= 59 ? { right: 4 } : { left: `${((z - 0.5) / 60) * 100}%`, transform: 'translateX(-50%)' };
const fmtLonEdge = (v: number) => (v === 0 ? '0°' : `${Math.abs(v)}°${v > 0 ? 'E' : 'W'}`);

function UtmBlock() {
  const [zone, setZone] = useState(1);
  const west = zoneWest(zone);
  const east = west + 6;
  const found = zone === 31;

  const pickFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const fx = Math.min(0.9999, Math.max(0, (e.clientX - r.left) / r.width));
    setZone(Math.floor(fx * 60) + 1);
  };

  return (
    <div className="my-10">
      <h3 className={H3}>
        היטל <L>UTM</L>
      </h3>
      <p className={LEAD}>
        <L>
          <strong className="text-fg">Universal Transverse Mercator</strong>
        </L>{' '}
        – שימוש בהיטל גלילי הפוך כדי לייצג נאמנה את כל העולם. זוהי רשת קואורדינטות עולמית המחלקת את כדור הארץ ל־
        <strong className="text-fg">60 פלחים</strong>, ולכן רוחב כל פלח הוא <L>6°</L>. הפלח הראשון מתחיל מקו אורך <L>180°</L>.
      </p>

      <div className="surface-elevated p-6 lg:p-8 grid lg:grid-cols-[1fr_1.6fr] gap-6 lg:gap-10 items-start">
        <div className="min-w-0">
          <div className="rounded-xl bg-bg-accent/60 p-4 mb-4">
            <div className="text-sm font-display font-semibold text-fg-muted mb-1">משימה</div>
            <p className="text-base leading-relaxed text-fg">
              בחרו את הפלח שבו מתחיל קו האורך של גריניץ׳ (<L>0°</L>).
            </p>
          </div>

          <div className="mb-4">
            <div className="text-sm font-display font-semibold text-fg-muted">הפלח הנבחר</div>
            <div className="font-display text-5xl font-bold tabular-nums text-fg">{zone}</div>
            <div className="text-base text-fg-muted">
              מ־<L>{fmtLonEdge(west)}</L> עד <L>{fmtLonEdge(east)}</L>
            </div>
          </div>

          <ZoneSlider zone={zone} onChange={setZone} />

          <div aria-live="polite" className={cn('mt-4 rounded-xl p-4 text-base leading-relaxed text-fg', found ? 'bg-status-ok/10' : 'bg-transparent p-0')}>
            {found ? (
              <>
                נכון: הפלח הראשון מתחיל ב־<L>180°</L>, וכל פלח רוחבו <L>6°</L>. לכן גריניץ׳ (<L>0°</L>) מתחיל בפלח 31.
              </>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          {/* world strip of 60 zones — a map: west left, never mirrored */}
          <div
            dir="ltr"
            onPointerDown={pickFromPointer}
            role="img"
            aria-label={`רשת עולמית של 60 פלחי UTM. מסומן פלח ${zone}, מ־${fmtLonEdge(west)} עד ${fmtLonEdge(east)}.`}
            className="relative aspect-[2/1] cursor-pointer select-none overflow-hidden rounded-xl border border-border/70 bg-paper-panel"
          >
            <svg viewBox="0 0 360 180" preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full">
              {Array.from({ length: 60 }, (_, i) => (
                <rect key={i} x={i * 6} y="0" width="6" height="180" className={i % 2 ? 'fill-fg/[0.04]' : 'fill-transparent'} />
              ))}
              {Array.from({ length: 59 }, (_, i) => (
                <line key={i} x1={(i + 1) * 6} y1="0" x2={(i + 1) * 6} y2="180" className="stroke-fg/15" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              ))}
              <rect x={(zone - 1) * 6} y="0" width="6" height="180" className="fill-accent/30 stroke-accent" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="90" x2="360" y2="90" className="stroke-fg/75" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <line x1="180" y1="0" x2="180" y2="180" className="stroke-fg/75" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
            <MapChip style={{ left: '50%', top: 8, transform: 'translateX(6px)' }}><span dir="rtl">גריניץ׳ <L>0°</L></span></MapChip>
            <MapChip style={{ right: 8, top: '50%', transform: 'translateY(calc(-100% - 4px))' }}><span dir="rtl">קו המשווה <L>0°</L></span></MapChip>
            {[1, 31, 60].map((z) => (
              <span
                key={z}
                className="absolute bottom-1 font-display text-[13px] font-semibold leading-none text-fg-muted"
                style={zoneLabelPos(z)}
              >
                {z}
              </span>
            ))}
            <span
              className="absolute top-9 rounded-md bg-accent px-1.5 py-0.5 font-display text-[13px] font-bold leading-tight text-white shadow-[0_1px_4px_rgba(0,0,0,0.15)]"
              style={zoneLabelPos(zone)}
            >
              {zone}
            </span>
          </div>
          <p className="mt-2 text-sm text-fg-muted">לחצו על הרשת או השתמשו במחוון כדי לבחור פלח.</p>
        </div>
      </div>

      <div className="mt-6 surface-elevated p-6 lg:p-8 grid lg:grid-cols-[1fr_1.3fr] gap-6 lg:gap-10 items-center">
        <ul className="space-y-3 text-base leading-relaxed text-fg">
          <li>
            <strong className="text-fg">לכל פלח מערכת קואורדינטות משלו</strong>, הזהה לחלוטין לשאר הפלחים. לכן כאשר נותנים קואורדינטות של נקודה, יש
            לציין גם באיזה פלח היא נמצאת.
          </li>
          <li>
            בהיטל זה <strong className="text-fg">היחידות מטריות</strong>.
          </li>
          <li>
            בכל פלח, קווי האורך נעים בטווח הערכים <L>200,000–800,000</L>.
          </li>
          <li>
            יש לציין באיזה <strong className="text-fg">חצי כדור</strong> נמצא הנ״צ: צפוני או דרומי.
          </li>
        </ul>
        <ZoneDetail west={west} east={east} zone={zone} />
      </div>
    </div>
  );
}

function ZoneSlider({ zone, onChange }: { zone: number; onChange: (z: number) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-display font-semibold text-fg-muted">מספר פלח</span>
      <span dir="ltr" className="relative mt-1 block h-7">
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-bg-accent ring-1 ring-inset ring-border" />
        <input
          type="range"
          min={1}
          max={60}
          step={1}
          value={zone}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={`פלח ${zone}`}
          className={cn(
            'absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent rounded-full focus-visible:ring-0 focus-visible:ring-offset-0',
            '[&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:mt-0.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-bg-elevated [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:shadow-cta-ember',
            '[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-bg-elevated [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-accent',
            '[&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)]',
            '[&:focus-visible::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)]',
          )}
        />
      </span>
    </label>
  );
}

/* After deck ב׳ slide 16: one zone, km values across it, centre line, equator = 0. */
function ZoneDetail({ west, east, zone }: { west: number; east: number; zone: number }) {
  const KM = [200, 300, 400, 500, 600, 700, 800];
  const x = (km: number) => `${((km - 200) / 600) * 100}%`;
  return (
    <div
      dir="ltr"
      role="img"
      aria-label={`פלח ${zone} מקרוב: ערכים מ־200 עד 800 קילומטר, מרכז הפלח מסומן, וקו המשווה כערך 0.`}
      className="w-full max-w-[460px] justify-self-center"
    >
      <div className="relative mb-1 h-6 font-display text-sm font-bold text-accent">
        <span className="absolute left-0">{fmtLonEdge(west)}</span>
        <span className="absolute -translate-x-1/2 font-semibold text-fg-muted" style={{ left: '50%' }} dir="rtl">
          מרכז הפלח
        </span>
        <span className="absolute right-0">{fmtLonEdge(east)}</span>
      </div>
      <div className="relative aspect-[2/1] rounded-md border-2 border-fg bg-paper-panel">
        {KM.slice(1, -1).map((km) => (
          <span key={km} className={cn('absolute inset-y-0 w-px', km === 500 ? 'bg-accent w-[2px]' : 'bg-fg/40')} style={{ left: x(km) }} />
        ))}
        <span className="absolute inset-x-0 top-1/2 h-px bg-fg/70" />
        <span className="absolute top-1/2 -translate-y-[calc(100%+4px)] rounded bg-paper-card/90 px-1 text-[13px] font-semibold text-fg-muted" style={{ right: 4 }} dir="rtl">
          קו המשווה – 0
        </span>
      </div>
      <div className="relative mt-1 h-5 font-display text-[13px] font-semibold tabular-nums text-fg-muted">
        {KM.map((km) => (
          <span key={km} className="absolute -translate-x-1/2" style={{ left: x(km) }}>
            {km}
          </span>
        ))}
      </div>
      <div className="text-end text-[13px] font-semibold text-fg-muted">km</div>
    </div>
  );
}

/* ─────────────────── מערכות ייחוס (slide 17) ─────────────────── */

const TERMS: { glyph: React.ReactNode; title: string; body: string }[] = [
  {
    glyph: <DatumGlyph />,
    title: 'דאטום',
    body: 'מכלול הפרמטרים המגדירים ומעגנים את האליפסואיד ביחס לפני כדור הארץ (ראו קואורדינטות 1).',
  },
  {
    glyph: <ProjectionGlyph />,
    title: 'היטל',
    body: 'מעבר מעולם תלת־ממדי לדו־ממדי: גיאוגרפי, UTM ועוד.',
  },
  {
    glyph: <ReferenceGlyph />,
    title: 'מערכת ייחוס',
    body: 'השילוב בין הדאטום להיטל.',
  },
];

const MAIN_PROJ_ROWS: { label: string; geo: React.ReactNode; utm: React.ReactNode }[] = [
  { label: 'היקף', geo: 'גלובלית', utm: 'רשת עולמית של 60 פלחים, 6° כל אחד' },
  { label: 'יחידות', geo: 'זוויתיות (מעלות, דקות, שניות)', utm: 'מטריות' },
  { label: 'מה מציינים', geo: 'רוחב ואורך', utm: 'הקואורדינטות, הפלח וחצי הכדור' },
];

function ReferenceSystemBlock() {
  return (
    <div className="my-10">
      <h3 className={H3}>מערכות ייחוס</h3>
      <p className={LEAD}>
        <strong className="text-fg">לא ניתן לדבר על קואורדינטות של נקודה בלי שנדע מהו הדאטום ומהו ההיטל שלה.</strong> השילוב ביניהם נקרא
        ״מערכת ייחוס״.
      </p>

      <div className="surface-elevated p-6 lg:p-8">
        {/* DOM order = reading order: דאטום (right) + היטל = מערכת ייחוס (left). */}
        <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:gap-4 items-stretch">
          {TERMS.map((t, i) => (
            <TermWithOperator key={t.title} term={t} operator={i === 0 ? '+' : i === 1 ? '=' : null} />
          ))}
        </div>

        <div className="mt-8 border-t border-border/70 pt-6">
          <h4 className="font-display text-lg font-bold leading-snug text-fg mb-3">שני ההיטלים המרכזיים</h4>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-base">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="w-[22%] py-2" />
                  <th scope="col" className="py-2 pe-4 text-start font-display text-lg font-bold text-fg">
                    היטל גיאוגרפי
                  </th>
                  <th scope="col" className="py-2 text-start font-display text-lg font-bold text-fg">
                    היטל <L>UTM</L>
                  </th>
                </tr>
              </thead>
              <tbody>
                {MAIN_PROJ_ROWS.map((r) => (
                  <tr key={r.label} className="border-b border-border/60 last:border-b-0">
                    <th scope="row" className="py-2.5 pe-4 text-start align-top font-display text-sm font-semibold text-fg-muted">
                      {r.label}
                    </th>
                    <td className="py-2.5 pe-4 align-top leading-snug text-fg">{r.geo}</td>
                    <td className="py-2.5 align-top leading-snug text-fg">{r.utm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function TermWithOperator({ term: t, operator }: { term: (typeof TERMS)[number]; operator: '+' | '=' | null }) {
  return (
    <>
      <div className="rounded-xl bg-bg-accent/60 p-5 h-full">
        <div className="mb-3 flex items-center gap-3">
          {t.glyph}
          <div className="font-display text-xl font-bold leading-tight text-fg">{t.title}</div>
        </div>
        <p className="text-base leading-relaxed text-fg text-pretty">{t.body}</p>
      </div>
      {operator && (
        <div aria-hidden className="hidden lg:flex self-center font-display text-4xl font-bold text-fg-muted">
          {operator}
        </div>
      )}
    </>
  );
}

function DatumGlyph() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden className="shrink-0">
      <ellipse cx="24" cy="24" rx="20" ry="17" className="stroke-fg" strokeWidth="2" />
      <ellipse cx="24" cy="24" rx="20" ry="5" className="stroke-fg/50" strokeWidth="1.5" />
      <line x1="24" y1="3" x2="24" y2="45" className="stroke-fg/50" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}

function ProjectionGlyph() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden className="shrink-0">
      <circle cx="12" cy="24" r="9" className="stroke-fg" strokeWidth="2" />
      <ellipse cx="12" cy="24" rx="9" ry="3" className="stroke-fg/50" strokeWidth="1.25" />
      <path d="M23 24 h6 m-2.5 -3 l3 3 l-3 3" className="stroke-fg/70" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="32" y="14" width="13" height="20" rx="1.5" className="stroke-fg" strokeWidth="2" />
      <path d="M32 20.7 h13 M32 27.3 h13 M38.5 14 v20" className="stroke-fg/50" strokeWidth="1.25" />
    </svg>
  );
}

function ReferenceGlyph() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden className="shrink-0">
      <rect x="5" y="5" width="38" height="38" rx="3" className="stroke-fg" strokeWidth="2" />
      <path d="M5 17.7 h38 M5 30.3 h38 M17.7 5 v38 M30.3 5 v38" className="stroke-fg/40" strokeWidth="1.25" />
      <circle cx="30.3" cy="17.7" r="4.5" className="fill-paper-bright stroke-accent" strokeWidth="2.5" />
      <circle cx="30.3" cy="17.7" r="1.6" className="fill-accent" />
    </svg>
  );
}

/* ─────────────────── סיכום (deck ב׳ slide 21 + slides 3–17) ─────────────────── */

function Part2Summary() {
  const points: React.ReactNode[] = [
    <>
      <strong className="text-fg">היטל</strong> – מעבר מעולם תלת־ממדי לדו־ממדי. שיטות ההטלה: גלילית, חרוטית ואזימוטלית.
    </>,
    <>
      <strong className="text-fg">היטל גיאוגרפי</strong> – רוחב (<L>ϕ</L>) מקו המשווה ואורך (<L>λ</L>) מגריניץ׳, במעלות, בדקות ובשניות (חלוקה ב־60).
    </>,
    <>
      <strong className="text-fg">
        היטל <L>UTM</L>
      </strong>{' '}
      – 60 פלחים של <L>6°</L>, ביחידות מטריות. מציינים גם את הפלח ואת חצי הכדור.
    </>,
    <>
      <strong className="text-fg">מערכת ייחוס</strong> – השילוב בין הדאטום להיטל. בלעדיה אי אפשר לפרש קואורדינטות של נקודה.
    </>,
  ];
  return (
    <div className="surface p-5 sm:p-6">
      <div className="font-display text-lg font-bold leading-snug text-fg md:text-xl mb-3">סיכום: היטלים ומערכות קואורדינטות</div>
      <ol className="space-y-2 text-base leading-relaxed text-fg max-w-3xl">
        {points.map((p, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-display font-bold tabular-nums text-fg-muted">{i + 1}.</span>
            <span className="text-pretty">{p}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
