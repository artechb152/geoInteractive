import { useState, lazy, Suspense } from 'react'
import { levels, levelsById } from '../data/levels.js'
import LevelLegend from './LevelLegend.jsx'
import LevelDetailsPanel from './LevelDetailsPanel.jsx'
import ComparisonPanel from './ComparisonPanel.jsx'

// המודל התלת־ממדי נטען בעצלתיים (code-split) כדי שספריית three לא תכביד
// על הטעינה הראשונית של העמוד.
const PyramidModel = lazy(() => import('./PyramidModel.jsx'))

/**
 * InteractivePyramid — מצב א': פירמידה תלת־ממדית אינטראקטיבית (WebGL).
 *
 * props:
 *  - selectedLevel:  id הרמה הפעילה (נשלט מ-App)
 *  - onSelectLevel:  (id) => void — מטפל הבחירה המשותף (פירמידה + מקרא + פאנל)
 *
 * מצב פנימי:
 *  - comparisonOpen: האם טבלת ההשוואה פתוחה.
 */
export default function InteractivePyramid({ selectedLevel, onSelectLevel }) {
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const activeLevel = levelsById[selectedLevel] || levels[1]

  return (
    <section className="pyramid-mode" aria-label="פירמידה אינטראקטיבית">
      {/* הכרזה לקוראי מסך בעת בחירת רמה (אזור קבוע מחוץ לפאנל שנטען מחדש) */}
      <p className="sr-only" role="status">
        נבחרה הרמה: {activeLevel.nameHe}
      </p>

      <div className="pyramid-mode__split">
        {/* ----- הפירמידה התלת־ממדית + מקרא ----- */}
        <div className="pyramid-mode__visual">
          <p className="panel-eyebrow">
            <span className="panel-eyebrow__dot" aria-hidden="true" />
            גררו כדי לסובב · לחצו על שכבה כדי לחקור רמה
          </p>

          <Suspense
            fallback={
              <div className="pyramid-canvas-fallback">טוען מודל תלת־ממד…</div>
            }
          >
            <PyramidModel
              levels={levels}
              selectedLevel={selectedLevel}
              onSelectLevel={onSelectLevel}
              variant="main"
            />
          </Suspense>

          <LevelLegend
            levels={levels}
            selectedLevel={selectedLevel}
            onSelectLevel={onSelectLevel}
          />
        </div>

        {/* ----- פאנל פרטים ----- */}
        <LevelDetailsPanel key={activeLevel.id} level={activeLevel} />
      </div>

      {/* ----- טבלת השוואה ----- */}
      <div className="comparison-toggle-row">
        <button
          type="button"
          className="ghost-button"
          aria-expanded={comparisonOpen}
          aria-controls="comparison-panel"
          onClick={() => setComparisonOpen((open) => !open)}
        >
          {comparisonOpen ? 'הסתר טבלת השוואה' : 'הצג טבלת השוואה'}
        </button>
      </div>

      {comparisonOpen && <ComparisonPanel id="comparison-panel" />}
    </section>
  )
}
