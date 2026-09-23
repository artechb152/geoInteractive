import * as THREE from 'three';
import type { SoilConfig } from './terrainConfigs';
import { TILE_HALF_SIZE } from './terrainConfigs';
import { sampleNormal, type HeightSampler } from './heightfield';

/**
 * Arcade-style vehicle model: no rigid-body physics engine. Each wheel's
 * ground contact height comes straight from the terrain's analytic height
 * function (heightfield.ts), so there's no raycasting cost — the "physics"
 * is a hand-tuned spring/slip/sink model driven by that sampled height plus
 * per-terrain parameters (terrainConfigs.ts). Deliberately not aiming for
 * engineering accuracy — only for the terrain-to-terrain feel contrast the
 * lesson is teaching.
 */

// Must match scripts/blender/build_vehicle.py's geometry constants.
export const WHEELBASE = 2.4;
export const TRACK = 1.55;
export const WHEEL_RADIUS = 0.38;

const MAX_SPEED = 6.5; // m/s forward
const MAX_REVERSE = 3.2;
const ACCEL = 5.5;
const BRAKE_DECEL = 9;
const COAST_DECEL = 2.4;
const TURN_RATE = 1.9; // rad/s at full speed+traction
const MAX_STEER_VISUAL = 0.5; // rad, front wheel visual steer clamp

export type DriveInput = { forward: boolean; back: boolean; left: boolean; right: boolean };

export type DriveStatus = 'ok' | 'slipping' | 'sinking' | 'stuck' | 'flipped';

export type WheelPose = { spin: number; steer: number; suspension: number };

export type VehiclePose = {
  position: THREE.Vector3;
  heading: number;
  pitch: number;
  roll: number;
  wheels: { FL: WheelPose; FR: WheelPose; RL: WheelPose; RR: WheelPose };
  status: DriveStatus;
  speedKph: number;
};

const HUB_LOCAL: Record<'FL' | 'FR' | 'RL' | 'RR', THREE.Vector2> = {
  // (x = left/right, y-of-Vector2 used as local z = forward/back; forward is -z)
  FL: new THREE.Vector2(-TRACK / 2, -WHEELBASE / 2),
  FR: new THREE.Vector2(TRACK / 2, -WHEELBASE / 2),
  RL: new THREE.Vector2(-TRACK / 2, WHEELBASE / 2),
  RR: new THREE.Vector2(TRACK / 2, WHEELBASE / 2),
};

export class VehicleController {
  private soil: SoilConfig;
  private heightAt: HeightSampler;

  private position = new THREE.Vector3(0, 0, 0);
  private heading = Math.PI; // facing -Z (into the terrain, away from the camera-behind spawn)
  private speed = 0;
  private lateralVelocity = 0;
  private steerVisual = 0;
  private sinkDepth = 0;
  private stuck = false;
  private flipped = false;
  private wheelSpinAngle = 0;
  private suspension: Record<'FL' | 'FR' | 'RL' | 'RR', number> = { FL: 0, FR: 0, RL: 0, RR: 0 };
  private smoothedPitch = 0;
  private smoothedRoll = 0;
  private smoothedCenterY = 0;
  private slipEma = 0;

  constructor(soil: SoilConfig, heightAt: HeightSampler) {
    this.soil = soil;
    this.heightAt = heightAt;
    this.teleportToSpawn();
  }

  setSoil(soil: SoilConfig, heightAt: HeightSampler) {
    this.soil = soil;
    this.heightAt = heightAt;
    this.teleportToSpawn();
  }

  /** Recover button: same spawn point every terrain, so runs stay comparable. */
  teleportToSpawn() {
    this.position.set(0, 0, 0);
    this.heading = Math.PI;
    this.speed = 0;
    this.lateralVelocity = 0;
    this.steerVisual = 0;
    this.sinkDepth = 0;
    this.stuck = false;
    this.flipped = false;
    this.smoothedPitch = 0;
    this.smoothedRoll = 0;
    this.slipEma = 0;
  }

  private forwardVector(heading = this.heading) {
    return new THREE.Vector2(Math.sin(heading), -Math.cos(heading));
  }

