'use client';

/* ─────────── מערכת קואורדינטות גיאוגרפית: יתרונות ומגבלות (deck ב׳, slide 12) ───────────
   One static card after the globe explorer and the base-60 workbench, before UTM. The deck's
   slogans ("גלובלית", "אינטואיטיבית", "דורשת מתמטיקה גבוהה", "יחידות זוויתיות ולא מטריות",
   "פיזור לא אחיד") said precisely and tied to what the globe showed: one grid for the whole Earth
   read straight off the globe's lines; angles, not metres; meridians that meet at the poles, so a
   degree of longitude covers less ground away from the equator — the figure; hence spherical
   formulas for a distance. Numbers: WGS84 (a = 6378.137 km, e² = 0.00669438), rounded.
   The figure is an orthographic globe like the explorer's (seen 20° above the equator), dir="ltr",
   never mirrored; its labels are HTML over it (as in the UTM explainer). */

import { cn } from '@/lib/utils';

const H3 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-2 text-balance';
const LEAD = 'text-fg leading-relaxed text-pretty mb-6 max-w-3xl';
const H4 = 'font-display font-bold leading-tight text-black text-base md:text-lg';
const BODY = 'text-base leading-relaxed text-black text-pretty';

/** Latin, digits and symbols inside Hebrew text. */
function L({ children }: { children: React.ReactNode }) {
  return <bdi dir="ltr">{children}</bdi>;
}

const D2R = Math.PI / 180;
/** Ground length of one degree of longitude at `lat` on WGS84, km. */
export function lonDegreeKm(lat: number) {
  const a = 6378.137;
  const e2 = 0.00669437999014;
  const s = Math.sin(lat * D2R);
  return (D2R * a * Math.cos(lat * D2R)) / Math.sqrt(1 - e2 * s * s);
}

/* ── the figure: an orthographic globe, the band between two meridians ── */
const W = 460;
const H = 400;
const CX = 205;
const CY = 215;
const R = 168;
const TILT = 20 * D2R;
/** The band: between the meridians ±15° of the one facing the viewer. */
const BAND = 15;
const ROWS = [0, 30, 60] as const;

