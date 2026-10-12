import { SurfaceCard } from '@/components/ui/SurfaceCard';

/* ─────────── קואורדינטות 1 — פתיחה: גיאודזיה · גופי ייחוס (deck slides 3–4, 6–7, 11–12) ───────────
   Option 1 of the 2026-10-12 brief: two always-visible illustrated definition
   cards — no tabs, tasks or reveals; the practice comes later in the scene.
   Geodesy at inline-start (visual right), reference bodies at inline-end.
   Copy, alt text, labels and captions are verbatim from
   design/docs/2026-10-12-coordinates-definitions-claude-prompt.txt.
   On desktop each card is a subgrid of the same five rows — heading, text,
   image, labels, caption — so the headings, the 3:2 image frames and the
   captions line up across the two cards while the text keeps its full length. */

const DIR = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/lessons/topic02/scene-coordinates/definitions`;

const CARD = 'p-6 lg:p-8 md:row-span-5 md:grid md:grid-rows-subgrid md:gap-y-0';
const TITLE = 'font-display font-bold leading-tight text-black text-base md:text-lg mb-3';
const BODY = 'text-base leading-relaxed text-black text-pretty';
const FIGURE = 'mt-5 md:row-span-3 md:grid md:grid-rows-subgrid md:gap-y-0';
const CAPTION = `${BODY} mt-3 border-t border-border-subtle pt-3`;

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
    <div className="mb-12 grid gap-6 md:grid-cols-2">
      <SurfaceCard as="article" className={CARD}>
        <h3 className={TITLE}>גיאודזיה – תורת המיפוי</h3>
        <div className="space-y-3">
          <p className={BODY}>
            <strong>גיאודזיה</strong> היא תחום מדעי העוסק במדידה ובתיאור של כדור הארץ — צורתו, ממדיו ושדה הכבידה שלו — ובקביעת מיקומן של נקודות ועצמים על
            פניו.
          </p>
          <p className={BODY}>
            בהקשר של מיפוי, הגיאודזיה מספקת את הבסיס למדידות ולתיאור מיקום באמצעות קואורדינטות, ביחס למערכת ייחוס מוגדרת. כך אפשר לקשר בין נקודה בשטח לבין
            מיקומה במפה.
          </p>
          <p className={BODY}>מקור השם: גיאו — אדמה; דזיה — חלוקה.</p>
        </div>
        <figure className={FIGURE}>
          <Illustration file="geodesy-field.webp" alt="מכשיר מדידה על חצובה ומפה טופוגרפית בשטח הררי, להמחשת מדידות לצורכי מיפוי וקביעת מיקום." />
          <figcaption className={`${CAPTION} md:row-start-3`}>דוגמה למדידה בשטח לצורכי מיפוי וקביעת מיקום.</figcaption>
        </figure>
      </SurfaceCard>

      <SurfaceCard as="article" className={CARD}>
        <h3 className={TITLE}>גופי ייחוס מרחביים</h3>
        <div className="space-y-3">
          <p className={BODY}>
            פני כדור הארץ מורכבים: יש בהם הרים, עמקים, יבשות ואוקיינוסים. כדי לתאר מיקום וגובה בצורה עקבית, משתמשים ב<strong>גופי ייחוס מרחביים</strong> —
            גופים או משטחים מוגדרים המשמשים בסיס למדידות ולחישובים.
          </p>
          <p className={BODY}>
            <strong>האליפסואיד</strong>, למשל, הוא גוף ייחוס מתמטי המתאר בקירוב את צורת כדור הארץ, ועליו אפשר להגדיר מערכת צירים ולבצע חישובי מיקום, מרחק
            וזווית. <strong>הגיאואיד</strong> משמש משטח ייחוס לגבהים מעל פני הים. את ההבדל ביניהם נלמד בהמשך.
          </p>
        </div>
        <figure className={FIGURE}>
          <Illustration file="earth-reference-body.webp" alt="דגם של כדור הארץ מימין ולצדו משמאל מודל חלק עם רשת קווים, המדגים אליפסואיד כגוף ייחוס מתמטי." />
          {/* The labels follow the artwork's own sides: Earth in its right half, the model in its left half (never mirrored). */}
          <div className="mt-3 grid grid-cols-2 gap-4 text-center">
            <span className="font-display text-base font-bold leading-snug text-black">כדור הארץ</span>
            <span className="font-display text-base font-bold leading-snug text-black">אליפסואיד — דוגמה לגוף ייחוס מתמטי</span>
          </div>
          <figcaption className={CAPTION}>איור להמחשה.</figcaption>
        </figure>
      </SurfaceCard>
    </div>
  );
}
