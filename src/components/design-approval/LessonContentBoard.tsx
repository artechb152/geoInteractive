/**
 * LessonContentBoard — לוח תוכן השיעור (design-lock §3.6.2).
 *
 * תוכן אמיתי מ-PlanningScene.tsx (topic-03, step 03.2) — לא קירוב מהרפרנס
 * (design-lock §1.8). כרטיס העקרונות משתמש ברכיב Icon המשותף — אין אייקונים חדשים.
 */
import { Icon, type IconName } from '@/components/Icon';

const PRINCIPLES: { label: string; icon: IconName }[] = [
  { label: 'כיוון (אזימוט)', icon: 'compass' },
  { label: 'מרחק (במטרים)', icon: 'crosshair' },
  { label: 'נקודת ייחוס ברורה', icon: 'flag' },
  { label: 'תיאור מדויק וסדר פעולות', icon: 'check' },
];

export function LessonContentBoard() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <span className="chip w-fit border-transparent bg-accent font-mono text-bg-elevated">03.2</span>
        <h2 className="font-display text-2xl font-bold leading-tight text-balance sm:text-3xl">
          לא רק למתוח קו: איך בונים <span className="text-accent-hover">סיפור דרך</span> שיעבוד לכם
          גם בחושך
        </h2>
        <p className="max-w-2xl text-base leading-relaxed text-fg-muted">
          סיפור דרך טוב הופך קו על מפה להוראות פעולה: כיוון, מרחק, נקודות ייחוס וסדר תנועה ברור.
        </p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg p-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {PRINCIPLES.map((p) => (
            <div key={p.label} className="flex flex-col items-center gap-2 text-center">
              <span className="flex size-9 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Icon name={p.icon} size={18} />
              </span>
              <span className="text-xs leading-snug text-fg-muted">{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
