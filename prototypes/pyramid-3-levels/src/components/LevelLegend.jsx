/**
 * LevelLegend — מקרא הרמות + בוררי רמה נגישים (כפתורי מקלדת).
 * מספק את הטקסט שאינו נוח על המודל התלת־ממדי, וגם נתיב בחירה נגיש לחלוטין
 * (מקלדת/קורא מסך) שמסונכרן עם אותו מצב משותף כמו הלחיצה על שכבות הפירמידה.
 *
 * props:
 *  - levels:        מערך הרמות
 *  - selectedLevel: id הרמה הפעילה
 *  - onSelectLevel: (id) => void — אותו מטפל בחירה משותף
 */
export default function LevelLegend({ levels, selectedLevel, onSelectLevel }) {
  return (
    <div className="level-legend" role="group" aria-label="בחירת רמה">
      {levels.map((level) => {
        const active = level.id === selectedLevel
        return (
          <button
            key={level.id}
            type="button"
            className={`legend-item${active ? ' legend-item--active' : ''}`}
            style={{
              '--level-main': level.color.main,
              '--level-tint': level.color.tint,
              '--level-on-tint': level.color.onTint,
            }}
            aria-pressed={active}
            aria-controls="level-details-panel"
            onClick={() => onSelectLevel(level.id)}
          >
            <span className="legend-item__swatch" aria-hidden="true" />
            <span className="legend-item__text">
              <span className="legend-item__he">{level.nameHe}</span>
              <span className="legend-item__en">{level.nameEn}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
