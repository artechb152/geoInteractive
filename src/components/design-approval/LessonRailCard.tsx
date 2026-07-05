/**
 * LessonRailCard — כרטיס שיעור יחיד במסילת הבית (design-lock §3.5).
 *
 * מבנה (מלמעלה): שורת-על [אייקון-מצב בפינת start · מספר NN מונו] →
 *   AssetSlot מיניאטורה 1:1 (LESSON-NN-CARD; חסר ⇒ MissingAssetPlaceholder) →
 *   כותרת shortTitle → שורת התקדמות [שבר מונו · מסילה + מילוי].
 *
 * מצבים (§3.5, §3.11):
 *   - active   : border-accent shadow-glow, כותרת text-accent, אייקון accent.
 *   - completed: אייקון ✓ בעיגול מרווה (brand-dark), מילוי התקדמות מלא.
 *   - future   : מצב שקט ניטרלי, אייקון fg-dim.
 *
 * הכרטיס כולו <a> יחיד; במוקאפ href="#" + aria-disabled (אין ניווט אמיתי).
 * שבר ההתקדמות = סצנות שהושלמו / סך הסצנות האמיתי של אותו topic (מתוך SCENES).
 */
import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssetSlot } from './AssetSlot';
import { InertLink } from './InertLink';

export type LessonCardState = 'active' | 'completed' | 'future';

type LessonRailCardProps = {
  number: number;
  shortTitle: string;
  /** אייקון נושאי מ-lucide (ממופה מ-lesson.hero.icon בקורא). */
  Icon: LucideIcon;
  state: LessonCardState;
  /** סצנות שהושלמו וסך הסצנות (שבר התקדמות אמיתי). */
  done: number;
  total: number;
  assetId: string;
  src: string;
  alt: string;
};

export function LessonRailCard({
  number,
  shortTitle,
  Icon,
  state,
  done,
  total,
  assetId,
  src,
  alt,
}: LessonRailCardProps) {
  const nn = String(number).padStart(2, '0');
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isActive = state === 'active';
  const isCompleted = state === 'completed';

  return (
    <InertLink
      aria-current={isActive ? 'step' : undefined}
      className={cn(
        'group relative flex w-56 shrink-0 snap-start flex-col gap-3 rounded-2xl border bg-bg-elevated p-4 transition-colors sm:w-60',
        isActive
          ? 'border-accent shadow-glow'
          : 'border-border hover:border-accent',
      )}
    >
      {/* שורת-על: אייקון-מצב (start = ימין) + מספר */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'flex size-8 items-center justify-center rounded-full border',
            isCompleted && 'border-brand/40 bg-brand/10 text-brand-dark',
            isActive && 'border-accent/40 bg-accent/10 text-accent',
            state === 'future' && 'border-border bg-bg text-fg-dim',
          )}
        >
          {isCompleted ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Icon className="size-4" aria-hidden />
          )}
        </span>
        <span className="font-mono text-2xl leading-none text-fg-dim">{nn}</span>
      </div>

      {/* מיניאטורת נכס — חריץ LESSON-NN-CARD (1:1) */}
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg">
        <AssetSlot assetId={assetId} src={src} alt={alt} aspect="1/1" />
      </div>

      {/* כותרת */}
      <h3
        className={cn(
          'font-display text-sm font-bold leading-snug sm:text-base',
          isActive ? 'text-accent' : 'text-fg',
        )}
      >
        {shortTitle}
      </h3>

      {/* שורת התקדמות */}
      <div className="mt-auto flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-fg-dim">
            <span dir="ltr">{done}/{total}</span>
          </span>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-dark">
              <Check className="size-3" aria-hidden />
              הושלם
            </span>
          )}
          {isActive && (
            <span className="text-[11px] font-medium text-accent">בלימוד</span>
          )}
        </div>
        <div
          className="h-1 overflow-hidden rounded-full bg-bg-accent"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <div
            className={cn('h-full rounded-full', isCompleted ? 'bg-brand' : 'bg-accent')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </InertLink>
  );
}
