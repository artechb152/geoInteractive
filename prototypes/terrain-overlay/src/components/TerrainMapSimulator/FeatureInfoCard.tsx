import { useEffect, useRef, useState } from 'react';
import type { TerrainArea, TerrainFeature } from '../../data/types';
import { useI18n } from '../../i18n';
import ContourSignature from './ContourSignature';
import { TermText } from './Glossary';
import { Num, Range } from './lib/format';
import { useSpeech } from './hooks/useSpeech';

export type CardPlacement = 'left' | 'right';

interface FeatureInfoCardProps {
  feature: TerrainFeature;
  area: TerrainArea;
  placement: CardPlacement;
  /** true כשהכרטיס אינו מכסה את הצורה גם בחלק העליון של המסגרת. */
  vertical: 'top' | 'bottom';
  compact: boolean;
  onClose: () => void;
  onOpenTerm: (id: string) => void;
  onCompare: (id: string) => void;
  onCompareAreas: (featureId: string) => void;
  /** פתיחת חתך הגובה האופייני של הצורה. */
  onProfile?: (featureId: string) => void;
}

/** הטקסט שמוקרא — אותו סדר שבו הכרטיס נקרא בעין. */
function readable(feature: TerrainFeature): string {
  return [
    feature.name,
    feature.definition,
    feature.localNote,
    `בתצלום האוויר: ${feature.aerialExplanation}`,
    `במפה הטופוגרפית: ${feature.mapExplanation}`,
    `למה זה חשוב: ${feature.whyItMatters}`,
    feature.contrastNote,
  ]
    .filter(Boolean)
    .join('. ');
}

/**
 * FeatureInfoCard — כרטיס המידע של הצורה הנבחרת.
 *
 * שלוש בעיות שנפתרו כאן: הכרטיס נפתח בצד שאינו מכסה את הצורה שהוא מסביר
 * (לפי גבולות הצורה בפועל, לא רק לפי נקודת התווית), רקע אטום במקום שקיפות
 * שהתחרתה במפה, ותוכן מדורג — שורה אחת קצרה לקריאה ראשונה, והשאר בהרחבה.
 */
