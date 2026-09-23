import { Sky } from "@react-three/drei";

import { ENV } from "@/lib/style";

export function Lighting() {
  return (
    <>
      <ambientLight intensity={ENV.ambientIntensity} color={ENV.ambientColor} />
      <hemisphereLight args={[ENV.hemiSky, ENV.hemiGround, ENV.hemiIntensity]} />

      {/* Cinematic key light (warm sun) with soft, high-resolution shadows */}
      <directionalLight
        position={ENV.sunPosition}
        intensity={ENV.sunIntensity}
        color={ENV.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00035}
        shadow-normalBias={0.025}
        shadow-radius={6}
        shadow-camera-near={1}
        shadow-camera-far={540}
        shadow-camera-left={-170}
        shadow-camera-right={170}
        shadow-camera-top={170}
        shadow-camera-bottom={-170}
      />

      {/* Cool sky fill from the opposite side */}
      <directionalLight
        position={[120, 70, -90]}
        intensity={ENV.fillIntensity}
        color={ENV.fillColor}
      />

      {/* Warm low rim light raking the eastern ridge for separation */}
      <directionalLight
        position={[180, 26, -40]}
        intensity={ENV.rimIntensity}
        color={ENV.rimColor}
      />

      <Sky
        distance={2000}
        sunPosition={ENV.sunPosition}
        turbidity={10}
        rayleigh={2.2}
        mieCoefficient={0.005}
        mieDirectionalG={0.86}
      />
    </>
  );
}
