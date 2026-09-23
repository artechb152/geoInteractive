import MapMarker from './MapMarker.jsx'

/**
 * TrainingMap — מפת אימון גיאוגרפית דמיונית (CSS + SVG בלבד).
 *
 * המפה אינה מבוססת על נתונים אמיתיים או מסווגים — זהו שטח אימון בדוי.
 * אפקט ה"זום" מושג באמצעות transform: scale על שכבת המפה, סביב נקודת מיקוד
 * המשתנה לפי הרמה הנבחרת. הסמנים והתוויות מקבלים scale הפוך כדי לשמור על
 * גודל קבוע על המסך (כמו סיכות במפה אמיתית).
 *
 * props:
 *  - selectedLevel:   רמת הזום הפעילה ('strategic' | 'operational' | 'tactical')
 *  - selectedMarker:  id הסמן הנבחר (או null)
 *  - onSelectMarker:  (markerId) => void
 */

// נקודת המיקוד והגדלת הזום לכל רמה.
const ZOOM = {
  strategic: { scale: 1, ox: '50%', oy: '48%' },
  operational: { scale: 1.7, ox: '60%', oy: '44%' },
  tactical: { scale: 2.6, ox: '38%', oy: '60%' },
}

// תוויות צפות שמשתנות לפי רמת הזום (לפי המפרט הלימודי).
const LABELS = {
  strategic: [
    { text: 'זירת מלחמה', x: '52%', y: '14%' },
    { text: 'נתיב אספקה', x: '19%', y: '74%' },
    { text: 'גבול אזורי', x: '82%', y: '22%' },
    { text: 'מרחב ימי / יבשתי', x: '15%', y: '50%' },
  ],
  operational: [
    { text: 'ציר תנועה', x: '78%', y: '64%' },
    { text: 'מסדרון תמרון', x: '60%', y: '40%' },
    { text: 'בסיס לוגיסטי קדמי', x: '70%', y: '30%' },
    { text: 'צוואר בקבוק', x: '50%', y: '55%' },
  ],
  tactical: [
    { text: 'קו ראייה', x: '47%', y: '46%' },
    { text: 'עמדה שולטת', x: '40%', y: '54%' },
    { text: 'קפל קרקע', x: '31%', y: '66%' },
    { text: 'נתיב גישה נסתר', x: '25%', y: '60%' },
  ],
}

/**
 * MARKERS — סמנים אינטראקטיביים על המפה.
 * מיוצא כדי שכרטיס ההסבר (ב-InteractiveMapZoom) יוכל לקרוא את אותו מקור.
 * x/y הם אחוזים בתוך שכבת המפה; level מקשר לרמה ב-levels.js.
 */
export const MARKERS = [
  {
    id: 'm-war-theater',
    label: 'זירת מלחמה',
    level: 'strategic',
    x: '52%',
    y: '20%',
    reason:
      'היא מתארת מרחב לחימה שלם — זירה רחבה שבה נשקלים משאבים, בריתות וכיווני מאמץ.',
  },
  {
    id: 'm-supply',
    label: 'נתיב אספקה גלובלי',
    level: 'strategic',
    x: '22%',
    y: '67%',
    reason:
      'נתיבי האספקה מזינים את המערכת הצבאית כולה, והבחירה בהם משפיעה על המלחמה לאורך זמן.',
  },
  {
    id: 'm-corridor',
    label: 'מסדרון תמרון',
    level: 'operational',
    x: '57%',
    y: '47%',
    reason:
      'הוא מאפשר תנועה רציפה של כוח גדול במרחב, מעבר למחסה המקומי הבודד.',
  },
  {
    id: 'm-fob',
    label: 'בסיס לוגיסטי קדמי',
    level: 'operational',
    x: '70%',
    y: '34%',
    reason:
      'מיקומו מסנכרן לוגיסטיקה, תכנון מערכתי ותנועה לאורך מסדרון התמרון.',
  },
  {
    id: 'm-observation',
    label: 'נקודת תצפית',
    level: 'tactical',
    x: '41%',
    y: '55%',
    reason:
      'היא נקודה מקומית המעניקה קווי ראייה ושליטה מיידית על השטח שמסביב.',
  },
  {
    id: 'm-fold',
    label: 'קפל קרקע / נתיב גישה נסתר',
    level: 'tactical',
    x: '31%',
    y: '64%',
    reason:
      'הוא מאפשר הסתרה ותנועה מוגנת במטרים הבודדים שמכריעים את הקרב.',
  },
]

