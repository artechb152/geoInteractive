'use client';
/**
 * QualityComposer — @react-three/postprocessing's <EffectComposer>, kept at QualityCanvas's pixel
 * ratio. The composer only resizes itself when the canvas's CSS size changes, so when QualityCanvas
 * lowers the pixel ratio of a moving view on a weak GPU, every pass (the scene render, MSAA, N8AO,
 * bloom) would still run at the old one and only the final copy would shrink — the frame looks softer
 * and costs the same. Use it in place of <EffectComposer> (`npm run check:3d` enforces this).
 */
import { useLayoutEffect, useRef, type ComponentProps } from 'react';
import { useThree } from '@react-three/fiber';
import { EffectComposer } from '@react-three/postprocessing';
import type { EffectComposer as Composer } from 'postprocessing';
import * as THREE from 'three';

export function QualityComposer(props: ComponentProps<typeof EffectComposer>) {
  const composer = useRef<Composer>(null);
  const gl = useThree((s) => s.gl);
  const dpr = useThree((s) => s.viewport.dpr);
  useLayoutEffect(() => {
    const size = gl.getSize(new THREE.Vector2());
    // re-reads the drawing-buffer size, which carries the pixel ratio
    composer.current?.setSize(size.width, size.height);
  }, [gl, dpr]);
  return <EffectComposer {...props} ref={composer} />;
}
