/**
 * How strong the GPU that draws the course's 3D models is — read once per page from the WebGL
 * renderer, so QualityCanvas can start a weak GPU at a resolution it holds instead of learning it
 * from a few slow frames first.
 *
 * - 'software': no GPU — the browser draws on the CPU (SwiftShader, llvmpipe, Microsoft Basic
 *   Render Driver), usually because hardware acceleration is off or the driver is blocklisted.
 * - 'low': an integrated GPU (Intel UHD / HD / Iris, AMD Radeon Graphics APUs, phone GPUs).
 * - 'high': everything else.
 *
 * Override on a misjudged machine, or for QA: `?gpu=high|low|software` (kept in
 * localStorage['geo:gpu']); `?gpu=auto` clears it.
 */
import { webglProbe } from './webgl-support';

export type GpuTier = 'high' | 'low' | 'software';

const FLAG_KEY = 'geo:gpu';
const TIERS: readonly GpuTier[] = ['high', 'low', 'software'];

const SOFTWARE = /swiftshader|llvmpipe|softpipe|lavapipe|software|basic render/i;
// Intel Arc is a discrete card: "Intel(R) Arc(TM) A770 Graphics".
const INTEGRATED = /intel(?!.*\barc\b)|radeon\(tm\) graphics|radeon graphics|vega \d+ graphics|radeon r\d graphics|mali|adreno|powervr|videocore/i;

let cached: GpuTier | null = null;

export function classifyRenderer(renderer: string, majorPerformanceCaveat: boolean): GpuTier {
  if (majorPerformanceCaveat || SOFTWARE.test(renderer)) return 'software';
  return INTEGRATED.test(renderer) ? 'low' : 'high';
}

function override(): GpuTier | null {
  try {
    const asked = new URLSearchParams(window.location.search).get('gpu');
    if (asked === 'auto') window.localStorage.removeItem(FLAG_KEY);
    else if (asked && (TIERS as readonly string[]).includes(asked)) window.localStorage.setItem(FLAG_KEY, asked);
    const kept = window.localStorage.getItem(FLAG_KEY);
    return kept && (TIERS as readonly string[]).includes(kept) ? (kept as GpuTier) : null;
  } catch {
    return null;
  }
}

function detect(): GpuTier {
  const probe = webglProbe();
  if (!probe.webgl2) return 'software';
  return classifyRenderer(probe.renderer, probe.caveat);
}

/** The GPU tier of this browser ('high' on the server). */
export function gpuTier(): GpuTier {
  if (typeof window === 'undefined') return 'high';
  cached ??= override() ?? detect();
  return cached;
}
