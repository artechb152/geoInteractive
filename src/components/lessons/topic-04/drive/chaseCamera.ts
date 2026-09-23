import * as THREE from 'three';
import type { HeightSampler } from './heightfield';
import { MAX_SPEED, type VehiclePose } from './vehicleController';

/**
 * Composition-driven chase camera for the driving lab.
 *
 * Instead of aiming at a point ahead of the vehicle (which lets the vehicle
 * drift around the frame as distance/height/FOV change), the camera is
 * framed in screen space: it looks at the vehicle, then rotates so the
 * vehicle lands on fixed frame coordinates — just right of centre, on the
 * lower third. Everything else (distance, FOV, elevation) can then move
 * without breaking the composition.
 *
 *   - Horizon sits near the upper third (set by ELEVATION + FRAME_Y).
 *   - Camera is offset slightly to the vehicle's left, so the wheels and
 *     suspension are seen in 3/4 and the path ahead opens up diagonally
 *     from the vehicle toward the vanishing point (right→left, matching the
 *     page's RTL reading direction).
 *   - Terrain look-ahead: rising ground ahead lowers the camera so the crest
 *     stays visible above the vehicle; falling ground raises it so the
 *     descent is visible beyond it.
 *   - Speed gently pulls the camera back and widens the FOV a few degrees.
 *
 * Motion-comfort rules: everything is low-pass filtered (no high-frequency
 * shake), horizon lean is capped at ~1°, and prefers-reduced-motion drops
 * the speed/suspension-coupled motion entirely.
 */

export type ChaseCameraSettings = {
  /** Vertical FOV (deg) at rest / at top speed. */
  fov: number;
  fovAtSpeed: number;
  /** Horizontal distance (m) behind the vehicle at rest / at top speed. */
  distance: number;
  distanceAtSpeed: number;
  /** Camera elevation angle (deg) above the vehicle's framing anchor, on flat ground. */
  elevation: number;
  /** Elevation clamp (deg) after terrain look-ahead adjustment. */
  minElevation: number;
  maxElevation: number;
  /** Sideways camera offset (m) toward the vehicle's left — reveals the 3/4 view. */
  lateral: number;
  /** Height (m) of the vehicle's visual centre above its ground point — what gets framed. */
  anchorHeight: number;
  /** Where the anchor lands on screen, in NDC (-1..1). */
  frameX: number;
  frameY: number;
  /** How far ahead (m) terrain is sampled at rest / at top speed. */
  lookAhead: number;
  lookAheadAtSpeed: number;
  /** Fraction of the terrain slope ahead applied to the elevation. */
  terrainInfluence: number;
  /** Minimum clearance (m) between the camera / its sight line and the ground. */
  clearance: number;
  /** Fraction of the chassis roll the camera leans with, and the cap (rad). */
  rollCoupling: number;
  maxRoll: number;
};

// Tuned by projecting the vehicle's silhouette (scripts/blender/build_vehicle.py
// dimensions) at a ~1.3 aspect: at rest the vehicle spans ≈45–88% of frame
// height (centre ≈66%, clear of the HUD's bottom row) and ≈30% of its width;
// horizon ≈36% from the top. At top speed it still fills ≈35% of the height.
export const DEFAULT_CHASE_CAMERA: ChaseCameraSettings = {
  fov: 52,
  fovAtSpeed: 56,
  distance: 6,
  distanceAtSpeed: 6.8,
  elevation: 16,
  minElevation: 9,
  maxElevation: 22,
  lateral: 0.8,
  anchorHeight: 0.9,
  frameX: 0.12,
  frameY: -0.27,
  lookAhead: 9,
  lookAheadAtSpeed: 13,
  terrainInfluence: 0.45,
  clearance: 0.9,
  rollCoupling: 0.12,
  maxRoll: THREE.MathUtils.degToRad(1),
};

// Damping rates (1/s) — higher = tighter follow.
const YAW_RATE = 3;
const ANCHOR_Y_RATE = 4.5;
const SPEED_RATE = 1.2;
const TERRAIN_RATE = 1.6;
const LIFT_RATE = 6;
const ROLL_RATE = 3;

/** A frame-to-frame jump larger than this (m) is a teleport (recover / soil switch) — snap instead of swooping. */
const TELEPORT_DISTANCE = 3;

function dampAngle(current: number, target: number, rate: number, dt: number) {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * (1 - Math.exp(-rate * dt));
}

export class ChaseCamera {
  private heightAt: HeightSampler;
  private readonly settings: ChaseCameraSettings;

  private initialized = false;
  private yaw = 0;
  private anchorY = 0;
  private speed01 = 0;
  private terrainTilt = 0;
  private lift = 0;
  private roll = 0;
  private readonly lastPosition = new THREE.Vector3();
  private readonly anchor = new THREE.Vector3();

  constructor(heightAt: HeightSampler, settings: Partial<ChaseCameraSettings> = {}) {
    this.heightAt = heightAt;
    this.settings = { ...DEFAULT_CHASE_CAMERA, ...settings };
  }

