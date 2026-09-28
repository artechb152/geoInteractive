/**
 * rockTimelapseGL — a tiny WebGL1 player for the rock-type time-lapses.
 *
 * Two photographs of the same place, shot from the same camera (START / END),
 * are uploaded as textures; a per-rock fragment shader performs the geological
 * process between them (lava cooling front, layers settling, beds folding),
 * driven by `p` (0 → 1 process progress) and `t` (seconds, for living detail
 * like glow and drifting silt). Coordinates in the shaders: `v` is 0..1 with
 * (0, 0) at the photo's top-left, i.e. the same frame as the SVG overlay.
 */

const VERTEX = `
attribute vec2 aPos;
varying vec2 v;
void main() {
  v = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/** Shared GLSL: precision, inputs, value noise and timing helpers. */
export const GLSL_PRELUDE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
uniform sampler2D uA;   // START photo
uniform sampler2D uB;   // END photo
uniform float uP;       // process progress 0..1
uniform float uT;       // seconds (living detail)
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
  return s;
}
float seg(float x, float a, float b) { return clamp((x - a) / (b - a), 0.0, 1.0); }
float ease(float x) { return x * x * (3.0 - 2.0 * x); }
float gauss(float x, float c, float w) { float d = (x - c) / w; return exp(-d * d); }
`;

export type Timelapse = {
  /** Draw one frame. */
  draw: (p: number, t: number) => void;
  /** Match the drawing buffer to the canvas' CSS size (× devicePixelRatio, capped). */
  resize: () => void;
  dispose: () => void;
};

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader: ${log}`);
  }
  return sh;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image: ${src}`));
    img.src = src;
  });
}

/**
 * Resolves once both photos are on the GPU; rejects when WebGL (or an image)
 * is unavailable so the caller can fall back to a plain cross-fade.
 */
export async function createTimelapse(
  canvas: HTMLCanvasElement,
  startSrc: string,
  endSrc: string,
  fragment: string,
): Promise<Timelapse> {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) throw new Error('webgl unavailable');
  const [a, b] = await Promise.all([loadImage(startSrc), loadImage(endSrc)]);

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, GLSL_PRELUDE + fragment));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`program: ${gl.getProgramInfoLog(prog)}`);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const textures = [a, b].map((img, unit) => {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    return tex;
  });
  gl.uniform1i(gl.getUniformLocation(prog, 'uA'), 0);
  gl.uniform1i(gl.getUniformLocation(prog, 'uB'), 1);
  const uP = gl.getUniformLocation(prog, 'uP');
  const uT = gl.getUniformLocation(prog, 'uT');

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();

  return {
    draw(p, t) {
      // re-bind every frame: a second player on the same context (React dev double-mount) may have
      // bound its own textures in between
      gl.useProgram(prog);
      textures.forEach((tex, unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
      });
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(uP, p);
      gl.uniform1f(uT, t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    resize,
    dispose() {
      textures.forEach((tex) => gl.deleteTexture(tex));
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    },
  };
}
