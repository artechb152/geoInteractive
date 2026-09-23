import type { TerrainArea } from '../../data/types';

interface LoupeProps {
  area: TerrainArea;
  /** מרכז הלופה בפיקסלים, יחסית לפינת המרובע. */
  at: { x: number; y: number };
  /** גודל המרובע בפיקסלים. */
  size: number;
  /** רמת הזום הנוכחית של המפה. */
  k: number;
  /** היסט התצוגה בפיקסלים. */
  offset: { x: number; y: number };
  diameter?: number;
  magnify?: number;
}

/**
 * Loupe — עדשת הגדלה שמציגה את **שתי** השכבות בו-זמנית באותה נקודה:
 * חצי תצ״א מול חצי מפה טופוגרפית.
 *
 * זהו כלי ההוראה החזק ביותר כאן — הוא עונה בו-זמנית על "מה זה בשטח" ועל
 * "איך זה מצויר במפה", בלי שהעין צריכה לנדוד בין שני מקומות או שהמשתמש
 * יצטרך להזיז מחוון קדימה ואחורה.
 */
export default function Loupe({
  area,
  at,
  size,
  k,
  offset,
  diameter = 168,
  magnify = 2.5,
}: LoupeProps) {
  // הנקודה שמתחת לסמן, במרחב התמונה המקורי (0..1)
  const u = (at.x - offset.x) / (size * k);
  const v = (at.y - offset.y) / (size * k);

  const zoomed = size * k * magnify;
  const bg = (src: string): React.CSSProperties => ({
    backgroundImage: `url("${src}")`,
    backgroundSize: `${zoomed}px ${zoomed}px`,
    backgroundPosition: `${diameter / 2 - u * zoomed}px ${diameter / 2 - v * zoomed}px`,
  });

  // בורר את הרוחב הגדול ביותר הזמין — הלופה היא בדיוק המקום שדורש פרטים
  const pick = (srcset: string) => {
    const last = srcset.split(',').pop()?.trim().split(' ')[0];
    return last ?? '';
  };

  const half = diameter / 2;
  const clamp = (n: number) => Math.max(half + 4, Math.min(size - half - 4, n));

  return (
    <div
      className="tms-loupe"
      aria-hidden="true"
      style={{
        width: diameter,
        height: diameter,
        left: clamp(at.x) - half,
        top: clamp(at.y) - half,
      }}
    >
      <div className="tms-loupe__pane" style={bg(pick(area.layers.aerial.webp))} />
      <div
        className="tms-loupe__pane tms-loupe__pane--map"
        style={bg(pick(area.layers.topo.webp))}
      />
      <span className="tms-loupe__divider" />
      <span className="tms-loupe__tag tms-loupe__tag--a">תצ״א</span>
      <span className="tms-loupe__tag tms-loupe__tag--m">מפה</span>
    </div>
  );
}
