import { PHYSICS_TUNING, SPECIAL_WEAPON_DEFS } from "./constants.js";
import { angleToVector, approach, clamp, dot, lerp, randomRange } from "./physics.js";
import { drawVehicleSpriteLocal } from "./vehicleSprites.js";

export class Vehicle {
  constructor(definition, config = {}) {
    this.definition = definition;
    this.id = config.id;
    this.label = config.label;
    this.driverName = config.driverName;
    this.isHuman = config.isHuman;
    this.color = config.color ?? definition.bodyColor;
    this.trimColor = definition.trimColor;
    this.mass = definition.mass;
    this.radius = definition.radius;

    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.speed = 0;
    this.forwardSpeed = 0;
    this.lookBack = false;

    this.maxHealth = definition.armor;
    this.health = definition.armor;
    this.boost = definition.boostCapacity;
    this.maxBoost = definition.boostCapacity;

    this.primaryCooldown = 0;
    this.specialCooldown = 0;
    this.specialWeaponId = null;
    this.specialAmmo = 0;
    this.shieldTimer = 0;
    this.stunTimer = 0;
    this.damageFlash = 0;
    this.respawnTimer = 0;
    this.eliminated = false;
    this.boosting = false;
    this.wrongWay = false;
    this.finished = false;
    this.lastCheckpoint = 0;
    this.nextCheckpoint = 0;
    this.lap = 0;
    this.place = 1;
    this.kills = 0;
    this.deaths = 0;
    this.score = 0;
    this.survivalTime = 0;
    this.lastHitBy = null;
    this.lastHitTimer = 0;
    this.smokeTimer = 0;
    this.skidTimer = 0;
    this.steerState = 0;
    this.throttleState = 0;
    this.bodyRoll = 0;
    this.bump = 0;
    this.trailTimer = 0;
    this.killChainCount = 0;
    this.killChainTimer = 0;
    this.lowHealthCalled = false;
    this.finalLapCalled = false;
  }

  resetForMatch(spawnPoint, angle = 0) {
    this.x = spawnPoint.x;
    this.y = spawnPoint.y;
    this.vx = 0;
    this.vy = 0;
    this.angle = angle;
    this.speed = 0;
    this.forwardSpeed = 0;
    this.health = this.maxHealth;
    this.boost = this.maxBoost * 0.7;
    this.primaryCooldown = 0;
    this.specialCooldown = 0;
    this.specialWeaponId = null;
    this.specialAmmo = 0;
    this.shieldTimer = 0;
    this.stunTimer = 0;
    this.damageFlash = 0;
    this.respawnTimer = 0;
    this.eliminated = false;
    this.boosting = false;
    this.wrongWay = false;
    this.finished = false;
    this.lastCheckpoint = 0;
    this.nextCheckpoint = 0;
    this.lap = 0;
    this.place = 1;
    this.kills = 0;
    this.deaths = 0;
    this.score = 0;
    this.survivalTime = 0;
    this.lastHitBy = null;
    this.lastHitTimer = 0;
    this.lookBack = false;
    this.steerState = 0;
    this.throttleState = 0;
    this.bodyRoll = 0;
    this.bump = 0;
    this.trailTimer = 0;
    this.killChainCount = 0;
    this.killChainTimer = 0;
    this.lowHealthCalled = false;
    this.finalLapCalled = false;
  }

  isAlive() {
    return !this.eliminated && this.respawnTimer <= 0 && this.health > 0;
  }

  isSolid() {
    return !this.eliminated && this.respawnTimer <= 0 && this.health > 0;
  }

  assignSpecialWeapon(weaponId) {
    const def = SPECIAL_WEAPON_DEFS[weaponId];
    if (!def) {
      return;
    }
    this.specialWeaponId = weaponId;
    this.specialAmmo = def.ammo;
    this.specialCooldown = 0;
  }

  clearSpecialWeapon() {
    this.specialWeaponId = null;
    this.specialAmmo = 0;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    if (this.health / this.maxHealth > 0.38) {
      this.lowHealthCalled = false;
    }
  }

  addBoost(amount) {
    this.boost = Math.min(this.maxBoost, this.boost + amount);
  }

