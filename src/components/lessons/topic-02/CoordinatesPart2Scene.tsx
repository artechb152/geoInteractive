'use client';
import { SceneHeader } from './SceneHeader';
import { ReferenceSystemsLinkedComparison } from './ReferenceSystemsLinkedComparison';
import { UtmProjectionExplainer } from './utm-atlas/UtmProjectionExplainer';
import { UtmZoneAtlas } from './utm-atlas/UtmZoneAtlas';
import { Base60Workbench } from './base60/Base60Workbench';
import { GlobeExplorer } from './geo-globe/GlobeExplorer';
import { ProjectionsLab } from './projections/ProjectionsLab';
import { LessonViewportFit } from '@/components/lesson/LessonViewportFit';
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
        intro="אחרי שהגדרנו על מה מודדים, נלמד כיצד עוברים מהגוף התלת־ממדי למפה, וכיצד מציינים מיקום בשתי מערכות קואורדינטות מרכזיות: מערכת קואורדינטות גיאוגרפית ומערכת UTM."
      />

      <FitScreen name="projections" height={1036}>
        <ProjectionsLab />
      </FitScreen>
      <FitScreen name="geographic-coordinates" height={898}>
        <GlobeExplorer />
      </FitScreen>
      <FitScreen name="base60" height={1090}>
        <Base60Workbench />
      </FitScreen>
      <FitScreen name="geo-pros-cons" height={216}>
        <GeoProsCons />
      </FitScreen>
      <UtmBlock />
      <FitScreen name="reference-systems" height={857}>
        <ReferenceSystemBlock />
      </FitScreen>
      <FitScreen name="reading-coordinates" height={778}>
        <ReadingCoordinatesBlock />
      </FitScreen>
      <FitScreen name="summary" height={244} className="">
        <Part2Summary />
      </FitScreen>
    </section>
  );
}

/* ─────────────────── מסכי לפטופ ─────────────────── */
/* Each learning screen of the part shrinks on its own, uniformly, like a slide (LessonViewportFit),
   so a laptop shows it whole: same columns, line breaks, map ratios and control positions.
   Reference = 1920 × 1080: the section's content column is 1088px (max-w-6xl less its lg padding).
   The free height is the view under the 80px site header (--header-h from md up) less a 16px margin
   above and below the screen: 968px there. `height` is the screen's laid-out height at 1920 × 1080; a
   screen taller than those 968px is fitted as 968px, so the 1920 × 1080 view stays at scale 1 and a
   laptop keeps the same share of the screen in view. The scale never exceeds 1 and stays steady while
   a state (feedback, practice) changes the screen's height. */
const FIT_WIDTH = 1088;
const FIT_TOP = 80 + 16;
const FIT_BOTTOM = 16;
const FIT_VIEW_HEIGHT = 1080 - FIT_TOP - FIT_BOTTOM;

function FitScreen({
  name,
  height,
  className = 'my-10',
  children,
}: {
  name: string;
  /** Laid-out height at 1920 × 1080, px. */
  height: number;
  /** Margins of the screen in the sequence (the wrapped root's own margins are moved here). */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-coordinates2-screen={name} className={className}>
      <LessonViewportFit
        referenceWidth={FIT_WIDTH}
        referenceHeight={Math.min(height, FIT_VIEW_HEIGHT)}
        reserveTop={FIT_TOP}
        reserveBottom={FIT_BOTTOM}
        contentClassName="[&>*]:!my-0"
      >
        {children}
      </LessonViewportFit>
    </div>
  );
}

/** Latin, digits and symbols inside Hebrew text: in an RTL paragraph the bidi
    algorithm would otherwise render "15°N" as "N°15" and reverse "a × b = c". */
function L({ children }: { children: React.ReactNode }) {
  return <bdi dir="ltr">{children}</bdi>;
}

const H3 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-4 text-balance';
const LEAD = 'text-fg leading-relaxed text-pretty mb-8 max-w-3xl';

/* ─────────────────── היטלים (slides 3–5) ─────────────────── */
/* "מעבדת פתיחה" (design/mockups/projections-concepts-2026-10-12, חלופה 1): one card —
   cylindrical, conic and azimuthal tabs; the surface on a WGS84 3-D globe opens into the map
   it makes, beside that map; practice ("נסו לזהות את המשטח") in the same card.
   Everything lives in ./projections. */

