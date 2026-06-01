import Link from 'next/link';

/**
 * Landing-page teaser for the two prototypes. Each card is just a
 * preview tile that links to the dedicated /prototypes/<id> page,
 * where the actual prototype is rendered full-bleed in an iframe.
 * No GitHub URLs, no inline embedding — clicks lead to focused pages.
 */

type Prototype = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  href: string;
};

const PROTOTYPES: Prototype[] = [
  {
    id: 'terrain-3d',
    title: 'סימולטור שטח תלת־ממדי',
    tagline: 'ניווט וחקירה במודל גובה אינטראקטיבי',
    description:
      'פרוטוטייפ ראשוני לסביבת לימוד תלת־ממדית של שטח. מאפשר להסתובב, להזיז את זווית הצפייה ולחקור את התבליט מכל זווית — כדי לתרגל קריאת מורפולוגיה לפני יציאה בפועל לשטח.',
    href: '/prototypes/terrain-3d',
  },
  {
    id: 'terrain-overlay',
    title: 'שכבות מידע על מפת שטח',
    tagline: 'הלבשת שכבות גיאו־מידע על מפה',
    description:
      'פרוטוטייפ ראשוני להצגת שכבות מידע (טופוגרפיה, תשתיות, איומים) על גבי מפת בסיס. מדגים את הרעיון של ניתוח מרחבי דרך הצלבת מספר שכבות שקופות בו־זמנית.',
    href: '/prototypes/terrain-overlay',
  },
];

export function PrototypesShowcase() {
  return (
    <section
      id="prototypes"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-t border-border-subtle"
      aria-labelledby="prototypes-heading"
    >
      <div className="mb-10 md:mb-12">
        <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent mb-2.5">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
          פרוטוטיפים · בדיקת היתכנות
        </div>
        <h2
          id="prototypes-heading"
          className="font-display font-bold text-2xl md:text-4xl text-balance leading-tight"
        >
          שני <span className="text-accent-hover">פרוטוטייפים ראשוניים</span> לבדיקה
        </h2>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {PROTOTYPES.map((p) => (
          <Link
            key={p.id}
            href={p.href}
            className="group surface-elevated rounded-2xl p-6 sm:p-8 flex flex-col transition-colors border border-border hover:border-accent"
          >
            <div className="inline-flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-accent mb-2.5">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              {p.tagline}
            </div>
            <h3 className="font-display font-bold text-xl sm:text-2xl text-balance leading-tight mb-3 text-accent-hover">
              {p.title}
            </h3>
            <p className="text-sm md:text-base text-fg leading-relaxed text-pretty mb-5">
              {p.description}
            </p>
            <div className="mt-auto pt-4 border-t border-border-subtle">
              <span className="inline-flex items-center px-4 py-2 rounded-md font-medium text-sm bg-accent text-bg-elevated group-hover:bg-accent-hover transition-colors">
                פתח את הפרוטוטייפ
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