  applyDamage(amount, sourceId = null) {
    if (!this.isSolid()) {
      return false;
    }

    const shielded = this.shieldTimer > 0;
    const actualDamage = shielded ? amount * 0.22 : amount;
    this.health -= actualDamage;
    this.damageFlash = 0.18;
    this.bump = Math.min(1, this.bump + 0.22);

    if (sourceId !== null) {
      this.lastHitBy = sourceId;
      this.lastHitTimer = 4;
    }

    if (this.health <= 0) {
      this.health = 0;
      return true;
    }

    return false;
  }

  destroy(respawnDelay, permanent = false) {
    this.health = 0;
    this.vx = 0;
    this.vy = 0;
    this.primaryCooldown = 0;
    this.specialCooldown = 0;
    this.boosting = false;
    this.deaths += 1;
    this.respawnTimer = permanent ? Number.POSITIVE_INFINITY : respawnDelay;
    this.eliminated = permanent;
    this.clearSpecialWeapon();
    this.shieldTimer = 0;
    this.lowHealthCalled = false;
  }

  respawn(spawnPoint, angle = 0) {
    this.x = spawnPoint.x;
    this.y = spawnPoint.y;
    this.vx = 0;
    this.vy = 0;
    this.angle = angle;
    this.health = this.maxHealth;
    this.boost = this.maxBoost * 0.45;
    this.primaryCooldown = 0;
    this.specialCooldown = 0;
    this.shieldTimer = 0;
    this.stunTimer = 0;
    this.respawnTimer = 0;
    this.damageFlash = 0;
    this.lastHitBy = null;
    this.lastHitTimer = 0;
    this.steerState = 0;
    this.throttleState = 0;
    this.bodyRoll = 0;
    this.bump = 0;
  }

  registerKill() {
    if (this.killChainTimer > 0) {
      this.killChainCount += 1;
    } else {
      this.killChainCount = 1;
    }
    this.killChainTimer = 3.4;
  }

  update(dt, controls, surface, effects) {
    if (this.eliminated) {
      return;
    }

    this.killChainTimer = Math.max(0, this.killChainTimer - dt);
    if (this.killChainTimer <= 0) {
      this.killChainCount = 0;
    }

    if (this.respawnTimer > 0) {
      this.respawnTimer = Math.max(0, this.respawnTimer - dt);
      return;
    }

    this.primaryCooldown = Math.max(0, this.primaryCooldown - dt);
    this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt);
    this.lastHitTimer = Math.max(0, this.lastHitTimer - dt);
    this.bump = lerp(this.bump, 0, 1 - Math.exp(-8.5 * dt));
    this.lookBack = !!controls.lookBack;

    const forward = angleToVector(this.angle);
    const right = { x: -forward.y, y: forward.x };
    const currentForwardSpeed = dot(this.vx, this.vy, forward.x, forward.y);
    const lateralSpeed = dot(this.vx, this.vy, right.x, right.y);
    const stunnedFactor = this.stunTimer > 0 ? 0.42 : 1;
    const rawSteer = clamp(controls.steer, -1, 1) * stunnedFactor;
    const rawThrottle = clamp((controls.accel ?? 0) - (controls.brake ?? 0), -1, 1) * stunnedFactor;
    const reverseCap = this.definition.speed * PHYSICS_TUNING.reverseSpeedFactor;
    const speedRatio = Math.min(1, Math.abs(currentForwardSpeed) / this.definition.speed);
    const drifting = controls.brake > 0.25 && Math.abs(rawSteer) > 0.25 && Math.abs(currentForwardSpeed) > 110;

    this.steerState = approach(this.steerState, rawSteer, PHYSICS_TUNING.steerResponse * dt);
    this.throttleState = approach(this.throttleState, rawThrottle, PHYSICS_TUNING.throttleResponse * dt);

    const steeringScale = this.definition.handling
      * surface.traction
      * (0.28 + speedRatio * 0.95 + (drifting ? PHYSICS_TUNING.driftTurnBonus : 0));
    if (Math.abs(this.steerState) > 0.01 && (Math.abs(currentForwardSpeed) > 18 || Math.abs(this.throttleState) > 0.1)) {
      const reverseSteer = currentForwardSpeed < -20 ? -0.58 : 1;
      const lateralAssist = clamp(lateralSpeed / 240, -1, 1) * PHYSICS_TUNING.counterSteerAssist;
      this.angle += (this.steerState - lateralAssist * 0.1) * steeringScale * reverseSteer * dt;
    }

