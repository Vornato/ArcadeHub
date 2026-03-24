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
    this.bodyPitch = 0;
    this.bump = 0;
    this.trailTimer = 0;
    this.boostBurstTimer = 0;
    this.driftState = 0;
    this.frontSlip = 0;
    this.rearSlip = 0;
    this.driftScore = 0;
    this.pendingDriftScore = 0;
    this.driftTime = 0;
    this.nearMissTimer = 0;
    this.streakBuffTimer = 0;
    this.streakLevel = 0;
    this.speedBonus = 0;
    this.damageMultiplier = 1;
    this.z = 0;
    this.vz = 0;
    this.airborne = false;
    this.airTime = 0;
    this.airRotation = 0;
    this.killChainCount = 0;
    this.killChainTimer = 0;
    this.lowHealthCalled = false;
    this.finalLapCalled = false;
    this.driftCombo = 1;
    this.pendingDriftMeta = null;
    this.hudMessage = "";
    this.hudDetail = "";
    this.hudMessageTimer = 0;
    this.hudMessageAccent = this.color;
    this.hudMessageColor = "#f4f8ff";
    this.warningCooldown = 0;
    this.repairRemaining = 0;
    this.repairRate = 0;
    this.repairTimer = 0;
    this.repairSlowTimer = 0;
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
    this.bodyPitch = 0;
    this.bump = 0;
    this.trailTimer = 0;
    this.boostBurstTimer = 0;
    this.driftState = 0;
    this.frontSlip = 0;
    this.rearSlip = 0;
    this.driftScore = 0;
    this.pendingDriftScore = 0;
    this.driftTime = 0;
    this.nearMissTimer = 0;
    this.streakBuffTimer = 0;
    this.streakLevel = 0;
    this.speedBonus = 0;
    this.damageMultiplier = 1;
    this.z = 0;
    this.vz = 0;
    this.airborne = false;
    this.airTime = 0;
    this.airRotation = 0;
    this.killChainCount = 0;
    this.killChainTimer = 0;
    this.lowHealthCalled = false;
    this.finalLapCalled = false;
    this.driftCombo = 1;
    this.pendingDriftMeta = null;
    this.hudMessage = "";
    this.hudDetail = "";
    this.hudMessageTimer = 0;
    this.hudMessageAccent = this.color;
    this.hudMessageColor = "#f4f8ff";
    this.warningCooldown = 0;
    this.repairRemaining = 0;
    this.repairRate = 0;
    this.repairTimer = 0;
    this.repairSlowTimer = 0;
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
    this.boost = Math.min(this.maxBoost * 1.35, this.boost + amount);
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
    this.bodyPitch = 0;
    this.driftState = 0;
    this.frontSlip = 0;
    this.rearSlip = 0;
    this.driftScore = 0;
    this.pendingDriftScore = 0;
    this.driftTime = 0;
    this.nearMissTimer = 0;
    this.streakBuffTimer = 0;
    this.streakLevel = 0;
    this.speedBonus = 0;
    this.damageMultiplier = 1;
    this.boostBurstTimer = 0;
    this.z = 0;
    this.vz = 0;
    this.airborne = false;
    this.airTime = 0;
    this.airRotation = 0;
    this.driftCombo = 1;
    this.pendingDriftMeta = null;
    this.hudMessage = "";
    this.hudDetail = "";
    this.hudMessageTimer = 0;
    this.hudMessageAccent = this.color;
    this.hudMessageColor = "#f4f8ff";
    this.warningCooldown = 0;
    this.repairRemaining = 0;
    this.repairRate = 0;
    this.repairTimer = 0;
    this.repairSlowTimer = 0;
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
    this.bodyPitch = 0;
    this.bump = 0;
    this.boostBurstTimer = 0;
    this.driftState = 0;
    this.frontSlip = 0;
    this.rearSlip = 0;
    this.driftScore = 0;
    this.pendingDriftScore = 0;
    this.driftTime = 0;
    this.nearMissTimer = 0;
    this.streakBuffTimer = 0;
    this.streakLevel = 0;
    this.speedBonus = 0;
    this.damageMultiplier = 1;
    this.z = 0;
    this.vz = 0;
    this.airborne = false;
    this.airTime = 0;
    this.airRotation = 0;
    this.driftCombo = 1;
    this.pendingDriftMeta = null;
    this.hudMessage = "";
    this.hudDetail = "";
    this.hudMessageTimer = 0;
    this.hudMessageAccent = this.color;
    this.hudMessageColor = "#f4f8ff";
    this.warningCooldown = 0;
    this.repairRemaining = 0;
    this.repairRate = 0;
    this.repairTimer = 0;
    this.repairSlowTimer = 0;
  }

  registerKill() {
    if (this.killChainTimer > 0) {
      this.killChainCount += 1;
    } else {
      this.killChainCount = 1;
    }
    this.killChainTimer = 3.4;
    this.streakLevel = Math.max(0, this.killChainCount - 1);
    this.streakBuffTimer = PHYSICS_TUNING.streakDuration;
  }

  consumePendingDriftScore() {
    const value = this.pendingDriftScore;
    const meta = this.pendingDriftMeta;
    this.pendingDriftScore = 0;
    this.pendingDriftMeta = null;
    if (value <= 0) {
      return null;
    }
    return {
      score: value,
      ...(meta ?? {}),
    };
  }

  queueHudMessage(text, detail = "", accent = this.color, duration = 1.2, color = "#f4f8ff") {
    this.hudMessage = text;
    this.hudDetail = detail;
    this.hudMessageAccent = accent;
    this.hudMessageColor = color;
    this.hudMessageTimer = Math.max(this.hudMessageTimer, duration);
  }

  queueWarning(text, detail = "", accent = "#ff4c63", duration = 0.9) {
    if (this.warningCooldown > 0) {
      return;
    }
    this.queueHudMessage(text, detail, accent, duration);
    this.warningCooldown = duration * 0.7;
  }

  beginRepair(totalHeal, duration = PHYSICS_TUNING.repairDuration) {
    this.repairRemaining += Math.max(0, totalHeal);
    this.repairTimer = Math.max(this.repairTimer, duration);
    this.repairSlowTimer = Math.max(this.repairSlowTimer, duration * 0.8);
    this.repairRate = this.repairTimer > 0 ? this.repairRemaining / this.repairTimer : 0;
    this.queueHudMessage("FIELD REPAIR", `+${Math.round(totalHeal)} incoming`, "#45f3a8", 1.1);
  }

  update(dt, controls, surface, effects) {
    if (this.eliminated) {
      return;
    }

    this.killChainTimer = Math.max(0, this.killChainTimer - dt);
    if (this.killChainTimer <= 0) {
      this.killChainCount = 0;
    }
    this.streakBuffTimer = Math.max(0, this.streakBuffTimer - dt);
    if (this.streakBuffTimer <= 0) {
      this.streakLevel = 0;
    }
    this.speedBonus = this.streakLevel * PHYSICS_TUNING.streakSpeedBonusStep;
    this.damageMultiplier = 1 + this.streakLevel * PHYSICS_TUNING.streakDamageBonusStep;

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
    this.hudMessageTimer = Math.max(0, this.hudMessageTimer - dt);
    this.warningCooldown = Math.max(0, this.warningCooldown - dt);
    this.repairTimer = Math.max(0, this.repairTimer - dt);
    this.repairSlowTimer = Math.max(0, this.repairSlowTimer - dt);
    this.bump = lerp(this.bump, 0, 1 - Math.exp(-8.5 * dt));
    this.boostBurstTimer = Math.max(0, this.boostBurstTimer - dt);
    this.lookBack = !!controls.lookBack;

    if (this.repairRemaining > 0 && this.health > 0) {
      const heal = Math.min(this.repairRemaining, this.repairRate * dt);
      this.repairRemaining -= heal;
      this.heal(heal);
      if (this.repairRemaining <= 0.1 || this.repairTimer <= 0) {
        this.repairRemaining = 0;
        this.repairRate = 0;
      }
    }

    const forward = angleToVector(this.angle);
    const right = { x: -forward.y, y: forward.x };
    const currentForwardSpeed = dot(this.vx, this.vy, forward.x, forward.y);
    const lateralSpeed = dot(this.vx, this.vy, right.x, right.y);
    const stunnedFactor = this.stunTimer > 0 ? 0.42 : 1;
    const rawSteer = clamp(controls.steer, -1, 1) * stunnedFactor;
    const rawThrottle = clamp((controls.accel ?? 0) - (controls.brake ?? 0), -1, 1) * stunnedFactor;
    const reverseCap = this.definition.speed * PHYSICS_TUNING.reverseSpeedFactor;
    const speedRatio = Math.min(1, Math.abs(currentForwardSpeed) / this.definition.speed);
    const driftIntent = !this.airborne
      && controls.brake > 0.16
      && Math.abs(rawSteer) > 0.2
      && currentForwardSpeed > PHYSICS_TUNING.driftEntrySpeed * (1.06 - this.definition.driftControl * 0.08);
    const driftTarget = driftIntent ? clamp(speedRatio * 0.8 + Math.abs(rawSteer) * 0.44, 0.25, 1) : 0;

    this.steerState = approach(
      this.steerState,
      rawSteer,
      (PHYSICS_TUNING.steerResponse * this.definition.steerSharpness / Math.sqrt(this.mass)) * dt,
    );
    this.throttleState = approach(
      this.throttleState,
      rawThrottle,
      (PHYSICS_TUNING.throttleResponse * this.definition.torqueScale / Math.sqrt(this.mass)) * dt,
    );
    this.driftState = lerp(this.driftState, driftTarget, 1 - Math.exp(-(driftIntent ? 7.2 : PHYSICS_TUNING.tractionRecovery * 1.8) * dt));
    const drifting = this.driftState > 0.18;

    const steeringLoad = clamp(Math.abs(this.steerState) * (0.34 + speedRatio * 0.96) * (1 - this.driftState * 0.25), 0, 1.3);
    const frontSlipTarget = clamp(
      ((steeringLoad - PHYSICS_TUNING.understeerStart) / (1 - PHYSICS_TUNING.understeerStart))
        * this.definition.understeerBias
        * (1.1 - surface.traction * 0.08),
      0,
      1,
    );
    this.frontSlip = lerp(this.frontSlip, frontSlipTarget, 1 - Math.exp(-4.8 * dt));
    this.rearSlip = lerp(
      this.rearSlip,
      drifting ? clamp(this.driftState + Math.abs(lateralSpeed) / 230, 0, 1.1) : 0,
      1 - Math.exp(-(drifting ? 5.4 : 3.4) * dt),
    );

    const steeringScale = this.definition.handling
      * this.definition.steerSharpness
      * (this.airborne ? PHYSICS_TUNING.airControl : surface.traction)
      * (0.24 + speedRatio * 0.84)
      * (1 - this.frontSlip * PHYSICS_TUNING.understeerMax)
      * (drifting ? 1 + PHYSICS_TUNING.driftTurnBonus * this.definition.driftControl : 1);
    if (Math.abs(this.steerState) > 0.01 && (Math.abs(currentForwardSpeed) > 18 || Math.abs(this.throttleState) > 0.1)) {
      const reverseSteer = currentForwardSpeed < -20 ? -0.58 : 1;
      const lateralAssist = clamp(lateralSpeed / 240, -1, 1) * PHYSICS_TUNING.counterSteerAssist;
      const driftYaw = drifting
        ? this.steerState * PHYSICS_TUNING.driftYawAssist * this.definition.driftControl * clamp(Math.abs(currentForwardSpeed) / 240, 0, 1)
        : 0;
      this.angle += ((this.steerState - lateralAssist * 0.08) * steeringScale + driftYaw) * reverseSteer * dt;
    }

    let driveForce = 0;
    const repairPenalty = this.repairSlowTimer > 0 ? PHYSICS_TUNING.repairSpeedPenalty : 1;
    const accelFactor = surface.accelFactor * (surface.offroad ? this.definition.offroadSkill : 1);
    if (this.throttleState > 0) {
      driveForce = this.definition.acceleration * this.definition.torqueScale * accelFactor * this.throttleState * repairPenalty;
    } else if (this.throttleState < 0) {
      driveForce = this.definition.acceleration * 0.68 * accelFactor * this.throttleState * repairPenalty;
    }

    const wasBoosting = this.boosting;
    this.boosting = false;
    if (controls.boost && this.boost > 0 && this.stunTimer <= 0) {
      const startedBoost = !wasBoosting;
      this.boosting = true;
      this.boost = Math.max(0, this.boost - PHYSICS_TUNING.boostBurnRate * dt);
      if (startedBoost) {
        this.boostBurstTimer = PHYSICS_TUNING.boostBurstDuration;
      }
      driveForce += this.definition.acceleration * (1.4 + this.definition.nitroKick * 0.36);
      if (this.boostBurstTimer > 0) {
        driveForce += this.definition.acceleration * PHYSICS_TUNING.boostBurstKick * this.definition.nitroKick;
      }
      if (Math.random() < 0.52) {
        effects.emitBoost(this.x - forward.x * 30, this.y - forward.y * 30, this.angle, this.color);
      }
    } else {
      const rechargeDt = Math.min(dt, PHYSICS_TUNING.maxBoostRechargeStep ?? dt);
      let recharge = PHYSICS_TUNING.passiveBoostRecharge * rechargeDt;
      if (surface.boostPad) {
        recharge *= 1.4;
      }
      if (drifting && Math.abs(lateralSpeed) > 70 && currentForwardSpeed > 140) {
        recharge += PHYSICS_TUNING.driftRechargeRate
          * rechargeDt
          * clamp(Math.abs(lateralSpeed) / 210, 0.35, 1.1)
          * this.definition.driftControl;
      }
      this.boost = Math.min(this.maxBoost * 1.35, this.boost + recharge);
    }

    if (surface.boostPad) {
      driveForce += this.definition.acceleration * 0.48;
      this.addBoost(PHYSICS_TUNING.boostPadRecharge * dt);
    }

    this.vx += forward.x * driveForce * dt;
    this.vy += forward.y * driveForce * dt;

    if (controls.brake > 0.2 && currentForwardSpeed > 0) {
      const brakePower = drifting ? 0.82 : 1.36;
      this.vx -= forward.x * currentForwardSpeed * dt * brakePower;
      this.vy -= forward.y * currentForwardSpeed * dt * brakePower;
    }

    const lateralGrip = PHYSICS_TUNING.lateralGrip
      * this.definition.traction
      * (this.airborne ? 0.05 : surface.traction)
      * (drifting ? PHYSICS_TUNING.driftGripFactor * (1.08 - this.definition.driftControl * 0.16) : 1)
      * (0.92 + speedRatio * 0.18);
    this.vx -= right.x * lateralSpeed * lateralGrip * dt;
    this.vy -= right.y * lateralSpeed * lateralGrip * dt;

    const snapAmount = PHYSICS_TUNING.forwardSnap * (this.airborne ? 0.12 : 1) * (0.3 + speedRatio * 0.7) * dt;
    this.vx = lerp(this.vx, forward.x * currentForwardSpeed + right.x * lateralSpeed * (drifting ? 0.42 : 0.18), snapAmount);
    this.vy = lerp(this.vy, forward.y * currentForwardSpeed + right.y * lateralSpeed * (drifting ? 0.42 : 0.18), snapAmount);

    const drag = (this.airborne ? PHYSICS_TUNING.airDrag : PHYSICS_TUNING.worldDrag)
      * surface.dragFactor
      * (drifting ? 0.95 : 1);
    this.vx -= this.vx * drag * dt;
    this.vy -= this.vy * drag * dt;

    const newForwardSpeed = dot(this.vx, this.vy, forward.x, forward.y);
    if (newForwardSpeed < -reverseCap) {
      const correction = reverseCap - newForwardSpeed;
      this.vx += forward.x * correction;
      this.vy += forward.y * correction;
    }

    const topSpeed = this.definition.speed
      * (surface.speedFactor * (surface.offroad ? this.definition.offroadSkill : 1))
      * (1 + this.speedBonus)
      * repairPenalty
      * (this.boosting ? 1.22 + this.definition.nitroKick * 0.08 : 1);
    const velocityLength = Math.hypot(this.vx, this.vy);
    if (velocityLength > topSpeed) {
      const scale = topSpeed / velocityLength;
      this.vx *= scale;
      this.vy *= scale;
    }

    const rampLaunchSpeed = Math.hypot(this.vx, this.vy);
    if (!this.airborne && surface.ramp && rampLaunchSpeed > PHYSICS_TUNING.jumpSpeedThreshold) {
      this.airborne = true;
      this.airTime = 0;
      this.z = 1;
      this.vz = Math.max(180, (rampLaunchSpeed - PHYSICS_TUNING.jumpSpeedThreshold) * PHYSICS_TUNING.jumpLaunchFactor);
      this.airRotation = this.steerState * 0.08;
      effects.emitSparks(this.x + forward.x * 10, this.y + forward.y * 10, this.angle, 7, "#ffd8a8", 1.2);
    }

    if (this.airborne) {
      this.airTime += dt;
      this.vz -= PHYSICS_TUNING.gravity * dt;
      this.z = Math.max(0, this.z + this.vz * dt);
      this.airRotation = lerp(this.airRotation, this.steerState * 0.18, 1 - Math.exp(-3.2 * dt));
      if (this.z <= 0) {
        const landingVelocity = Math.abs(this.vz);
        this.airborne = false;
        this.z = 0;
        this.vz = 0;
        this.bump = Math.min(1, this.bump + landingVelocity * PHYSICS_TUNING.landingCompression);
        const cleanLanding = Math.abs(this.steerState) < PHYSICS_TUNING.cleanLandingGrace && Math.abs(lateralSpeed) < 95;
        if (cleanLanding) {
          this.addBoost(PHYSICS_TUNING.cleanLandingBonus);
        } else {
          this.addBoost(PHYSICS_TUNING.jumpBoostGain * 0.5);
        }
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.speed = Math.hypot(this.vx, this.vy);
    this.forwardSpeed = dot(this.vx, this.vy, forward.x, forward.y);
    this.survivalTime += dt;
    const lateralWeight = clamp(-this.steerState * (0.18 + speedRatio * 0.62) + this.rearSlip * this.steerState * 0.14, -1, 1);
    const longitudinalWeight = clamp((-driveForce / Math.max(1, this.definition.acceleration * this.definition.torqueScale)) + controls.brake * 0.65, -1.1, 1.1);
    this.bodyRoll = lerp(this.bodyRoll, lateralWeight * PHYSICS_TUNING.weightRollScale + this.airRotation, 1 - Math.exp(-PHYSICS_TUNING.suspensionResponse * dt));
    this.bodyPitch = lerp(this.bodyPitch, longitudinalWeight * PHYSICS_TUNING.weightPitchScale + (this.airborne ? -0.16 : 0), 1 - Math.exp(-PHYSICS_TUNING.suspensionResponse * dt));

    this.smokeTimer -= dt;
    this.skidTimer -= dt;
    this.trailTimer -= dt;

    if ((surface.offroad || this.health / this.maxHealth < 0.45 || drifting) && this.speed > 150 && this.smokeTimer <= 0) {
      const smokeColor = surface.offroad
        ? "rgba(190,180,160,0.55)"
        : drifting
          ? "rgba(210,220,225,0.5)"
          : "rgba(150,170,190,0.52)";
      effects.emitSmoke(this.x - forward.x * 16, this.y - forward.y * 16, drifting ? 4 : 2, smokeColor);
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

    if (drifting && currentForwardSpeed > 130) {
      this.driftTime += dt;
      this.driftCombo = Math.max(1, 1 + Math.floor(this.driftTime / 0.85) + (Math.abs(lateralSpeed) > 120 ? 1 : 0));
      this.driftScore += (Math.abs(lateralSpeed) * 0.15 + currentForwardSpeed * 0.08) * Math.max(0.25, this.throttleState + 0.4) * dt;
    } else if (this.driftScore > 42) {
      const cleanExit = this.driftTime >= 1
        && Math.abs(lateralSpeed) < 52
        && Math.abs(this.steerState) < 0.26
        && currentForwardSpeed > 135;
      this.pendingDriftScore += this.driftScore * (cleanExit ? 1.2 : 1);
      this.pendingDriftMeta = {
        cleanExit,
        combo: this.driftCombo,
        duration: this.driftTime,
        baseScore: this.driftScore,
      };
      this.driftScore = 0;
      this.driftTime = 0;
      this.driftCombo = 1;
    } else {
      this.driftScore = 0;
      this.driftTime = 0;
      this.driftCombo = 1;
    }
  }

  render(ctx) {
    if (this.eliminated || this.respawnTimer > 0) {
      return;
    }

    const squash = 1 + this.bump * 0.08;
    const lift = -this.bump * 5 - this.z * 0.28;
    const forward = angleToVector(this.angle);
    ctx.save();
    ctx.translate(this.x - forward.x * this.bodyPitch * 22, this.y + lift - forward.y * this.bodyPitch * 22);
    ctx.rotate(this.angle + this.bodyRoll);
    ctx.scale(squash, 1 / squash);

    ctx.fillStyle = `rgba(0,0,0,${this.airborne ? 0.18 : 0.3})`;
    ctx.beginPath();
    ctx.ellipse(0, 10 + this.z * 0.08, this.radius * (this.airborne ? 0.88 : 1.05), this.radius * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.boosting) {
      ctx.fillStyle = `${this.color}cc`;
      ctx.beginPath();
      ctx.moveTo(-this.radius - 10, -9);
      ctx.lineTo(-this.radius - 52, 0);
      ctx.lineTo(-this.radius - 10, 9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff6c7";
      ctx.beginPath();
      ctx.moveTo(-this.radius - 12, -5);
      ctx.lineTo(-this.radius - 34, 0);
      ctx.lineTo(-this.radius - 12, 5);
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

    ctx.fillStyle = "rgba(0,0,0,0.48)";
    ctx.fillRect(barX, barY + 9, barWidth, 5);
    ctx.fillStyle = "#2ef0ff";
    ctx.fillRect(barX, barY + 9, barWidth * Math.min(1.25, this.boost / this.maxBoost), 5);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(this.label, this.x, this.y - this.radius - 36);
  }
}
