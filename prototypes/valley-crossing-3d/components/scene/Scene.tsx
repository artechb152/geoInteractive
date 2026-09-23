"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import {
  EffectComposer,
  Bloom,
  Vignette,
  BrightnessContrast,
  HueSaturation,
} from "@react-three/postprocessing";
import { useSim } from "@/lib/store";
import { ENV } from "@/lib/style";
import { CAMERA_POSES } from "@/lib/scenario";

import { Lighting } from "./Lighting";
import { Terrain } from "./Terrain";
import { Water } from "./Water";
import { Road } from "./Road";
import { Bridge } from "./Bridge";
import { Village } from "./Village";
import { Vegetation } from "./Vegetation";
import { Rocks } from "./Rocks";
import { Infantry } from "./Infantry";
import { Civilians } from "./Civilians";
import { CameraRig } from "./CameraRig";

import { DangerZones } from "@/components/tactical/DangerZones";
import { Routes } from "@/components/tactical/Routes";
import { LineOfSight } from "@/components/tactical/LineOfSight";
import { UnitMarkers } from "@/components/tactical/UnitMarkers";
import { Highlights } from "@/components/tactical/Highlights";
import { ClickableElements } from "@/components/tactical/ClickableElements";
import { Labels } from "@/components/tactical/Labels";

export function Scene() {
  const setBooted = useSim((s) => s.setBooted);

  return (
    <Canvas
      className="scene-canvas"
      shadows
      dpr={[1, 1.6]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{
        position: CAMERA_POSES.strategic.position,
        fov: 42,
        near: 0.5,
        far: 3000,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        setBooted(true);
      }}
    >
      <color attach="background" args={[ENV.bgTop]} />
      <fog attach="fog" args={[ENV.fogColor, ENV.fogNear, ENV.fogFar]} />

      <Lighting />

      <Suspense fallback={null}>
        <Terrain />
        <Water />
        <Road />
        <Bridge />
        <Village />
        <Vegetation />
        <Rocks />
        <Civilians />

        <DangerZones />
        <Routes />
        <LineOfSight />
        <Infantry />
        <UnitMarkers />
        <Highlights />
        <ClickableElements />
        <Labels />
      </Suspense>

      <CameraRig />

      <EffectComposer multisampling={2}>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.9}
          luminanceSmoothing={0.22}
          mipmapBlur
          radius={0.6}
        />
        <HueSaturation saturation={0.1} hue={0} />
        <BrightnessContrast brightness={0} contrast={0.07} />
        <Vignette offset={0.32} darkness={0.55} />
      </EffectComposer>
    </Canvas>
  );
}