    let driveForce = 0;
    if (this.throttleState > 0) {
      driveForce = this.definition.acceleration * surface.accelFactor * this.throttleState;
    } else if (this.throttleState < 0) {
      driveForce = this.definition.acceleration * 0.7 * surface.accelFactor * this.throttleState;
    }

    this.boosting = false;
    if (controls.boost && this.boost > 0 && this.stunTimer <= 0) {
      this.boosting = true;
      this.boost = Math.max(0, this.boost - PHYSICS_TUNING.boostBurnRate * dt);
      driveForce += this.definition.acceleration * 1.92;
      if (Math.random() < 0.52) {
        effects.emitBoost(this.x - forward.x * 30, this.y - forward.y * 30, this.angle, this.color);
      }
    } else {
      this.boost = Math.min(this.maxBoost, this.boost + PHYSICS_TUNING.passiveBoostRecharge * dt * (surface.boostPad ? 1.9 : 1));
    }

    if (surface.boostPad) {
      driveForce += this.definition.acceleration * 0.48;
      this.addBoost(8.5 * dt);
    }

    this.vx += forward.x * driveForce * dt;
    this.vy += forward.y * driveForce * dt;

    if (controls.brake > 0.2 && currentForwardSpeed > 0) {
      this.vx -= forward.x * currentForwardSpeed * dt * (drifting ? 0.75 : 1.2);
      this.vy -= forward.y * currentForwardSpeed * dt * (drifting ? 0.75 : 1.2);
    }

    const lateralGrip = PHYSICS_TUNING.lateralGrip
      * this.definition.traction
      * surface.traction
      * (drifting ? PHYSICS_TUNING.driftGripFactor : 1)
      * (0.92 + speedRatio * 0.18);
    this.vx -= right.x * lateralSpeed * lateralGrip * dt;
    this.vy -= right.y * lateralSpeed * lateralGrip * dt;

    const snapAmount = PHYSICS_TUNING.forwardSnap * (0.3 + speedRatio * 0.7) * dt;
    this.vx = lerp(this.vx, forward.x * currentForwardSpeed + right.x * lateralSpeed * (drifting ? 0.42 : 0.18), snapAmount);
    this.vy = lerp(this.vy, forward.y * currentForwardSpeed + right.y * lateralSpeed * (drifting ? 0.42 : 0.18), snapAmount);

    const drag = PHYSICS_TUNING.worldDrag * surface.dragFactor * (drifting ? 0.94 : 1);
    this.vx -= this.vx * drag * dt;
    this.vy -= this.vy * drag * dt;

    const newForwardSpeed = dot(this.vx, this.vy, forward.x, forward.y);
    if (newForwardSpeed < -reverseCap) {
      const correction = reverseCap - newForwardSpeed;
      this.vx += forward.x * correction;
      this.vy += forward.y * correction;
    }

    const topSpeed = this.definition.speed * surface.speedFactor * (this.boosting ? 1.36 : 1);
    const velocityLength = Math.hypot(this.vx, this.vy);
    if (velocityLength > topSpeed) {
      const scale = topSpeed / velocityLength;
      this.vx *= scale;
      this.vy *= scale;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.speed = Math.hypot(this.vx, this.vy);
    this.forwardSpeed = dot(this.vx, this.vy, forward.x, forward.y);
    this.survivalTime += dt;
    this.bodyRoll = lerp(this.bodyRoll, -this.steerState * (0.12 + speedRatio * 0.28) + (drifting ? this.steerState * 0.08 : 0), 1 - Math.exp(-9 * dt));

    this.smokeTimer -= dt;
    this.skidTimer -= dt;
    this.trailTimer -= dt;

    if ((surface.offroad || this.health / this.maxHealth < 0.45) && this.speed > 150 && this.smokeTimer <= 0) {
      effects.emitSmoke(this.x, this.y, 2, surface.offroad ? "rgba(190,180,160,0.55)" : "rgba(150,170,190,0.52)");
      this.smokeTimer = 0.055;
    }

    if (this.boosting && this.trailTimer <= 0) {
      effects.emitSparks(this.x - forward.x * 26, this.y - forward.y * 26, this.angle + Math.PI, 2, this.trimColor, 0.9);
      this.trailTimer = 0.05;
    }

    if (Math.abs(lateralSpeed) > 82 && this.speed > 160 && this.skidTimer <= 0) {
      effects.addSkidMark(this.x - right.x * 11, this.y - right.y * 11, this.angle, surface.offroad ? "rgba(90,70,50,0.45)" : "rgba(18,18,20,0.5)");
      effects.addSkidMark(this.x + right.x * 11, this.y + right.y * 11, this.angle, surface.offroad ? "rgba(90,70,50,0.45)" : "rgba(18,18,20,0.5)");
      if (Math.random() < 0.65) {
        effects.emitSparks(this.x, this.y, this.angle + Math.PI + randomRange(-0.4, 0.4), 3, "#fff0c0");
      }
      this.skidTimer = 0.07;
    }
  }

