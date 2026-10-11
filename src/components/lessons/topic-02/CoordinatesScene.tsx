'use client';
import { useCallback, useEffect, useId, useReducer, useRef, useState, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { cn } from '@/lib/utils';
import { L } from './Ltr';
import { ELL_SIDE, ELL_START, ELL_TOP, clampElev, sameEll, wrap, type EllView } from './ellipsoidView';
import { MeasurementIllustration, type IllustrationLabels } from './MeasurementIllustration';
import { illustrationSplit } from './measurementLayout';
import { LAND_START, clampLand, sameView, type LandView } from './measurementView';
import { useTween } from './viewControls';
import { MeasurementPanel, StationRow } from './MeasurementPanel';
import type { BodyTab } from './MeasurementSection';
import { FIRST_STATION, type StationId } from './measurementMission.data';
import { initialMission, missionReducer, solvedSet } from './measurementMission';
import { C_ELL, C_GEO, C_H } from './referenceBodiesStyle';
import { DatumGuided } from './datum/DatumGuided';
import { DatumFieldChallenge } from './datum-field/DatumFieldChallenge';

/* ─────────── קואורדינטות 1 — גיאודזיה, גופי ייחוס ודאטום ───────────
   Content source: ONLY the deck "מבוא לגיאודזיה חלק א׳" (project root) —
   slide 3 geodesy · 4 reference bodies · 5 Earth-shape history · 6–9
   ellipsoid · 10–12 geoid · 13–14 undulation (H = h − N is printed in the
   slide-14 figure) · 15–20 datum (7 parameters, global vs local, the
   "cork must fit its bottle" note). The datum-shift simulation further down
   (datum-field/DatumFieldChallenge) keeps the previous version's wording.
   Part ב׳ of the deck lives in CoordinatesPart2Scene. */

export function CoordinatesScene() {
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
      <DatumGuided />
      <DatumFieldChallenge />
      <Part1Summary />
    </section>
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

const BODY_TABS: { id: BodyTab; label: string; title: string; body: React.ReactNode; extra?: React.ReactNode }[] = [
  {
    id: 'surface',
    label: 'פני השטח',
    title: 'פני השטח: צורה מורכבת',
    body: 'פני כדור הארץ כוללים הרים וגאיות, יבשות ואוקיינוסים. זהו משטח לא אחיד, ולכן לצורך קביעת מיקום וחישובים משתמשים בגופי ייחוס המתארים את צורתו בקירוב. בחרו תחנת מדידה והשוו בין מיקומה בשטח לבין מיקומה בחתך.',
  },
  {
    id: 'ellipsoid',
    label: 'אליפסואיד',
    title: 'אליפסואיד: גוף ייחוס מתמטי',
    body: 'אליפסואיד הוא גוף ייחוס מתמטי המתאר בקירוב את צורת כדור הארץ. את צורתו אפשר להבין באמצעות סיבוב אליפסה סביב צירה. גררו את המודל או בחרו מבט מהצד ומלמעלה, ובחנו את הפחיסות בקטבים.',
    extra: (
      <>
        צורת האליפסואיד נקבעת באמצעות שני פרמטרים: <strong className="text-fg">רדיוס קו המשווה</strong> (<L>a</L>) ו<strong className="text-fg">פחיסות</strong> (<L>f</L>).
      </>
    ),
  },
  {
    id: 'geoid',
    label: 'גיאואיד',
    title: 'גיאואיד: משטח הייחוס לגובה',
    body: 'הגיאואיד הוא משטח שווה פוטנציאל של שדה הכבידה. הוא מתאר בקירוב את פני הים הממוצעים במצב שיווי משקל, ללא השפעת זרמים, גאות ושפל, ואת המשכם מתחת ליבשות.',
    extra: 'בשונה מהאליפסואיד, צורת הגיאואיד אינה צורה גאומטרית פשוטה. האליפסואיד משמש לחישובי מיקום, מרחק וזווית; הגיאואיד משמש ייחוס לגובה מעל פני הים. פתחו וסגרו את החתך כדי לראות כיצד הגיאואיד ממשיך מתחת ליבשה.',
  },
  {
    id: 'undulation',
    label: 'גליות וגובה',
    title: 'גליות וגובה: מאיזה משטח מודדים?',
    body: 'גליות (N) היא הפרש הגובה בין הגיאואיד לאליפסואיד. בחרו תחנה, קראו את הגובה האליפסואידלי (h) ואת הגליות (N), וחשבו את הגובה מעל פני הים (H).',
  },
];

// The section's description per view (read instead of the drawing).
const SECTION_LABELS: Record<BodyTab, string> = {
  surface: 'חתך: יבשה עם הרים ואוקיינוס. פני השטח אינם חלקים.',
  ellipsoid: 'חתך: האליפסואיד מסומן כקשת חלקה ירוקה מתחת לפני השטח.',
  geoid: 'חתך: הגיאואיד מסומן כקו גלי חום, החופף לפני הים באוקיינוס.',
  undulation: 'חתך: נקודה על פני השטח. חץ כחול – גובה אורתומטרי H מעל הגיאואיד; חץ ירוק – גובה אליפסואידלי h מעל האליפסואיד; חץ חום – גליות N בין הגיאואיד לאליפסואיד.',
};
const LABELS: IllustrationLabels = {
  terrain:
    'דגם נוף: רכס מיוער עם שלוחות וגאיות, מדרגה תלולה, מישור חוף עם שדות, חוף וים. על קו המדידה שלוש תחנות – C על שלוחה של הרכס, B על שלוחה נמוכה מעל המדרגה ו־A במישור החוף.',
  section: '',
  ellipsoid: 'אליפסואיד: גוף חלק ופחוס מעט בקטבים, עם קווי אורך ורוחב, הרדיוס a והפחיסות f. גררו או השתמשו בחצים כדי לסובב.',
  turn: 'גררו או השתמשו בחצים כדי לסובב.',
  hint: 'גררו כדי לסובב',
  ellipsoidNote: 'הפחיסות הוגדלה לצורך ההמחשה',
};

/* ── One screen ──
   The activity card fits the screen under the site's fixed header: the
   illustration column takes the height that is left (between a readable floor
   and the task view's design height at 1440 × 1122), and every view shares it,
   so switching views never changes the card's height. The text column widens
   on shorter screens — there the model is framed by the stage's height, so the
   width it gives up costs nothing — and the task form then fits one row. */
const SCREEN_GAP = 12;
const ILL_H = { min: 520, max: 695 } as const;
const TEXT_W = { min: 346, max: 440 } as const;
/** From this text-column width the task form fits on one row. */
const COMPACT_FROM = 420;
const clampTo = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function useScreenFit(cardRef: React.RefObject<HTMLDivElement | null>, panelRef: React.RefObject<HTMLDivElement | null>) {
  const [fit, setFit] = useState({ on: false, ill: ILL_H.max as number, textW: TEXT_W.min as number });
  useEffect(() => {
    const card = cardRef.current;
    const panel = panelRef.current;
    if (!card || !panel) return;
    const measure = () => {
      if (window.innerWidth < 1024) {
        setFit((f) => (f.on ? { ...f, on: false } : f));
        return;
      }
      const header = document.querySelector('header.fixed')?.getBoundingClientRect().height ?? 0;
      const chrome = card.getBoundingClientRect().height - panel.getBoundingClientRect().height;
      const ill = clampTo(Math.floor(window.innerHeight - header - 2 * SCREEN_GAP - chrome), ILL_H.min, ILL_H.max);
      // the width that frames the model at the task view's stage height (its legend ≈ 104 px), ps-7 included
      const { stage } = illustrationSplit(ill, true, 104);
      const textW = clampTo(Math.round(panel.getBoundingClientRect().width - (stage * 1.85 + 28)), TEXT_W.min, TEXT_W.max);
      setFit((f) => (f.on && f.ill === ill && f.textW === textW ? f : { on: true, ill, textW }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(panel);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [cardRef, panelRef]);
  return fit;
}

const lerpLand = (a: LandView, b: LandView, t: number): LandView => ({ az: a.az + (b.az - a.az) * t, elev: a.elev + (b.elev - a.elev) * t });
const lerpEll = (a: EllView, b: EllView, t: number): EllView => ({ az: a.az + wrap(b.az - a.az) * t, elev: a.elev + (b.elev - a.elev) * t });

/* The four layer views around one measurement mission (mockup
   design/mockups/topic-02-geodesy/03-measurement-mission-v2.png). Every view
   splits the same way: text and its controls first in DOM (visual right),
   the illustration beside it — a stage and the section below. Each view puts
   a different body on the stage: the landscape, the ellipsoid, the landscape
   opened along the survey line to show the geoid, the landscape opened with
   the receiver and the heights at the station. The illustration is one element
   throughout, so nothing reloads.
   Shared state: the task, the picked station, the cut, and one view per body
   (LandView, EllView). A drag, the arrow keys, the ellipsoid's two view
   buttons and "מבט התחלתי" all move those views; nothing that moves a view
   touches the task. */
function ReferenceBodies() {
  const [tab, setTab] = useState<BodyTab>('surface');
  const [mission, dispatch] = useReducer(missionReducer, FIRST_STATION, initialMission);
  const [cutOpen, setCutOpen] = useState(false);
  const [land, setLand] = useState<LandView>(LAND_START);
  const [ell, setEll] = useState<EllView>(ELL_START);
  const landRef = useRef(land);
  landRef.current = land;
  const ellRef = useRef(ell);
  ellRef.current = ell;
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = !!useReducedMotion();
  const fit = useScreenFit(cardRef, panelRef);
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabId = (i: number) => `${uid}-tab-${i}`;
  const panelId = `${uid}-panel`;
  const idx = BODY_TABS.findIndex((b) => b.id === tab);
  const isMission = tab === 'undulation';
  const active = BODY_TABS[idx];
  const select = (id: StationId) => dispatch({ type: 'select', id });

  const landTween = useTween(useCallback(() => landRef.current, []), setLand, lerpLand, reduce);
  const ellTween = useTween(useCallback(() => ellRef.current, []), setEll, lerpEll, reduce);
  const turnLand = (round: number, tilt: number) => {
    landTween.stop();
    setLand((v) => clampLand({ az: v.az - round, elev: v.elev + tilt }));
  };
  const turnEll = (round: number, tilt: number) => {
    ellTween.stop();
    setEll((v) => ({ az: v.az + round, elev: clampElev(v.elev + tilt) }));
  };
  const ellTo = (elev: number) => ellTween.to({ elev, az: ellRef.current.az });

  // Entering the geoid view opens the slab once the swap has settled — the reveal is the
  // transition (at once under reduced motion); the button closes and reopens it.
  useEffect(() => {
    if (tab !== 'geoid') {
      setCutOpen(false);
      return;
    }
    if (reduce) {
      setCutOpen(true);
      return;
    }
    const t = window.setTimeout(() => setCutOpen(true), 450);
    return () => window.clearTimeout(t);
  }, [tab, reduce]);

  // Tabs: ←/→ step through the views (RTL: ← = next), Home/End jump; focus follows.
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = -1;
    if (e.key === 'ArrowLeft') next = Math.min(BODY_TABS.length - 1, idx + 1);
    else if (e.key === 'ArrowRight') next = Math.max(0, idx - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = BODY_TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setTab(BODY_TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  const formula = (
    <div className="shrink-0 rounded-xl bg-bg-accent/60 px-3 py-1 text-center">
      <L>
        <span className="font-display text-2xl font-bold tabular-nums">
          <span style={{ color: C_H }}>H</span> = <span style={{ color: C_ELL }}>h</span> − <span style={{ color: C_GEO }}>N</span>
        </span>
      </L>
    </div>
  );

  // Each explanation view's own control, under its text.
  const controls: Partial<Record<BodyTab, React.ReactNode>> = {
    surface: <StationRow id={mission.station} solved={NONE_SOLVED} onSelect={select} />,
    ellipsoid: (
      <div role="group" aria-label="מבט על האליפסואיד" className="flex gap-2">
        {(
          [
            [ELL_SIDE, 'מהצד'],
            [ELL_TOP, 'מלמעלה'],
          ] as const
        ).map(([elev, text]) => (
          <ToggleButton key={elev} pressed={Math.abs(ell.elev - elev) < 0.5} onClick={() => ellTo(elev)}>
            {text}
          </ToggleButton>
        ))}
      </div>
    ),
    geoid: (
      <ToggleButton pressed={cutOpen} onClick={() => setCutOpen((o) => !o)}>
        פתיחת חתך
      </ToggleButton>
    ),
  };

  const legend = (
    <div>
      <p className="text-center text-sm text-fg-muted">השוו בין חצי הגובה בחתך לבין נתוני התחנה שנבחרה.</p>
      <ul className="mt-2 space-y-1 text-base leading-relaxed text-black">
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
    </div>
  );

  return (
    <div className="my-10">
      <h3 className={H3}>אליפסואיד, גיאואיד וגליות</h3>
      <p className={LEAD}>
        כדי לקבוע מיקום וגובה משתמשים בשני גופי ייחוס: <strong className="text-fg">אליפסואיד</strong>, המתאר בקירוב את צורת כדור הארץ, ו
        <strong className="text-fg">גיאואיד</strong>, המשמש ייחוס לגובה מעל פני הים. עברו בין התצוגות והשוו בין פני השטח, גופי הייחוס והגבהים
        הנמדדים ביחס אליהם.
      </p>

      <div ref={cardRef} className="surface-elevated p-6 lg:p-8">
        <div role="tablist" aria-label="שכבות החתך" onKeyDown={onTabKey} className="mb-6 flex gap-2">
          {BODY_TABS.map((b, i) => (
            <button
              key={b.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={tabId(i)}
              aria-selected={tab === b.id}
              aria-controls={panelId}
              tabIndex={tab === b.id ? 0 : -1}
              onClick={() => setTab(b.id)}
              className={cn(
                'flex-1 rounded-xl border px-3 py-2.5 font-display text-base font-bold text-fg cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                tab === b.id ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
              )}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div
          ref={panelRef}
          role="tabpanel"
          id={panelId}
          aria-labelledby={tabId(idx)}
          className="grid items-start gap-6 lg:grid-cols-[var(--mm-text)_minmax(0,1fr)] lg:gap-0"
          style={{ ['--mm-text' as string]: `${fit.textW}px` }}
        >
          {/* text and its controls — inline-start (visual right); only the view's own text takes room */}
          <motion.div
            key={tab}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduce ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0 lg:pe-7"
          >
            <h4 className="font-display font-bold leading-tight text-black text-base md:text-lg mb-2">{active.title}</h4>
            <p className="text-base leading-relaxed text-black text-pretty">{active.body}</p>
            {active.extra && <p className="mt-2 text-base leading-relaxed text-black text-pretty">{active.extra}</p>}
            {isMission ? (
              <div className="mt-4 border-t border-border-subtle pt-4">
                <MeasurementPanel state={mission} dispatch={dispatch} formula={formula} inputRef={inputRef} compact={fit.on && fit.textW >= COMPACT_FROM} />
              </div>
            ) : (
              controls[tab] && <div className="mt-4 border-t border-border-subtle pt-4">{controls[tab]}</div>
            )}
          </motion.div>

          {/* illustration — inline-end (visual left) */}
          <div className="min-w-0 lg:border-s lg:border-border-subtle lg:ps-7">
            <MeasurementIllustration
              tab={tab}
              station={mission.station}
              solved={solvedSet(mission)}
              onSelect={select}
              cutOpen={cutOpen}
              land={land}
              onLandTurn={turnLand}
              onLandReset={() => landTween.to(LAND_START)}
              landAtStart={sameView(land, LAND_START)}
              ell={ell}
              onEllTurn={turnEll}
              onEllReset={() => ellTween.to({ elev: ELL_START.elev, az: ell.az + wrap(ELL_START.az - ell.az) })}
              ellAtStart={sameEll(ell, ELL_START)}
              height={fit.ill}
              footer={isMission ? legend : undefined}
              labels={{ ...LABELS, section: SECTION_LABELS[tab] }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const NONE_SOLVED: ReadonlySet<StationId> = new Set();

/** A view control: the tabs' own button style, pressed while its state is on. */
function ToggleButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'rounded-xl border px-4 py-2 font-display text-sm font-bold text-fg cursor-pointer transition-colors duration-200 ease-snap motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        pressed ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated hover:border-brand/30 hover:bg-brand/[0.03]',
      )}
    >
      {children}
    </button>
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
