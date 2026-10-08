'use client';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { cn } from '@/lib/utils';

/* ─────────── קואורדינטות 1 — גיאודזיה, גופי ייחוס ודאטום ───────────
   Content source: ONLY the deck "מבוא לגיאודזיה חלק א׳" (project root) —
   slide 3 geodesy · 4 reference bodies · 5 Earth-shape history · 6–9
   ellipsoid · 10–12 geoid · 13–14 undulation (H = h − N is printed in the
   slide-14 figure) · 15–20 datum (7 parameters, global vs local, the
   "cork must fit its bottle" note). The datum-shift simulation further down
   is the one block kept from the previous version of this scene.
   Part ב׳ of the deck lives in CoordinatesPart2Scene. */

export function CoordinatesScene() {
  const [shift, setShift] = useState(0);
  return (
    <section id="scene-coordinates" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SceneHeader
        step="02.3"
        eyebrow="קואורדינטות · גיאודזיה"
        title="קואורדינטות 1: על מה מודדים מיקום?"
        intro="לפני שמגדירים קואורדינטות, צריך להגדיר את הגוף שעליו מודדים. בחלק זה נכיר את הגיאודזיה, את גופי הייחוס – אליפסואיד וגיאואיד – ואת הדאטום."
      />

      <IntroColumns />
      <ReferenceBodies />
      <DatumFit />
      <DatumShiftDemo shift={shift} setShift={setShift} />
      <Part1Summary />
    </section>
  );
}

/** Latin, digits and symbols inside Hebrew text: without an LTR isolate the
    bidi algorithm reorders "H = h − N" or "(∆x, ∆y, ∆z)" in an RTL line. */
function L({ children }: { children: React.ReactNode }) {
  return (
    <bdi dir="ltr" className="whitespace-nowrap">
      {children}
    </bdi>
  );
}

const H3 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-4 text-balance';
const LEAD = 'text-fg leading-relaxed text-pretty mb-8 max-w-3xl';

/* ─────────────────── גיאודזיה · גופי ייחוס (deck slides 3–4) ─────────────────── */

