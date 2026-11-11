/**
 * One WebGL probe per page: whether the browser gives three.js the WebGL 2 context it needs, and
 * which GPU would draw it (for lib/gpu-tier). Every 3D model asks here instead of opening a canvas
 * of its own: each probe context costs a driver round-trip, and one left for the garbage collector
 * counts against Chrome's ~16 live contexts — past that the oldest live one, possibly a model's, is
 * lost. The probe's context is released at once.
 */
export type WebGLProbe = {
  /** A WebGL 2 context is available (three.js needs it). */
  webgl2: boolean;
  /** The unmasked renderer string ('' when the browser hides it or there is no context). */
  renderer: string;
  /** The browser would only give the context with a major performance caveat (drawing on the CPU). */
  caveat: boolean;
};

let probe: WebGLProbe | null = null;

function rendererOf(gl: WebGL2RenderingContext): string {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  return String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
}

function run(): WebGLProbe {
  try {
    // A context the browser would only give on the CPU fails with the caveat flag set.
    const fast = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    const gl = fast ?? document.createElement('canvas').getContext('webgl2');
    if (!gl) return { webgl2: false, renderer: '', caveat: false };
    const renderer = rendererOf(gl);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { webgl2: true, renderer, caveat: !fast };
  } catch {
    return { webgl2: false, renderer: '', caveat: false };
  }
}

/** The page's WebGL probe (run on first use; on the server: available, renderer unknown). */
export function webglProbe(): WebGLProbe {
  if (typeof window === 'undefined') return { webgl2: true, renderer: '', caveat: false };
  probe ??= run();
  return probe;
}

/** Whether the 3D models can draw here — false means: show the still. */
export function hasWebGL(): boolean {
  return webglProbe().webgl2;
}
