import { levels } from '../data/levels.js'

/**
 * ComparisonPanel — טבלת השוואה מודרנית בין שלוש הרמות.
 * מחליפה את הטבלה הסטטית המקורית.
 *
 * props:
 *  - id: מזהה לצורך aria-controls מכפתור ההצגה.
 *
 * בתצוגת דסקטופ — טבלה; במסכים צרים — כל רמה הופכת לכרטיס (CSS responsive).
 */
const COLUMNS = [
  { key: 'spatialScale', label: 'קנה מידה מרחבי' },
  { key: 'timeScale', label: 'אופק זמן' },
  { key: 'commandLevel', label: 'דרג החלטה' },
  { key: 'geographicFocus', label: 'מוקד גיאוגרפי' },
]

export default function ComparisonPanel({ id }) {
  return (
    <section className="comparison" id={id} aria-label="טבלת השוואה בין הרמות">
      <h3 className="comparison__title">השוואה בין שלוש הרמות</h3>

      <div className="comparison__scroll">
        <table className="comparison__table">
          <thead>
            <tr>
              <th scope="col">רמה</th>
              {COLUMNS.map((col) => (
                <th scope="col" key={col.key}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map((level) => (
              <tr
                key={level.id}
                className="comparison__row"
                style={{ '--level-main': level.color.main }}
              >
                <th scope="row" className="comparison__level">
                  <span
                    className="comparison__swatch"
                    aria-hidden="true"
                    style={{ background: level.color.main }}
                  />
                  <span className="comparison__level-text">
                    <span className="comparison__level-he">{level.nameHe}</span>
                    <span className="comparison__level-en">{level.nameEn}</span>
                  </span>
                </th>
                {COLUMNS.map((col) => (
                  <td key={col.key} data-label={col.label}>
                    {level[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