export default function FeatureInfoCard({
  feature,
  area,
  placement,
  vertical,
  compact,
  onClose,
  onOpenTerm,
  onCompare,
  onCompareAreas,
  onProfile,
}: FeatureInfoCardProps) {
  const t = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [expanded, setExpanded] = useState(!compact);
  const speech = useSpeech(t.localeTag === 'he' ? 'he-IL' : 'en-US');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [feature.id]);

  /**
   * כרטיס חדש נפתח במצב ברירת המחדל של הרוחב הנוכחי.
   *
   * העדכון נעשה בזמן רינדור לפי מפתח שהשתנה — הדפוס ש-React ממליץ עליו
   * במפורש — ולא ב-`useEffect`. עדכון מצב בתוך אפקט גורר רינדור שני מיד
   * אחרי הראשון, כלומר הבהוב של הכרטיס בכל החלפת צורה.
   */
  const cardKey = `${feature.id}:${compact}`;
  const [lastKey, setLastKey] = useState(cardKey);
  if (cardKey !== lastKey) {
    setLastKey(cardKey);
    setExpanded(!compact);
  }

  // החלפת צורה תוך כדי הקראה משאירה את הטקסט הקודם מדבר על הצורה החדשה
  const stopSpeech = speech.stop;
  useEffect(() => stopSpeech, [feature.id, stopSpeech]);

  const twin = feature.confusedWith
    ? area.features.find((f) => f.id === feature.confusedWith)
    : undefined;

  return (
    <aside
      className={[
        'tms-card',
        `tms-card--${placement}`,
        vertical === 'top' ? 'tms-card--top' : '',
        compact ? (expanded ? 'tms-card--sheet-expanded' : 'tms-card--sheet-collapsed') : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="region"
      aria-label={`מידע על ${feature.name}`}
    >
      <span className="tms-card__grip" aria-hidden="true" />
      <div className="tms-card__head" onClick={compact ? () => setExpanded((v) => !v) : undefined}>
        <h3 className="tms-card__name" tabIndex={-1} ref={headingRef}>
          {feature.name}
        </h3>
        {feature.elevation !== undefined && (
          <span className="tms-card__elev">
            <Num value={feature.elevation} unit="מ׳" />
          </span>
        )}
        {speech.supported && (
          <button
            type="button"
            className="tms-card__close tms-tap"
            aria-pressed={speech.speaking}
            aria-label={speech.speaking ? t.speakStop : t.speakStart}
            title={speech.speaking ? t.speakStop : t.speakStart}
            onClick={(e) => {
              e.stopPropagation();
              if (speech.speaking) speech.stop();
              else speech.speak(readable(feature));
            }}
          >
            {speech.speaking ? '■' : '▶'}
          </button>
        )}
        {compact && (
          <button
            type="button"
            className="tms-card__close tms-tap"
            aria-expanded={expanded}
            aria-label={expanded ? 'כיווץ הכרטיס' : 'הרחבת הכרטיס'}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? '⌄' : '⌃'}
          </button>
        )}
        <button
          type="button"
          className="tms-card__close tms-tap"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="סגירת כרטיס המידע (Esc)"
          title="סגירה"
        >
          ×
        </button>
      </div>

      <div className="tms-card__body">
        <p className="tms-card__short">
          <TermText area={area} onOpenTerm={onOpenTerm}>
            {feature.definition}
          </TermText>
        </p>
        {feature.localNote && (
          <p className="tms-card__short" style={{ color: 'var(--tms-ink-soft)' }}>
            <TermText area={area} onOpenTerm={onOpenTerm}>
              {feature.localNote}
            </TermText>
          </p>
        )}

        <dl className="tms-card__rows">
          <div className="tms-card__row">
            <dt className="tms-card__label">
              <abbr title="תצלום אוויר אנכי">בתצ״א</abbr>
            </dt>
            <dd className="tms-card__text">
              <TermText area={area} onOpenTerm={onOpenTerm}>
                {feature.aerialExplanation}
              </TermText>
            </dd>
          </div>
          <div className="tms-card__row">
            <div className="tms-card__rowhead">
              <dt className="tms-card__label">במפה הטופוגרפית</dt>
              <ContourSignature
                kind={feature.signature}
                label={`תרשים חתימת קווי הגובה של ${feature.name}`}
              />
            </div>
            <dd className="tms-card__text">
              <TermText area={area} onOpenTerm={onOpenTerm}>
                {feature.mapExplanation}
              </TermText>
            </dd>
          </div>
        </dl>

        <p className="tms-card__why">
          <b>למה זה חשוב: </b>
          <TermText area={area} onOpenTerm={onOpenTerm}>
            {feature.whyItMatters}
          </TermText>
        </p>

        {feature.contrastNote && (
          <p className="tms-card__contrast">
            <TermText area={area} onOpenTerm={onOpenTerm}>
              {feature.contrastNote}
            </TermText>
          </p>
        )}

        {feature.challenge && (
          <details className="tms-card__challenge">
            <summary>{feature.challenge.prompt}</summary>
            <p>{feature.challenge.answer}</p>
          </details>
        )}

        {speech.supported && speech.speaking && (
          <label className="tms-card__rate">
            {t.speakRate}
            <input
              type="range"
              min={0.6}
              max={1.6}
              step={0.1}
              value={speech.rate}
              onChange={(e) => speech.setRate(Number(e.target.value))}
            />
          </label>
        )}

        <ul className="tms-card__facts">
          <li>
            הפרש גובה:{' '}
            <b>
              <Num value={area.stats.interval} unit="מ׳" />
            </b>
          </li>
          <li>
            קווי מדד כל:{' '}
            <b>
              <Num value={area.stats.indexInterval} unit="מ׳" />
            </b>
          </li>
          <li>
            גבהים באזור:{' '}
            <b>
              <Range from={area.stats.min} to={area.stats.max} unit="מ׳" />
            </b>
          </li>
        </ul>

        <div className="tms-card__more">
          {twin && (
            <button
              type="button"
              className="tms-btn tms-btn--sm"
              onClick={() => onCompare(twin.id)}
            >
              השוו מול {twin.name}
            </button>
          )}
          {onProfile && (
            <button
              type="button"
              className="tms-btn tms-btn--sm"
              onClick={() => onProfile(feature.id)}
            >
              {t.profileTypical}
            </button>
          )}
          <button
            type="button"
            className="tms-btn tms-btn--sm"
            onClick={() => onCompareAreas(feature.id)}
          >
            אותה צורה בשטח אחר
          </button>
        </div>
      </div>
    </aside>
  );
}
