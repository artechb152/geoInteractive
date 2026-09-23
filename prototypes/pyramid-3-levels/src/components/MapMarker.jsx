import { levelsById } from '../data/levels.js'

/**
 * MapMarker — סמן אינטראקטיבי על המפה.
 *
 * props:
 *  - marker:        אובייקט הסמן מתוך MARKERS (TrainingMap)
 *  - isSelected:    האם הסמן הנבחר כרגע
 *  - isActiveLevel: האם הרמה של הסמן תואמת לרמת הזום הנוכחית
 *  - onSelect:      () => void
 *
 * הסמן יושב בתוך שכבת המפה ומקבל scale הפוך (ב-CSS) כדי לשמור על גודל קבוע.
 */
export default function MapMarker({
  marker,
  isSelected,
  isActiveLevel,
  onSelect,
}) {
  const level = levelsById[marker.level]

  return (
    <button
      type="button"
      className={`map-marker${isSelected ? ' map-marker--selected' : ''}${
        isActiveLevel ? ' map-marker--active-level' : ''
      }`}
      style={{
        left: marker.x,
        top: marker.y,
        '--level-main': level.color.main,
        '--level-strong': level.color.strong,
      }}
      aria-pressed={isSelected}
      aria-label={`${marker.label} — דוגמה מ${level.nameHe}${
        isActiveLevel ? '' : ' (מחוץ לרמת הזום הנוכחית)'
      }`}
      onClick={onSelect}
    >
      <span className="map-marker__pin" aria-hidden="true">
        <span className="map-marker__pulse" />
        <span className="map-marker__dot" />
      </span>
      <span className="map-marker__chip">{marker.label}</span>
    </button>
  )
}