const visible = (lat: number, lon: number) => Math.cos(lat * D2R) * Math.cos(lon * D2R) * Math.cos(TILT) + Math.sin(lat * D2R) * Math.sin(TILT) > -1e-9;
const xy = (lat: number, lon: number): [number, number] => {
  const p = lat * D2R;
  const l = lon * D2R;
  return [CX + R * Math.cos(p) * Math.sin(l), CY - R * (Math.sin(p) * Math.cos(TILT) - Math.cos(p) * Math.cos(l) * Math.sin(TILT))];
};
/** A polyline's visible runs, as one path. */
function runs(pts: [number, number][]): string {
  let d = '';
  let open = false;
  for (const [lat, lon] of pts) {
    if (!visible(lat, lon)) {
      open = false;
      continue;
    }
    const [x, y] = xy(lat, lon);
    d += `${open ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    open = true;
  }
  return d;
}
const parallel = (lat: number, lon0 = -180, lon1 = 180) => Array.from({ length: 145 }, (_, k): [number, number] => [lat, lon0 + ((lon1 - lon0) * k) / 144]);
const meridian = (lon: number, lat0 = -90, lat1 = 90) => Array.from({ length: 91 }, (_, k): [number, number] => [lat0 + ((lat1 - lat0) * k) / 90, lon]);

const FIG = (() => {
  const grid = [
    ...[-60, -30, 30, 60].map((lat) => runs(parallel(lat))),
    ...[-165, -135, -105, -75, -45, -15, 15, 45, 75, 105, 135, 165].map((lon) => runs(meridian(lon, -84, 84))),
  ].join('');
  const band = `${runs([...meridian(-BAND, 0, 90)])}${runs([...meridian(BAND, 90, 0)]).replace(/^M/, 'L')}${runs(parallel(0, BAND, -BAND)).replace(/^M/, 'L')}Z`;
  const rows = ROWS.map((lat) => {
    const [x0, y0] = xy(lat, -BAND);
    const [x1, y1] = xy(lat, BAND);
    return { lat, d: runs(parallel(lat, -BAND, BAND)), x0, y0, x1, y1, km: Math.round(lonDegreeKm(lat)) };
  });
  return { grid, equator: runs(parallel(0)), band, edges: runs(meridian(-BAND, 0, 90)) + runs(meridian(BAND, 0, 90)), rows, pole: xy(90, 0) };
})();
/** A label's place over the figure, in % of the frame. Physical, inline: the overlay is dir="ltr"
    (the RTL plugin's logical utilities apply to both sides there). `end`: the label ends at the point. */
const pct = (x: number, y: number, end = false): React.CSSProperties => ({
  left: `${(x / W) * 100}%`,
  top: `${(y / H) * 100}%`,
  transform: end ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
  paddingRight: end ? 8 : undefined,
});
const CHIP = 'absolute whitespace-nowrap rounded-md border border-border/70 bg-bg-elevated/95 px-2 py-0.5 font-display text-sm font-bold leading-tight text-black';

function LongitudeFigure() {
  const label = `איור: כדור הארץ ועליו רצועה בין שני קווי אורך, שמצטמצמת עד הקוטב. מעלה אחת של אורך שווה בשטח כ־${FIG.rows[0].km} ק״מ בקו המשווה, כ־${FIG.rows[1].km} ק״מ ברוחב 30°, כ־${FIG.rows[2].km} ק״מ ברוחב 60°, ו־0 ק״מ בקוטב.`;
  return (
    <figure className="min-w-0" data-longitude-figure>
      <figcaption className={cn(H4, 'mb-3')}>מעלה אחת של אורך – כמה קילומטרים?</figcaption>
      <div dir="ltr" role="img" aria-label={label} className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
          <circle cx={CX} cy={CY} r={R} className="fill-bg-accent stroke-fg/45" strokeWidth={1.5} />
          <path d={FIG.grid} fill="none" className="stroke-fg/20" strokeWidth={1} />
          <path d={FIG.equator} fill="none" className="stroke-fg/45" strokeWidth={1.25} />
          <path d={FIG.band} className="fill-accent/15" />
          <path d={FIG.edges} fill="none" className="stroke-accent" strokeWidth={1.75} />
          {FIG.rows.map((r) => (
            <path key={r.lat} d={r.d} fill="none" className="stroke-accent" strokeWidth={4} strokeLinecap="round" data-row={r.lat} />
          ))}
          <circle cx={FIG.pole[0]} cy={FIG.pole[1]} r={4.5} className="fill-accent stroke-white" strokeWidth={1.5} />
        </svg>
        {/* the latitude of each row at its start, the ground length of one degree at its end */}
        {FIG.rows.map((r) => (
          <div key={r.lat}>
            <span className="absolute font-display text-sm font-semibold text-fg-muted" style={pct(r.x0, r.y0, true)}>
              <L>{r.lat}°</L>
            </span>
            <span className={CHIP} style={pct(r.x1 + 8, r.y1)} data-km={r.km}>
              <span dir="rtl">כ־{r.km} ק״מ</span>
            </span>
          </div>
        ))}
        <span className="absolute font-display text-sm font-semibold text-fg-muted" style={pct(FIG.pole[0] - 6, FIG.pole[1], true)}>
          <L>90°</L>
        </span>
        <span className={CHIP} style={pct(FIG.pole[0] + 12, FIG.pole[1])} data-km={0}>
          <span dir="rtl">0 ק״מ: כל קווי האורך נפגשים</span>
        </span>
      </div>
      <p className="mt-2 text-sm leading-snug text-fg-muted">הרצועה באיור רחבה מ־<L>1°</L> כדי שתיראה; היחס בין המקטעים נשמר.</p>
    </figure>
  );
}

export function GeoProsCons() {
  return (
    <div className="my-10" data-screen="geo-pros-cons">
      <div className="surface-elevated p-6 lg:p-8">
        <h3 className={H3}>מערכת קואורדינטות גיאוגרפית: יתרונות ומגבלות</h3>
        <p className={LEAD}>
          בגלובוס ראיתם שכל מקום מוגדר בשתי זוויות – רוחב ואורך – ושקווי האורך נפגשים בקטבים. משתי העובדות האלה נובעים היתרונות של המערכת וגם המגבלות
          שלה.
        </p>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-10">
          <div className="space-y-5" data-pros-cons-text>
            <section data-pro>
              <h4 className={cn(H4, 'mb-1.5')}>היתרון: רשת אחת לכל כדור הארץ</h4>
              <p className={BODY}>
                כל מקום בעולם מקבל זוג ערכים על אותה רשת, בלי חלוקה לאזורים. את הערכים קל לקשר לגלובוס: כמה צפונה או דרומה מקו המשווה, וכמה מזרחה או
                מערבה מגריניץ׳.
              </p>
            </section>
            <section data-con>
              <h4 className={cn(H4, 'mb-1.5')}>המגבלה: זווית אינה מרחק</h4>
              <p className={BODY}>
                הקואורדינטות מודדות זוויות, לא מטרים. מעלה של רוחב היא כ־111 ק״מ בכל מקום, ושנייה של רוחב – כ־31 מ׳. מעלה של אורך מתקצרת ככל שמתרחקים מקו
                המשווה, כי קווי האורך מתכנסים לקטבים (באיור).
              </p>
              <p className={cn(BODY, 'mt-3')}>
                לכן גם חישוב פשוט, כמו המרחק בין שתי נקודות, דורש נוסחאות של טריגונומטריה כדורית ולא רק חיסור. במערכת <L>UTM</L>, שבהמשך, מודדים במטרים.
              </p>
            </section>
          </div>
          <LongitudeFigure />
        </div>
      </div>
    </div>
  );
}
