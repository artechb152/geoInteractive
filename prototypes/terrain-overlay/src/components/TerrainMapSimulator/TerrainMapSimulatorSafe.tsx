'use client';

import ErrorBoundary from './ErrorBoundary';
import TerrainMapSimulator, { type TerrainMapSimulatorProps } from './TerrainMapSimulator';

/**
 * העטיפה שמיוצאת החוצה: אותו רכיב, בתוך גדר בטיחות.
 */
export default function TerrainMapSimulatorSafe(props: TerrainMapSimulatorProps) {
  return (
    <ErrorBoundary onError={(error) => props.onEvent?.({ type: 'error', message: error.message })}>
      <TerrainMapSimulator {...props} />
    </ErrorBoundary>
  );
}
