import * as THREE from "three";
import { torusDelta, wrapPosition } from "../world/world.js";

function lerpAngle(from, to, t) {
  let diff = to - from;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return from + diff * t;
}

function smoothingAlpha(rate, dt) {
  return 1 - Math.exp(-Math.max(0, rate) * dt);
}

export class UFO {
  constructor({ id, scene, config, color = 0x65f1d4, controlMode = "click", position }) {
    this.id = id;
    this.controlMode = controlMode;
    this.config = config;
    this.color = color;

    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);

    const hullMaterial = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.25,
      roughness: 0.4,
      flatShading: true
    });
    this.hullMaterial = hullMaterial;

    const lowerDisk = new THREE.Mesh(new THREE.CylinderGeometry(9, 13, 2.3, 28), hullMaterial);
    const upperDisk = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 9.5, 1.8, 28),
      new THREE.MeshStandardMaterial({ color: 0x8ff0dc, flatShading: true })
    );
    upperDisk.position.y = 1.25;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(4.3, 20, 14),
      new THREE.MeshStandardMaterial({ color: 0xb8fdf1, transparent: true, opacity: 0.86 })
    );
    dome.position.y = 3.2;

    this.ringLight = new THREE.Mesh(
      new THREE.TorusGeometry(9.8, 0.45, 8, 26),
      new THREE.MeshStandardMaterial({
        color: 0x9cfce8,
        emissive: 0x37d2b7,
        emissiveIntensity: 0.65
      })
    );
    this.ringLight.rotation.x = Math.PI * 0.5;

    this.engineGlowMaterial = new THREE.MeshStandardMaterial({
      color: 0x79ffe0,
      transparent: true,
      opacity: 0.45,
      emissive: 0x4effd8,
      emissiveIntensity: 0.3
    });
    this.engineGlow = new THREE.Mesh(new THREE.ConeGeometry(2.6, 8, 14, 1, true), this.engineGlowMaterial);
    this.engineGlow.rotation.x = Math.PI;
    this.engineGlow.position.y = -2.1;

    this.body.add(lowerDisk, upperDisk, dome, this.ringLight, this.engineGlow);
    scene.add(this.root);

    this.root.position.copy(position);
    this.velocity = new THREE.Vector3();
    this.target = null;
    this.smoothedTarget = null;
    this.hoverClock = Math.random() * Math.PI * 2;
    this.aimDirection = new THREE.Vector3(0, 0, 1);
    this.trail = [];

    this.maxHealth = 120;
    this.health = this.maxHealth;
    this.damageResist = 0;
    this.disabledTimer = 0;
    this.reviveProgress = 0;

    this.maxSpeed = config.movement.maxSpeed;
    this.accel = config.movement.accel;
    this.maxAccel = config.movement.maxAccel;
    this.damping = config.movement.damping;
    this.turnLerp = config.movement.turnLerp;
    this.boostMultiplier = config.boost.multiplier;
    this.boostDuration = config.boost.duration;
    this.boostCooldownDuration = config.boost.cooldown;

    this.laserRange = config.laser.range;
    this.laserDamage = config.laser.damage;
    this.heat = 0;
    this.heatMax = config.laser.heatMax;
    this.heatCoolRate = config.laser.heatCoolRate;
    this.overheatCooldownDuration = config.laser.overheatCooldown;
    this.fireInterval = config.laser.fireInterval;
    this.fireIntervalTimer = 0;
    this.overheatTimer = 0;

    this.boostTimer = 0;
    this.boostCooldown = 0;
    this.readySoundPlayed = true;
    this.speedBoostBuff = 0;

    this._tmpDesiredDir = new THREE.Vector3();
    this._tmpDesiredVel = new THREE.Vector3();
    this._tmpVelDelta = new THREE.Vector3();
    this._tmpPlanarVel = new THREE.Vector3();
    this._smoothedDesiredVelocity = new THREE.Vector3();
    this._retargetRate = Math.max(2.5, this.config.movement.retargetBlend * 14);
    this._targetSnapDistance = Math.max(1.2, this.config.movement.deadZoneRadius * 0.35);
  }

  setMoveTarget(target) {
    const wrapped = target.clone();
    const worldSize = this.config.world.size;
    wrapPosition(wrapped, worldSize);

    if (this.target) {
      const delta = torusDelta(this.target, wrapped, worldSize).setY(0);
      if (delta.lengthSq() <= this._targetSnapDistance * this._targetSnapDistance) {
        return;
      }
    }

    this.target = wrapped;
    if (!this.smoothedTarget) {
      this.smoothedTarget = wrapped.clone();
    } else {
      const toTarget = torusDelta(this.smoothedTarget, wrapped, worldSize);
      this.smoothedTarget.addScaledVector(toTarget, 0.35);
      wrapPosition(this.smoothedTarget, worldSize);
    }
  }

  clearMoveTarget() {
    this.target = null;
    this.smoothedTarget = null;
  }

  setAimDirection(vec3) {
    if (!vec3 || vec3.lengthSq() < 0.0001) {
      return;
    }
    this.aimDirection.copy(vec3).setY(0).normalize();
  }

  setColor(hexColor) {
    this.color = hexColor;
    this.hullMaterial.color.setHex(hexColor);
  }

  applyUpgradeStats(stats) {
    this.maxSpeed = stats.maxSpeed;
    this.accel = stats.accel;
    this.turnLerp = stats.turnLerp;
    this.boostMultiplier = stats.boostMultiplier;
    this.boostDuration = stats.boostDuration;
    this.boostCooldownDuration = stats.boostCooldown;
    this.laserRange = stats.laserRange;
    this.laserDamage = stats.laserDamage;
    this.heatMax = stats.heatMax;
    this.overheatCooldownDuration = stats.overheatCooldown;
    this.maxHealth = stats.maxHealth;
    this.damageResist = stats.damageResist;
    this.health = Math.min(this.health, this.maxHealth);
  }

  getBoostCooldownPct() {
    if (this.boostCooldownDuration <= 0) return 1;
    return 1 - Math.min(1, this.boostCooldown / this.boostCooldownDuration);
  }

  triggerBoost() {
    if (this.boostCooldown > 0 || this.disabledTimer > 0) {
      return false;
    }
    this.boostTimer = this.boostDuration;
    this.boostCooldown = this.boostCooldownDuration;
    this.readySoundPlayed = false;
    return true;
  }

  canFire() {
    return this.health > 0 && this.disabledTimer <= 0 && this.overheatTimer <= 0 && this.fireIntervalTimer <= 0;
  }

  registerShot(heatGain) {
    this.fireIntervalTimer = this.fireInterval;
    this.heat += heatGain;
    if (this.heat >= this.heatMax) {
      this.heat = this.heatMax;
      this.overheatTimer = this.overheatCooldownDuration;
    }
  }

  applyDamage(amount) {
    const finalAmount = amount * (1 - this.damageResist);
    this.health = Math.max(0, this.health - finalAmount);
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  getForward() {
    if (this.aimDirection.lengthSq() > 0.2) {
      return this.aimDirection.clone().setY(0).normalize();
    }
    if (this.velocity.lengthSq() > 0.25) {
      return this.velocity.clone().setY(0).normalize();
    }
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(this.root.quaternion).setY(0).normalize();
    return forward;
  }

  updateWeapon(dt) {
    this.fireIntervalTimer = Math.max(0, this.fireIntervalTimer - dt);
    if (this.overheatTimer > 0) {
      const wasOverheated = this.overheatTimer;
      this.overheatTimer = Math.max(0, this.overheatTimer - dt);
      if (wasOverheated > 0 && this.overheatTimer <= 0) {
        this.heat = 0;
      }
      return;
    }
    this.heat = Math.max(0, this.heat - this.heatCoolRate * dt);
  }

  updateTrail() {
    if (this.boostTimer <= 0) {
      if (this.trail.length > 0) {
        const first = this.trail.shift();
        first.parent?.remove(first);
      }
      return;
    }
    const trail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 1.6, 10, 6),
      new THREE.MeshStandardMaterial({
        color: 0x7effeb,
        emissive: 0x5affdc,
        emissiveIntensity: 0.42,
        transparent: true,
        opacity: 0.5
      })
    );
    trail.rotation.x = Math.PI * 0.5;
    trail.position.copy(this.root.position).add(new THREE.Vector3(0, -1.6, 0));
    this.root.parent?.add(trail);
    this.trail.push(trail);
    if (this.trail.length > 10) {
      const old = this.trail.shift();
      old.parent?.remove(old);
    }
    for (let i = 0; i < this.trail.length; i += 1) {
      const t = this.trail[i];
      t.material.opacity = (i + 1) / this.trail.length * 0.42;
      t.scale.multiplyScalar(0.97);
    }
  }

  update(dt, intent, world) {
    this.updateWeapon(dt);
    this.boostTimer = Math.max(0, this.boostTimer - dt);
    this.boostCooldown = Math.max(0, this.boostCooldown - dt);
    this.disabledTimer = Math.max(0, this.disabledTimer - dt);
    this.speedBoostBuff = Math.max(0, this.speedBoostBuff - dt);

    if (intent.boost) {
      this.triggerBoost();
    }
    if (intent.cancelTarget) {
      this.clearMoveTarget();
    }

    const desiredDir = this._tmpDesiredDir.set(0, 0, 0);
    let speedScale = 0;
    if (this.health <= 0) {
      this.clearMoveTarget();
    }

    if (this.controlMode === "click" && this.health > 0) {
      if (intent.moveTarget) {
        this.setMoveTarget(intent.moveTarget);
      }
      if (this.target) {
        if (!this.smoothedTarget) {
          this.smoothedTarget = this.target.clone();
        } else {
          const blend = smoothingAlpha(this._retargetRate, dt);
          const toTarget = torusDelta(this.smoothedTarget, this.target, world.size);
          this.smoothedTarget.addScaledVector(toTarget, blend);
          wrapPosition(this.smoothedTarget, world.size);
        }

        const delta = torusDelta(this.root.position, this.smoothedTarget, world.size);
        const planar = delta.setY(0);
        const dist = planar.length();
        if (dist < this.config.movement.deadZoneRadius) {
          this.clearMoveTarget();
          if (this.velocity.lengthSq() < 16) {
            this.velocity.set(0, 0, 0);
          }
        } else {
          desiredDir.copy(planar).multiplyScalar(1 / dist);
          const arrivalT = THREE.MathUtils.clamp(dist / this.config.movement.arrivalRadius, 0, 1);
          speedScale = arrivalT * arrivalT * (3 - 2 * arrivalT);
          if (arrivalT < 0.2) {
            speedScale *= 0.7;
          }
        }
      }
    } else if (this.health > 0 && intent.move && intent.move.lengthSq() > 0.0025) {
      desiredDir.set(intent.move.x, 0, intent.move.y).normalize();
      speedScale = THREE.MathUtils.clamp(intent.move.length(), 0, 1);
      this.clearMoveTarget();
    }

    if (intent.aim && intent.aim.lengthSq() > 0.04) {
      this.setAimDirection(new THREE.Vector3(intent.aim.x, 0, intent.aim.y));
    } else if (desiredDir.lengthSq() > 0.001) {
      this.setAimDirection(desiredDir);
    }

    const buffMul = this.speedBoostBuff > 0 ? 1.35 : 1;
    const boostMul = this.boostTimer > 0 ? this.boostMultiplier : 1;
    const desiredSpeed = this.maxSpeed * speedScale * boostMul * buffMul;
    this._tmpDesiredVel.copy(desiredDir).multiplyScalar(desiredSpeed);

    const steerAlpha = smoothingAlpha(Math.max(4, this.accel * 1.8), dt);
    this._smoothedDesiredVelocity.lerp(this._tmpDesiredVel, steerAlpha);

    const velDelta = this._tmpVelDelta.copy(this._smoothedDesiredVelocity).sub(this.velocity);
    const maxDelta = this.maxAccel * dt;
    if (velDelta.lengthSq() > maxDelta * maxDelta) {
      velDelta.setLength(maxDelta);
    }
    this.velocity.add(velDelta);
    if (speedScale <= 0.001 || this.disabledTimer > 0) {
      this.velocity.multiplyScalar(Math.pow(this.damping, dt * 60));
    }

    this.root.position.addScaledVector(this.velocity, dt);
    wrapPosition(this.root.position, world.size);

    const groundY = world.getHeight(this.root.position.x, this.root.position.z);
    this.hoverClock += dt * 3.5;
    this.root.position.y = groundY + 18 + Math.sin(this.hoverClock) * 0.65;

    const facingDir = this.getForward();
    if (facingDir.lengthSq() > 0.1) {
      const yaw = Math.atan2(facingDir.x, facingDir.z);
      this.root.rotation.y = lerpAngle(this.root.rotation.y, yaw, smoothingAlpha(this.turnLerp, dt));
    }

    const planarVel = this._tmpPlanarVel.copy(this.velocity).setY(0);
    const speedN = THREE.MathUtils.clamp(planarVel.length() / (this.maxSpeed * this.boostMultiplier), 0, 1);
    const throttle = THREE.MathUtils.clamp(this._smoothedDesiredVelocity.length() / Math.max(1, this.maxSpeed), 0, 1);
    const targetPitch = THREE.MathUtils.clamp(planarVel.z * 0.003 + this._smoothedDesiredVelocity.z * 0.0025, -0.42, 0.42);
    const targetRoll = THREE.MathUtils.clamp(-planarVel.x * 0.003 - this._smoothedDesiredVelocity.x * 0.0025, -0.42, 0.42);
    const tiltAlpha = smoothingAlpha(11, dt);
    this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, targetPitch, tiltAlpha);
    this.body.rotation.z = THREE.MathUtils.lerp(this.body.rotation.z, targetRoll, tiltAlpha);
    this.body.position.y = Math.sin(this.hoverClock * 1.35) * 0.35 * (0.5 + speedN);
    this.ringLight.rotation.z += dt * (0.7 + speedN * 2.8);
    this.engineGlow.material.opacity = 0.2 + throttle * 0.3 + (this.boostTimer > 0 ? 0.3 : 0);
    this.engineGlow.material.emissiveIntensity = 0.2 + throttle * 0.4 + (this.boostTimer > 0 ? 0.5 : 0);
    this.engineGlow.scale.set(1, 1 + throttle * 0.7 + (this.boostTimer > 0 ? 0.5 : 0), 1);

    this.updateTrail();
  }
}
