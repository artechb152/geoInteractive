import { normalizeDegrees, signedTurn } from '../locationCheckGeometry';

/**
 * Where the navigator looks — an absolute azimuth (yaw, clockwise from north)
 * and a pitch, both in degrees — kept outside React: the canvas reads it every
 * frame and the compass and readouts subscribe, so turning the head never
 * re-renders the activity. Looking around never changes the walking azimuth;
 * the activity turns the head back to it when a segment starts.
 */
export const DEFAULT_PITCH = -4;
export const PITCH_MIN = -32;
export const PITCH_MAX = 14;

export class LookRig {
  yaw = 0;
  pitch = DEFAULT_PITCH;
  private tYaw = 0;
  private tPitch = DEFAULT_PITCH;
  private listeners = new Set<() => void>();
  private lastYaw = NaN;
  private lastPitch = NaN;

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    if (!Number.isNaN(this.lastYaw) && Math.abs(signedTurn(this.lastYaw, this.yaw)) < 0.05 && Math.abs(this.lastPitch - this.pitch) < 0.05) return;
    this.lastYaw = this.yaw;
    this.lastPitch = this.pitch;
    for (const fn of this.listeners) fn();
  }

  /** Turn towards a view (eased by `step`), or jump there. */
  aim(yaw: number, pitch = DEFAULT_PITCH, immediate = false) {
    this.tYaw = normalizeDegrees(yaw);
    this.tPitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch));
    if (immediate) {
      this.yaw = this.tYaw;
      this.pitch = this.tPitch;
      this.emit();
    }
  }

  /** A drag: the head follows the pointer directly. */
  drag(dYaw: number, dPitch: number) {
    this.yaw = normalizeDegrees(this.yaw + dYaw);
    this.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, this.pitch + dPitch));
    this.tYaw = this.yaw;
    this.tPitch = this.pitch;
    this.emit();
  }

  /** A key press: a step of the target, eased. */
  nudge(dYaw: number, dPitch: number) {
    this.tYaw = normalizeDegrees(this.tYaw + dYaw);
    this.tPitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, this.tPitch + dPitch));
  }

  get target() {
    return { yaw: this.tYaw, pitch: this.tPitch };
  }

  /** Ease towards the target (critically damped feel); returns whether anything moved. */
  step(dt: number, reduce: boolean): boolean {
    const dy = signedTurn(this.yaw, this.tYaw);
    const dp = this.tPitch - this.pitch;
    if (Math.abs(dy) < 0.01 && Math.abs(dp) < 0.01) return false;
    const k = reduce ? 1 : 1 - Math.exp(-dt * 7);
    this.yaw = normalizeDegrees(this.yaw + dy * k);
    this.pitch += dp * k;
    this.emit();
    return true;
  }
}