/* ─────────────────── מערכת קואורדינטות גיאוגרפית (slides 6–9) ─────────────────── */
/* The "גלובוס חוקר" explorer (design/mockups/geographic-coordinates-2026-10-12/
   01-globe-explorer.png): ./geo-globe/GlobeExplorer.tsx — a WGS84 globe, lat / lon
   controls opening on the deck's example (90E,30S), then random practice tasks
   checked by place on the globe. */

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
/* "אטלס הפלחים" (design/mockups/utm-concepts-2026-10-12, חלופה 2): a short
   projection explainer (globe → transverse cylinder → local map), then the
   atlas — one point drives a world locator map, a linked enlargement, the
   zone, the hemisphere and E/N in metres; practice runs in the same card.
   Everything lives in ./utm-atlas. */

/* Two screens on a laptop: the heading with the explainer, then the atlas. Both parts keep
   data-block="utm"; the explainer's own bottom margin stays the gap between them. */
function UtmBlock() {
  return (
    <>
      <FitScreen name="utm-projection" height={565} className="mt-10">
        <div data-block="utm">
          <h3 className={H3}>
            היטל <L>UTM</L>
          </h3>
          <p className={LEAD}>
            <L>
              <strong className="text-fg">Universal Transverse Mercator</strong>
            </L>{' '}
            – מערכת קואורדינטות שמבוססת על <strong className="text-fg">היטל מרקטור רוחבי</strong>. העולם מחולק ל־60 פלחים צרים, ובכל פלח
            מודדים מיקום במטרים, ברשת מקומית.
          </p>
          <UtmProjectionExplainer />
        </div>
      </FitScreen>
      <FitScreen name="utm-atlas" height={951} className="mb-10">
        <div data-block="utm">
          <UtmZoneAtlas />
        </div>
      </FitScreen>
    </>
  );
}

/* ─────────────────── מערכות ייחוס (slide 17) ─────────────────── */

/* Two screens (claude-linked-comparison-toggle-and-split.md, one map since
   claude-reference-systems-single-map.md): the map activity, then a
   separate static summary — the comparison table, the conclusion and the definitions —
   under its own heading. The geographic system is not a projection, and a reference
   system is more than "datum + projection" (claude-linked-comparison-followup.md). */

/** Short definitions on screen 2 — plain text, no concept glyphs, no "+ / =". */
const TERMS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'דאטום',
    body: (
      <>
        מגדיר את גוף הייחוס ואת עיגונו ביחס לכדור הארץ. בהדגמה הזאת הדאטום זהה בשתי המערכות: <L>WGS84</L>. להרחבה, ראו קואורדינטות 1.
      </>
    ),
  },
  {
    title: 'היטל',
    body: (
      <>
        שיטה מתמטית לייצוג פני השטח העקומים על מישור. מערכת <L>UTM</L> משתמשת בהיטל; רוחב ואורך הם קואורדינטות גיאוגרפיות ואינם היטל
        למישור.
      </>
    ),
  },
  {
    title: 'מערכת ייחוס',
    body: 'מגדירה כיצד לפרש קואורדינטות: הדאטום, הצירים והיחידות, ובמערכת מישורית גם ההיטל והפרמטרים שלו.',
  },
];

/** The fixed comparison that replaced the three tabs: all rows visible; the coverage row is
    general context (the local map does not show it), so it is set lighter. */
const SYSTEM_DIFFERENCES: { label: string; geo: React.ReactNode; utm: React.ReactNode; context?: boolean }[] = [
  { label: 'יחידות המדידה', geo: 'יחידות זווית: מעלות, דקות ושניות', utm: 'מטרים' },
  { label: 'פרטי המיקום', geo: 'רוחב ואורך', utm: 'מזרח וצפון, בציון הפלח וחצי הכדור' },
  {
    label: 'כיסוי ופלחים',
    geo: 'רוחב ואורך מאפשרים לתאר מיקומים ברחבי כדור הארץ',
    utm: (
      <>
        <L>UTM</L> מחולקת ל־60 פלחים, בדרך כלל ברוחב <L>6°</L> של אורך; בכל נקודה מציינים את הפלח המתאים
      </>
    ),
    context: true,
  },
];

/* Screen 1 — one map (ReferenceSystemsLinkedComparison): switch its method, pick a point,
   read what the numbers mean. Nothing static rides along in its card. */
function ReferenceSystemBlock() {
  return (
    <div className="my-10">
      <h3 className={H3}>מערכות ייחוס</h3>
      <p className={cn(LEAD, 'mb-6')}>
        אותו מקום יכול להיכתב בשיטות קואורדינטות שונות. בחרו שיטה מעל המפה, ובחרו נקודה במפה או בכפתורים שמתחתיה.
      </p>
      <ReferenceSystemsLinkedComparison />
    </div>
  );
}

