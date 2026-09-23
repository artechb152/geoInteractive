import { useState } from 'react'
import { levelsById } from '../data/levels.js'
import TrainingMap, { MARKERS } from './TrainingMap.jsx'
import MiniPyramid from './MiniPyramid.jsx'
import ScenarioQuiz from './ScenarioQuiz.jsx'

/**
 * InteractiveMapZoom — מצב ב': מפת זום אינטראקטיבית.
 *
 * props:
 *  - selectedLevel: id הרמה הפעילה = רמת הזום (נשלט מ-App, משותף עם הפירמידה)
 *  - onSelectLevel: (id) => void
 *
 * מצב פנימי:
 *  - selectedMarker: id הסמן הנבחר על המפה (או null)
 */
const ZOOM_BUTTONS = [
  { id: 'strategic', label: 'זום רחוק', sub: 'אסטרטגית', bars: 1 },
  { id: 'operational', label: 'זום בינוני', sub: 'אופרטיבית', bars: 2 },
  { id: 'tactical', label: 'זום קרוב', sub: 'טקטית', bars: 3 },
]

// "הרמה האסטרטגית" -> "לרמה האסטרטגית"
function toLevelPhrase(nameHe) {
  return 'ל' + nameHe.replace(/^ה/, '')
}

export default function InteractiveMapZoom({ selectedLevel, onSelectLevel }) {
  const [selectedMarker, setSelectedMarker] = useState(null)

  const activeLevel = levelsById[selectedLevel] || levelsById.strategic
  const marker = MARKERS.find((m) => m.id === selectedMarker) || null
  const markerLevel = marker ? levelsById[marker.level] : null

  function handleZoom(levelId) {
    onSelectLevel(levelId)
    setSelectedMarker(null)
  }

  function handleMarkerSelect(markerId) {
    const picked = MARKERS.find((m) => m.id === markerId)
    setSelectedMarker(markerId)
    if (picked) onSelectLevel(picked.level)
  }

  function handleScenarioPick(levelId) {
    onSelectLevel(levelId)
    setSelectedMarker(null)
  }

  return (
    <section className="map-mode" aria-label="מפת זום אינטראקטיבית">
      {/* ----- בקרת זום ----- */}
      <div
        className="zoom-controls"
        role="group"
        aria-label="בחירת רמת זום"
      >
        <span className="zoom-controls__label" aria-hidden="true">
          רמת זום:
        </span>
        {ZOOM_BUTTONS.map((btn) => {
          const active = selectedLevel === btn.id
          const level = levelsById[btn.id]
          return (
            <button
              key={btn.id}
              type="button"
              className={`zoom-button${active ? ' zoom-button--active' : ''}`}
              style={{
                '--level-main': level.color.main,
                '--level-tint': level.color.tint,
              }}
              aria-pressed={active}
              onClick={() => handleZoom(btn.id)}
            >
              <span className="zoom-button__bars" aria-hidden="true">
                <span data-on={btn.bars >= 1} />
                <span data-on={btn.bars >= 2} />
                <span data-on={btn.bars >= 3} />
              </span>
              <span className="zoom-button__text">
                <span className="zoom-button__main">{btn.label}</span>
                <span className="zoom-button__sub">{btn.sub}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* ----- מפה + סייד-בר ----- */}
      <div className="map-mode__split">
        <div className="map-mode__map">
          <TrainingMap
            selectedLevel={selectedLevel}
            selectedMarker={selectedMarker}
            onSelectMarker={handleMarkerSelect}
          />
          <p className="map-mode__hint">
            לחצו על סמן במפה כדי לראות לאיזו רמה הוא שייך — או החליפו את רמת הזום
            למעלה.
          </p>
        </div>

        <aside className="map-mode__side">
          <MiniPyramid selectedLevel={selectedLevel} onSelectLevel={handleZoom} />

          {/* כרטיס הסבר הרמה */}
          <article
            className="side-card"
            style={{
              '--level-main': activeLevel.color.main,
              '--level-tint': activeLevel.color.tint,
              '--level-on-tint': activeLevel.color.onTint,
            }}
          >
            <p className="side-card__eyebrow">כך נתפס המרחב ברמה זו</p>
            <h3 className="side-card__title">{activeLevel.nameHe}</h3>
            <p className="side-card__text">{activeLevel.geographicFocus}</p>
            <p className="side-card__key">{activeLevel.keySentence}</p>
          </article>

          {/* כרטיס הסבר סמן */}
          {marker && (
            <article
              className="side-card side-card--marker"
              style={{
                '--level-main': markerLevel.color.main,
                '--level-tint': markerLevel.color.tint,
                '--level-on-tint': markerLevel.color.onTint,
              }}
            >
              <p className="side-card__eyebrow">דוגמה נבחרת מהמפה</p>
              <h3 className="side-card__title">{marker.label}</h3>
              <p className="side-card__text">
                דוגמה זו שייכת {toLevelPhrase(markerLevel.nameHe)} משום ש
                {marker.reason}
              </p>
            </article>
          )}
        </aside>
      </div>

      {/* ----- בוחן תרחישים ----- */}
      <ScenarioQuiz onPickLevel={handleScenarioPick} />
    </section>
  )
}
