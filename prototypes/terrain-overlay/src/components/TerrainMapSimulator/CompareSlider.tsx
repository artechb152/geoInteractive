import type { CompareMode, CompareModeInfo } from './lib/compare';

interface CompareSliderProps {
  /** ערך 0..1 — 0 = השכבה התחתונה, 1 = העליונה. */
  value: number;
  mode: CompareMode;
  modes: CompareModeInfo[];
  /** שמות שתי השכבות שהמצב מרכיב, לתיוג כפתורי הקצה. */
  layerNames: [string, string];
  onChange: (value: number) => void;
  onModeChange: (mode: CompareMode) => void;
}

/**
 * CompareSlider — בורר מצב ההשוואה והמעבר בין שתי השכבות.
 *
 * הכפתורים הם `radio` ולא `button[aria-pressed]`: זו בחירה אחת מתוך קבוצה,
 * וקורא מסך צריך לשמוע "2 מתוך 4" ולא ארבע הפעלות בלתי-תלויות.
 */
export default function CompareSlider({
  value,
  mode,
  modes,
  layerNames,
  onChange,
  onModeChange,
}: CompareSliderProps) {
  const pct = Math.round(value * 100);
  const active = modes.find((m) => m.id === mode);
  const [low, high] = layerNames;

  const readout =
    mode === 'split'
      ? `${high} · ${low}`
      : pct === 0
        ? low
        : pct === 100
          ? high
          : mode === 'wipe'
            ? `${pct}% ${high}`
            : `${pct}% ${high}`;

  const valueText =
    mode === 'wipe'
      ? `קו הווילון ב-${pct} אחוז מרוחב המפה. משמאל ${high}, מימין ${low}.`
      : pct === 0
        ? `${low} בלבד`
        : pct === 100
          ? `${high} בלבד`
          : `${100 - pct} אחוז ${low}, ${pct} אחוז ${high}`;

  return (
    <div className="tms-compare">
      <div className="tms-compare__modes" role="radiogroup" aria-label="מצב השוואה בין השכבות">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={m.id === mode}
            className={'tms-mode tms-tap' + (m.id === mode ? ' tms-mode--on' : '')}
            title={m.hint}
            onClick={() => onModeChange(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {active?.usesSlider !== false && (
        <div className="tms-compare__row" role="group" aria-label={`מעבר בין ${low} ל${high}`}>
          <button
            type="button"
            className="tms-btn tms-btn--sm tms-tap"
            onClick={() => onChange(0)}
            aria-pressed={pct === 0}
            aria-label={`הצג ${low} בלבד`}
            title={`${low} (מקש A)`}
          >
            {low}
          </button>

          <span className="tms-compare__field">
            <input
              className="tms-compare__range"
              type="range"
              min={0}
              max={100}
              step={1}
              value={pct}
              onChange={(e) => onChange(Number(e.target.value) / 100)}
              aria-label={mode === 'wipe' ? 'מיקום קו הווילון' : `מעבר בין ${low} ל${high}`}
              aria-valuetext={valueText}
            />
            <span className="tms-compare__readout" aria-hidden="true">
              {readout}
            </span>
          </span>

          <button
            type="button"
            className="tms-btn tms-btn--sm tms-tap"
            onClick={() => onChange(1)}
            aria-pressed={pct === 100}
            aria-label={`הצג ${high} בלבד`}
            title={`${high} (מקש M)`}
          >
            {high}
          </button>
        </div>
      )}
    </div>
  );
}
