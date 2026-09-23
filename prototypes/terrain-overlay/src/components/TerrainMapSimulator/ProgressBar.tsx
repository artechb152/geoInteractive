import { useState } from 'react';
import { useI18n } from '../../i18n';
import type { ProgressSnapshot } from './lib/progress';

interface ProgressBarProps {
  progress: ProgressSnapshot;
  shareHref: string;
  onReset: () => void;
}

/**
 * ProgressBar — מחוון ההתקדמות הגלוי, כפתור האיפוס והודעת הפרטיות.
 *
 * המונה גלוי כי לומד שלא רואה כמה נשאר לו לא יודע מתי הוא סיים — וגם המדריך
 * לא. הודעת הפרטיות אינה עודף זהירות: הרכיב שומר מצב במכשיר, וללומד מגיע
 * לדעת בדיוק מה נשמר ואיפה, במשפט אחד ובלי לחפש.
 */
export default function ProgressBar({ progress, shareHref, onReset }: ProgressBarProps) {
  const t = useI18n();
  const [copied, setCopied] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const pct = Math.round(progress.ratio * 100);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareHref);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* דפדפן ללא הרשאת לוח — הכתובת ממילא נמצאת בשורת הכתובת */
    }
  };

  return (
    <div className="tms-progress">
      <div className="tms-progress__meter">
        <div
          className="tms-progress__track"
          role="progressbar"
          aria-label={t.progressLabel}
          aria-valuenow={progress.seen.length}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuetext={t.progressSeen(progress.seen.length, progress.total)}
        >
          <span className="tms-progress__fill" style={{ inlineSize: `${pct}%` }} />
        </div>
        <span className="tms-progress__label">
          {progress.complete
            ? t.progressComplete
            : t.progressSeen(progress.seen.length, progress.total)}
        </span>
      </div>

      <div className="tms-progress__actions">
        <button type="button" className="tms-btn tms-btn--sm tms-tap" onClick={copy}>
          {copied ? t.copied : t.shareLink}
        </button>
        <button
          type="button"
          className="tms-btn tms-btn--sm tms-btn--quiet tms-tap"
          onClick={() => {
            if (window.confirm(t.resetConfirm)) onReset();
          }}
        >
          {t.resetProgress}
        </button>
        <button
          type="button"
          className="tms-progress__info tms-tap"
          aria-expanded={showPrivacy}
          aria-label={t.privacyNote}
          onClick={() => setShowPrivacy((v) => !v)}
        >
          ⓘ
        </button>
      </div>

      {showPrivacy && <p className="tms-progress__privacy">{t.privacyNote}</p>}
    </div>
  );
}
