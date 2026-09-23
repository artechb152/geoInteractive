'use client';

import { Component, type ReactNode, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useProgress } from '@react-three/drei';
import { Icon } from '@/components/Icon';
import { DriveHUD } from './DriveHUD';
import type { SoilConfig } from './terrainConfigs';
import type { DriveStatus } from './vehicleController';

const DriveCanvas = dynamic(() => import('./DriveCanvas').then((m) => m.DriveCanvas), {
  ssr: false,
  loading: () => null,
});

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

class DriveErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function ProgressOverlay() {
  const { progress, active } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-bg-elevated">
      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-border">
        <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${Math.round(progress)}%` }} />
      </div>
      <div className="text-sm font-display font-semibold text-fg-muted">טוען סביבת נהיגה… {Math.round(progress)}%</div>
    </div>
  );
}

/**
 * Gates the heavy 3D scene behind a poster + explicit "start driving" click
 * (on-demand loading, per the brief), then behind a client-side WebGL check,
 * then behind a render error boundary — any failure at any stage falls back
 * to the poster image + surrounding lesson text, never a broken page.
 */
export function LoadingGate({ soil }: { soil: SoilConfig }) {
  const [started, setStarted] = useState(false);
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<DriveStatus>('ok');
  const [speedKph, setSpeedKph] = useState(0);
  const [recoverToken, setRecoverToken] = useState(0);

  useEffect(() => {
    setWebglOk(supportsWebGL());
  }, []);

  const unsupported = webglOk === false || failed;
  const canDrive = started && webglOk === true && !failed;

  if (!canDrive) {
    return (
      <div className="relative size-full overflow-hidden rounded-[4px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static export; images.unoptimized */}
        <img
          src={`${soil.visual.textureDir}/poster.webp`}
          alt={`תצלום קרוב של ${soil.label}`}
          className="absolute inset-0 size-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/0" />
        <div className="relative z-10 flex size-full flex-col items-center justify-end gap-3 p-6 text-center">
          {unsupported ? (
            <p className="max-w-sm rounded-[3px] bg-bg-elevated/90 px-4 py-3 text-sm font-display font-medium text-fg-muted shadow-elevated">
              הדפדפן הזה לא תומך בהדמיה תלת-ממדית כרגע. אפשר להמשיך ללמוד עם התמונה וההסברים שלמעלה — אין צורך בהדמיה כדי להבין את החומר.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setStarted(true)}
              disabled={webglOk === null}
              className="flex items-center gap-2.5 rounded-[3px] bg-cta-ember px-6 py-3 text-lg font-display font-bold text-white shadow-cta-ember transition-transform hover:scale-105 disabled:opacity-60"
            >
              <Icon name="target" size={20} strokeWidth={2.5} />
              התחל נהיגה
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative size-full overflow-hidden rounded-[4px] bg-bg-elevated">
      <DriveErrorBoundary onError={() => setFailed(true)}>
        <DriveCanvas
          soil={soil}
          active
          recoverToken={recoverToken}
          onStatus={(s, kph) => {
            setStatus(s);
            setSpeedKph(kph);
          }}
        />
      </DriveErrorBoundary>
      <ProgressOverlay />
      <DriveHUD status={status} speedKph={speedKph} onRecover={() => setRecoverToken((t) => t + 1)} onExit={() => setStarted(false)} />
    </div>
  );
}
