import type { SignatureKind } from '../../data/types';

interface Props {
  kind: SignatureKind;
  /** גרסה מוקטנת לשימוש כאייקון בתוך שבב המקרא. */
  compact?: boolean;
  /** תווית מוקראת — כשהתרשים נושא מידע ולא רק מקשט. */
  label?: string;
}

/**
 * ContourSignature — תרשים-המחשה אידיאלי ("ספר לימוד") של חתימת קווי הגובה
 * של הצורה, המוצג לצד הדוגמה האמיתית והרועשת שעל המפה. אותו רכיב משמש גם
 * כאייקון במקרא, כך שהלומד רואה את הדפוס עוד לפני שלחץ.
 */
export default function ContourSignature({ kind, compact = false, label }: Props) {
  return (
    <svg
      className={'tms-sig' + (compact ? ' tms-sig--chip' : '')}
      viewBox="0 0 100 74"
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <g
        className="tms-sig__lines"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={compact ? 4 : undefined}
      >
        {render(kind, compact)}
      </g>
    </svg>
  );
}

const arrowDown = (x: number, y: number) => (
  <path className="tms-sig__arrow" d={`M${x},${y} l0,12 M${x - 4},${y + 7} l4,5 4,-5`} />
);
const arrowUp = (x: number, y: number) => (
  <path className="tms-sig__arrow" d={`M${x},${y + 12} l0,-12 M${x - 4},${y + 5} l4,-5 4,5`} />
);

function render(kind: SignatureKind, compact: boolean) {
  switch (kind) {
    case 'rings': // כיפה — טבעות קונצנטריות
      return (
        <>
          <ellipse cx="50" cy="37" rx="38" ry="27" />
          <ellipse cx="50" cy="37" rx="25" ry="17" />
          <ellipse className="tms-sig__hot" cx="50" cy="37" rx="12" ry="8" />
        </>
      );
    case 'crest': // קו רכס — ציר דרך קודקודי הבליטות
      return (
        <>
          <path d="M6,52 Q50,20 94,52" />
          <path d="M6,64 Q50,34 94,64" />
          <path className="tms-sig__hot" d="M14,18 Q50,8 86,18" strokeDasharray="4 4" />
          <path className="tms-sig__hot" d="M50,8 L50,60" />
        </>
      );
    case 'bowtie': // אוכף — שתי מערכות נפגשות (מותן)
      return (
        <>
          <path d="M8,8 Q50,34 92,8" />
          <path d="M8,20 Q50,40 92,20" />
          <path d="M8,66 Q50,40 92,66" />
          <path d="M8,54 Q50,34 92,54" />
          <circle className="tms-sig__hot" cx="50" cy="37" r="3.5" />
        </>
      );
    case 'parallel': // מדרון — קווים מקבילים + חץ מורד
      return (
        <>
          <path d="M10,16 L82,12" />
          <path d="M10,30 L82,26" />
          <path d="M10,44 L82,40" />
          <path d="M10,58 L82,54" />
          {!compact && arrowDown(92, 18)}
        </>
      );
    case 'u': // שלוחה — U המצביע כלפי מטה (מורד)
      return (
        <>
          <path d="M14,14 Q50,64 86,14" />
          <path d="M24,12 Q50,50 76,12" />
          <path className="tms-sig__hot" d="M34,10 Q50,38 66,10" />
          {!compact && arrowDown(50, 50)}
        </>
      );
    case 'v': // גיא — V המצביע כלפי מעלה (מעלה)
      return (
        <>
          <path d="M14,60 Q50,10 86,60" />
          <path d="M24,62 Q50,24 76,62" />
          <path className="tms-sig__hot" d="M34,64 Q50,36 66,64" />
          {!compact && arrowUp(50, 12)}
        </>
      );
    case 'cliff': // מצוק — הקווים מתלכדים כמעט לקו אחד
      return (
        <>
          <path d="M8,10 L92,8" />
          <path d="M8,22 L92,20" />
          {/* הצפיפות היא הסימן: ארבעה קווים בתוך שלושה פיקסלים */}
          <path className="tms-sig__hot" d="M8,36 L92,34" />
          <path className="tms-sig__hot" d="M8,39 L92,37" />
          <path className="tms-sig__hot" d="M8,42 L92,40" />
          <path className="tms-sig__hot" d="M8,45 L92,43" />
          <path d="M8,58 L92,56" />
          <path d="M8,68 L92,66" />
        </>
      );

    case 'depression': // קער סגור — טבעות עם שנצים כלפי פנים
      return (
        <>
          <ellipse cx="50" cy="37" rx="38" ry="27" />
          <ellipse className="tms-sig__hot" cx="50" cy="37" rx="22" ry="15" />
          {/* השנצים פונים פנימה — ההפך המדויק מכיפה */}
          <path className="tms-sig__hot" d="M50,22 l0,6 M50,52 l0,-6 M28,37 l6,0 M72,37 l-6,0" />
        </>
      );

    case 'flat': // מישור — קו בודד ושטח ריק
      return (
        <>
          <path d="M8,50 Q50,44 92,50" strokeDasharray={compact ? undefined : '1 0'} />
          {!compact && (
            <text className="tms-sig__num" x="50" y="28" textAnchor="middle">
              ללא קווים
            </text>
          )}
        </>
      );

    case 'shelf': // מדף / כתף — הקווים מתרווחים בפתאומיות בתוך מדרון צפוף
      return (
        <>
          <path d="M8,8 L92,6" />
          <path d="M8,15 L92,13" />
          <path d="M8,22 L92,20" />
          {/* המרווח הגדול הוא המדף עצמו */}
          <path className="tms-sig__hot" d="M8,36 L92,34" />
          <path className="tms-sig__hot" d="M8,52 L92,50" />
          <path d="M8,60 L92,58" />
          <path d="M8,67 L92,65" />
        </>
      );

    case 'neck': // צוואר — היצרות חדה בין שתי מערכות סגורות
      return (
        <>
          <path d="M6,6 Q26,30 6,54" />
          <path d="M18,4 Q40,32 18,60" />
          <path d="M94,6 Q74,30 94,54" />
          <path d="M82,4 Q60,32 82,60" />
          <path className="tms-sig__hot" d="M40,32 L60,32" strokeDasharray="3 3" />
          <circle className="tms-sig__hot" cx="50" cy="32" r="3" />
        </>
      );

    case 'basin': // בקעה — רצפה רחבה ושטוחה בין שני מדרונות
      return (
        <>
          <path d="M6,6 Q22,28 20,42" />
          <path d="M20,6 Q32,28 32,42" />
          <path d="M94,6 Q78,28 80,42" />
          <path d="M80,6 Q68,28 68,42" />
          <path className="tms-sig__hot" d="M32,50 L68,50" />
          {!compact && (
            <text className="tms-sig__num" x="50" y="68" textAnchor="middle">
              רצפה שטוחה
            </text>
          )}
        </>
      );

    case 'contours': // קווי גובה — מקבילים + קו מדד מודגש עם מספר
    default:
      return (
        <>
          <path d="M8,14 L92,12" />
          <path className="tms-sig__index" d="M8,30 L92,28" />
          <path d="M8,46 L92,44" />
          <path d="M8,62 L92,60" />
          {!compact && (
            <text className="tms-sig__num" x="50" y="26" textAnchor="middle">
              500
            </text>
          )}
        </>
      );
  }
}