function IntroColumns() {
  return (
    <div className="grid md:grid-cols-2 gap-6 md:gap-10 mb-12">
      <div>
        <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">גיאודזיה – תורת המיפוי</h3>
        <p className="text-base text-fg leading-relaxed text-pretty">
          <strong className="text-fg">גיאו</strong> – אדמה, <strong className="text-fg">דזיה</strong> – חלוקה. הגיאודזיה היא תחום מדעי העוסק
          במיפוי ובקביעת מיקום של נקודות ועצמים על פני כדור הארץ.
        </p>
      </div>
      <div>
        <h3 className="font-display text-lg font-bold leading-snug text-fg md:text-xl text-balance mb-2">גופי ייחוס מרחביים</h3>
        <p className="text-base text-fg leading-relaxed text-pretty">
          גופי ייחוס מרחביים הם דרך לתאר את מבנה כדור הארץ באופן גרפי. צורת כדור הארץ מורכבת מאוד – הרים, שקעים וגבעות – ולכן אי אפשר
          לחלק אותה ולבצע עליה חישובים, כמו מציאת נ״צ. לכן מגדירים <strong className="text-fg">גוף ייחוס מרחבי</strong>: צורה מתמטית
          קרובה לצורת כדור הארץ, שעליה מגדירים את מערכת הצירים ועל בסיסה עורכים מדידות לצרכים שונים.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── אליפסואיד · גיאואיד · גליות (deck slides 6–14) ─────────────────── */

type BodyTab = 'surface' | 'ellipsoid' | 'geoid' | 'undulation';
const BODY_TABS: { id: BodyTab; label: string; title: string; body: React.ReactNode; extra?: React.ReactNode }[] = [
  {
    id: 'surface',
    label: 'פני השטח',
    title: 'אבל רגע…',
    body: 'פני כדור הארץ אינם חלקים כמו כדור או אליפסואיד מושלמים: יש הרים וגאיות, אוקיינוסים ויבשות. כדור הארץ הוא משטח פיזיקלי, המושפע מכוח המשיכה, ולכן לא ניתן לבצע עליו חישובים.',
  },
  {
    id: 'ellipsoid',
    label: 'אליפסואיד',
    title: 'אליפסואיד',
    body: 'גוף ייחוס מתמטי המתאר בקירוב את צורת כדור הארץ. זהו גוף תלת־ממדי שכל פרוסה שלו יוצרת אליפסה, כלומר אליפסה תלת־ממדית המסתובבת סביב צירה. בדו־ממד יש עיגול ואליפסה; בתלת־ממד – אליפסואיד.',
    extra: (
      <>
        האליפסואידים השונים נבדלים זה מזה בשני פרמטרים: <strong className="text-fg">רדיוס</strong> (<L>a</L>) ו<strong className="text-fg">פחיסות</strong> (<L>f</L>).
      </>
    ),
  },
  {
    id: 'geoid',
    label: 'גיאואיד',
    title: 'גיאואיד',
    body: 'משטח שווה פוטנציאל המתאר את גובה האפס הבינלאומי – פני הים. הגיאואיד מייצג את גובה פני הים הממוצעים: פני הים במצב שיווי משקל, ללא השפעת זרמים, גאות ושפל – כאילו היו בעולם רק מים, ללא יבשות, תחת השפעת כוח המשיכה בלבד.',
    extra: 'הגיאואיד הוא גוף פיזיקלי, ולא ניתן להגדיר אותו מתמטית (בנוסחאות). לכן לא מבצעים עליו חישובי מרחק וזווית. אם כך, למה צריך אותו? לחישוב גבהים מעל פני הים.',
  },
  {
    id: 'undulation',
    label: 'גליות וגובה',
    title: 'גליות',
    body: 'נלביש את האליפסואיד על הגיאואיד בהתאמה ונבדוק את הפערים ביניהם: מהו הגובה הנכון? גליות (N) היא הפרש הגובה בין הגיאואיד לאליפסואיד.',
  },
];

// Profile geometry (viewBox 800 × 340, y down). Vertical relief is exaggerated,
// like the deck's own slide-14 figure: ellipsoid = smooth arc, geoid = waves
// around it, terrain = geoid + relief; the sea surface is the geoid.
const PV = { w: 800, h: 340 } as const;
const COAST = 250;
const yE = (x: number) => 250 - 60 * (1 - ((x - 400) / 420) ** 2);
const yG = (x: number) => yE(x) - 26 * Math.sin((x / 800) * Math.PI * 2 * 1.6 + 0.4);
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const relief = (x: number) =>
  smoothstep(COAST - 20, COAST + 50, x) *
  (18 + 38 * Math.exp(-(((x - 340) / 45) ** 2)) + 120 * Math.exp(-(((x - 500) / 70) ** 2)) + 85 * Math.exp(-(((x - 660) / 55) ** 2)));
// Sea floor: deep offshore, rising to the coast, so land and sea meet without a wall.
const depth = (x: number) => 70 * (1 - smoothstep(COAST - 150, COAST - 10, x));
const yT = (x: number) => yG(x) - relief(x) + depth(x);
const XS = Array.from({ length: 161 }, (_, i) => i * 5);
const pathOf = (f: (x: number) => number, xs: number[]) => xs.map((x, i) => `${i ? 'L' : 'M'}${x},${f(x).toFixed(1)}`).join(' ');
const LAND_XS = XS.filter((x) => x >= COAST - 20);
const SEA_XS = XS.filter((x) => x <= COAST);
const GROUND_PATH = `${pathOf(yT, XS)} L800,${PV.h} L0,${PV.h} Z`;
const SEA_PATH = `${pathOf(yG, SEA_XS)} ${SEA_XS.slice()
  .reverse()
  .map((x) => `L${x},${yT(x).toFixed(1)}`)
  .join(' ')} Z`;
const GAP_PATH = `${pathOf(yG, XS)} ${XS.slice()
  .reverse()
  .map((x) => `L${x},${yE(x).toFixed(1)}`)
  .join(' ')} Z`;
const C_ELL = '#5B7C5C'; // brand.dark
const C_GEO = '#8A6F4D'; // tanline.badge
const C_H = '#5b9dd9'; // accent.cool

function ReferenceBodies() {
  const [tab, setTab] = useState<BodyTab>('surface');
  // Starts where the geoid sits highest above the ellipsoid on land (x ≈ 593),
  // so all three arrows — H, h and N — are clearly visible.
  const [px, setPx] = useState(590);
  const t = BODY_TABS.find((b) => b.id === tab)!;
  return (
    <div className="my-10">
      <h3 className={H3}>אליפסואיד, גיאואיד וגליות</h3>
      <p className={LEAD}>
        מבנה כדור הארץ נתפס כיום באמצעות שני גופים מרכזיים: <strong className="text-fg">אליפסואיד</strong>, גוף ייחוס מתמטי, ו
        <strong className="text-fg">גיאואיד</strong>, משטח שווה פוטנציאל הממדל את השפעת כוח המשיכה ברחבי כדור הארץ. השילוב של שניהם ממדל באופן
        מדעי את ההתנהגות המרחבית של כדור הארץ. עברו בין השכבות בחתך.
      </p>

      <div className="surface-elevated p-6 lg:p-8 grid lg:grid-cols-[1fr_1.7fr] gap-6 lg:gap-10 items-start">
        <div className="min-w-0">
          <div role="tablist" aria-label="שכבות החתך" className="grid grid-cols-2 gap-2 mb-5">
            {BODY_TABS.map((b) => (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={tab === b.id}
                onClick={() => setTab(b.id)}
                className={cn(
                  'rounded-xl border px-3 py-2 font-display text-sm font-bold text-fg cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  tab === b.id ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" aria-label={t.label}>
            <h4 className="font-display text-xl font-bold leading-snug text-fg mb-2">{t.title}</h4>
            <p className="text-base leading-relaxed text-fg text-pretty">{t.body}</p>
            {t.extra && <p className="mt-3 text-base leading-relaxed text-fg-muted text-pretty">{t.extra}</p>}
            {tab === 'undulation' && (
              <>
                <ul className="mt-3 space-y-1.5 text-base leading-relaxed text-fg">
                  <li className="flex gap-2">
                    <span aria-hidden className="mt-2 inline-block size-2.5 shrink-0 rounded-full" style={{ background: C_H }} />
                    <span>
                      <strong>גובה אורתומטרי (<L>H</L>)</strong> – הגובה מעל פני הים (הגיאואיד).
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden className="mt-2 inline-block size-2.5 shrink-0 rounded-full" style={{ background: C_ELL }} />
                    <span>
                      <strong>גובה אליפסואידלי (<L>h</L>)</strong> – הגובה מעל האליפסואיד.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden className="mt-2 inline-block size-2.5 shrink-0 rounded-full" style={{ background: C_GEO }} />
                    <span>
                      <strong>גליות (<L>N</L>)</strong> – הפרש הגובה בין הגיאואיד לאליפסואיד.
                    </span>
                  </li>
                </ul>
                <div className="mt-4 rounded-xl bg-bg-accent/60 px-4 py-3 text-center">
                  <L>
                    <span className="font-display text-3xl font-bold tabular-nums">
                      <span style={{ color: C_H }}>H</span> = <span style={{ color: C_ELL }}>h</span> − <span style={{ color: C_GEO }}>N</span>
                    </span>
                  </L>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <ProfileDiagram tab={tab} px={px} />
          <div className={cn('mt-3 transition-opacity duration-200 motion-reduce:transition-none', tab === 'undulation' ? 'opacity-100' : 'pointer-events-none opacity-0')}>
            <RangeRow
              label="הזיזו את הנקודה לאורך החתך"
              min={300}
              max={760}
              step={1}
              value={px}
              onChange={setPx}
              valueText="מיקום הנקודה בחתך"
              disabled={tab !== 'undulation'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileDiagram({ tab, px }: { tab: BodyTab; px: number }) {
  const on = (layer: BodyTab) => tab === layer || tab === 'undulation';
  const pt = yT(px);
  const pe = yE(px);
  const pg = yG(px);
  const pct = (x: number, y: number) => ({ left: `${(x / PV.w) * 100}%`, top: `${(y / PV.h) * 100}%` });
  const label = {
    surface: 'חתך: יבשה עם הרים ואוקיינוס. פני השטח אינם חלקים.',
    ellipsoid: 'חתך: האליפסואיד מסומן כקשת חלקה ירוקה מתחת לפני השטח.',
    geoid: 'חתך: הגיאואיד מסומן כקו גלי חום, החופף לפני הים באוקיינוס.',
    undulation: 'חתך: נקודה על פני השטח. חץ כחול – גובה אורתומטרי H מעל הגיאואיד; חץ ירוק – גובה אליפסואידלי h מעל האליפסואיד; חץ חום – גליות N בין הגיאואיד לאליפסואיד.',
  }[tab];
  return (
    <div dir="ltr" role="img" aria-label={label} className="relative aspect-[40/17] overflow-hidden rounded-xl border border-border/70 bg-paper-panel">
      <svg viewBox={`0 0 ${PV.w} ${PV.h}`} preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full">
        <defs>
          {(
            [
              ['arH', C_H],
              ['arE', C_ELL],
              ['arG', C_GEO],
            ] as const
          ).map(([id, c]) => (
            <marker key={id} id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={c} />
            </marker>
          ))}
        </defs>

        <path d={GROUND_PATH} className={cn('fill-[#E8DCC4] transition-opacity duration-200', tab === 'surface' || tab === 'undulation' ? 'opacity-100' : 'opacity-50')} />
        <path d={SEA_PATH} className={cn('fill-[#7FB4C6] transition-opacity duration-200', tab === 'geoid' ? 'opacity-70' : 'opacity-45')} />
        <path
          d={pathOf(yT, LAND_XS)}
          fill="none"
          className={tab === 'surface' ? 'stroke-fg' : 'stroke-[#C9B892]'}
          strokeWidth={tab === 'surface' ? 3 : 2}
          vectorEffect="non-scaling-stroke"
        />

        {/* the gap between geoid and ellipsoid = undulation */}
        <path d={GAP_PATH} fill={C_GEO} className={cn('transition-opacity duration-200', tab === 'undulation' ? 'opacity-25' : 'opacity-0')} />

        <path
          d={pathOf(yE, XS)}
          fill="none"
          stroke={C_ELL}
          strokeWidth={tab === 'ellipsoid' ? 4 : 2.5}
          className={cn('transition-opacity duration-200', on('ellipsoid') ? 'opacity-100' : 'opacity-25')}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={pathOf(yG, XS)}
          fill="none"
          stroke={C_GEO}
          strokeWidth={tab === 'geoid' ? 4 : 2.5}
          className={cn('transition-opacity duration-200', on('geoid') ? 'opacity-100' : 'opacity-25')}
          vectorEffect="non-scaling-stroke"
        />

        {tab === 'undulation' && (
          <g strokeWidth="3" vectorEffect="non-scaling-stroke">
            <line x1={px - 14} y1={pg} x2={px - 14} y2={pt + 4} stroke={C_H} markerEnd="url(#arH)" vectorEffect="non-scaling-stroke" />
            <line x1={px + 4} y1={pe} x2={px + 4} y2={pt + 4} stroke={C_ELL} markerEnd="url(#arE)" vectorEffect="non-scaling-stroke" />
            {Math.abs(pe - pg) > 4 && (
              <line x1={px + 26} y1={pe} x2={px + 26} y2={pg + (pg < pe ? 3 : -3)} stroke={C_GEO} markerEnd="url(#arG)" vectorEffect="non-scaling-stroke" />
            )}
            <line x1={px - 22} y1={pg} x2={px + 34} y2={pg} stroke={C_GEO} strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
            <line x1={px - 22} y1={pe} x2={px + 34} y2={pe} stroke={C_ELL} strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          </g>
        )}
      </svg>

      {/* point on the terrain */}
      {tab === 'undulation' && (
        <>
          <span
            aria-hidden
            className="absolute grid size-[18px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-accent bg-paper-bright shadow-[0_2px_6px_rgba(40,50,35,0.35)]"
            style={pct(px - 5, pt)}
          />
          <DiagramChip color={C_H} style={{ ...pct(px - 14, (pg + pt) / 2), transform: 'translate(calc(-100% - 6px), -50%)' }}>
            H
          </DiagramChip>
          {/* upper third of the h arrow — the N label owns its lower end */}
          <DiagramChip color={C_ELL} style={{ ...pct(px + 4, pt + (pe - pt) * 0.3), transform: 'translate(8px, -50%)' }}>
            h
          </DiagramChip>
          {Math.abs(pe - pg) > 4 && (
            <DiagramChip color={C_GEO} style={{ ...pct(px + 26, (pe + pg) / 2), transform: 'translate(8px, -50%)' }}>
              N
            </DiagramChip>
          )}
        </>
      )}

      {/* layer names, on the open sea where both lines are clear of the terrain */}
      <DiagramChip color={C_GEO} wide dim={!on('geoid')} style={{ ...pct(70, yG(70)), transform: 'translate(-50%, calc(-100% - 8px))' }}>
        גיאואיד · פני הים
      </DiagramChip>
      <DiagramChip color={C_ELL} wide dim={!on('ellipsoid')} style={{ ...pct(150, yE(150)), transform: 'translate(-50%, 10px)' }}>
        אליפסואיד
      </DiagramChip>
      <DiagramChip color="#38432E" wide dim={tab !== 'surface' && tab !== 'undulation'} style={{ ...pct(640, yT(640)), transform: 'translate(-50%, calc(-100% - 8px))' }}>
        פני השטח
      </DiagramChip>
      <span className="absolute bottom-1.5 left-2 rounded bg-paper-card/85 px-1.5 text-[13px] font-medium text-fg-muted">ללא קנה מידה · הגבהים מוגזמים</span>
    </div>
  );
}

function DiagramChip({
  children,
  color,
  style,
  wide,
  dim,
}: {
  children: React.ReactNode;
  color: string;
  style: React.CSSProperties;
  wide?: boolean;
  dim?: boolean;
}) {
  return (
    <span
      aria-hidden
      dir={wide ? 'rtl' : 'ltr'}
      className={cn(
        'absolute whitespace-nowrap rounded-md border-[1.5px] bg-paper-card/95 px-1.5 py-0.5 font-display text-[13px] font-bold leading-tight text-fg transition-opacity duration-200 motion-reduce:transition-none',
        dim ? 'opacity-30' : 'opacity-100',
        !wide && 'text-base leading-none',
      )}
      style={{ borderColor: color, ...style }}
    >
      {children}
    </span>
  );
}

/* Range input — same recipe as DatumShiftDemo's slider below (native thumb,
   ember focus ring), minus the filled track. */
function RangeRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  valueText,
  display,
  disabled,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  valueText: string;
  display?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-sm font-display font-semibold text-fg-muted">
        <span>{label}</span>
        {display && <L>{display}</L>}
      </span>
      {/* dir="ltr": these sliders move things in left→right diagrams, so the
          thumb must travel the same way as the object it moves. */}
      <span dir="ltr" className="relative mt-1 block h-7">
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-bg-accent ring-1 ring-inset ring-border" />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={display ? `${valueText}: ${display}` : valueText}
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

/* ─────────────────── דאטום (deck slides 15–20) ─────────────────── */
/* The deck's slide-17/18 picture as an exercise: a wavy geoid (blue) and an
   ellipsoid (here orange — the interactive object) that the learner shifts,
   rotates and scales onto it, either over the whole Earth (global datum) or
   only over one marked region (local datum). 2-D illustration: 2 shifts +
   1 rotation + 1 scale stand in for the deck's 3 + 3 + 1 parameters. */

type Pose = { dx: number; dy: number; rot: number; s: number };
type DatumMode = 'global' | 'local';
const DV = { w: 600, h: 400 } as const;
const GC = { x: 300, y: 205 } as const;
const ELL = { rx: 170, ry: 135 } as const;
const RANGE = { dx: [-200, 200], dy: [-170, 170], rot: [-45, 45], s: [0.5, 1.4] } as const;
const START: Pose = { dx: 170, dy: -120, rot: 25, s: 0.55 };
// SVG y points down, so negative angles are the upper half: an upper-right arc.
const LOCAL_ARC = { from: -1.45, to: -0.55 };
// Waves everywhere, plus a bulge inside the local arc: the place where a
// globally fitted ellipsoid leaves a gap and a local datum earns its keep.
const GEOID = Array.from({ length: 180 }, (_, i) => {
  const t = (i / 180) * Math.PI * 2;
  const signed = t > Math.PI ? t - 2 * Math.PI : t;
  const w =
    1 +
    0.05 * Math.sin(5 * t + 0.3) +
    0.03 * Math.sin(8 * t + 1.2) +
    0.025 * Math.sin(3 * t + 2) +
    0.14 * Math.exp(-(((signed + 1.0) / 0.38) ** 2));
  return { t: signed, x: GC.x + ELL.rx * w * Math.cos(t), y: GC.y + ELL.ry * w * Math.sin(t) };
});
/* Score = how close to the best reachable fit, on an absolute scale: 10
   viewBox units above the best error → 0 %. Measured with these shapes: the
   global fit is ≈ 4.4 units worse than the local fit over the marked arc
   (≈ 55 %), and the local fit is ≈ 40 units worse over the whole geoid (0 %). */
const FIT_TOL = 10;
const FIT_GOOD = 80;
const REGION: Record<DatumMode, typeof GEOID> = {
  global: GEOID,
  local: GEOID.filter((p) => p.t >= LOCAL_ARC.from && p.t <= LOCAL_ARC.to),
};
const GEOID_PATH = `${GEOID.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} Z`;
const LOCAL_PATH = REGION.local.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

/** Mean radial distance (viewBox units) from the region's geoid points to the posed ellipse. */
function fitError(p: Pose, pts: typeof GEOID) {
  const cx = GC.x + p.dx;
  const cy = GC.y + p.dy;
  const a = (p.rot * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  let sum = 0;
  for (const q of pts) {
    const vx = q.x - cx;
    const vy = q.y - cy;
    const lx = vx * cos + vy * sin;
    const ly = -vx * sin + vy * cos;
    const rho = Math.hypot(lx / (ELL.rx * p.s), ly / (ELL.ry * p.s));
    sum += rho === 0 ? 0 : Math.abs(1 - 1 / rho) * Math.hypot(vx, vy);
  }
  return sum / pts.length;
}

const clampPose = (p: Pose): Pose => ({
  dx: Math.min(RANGE.dx[1], Math.max(RANGE.dx[0], p.dx)),
  dy: Math.min(RANGE.dy[1], Math.max(RANGE.dy[0], p.dy)),
  rot: Math.min(RANGE.rot[1], Math.max(RANGE.rot[0], p.rot)),
  s: Math.min(RANGE.s[1], Math.max(RANGE.s[0], p.s)),
});

/** Pattern search inside the slider ranges, so the "best" pose is reachable. */
function bestFit(pts: typeof GEOID): { pose: Pose; err: number } {
  let best = { pose: { dx: 0, dy: 0, rot: 0, s: 1 }, err: Infinity };
  for (const seed of [{ dx: 0, dy: 0, rot: 0, s: 1 }, { dx: 60, dy: -60, rot: 0, s: 0.8 }, { dx: -60, dy: 60, rot: 20, s: 1.2 }]) {
    let p: Pose = seed;
    let e = fitError(p, pts);
    const step = { dx: 32, dy: 32, rot: 12, s: 0.16 };
    for (let round = 0; round < 8; round++) {
      let improved = true;
      while (improved) {
        improved = false;
        for (const k of ['dx', 'dy', 'rot', 's'] as const) {
          for (const dir of [1, -1]) {
            const q = clampPose({ ...p, [k]: p[k] + dir * step[k] });
            const eq = fitError(q, pts);
            if (eq < e - 1e-6) {
              p = q;
              e = eq;
              improved = true;
            }
          }
        }
      }
      step.dx /= 2;
      step.dy /= 2;
      step.rot /= 2;
      step.s /= 2;
    }
    if (e < best.err) best = { pose: p, err: e };
  }
  // Snap to the sliders' own steps so "הצגת התאמה" lands on reachable values.
  const pose = clampPose({
    dx: Math.round(best.pose.dx / 2) * 2,
    dy: Math.round(best.pose.dy / 2) * 2,
    rot: Math.round(best.pose.rot),
    s: Math.round(best.pose.s * 100) / 100,
  });
  return { pose, err: fitError(pose, pts) };
}

const DATUM_MODES: { id: DatumMode; label: string; body: string }[] = [
  { id: 'global', label: 'דאטום עולמי', body: 'מתאימים את האליפסואיד מרחבית לכלל כדור הארץ.' },
  { id: 'local', label: 'דאטום מקומי', body: 'מתאימים את האליפסואיד מרחבית רק לאזור מסוים על פני כדור הארץ (מסומן בקו עבה).' },
];

function DatumFit() {
  const [mode, setMode] = useState<DatumMode>('global');
  const [pose, setPose] = useState<Pose>(START);
  const best = useMemo(() => ({ global: bestFit(REGION.global), local: bestFit(REGION.local) }), []);
  const err = fitError(pose, REGION[mode]);
  const score = Math.round(Math.min(1, Math.max(0, 1 - (err - best[mode].err) / FIT_TOL)) * 100);
  const good = score >= FIT_GOOD;
  const set = (k: keyof Pose) => (v: number) => setPose((p) => ({ ...p, [k]: v }));
  const cx = GC.x + pose.dx;
  const cy = GC.y + pose.dy;

  return (
    <div className="my-10">
      <h3 className={H3}>דאטום: התאמת האליפסואיד לכדור הארץ</h3>
      <p className={LEAD}>
        <strong className="text-fg">דאטום</strong> הוא מכלול הפרמטרים המגדירים ומעגנים את האליפסואיד ביחס לפני כדור הארץ. נחשוב על הדאטום כעל
        הגוף המתמטי שמתאר בצורה הטובה ביותר את כדור הארץ כולו, או חלק ממנו – ונזכיר כי בלתי אפשרי לתאר את כדור הארץ בצורה מתמטית, רק
        פיזיקלית. המטרה: שהדאטום יהיה כמה שיותר דומה וקרוב לפני השטח. בתרשים – כדור הארץ כפי שהוא מוגדר על ידי שילוב של גיאואיד (בכחול)
        ואליפסואיד (בכתום). הזיזו, סובבו ושנו את קנה המידה של האליפסואיד כדי להלביש אותו על הגיאואיד.
      </p>

      <div className="surface-elevated p-6 lg:p-8 grid lg:grid-cols-[1fr_1.4fr] gap-6 lg:gap-10 items-start">
        <div className="min-w-0">
          <div role="group" aria-label="סוג הדאטום" className="grid grid-cols-2 gap-2 mb-3">
            {DATUM_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={mode === m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  'rounded-xl border px-3 py-2 font-display text-base font-bold text-fg cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  mode === m.id ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-base leading-relaxed text-fg-muted mb-5">{DATUM_MODES.find((m) => m.id === mode)!.body}</p>

          <div className="flex flex-col gap-3">
            <RangeRow label="הזזה – ציר X" min={RANGE.dx[0]} max={RANGE.dx[1]} step={2} value={pose.dx} onChange={set('dx')} valueText="הזזה בציר X" display={`${pose.dx}`} />
            {/* SVG y grows downward; the slider and its readout count upward. */}
            <RangeRow
              label="הזזה – ציר Y"
              min={-RANGE.dy[1]}
              max={-RANGE.dy[0]}
              step={2}
              value={-pose.dy}
              onChange={(v) => set('dy')(-v)}
              valueText="הזזה בציר Y"
              display={`${-pose.dy}`}
            />
            <RangeRow label="סיבוב" min={RANGE.rot[0]} max={RANGE.rot[1]} step={1} value={pose.rot} onChange={set('rot')} valueText="סיבוב" display={`${pose.rot}°`} />
            <RangeRow label="קנה מידה" min={RANGE.s[0]} max={RANGE.s[1]} step={0.01} value={pose.s} onChange={set('s')} valueText="קנה מידה" display={`×${pose.s.toFixed(2)}`} />
          </div>

          <div aria-live="polite" className={cn('mt-5 rounded-xl p-4 transition-colors motion-reduce:transition-none', good ? 'bg-status-ok/10' : 'bg-bg-accent/60')}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-display font-semibold text-fg-muted">{mode === 'global' ? 'התאמה לכל כדור הארץ' : 'התאמה לאזור המסומן'}</span>
              <span className="font-display text-3xl font-bold tabular-nums text-fg">
                <L>{score}%</L>
              </span>
            </div>
            {good && (
              <p className="mt-1 text-base leading-relaxed text-fg">
                {mode === 'global'
                  ? 'האליפסואיד מותאם מרחבית לכלל כדור הארץ – זהו דאטום עולמי.'
                  : 'האליפסואיד מותאם מרחבית רק לאזור המסומן – זהו דאטום מקומי.'}
              </p>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setPose(START)} className="btn-secondary text-sm px-4 py-2">
              איפוס
            </button>
            <button type="button" onClick={() => setPose(best[mode].pose)} className="btn-secondary text-sm px-4 py-2">
              הצגת התאמה
            </button>
          </div>
        </div>

        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-xl border border-border/70 bg-pine">
            <svg
              viewBox={`0 0 ${DV.w} ${DV.h}`}
              className="block w-full h-auto"
              role="img"
              aria-label={`גיאואיד גלי בכחול ואליפסואיד בכתום. ${mode === 'local' ? 'אזור ההתאמה מסומן בקו עבה בצד הימני העליון. ' : ''}התאמה: ${score} אחוז.`}
            >
              <path d={GEOID_PATH} fill="none" stroke={C_H} strokeWidth="3" strokeLinejoin="round" />
              {mode === 'local' && <path d={LOCAL_PATH} fill="none" stroke={C_H} strokeWidth="10" strokeLinecap="round" strokeOpacity="0.55" />}
              <g transform={`translate(${cx} ${cy}) rotate(${pose.rot}) scale(${pose.s})`}>
                <ellipse rx={ELL.rx} ry={ELL.ry} fill="none" className="stroke-accent" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                <line x1={-ELL.rx} y1="0" x2={ELL.rx} y2="0" className="stroke-accent/50" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1={-ELL.ry} x2="0" y2={ELL.ry} className="stroke-accent/50" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
              </g>
            </svg>
            <div className="absolute bottom-2 left-2 right-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] font-display font-semibold text-paper-bright/90">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-[3px] w-5 rounded" style={{ background: C_H }} />
                גיאואיד
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-[3px] w-5 rounded bg-accent" />
                אליפסואיד
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm text-fg-muted">בהמחשה הדו־ממדית יש ארבעה פרמטרים בלבד: הזזה בשני צירים, סיבוב וקנה מידה.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="surface p-5 sm:p-6">
          <h4 className="font-display text-lg font-bold leading-snug text-fg mb-2">ההבדל בין אליפסואיד לדאטום</h4>
          <p className="text-base leading-relaxed text-fg mb-2">תהליך המעבר מאליפסואיד לדאטום נעשה בשבעה פרמטרים:</p>
          <ul className="space-y-1.5 text-base leading-relaxed text-fg">
            <li>
              <strong>שלושה פרמטרי הזזה</strong> – הזזה של הדאטום עצמו במרחב (<L>X, Y, Z</L>).
            </li>
            <li>
              <strong>שלושה פרמטרי סיבוב</strong> – סיבוב של הדאטום סביב הצירים שלו (<L>X, Y, Z</L>).
            </li>
            <li>
              <strong>פרמטר קנה מידה</strong> – שינוי הגודל של הדאטום.
            </li>
          </ul>
          <p className="mt-2 text-sm text-fg-muted">כמו פקק שצריך להתאים לבקבוק שלו.</p>
        </div>
        <div className="surface p-5 sm:p-6">
          <h4 className="font-display text-lg font-bold leading-snug text-fg mb-2">ההבדל בין הדאטומים השונים</h4>
          <p className="text-base leading-relaxed text-fg mb-2">הדאטומים השונים נבדלים ביניהם בפרמטרים הבאים:</p>
          <ul className="space-y-1.5 text-base leading-relaxed text-fg">
            <li>
              רדיוס (<L>a</L>)
            </li>
            <li>
              פחיסות (<L>f</L>)
            </li>
            <li>
              שלושה פרמטרי הזזה במרחב (<L>∆x, ∆y, ∆z</L>)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── סיכום (deck slides 3–20 + deck ב׳ slide 21) ─────────────────── */

function Part1Summary() {
  const points: React.ReactNode[] = [
    <>
      <strong className="text-fg">גיאודזיה</strong> – תחום מדעי העוסק במיפוי ובקביעת מיקום של נקודות ועצמים על פני כדור הארץ.
    </>,
    <>
      <strong className="text-fg">גופי ייחוס מרחביים</strong> – גופים שצורתם קרובה לכדור הארץ, שעליהם מגדירים את מערכת הצירים ועל בסיסם עורכים מדידות.
    </>,
    <>
      <strong className="text-fg">אליפסואיד</strong> – גוף מתמטי שעליו מחשבים. <strong className="text-fg">גיאואיד</strong> – גוף פיזיקלי לחישוב גבהים מעל פני הים.{' '}
      <strong className="text-fg">גליות</strong> – ההפרש ביניהם: <L>H = h − N</L>.
    </>,
    <>
      <strong className="text-fg">דאטום</strong> – מכלול הפרמטרים המגדירים ומעגנים את האליפסואיד ביחס לפני כדור הארץ: עולמי או מקומי.
    </>,
  ];
  return (
    <div className="surface p-5 sm:p-6">
      <div className="font-display text-lg font-bold leading-snug text-fg md:text-xl mb-3">סיכום: על מה מודדים מיקום</div>
      <ol className="space-y-2 text-base leading-relaxed text-fg max-w-3xl">
        {points.map((p, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-display font-bold tabular-nums text-fg-muted">{i + 1}.</span>
            <span className="text-pretty">{p}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-base font-medium text-fg-muted">בחלק הבא: היטלים ומערכות קואורדינטות.</p>
    </div>
  );
}

/* ─────────────────── הדמיה: דאטום לא תואם (kept from the previous version) ─────────────────── */
// Slider geometry, same recipe as topic-06 PlanningScene's pacing slider: the
// native thumb's centre only travels between THUMB/2 and 100% − THUMB/2, so the
// ember fill and the tick marks are placed on that same inset scale.
const DATUM_THUMB_PX = 24;
const datumTrack = (fr: number) => `calc(${DATUM_THUMB_PX / 2}px + (100% - ${DATUM_THUMB_PX}px) * ${fr})`;
const DATUM_TICKS = [0, 50, 100] as const;

function DatumShiftDemo({ shift, setShift }: { shift: number; setShift: (n: number) => void }) {
  const dangerLevel = shift < 15 ? 'safe' : shift < 40 ? 'warn' : 'danger';
  const statusText = shift === 0 ? 'ללא סטייה' : dangerLevel === 'safe' ? 'סטייה קטנה בהדמיה' : dangerLevel === 'warn' ? 'סטייה בינונית בהדמיה' : 'סטייה גדולה בהדמיה';
  const consequenceText =
    shift < 15
      ? 'שתי הנקודות קרובות זו לזו. בערך אפס הן חופפות.'
      : shift < 40
        ? 'המרחק בין המיקום המבוקש למיקום המוצג גדל.'
        : shift < 70
          ? 'המיקום המוצג נמצא באזור אחר של המפה ביחס לנקודה המבוקשת.'
          : 'הפער בין הנקודות בהדמיה גדול.';
  return (
    <div className="my-10">
      {/* Same block anatomy as DigitAnatomy below: T1 heading + intro on the
          page, then ONE workspace card holding readout insets + the map. */}
      <h3 className="font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-4 text-balance">
        הדמיה: מה קורה כשהדאטום לא תואם?
      </h3>
      <p className="text-fg leading-relaxed text-pretty mb-8 max-w-3xl">
        <strong className="text-fg">לא ניתן לדבר על קואורדינטות של נקודה בלי שנדע מהו הדאטום ומהו ההיטל שלה</strong> (על ההיטל – בחלק הבא). ההדמיה ממחישה זאת: הזיזו את המחוון ובחנו את הפער בין המיקום המבוקש למיקום המוצג. זוהי המחשה סכמטית: ערכי הסטייה נבחרים לצורך ההדגמה בלבד.
      </p>

      {/* Sidebar (right, DOM-first per this file's RTL convention) + map column
          (left), matching the reference's proportions (map:sidebar ≈ 2.47:1,
          pixel-measured off design/reference/lesson-02/lesson2part5image2.png).
          The map keeps a fixed aspect ratio matching ImpactMap's own SVG viewBox
          (100×56 → 25/14) instead of stretching to the sidebar's content height:
          ImpactMap's overlay SVG uses preserveAspectRatio="none" so its shapes
          (crosshair, deviation ring, impact marker) are only circular/undistorted
          when the box's rendered aspect ratio equals the viewBox's. The meter
          slider + its tick captions live inside this same map column (not
          spanning the whole card) so they're exactly as wide as the map above
          them, per this project's request. */}
      <div className="surface-elevated p-6 lg:p-8 grid lg:grid-cols-[1fr_2.4fr] gap-6 lg:gap-10 items-start">
        <div className="flex flex-col gap-5 min-w-0">
          {/* Readout inset — same recipe as DigitReadout. Severity is carried
              by the dot + the consequence tint only: the raw status hues
              (amber especially) are unreadable as text on the cream insets. */}
          <div className="rounded-xl bg-bg-accent/60 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-display font-semibold mb-2 text-fg-muted">
              <span
                className={cn(
                  'inline-block size-2 rounded-full shrink-0 transition-colors motion-reduce:transition-none',
                  dangerLevel === 'safe' && 'bg-status-ok',
                  dangerLevel === 'warn' && 'bg-status-warn',
                  dangerLevel === 'danger' && 'bg-status-danger',
                )}
                aria-hidden
              />
              {statusText}
            </div>
            <div className="font-display font-bold text-4xl sm:text-5xl tabular-nums text-fg">
              {shift}
              <span className="text-2xl text-fg-muted ms-2">מ׳ סטייה</span>
            </div>
          </div>

          <div
            className={cn(
              'rounded-xl p-4 sm:p-5 transition-colors motion-reduce:transition-none',
              dangerLevel === 'safe' && 'bg-status-ok/10',
              dangerLevel === 'warn' && 'bg-status-warn/10',
              dangerLevel === 'danger' && 'bg-status-danger/10',
            )}
          >
            <div className="text-sm font-display font-semibold text-fg-muted mb-2">משמעות הסטייה בהדמיה</div>
            <p className="text-lg font-bold leading-snug text-fg text-pretty">{consequenceText}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <div className="relative overflow-hidden rounded-xl aspect-[25/14]">
            <ImpactMap shift={shift} />
          </div>

          <div>
            <div className="relative h-8">
              <div aria-hidden className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-bg-accent ring-1 ring-inset ring-border" />
              <div
                aria-hidden
                className="absolute start-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-cta-ember"
                style={{ width: datumTrack(shift / 100) }}
              />
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={shift}
                onChange={(e) => setShift(Number(e.target.value))}
                aria-label="סטייה במטרים"
                aria-valuetext={`${shift} מ׳ — ${statusText}`}
                className={cn(
                  // the global *:focus-visible ring would box the whole input — the focus cue lives on the thumb instead
                  'absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent rounded-full focus-visible:ring-0 focus-visible:ring-offset-0',
                  '[&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent',
                  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:mt-1 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-bg-elevated [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:shadow-cta-ember',
                  '[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-bg-elevated [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-accent',
                  '[&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)]',
                  '[&:focus-visible::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(217,126,43,0.45)]',
                )}
              />
            </div>
            <div aria-hidden className="relative h-1.5 mt-0.5">
              {DATUM_TICKS.map((v) => (
                <span
                  key={v}
                  className="absolute top-0 h-1.5 w-px bg-border-strong/70"
                  style={{ insetInlineStart: datumTrack(v / 100) }}
                />
              ))}
            </div>
            {/* 3 equal columns (not justify-between) so the middle caption is
                centred exactly under the 50 m tick regardless of the edge
                captions' differing widths. */}
            <div className="grid grid-cols-3 gap-2 mt-1 text-[13px] font-display font-medium text-fg-muted tabular-nums">
              {(['0 מ׳', '50 מ׳', '100 מ׳'] as const).map((label, i) => (
                <span
                  key={label}
                  className={cn(
                    'transition-colors motion-reduce:transition-none',
                    i === 0 ? 'text-start' : i === 1 ? 'text-center' : 'text-end',
                    shift >= DATUM_TICKS[i] && 'text-fg font-semibold',
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function ImpactMap({ shift }: { shift: number }) {
 // Offset logic for the SVG impact point
const offsetX = Math.min(38, shift * 0.38);
const offsetY = shift * 0.15;
const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
// Dashed "deviation zone" ring around the target — grows with the measured
// distance to the impact point but clamped so it never blows past the
// 100×56 viewBox (unclamped, shift=100's ~41 unit distance would push the
// ring off the top/bottom edges).
const ringRadius = Math.min(20, 4 + distance * 0.4);
// Label positions, expressed as % of the container (viewBox is 100×56,
// mapped 1:1 onto the container by preserveAspectRatio="none" below, so an
// x-unit already IS a %-of-width and a y-unit is %-of-56-of-height).
// Solid HTML chips instead of in-SVG <text> — same convention as this
// file's AnatomyZoomInset legend chip further down — so label legibility
// never depends on a stroke-halo hack over the busy terrain art, and the
// font size stays a real CSS px value instead of a viewBox-relative SVG
// unit that would shrink at the single-column mobile breakpoint.
const targetLeftPct = 50;
const targetTopPct = (44 / 56) * 100;
const impactLeftPct = 50 + offsetX;
const impactTopPct = ((26 - offsetY) / 56) * 100;
const midLeftPct = 50 + offsetX / 2;
const midTopPct = ((32 - offsetY / 2) / 56) * 100;
// The distance chip sits on the line's midpoint; below ~35 m that midpoint
// is still inside the crosshair, so the chip would cover the target it
// measures from. The sidebar readout carries the number until then.
const DISTANCE_CHIP_MIN = 35;
// Colors pixel-sampled from design/reference/lesson-02/lesson2part5image2.png
// (medians of solid-fill/darkest-ink regions, paper background excluded).
// Neither matches an existing token closely enough to reuse: accent.hot
// (#e2553a) and status.danger (#ef4444) are both brighter/more orange than
// the reference's muted brick-red / dark maroon.
const IMPACT_RED = '#a8342a';
const IMPACT_MAROON = '#7a1a12';
// Scale-bar tick positions, in the same 100×56 SVG-unit space as the rest
// of this overlay. Ticks are 0/50/100 — the same three checkpoints this
// exact component's slider caption row already establishes ("0 מ׳" /
// "50 מ׳ (טווח רסיסים)" / "100 מ׳ (החטאה מלאה)") — not new invented values,
// unlike the reference's own 0/50/100/200 (this demo's shift never exceeds
// 100) plus a UTM-style coordinate readout with no backing data here.
const SCALE_X0 = 6;
const SCALE_X50 = 20;
const SCALE_X100 = 34;
const SCALE_Y = 48;
return (
 <>
 {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
 <img
src={DATUM_MAP_SRC}
alt=""
aria-hidden
draggable={false}
className="absolute inset-0 size-full object-cover"
 />
 {/* North indicator — reference uses a bare solid triangle + "N", not a
     circular icon chip; matched here as a small fixed-px HTML glyph (not
     viewBox-relative, so it can't shrink at other breakpoints).
     Physical corner (not logical start/end): like the terrain art itself,
     a map orientation glyph must not move because the page is RTL — the
     reference places it at the map's left, so that's where it stays. */}
 <div className="absolute top-2 left-2 flex flex-col items-center text-fg/85" aria-hidden>
 <span className="text-[9px] font-display font-bold leading-none mb-0.5">N</span>
 <svg width="9" height="11" viewBox="0 0 10 12" fill="currentColor">
 <path d="M5 0 L10 12 L5 9 L0 12 Z" />
 </svg>
 </div>

 <svg viewBox="0 0 100 56" className="absolute inset-0 size-full" preserveAspectRatio="none" aria-hidden>
 <defs>
 {/* Hardcoded hex, not var(--fg): this file's pre-existing var(--accent-cool)
     gradient below had no matching CSS custom-property definition anywhere
     in the project (confirmed by repo-wide search) — an SVG presentation
     attribute referencing an undefined var() silently fails, so that stop
     never actually painted. Using the literal fg hex (#38432E, from
     tailwind.config.ts) avoids repeating that latent bug. */}
 <radialGradient id="targetGrad" cx="50%" cy="50%" r="50%">
 <stop offset="0%" stopColor="#38432E" stopOpacity="0.25" />
 <stop offset="100%" stopColor="#38432E" stopOpacity="0" />
 </radialGradient>
 <marker id="impactArrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse">
 <path d="M0,0 L10,5 L0,10 z" fill={IMPACT_RED} />
 </marker>
 </defs>

 {/* Map grid overlay — light quarter-division lines over the terrain art */}
 {[25, 50, 75].map((x) => (
 <line key={`v${x}`} x1={x} y1="0" x2={x} y2="56" className="stroke-fg/20" strokeWidth="0.15" />
 ))}
 {[14, 28, 42].map((y) => (
 <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} className="stroke-fg/20" strokeWidth="0.15" />
 ))}
 <rect x="0" y="0" width="100" height="56" fill="none" className="stroke-fg/25" strokeWidth="0.2" />

 {/* Deviation zone — dashed ring sized to the current shift */}
 <circle cx="50" cy="32" r={ringRadius} fill="none" className="stroke-fg/45" strokeWidth="0.3" strokeDasharray="1.3 1.1" />

 {/* Target Zone — crosshair marker (dark olive ink, matching the
     reference — not accent-cool blue, which read as a WGS84/GPS color
     cue that isn't actually in the reference art) */}
 <g>
 <circle cx="50" cy="32" r="7" fill="url(#targetGrad)" />
 <circle cx="50" cy="32" r="2.2" fill="none" className="stroke-fg" strokeWidth="0.55" />
 <line x1="46.6" y1="32" x2="53.4" y2="32" className="stroke-fg" strokeWidth="0.55" />
 <line x1="50" y1="28.6" x2="50" y2="35.4" className="stroke-fg" strokeWidth="0.55" />
 </g>

 {/* Impact Point */}
 <motion.g animate={{ x: offsetX, y: -offsetY }} transition={{ type: 'spring', stiffness: 50 }}>
 <circle cx="50" cy="32" r="1.2" fill={IMPACT_RED} />
 <circle cx="50" cy="32" r="5" fill="none" stroke={IMPACT_RED} strokeOpacity="0.4" strokeWidth="0.3">
 <animate attributeName="r" values="3;7;3" dur="1.5s" repeatCount="indefinite" />
 <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.5s" repeatCount="indefinite" />
 </circle>
 </motion.g>

 {/* Displacement line — brick-red to match the reference, with a small
     arrowhead at the impact end (also matching the reference) */}
 {shift > 4 && (
 <line
x1="50" y1="32"
x2={50 + offsetX} y2={32 - offsetY}
stroke={IMPACT_RED}
strokeOpacity="0.7"
strokeWidth="0.25"
strokeDasharray="0.6 0.6"
markerEnd="url(#impactArrow)"
 />
 )}

 {/* Scale bar — ticks at 0/50/100, reusing this component's own existing
     scale checkpoints (see const comment above), not new invented values */}
 <g className="stroke-fg" strokeWidth="0.4">
 <line x1={SCALE_X0} y1={SCALE_Y} x2={SCALE_X100} y2={SCALE_Y} />
 <line x1={SCALE_X0} y1={SCALE_Y - 1.4} x2={SCALE_X0} y2={SCALE_Y + 1.4} />
 <line x1={SCALE_X50} y1={SCALE_Y - 1.4} x2={SCALE_X50} y2={SCALE_Y + 1.4} />
 <line x1={SCALE_X100} y1={SCALE_Y - 1.4} x2={SCALE_X100} y2={SCALE_Y + 1.4} />
 </g>
 </svg>

 {/* Labels — solid HTML chips over the SVG, not in-SVG <text>: same
     legibility convention as this file's AnatomyZoomInset legend chip
     (fixed CSS px size, opaque backing) instead of a stroke-halo hack
     over the busy terrain art. */}
 <div
className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg-elevated/90 px-2.5 py-1 text-[13px] leading-tight font-display font-bold text-fg whitespace-nowrap shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
style={{ left: `${targetLeftPct}%`, top: `${targetTopPct}%` }}
 >
מיקום מבוקש
 </div>
 <motion.div
className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg-elevated/90 px-2.5 py-1 text-[13px] leading-tight font-display font-bold whitespace-nowrap shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
style={{ color: IMPACT_MAROON }}
animate={{ left: `${impactLeftPct}%`, top: `${impactTopPct}%` }}
transition={{ type: 'spring', stiffness: 50 }}
 >
מיקום מוצג
 </motion.div>
 {/* Always mounted (never conditionally rendered) so crossing the
     DISTANCE_CHIP_MIN threshold only fades opacity in/out — mounting it fresh at
     that moment made it pop in from wherever an unset left/top defaulted
     to (the container's top-right corner) instead of sliding smoothly
     from the displacement line's midpoint. */}
 <motion.div
className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg-elevated/90 px-2.5 py-1 text-[13px] leading-tight font-display font-bold whitespace-nowrap shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
style={{ color: IMPACT_MAROON }}
initial={{ opacity: 0, left: `${midLeftPct}%`, top: `${midTopPct}%` }}
animate={{ opacity: shift >= DISTANCE_CHIP_MIN ? 1 : 0, left: `${midLeftPct}%`, top: `${midTopPct}%` }}
transition={{ left: { type: 'spring', stiffness: 50 }, top: { type: 'spring', stiffness: 50 }, opacity: { duration: 0.2 } }}
 >
{shift} מ׳
 </motion.div>
 <div
className="absolute -translate-x-1/2 text-[13px] leading-tight font-display font-semibold text-fg/80 whitespace-nowrap"
style={{ left: `${SCALE_X0}%`, top: `${(SCALE_Y / 56) * 100 - 9}%` }}
 >
0
 </div>
 <div
className="absolute -translate-x-1/2 text-[13px] leading-tight font-display font-semibold text-fg/80 whitespace-nowrap"
style={{ left: `${SCALE_X50}%`, top: `${(SCALE_Y / 56) * 100 - 9}%` }}
 >
50
 </div>
 <div
className="absolute -translate-x-1/2 text-[13px] leading-tight font-display font-semibold text-fg/80 whitespace-nowrap"
style={{ left: `${SCALE_X100}%`, top: `${(SCALE_Y / 56) * 100 - 9}%` }}
 >
100
 </div>
 <div
className="absolute text-[13px] leading-tight font-display font-semibold text-fg/80 whitespace-nowrap"
style={{ left: `${SCALE_X100 + 3}%`, top: `${(SCALE_Y / 56) * 100}%`, transform: 'translateY(-50%)' }}
 >
מ׳
 </div>
 </>
 );
}

// Painterly topo backdrop for DatumShiftDemo's ImpactMap (reference:
// design/reference/lesson-02/lesson2part5image2.png). Purely decorative —
// the target/impact meaning is carried by the SVG overlay's own crosshair,
// marker and <text> labels, not by this raster layer.
const DATUM_MAP_SRC = '/assets/lessons/topic02/scene-coordinates/TOPIC02-COORDINATES-DATUM-MAP.webp';
