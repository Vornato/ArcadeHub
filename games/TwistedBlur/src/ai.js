import { BOT_DIFFICULTIES } from "./constants.js";
import { clamp, distance, signedAngleToTarget } from "./physics.js";
import { getCheckpoint } from "./levelManager.js";

function scoreTarget(vehicle, target) {
  if (!target?.isAlive()) {
    return -Infinity;
  }
  const dist = distance(vehicle.x, vehicle.y, target.x, target.y);
  const healthFactor = 1 - target.health / target.maxHealth;
  return 900 - dist + healthFactor * 180 + target.kills * 30;
}

function nearestEnemy(vehicle, participants) {
  let best = null;
  let bestScore = -Infinity;
  for (const participant of participants) {
    const target = participant.vehicle;
    if (!target || target.id === vehicle.id || !target.isAlive()) {
      continue;
    }
    const score = scoreTarget(vehicle, target);
    if (score > bestScore) {
      bestScore = score;
      best = target;
    }
  }
  return best;
}

function nearestPickup(vehicle, pickupSystem) {
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const pickup of pickupSystem.pickups ?? []) {
    if (!pickup.active) {
      continue;
    }
    const currentDistance = distance(vehicle.x, vehicle.y, pickup.x, pickup.y);
    if (currentDistance < bestDistance) {
      bestDistance = currentDistance;
      best = pickup;
    }
  }
  return best;
}

export class BotController {
  constructor(difficultyIndex = 1) {
    this.difficulty = BOT_DIFFICULTIES[difficultyIndex] ?? BOT_DIFFICULTIES[1];
    this.targetId = null;
    this.targetTimer = 0;
    this.stuckTimer = 0;
    this.wobble = Math.random() * 10;
  }

  update(participant, game, dt) {
    const vehicle = participant.vehicle;
    const neutral = {
      steer: 0,
      accel: 0,
      brake: 0,
      fire: false,
      firePressed: false,
      alt: false,
      altPressed: false,
      boost: false,
      lookBack: false,
      pause: false,
    };

    if (!vehicle || !vehicle.isAlive()) {
      return neutral;
    }

    const { level, participants, pickupSystem, modeId } = game;
    this.targetTimer -= dt;

    if (this.targetTimer <= 0 || !participants.find((item) => item.id === this.targetId)?.vehicle?.isAlive()) {
      const freshTarget = nearestEnemy(vehicle, participants);
      this.targetId = freshTarget?.id ?? null;
      this.targetTimer = 0.7 + Math.random() * 0.7;
    }

    let attackTarget = participants.find((item) => item.id === this.targetId)?.vehicle ?? nearestEnemy(vehicle, participants);
    let primaryGoal = null;
    const pickup = nearestPickup(vehicle, pickupSystem);
    const healthRatio = vehicle.health / vehicle.maxHealth;

    if (modeId === "combatRace" && level.checkpoints.length) {
      primaryGoal = getCheckpoint(level, vehicle.nextCheckpoint);
      if (!vehicle.specialWeaponId && pickup && distance(vehicle.x, vehicle.y, pickup.x, pickup.y) < 360 + this.difficulty.chase * 80) {
        primaryGoal = pickup;
      } else if (
        attackTarget
        && distance(vehicle.x, vehicle.y, attackTarget.x, attackTarget.y) < 300 + this.difficulty.aggression * 160
        && this.difficulty.aggression > 0.62
      ) {
        primaryGoal = attackTarget;
      }
    } else {
      if ((!vehicle.specialWeaponId || healthRatio < 0.42) && pickup && distance(vehicle.x, vehicle.y, pickup.x, pickup.y) < 420) {
        primaryGoal = pickup;
      } else {
        primaryGoal = attackTarget ?? { x: level.world.width * 0.5, y: level.world.height * 0.5 };
      }
    }

    attackTarget = attackTarget ?? nearestEnemy(vehicle, participants);
    primaryGoal = primaryGoal ?? attackTarget ?? { x: level.world.width * 0.5, y: level.world.height * 0.5 };

    if (vehicle.speed < 85) {
      this.stuckTimer += dt;
    } else {
      this.stuckTimer = Math.max(0, this.stuckTimer - dt * 2);
    }

    const angleError = signedAngleToTarget(vehicle.angle, vehicle.x, vehicle.y, primaryGoal.x, primaryGoal.y) + Math.sin(game.time * 0.8 + this.wobble) * 0.035;
    const steer = clamp(angleError * 1.9, -1, 1);
    const distanceToGoal = distance(vehicle.x, vehicle.y, primaryGoal.x, primaryGoal.y);
    const hardTurn = Math.abs(angleError) > 1.05;
    const mediumTurn = Math.abs(angleError) > 0.55;

    let accel = hardTurn ? 0.25 : mediumTurn ? 0.66 : this.difficulty.throttle;
    let brake = hardTurn ? 0.78 : 0;

    if (this.stuckTimer > this.difficulty.recovery * 1.45) {
      accel = 0;
      brake = 1;
    } else if (attackTarget && this.difficulty.aggression > 0.72) {
      const attackAngle = Math.abs(signedAngleToTarget(vehicle.angle, vehicle.x, vehicle.y, attackTarget.x, attackTarget.y));
      const attackDistance = distance(vehicle.x, vehicle.y, attackTarget.x, attackTarget.y);
      if (attackDistance < 200 && attackAngle < 0.18) {
        accel = 1;
      }
    }

    const targetAngle = attackTarget ? Math.abs(signedAngleToTarget(vehicle.angle, vehicle.x, vehicle.y, attackTarget.x, attackTarget.y)) : Number.POSITIVE_INFINITY;
    const targetDistance = attackTarget ? distance(vehicle.x, vehicle.y, attackTarget.x, attackTarget.y) : Number.POSITIVE_INFINITY;

    const fire = !!attackTarget
      && targetDistance < 620
      && targetAngle < clamp(0.27 + (1 - this.difficulty.aim) * 0.1, 0.18, 0.34)
      && (modeId !== "combatRace" || targetDistance < 480 || targetAngle < 0.16);

    let altPressed = false;
    if (vehicle.specialWeaponId && vehicle.specialCooldown <= 0) {
      if (vehicle.specialWeaponId === "shield") {
        altPressed = healthRatio < 0.52 && targetDistance < 450;
      } else if (vehicle.specialWeaponId === "mine") {
        altPressed = targetDistance < 260 && targetAngle > 1.85;
      } else if (vehicle.specialWeaponId === "emp" || vehicle.specialWeaponId === "shockwave") {
        altPressed = targetDistance < 220;
      } else if (vehicle.specialWeaponId === "flak") {
        altPressed = targetDistance < 260 && targetAngle < 0.36;
      } else if (vehicle.specialWeaponId === "rail") {
        altPressed = targetDistance < 900 && targetAngle < 0.12;
      } else if (vehicle.specialWeaponId === "arc") {
        altPressed = targetDistance < 380 && targetAngle < 0.4;
      } else {
        altPressed = targetDistance < 560 && targetAngle < 0.28;
      }
    }

    const shouldBoostForChase = attackTarget && targetDistance > 280 && targetDistance < 700 && targetAngle < 0.25;
    const boost = vehicle.boost > 32
      && !hardTurn
      && vehicle.forwardSpeed > 120
      && (distanceToGoal > 280 || shouldBoostForChase)
      && Math.random() < this.difficulty.boostUse;

    return {
      steer,
      accel,
      brake,
      fire,
      firePressed: fire,
      alt: altPressed,
      altPressed,
      boost,
      lookBack: false,
      pause: false,
    };
  }
}
