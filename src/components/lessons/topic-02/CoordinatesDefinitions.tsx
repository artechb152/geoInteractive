import { SurfaceCard } from '@/components/ui/SurfaceCard';

/* ─────────── קואורדינטות 1 — פתיחה: גיאודזיה · גופי ייחוס (deck slides 3–4, 6–7, 11–12) ───────────
   Option 1 of the 2026-10-12 brief: two always-visible illustrated definition
   cards — no tabs, tasks or reveals; the practice comes later in the scene.
   Since 2026-10-19 the cards are full-width rows, one under the other: text at
   inline-start (visual right), the illustration at inline-end, in a column of the
   same width in both cards so the two images line up. Copy condensed from
   design/docs/2026-10-12-coordinates-definitions-claude-prompt.txt; the surface
   list and the ellipsoid–geoid comparison are left to the next screen, which
   opens with them. Each image carries one label line naming what it shows. */

const DIR = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/scene-coordinates/definitions`;

const CARD = 'p-6 lg:p-8 md:grid md:grid-cols-[minmax(0,1fr)_22rem] md:items-center md:gap-x-10';
const TITLE = 'font-display font-bold leading-tight text-black text-base md:text-lg mb-3';
const BODY = 'text-base leading-relaxed text-black text-pretty';
const LABEL = 'font-display text-base font-bold leading-snug text-black';

function Illustration({ file, alt }: { file: string; alt: string }) {
  return (
    <div className="aspect-[3/2] overflow-hidden rounded-xl bg-bg-card">
      {/* eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized */}
      <img src={`${DIR}/${file}`} alt={alt} width={1536} height={1024} decoding="async" draggable={false} className="size-full object-contain" />
    </div>
  );
}

export function CoordinatesDefinitions() {
  return (
    <div className="mb-12 grid gap-6">
      <SurfaceCard as="article" className={CARD}>
        <div>
          <h3 className={TITLE}>גיאודזיה – תורת המיפוי</h3>
          <div className="space-y-3">
            <p className={BODY}>
              <strong>גיאודזיה</strong> (גיאו: אדמה; דזיה: חלוקה) היא תחום מדעי שמודד ומתאר את כדור הארץ – צורתו, ממדיו ושדה הכבידה שלו – וקובע את מיקומן
              של נקודות על פניו.
            </p>
            <p className={BODY}>
              במיפוי, הגיאודזיה מספקת את הבסיס לתיאור מיקום בקואורדינטות ביחס למערכת ייחוס מוגדרת. כך מקשרים בין נקודה בשטח לבין מיקומה במפה.
            </p>
          </div>
        </div>
        <figure className="mt-5 md:mt-0">
          <Illustration file="geodesy-field.webp" alt="מכשיר מדידה על חצובה ומפה טופוגרפית בשטח הררי, להמחשת מדידות לצורכי מיפוי וקביעת מיקום." />
          <figcaption className={`${LABEL} mt-3 text-center`}>מהמדידה בשטח – למיקום במפה</figcaption>
        </figure>
      </SurfaceCard>

      <SurfaceCard as="article" className={CARD}>
        <div>
          <h3 className={TITLE}>גופי ייחוס מרחביים</h3>
          <div className="space-y-3">
            <p className={BODY}>
              פני כדור הארץ אינם אחידים, ולכן כדי לתאר מיקום וגובה באופן עקבי משתמשים ב<strong>גופי ייחוס מרחביים</strong> – גופים או משטחים מוגדרים שמשמשים
              בסיס למדידות ולחישובים.
            </p>
            <p className={BODY}>
              <strong>האליפסואיד</strong>, למשל, הוא גוף ייחוס מתמטי שמתאר בקירוב את צורת כדור הארץ; עליו מגדירים מערכת צירים ומחשבים מיקום, מרחק וזווית.{' '}
              <strong>הגיאואיד</strong> הוא משטח הייחוס לגבהים מעל פני הים.
            </p>
          </div>
        </div>
        <figure className="mt-5 md:mt-0">
          <Illustration file="earth-reference-body.webp" alt="דגם של כדור הארץ מימין ולצדו משמאל מודל חלק עם רשת קווים, המדגים אליפסואיד כגוף ייחוס מתמטי." />
          {/* The labels follow the artwork's own sides: Earth in its right half, the model in its left half (never mirrored). */}
          <figcaption className={`${LABEL} mt-3 grid grid-cols-2 gap-4 text-center`}>
            <span>כדור הארץ</span>
            <span>אליפסואיד</span>
          </figcaption>
        </figure>
      </SurfaceCard>
    </div>
  );
}
