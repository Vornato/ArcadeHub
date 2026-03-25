import { BOT_DIFFICULTIES, GRAPPLE_STATES } from "./constants.js";
import { clamp, distance, distanceToPolyline, lerp, signedAngleToTarget } from "./physics.js";
import { getCheckpoint, sampleSurface } from "./levelManager.js";

const pathMeasureCache = new WeakMap();

function scoreTarget(vehicle, participant) {
  const target = participant?.vehicle;
  if (!target?.isAlive()) {
    return -Infinity;
  }
  const dist = distance(vehicle.x, vehicle.y, target.x, target.y);
  const healthFactor = 1 - target.health / target.maxHealth;
  return 900 - dist + healthFactor * 180 + target.kills * 30 + (participant?.human ? 240 : 0);
}

function nearestEnemy(vehicle, participants) {
  let best = null;
  let bestScore = -Infinity;
  for (const participant of participants) {
    const target = participant.vehicle;
    if (!target || target.id === vehicle.id || !target.isAlive()) {
      continue;
    }
    const score = scoreTarget(vehicle, participant);
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

function racingGoal(level, vehicle) {
  const current = getCheckpoint(level, vehicle.nextCheckpoint);
  const next = getCheckpoint(level, vehicle.nextCheckpoint + 1);
  return {
    x: current.x * 0.64 + next.x * 0.36,
    y: current.y * 0.64 + next.y * 0.36,
    current,
    next,
  };
}

function predictTarget(target, leadSeconds = 0.55) {
  return {
    x: target.x + target.vx * leadSeconds,
    y: target.y + target.vy * leadSeconds,
  };
}

function getDrivePaths(level) {
  const paths = [];
  if (level.trackPath?.length) {
    paths.push({
      points: level.trackPath,
      width: level.trackWidth,
      closed: true,
    });
  }
  for (const shortcut of level.shortcutPaths ?? []) {
    paths.push({
      points: shortcut.points,
      width: shortcut.width,
      closed: false,
    });
  }
  for (const roadPath of level.roadPaths ?? []) {
    paths.push({
      points: roadPath.points,
      width: roadPath.width,
      closed: roadPath.closed ?? false,
    });
  }
  return paths.filter((path) => path.points?.length >= 2);
}

function getPathMeasure(path) {
  const cached = pathMeasureCache.get(path.points);
  if (cached?.closed === path.closed) {
    return cached;
  }

  const segmentLengths = [];
  const cumulative = [0];
  const end = path.closed ? path.points.length : path.points.length - 1;
  for (let index = 0; index < end; index += 1) {
    const a = path.points[index];
    const b = path.points[(index + 1) % path.points.length];
    const length = Math.max(1, distance(a.x, a.y, b.x, b.y));
    segmentLengths.push(length);
    cumulative.push(cumulative[cumulative.length - 1] + length);
  }

  const measure = {
    closed: path.closed,
    segmentLengths,
    cumulative,
    totalLength: cumulative[cumulative.length - 1],
  };
  pathMeasureCache.set(path.points, measure);
  return measure;
}

function getPathProgress(path, projection) {
  const measure = getPathMeasure(path);
  if (projection.index < 0 || !measure.segmentLengths.length) {
    return 0;
  }
  return measure.cumulative[projection.index] + measure.segmentLengths[projection.index] * projection.t;
}

function samplePathPosition(path, progress) {
  const measure = getPathMeasure(path);
  if (!measure.totalLength || !path.points.length) {
    return path.points[0] ?? { x: 0, y: 0 };
  }

  let cursor = progress;
  if (path.closed) {
    cursor %= measure.totalLength;
    if (cursor < 0) {
      cursor += measure.totalLength;
    }
  } else {
    cursor = clamp(cursor, 0, measure.totalLength);
  }

  let segmentIndex = measure.segmentLengths.length - 1;
  for (let index = 0; index < measure.segmentLengths.length; index += 1) {
    if (cursor <= measure.cumulative[index + 1]) {
      segmentIndex = index;
      break;
    }
  }

  const segmentLength = measure.segmentLengths[segmentIndex] || 1;
  const localT = clamp((cursor - measure.cumulative[segmentIndex]) / segmentLength, 0, 1);
  const a = path.points[segmentIndex];
  const b = path.points[(segmentIndex + 1) % path.points.length];
  return {
    x: lerp(a.x, b.x, localT),
    y: lerp(a.y, b.y, localT),
  };
}

function choosePathDirection(path, currentProgress, targetProgress) {
  const measure = getPathMeasure(path);
  if (!path.closed || !measure.totalLength) {
    return targetProgress >= currentProgress ? 1 : -1;
  }

  const forwardDistance = (targetProgress - currentProgress + measure.totalLength) % measure.totalLength;
  const backwardDistance = (currentProgress - targetProgress + measure.totalLength) % measure.totalLength;
  return forwardDistance <= backwardDistance ? 1 : -1;
}

function chooseDriveGoal(level, vehicle, target, surface) {
  const drivePaths = getDrivePaths(level);
  if (!drivePaths.length) {
    return target;
  }

  let best = null;
  for (const path of drivePaths) {
    const vehicleProjection = distanceToPolyline(vehicle.x, vehicle.y, path.points, path.closed);
    const targetProjection = distanceToPolyline(target.x, target.y, path.points, path.closed);
    const score = vehicleProjection.distance * (surface.offroad ? 1.6 : 1.05)
      + targetProjection.distance * 1.25;
    if (!best || score < best.score) {
      best = {
        path,
        vehicleProjection,
        targetProjection,
        score,
      };
    }
  }

  if (!best) {
    return target;
  }

  const currentProgress = getPathProgress(best.path, best.vehicleProjection);
  const targetProgress = getPathProgress(best.path, best.targetProjection);
  const direction = choosePathDirection(best.path, currentProgress, targetProgress);
  const lookahead = clamp(220 + vehicle.speed * 0.45 + (surface.offroad ? 220 : 0), 200, best.path.closed ? 760 : 620);
  const roadLead = samplePathPosition(best.path, currentProgress + direction * lookahead);
  const targetLead = samplePathPosition(best.path, targetProgress);
  const snapWeight = surface.offroad
    ? 0.84
    : clamp(best.vehicleProjection.distance / Math.max(60, (best.path.width ?? 140) * 0.65), 0.34, 0.7);
  const blendedRoadTarget = {
    x: lerp(roadLead.x, targetLead.x, 0.28),
    y: lerp(roadLead.y, targetLead.y, 0.28),
  };
  return {
    x: lerp(target.x, blendedRoadTarget.x, snapWeight),
    y: lerp(target.y, blendedRoadTarget.y, snapWeight),
  };
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
      hook: false,
      hookPressed: false,
      hookCancel: false,
      hookCancelPressed: false,
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
    const surface = sampleSurface(level, vehicle.x, vehicle.y, game.time);

    if ((modeId === "combatRace" || modeId === "driftAttack") && level.checkpoints.length) {
      primaryGoal = racingGoal(level, vehicle);
      if (!vehicle.specialWeaponId && pickup && distance(vehicle.x, vehicle.y, pickup.x, pickup.y) < 360 + this.difficulty.chase * 80) {
        primaryGoal = pickup;
      } else if (
        attackTarget
        && distance(vehicle.x, vehicle.y, attackTarget.x, attackTarget.y) < 300 + this.difficulty.aggression * 160
        && this.difficulty.aggression > 0.62
      ) {
        primaryGoal = predictTarget(attackTarget, 0.45 + this.difficulty.aim * 0.2);
      }
    } else {
      if (modeId === "survival" && game.match?.safeZone) {
        const safeZone = game.match.safeZone;
        const distanceFromCenter = distance(vehicle.x, vehicle.y, safeZone.x, safeZone.y);
        if (distanceFromCenter > safeZone.radius * 0.82) {
          primaryGoal = { x: safeZone.x, y: safeZone.y };
        }
      }
      if ((!vehicle.specialWeaponId || healthRatio < 0.42) && pickup && distance(vehicle.x, vehicle.y, pickup.x, pickup.y) < 420) {
        primaryGoal = pickup;
      } else {
        primaryGoal = attackTarget
          ? predictTarget(attackTarget, 0.5 + this.difficulty.aim * 0.22)
          : { x: level.world.width * 0.5, y: level.world.height * 0.5 };
      }
    }

    attackTarget = attackTarget ?? nearestEnemy(vehicle, participants);
    primaryGoal = primaryGoal ?? attackTarget ?? { x: level.world.width * 0.5, y: level.world.height * 0.5 };
    const navigationGoal = chooseDriveGoal(level, vehicle, primaryGoal, surface);

    if (vehicle.speed < 85) {
      this.stuckTimer += dt;
    } else {
      this.stuckTimer = Math.max(0, this.stuckTimer - dt * 2);
    }

    const angleError = signedAngleToTarget(vehicle.angle, vehicle.x, vehicle.y, navigationGoal.x, navigationGoal.y)
      + Math.sin(game.time * 0.8 + this.wobble) * (surface.offroad ? 0.012 : 0.024);
    const steer = clamp(angleError * 1.9, -1, 1);
    const distanceToGoal = distance(vehicle.x, vehicle.y, navigationGoal.x, navigationGoal.y);
    const speedRatio = vehicle.speed / vehicle.definition.speed;
    const nextGoal = level.checkpoints.length ? getCheckpoint(level, vehicle.nextCheckpoint + 1) : primaryGoal;
    const exitAngle = signedAngleToTarget(vehicle.angle, vehicle.x, vehicle.y, nextGoal.x, nextGoal.y);
    const cornerSeverity = clamp(Math.abs(angleError) * 0.78 + Math.abs(exitAngle) * 0.42 + speedRatio * 0.25, 0, 1.4);
    const hardTurn = cornerSeverity > 0.98;
    const mediumTurn = cornerSeverity > 0.56;
    const driftWindow = vehicle.speed > vehicle.definition.speed * 0.46
      && Math.abs(steer) > 0.48
      && cornerSeverity > 0.72
      && !vehicle.airborne;

    let accel = hardTurn ? 0.28 : mediumTurn ? 0.68 : this.difficulty.throttle;
    let brake = hardTurn ? 0.82 * this.difficulty.brakeSense : 0;

    if (cornerSeverity > 0.44 && vehicle.speed > vehicle.definition.speed * (0.54 + this.difficulty.brakeSense * 0.06)) {
      brake = Math.max(brake, clamp(cornerSeverity * 0.72 * this.difficulty.brakeSense, 0, 1));
      accel = Math.min(accel, 0.72);
    }

    if (driftWindow) {
      brake = Math.max(brake, 0.24 + cornerSeverity * 0.28);
      accel = Math.max(accel, 0.54);
    }

    if (surface.offroad) {
      accel = Math.min(accel, 0.72);
      brake = Math.max(brake, 0.14 + cornerSeverity * 0.18);
    }

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
      && cornerSeverity < 0.54
      && vehicle.forwardSpeed > 120
      && !surface.offroad
      && (distanceToGoal > 280 || shouldBoostForChase)
      && (driftWindow ? Math.random() < this.difficulty.boostUse * 0.45 : Math.random() < this.difficulty.boostUse);

    const hook = vehicle.grapple;
    const hookReady = hook
      && hook.cooldown <= 0
      && hook.recovery <= 0
      && (hook.state === GRAPPLE_STATES.idle || hook.state === GRAPPLE_STATES.aiming || hook.state === GRAPPLE_STATES.cooldown);
    const hookWindow = !!attackTarget
      && targetDistance < (modeId === "hookClash" ? 520 : 380)
      && targetAngle < (modeId === "hookClash" ? 0.24 : 0.14)
      && vehicle.forwardSpeed > 120;
    const hookPressed = !!hookReady && hookWindow;
    const hookCancelPressed = !!hook
      && (hook.state === GRAPPLE_STATES.attachedVehicle || hook.state === GRAPPLE_STATES.attachedWorld)
      && (hook.tetherTension > 0.94 || (hook.targetId && targetDistance < 90));

    return {
      steer,
      accel,
      brake: vehicle.forwardSpeed > 150 && Math.abs(steer) > 0.5 ? Math.max(brake, driftWindow ? 0.24 : 0.16) : brake,
      fire,
      firePressed: fire,
      alt: altPressed,
      altPressed,
      boost,
      hook: hookPressed,
      hookPressed,
      hookCancel: hookCancelPressed,
      hookCancelPressed,
      lookBack: false,
      pause: false,
    };
  }
}
