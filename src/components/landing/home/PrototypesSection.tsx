import Link from 'next/link';

/**
 * PrototypesSection — קישור לשני הפרוטוטיפים האינטראקטיביים, בתחתית דף
 * הבית החדש (design/mockup.png אינו כולל את הפס הזה — נוסף מעבר לספק,
 * בסגנון הטוקנים של Design 1: paper-card / olive-ink / ember).
 */

type Prototype = {
  id: string;
  title: string;
  tagline: string;
  href: string;
};

const PROTOTYPES: Prototype[] = [
  {
    id: 'terrain-3d',
    title: 'סימולטור שטח תלת־ממדי',
    tagline: 'ניווט וחקירה במודל גובה אינטראקטיבי',
    href: '/prototypes/terrain-3d/',
  },
  {
    id: 'terrain-overlay',
    title: 'שכבות מידע על מפת שטח',
    tagline: 'הלבשת שכבות גיאו־מידע על מפה',
    href: '/prototypes/terrain-overlay/',
  },
  {
    id: 'valley-crossing-3d',
    title: 'סימולטור ניתוח שטח — מעבר גיא',
    tagline: 'תרחיש מודרך: קרקע גבוהה, תצפית אויב, צוואר בקבוק וגשר',
    href: '/prototypes/valley-crossing-3d/',
  },
];

export function PrototypesSection() {
  return (
    <section id="prototypes" className="mb-4 mt-10">
      <div className="px-2">
        <span className="text-[22px] font-bold text-olive-ink">פרוטוטיפים לבדיקה</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3.5">
        {PROTOTYPES.map((p) => (
          <Link
            key={p.id}
            href={p.href}
            className="group flex flex-col rounded-[20px] bg-paper-card px-6 py-5 shadow-card-soft transition duration-150 ease-snap hover:-translate-y-0.5 hover:shadow-panel-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft"
          >
            <span className="text-[13px] font-semibold text-olive-muted">{p.tagline}</span>
            <h3 className="mt-1 text-[19px] font-bold leading-snug text-olive-ink group-hover:text-ember">
              {p.title}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