  setHeightSampler(heightAt: HeightSampler) {
    this.heightAt = heightAt;
    this.snap();
  }

  /** Next update jumps straight to the target framing instead of easing in. */
  snap() {
    this.initialized = false;
  }

  update(camera: THREE.PerspectiveCamera, pose: VehiclePose, delta: number, reducedMotion: boolean) {
    const s = this.settings;
    const dt = Math.min(delta, 1 / 20);
    const { position, heading } = pose;

    if (this.initialized && position.distanceTo(this.lastPosition) > TELEPORT_DISTANCE) this.initialized = false;
    this.lastPosition.copy(position);

    // --- targets ---
    const speedTarget = reducedMotion ? 0 : THREE.MathUtils.clamp(pose.speedKph / 3.6 / MAX_SPEED, 0, 1);
    const fwdX = Math.sin(heading);
    const fwdZ = -Math.cos(heading);
    const aheadDist = THREE.MathUtils.lerp(s.lookAhead, s.lookAheadAtSpeed, this.speed01);
    // Two samples along the heading, averaged, so a single bump doesn't swing the camera.
    const hAhead =
      (this.heightAt(position.x + fwdX * aheadDist, position.z + fwdZ * aheadDist) +
        this.heightAt(position.x + fwdX * aheadDist * 0.6, position.z + fwdZ * aheadDist * 0.6)) /
      2;
    const slopeAhead = Math.atan2(hAhead - position.y, aheadDist * 0.8);
    const tiltTarget = slopeAhead * s.terrainInfluence;
    const rollTarget = reducedMotion ? 0 : THREE.MathUtils.clamp(pose.roll * s.rollCoupling, -s.maxRoll, s.maxRoll);

    if (!this.initialized) {
      this.yaw = heading;
      this.anchorY = position.y + s.anchorHeight;
      this.speed01 = speedTarget;
      this.terrainTilt = tiltTarget;
      this.lift = 0;
      this.roll = rollTarget;
    } else {
      this.yaw = dampAngle(this.yaw, heading, YAW_RATE, dt);
      this.anchorY = THREE.MathUtils.damp(this.anchorY, position.y + s.anchorHeight, ANCHOR_Y_RATE, dt);
      this.speed01 = THREE.MathUtils.damp(this.speed01, speedTarget, SPEED_RATE, dt);
      this.terrainTilt = THREE.MathUtils.damp(this.terrainTilt, tiltTarget, TERRAIN_RATE, dt);
      this.roll = THREE.MathUtils.damp(this.roll, rollTarget, ROLL_RATE, dt);
    }

    // --- spring-arm placement (in the smoothed yaw frame) ---
    // Anchor XZ follows the vehicle rigidly (its motion is already smooth);
    // only the vertical is low-passed, so terrain bumps show as the vehicle
    // working on its suspension inside a steady frame.
    this.anchor.set(position.x, this.anchorY, position.z);
    const camFwdX = Math.sin(this.yaw);
    const camFwdZ = -Math.cos(this.yaw);
    // Vehicle-right = forward × up.
    const rightX = -camFwdZ;
    const rightZ = camFwdX;

    const distance = THREE.MathUtils.lerp(s.distance, s.distanceAtSpeed, this.speed01);
    const elevation = THREE.MathUtils.clamp(
      s.elevation - THREE.MathUtils.radToDeg(this.terrainTilt),
      s.minElevation,
      s.maxElevation,
    );
    const camX = this.anchor.x - camFwdX * distance - rightX * s.lateral;
    const camZ = this.anchor.z - camFwdZ * distance - rightZ * s.lateral;
    let camY = this.anchor.y + distance * Math.tan(THREE.MathUtils.degToRad(elevation));

    // --- terrain clearance: stay above the ground under the camera, and keep
    // the sight line to the vehicle clear of any ridge between them ---
    const groundUnderCam = this.heightAt(camX, camZ);
    const groundMid = this.heightAt((camX + this.anchor.x) / 2, (camZ + this.anchor.z) / 2);
    const neededY = Math.max(groundUnderCam + s.clearance, 2 * (groundMid + s.clearance * 0.6) - this.anchor.y);
    const liftTarget = Math.max(0, neededY - camY);
    this.lift = this.initialized ? THREE.MathUtils.damp(this.lift, liftTarget, LIFT_RATE, dt) : liftTarget;
    camY = Math.max(camY + this.lift, groundUnderCam + 0.4);

    camera.position.set(camX, camY, camZ);

    // --- screen-space framing ---
    const fov = THREE.MathUtils.lerp(s.fov, s.fovAtSpeed, this.speed01);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.lookAt(this.anchor);
    camera.rotateY(Math.atan(s.frameX * tanHalf * camera.aspect));
    camera.rotateX(Math.atan(-s.frameY * tanHalf));
    camera.rotateZ(this.roll);

    this.initialized = true;
  }
}
