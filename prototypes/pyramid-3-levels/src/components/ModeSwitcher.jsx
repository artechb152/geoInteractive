/**
 * ModeSwitcher — מחליף בין שני מצבי הלמידה + כפתור איפוס פעילות.
 *
 * props:
 *  - mode:          'pyramid' | 'map'
 *  - onModeChange:  (mode) => void
 *  - onReset:       () => void
 */
const MODES = [
  { id: 'pyramid', label: 'פירמידה אינטראקטיבית', icon: PyramidIcon },
  { id: 'map', label: 'מפת זום אינטראקטיבית', icon: MapIcon },
]

export default function ModeSwitcher({ mode, onModeChange, onReset }) {
  return (
    <div className="mode-switcher">
      <div
        className="mode-switcher__tabs"
        role="group"
        aria-label="בחירת מצב למידה"
      >
        {MODES.map(({ id, label, icon: Icon }) => {
          const active = mode === id
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              className={`mode-tab${active ? ' mode-tab--active' : ''}`}
              onClick={() => onModeChange(id)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          )
        })}
      </div>

      <button type="button" className="reset-button" onClick={onReset}>
        <ResetIcon />
        <span>איפוס פעילות</span>
      </button>
    </div>
  )
}

function PyramidIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mode-tab__icon" aria-hidden="true">
      <path
        d="M12 3 21 20H3L12 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M7.5 12h9M5.2 16.4h13.6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mode-tab__icon" aria-hidden="true">
      <path
        d="M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5L9 4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 4v13.5M15 6.5V20" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="reset-button__icon" aria-hidden="true">
      <path
        d="M5 12a7 7 0 1 0 2.1-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M7 3v4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