/* Screen 2 — static: what each system states, and what you must know to read numbers.
   No action, no A/B/C, no link to the map switches above. */
function ReadingCoordinatesBlock() {
  return (
    <div className="my-10" data-screen="reading-coordinates">
      <h3 className={H3}>כיצד מפרשים קואורדינטות?</h3>
      <p className={LEAD}>כדי לפרש קואורדינטות, צריך לדעת באיזו מערכת ייחוס הן נכתבו. ההשוואה הבאה מסכמת את ההבדלים בין שתי המערכות.</p>

      <div className="surface-elevated p-6 lg:p-8">
        <SystemDifferences />
        <p data-conclusion className="mt-3 border-t border-border/60 pt-5 font-display text-base font-bold leading-snug text-black text-balance md:text-lg">
          אותה נקודה בשטח יכולה להיכתב בקואורדינטות שונות. כדי לפרש את המספרים ולזהות את מיקומה, צריך לדעת באיזו מערכת ייחוס הם נכתבו.
        </p>
      </div>

      <dl data-definitions className="mt-6 surface-elevated p-6 lg:p-8 grid gap-6 lg:grid-cols-3 lg:gap-0">
        {TERMS.map((t) => (
          <div key={t.title} className="min-w-0 lg:px-6 lg:first:ps-0 lg:last:pe-0 lg:[&+&]:border-s lg:[&+&]:border-border/60">
            <dt className="mb-2 font-display font-bold leading-tight text-black text-base md:text-lg">{t.title}</dt>
            <dd className="text-base leading-relaxed text-black text-pretty">{t.body}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** "מה שונה בין המערכות?" — columns in the maps' order: geographic (right), UTM (left). */
function SystemDifferences() {
  const cell = 'py-3 align-top text-start';
  return (
    <div data-differences>
      <h4 className="font-display font-bold leading-tight text-black text-base md:text-lg">מה שונה בין המערכות?</h4>
      <table className="mt-3 w-full table-fixed border-collapse text-base leading-relaxed">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={cn(cell, 'w-[11rem] pt-0 pe-4 font-display font-semibold text-fg-muted')}>
              מאפיין
            </th>
            <th scope="col" className={cn(cell, 'pt-0 pe-6 font-display font-bold text-black')}>
              מערכת גיאוגרפית
            </th>
            <th scope="col" className={cn(cell, 'pt-0 font-display font-bold text-black')}>
              מערכת <L>UTM</L>
            </th>
          </tr>
        </thead>
        <tbody>
          {SYSTEM_DIFFERENCES.map((row) => (
            <tr key={row.label} data-difference={row.label} className="border-b border-border/60 last:border-b-0">
              <th scope="row" className={cn(cell, 'pe-4 font-display', row.context ? 'font-semibold text-fg-muted' : 'font-bold text-black')}>
                {row.label}
              </th>
              <td className={cn(cell, 'pe-6 text-pretty', row.context ? 'text-fg-muted' : 'text-black')}>{row.geo}</td>
              <td className={cn(cell, 'text-pretty', row.context ? 'text-fg-muted' : 'text-black')}>{row.utm}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────── סיכום (deck ב׳ slide 21 + slides 3–17) ─────────────────── */

function Part2Summary() {
  const points: React.ReactNode[] = [
    <>
      <strong className="text-fg">היטל</strong> – מעבר מעולם תלת־ממדי לדו־ממדי. שיטות ההטלה: גלילית, חרוטית ואזימוטלית.
    </>,
    <>
      <strong className="text-fg">מערכת קואורדינטות גיאוגרפית</strong> – רוחב (<L>ϕ</L>) מקו המשווה ואורך (<L>λ</L>) מגריניץ׳, במעלות, בדקות ובשניות (חלוקה ב־60).
    </>,
    <>
      <strong className="text-fg">
        היטל <L>UTM</L>
      </strong>{' '}
      – 60 פלחים של <L>6°</L>, ביחידות מטריות. מציינים גם את הפלח ואת חצי הכדור.
    </>,
    <>
      <strong className="text-fg">מערכת ייחוס</strong> מגדירה כיצד לפרש קואורדינטות: הדאטום, הצירים והיחידות, ובמערכת מישורית גם ההיטל והפרמטרים שלו.
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
