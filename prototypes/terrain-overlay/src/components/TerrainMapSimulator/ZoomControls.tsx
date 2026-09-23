interface ZoomControlsProps {
  k: number;
  min: number;
  max: number;
  loupe: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleLoupe: () => void;
}

/**
 * ZoomControls — פקדי הזום והלופה.
 * קיימים גם קיצורי מקלדת (`+`/`-`/`0`/`L`), אבל פקד גלוי הוא התנאי לכך
 * שמשתמש מגע ומשתמש שאינו יודע על הקיצורים יוכלו להתקרב בכלל.
 */
export default function ZoomControls({
  k,
  min,
  max,
  loupe,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleLoupe,
}: ZoomControlsProps) {
  return (
    <div className="tms-zoom" role="group" aria-label="זום ולופה">
      <button
        type="button"
        className="tms-btn tms-btn--icon tms-tap"
        onClick={onZoomOut}
        disabled={k <= min + 0.01}
        aria-label="התרחקות"
        title="התרחקות (−)"
      >
        −
      </button>
      <span className="tms-zoom__level" aria-hidden="true">
        {k.toFixed(1)}×
      </span>
      <button
        type="button"
        className="tms-btn tms-btn--icon tms-tap"
        onClick={onZoomIn}
        disabled={k >= max - 0.01}
        aria-label="התקרבות"
        title="התקרבות (+)"
      >
        +
      </button>
      <button
        type="button"
        className="tms-btn tms-btn--sm tms-tap"
        onClick={onReset}
        disabled={k <= min + 0.01}
        aria-label="התאמה למסך"
        title="התאמה למסך (0)"
      >
        התאם
      </button>
      <button
        type="button"
        className="tms-btn tms-btn--sm tms-tap"
        onClick={onToggleLoupe}
        aria-pressed={loupe}
        aria-label="לופה — תצ״א ומפה זה לצד זה תחת הסמן"
        title="לופה (L)"
      >
        לופה
      </button>
    </div>
  );
}
