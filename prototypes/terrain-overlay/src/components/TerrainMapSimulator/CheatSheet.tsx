import type { TerrainArea } from '../../data/types';
import ContourSignature from './ContourSignature';

/**
 * CheatSheet — "דף עזר" שמופיע בהדפסה בלבד (ראו `@media print`).
 * עמוד אחד עם כל החתימות והכלל שמזהה כל צורה — מה שלומד לוקח איתו לשטח,
 * שם אין מסך.
 */
export default function CheatSheet({ area }: { area: TerrainArea }) {
  return (
    <section className="tms-cheat" aria-hidden="true">
      <h2>דף עזר — זיהוי צורות שטח · {area.name}</h2>
      <p>
        הפרש גובה בין קווים סמוכים: {area.stats.interval} מ׳ · קווי מדד כל{' '}
        {area.stats.indexInterval} מ׳ · טווח גבהים {area.stats.min}–{area.stats.max} מ׳ · רוחב השטח
        כ-{area.groundWidthM} מ׳
      </p>
      <div className="tms-cheat__grid">
        {area.features.map((f) => (
          <div className="tms-cheat__item" key={f.id}>
            <ContourSignature kind={f.signature} />
            <div>
              <h3>{f.name}</h3>
              <p>{f.mapExplanation}</p>
            </div>
          </div>
        ))}
      </div>
      <p>
        מקורות: {area.attribution.aerial} · {area.attribution.topo} · {area.attribution.dem}
      </p>
    </section>
  );
}
