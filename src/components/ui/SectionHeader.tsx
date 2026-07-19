import { cn } from '@/lib/utils';

/**
 * SectionHeader — כותרת מדור אחידה בשפת דף הבית (design lock).
 *
 * eyebrow (מרווה כהה, tracking רחב, נקודת ember) → כותרת כבדה בדיו זית →
 * קו-פעולה כתום קצר (אופציונלי) → שורת intro רכה.
 * מחליף את הדפוס הידני שחוזר ב-overview ובפאנלים — לא לשכפל אותו יותר.
 */
export function SectionHeader({
  eyebrow,
  title,
  intro,
  bar = false,
  id,
  as: Tag = 'h2',
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  /** קו-פעולה כתום קצר מתחת לכותרת */
  bar?: boolean;
  /** id לכותרת — עבור aria-labelledby של ה-section העוטף */
  id?: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  return (
    <header className={className}>
      {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
      <Tag
        id={id}
        className={cn(
          'font-display font-bold tracking-tight text-fg',
          eyebrow && 'mt-1',
          Tag === 'h1' && 'text-3xl font-extrabold sm:text-4xl',
          Tag === 'h2' && 'text-2xl sm:text-3xl',
          Tag === 'h3' && 'text-xl',
        )}
      >
        {title}
      </Tag>
      {bar && <span aria-hidden className="mt-3 block h-1.5 w-14 rounded-full bg-accent" />}
      {intro && (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-fg-muted md:text-base text-pretty">
          {intro}
        </p>
      )}
    </header>
  );
}
