/**
 * Contact shadows: one occlusion map of the ground around the eye, drawn on
 * the GPU from the footprints of everything that stands there (stones, rocks,
 * tufts, dwarf shrubs, shrubs, trunks and crowns) and read by the ground's
 * material — the soil darkens softly under and round each of them, so nothing
 * looks set down on the ground: it sits in it. The sun's shadow says where the
 * light is blocked; this says where the sky is.
 *
 * Each footprint is a soft disc (dense in the middle, a long tail to its rim)
 * multiplied into a white target seen from straight above. ±CONTACT_HALF_M
 * around its centre, ~8 cm a texel; redrawn when the eye has moved
 * CONTACT_STEP_M from it (the ground's material fades it out at its rim, so a
 * redraw never shows).
 */
import {
  InstancedBufferAttribute,
  InstancedMesh,
  LinearFilter,
  MultiplyBlending,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector4,
  WebGLRenderTarget,
  Color,
  type WebGLRenderer,
} from 'three';

export const CONTACT_HALF_M = 42;
export const CONTACT_STEP_M = 9;
const RES = 1024;

/** x, z, radius (m), strength 0…1 */
export type Footprint = [number, number, number, number];

export class ContactMap {
  readonly target = new WebGLRenderTarget(RES, RES, { format: RGBAFormat, type: UnsignedByteType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
  /** xz of the map's corner and 1 / its size, for the ground's uniform */
  readonly rect = new Vector4(0, 0, 0, 0);
  center: { x: number; z: number } | null = null;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-CONTACT_HALF_M, CONTACT_HALF_M, CONTACT_HALF_M, -CONTACT_HALF_M, 0.1, 100);
  private readonly geo = new PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  private readonly mat = new ShaderMaterial({
    blending: MultiplyBlending,
    premultipliedAlpha: true,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute vec4 aBlob;
      varying vec2 vQ;
      varying float vK;
      void main() {
        vQ = position.xz;
        vK = aBlob.w;
        vec3 p = vec3(aBlob.x + position.x * aBlob.z, 0.0, aBlob.y + position.z * aBlob.z);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vQ;
      varying float vK;
      void main() {
        float d2 = dot(vQ, vQ);
        if (d2 >= 1.0) discard;
        float f = (1.0 - d2) * (1.0 - d2);
        float v = 1.0 - vK * f;
        gl_FragColor = vec4(v, v, v, 1.0);
      }`,
  });
  private mesh: InstancedMesh | null = null;

  constructor() {
    this.camera.position.set(0, 50, 0);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(0, 0, 0);
  }

  /** Draw the footprints within reach of (x, z). */
  draw(gl: WebGLRenderer, x: number, z: number, prints: readonly Footprint[]) {
    const near = prints.filter((p) => Math.abs(p[0] - x) < CONTACT_HALF_M + p[2] && Math.abs(p[1] - z) < CONTACT_HALF_M + p[2]);
    if (!this.mesh || this.mesh.instanceMatrix.count < near.length) {
      if (this.mesh) {
        this.scene.remove(this.mesh);
        this.mesh.dispose();
      }
      this.mesh = new InstancedMesh(this.geo, this.mat, Math.max(1024, Math.ceil(near.length * 1.3)));
      this.mesh.frustumCulled = false;
      this.geo.setAttribute('aBlob', new InstancedBufferAttribute(new Float32Array(this.mesh.instanceMatrix.count * 4), 4));
      this.scene.add(this.mesh);
    }
    const a = this.geo.getAttribute('aBlob') as InstancedBufferAttribute;
    const arr = a.array as Float32Array;
    near.forEach((p, k) => arr.set(p, k * 4));
    a.needsUpdate = true;
    this.mesh.count = near.length;
    this.camera.position.set(x, 50, z);
    this.camera.lookAt(x, 0, z);
    this.camera.updateMatrixWorld();
    const prevTarget = gl.getRenderTarget();
    const prevClear = gl.getClearColor(new Color());
    const prevAlpha = gl.getClearAlpha();
    gl.setRenderTarget(this.target);
    gl.setClearColor(0xffffff, 1);
    gl.clear(true, false, false);
    gl.render(this.scene, this.camera);
    gl.setRenderTarget(prevTarget);
    gl.setClearColor(prevClear, prevAlpha);
    this.center = { x, z };
    // (xz − corner) / size; seen from above with north up, so the ground reads v as 1 − that
    this.rect.set(x - CONTACT_HALF_M, z - CONTACT_HALF_M, 1 / (2 * CONTACT_HALF_M), 0);
  }

  dispose() {
    this.target.dispose();
    this.geo.dispose();
    this.mat.dispose();
    this.mesh?.dispose();
  }
}
