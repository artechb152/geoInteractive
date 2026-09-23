import { lazy, Suspense } from 'react'
import { levels } from '../data/levels.js'

// אותו מודל תלת־ממדי כמו הפירמידה הראשית (variant="mini"), בטעינה עצלה.
const PyramidModel = lazy(() => import('./PyramidModel.jsx'))

/**
 * MiniPyramid — פירמידה מוקטנת תלת־ממדית (מצב מפה).
 * אותה שפה ויזואלית כמו הפירמידה הראשית, וכל שכבה לחיצה.
 *
 * חשוב: לחיצה על שכבה כאן מפעילה את *אותו* מטפל בחירה כמו כפתורי הזום
 * (onSelectLevel = handleZoom), כך שהמוקטנת, כפתורי הזום, המפה והכרטיסים
 * נשארים מסונכרנים דרך מצב משותף אחד — ללא כפילות לוגיקה.
 *
 * props:
 *  - selectedLevel: id הרמה הפעילה
 *  - onSelectLevel: (id) => void — אותו מטפל של כפתורי הזום
 */
export default function MiniPyramid({ selectedLevel, onSelectLevel }) {
  const activeName = levels.find((l) => l.id === selectedLevel)?.nameHe || ''

  return (
    <div className="mini-pyramid">
      <p className="mini-pyramid__caption">הרמה הפעילה · לחצו על שכבה</p>

      <Suspense
        fallback={
          <div className="pyramid-canvas-fallback pyramid-canvas-fallback--mini">
            טוען…
          </div>
        }
      >
        <PyramidModel
          levels={levels}
          selectedLevel={selectedLevel}
          onSelectLevel={onSelectLevel}
          variant="mini"
        />
      </Suspense>

      <p className="mini-pyramid__active">{activeName}</p>
    </div>
  )
}
