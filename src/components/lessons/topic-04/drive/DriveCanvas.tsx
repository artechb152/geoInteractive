'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Environment, Sky } from '@react-three/drei';
import { Bloom, EffectComposer, SMAA, SSAO, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
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
  const { sunPosition, turbidity, rayleigh, mieCoefficient, mieDirectionalG } = soil.visual.atmosphere;
  const sunDir = useMemo(() => new THREE.Vector3(...sunPosition).normalize(), [sunPosition]);
  const lightPos: [number, number, number] = [sunDir.x * 22, Math.max(sunDir.y * 22, 10), sunDir.z * 22];

  return (
    <div ref={ref} className="size-full">
      <Canvas
        className="size-full"
        shadows="soft"
        dpr={[1, 1.75]}
        frameloop={inView ? 'always' : 'never'}
        camera={{ fov: 55, near: 0.1, far: 110, position: [0, 3, 8] }}
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
      >
        {/* Bakes our own physical-sky shader into a small cubemap once (no
            network fetch — self-contained, unlike drei's HDRI presets) and
            uses it both as the visible background AND as scene.environment,
            so terrain/vehicle PBR materials pick up real sky reflections. */}
        <Environment background resolution={256} frames={1} environmentIntensity={0.55} backgroundIntensity={1}>
          <Sky
            sunPosition={sunPosition}
            turbidity={turbidity}
            rayleigh={rayleigh}
            mieCoefficient={mieCoefficient}
            mieDirectionalG={mieDirectionalG}
          />
        </Environment>

        <fog attach="fog" args={[soil.visual.fog, 14, 50]} />
        {/* Kept low — the baked sky Environment above already supplies most
            of the ambient/fill light via IBL; these are just a small nudge
            so shadow-side surfaces aren't pure black. */}
        <ambientLight intensity={0.15} color={soil.visual.ambient} />
        <hemisphereLight args={[soil.visual.sky, soil.visual.ambient, 0.28]} />
        <directionalLight
          position={lightPos}
          intensity={1.1}
          color={soil.visual.sun}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-18}
          shadow-camera-right={18}
          shadow-camera-top={18}
          shadow-camera-bottom={-18}
          shadow-bias={-0.0012}
          shadow-normalBias={0.02}
        />

        {/* Separate Suspense boundaries: swapping terrain textures on soil switch
            must not unmount (and re-load) the vehicle + its controller/camera state. */}
        <Suspense fallback={null}>
          <Terrain soil={soil} heightAt={heightAt} />
        </Suspense>
        <Suspense fallback={null}>
          <VehicleRig soil={soil} heightAt={heightAt} active={active} recoverToken={recoverToken} onStatus={onStatus} />
        </Suspense>

        <EffectComposer multisampling={0} enableNormalPass>
          <SSAO
            intensity={22}
            radius={0.28}
            luminanceInfluence={0.4}
            distanceThreshold={1.0}
            distanceFalloff={0.5}
            worldDistanceThreshold={1.0}
            worldDistanceFalloff={0.5}
            worldProximityThreshold={0.2}
            worldProximityFalloff={0.2}
            resolutionScale={0.75}
          />
          {/* High threshold so only near-white highlights (sun glint, hot
              glass/metal speculars) bloom — the earlier low threshold caught
              the sky itself and washed out the whole frame via mipmapBlur. */}
          <Bloom intensity={0.25} luminanceThreshold={0.97} luminanceSmoothing={0.15} radius={0.3} />
          <Vignette eskil={false} offset={0.18} darkness={0.55} blendFunction={BlendFunction.NORMAL} />
          <SMAA />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
