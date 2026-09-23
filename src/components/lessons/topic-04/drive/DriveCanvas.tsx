'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { DriveAtmosphere } from './DriveAtmosphere';
import { getAtmosphere, OCCLUSION_TINT } from './atmosphere';
import { Terrain } from './Terrain';
import { HorizonBackdrop } from './HorizonBackdrop';
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
  const mood = useMemo(() => getAtmosphere(soil), [soil]);

  return (
    <div ref={ref} className="size-full">
      <Canvas
        className="size-full"
        // PCF + per-light shadow.radius (DriveAtmosphere) — three r18x
        // deprecated PCFSoftShadowMap and silently falls back to PCF anyway.
        shadows="percentage"
        dpr={[1, 1.75]}
        frameloop={inView ? 'always' : 'never'}
        // fov/position are only the pre-first-frame defaults — ChaseCamera
        // (chaseCamera.ts) owns both from the first frame on. `far` has to
        // reach the HorizonBackdrop ridges from anywhere on the tile.
        camera={{ fov: 52, near: 0.1, far: 170, position: [0, 3, 8] }}
        // No renderer tone mapping: EffectComposer forces it off while it
        // owns the frame, so the <ToneMapping> effect below does it instead.
        gl={{ antialias: false }}
      >
        {/* Sun, baked sky light, visible sky and haze — see atmosphere.ts. */}
        <DriveAtmosphere mood={mood} moodKey={soil.id} />

        {/* Separate Suspense boundaries: swapping terrain textures on soil switch
            must not unmount (and re-load) the vehicle + its controller/camera state. */}
        <Suspense fallback={null}>
          <Terrain soil={soil} heightAt={heightAt} />
        </Suspense>
        <HorizonBackdrop soil={soil} />
        <Suspense fallback={null}>
          <VehicleRig soil={soil} heightAt={heightAt} active={active} recoverToken={recoverToken} onStatus={onStatus} />
        </Suspense>

        <EffectComposer multisampling={0}>
          {/* Ground-truth-style AO (must be the first pass): world-space
              radius so it grounds the wheels, stake bases, rut walls and
              ledge risers, tinted warm umber instead of grey. Half-res keeps
              it cheap on integrated GPUs; reconstructs normals from depth,
              so no extra normal pass. */}
          <N8AO halfRes quality="medium" aoRadius={1.6} distanceFalloff={1.2} intensity={2.2} color={OCCLUSION_TINT} />
          {/* HDR threshold above lit ground — ≈1.25 on flat sunlit sand, up
              to ≈1.75 on sand/chalk slopes facing the sun — so only the sun
              disc and specular glints bloom, never whole hillsides. Runs
              before tone mapping. */}
          <Bloom mipmapBlur intensity={0.3} luminanceThreshold={1.9} luminanceSmoothing={0.25} radius={0.55} />
          {/* Khronos PBR Neutral: filmic highlight roll-off without shifting
              hues, so the cream / sage / muted-orange palette stays on-brand. */}
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <Vignette eskil={false} offset={0.3} darkness={0.28} blendFunction={BlendFunction.NORMAL} />
          <SMAA />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
