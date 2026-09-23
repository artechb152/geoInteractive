'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Terrain } from './Terrain';
import { VehicleRig } from './Vehicle';
import { createHeightSampler } from './heightfield';
import type { SoilConfig } from './terrainConfigs';
import type { DriveStatus } from './vehicleController';

/** Pauses the R3F render/physics loop entirely while the canvas is scrolled
 * out of view or the tab is backgrounded — this is the only render-heavy
 * element on the page, so it's the one that has to earn its keep. */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(el);
    const onVisibility = () => setInView(!document.hidden && el.getBoundingClientRect().bottom > 0);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return { ref, inView };
}

export function DriveCanvas({
  soil,
  active,
  recoverToken,
  onStatus,
}: {
  soil: SoilConfig;
  active: boolean;
  recoverToken: number;
  onStatus: (status: DriveStatus, speedKph: number) => void;
}) {
  const heightAt = useMemo(() => createHeightSampler(soil), [soil]);
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div ref={ref} className="size-full">
      <Canvas
        className="size-full"
        shadows="soft"
        dpr={[1, 1.75]}
        frameloop={inView ? 'always' : 'never'}
        camera={{ fov: 55, near: 0.1, far: 90, position: [0, 3, 8] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <color attach="background" args={[soil.visual.sky]} />
        <fog attach="fog" args={[soil.visual.fog, 16, 48]} />
        <ambientLight intensity={0.6} color={soil.visual.ambient} />
        <hemisphereLight args={[soil.visual.sky, soil.visual.ambient, 0.45]} />
        <directionalLight
          position={[9, 13, 6]}
          intensity={1.15}
          color={soil.visual.sun}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-18}
          shadow-camera-right={18}
          shadow-camera-top={18}
          shadow-camera-bottom={-18}
          shadow-bias={-0.0015}
        />

        {/* Separate Suspense boundaries: swapping terrain textures on soil switch
            must not unmount (and re-load) the vehicle + its controller/camera state. */}
        <Suspense fallback={null}>
          <Terrain soil={soil} heightAt={heightAt} />
        </Suspense>
        <Suspense fallback={null}>
          <VehicleRig soil={soil} heightAt={heightAt} active={active} recoverToken={recoverToken} onStatus={onStatus} />
        </Suspense>
      </Canvas>
    </div>
  );
}
