import { useState } from 'react'
import Header from './components/Header.jsx'
import ModeSwitcher from './components/ModeSwitcher.jsx'
import InteractivePyramid from './components/InteractivePyramid.jsx'
import InteractiveMapZoom from './components/InteractiveMapZoom.jsx'
import UsageSection from './components/UsageSection.jsx'

const DEFAULT_LEVEL = 'operational'

/**
 * App — שורש המודול.
 *
 * מנהל את המצב המשותף לשני מצבי הלמידה:
 *  - mode:          המצב הנבחר ('pyramid' | 'map')
 *  - selectedLevel: הרמה הפעילה, משותפת לפירמידה ולמפה כדי לשמר את
 *                   הקשר ביניהן (בחירת רמה בפירמידה משתקפת בזום של המפה).
 *  - resetKey:      מפתח שמתאפס ב"איפוס פעילות" וגורם לרכיבי המצב
 *                   להיטען מחדש עם מצב פנימי נקי (תשובות, סמנים, תרחישים).
 */
export default function App() {
  const [mode, setMode] = useState('pyramid')
  const [selectedLevel, setSelectedLevel] = useState(DEFAULT_LEVEL)
  const [resetKey, setResetKey] = useState(0)

  function handleReset() {
    setSelectedLevel(DEFAULT_LEVEL)
    setResetKey((k) => k + 1)
  }

  return (
    <div className="app">
      <div className="app__frame">
        <Header />

        <ModeSwitcher mode={mode} onModeChange={setMode} onReset={handleReset} />

        {/* הכרזה תמציתית לקוראי מסך בעת החלפת מצב — במקום הקראת כל הפאנל */}
        <p className="sr-only" role="status">
          {mode === 'pyramid'
            ? 'מצב פעיל: פירמידה אינטראקטיבית'
            : 'מצב פעיל: מפת זום אינטראקטיבית'}
        </p>

        <main className="app__stage">
          {mode === 'pyramid' ? (
            <InteractivePyramid
              key={`pyramid-${resetKey}`}
              selectedLevel={selectedLevel}
              onSelectLevel={setSelectedLevel}
            />
          ) : (
            <InteractiveMapZoom
              key={`map-${resetKey}`}
              selectedLevel={selectedLevel}
              onSelectLevel={setSelectedLevel}
            />
          )}
        </main>

        <UsageSection />
      </div>
    </div>
  )
}
