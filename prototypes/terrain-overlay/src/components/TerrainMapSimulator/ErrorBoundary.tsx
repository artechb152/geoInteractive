import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

/**
 * ErrorBoundary — גדר בטיחות סביב הרכיב.
 *
 * בלעדיה, חריגה אחת בשכבת ה-SVG מפילה את כל דף הקורס למסך לבן ללא הסבר.
 * כאן היא נעצרת, מוצגת בעברית, ומאפשרת ניסיון חוזר בלי לרענן את הדף.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    // eslint-disable-next-line no-console
    console.error('[TerrainMapSimulator]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="tms" dir="rtl">
        <div
          className="tms-map__error"
          role="alert"
          style={{ position: 'static', minHeight: 220, borderRadius: 'var(--tms-r-lg)' }}
        >
          <p>אירעה תקלה בטעינת סימולטור צורות השטח.</p>
          <small>הפרטים נרשמו במסוף הדפדפן. שאר הדף ממשיך לפעול כרגיל.</small>
          <button
            type="button"
            className="tms-btn tms-btn--primary"
            onClick={() => this.setState({ error: null })}
          >
            נסו שוב
          </button>
        </div>
      </div>
    );
  }
}