  render(ctx) {
    if (this.eliminated || this.respawnTimer > 0) {
      return;
    }

    const squash = 1 + this.bump * 0.08;
    const lift = -this.bump * 5;
    ctx.save();
    ctx.translate(this.x, this.y + lift);
    ctx.rotate(this.angle + this.bodyRoll);
    ctx.scale(squash, 1 / squash);

    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 10, this.radius * 1.05, this.radius * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.boosting) {
      ctx.fillStyle = `${this.color}aa`;
      ctx.beginPath();
      ctx.moveTo(-this.radius - 10, -8);
      ctx.lineTo(-this.radius - 46, 0);
      ctx.lineTo(-this.radius - 10, 8);
      ctx.closePath();
      ctx.fill();
    }

    if (this.shieldTimer > 0) {
      ctx.strokeStyle = "rgba(110,200,255,0.85)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8 + Math.sin(this.shieldTimer * 10) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    const drewSprite = drawVehicleSpriteLocal(ctx, this.definition, this.radius, 1);
    if (!drewSprite) {
      ctx.fillStyle = this.damageFlash > 0 ? "#ffffff" : this.color;
      ctx.beginPath();
      ctx.moveTo(this.radius * 1.02, 0);
      ctx.lineTo(this.radius * 0.44, -this.radius * 0.78);
      ctx.lineTo(-this.radius * 0.6, -this.radius * 0.78);
      ctx.lineTo(-this.radius, -this.radius * 0.18);
      ctx.lineTo(-this.radius, this.radius * 0.18);
      ctx.lineTo(-this.radius * 0.6, this.radius * 0.78);
      ctx.lineTo(this.radius * 0.44, this.radius * 0.78);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(8, 12, 20, 0.72)";
      ctx.beginPath();
      ctx.moveTo(this.radius * 0.22, -this.radius * 0.46);
      ctx.lineTo(-this.radius * 0.34, -this.radius * 0.34);
      ctx.lineTo(-this.radius * 0.1, 0);
      ctx.lineTo(this.radius * 0.34, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = this.trimColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-this.radius * 0.42, -this.radius * 0.42);
      ctx.lineTo(this.radius * 0.44, -this.radius * 0.22);
      ctx.lineTo(this.radius * 0.36, 0);
      ctx.lineTo(this.radius * 0.44, this.radius * 0.22);
      ctx.lineTo(-this.radius * 0.42, this.radius * 0.42);
      ctx.stroke();

      ctx.fillStyle = this.trimColor;
      ctx.fillRect(-this.radius * 0.18, -this.radius * 0.62, this.radius * 0.24, this.radius * 0.16);
      ctx.fillRect(-this.radius * 0.18, this.radius * 0.46, this.radius * 0.24, this.radius * 0.16);

      ctx.fillStyle = "rgba(14, 20, 29, 0.9)";
      ctx.fillRect(-this.radius * 0.88, -this.radius * 0.62, this.radius * 0.24, this.radius * 0.32);
      ctx.fillRect(-this.radius * 0.88, this.radius * 0.3, this.radius * 0.24, this.radius * 0.32);
      ctx.fillRect(this.radius * 0.44, -this.radius * 0.62, this.radius * 0.24, this.radius * 0.32);
      ctx.fillRect(this.radius * 0.44, this.radius * 0.3, this.radius * 0.24, this.radius * 0.32);
    } else if (this.damageFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${0.18 + this.damageFlash * 0.5})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 1.05, this.radius * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    const barWidth = 70;
    const barX = this.x - barWidth * 0.5;
    const barY = this.y - this.radius - 28;
    ctx.fillStyle = "rgba(0,0,0,0.48)";
    ctx.fillRect(barX, barY, barWidth, 7);
    ctx.fillStyle = this.health / this.maxHealth < 0.3 ? "#ff4c63" : "#45f3a8";
    ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), 7);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(this.label, this.x, this.y - this.radius - 36);
  }
}
