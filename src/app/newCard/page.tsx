import type { LucideIcon } from 'lucide-react';
import { MapPin, Mountain, Snowflake, Waves } from 'lucide-react';

type StoryCard = {
  eyebrow: string;
  title: string;
  body: string;
  icon: LucideIcon;
};

const cards: StoryCard[] = [
  {
    eyebrow: 'בריטניה · לפני 200 שנה',
    title: '32 ק״מ של מים ששינו את מהלך ההיסטוריה',
    body: 'זהו טקסט placeholder קצר שממחיש כיצד ייראה התוכן בכרטיס. כאן אפשר לשלב סיפור, עובדה מעניינת או הסבר בן כמה משפטים.',
    icon: Waves,
  },
  {
    eyebrow: 'אירופה · חורף 1812',
    title: 'המרחק והאקלים חזקים לפעמים מכל צבא',
    body: 'כאן מופיע placeholder נוסף, באורך מעט שונה, כדי לבדוק שהכרטיסים נשארים מאוזנים גם כשהתוכן אינו זהה לחלוטין.',
    icon: Snowflake,
  },
  {
    eyebrow: 'מרכז אירופה · המאה ה־20',
    title: 'מדינה קטנה שהשטח הפך למבצר טבעי',
    body: 'הרים, עמקים ומעברים צרים משפיעים על תנועה ועל קבלת החלטות. הטקסט הזה זמני ויוחלף בהמשך בתוכן הסופי.',
    icon: Mountain,
  },
  {
    eyebrow: 'אזור השרון · ישראל',
    title: 'רצועה צרה שמרכזת בתוכה עולם שלם',
    body: 'עוד פסקת placeholder המדגימה כרטיס עם כותרת ברורה וטקסט קריא. המבנה נשאר קבוע, ורק התוכן והאייקון משתנים.',
    icon: MapPin,
  },
];

function StoryCard({ eyebrow, title, body, icon: Icon }: StoryCard) {
  return (
    <article className="rounded-2xl border border-tanline-contour/70 bg-paper-bright/75 px-6 py-7 shadow-card-soft sm:px-8 sm:py-8">
      <div className="flex items-start gap-5 sm:gap-7">
        <div className="min-w-0 flex-1">
          <p className="mb-3 text-base font-bold text-olive-ink [word-spacing:-0.03em] sm:text-lg">
            {eyebrow}
          </p>
          <h2 className="max-w-xl text-balance font-display text-2xl font-bold leading-snug text-olive-ink sm:text-3xl">
            {title}
          </h2>
          <div aria-hidden="true" className="mt-4 h-0.5 w-9 rounded-full bg-ember-deep" />
        </div>

        <Icon
          aria-hidden="true"
          className="mt-8 size-14 shrink-0 text-olive-ink sm:size-16"
          strokeWidth={1.6}
        />
      </div>

      <p className="mt-4 text-pretty text-base leading-8 text-olive-ink sm:text-lg sm:leading-9">{body}</p>
    </article>
  );
}

export const metadata = {
  title: 'עיצוב כרטיסיות · גיאוגרפיה צבאית',
};

export default function NewCardPage() {
  return (
    <main className="relative isolate flex-1 overflow-hidden bg-paper-page px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(circle_at_center,rgba(201,165,107,0.18)_0.7px,transparent_0.8px)] [background-size:5px_5px]"
      />

      <div className="mx-auto max-w-7xl">
        <header className="mb-9 flex items-center gap-4 sm:mb-11 sm:gap-7">
          <div aria-hidden="true" className="h-px flex-1 bg-tanline-contour/80" />
          <span aria-hidden="true" className="size-3 rotate-45 border border-tanline-contour bg-paper-page" />
          <h1 className="shrink-0 text-center font-display text-2xl font-bold text-olive-ink sm:text-4xl">
            ארבעה סיפורים קצרים מהשטח
          </h1>
          <span aria-hidden="true" className="size-3 rotate-45 border border-tanline-contour bg-paper-page" />
          <div aria-hidden="true" className="h-px flex-1 bg-tanline-contour/80" />
        </header>

        <section aria-label="סיפורים מהשטח" className="grid gap-5 md:grid-cols-2">
          {cards.map((card) => (
            <StoryCard key={card.title} {...card} />
          ))}
        </section>
      </div>
    </main>
  );
}