export default function TrainingMap({
  selectedLevel,
  selectedMarker,
  onSelectMarker,
}) {
  const zoom = ZOOM[selectedLevel] || ZOOM.strategic
  const labels = LABELS[selectedLevel] || []

  const sceneStyle = {
    transform: `scale(${zoom.scale})`,
    transformOrigin: `${zoom.ox} ${zoom.oy}`,
    '--map-scale': zoom.scale,
  }

  return (
    <div className="map-viewport" data-zoom={selectedLevel}>
      <div className="map-scene" style={sceneStyle}>
        <TerrainSvg />

        {/* תוויות צפות לפי הזום */}
        {labels.map((label) => (
          <span
            key={label.text}
            className="map-label"
            style={{ left: label.x, top: label.y }}
          >
            {label.text}
          </span>
        ))}

        {/* סמנים אינטראקטיביים */}
        {MARKERS.map((marker) => (
          <MapMarker
            key={marker.id}
            marker={marker}
            isSelected={selectedMarker === marker.id}
            isActiveLevel={marker.level === selectedLevel}
            onSelect={() => onSelectMarker(marker.id)}
          />
        ))}
      </div>

      {/* שכבת ממשק קבועה מעל המפה (לא מושפעת מהזום) */}
      <div className="map-hud" aria-hidden="true">
        <div className="map-hud__north">
          <svg viewBox="0 0 24 24">
            <path
              d="M12 3 8 14h8L12 3Z"
              fill="currentColor"
              opacity="0.85"
            />
            <path d="M12 3v18" stroke="currentColor" strokeWidth="1.1" />
            <text x="12" y="23" textAnchor="middle" className="map-hud__n">
              N
            </text>
          </svg>
        </div>
        <div className="map-hud__scalebar">
          <span className="map-hud__scalebar-line" />
          <span className="map-hud__scalebar-text">
            {selectedLevel === 'strategic'
              ? '~ מאות ק"מ'
              : selectedLevel === 'operational'
              ? '~ עשרות ק"מ'
              : '~ מטרים בודדים'}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ===========================================================================
 *  TerrainSvg — תוואי השטח הבדוי. דקורטיבי בלבד (aria-hidden).
 * ======================================================================== */
function TerrainSvg() {
  return (
    <svg
      className="terrain"
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* ----- רקע יבשה ----- */}
      <rect x="0" y="0" width="1000" height="700" fill="#e7dcc4" />

      {/* גרטיקולה — רשת עדינה */}
      <g className="terrain__grid">
        {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="700" />
        ))}
        {[100, 200, 300, 400, 500, 600].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="1000" y2={y} />
        ))}
      </g>

      {/* ----- ים (פינה שמאלית-תחתונה) ----- */}
      <path
        className="terrain__sea"
        d="M0,700 L0,300 C150,330 250,470 215,700 Z"
      />
      <path
        className="terrain__sea-deep"
        d="M0,700 L0,420 C90,440 150,540 130,700 Z"
      />
      {/* קו חוף */}
      <path
        className="terrain__coast"
        d="M0,300 C150,330 250,470 215,700"
        fill="none"
      />
      {/* גלי ים */}
      <g className="terrain__waves">
        <path d="M30,500 q20,-12 40,0 t40,0" fill="none" />
        <path d="M25,560 q20,-12 40,0 t40,0" fill="none" />
        <path d="M40,620 q20,-12 40,0 t40,0" fill="none" />
      </g>

      {/* ----- רכס הרים (אזור ימני-עליון) ----- */}
      <path
        className="terrain__mountain"
        d="M600,170 L660,90 L710,160 L770,70 L840,160 L900,95 L1000,165 L1000,0 L600,0 Z"
      />
      <g className="terrain__ridge-lines">
        <path d="M660,90 L690,160" fill="none" />
        <path d="M770,70 L800,160" fill="none" />
        <path d="M900,95 L935,165" fill="none" />
      </g>

      {/* ----- נחל / ואדי ----- */}
      <path
        className="terrain__river"
        d="M720,30 C700,150 600,210 540,300 C500,360 420,430 320,470 C260,495 210,520 175,560"
        fill="none"
      />

      {/* ----- רשת כבישים ----- */}
      <g className="terrain__roads-casing">
        <path d="M930,660 C800,600 700,520 600,470 C520,430 470,425 410,440 C360,452 300,470 230,500" fill="none" />
        <path d="M600,470 L650,360 L700,300" fill="none" />
      </g>
      <g className="terrain__roads">
        <path d="M930,660 C800,600 700,520 600,470 C520,430 470,425 410,440 C360,452 300,470 230,500" fill="none" />
        <path d="M600,470 L650,360 L700,300" fill="none" />
      </g>

      {/* ----- אזור בנוי / בלוקים עירוניים ----- */}
      <g className="terrain__city">
        {[
          [636, 268], [672, 268], [708, 266],
          [630, 296], [666, 296], [702, 294],
          [648, 322], [684, 322],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="26" height="20" rx="2" />
        ))}
      </g>

      {/* ----- גבעה / נקודת תצפית: קווי גובה ----- */}
      <g className="terrain__hill">
        <ellipse cx="408" cy="438" rx="86" ry="56" />
        <ellipse cx="408" cy="436" rx="60" ry="39" />
        <ellipse cx="408" cy="434" rx="36" ry="23" />
        <ellipse cx="408" cy="432" rx="15" ry="10" />
        <path
          className="terrain__peak"
          d="M408,420 l8,12 -16,0 Z"
        />
      </g>

      {/* ----- צוואר בקבוק (בין רכס לנחל) ----- */}
      <g className="terrain__choke">
        <path d="M520,400 l34,40 M566,396 l-34,40" fill="none" />
      </g>
    </svg>
  )
}