  private hubWorld(tag: keyof typeof HUB_LOCAL) {
    const local = HUB_LOCAL[tag];
    const cos = Math.cos(this.heading);
    const sin = Math.sin(this.heading);
    // Rotate local (x, z) by heading around Y, then translate.
    const wx = this.position.x + local.x * cos + local.y * sin;
    const wz = this.position.z - local.x * sin + local.y * cos;
    return new THREE.Vector2(wx, wz);
  }

  update(delta: number, input: DriveInput): VehiclePose {
    const dt = Math.min(delta, 1 / 20);
    const { physics } = this.soil;

    if (this.stuck || this.flipped) {
      // Frozen until the driver hits "recover" — still report pose so the
      // scene keeps rendering the (stuck) vehicle in place.
      return this.composePose();
    }

    const throttle = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    const steerInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    const centerN = sampleNormal(this.heightAt, this.position.x, this.position.z);
    const slopeSteepness = 1 - centerN.y; // 0 flat .. ~0.7 steep

    // --- speed ---
    const rollingDrag = physics.rollingResistance * (1 + this.sinkDepth * 3);
    if (throttle > 0) {
      this.speed += ACCEL * physics.traction * dt;
    } else if (throttle < 0) {
      this.speed -= (this.speed > 0 ? BRAKE_DECEL : ACCEL * 0.8) * dt;
    } else {
      const decel = COAST_DECEL * dt;
      this.speed += this.speed > 0 ? -decel : this.speed < 0 ? decel : 0;
      if (Math.abs(this.speed) < decel) this.speed = 0;
    }
    this.speed -= Math.sign(this.speed) * rollingDrag * Math.abs(this.speed) * dt * 3;
    const maxFwd = MAX_SPEED * physics.topSpeedFactor * (1 - slopeSteepness * 0.35);
    this.speed = THREE.MathUtils.clamp(this.speed, -MAX_REVERSE, maxFwd);

    // --- steering + slip ---
    const speedFactor = THREE.MathUtils.clamp(Math.abs(this.speed) / 3, 0.18, 1);
    const desiredTurn = steerInput * TURN_RATE * speedFactor * Math.sign(this.speed || 1);
    const gripTurn = desiredTurn * physics.traction;
    this.heading += gripTurn * dt;

    const targetSteerVisual = steerInput * MAX_STEER_VISUAL;
    this.steerVisual = THREE.MathUtils.damp(this.steerVisual, targetSteerVisual, 8, dt);

    // Low-traction, high-speed turning kicks the tail out sideways.
    const slipDemand = Math.abs(steerInput) * (1 - physics.traction) * Math.abs(this.speed) * 0.9;
    this.lateralVelocity = THREE.MathUtils.damp(
      this.lateralVelocity,
      steerInput !== 0 ? -Math.sign(gripTurn) * slipDemand : 0,
      physics.traction * 4 + 1,
      dt,
    );
    const slipMagnitude = Math.abs(this.lateralVelocity) / 2.2 + (1 - physics.traction) * (Math.abs(this.speed) / MAX_SPEED) * 0.4;
    this.slipEma = THREE.MathUtils.damp(this.slipEma, Math.min(1, slipMagnitude), 3, dt);

    // --- integrate position ---
    const fwd = this.forwardVector();
    const right = new THREE.Vector2(fwd.y, -fwd.x);
    this.position.x += (fwd.x * this.speed + right.x * this.lateralVelocity) * dt;
    this.position.z += (fwd.y * this.speed + right.y * this.lateralVelocity) * dt;

    // --- boundary containment (soft push back toward center near the tile edge) ---
    const distFromCenter = Math.hypot(this.position.x, this.position.z);
    const limit = TILE_HALF_SIZE - 2;
    if (distFromCenter > limit) {
      const pushBack = (distFromCenter - limit) * 2.5;
      const inward = new THREE.Vector2(-this.position.x, -this.position.z).normalize();
      this.position.x += inward.x * pushBack * dt;
      this.position.z += inward.y * pushBack * dt;
      this.speed *= 0.9;
    }

    // --- sinking ---
    if (physics.sinkRate > 0) {
      const antiSink = physics.antiSinkSpeed > 0 ? Math.min(1, Math.abs(this.speed) / physics.antiSinkSpeed) : 0;
      if (antiSink < 1) {
        this.sinkDepth += physics.sinkRate * (1 - antiSink) * dt;
      } else {
        this.sinkDepth -= physics.sinkRate * 1.4 * dt;
      }
      this.sinkDepth = THREE.MathUtils.clamp(this.sinkDepth, 0, physics.stuckDepth * 1.15);
      if (this.sinkDepth >= physics.stuckDepth) {
        this.stuck = true;
        this.speed = 0;
        this.lateralVelocity = 0;
      }
    }

    // --- suspension / chassis attitude from the four wheel contact heights ---
    const heights: Record<'FL' | 'FR' | 'RL' | 'RR', number> = {
      FL: this.heightAt(...this.hubWorld('FL').toArray() as [number, number]),
      FR: this.heightAt(...this.hubWorld('FR').toArray() as [number, number]),
      RL: this.heightAt(...this.hubWorld('RL').toArray() as [number, number]),
      RR: this.heightAt(...this.hubWorld('RR').toArray() as [number, number]),
    };
    const avgFront = (heights.FL + heights.FR) / 2;
    const avgRear = (heights.RL + heights.RR) / 2;
    const avgLeft = (heights.FL + heights.RL) / 2;
    const avgRight = (heights.FR + heights.RR) / 2;
    const centerHeight = (heights.FL + heights.FR + heights.RL + heights.RR) / 4;

    const targetPitch = Math.atan2(avgRear - avgFront, WHEELBASE) * physics.bumpiness;
    const targetRoll = Math.atan2(avgRight - avgLeft, TRACK) * physics.bumpiness;
    const dampSpeed = 10 + physics.bumpiness * 3;
    this.smoothedPitch = THREE.MathUtils.damp(this.smoothedPitch, targetPitch, dampSpeed, dt);
    this.smoothedRoll = THREE.MathUtils.damp(this.smoothedRoll, targetRoll, dampSpeed, dt);
    this.smoothedCenterY = THREE.MathUtils.damp(this.smoothedCenterY, centerHeight, 14, dt);

    // Per-wheel suspension travel = how far that wheel's real contact height
    // sits from the smoothed chassis plane (visual only).
    (Object.keys(heights) as Array<keyof typeof heights>).forEach((tag) => {
      const target = THREE.MathUtils.clamp((heights[tag] - this.smoothedCenterY) * physics.bumpiness, -0.14, 0.14);
      this.suspension[tag] = THREE.MathUtils.damp(this.suspension[tag], target, 16, dt);
    });

    this.wheelSpinAngle += (this.speed / WHEEL_RADIUS) * dt;
    this.position.y = this.smoothedCenterY - this.sinkDepth * 0.3;

    // --- rollover: extreme combined pitch/roll flips the vehicle ---
    if (Math.abs(this.smoothedRoll) > 0.62 || Math.abs(this.smoothedPitch) > 0.68) {
      this.flipped = true;
      this.speed = 0;
      this.lateralVelocity = 0;
    }

    return this.composePose();
  }

  private composePose(): VehiclePose {
    let status: DriveStatus = 'ok';
    if (this.flipped) status = 'flipped';
    else if (this.stuck) status = 'stuck';
    else if (this.sinkDepth > this.soil.physics.stuckDepth * 0.45) status = 'sinking';
    else if (this.slipEma > 0.4) status = 'slipping';

    return {
      position: this.position.clone(),
      heading: this.heading,
      pitch: this.smoothedPitch,
      roll: this.smoothedRoll,
      wheels: {
        FL: { spin: this.wheelSpinAngle, steer: this.steerVisual, suspension: this.suspension.FL },
        FR: { spin: this.wheelSpinAngle, steer: this.steerVisual, suspension: this.suspension.FR },
        RL: { spin: this.wheelSpinAngle, steer: 0, suspension: this.suspension.RL },
        RR: { spin: this.wheelSpinAngle, steer: 0, suspension: this.suspension.RR },
      },
      status,
      speedKph: Math.abs(this.speed) * 3.6,
    };
  }
}
