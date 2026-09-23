/**
 * UsageSection — סעיף "כיצד להשתמש ברכיב בקורס".
 * תוכן סטטי המיועד למנהל/ת הקורס.
 */
const USAGE_CARDS = [
  {
    id: 'u1',
    step: '01',
    text: 'להשתמש בפירמידה לפתיחת הנושא ולהצגת שלוש הרמות.',
  },
  {
    id: 'u2',
    step: '02',
    text: 'להשתמש במפת הזום כדי להמחיש כיצד קנה המידה משנה את סוג ההחלטות.',
  },
  {
    id: 'u3',
    step: '03',
    text: 'לשלב בין שתיהן: פירמידה להבנה מושגית, מפה לתרגול מרחבי.',
  },
]

export default function UsageSection() {
  return (
    <section className="usage" aria-labelledby="usage-title">
      <h2 className="usage__title" id="usage-title">
        כיצד להשתמש ברכיב בקורס
      </h2>
      <div className="usage__grid">
        {USAGE_CARDS.map((card) => (
          <article key={card.id} className="usage-card">
            <span className="usage-card__step" aria-hidden="true">
              {card.step}
            </span>
            <p className="usage-card__text">{card.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
