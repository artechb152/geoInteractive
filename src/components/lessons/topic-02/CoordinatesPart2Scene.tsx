'use client';
import { SceneHeader } from './SceneHeader';
import { ReferenceSystemsLinkedComparison } from './ReferenceSystemsLinkedComparison';
import { UtmProjectionExplainer } from './utm-atlas/UtmProjectionExplainer';
import { UtmZoneAtlas } from './utm-atlas/UtmZoneAtlas';
import { Base60Workbench } from './base60/Base60Workbench';
import { GlobeExplorer } from './geo-globe/GlobeExplorer';
import { ProjectionsLab } from './projections/ProjectionsLab';
import { GeoProsCons } from './GeoProsCons';
import { ReadingCoordinates } from './reading-coordinates/ReadingCoordinates';
import { LESSON_FIT_MAX_HEIGHT, LessonViewportFit } from '@/components/lesson/LessonViewportFit';

/* ─────────── קואורדינטות 2 — היטלים ומערכות קואורדינטות ───────────
   Content source: ONLY the deck "מבוא לגיאודזיה חלק ב׳" (project root) —
   slides 3–5 projections · 6–9 geographic coordinates (+ the deck's own
   example and exercise) · 10–11 base-60 and the formats table (the deck's
   own sample values) · 12 pros/cons · 13–16 UTM · 17 reference systems ·
   21 summary. Part א׳ (geodesy, ellipsoid, geoid, datum) is CoordinatesScene.
   Azimuth (slides 18–20) is not a coordinates topic and stays out. */

export function CoordinatesPart2Scene() {
  return (
    <section id="scene-coordinates-2" className="max-w-lesson mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SceneHeader
        step="02.3"
        eyebrow="קואורדינטות · היטלים"
        title="קואורדינטות 2: היטלים ומערכות קואורדינטות"
        intro="אחרי שהגדרנו על מה מודדים, נלמד כיצד עוברים מהגוף התלת־ממדי למפה, וכיצד מציינים מיקום בשתי מערכות קואורדינטות מרכזיות: מערכת קואורדינטות גיאוגרפית ומערכת UTM."
      />

      <FitScreen name="projections" height={1002}>
        <ProjectionsLab />
      </FitScreen>
      <FitScreen name="geographic-coordinates" height={898}>
        <GlobeExplorer />
      </FitScreen>
      <FitScreen name="base60" height={1090}>
        <Base60Workbench />
      </FitScreen>
      <FitScreen name="geo-pros-cons" height={636}>
        <GeoProsCons />
      </FitScreen>
      <UtmBlock />
      <FitScreen name="reference-systems" height={966}>
        <ReferenceSystemBlock />
      </FitScreen>
      <FitScreen name="reading-coordinates" height={1294}>
        <ReadingCoordinates />
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
   Reference = 1920 × 1080: the section's content column is 1344px (max-w-lesson less its lg padding).
   The free height is the view under the 80px site header (--header-h from md up) less a 16px margin
   above and below the screen. `height` is the screen's laid-out height at 1920 × 1080; a screen taller
   than LESSON_FIT_MAX_HEIGHT is fitted as that height (its foot scrolls on a laptop), so it shrinks to
   the same width as the other topic-02 screens instead of a narrower, height-bound one. 1920 × 1080
   stays at scale 1. The scale never exceeds 1 and stays steady while a state (feedback, practice)
   changes the screen's height. */
const FIT_WIDTH = 1344;
const FIT_TOP = 80 + 16;
const FIT_BOTTOM = 16;

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
        referenceHeight={Math.min(height, LESSON_FIT_MAX_HEIGHT)}
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

/** An activity's heading and lead, at the top of its own card (one envelope per activity). */
const CARD_H3 = 'font-display text-2xl font-bold leading-tight text-fg sm:text-3xl mb-2 text-balance';
const CARD_LEAD = 'text-fg leading-relaxed text-pretty mb-6 max-w-3xl';

/* ─────────────────── היטלים (slides 3–5) ─────────────────── */
/* "מעבדת פתיחה" (design/mockups/projections-concepts-2026-10-12, חלופה 1): one card —
   cylindrical, conic and azimuthal tabs; the surface on a WGS84 3-D globe opens into the map
   it makes, beside that map; equal circles show the distortion; practice ("נסו לזהות את
   המשטח") in the same card. Everything lives in ./projections. */

/* ─────────────────── מערכת קואורדינטות גיאוגרפית (slides 6–9) ─────────────────── */
/* The "גלובוס חוקר" explorer (design/mockups/geographic-coordinates-2026-10-12/
   01-globe-explorer.png): ./geo-globe/GlobeExplorer.tsx — a WGS84 globe, lat / lon
   controls opening on the deck's example (90E,30S), then random practice tasks
   checked by place on the globe. */

/* ─────────────────── יתרונות ומגבלות (slide 12) ─────────────────── */
/* After base 60 (the units) and before UTM (the answer in metres): the deck's pros / cons said
   precisely and tied to the globe — one grid for the whole Earth; angles, not metres; a degree of
   longitude that shrinks toward the poles (figure). ./GeoProsCons.tsx. */

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
      <FitScreen name="utm-projection" height={653} className="mt-10">
        <div data-block="utm">
          <UtmProjectionExplainer
            header={
              <>
                <h3 className={CARD_H3}>
                  היטל <L>UTM</L>
                </h3>
                <p className={CARD_LEAD}>
                  <L>
                    <strong className="text-fg">Universal Transverse Mercator</strong>
                  </L>{' '}
                  – מערכת קואורדינטות שמבוססת על <strong className="text-fg">היטל מרקטור רוחבי</strong>. העולם מחולק ל־60 פלחים צרים, ובכל פלח
                  מודדים מיקום במטרים, ברשת מקומית.
                </p>
              </>
            }
          />
        </div>
      </FitScreen>
      <FitScreen name="utm-atlas" height={816} className="mb-10">
        <div data-block="utm">
          <UtmZoneAtlas />
        </div>
      </FitScreen>
    </>
  );
}

/* ─────────────────── מערכות ייחוס (slide 17) ─────────────────── */

/* Screen 1 — one map (ReferenceSystemsLinkedComparison): switch its method, pick a point,
   read what the numbers mean. Nothing static rides along in its card. */
function ReferenceSystemBlock() {
  return (
    <div className="my-10">
      <ReferenceSystemsLinkedComparison
        header={
          <>
            <h3 className={CARD_H3}>מערכות ייחוס</h3>
            <p className={CARD_LEAD}>
              אותו מקום יכול להיכתב בשיטות קואורדינטות שונות. החליפו שיטה ובחרו נקודה: המקום נשאר, והרשת, היחידות והמספרים משתנים.
            </p>
          </>
        }
      />
    </div>
  );
}

/* Screen 2 — ./reading-coordinates: point A's reading taken apart (geographic, UTM), the datum and the reference system, and a short check. */

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
