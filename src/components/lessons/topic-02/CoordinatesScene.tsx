'use client';
import { useCallback, useEffect, useId, useReducer, useRef, useState, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { SceneHeader } from './SceneHeader';
import { cn } from '@/lib/utils';
import { L } from './Ltr';
import { ELL_SIDE, ELL_START, ELL_TOP, clampElev, sameEll, wrap, type EllView } from './ellipsoidView';
import { MeasurementIllustration, type IllustrationLabels, type ZoomPhase } from './MeasurementIllustration';
import { useLandscapeSource } from './MeasurementLandscape';
import { LAND_STARTS, MODEL_ZOOM, clampLand, nearView, sameView, type LandTab, type LandView } from './measurementView';
import { ActionLine, ResetViewButton, ViewButton } from './StageControls';
import { useTween } from './viewControls';
import { MeasurementPanel, StationRow } from './MeasurementPanel';
import type { BodyTab } from './MeasurementSection';
import { FIRST_STATION, STATIONS, type StationId } from './measurementMission.data';
import { initialMission, missionReducer, orthometric, signed, solvedSet } from './measurementMission';
import { C_ELL, C_GEO, C_H } from './referenceBodiesStyle';
import { DatumGuided } from './datum/DatumGuided';
import { DatumFieldChallenge } from './datum-field/DatumFieldChallenge';
import { CoordinatesDefinitions } from './CoordinatesDefinitions';
import { FitScreen } from './coordinates1Fit';

/* ─────────── קואורדינטות 1 — גיאודזיה, גופי ייחוס ודאטום ───────────
   Content source: ONLY the deck "מבוא לגיאודזיה חלק א׳" (project root) —
   slide 3 geodesy · 4 reference bodies · 5 Earth-shape history · 6–9
   ellipsoid · 10–12 geoid · 13–14 undulation (H = h − N is printed in the
   slide-14 figure) · 15–20 datum (7 parameters, global vs local, the
   "cork must fit its bottle" note). The datum-shift simulation further down
   (datum-field/DatumFieldChallenge) is a three-stage map activity (brief 2026-10-12).
   Part ב׳ of the deck lives in CoordinatesPart2Scene. */

export function CoordinatesScene() {
  return (
    <section id="scene-coordinates" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SceneHeader
        step="02.3"
        eyebrow="קואורדינטות · גיאודזיה"
        title="קואורדינטות 1: על מה מודדים מיקום?"
        intro="לפני שמגדירים קואורדינטות, צריך להגדיר את הגוף שעליו מודדים. בחלק זה נכיר את הגיאודזיה, את גופי הייחוס – אליפסואיד וגיאואיד – ואת הדאטום."
      />

      {/* laptop fit: one FitScreen per learning screen (the datum block fits its two screens itself) */}
      <FitScreen name="definitions" height={787} className="mb-12">
        <CoordinatesDefinitions />
      </FitScreen>
      <FitScreen name="reference-bodies" height={917}>
        <ReferenceBodies />
      </FitScreen>
      <DatumGuided />
      <FitScreen name="datum-field" height={1033}>
        <DatumFieldChallenge />
      </FitScreen>
      <FitScreen name="summary" height={310} className="">
        <Part1Summary />
      </FitScreen>
    </section>
  );
}

// the activity's heading and lead, at the top of its own card (one envelope per activity)
const H3 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-2 text-balance';
const LEAD = 'text-fg leading-relaxed text-pretty mb-6 max-w-3xl';

/* ─────────────────── אליפסואיד · גיאואיד · גליות (deck slides 6–14) ─────────────────── */

// Each view's text says what the view is about; what to do now is said beside its control (ActionLine).
const BODY_TABS: { id: BodyTab; label: string; title: string; body: React.ReactNode; extra?: React.ReactNode }[] = [
  {
    id: 'surface',
    label: 'פני השטח',
    title: 'פני השטח: צורה מורכבת',
    body: 'פני כדור הארץ כוללים הרים וגאיות, יבשות ואוקיינוסים. זהו משטח לא אחיד, ולכן לצורך קביעת מיקום וחישובים משתמשים בגופי ייחוס המתארים את צורתו בקירוב.',
  },
  {
    id: 'ellipsoid',
    label: 'אליפסואיד',
    title: 'אליפסואיד: גוף ייחוס מתמטי',
    body: 'אליפסואיד הוא גוף ייחוס מתמטי המתאר בקירוב את צורת כדור הארץ. את צורתו אפשר להבין באמצעות סיבוב אליפסה סביב צירה.',
    extra: (
      <>
        צורת האליפסואיד נקבעת באמצעות שני פרמטרים: <strong className="text-fg">רדיוס קו המשווה</strong> (<L>a</L>) ו<strong className="text-fg">פחיסות</strong> (<L>f</L>).
        {' '}הסימון הכתום מציין את האזור שהחתך מתאר.
      </>
    ),
  },
  {
    id: 'geoid',
    label: 'גיאואיד',
    title: 'גיאואיד: משטח הייחוס לגובה',
    body: 'הגיאואיד הוא משטח ייחוס לגובה, הקרוב לפני הים הממוצעים וממשיך מתחת ליבשות. הוא נקבע לפי שדה הכבידה.',
    extra:
      'בניסוח מדויק יותר, הגיאואיד הוא משטח שווה־פוטנציאל של שדה הכבידה. בשונה מהאליפסואיד, צורתו אינה צורה גאומטרית פשוטה: האליפסואיד משמש לחישובי מיקום, מרחק וזווית, והגיאואיד – ייחוס לגובה מעל פני הים.',
  },
  {
    id: 'undulation',
    label: 'גליות וגובה',
    title: 'גליות וגובה: מאיזה משטח מודדים?',
    body: (
      <>
        גליות (<L>N</L>) היא הפרש הגובה בין הגיאואיד לאליפסואיד. בעזרתה עוברים מהגובה מעל האליפסואיד (<L>h</L>) לגובה מעל פני הים (<L>H</L>).
      </>
    ),
  },
];

// The section's description per view and step (read instead of the drawing): the same station and numbers as the figures.
function sectionLabel(tab: BodyTab, id: StationId, clear: boolean, solved: boolean): string {
  const { h, N } = STATIONS[id];
  switch (tab) {
    case 'surface':
      return `חתך: יבשה עם הרים ואוקיינוס. פני השטח אינם חלקים. מסומנת תחנה ${id}.`;
    case 'ellipsoid':
      return 'חתך: האליפסואיד מסומן כקשת חלקה ירוקה מתחת לפני השטח.';
    case 'geoid':
      return `חתך: הגיאואיד מסומן כקו גלי חום, החופף לפני הים באוקיינוס וממשיך מתחת ליבשה.${
        clear ? ` בתחנה ${id} חץ כחול – הגובה H, הנמדד מהגיאואיד עד פני השטח.` : ''
      }`;
    case 'undulation':
      return `חתך בתחנה ${id}: חץ כחול – גובה אורתומטרי H מעל הגיאואיד${solved ? `, ${orthometric(id)} מ׳` : ', לא ידוע'}; חץ ירוק – גובה אליפסואידלי h מעל האליפסואיד, ${h} מ׳; ${
        N === 0 ? 'הגיאואיד והאליפסואיד נפגשים, N = 0.' : `חץ חום – גליות N בין הגיאואיד לאליפסואיד, ${signed(N)} מ׳.`
      }`;
  }
}
const LABELS: IllustrationLabels = {
  terrain:
    'דגם נוף: רכס מיוער עם שלוחות וגאיות, מדרגה תלולה, מישור חוף עם שדות, חוף וים. על קו המדידה שלוש תחנות – C על שלוחה של הרכס, B על שלוחה נמוכה מעל המדרגה ו־A במישור החוף.',
  section: '',
  ellipsoid: 'אליפסואיד: גוף חלק ופחוס מעט בקטבים, עם קווי אורך ורוחב, הרדיוס a והפחיסות f. גררו או השתמשו בחצים כדי לסובב.',
  turn: 'גררו או השתמשו בחצים כדי לסובב.',
  ellipsoidNote: 'הפחיסות הוגדלה לצורך ההמחשה',
  clearNote: 'הקרקע שקופה: מתחתיה הגיאואיד והאליפסואיד. החץ הכחול H נמדד מהגיאואיד עד פני השטח.',
  geoidName: 'גיאואיד — משטח הייחוס לגובה',
  modelLoading: 'המודל התלת־ממדי נטען. בינתיים מוצגת תמונה של הדגם.',
  modelLost: 'התצוגה התלת־ממדית נקטעה. מוצגת תמונה קבועה של הדגם.',
  modelFailed: 'לא ניתן לטעון את המודל התלת־ממדי. מוצגת תמונה קבועה של הדגם.',
  noWebgl: 'הדפדפן אינו מציג תלת־ממד. מוצגת תמונה קבועה של הדגם.',
  retry: 'ניסיון נוסף',
};

/* ── One screen ──
   The two figures are 290px tall: the height they had at the 1920 × 1080
   reference in every view (the figures' ceiling, past which the models would
   only gain empty paper). The screen no longer sizes itself from the viewport;
   on a laptop the whole screen shrinks uniformly instead (FitScreen). */
const VIEWS_H = 290;

const isLandTab = (t: BodyTab): t is LandTab => t !== 'ellipsoid';
const lerpLand = (a: LandView, b: LandView, t: number): LandView => ({ az: a.az + (b.az - a.az) * t, elev: a.elev + (b.elev - a.elev) * t });
const lerpEll = (a: EllView, b: EllView, t: number): EllView => ({ az: a.az + wrap(b.az - a.az) * t, elev: a.elev + (b.elev - a.elev) * t });
/** How long the enlargement takes to grow out of the body before the section is linked to it (ms). */
const ZOOM_MS = 950;

/* The four layer views around one measurement mission. Every view has the
   same parts: its title and text across the card, then two figures side by
   side — the model at inline-start (visual right), the section at inline-end —
   each under a plain caption with its own controls beside it; the task adds
   one strip under both. Each view puts a different body on the model: the
   landscape, the ellipsoid, the landscape with its ground see-through on
   request, the landscape with the receiver at the station. The model is one
   element throughout, so nothing reloads.
   Shared state: the task, the picked station, the reveal, the ellipsoid's
   enlargement, and the views — the landscape's per view (each opens at its own
   angle, keeps the reader's angle when they come back, and glides between
   them the short way round), the ellipsoid's one. A drag, the arrow keys, the
   view buttons and "מבט התחלתי" move only the views; nothing that moves a view
   touches the task. */
function ReferenceBodies() {
  const [tab, setTab] = useState<BodyTab>('surface');
  const [mission, dispatch] = useReducer(missionReducer, FIRST_STATION, initialMission);
  const [clear, setClear] = useState(false);
  const [phase, setPhase] = useState<ZoomPhase>('identify');
  const [land, setLand] = useState<LandView>(LAND_STARTS.surface);
  const [ell, setEll] = useState<EllView>(ELL_START);
  const landRef = useRef(land);
  landRef.current = land;
  const ellRef = useRef(ell);
  ellRef.current = ell;
  const saved = useRef<Record<LandTab, LandView>>({ ...LAND_STARTS });
  const shownLand = useRef<LandTab>('surface');
  const zoomTimer = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = !!useReducedMotion();
  const source = useLandscapeSource();
  const live = source.mode === '3d' && source.ready;
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabId = (i: number) => `${uid}-tab-${i}`;
  const panelId = `${uid}-panel`;
  const idx = BODY_TABS.findIndex((b) => b.id === tab);
  const isMission = tab === 'undulation';
  const active = BODY_TABS[idx];
  const select = (id: StationId) => dispatch({ type: 'select', id });

  const { to: landTo, stop: landStop } = useTween(useCallback(() => landRef.current, []), setLand, lerpLand, reduce);
  const ellTween = useTween(useCallback(() => ellRef.current, []), setEll, lerpEll, reduce);
  const turnLand = (round: number, tilt: number) => {
    landStop();
    setLand((v) => clampLand({ az: v.az - round, elev: v.elev + tilt }));
  };
  const turnEll = (round: number, tilt: number) => {
    ellTween.stop();
    setEll((v) => ({ az: v.az + round, elev: clampElev(v.elev + tilt) }));
  };
  const ellTo = (elev: number) => ellTween.to({ elev, az: ellRef.current.az });

  // The wheel over a model zooms it, each body on its own; "מבט התחלתי" takes it back to 1.
  const [zoom, setZoom] = useState<Record<'land' | 'ell', number>>({ land: 1, ell: 1 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const wheelZoom = useCallback((body: 'land' | 'ell', factor: number) => {
    const from = zoomRef.current[body];
    const to = Math.min(MODEL_ZOOM[1], Math.max(MODEL_ZOOM[0], from * factor));
    if (Math.abs(to - from) < 1e-4) return;
    zoomRef.current = { ...zoomRef.current, [body]: to };
    setZoom(zoomRef.current);
  }, []);
  const unzoom = (body: 'land' | 'ell') => setZoom((z) => ({ ...z, [body]: 1 }));

  // Each landscape view keeps its own angle: leaving one stores where the reader left it,
  // entering one glides there (its opening angle the first time) the short way round.
  useEffect(() => {
    if (!isLandTab(tab) || shownLand.current === tab) return;
    saved.current[shownLand.current] = landRef.current;
    shownLand.current = tab;
    landTo(nearView(landRef.current, saved.current[tab]));
  }, [tab, landTo]);

  // The geoid view always opens on the solid ground; the reveal is the reader's own step.
  useEffect(() => {
    if (tab !== 'geoid') setClear(false);
  }, [tab]);

  // The enlargement: one click grows it out of the body and then links the section to it;
  // "back" from anywhere in between returns to the plain section at once.
  const zoomIn = () => {
    window.clearTimeout(zoomTimer.current);
    if (reduce) {
      setPhase('linked');
      return;
    }
    setPhase('zooming');
    zoomTimer.current = window.setTimeout(() => setPhase('linked'), ZOOM_MS);
  };
  const zoomOut = () => {
    window.clearTimeout(zoomTimer.current);
    setPhase('identify');
  };
  useEffect(() => () => window.clearTimeout(zoomTimer.current), []);

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

  const landStart = isLandTab(tab) ? LAND_STARTS[tab] : LAND_STARTS.surface;
  const resetLand = live && (
    <ResetViewButton
      atStart={sameView(land, landStart) && zoom.land === 1}
      onReset={() => {
        unzoom('land');
        landTo(nearView(landRef.current, landStart));
      }}
    />
  );
  // The reveal's button moves when it flips (the action, then a secondary control): focus follows it.
  const revealRef = useRef<HTMLButtonElement>(null);
  const toggleClear = () => {
    const hadFocus = document.activeElement === revealRef.current;
    setClear((c) => !c);
    if (hadFocus) requestAnimationFrame(() => revealRef.current?.focus());
  };

  // Each view's one instruction, beside the control(s) that carry it out, at the start of the model's caption …
  const modelAction: Record<BodyTab, React.ReactNode> = {
    surface: (
      <ActionLine text="בחרו תחנה והשוו בין המודל לחתך">
        <StationRow id={mission.station} solved={NONE_SOLVED} onSelect={select} />
      </ActionLine>
    ),
    ellipsoid: (
      <ActionLine text="בחנו את הפחיסות בקטבים">
        <div role="group" aria-label="מבט על האליפסואיד" className="flex gap-2">
          {(
            [
              [ELL_SIDE, 'מהצד'],
              [ELL_TOP, 'מלמעלה'],
            ] as const
          ).map(([elev, text]) => (
            <ViewButton key={elev} pressed={Math.abs(ell.elev - elev) < 0.5} onClick={() => ellTo(elev)}>
              {text}
            </ViewButton>
          ))}
        </div>
      </ActionLine>
    ),
    // first the reveal, then the stations: H is drawn (in the model and the section alike) only once revealed
    geoid: clear ? (
      <ActionLine text={<>בחרו תחנה וראו את <L>H</L></>}>
        <StationRow id={mission.station} solved={NONE_SOLVED} onSelect={select} />
      </ActionLine>
    ) : (
      <ActionLine text={<>לחצו כדי לראות מאיזה משטח נמדד <L>H</L></>}>
        <ViewButton buttonRef={revealRef} onClick={toggleClear}>
          חשיפת משטחי הייחוס
        </ViewButton>
      </ActionLine>
    ),
    undulation: (
      <ActionLine text="בחרו תחנה">
        <StationRow id={mission.station} solved={solvedSet(mission)} onSelect={select} />
      </ActionLine>
    ),
  };
  // … and its secondary controls at the caption's end.
  const modelControls: Record<BodyTab, React.ReactNode> = {
    surface: resetLand,
    ellipsoid: (
      <ResetViewButton
        atStart={sameEll(ell, ELL_START) && zoom.ell === 1}
        onReset={() => {
          unzoom('ell');
          ellTween.to({ elev: ELL_START.elev, az: ell.az + wrap(ELL_START.az - ell.az) });
        }}
      />
    ),
    geoid: (
      <>
        {clear && (
          <ViewButton buttonRef={revealRef} onClick={toggleClear}>
            החזרת פני השטח
          </ViewButton>
        )}
        {resetLand}
      </>
    ),
    undulation: resetLand,
  };
  const sectionControls =
    tab === 'ellipsoid' ? (
      phase === 'identify' ? (
        <ViewButton onClick={zoomIn}>הגדלת האזור</ViewButton>
      ) : (
        <ViewButton onClick={zoomOut}>חזרה למבט הכללי</ViewButton>
      )
    ) : undefined;

  return (
    <div className="my-10">
      <div className="surface-elevated p-6 lg:p-8">
        <h3 className={H3}>אליפסואיד, גיאואיד וגליות</h3>
        <p className={LEAD}>
          כדי לקבוע מיקום וגובה משתמשים בשני גופי ייחוס: <strong className="text-fg">אליפסואיד</strong> ו<strong className="text-fg">גיאואיד</strong>.
          עברו בין התצוגות לפי הסדר, ובתצוגה האחרונה חשבו את הגובה מעל פני הים בשלוש תחנות מדידה.
        </p>

        <div role="tablist" aria-label="שכבות החתך" onKeyDown={onTabKey} className="mb-4 flex gap-2">
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

        <div role="tabpanel" id={panelId} aria-labelledby={tabId(idx)}>
          {/* the view's own text, across the card */}
          <motion.div
            key={tab}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduce ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mb-4"
          >
            <h4 className="font-display font-bold leading-tight text-black text-base md:text-lg mb-1">{active.title}</h4>
            <p className="text-base leading-relaxed text-black text-pretty">{active.body}</p>
            {active.extra && <p className="mt-1.5 text-base leading-relaxed text-black text-pretty">{active.extra}</p>}
          </motion.div>

          <MeasurementIllustration
            tab={tab}
            station={mission.station}
            solved={solvedSet(mission)}
            onSelect={select}
            clear={clear}
            source={source}
            land={land}
            onLandTurn={turnLand}
            ell={ell}
            onEllTurn={turnEll}
            landZoom={zoom.land}
            ellZoom={zoom.ell}
            onWheelZoom={wheelZoom}
            phase={phase}
            onZoom={zoomIn}
            height={VIEWS_H}
            modelAction={modelAction[tab]}
            modelControls={modelControls[tab]}
            sectionControls={sectionControls}
            reduce={reduce}
            labels={{ ...LABELS, section: sectionLabel(tab, mission.station, clear, mission.byStation[mission.station].solved) }}
          />

          {isMission && (
            <div className="mt-4 border-t border-border-subtle pt-3">
              <MeasurementPanel state={mission} dispatch={dispatch} formula={formula} inputRef={inputRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const NONE_SOLVED: ReadonlySet<StationId> = new Set();

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
