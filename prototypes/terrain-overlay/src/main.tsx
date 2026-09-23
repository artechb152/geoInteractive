import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import TerrainMapSimulator from './components/TerrainMapSimulator';

/**
 * עורך התוכן נטען עצלה ורק תחת `?editor=1`.
 *
 * הוא מסך פנימי למדריכים ואינו חלק מחוויית הלומד — אין סיבה שהקוד שלו ייטען
 * אצל מי שרק בא ללמוד צורות שטח.
 */
const FeatureEditor = lazy(() => import('./components/TerrainMapSimulator/editor/FeatureEditor'));

const editor =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('editor');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {editor ? (
      <Suspense fallback={<p style={{ padding: 24 }}>טוען את עורך התוכן…</p>}>
        <FeatureEditor />
      </Suspense>
    ) : (
      <main className="harness">
        <TerrainMapSimulator
          headingLevel={2}
          onEvent={(e) => {
            // דף ההדגמה מדפיס את האירועים כדי להראות איך קורס יחבר אליהם מדידה
            if (import.meta.env.DEV) console.debug('[tms]', e);
          }}
          onProgress={(p) => {
            if (import.meta.env.DEV) console.debug('[tms:progress]', p);
          }}
          onComplete={(r) => {
            if (import.meta.env.DEV) console.debug('[tms:complete]', r);
          }}
        />
      </main>
    )}
  </StrictMode>,
);
