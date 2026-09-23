import { useEffect, useRef, useState } from 'react';

const STEPS = [
  {
    title: 'שתי שכבות של אותו שטח',
    text: 'למעלה תצלום אוויר אנכי (תצ״א), ומתחתיו מפה טופוגרפית של אותו שטח בדיוק. גררו את המחוון שבראש המפה כדי לעבור ביניהן ולראות איך כל דבר בשטח מיוצג במפה.',
  },
  {
    title: 'הנקודות הצהובות לחיצות',
    text: 'כל נקודה מסמנת צורת שטח שאותרה כאן ממודל גובה אמיתי. לחצו עליה — ייפתח כרטיס שמסביר איך מזהים אותה בתצ״א ואיך במפה. אפשר גם לבחור מהמקרא שמתחת למפה.',
  },
  {
    title: 'זום ולופה',
    text: 'מספרי הגובה במפה קטנים. השתמשו ב-+ ו-− או בצביטה כדי להתקרב, ובכפתור "לופה" כדי לראות תצ״א ומפה זה לצד זה בדיוק תחת הסמן.',
  },
  {
    title: 'ואז — תרגול',
    text: 'כשתרגישו בנוח, עברו למצב תרגול. תישאלו היכן נמצאת צורה, מהי הצורה המודגשת, ואיזו צורה מתאימה לחתימת קווי גובה נתונה. מקש ? מציג את כל קיצורי המקלדת.',
  },
];

interface OnboardingProps {
  onDone: () => void;
}

/**
 * Onboarding — הכוונה ראשונה.
 *
 * בלעדיה המשתמש נכנס למסך עם מפה, מחוון ושבע נקודות קטנות — בלי לדעת
 * שהנקודות לחיצות, שהמחוון מחליף שכבות, או מה בכלל המשימה שלו כאן.
 */
export default function Onboarding({ onDone }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    nextRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDone]);

  const last = step === STEPS.length - 1;

  return (
    <div className="tms-sheet" role="dialog" aria-modal="true" aria-label="הכוונה ראשונה">
      <div className="tms-tour">
        <p className="tms-tour__step">
          שלב {step + 1} מתוך {STEPS.length}
        </p>
        <h2 className="tms-tour__title">{STEPS[step].title}</h2>
        <p className="tms-tour__text">{STEPS[step].text}</p>
        <div className="tms-tour__actions">
          <div className="tms-tour__dots" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={'tms-tour__dot' + (i === step ? ' tms-tour__dot--on' : '')}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 'var(--tms-sp-2)' }}>
            <button type="button" className="tms-btn tms-btn--sm tms-btn--quiet" onClick={onDone}>
              דילוג
            </button>
            {step > 0 && (
              <button
                type="button"
                className="tms-btn tms-btn--sm"
                onClick={() => setStep((s) => s - 1)}
              >
                הקודם
              </button>
            )}
            <button
              type="button"
              ref={nextRef}
              className="tms-btn tms-btn--sm tms-btn--primary"
              onClick={() => (last ? onDone() : setStep((s) => s + 1))}
            >
              {last ? 'מתחילים' : 'הבא'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * הקיצורים מקובצים לפי מה שהם עושים ולא לפי סדר האלפבית: רשימה שטוחה של
 * שנים-עשר מקשים היא רשימה שאיש אינו זוכר ממנה דבר.
 */
const SHORTCUT_GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: 'בחירה וניווט',
    keys: [
      ['1 – 9', 'בחירת הצורה לפי מספרה במקרא'],
      ['← →', 'הזזת המחוון בין השכבות — או מעבר בין הצורות, כשהפוקוס על המפה'],
      ['Esc', 'ביטול הבחירה, סגירת חתך, או סגירת חלונית'],
    ],
  },
  {
    title: 'השוואה בין השכבות',
    keys: [
      ['A', 'השכבה התחתונה בלבד (תצ״א או הצללה)'],
      ['M', 'המפה הטופוגרפית בלבד'],
      ['C', 'מעבר בין מצבי ההשוואה: וילון · שקיפות · זה לצד זה · הצללה'],
    ],
  },
  {
    title: 'התבוננות',
    keys: [
      ['+ / −', 'התקרבות והתרחקות'],
      ['0', 'התאמה למסך'],
      ['L', 'הפעלת הלופה'],
      ['P', 'חתך גובה — של הצורה הנבחרת, או שרטוט קו חדש'],
      ['E', 'מצב "הצג הכול"'],
    ],
  },
  {
    title: 'עזרה',
    keys: [
      ['G', 'מילון מונחים'],
      ['?', 'החלונית הזו'],
    ],
  },
];

export function KeyboardHelp({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="tms-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="קיצורי מקלדת"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tms-sheet__panel">
        <div className="tms-sheet__head">
          <h2 className="tms-sheet__title">קיצורי מקלדת</h2>
          <button type="button" ref={closeRef} className="tms-btn tms-btn--sm" onClick={onClose}>
            סגירה
          </button>
        </div>
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="tms-sheet__subtitle">{group.title}</h3>
            <dl>
              {group.keys.map(([key, what]) => (
                <div key={key}>
                  <dt>
                    <span className="tms-kbd" dir="ltr">
                      {key}
                    </span>
                  </dt>
                  <dd>{what}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
