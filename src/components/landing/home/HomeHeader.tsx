'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, RotateCcw, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resetCourseProgress, useCourseProgress } from '@/lib/course-progress';

/**
 * HomeHeader — כותרת פנימית של דף הבית (design/mockup.png, פס עליון).
 * מותג + שושנת רוחות בימין (inline-start), שני כפתורי שירות בשמאל (inline-end).
 * הכפתורים פותחים פופאובר מקומי: "התראות" — מצב ריק (אין מקור התראות);
 * "החשבון שלי" — פרופיל אורח + איפוס התקדמות (מנקה last-visit, באישור כפול).
 * סגירה ב-Escape או בלחיצה מחוץ.
 */

type Popover = 'bell' | 'account';

export function HomeHeader() {
  const [open, setOpen] = useState<Popover | null>(null);
  const menusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menusRef.current && !menusRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = (which: Popover) => setOpen((cur) => (cur === which ? null : which));

  return (
    <header className="relative z-10 flex items-start justify-between">
      {/* מותג — ילד ראשון = ימין ויזואלי ב-RTL */}
      <div className="flex items-center gap-4">
        <CompassRose className="size-16 shrink-0" />
        <div className="flex flex-col gap-1.5">
          <span className="text-[28px] font-extrabold leading-none text-olive-ink">
            גיאוגרפיה צבאית
          </span>
          <span className="text-[15px] font-medium leading-none text-olive-muted">
            למי שמבינים מרחב מנצחים
          </span>
        </div>
      </div>

      {/* כפתורי שירות — שמאל ויזואלי; "התראות" ראשון = פנימי יותר, כמו במוקאפ */}
      <div ref={menusRef} className="flex items-start gap-3">
        <div className="relative">
          <UtilityButton
            icon={<Bell className="size-6" strokeWidth={1.8} />}
            label="התראות"
            expanded={open === 'bell'}
            onClick={() => toggle('bell')}
          />
          {open === 'bell' && <NotificationsPopover />}
        </div>
        <div className="relative">
          <UtilityButton
            icon={<User className="size-6" strokeWidth={1.8} />}
            label="החשבון שלי"
            expanded={open === 'account'}
            onClick={() => toggle('account')}
          />
          {open === 'account' && <AccountPopover onClose={() => setOpen(null)} />}
        </div>
      </div>
    </header>
  );
}

function UtilityButton({
  icon,
  label,
  expanded,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={expanded}
      onClick={onClick}
      className={cn(
        'flex h-[98px] w-[96px] flex-col items-center justify-center gap-2.5 rounded-3xl bg-paper-card text-olive-ink shadow-pill-soft transition duration-150 ease-snap hover:bg-paper-bright active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft focus-visible:ring-offset-2 focus-visible:ring-offset-paper-page',
        expanded && 'bg-paper-bright',
      )}
    >
      {icon}
      <span className="whitespace-nowrap text-[13px] font-semibold leading-none">{label}</span>
    </button>
  );
}

/** מעטפת פופאובר משותפת — מיושר לקצה ה-inline-end של הכפתור, מתחתיו */
function PopoverShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      className="absolute end-0 top-full z-20 mt-2 w-64 rounded-2xl border border-tanline bg-paper-bright p-4 text-start shadow-panel-soft"
    >
      {children}
    </div>
  );
}

function NotificationsPopover() {
  return (
    <PopoverShell>
      {/* מצב ריק — אין עדיין מקור התראות אמיתי */}
      <div className="flex flex-col items-center gap-2 py-3 text-center">
        <Bell className="size-7 text-olive-muted" strokeWidth={1.6} />
        <span className="text-[15px] font-bold text-olive-ink">אין התראות חדשות</span>
        <span className="text-[13px] leading-snug text-olive-muted">
          עדכונים על שיעורים ותרגולים יופיעו כאן
        </span>
      </div>
    </PopoverShell>
  );
}

function AccountPopover({ onClose }: { onClose: () => void }) {
  const progress = useCourseProgress();
  const [confirming, setConfirming] = useState(false);

  return (
    <PopoverShell>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper-card text-olive-ink shadow-card-soft">
          <User className="size-5" strokeWidth={1.8} />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold text-olive-ink">אורח·ת</span>
          <span className="text-[13px] leading-snug text-olive-muted">
            ההתקדמות נשמרת במכשיר זה
          </span>
        </div>
      </div>

      <div className="my-3 h-px bg-tanline/60" />

      {confirming ? (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold leading-snug text-olive-ink">
            לאפס את ההתקדמות במכשיר זה?
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                resetCourseProgress();
                setConfirming(false);
                onClose();
              }}
              className="flex h-8 flex-1 items-center justify-center rounded-lg bg-cta-ember text-[13px] font-bold text-white transition duration-150 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft"
            >
              איפוס
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex h-8 flex-1 items-center justify-center rounded-lg border border-tanline text-[13px] font-bold text-olive-ink transition duration-150 hover:bg-paper-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft"
            >
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!progress.started}
          onClick={() => setConfirming(true)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[14px] font-semibold text-olive-ink transition duration-150 hover:bg-paper-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-soft disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <RotateCcw className="size-4 text-olive-muted" strokeWidth={2} />
          <span>איפוס התקדמות</span>
        </button>
      )}
    </PopoverShell>
  );
}

/** שושנת רוחות זהובה-זיתית — קירוב וקטורי ללוגו במוקאפ. לא מתהפכת ב-RTL. */
function CompassRose({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="-50 -50 100 100" className={className}>
      <circle r="46" fill="none" stroke="#8A6F4D" strokeWidth="3" />
      <circle r="39" fill="none" stroke="#8A6F4D" strokeWidth="1" opacity="0.55" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="0"
          y1="-46"
          x2="0"
          y2="-41"
          stroke="#8A6F4D"
          strokeWidth="1.5"
          transform={`rotate(${deg})`}
        />
      ))}
      {/* חודים ראשיים */}
      {[0, 90, 180, 270].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path d="M 0 -36 L 5.5 -4 L 0 0 Z" fill="#6B5A3E" />
          <path d="M 0 -36 L -5.5 -4 L 0 0 Z" fill="#B39A6B" />
        </g>
      ))}
      {/* חודים משניים */}
      {[45, 135, 225, 315].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path d="M 0 -22 L 4 -3 L 0 0 Z" fill="#8A6F4D" />
          <path d="M 0 -22 L -4 -3 L 0 0 Z" fill="#C9B48C" />
        </g>
      ))}
      <circle r="3.5" fill="#38432E" />
      <circle r="1.4" fill="#F3E9DC" />
    </svg>
  );
}
