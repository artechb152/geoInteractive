'use client';

import { useEffect, useId, useRef } from 'react';
import { ArrowLeft, Check, Circle, MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CheckState } from './replayRun';

export const WALKTHROUGH_STORAGE_KEY = 'geo9900:topic06:position-walkthrough:v1';

export function walkthroughStep(check: CheckState | null, fixed: boolean) {
  if (fixed) return 6;
  if (!check || check.matched.length === 0) return check?.pending ? 2 : 1;
  if (check.matched.length === 1) return check.pending ? 4 : 3;
  return 5;
}

export function ReplayWalkthroughIntro({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const uid = useId();
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      dir="rtl"
      aria-labelledby={`${uid}-title`}
      aria-describedby={`${uid}-intro`}
      onCancel={(e) => { e.preventDefault(); onSkip(); }}
      className="m-auto w-full max-w-xl rounded-2xl border border-border bg-bg-elevated p-6 text-black shadow-elevated backdrop:bg-black/40"
      data-walkthrough-intro
    >
      <h3 id={`${uid}-title`} className="font-display text-xl font-bold leading-tight text-black">איך מאמתים מיקום? שני סימנים, כל סימן פעמיים</h3>
      <p id={`${uid}-intro`} className="mt-3 text-base leading-relaxed text-black">
        בוחרים סימן בתלת־ממד, ואז בוחרים את <strong>אותו סימן במפה</strong>. חוזרים על הפעולה עם סימן שני. בסך הכול: ארבע בחירות, שיוצרות שתי התאמות.
      </p>
      <ol className="mt-4 space-y-3" aria-label="שתי ההתאמות שנבצע יחד">
        {['הסימן הראשון: האוכף', 'הסימן השני: ערוץ הנחל'].map((name, i) => (
          <li key={name} className="flex items-center gap-3 rounded-xl border border-border bg-bg-accent p-3">
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-brand-dark bg-brand-dark font-bold text-bg-elevated">{i + 1}</span>
            <div>
              <p className="font-display text-base font-bold leading-tight text-black">{name}</p>
              <p className="mt-1 flex items-center gap-2 text-base leading-relaxed text-black">בחירה בשטח <ArrowLeft className="size-4" aria-hidden /> בחירה של אותו סימן במפה</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-base leading-relaxed text-black">נתרגל מתחנת הפתיחה, על השטח והמפה עצמם. ההדרכה תסמן בכל פעם איפה ללחוץ, ותתקדם אחרי שתבצעו את הפעולה.</p>
      <div className="mt-5 flex items-center gap-3">
        <button type="button" autoFocus onClick={onStart} className="btn-primary h-12 text-base" data-guide-start>נתחיל יחד</button>
        <button type="button" onClick={onSkip} className="btn-ghost h-12 text-base" data-guide-skip>דילוג על ההדרכה</button>
      </div>
    </dialog>
  );
}

const COPY = [
  { title: 'שלב 1 מתוך 4: בחרו את האוכף בשטח', detail: 'בתלת־ממד שמימין לחצו על האוכף המסומן בכתום — השקע שבין שתי הפסגות. אחר כך נמצא את אותו אוכף במפה.' },
  { title: 'שלב 2 מתוך 4: מצאו את אותו אוכף במפה', detail: 'עברו למפה שמשמאל ולחצו על האוכף. רק אחרי שתי הבחירות — בשטח ובמפה — תושלם ההתאמה הראשונה.' },
  { title: 'שלב 3 מתוך 4: חוזרים לשטח ובוחרים סימן שני', detail: 'ההתאמה הראשונה הושלמה! עכשיו לחצו בתלת־ממד על ערוץ הנחל המסומן בכתום. סימן אחד אינו מספיק לאימות.' },
  { title: 'שלב 4 מתוך 4: מצאו את ערוץ הנחל גם במפה', detail: 'עברו שוב למפה שמשמאל ולחצו על ערוץ הנחל. גם הסימן השני צריך להיבחר פעמיים: בשטח ובמפה.' },
  { title: 'ארבע בחירות, שתי התאמות — עכשיו מאמתים', detail: 'בחרתם שני סימנים, כל אחד גם בשטח וגם במפה. לחצו למטה על „אימות המיקום” כדי לבדוק היכן הראיות נפגשות.' },
  { title: 'הצלחתם! שתי התאמות אימתו את המיקום', detail: 'כך עובדים: סימן בשטח ← אותו סימן במפה, ואז סימן נוסף. בהמשך אפשר לשלב גם סימן עם מרחק שנספר. כעת אפשר להמשיך לניווט.' },
];

export function ReplayWalkthroughCoach({ check, fixed, note, onSkip }: { check: CheckState | null; fixed: boolean; note: string; onSkip: () => void }) {
  const step = walkthroughStep(check, fixed);
  const copy = COPY[step - 1];
  return (
    <div className="mt-3 grid h-[136px] grid-cols-[minmax(0,1fr)_420px] items-center gap-4 rounded-xl border border-brand/45 bg-bg-accent p-3" data-walkthrough-coach data-guide-step={step}>
      <div role="status" aria-live="polite" aria-atomic="true">
        <h5 className="font-display text-base font-bold leading-tight text-black md:text-lg">{copy.title}</h5>
        <p className="mt-2 text-base leading-relaxed text-black">{note || copy.detail}</p>
      </div>
      <div>
        <ol className="space-y-2" aria-label="התקדמות: כל סימן בשטח ובמפה">
          {(['saddle', 'stream'] as const).map((sign, i) => {
            const matched = check?.matched.includes(sign) || fixed;
            const inView = matched || check?.pending === sign;
            return (
              <li key={sign} className="grid grid-cols-[minmax(0,1fr)_88px_88px] items-center gap-2 text-base text-black" data-guide-pair={i + 1} data-complete={!!matched}>
                <strong className="font-bold">{i + 1}. {sign === 'saddle' ? 'האוכף' : 'ערוץ הנחל'}</strong>
                <PairStatus label="בשטח" done={!!inView} active={step === i * 2 + 1} />
                <PairStatus label="במפה" done={!!matched} active={step === i * 2 + 2} />
              </li>
            );
          })}
        </ol>
        {!fixed && <button type="button" className="btn-ghost mt-2 h-10 px-2 text-base" onClick={onSkip} data-guide-skip>דילוג על ההדרכה</button>}
      </div>
    </div>
  );
}

function PairStatus({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  const Icon = done ? Check : active ? MousePointer2 : Circle;
  return (
    <span className={cn('flex items-center gap-1.5', active && 'font-bold')}>
      <Icon className={cn('size-4 shrink-0', active ? 'text-accent' : done ? 'text-brand-dark' : 'text-fg-muted')} aria-hidden />
      {label}<span className="sr-only">{done ? ' — הושלם' : active ? ' — עכשיו' : ' — בהמשך'}</span>
    </span>
  );
}
