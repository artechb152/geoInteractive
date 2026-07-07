'use client';

import { Component, type ReactNode, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const InteractiveHomeTerrainModel = dynamic(() => import('./InteractiveHomeTerrainModel'), {
  ssr: false,
  loading: () => <StaticTerrainFallback />,
});

/** Original static render — used before hydration, when WebGL is missing, and if the 3D scene throws. */
function StaticTerrainFallback() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized
    <img
      src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/isometric/home-hero-terrain-mockup.png`}
      alt="דיורמת שטח טופוגרפית — שכבות נייר, נהר ודגל מטרה"
      width={706}
      height={492}
      draggable={false}
      className="size-full object-contain"
    />
  );
}

class TerrainErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return <StaticTerrainFallback />;
    return this.props.children;
  }
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

/**
 * HomeTerrainDiorama — swaps in the interactive 3D terrain model
 * (InteractiveHomeTerrainModel) once WebGL support is confirmed client-side;
 * otherwise (or on any runtime error) keeps the original static PNG so the
 * hero never breaks.
 */
export function HomeTerrainDiorama() {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglOk(supportsWebGL());
  }, []);

  if (webglOk === null || webglOk === false) return <StaticTerrainFallback />;

  return (
    <TerrainErrorBoundary>
      <InteractiveHomeTerrainModel />
    </TerrainErrorBoundary>
  );
}
