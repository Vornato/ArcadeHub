import { GRAPPLE_STATES, GRAPPLE_TUNING } from "./constants.js";
import { angleToVector, clamp, distance, dot, projectPointToSegment, segmentCircleHit, segmentRectHit } from "./physics.js";
import { getHookDebugAnchors, getHookableProps } from "./levelManager.js";

function getMountPoint(vehicle) {
  const forward = angleToVector(vehicle.angle);
  return {
    x: vehicle.x + forward.x * (vehicle.radius + 12),
    y: vehicle.y + forward.y * (vehicle.radius + 12),
  };
}

function getAimAngle(vehicle, controls, hook) {
  const aimX = controls.aimX ?? 0;
  const aimY = controls.aimY ?? 0;
  const strength = Math.hypot(aimX, aimY);
  if (strength >= GRAPPLE_TUNING.aimDeadzone) {
    hook.aimStrength = clamp((strength - GRAPPLE_TUNING.aimDeadzone) / (1 - GRAPPLE_TUNING.aimDeadzone), 0, 1);
    hook.aimAngle = Math.atan2(aimY, aimX);
    return { angle: hook.aimAngle, active: true };
  }

  hook.aimStrength = 0;
  hook.aimAngle = vehicle.angle;
  return { angle: vehicle.angle, active: false };
}

function closestPointOnRectPerimeter(x, y, rect) {
  const left = rect.x;
  const right = rect.x + rect.w;
  const top = rect.y;
  const bottom = rect.y + rect.h;
  const clampedX = clamp(x, left, right);
  const clampedY = clamp(y, top, bottom);
  const options = [
    { x: clampedX, y: top },
    { x: right, y: clampedY },
    { x: clampedX, y: bottom },
    { x: left, y: clampedY },
  ];

  let best = options[0];
  let bestDistance = distance(x, y, best.x, best.y);
  for (let index = 1; index < options.length; index += 1) {
    const option = options[index];
    const currentDistance = distance(x, y, option.x, option.y);
    if (currentDistance < bestDistance) {
      bestDistance = currentDistance;
      best = option;
    }
  }
  return best;
}

function stateDisplayFor(hook, aimingActive) {
  if (hook.state === GRAPPLE_STATES.fired
    || hook.state === GRAPPLE_STATES.attachedVehicle
    || hook.state === GRAPPLE_STATES.attachedWorld
    || hook.state === GRAPPLE_STATES.retracting) {
    return hook.state;
  }
  if (hook.cooldown > 0 || hook.recovery > 0) {
    return GRAPPLE_STATES.cooldown;
  }
  return aimingActive ? GRAPPLE_STATES.aiming : GRAPPLE_STATES.idle;
}

function signWithFallback(primary, fallback = 1) {
  if (primary > 0.001) {
    return 1;
  }
  if (primary < -0.001) {
    return -1;
  }
  return fallback >= 0 ? 1 : -1;
}

function getVehicleResistance(vehicle, extraScale = 1) {
  return Math.max(0.78, vehicle.mass * (0.84 + vehicle.definition.traction * extraScale));
}

export class GrappleSystem {
  constructor() {
    this.debug = false;
    this.lineHitCooldowns = new Map();
  }

  reset() {
    this.lineHitCooldowns.clear();
  }

  toggleDebug() {
    this.debug = !this.debug;
  }

  update(dt, participants, level, props, pickups, effects, audio) {
    for (const [key, value] of this.lineHitCooldowns.entries()) {
      const next = value - dt;
      if (next <= 0) {
        this.lineHitCooldowns.delete(key);
      } else {
        this.lineHitCooldowns.set(key, next);
      }
    }

    const vehiclesById = new Map(participants.map((participant) => [participant.id, participant.vehicle]));
    const hookableProps = getHookableProps(props);
    const events = [];

    for (const participant of participants) {
      this.updateVehicle(dt, participant, participants, vehiclesById, level, props, pickups, hookableProps, effects, audio, events);
    }

    return events;
  }

  registerImpact(vehicle, impactSpeed, effects, audio) {
    if (!vehicle?.grapple || impactSpeed < GRAPPLE_TUNING.breakImpactSpeed) {
      return;
    }
    this.breakTether(vehicle, "OVERLOAD", effects, audio, true);
  }

  registerBoundaryImpact(vehicle, severity, effects, audio) {
    if (!vehicle?.grapple || severity < GRAPPLE_TUNING.breakBoundarySeverity) {
      return;
    }
    this.breakTether(vehicle, "WALL SNAP", effects, audio, true);
  }

  updateVehicle(dt, participant, participants, vehiclesById, level, props, pickups, hookableProps, effects, audio, events) {
    const vehicle = participant.vehicle;
    const controls = participant.controls ?? {};
    const hook = vehicle.grapple;

    if (!vehicle.isAlive()) {
      vehicle.resetGrappleState(vehicle.angle);
      return;
    }

    hook.cooldown = Math.max(0, hook.cooldown - dt);
    hook.recovery = Math.max(0, hook.recovery - dt);
    hook.holdTimer = Math.max(0, hook.holdTimer - dt);
    hook.effectTimer = Math.max(0, hook.effectTimer - dt);

    const aim = getAimAngle(vehicle, controls, hook);

    if (controls.hookCancelPressed) {
      if (hook.state === GRAPPLE_STATES.fired
        || hook.state === GRAPPLE_STATES.attachedVehicle
        || hook.state === GRAPPLE_STATES.attachedWorld) {
        this.beginRetract(vehicle, effects, audio, GRAPPLE_TUNING.cancelRecovery, "CANCEL");
      }
    } else if (controls.hookPressed
      && hook.cooldown <= 0
      && hook.recovery <= 0
      && (hook.state === GRAPPLE_STATES.idle || hook.state === GRAPPLE_STATES.aiming || hook.state === GRAPPLE_STATES.cooldown)) {
      this.fire(vehicle, effects, audio);
    }

    if (hook.state === GRAPPLE_STATES.fired) {
      this.updateProjectile(dt, vehicle, participants, level, props, pickups, hookableProps, effects, audio, events);
    } else if (hook.state === GRAPPLE_STATES.attachedVehicle) {
      this.updateVehicleTether(dt, vehicle, controls, vehiclesById, effects, audio, events);
    } else if (hook.state === GRAPPLE_STATES.attachedWorld) {
      this.updateWorldTether(dt, vehicle, controls, participants, props, pickups, effects, audio, events);
    } else if (hook.state === GRAPPLE_STATES.retracting) {
      this.updateRetraction(dt, vehicle);
    }

    hook.state = stateDisplayFor(hook, aim.active);
  }

  fire(vehicle, effects, audio) {
    const hook = vehicle.grapple;
    const mount = getMountPoint(vehicle);
    const direction = angleToVector(hook.aimAngle);

    hook.state = GRAPPLE_STATES.fired;
    hook.cooldown = GRAPPLE_TUNING.cooldown;
    hook.projectileX = mount.x;
    hook.projectileY = mount.y;
    hook.projectilePrevX = mount.x;
    hook.projectilePrevY = mount.y;
    hook.projectileVx = direction.x * GRAPPLE_TUNING.projectileSpeed + vehicle.vx * 0.18;
    hook.projectileVy = direction.y * GRAPPLE_TUNING.projectileSpeed + vehicle.vy * 0.18;
    hook.projectileTravel = 0;
    hook.tetherTension = 0;
    hook.targetId = null;
    hook.anchorSourceId = null;
    hook.anchorKind = null;
    effects.emitGrappleFire(mount.x, mount.y, hook.aimAngle, vehicle.trimColor);
    audio.playSfx("grappleFire", 0.24);
  }

  updateProjectile(dt, vehicle, participants, level, props, pickups, hookableProps, effects, audio, events) {
    const hook = vehicle.grapple;
    hook.projectilePrevX = hook.projectileX;
    hook.projectilePrevY = hook.projectileY;
    hook.projectileX += hook.projectileVx * dt;
    hook.projectileY += hook.projectileVy * dt;
    hook.projectileTravel += Math.hypot(hook.projectileVx, hook.projectileVy) * dt;

    let bestHit = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const participant of participants) {
      const target = participant.vehicle;
      if (!target || target.id === vehicle.id || !target.isAlive()) {
        continue;
      }
      if (!segmentCircleHit(hook.projectilePrevX, hook.projectilePrevY, hook.projectileX, hook.projectileY, target.x, target.y, target.radius + 6)) {
        continue;
      }
      const hitDistance = distance(hook.projectilePrevX, hook.projectilePrevY, target.x, target.y);
      if (hitDistance < bestDistance) {
        bestDistance = hitDistance;
        bestHit = {
          kind: "vehicle",
          target,
          x: target.x,
          y: target.y,
        };
      }
    }

    for (const propState of hookableProps) {
      if (!segmentCircleHit(hook.projectilePrevX, hook.projectilePrevY, hook.projectileX, hook.projectileY, propState.x, propState.y, propState.radius + 8)) {
        continue;
      }
      const hitDistance = distance(hook.projectilePrevX, hook.projectilePrevY, propState.x, propState.y);
      if (hitDistance < bestDistance) {
        bestDistance = hitDistance;
        bestHit = {
          kind: "world_prop",
          target: propState,
          x: propState.x,
          y: propState.y,
        };
      }
    }

    for (const pickup of pickups ?? []) {
      if (!pickup.active) {
        continue;
      }
      if (!segmentCircleHit(hook.projectilePrevX, hook.projectilePrevY, hook.projectileX, hook.projectileY, pickup.x, pickup.y, 24)) {
        continue;
      }
      const hitDistance = distance(hook.projectilePrevX, hook.projectilePrevY, pickup.x, pickup.y);
      if (hitDistance < bestDistance) {
        bestDistance = hitDistance;
        bestHit = {
          kind: "pickup",
          target: pickup,
          x: pickup.x,
          y: pickup.y,
        };
      }
    }

    for (const propState of props) {
      if (hookableProps.includes(propState) || !propState.active) {
        continue;
      }
      if (!segmentCircleHit(hook.projectilePrevX, hook.projectilePrevY, hook.projectileX, hook.projectileY, propState.x, propState.y, propState.radius + 6)) {
        continue;
      }
      const hitDistance = distance(hook.projectilePrevX, hook.projectilePrevY, propState.x, propState.y);
      if (hitDistance < bestDistance) {
        bestDistance = hitDistance;
        bestHit = {
          kind: "invalid",
          x: propState.x,
          y: propState.y,
        };
      }
    }

    for (const obstacle of level.obstacles ?? []) {
      if (!segmentRectHit(hook.projectilePrevX, hook.projectilePrevY, hook.projectileX, hook.projectileY, obstacle)) {
        continue;
      }
      const anchor = closestPointOnRectPerimeter(hook.projectileX, hook.projectileY, obstacle);
      const hitDistance = distance(hook.projectilePrevX, hook.projectilePrevY, anchor.x, anchor.y);
      if (hitDistance < bestDistance) {
        bestDistance = hitDistance;
        bestHit = {
          kind: "world_rect",
          x: anchor.x,
          y: anchor.y,
        };
      }
    }

    if (bestHit?.kind === "vehicle") {
      this.attachVehicle(vehicle, bestHit.target, effects, audio, events);
      return;
    }
    if (bestHit?.kind === "world_prop") {
      this.attachWorld(vehicle, bestHit.x, bestHit.y, "prop", bestHit.target.id, effects, audio, events);
      return;
    }
    if (bestHit?.kind === "pickup") {
      this.attachWorld(vehicle, bestHit.x, bestHit.y, "pickup", bestHit.target.id, effects, audio, events);
      if (vehicle.isHuman) {
        vehicle.queueHudMessage("PICKUP SNAG", "Reeling it in", vehicle.color, 0.8);
      }
      return;
    }
    if (bestHit?.kind === "world_rect") {
      this.attachWorld(vehicle, bestHit.x, bestHit.y, "world", null, effects, audio, events);
      return;
    }
    if (bestHit?.kind === "invalid") {
      effects.emitGrappleBreak(bestHit.x, bestHit.y, hook.aimAngle, "#ffd166");
      this.beginRetract(vehicle, effects, audio, GRAPPLE_TUNING.missRecovery, "MISS");
      return;
    }

    if (hook.projectileTravel >= GRAPPLE_TUNING.range) {
      this.beginRetract(vehicle, effects, audio, GRAPPLE_TUNING.missRecovery, "MISS");
    }
  }

  attachVehicle(vehicle, target, effects, audio, events) {
    const hook = vehicle.grapple;
    const mount = getMountPoint(vehicle);
    const anchorDistance = distance(mount.x, mount.y, target.x, target.y);
    hook.state = GRAPPLE_STATES.attachedVehicle;
    hook.targetId = target.id;
    hook.anchorKind = "vehicle";
    hook.anchorSourceId = target.id;
    hook.anchorX = target.x;
    hook.anchorY = target.y;
    hook.restLength = Math.max(GRAPPLE_TUNING.minLength, anchorDistance - GRAPPLE_TUNING.attachSlack);
    hook.breakDistance = Math.max(hook.restLength + 80, GRAPPLE_TUNING.breakDistance);
    hook.holdTimer = GRAPPLE_TUNING.maxHoldTime;
    hook.tetherTension = 0.24;
    effects.emitGrappleLatch(target.x, target.y, target.trimColor ?? target.color, 1.1);
    audio.playSfx("grappleLatch", 0.32);
    if (target.isHuman) {
      target.queueWarning("HOOKED", "Punch boost or cut wide", vehicle.color, 0.75);
    }
    if (vehicle.isHuman) {
      vehicle.queueHudMessage("CAR HOOK", `${target.label} on tether`, vehicle.color, 0.9);
    }
    events.push({ type: "shake", x: target.x, y: target.y, amount: 5 });
  }

  attachWorld(vehicle, x, y, anchorKind, anchorSourceId, effects, audio, events) {
    const hook = vehicle.grapple;
    const mount = getMountPoint(vehicle);
    const anchorDistance = distance(mount.x, mount.y, x, y);
    hook.state = GRAPPLE_STATES.attachedWorld;
    hook.anchorKind = anchorKind;
    hook.anchorSourceId = anchorSourceId;
    hook.targetId = null;
    hook.anchorX = x;
    hook.anchorY = y;
    hook.restLength = Math.max(GRAPPLE_TUNING.minLength, anchorDistance - GRAPPLE_TUNING.attachSlack);
    hook.breakDistance = Math.max(hook.restLength + 90, GRAPPLE_TUNING.breakDistance);
    hook.holdTimer = GRAPPLE_TUNING.maxHoldTime;
    hook.tetherTension = 0.18;
    effects.emitGrappleLatch(x, y, vehicle.trimColor, 0.9);
    audio.playSfx("grappleLatch", 0.28);
    if (vehicle.isHuman) {
      vehicle.queueHudMessage("ANCHOR LOCK", "Swing the line", vehicle.color, 0.9);
    }
    events.push({ type: "shake", x, y, amount: 3 });
  }

  updateVehicleTether(dt, vehicle, controls, vehiclesById, effects, audio, events) {
    const hook = vehicle.grapple;
    const target = vehiclesById.get(hook.targetId);
    if (!target || !target.isAlive()) {
      this.breakTether(vehicle, "LOST TARGET", effects, audio, false);
      return;
    }

    const mount = getMountPoint(vehicle);
    const dx = target.x - mount.x;
    const dy = target.y - mount.y;
    const currentDistance = Math.hypot(dx, dy) || 1;
    const dirX = dx / currentDistance;
    const dirY = dy / currentDistance;
    const stretch = Math.max(0, currentDistance - hook.restLength);
    const tension = clamp(stretch / Math.max(60, hook.breakDistance - hook.restLength), 0, 1);
    hook.anchorX = target.x;
    hook.anchorY = target.y;
    hook.tetherTension = tension;

    if (currentDistance > hook.breakDistance || hook.holdTimer <= 0) {
      this.breakTether(vehicle, "LINE SNAP", effects, audio, true);
      return;
    }

    const drivePressure = clamp(
      (controls.accel ?? 0)
        + Math.max(0, vehicle.forwardSpeed) / Math.max(1, vehicle.definition.speed) * 0.82
        + (vehicle.boosting ? GRAPPLE_TUNING.boostPullBonus : 0),
      0.2,
      2.4,
    );
    const targetResistance = getVehicleResistance(target, GRAPPLE_TUNING.targetResistanceScale);
    const attackerResistance = Math.max(0.74, vehicle.mass);
    const pullForce = ((GRAPPLE_TUNING.vehiclePullForce + stretch * GRAPPLE_TUNING.vehicleSpringForce) * drivePressure)
      * (1 + vehicle.mass * GRAPPLE_TUNING.attackerMassScale)
      * (vehicle.airborne ? GRAPPLE_TUNING.airPullScale : 1);
    const targetImpulse = (pullForce * tension * dt) / targetResistance;
    const attackerImpulse = (pullForce * GRAPPLE_TUNING.vehicleRecoil * tension * dt) / attackerResistance;

    target.vx += dirX * targetImpulse;
    target.vy += dirY * targetImpulse;
    vehicle.vx -= dirX * attackerImpulse;
    vehicle.vy -= dirY * attackerImpulse;

    const sideX = -dirY;
    const sideY = dirX;
    const sideBias = signWithFallback(dot(vehicle.vx, vehicle.vy, sideX, sideY) + (controls.steer ?? 0) * 120, controls.steer ?? 1);
    const targetForward = angleToVector(target.angle);
    const sideAngle = Math.abs(dot(targetForward.x, targetForward.y, sideX, sideY));
    const destabilize = (GRAPPLE_TUNING.vehicleDestabilizeForce * tension * sideAngle * drivePressure * dt) / targetResistance;
    target.vx += sideX * sideBias * destabilize;
    target.vy += sideY * sideBias * destabilize;
    target.angle += sideBias * tension * GRAPPLE_TUNING.vehicleYawPull * dt / Math.max(0.9, target.mass);

    if (tension > 0.66 && hook.effectTimer <= 0) {
      const sparkX = mount.x + dx * 0.65;
      const sparkY = mount.y + dy * 0.65;
      effects.emitGrappleTension(sparkX, sparkY, Math.atan2(dy, dx), target.trimColor ?? target.color, 0.9 + tension * 0.35);
      hook.effectTimer = 0.045;
    }

    if (tension > 0.86 && drivePressure > 1.35 && target.isHuman) {
      target.queueWarning("TETHER LOAD", "Break the angle", target.color, 0.35);
    }

    if (tension > 0.7 && vehicle.boosting) {
      events.push({ type: "shake", x: target.x, y: target.y, amount: 2.4 + tension * 2 });
    }
  }

  updateWorldTether(dt, vehicle, controls, participants, props, pickups, effects, audio, events) {
    const hook = vehicle.grapple;
    if (hook.anchorKind === "prop") {
      const propState = props.find((entry) => entry.id === hook.anchorSourceId);
      if (!propState?.active) {
        this.breakTether(vehicle, "ANCHOR LOST", effects, audio, false);
        return;
      }
      hook.anchorX = propState.x;
      hook.anchorY = propState.y;
    } else if (hook.anchorKind === "pickup") {
      const pickup = (pickups ?? []).find((entry) => entry.id === hook.anchorSourceId && entry.active);
      if (!pickup) {
        this.breakTether(vehicle, "ANCHOR LOST", effects, audio, false);
        return;
      }
      this.updatePickupTether(dt, vehicle, pickup, effects, audio);
      return;
    }

    const mount = getMountPoint(vehicle);
    const dx = hook.anchorX - mount.x;
    const dy = hook.anchorY - mount.y;
    const currentDistance = Math.hypot(dx, dy) || 1;
    const dirX = dx / currentDistance;
    const dirY = dy / currentDistance;
    const stretch = Math.max(0, currentDistance - hook.restLength);
    const tension = clamp(stretch / Math.max(60, hook.breakDistance - hook.restLength), 0, 1);
    hook.tetherTension = tension;

    if (currentDistance > hook.breakDistance || hook.holdTimer <= 0) {
      this.breakTether(vehicle, "CABLE CUT", effects, audio, true);
      return;
    }

    const resistance = getVehicleResistance(vehicle, GRAPPLE_TUNING.worldResistanceScale);
    const pullForce = (GRAPPLE_TUNING.worldPullForce + stretch * GRAPPLE_TUNING.worldSpringForce)
      * (vehicle.airborne ? GRAPPLE_TUNING.airPullScale : 1);
    const tangentX = -dirY;
    const tangentY = dirX;
    const tangentSpeed = dot(vehicle.vx, vehicle.vy, tangentX, tangentY);
    const tangentCarry = clamp(Math.abs(tangentSpeed) / Math.max(180, vehicle.definition.speed * 0.7), 0, 1.25);
    const inwardScale = clamp(1 - tangentCarry * GRAPPLE_TUNING.worldInwardReduction, 0.38, 1);
    const inwardImpulse = (pullForce * tension * dt * inwardScale) / resistance;
    vehicle.vx += dirX * inwardImpulse;
    vehicle.vy += dirY * inwardImpulse;

    const radialSpeed = dot(vehicle.vx, vehicle.vy, dirX, dirY);
    if (radialSpeed < 0) {
      const clampImpulse = (-radialSpeed * GRAPPLE_TUNING.worldRadialClamp * tension * dt) / resistance;
      vehicle.vx += dirX * clampImpulse;
      vehicle.vy += dirY * clampImpulse;
    }

    const tangentSign = signWithFallback(tangentSpeed + (controls.steer ?? 0) * 150, vehicle.forwardSpeed);
    const throttleFactor = clamp((controls.accel ?? 0) - (controls.brake ?? 0) * 0.2 + (vehicle.boosting ? GRAPPLE_TUNING.boostSwingBonus : 0), 0, 1.8);
    const swingImpulse = (GRAPPLE_TUNING.worldSwingAssist * throttleFactor * tension * dt) / resistance;
    const orbitCarryImpulse = (Math.abs(tangentSpeed) * GRAPPLE_TUNING.worldOrbitCarry * tension * dt) / resistance;
    vehicle.vx += tangentX * tangentSign * swingImpulse;
    vehicle.vy += tangentY * tangentSign * swingImpulse;
    vehicle.vx += tangentX * tangentSign * orbitCarryImpulse;
    vehicle.vy += tangentY * tangentSign * orbitCarryImpulse;
    vehicle.angle += clamp((controls.steer ?? 0) + tangentSign * (0.22 * throttleFactor + tangentCarry * 0.28), -1.4, 1.4)
      * GRAPPLE_TUNING.worldYawAssist
      * tension
      * dt
      / Math.max(0.9, vehicle.mass);
    vehicle.angle += tangentSign
      * GRAPPLE_TUNING.worldDriftYawAssist
      * tangentCarry
      * tension
      * dt
      / Math.max(0.9, vehicle.mass);

    if (tension > 0.6 && hook.effectTimer <= 0) {
      effects.emitGrappleTension(mount.x + dx * 0.78, mount.y + dy * 0.78, Math.atan2(dy, dx), vehicle.trimColor, 0.8 + tension * 0.4);
      hook.effectTimer = 0.04;
    }

    if (tension > 0.72 && vehicle.boosting) {
      events.push({ type: "shake", x: vehicle.x, y: vehicle.y, amount: 1.6 + tension * 1.8 });
    }

    this.processCableHits(vehicle, participants, new Set(), effects, audio, events);
  }

  updatePickupTether(dt, vehicle, pickup, effects, audio) {
    const hook = vehicle.grapple;
    const mount = getMountPoint(vehicle);
    const dx = pickup.x - mount.x;
    const dy = pickup.y - mount.y;
    const currentDistance = Math.hypot(dx, dy) || 1;
    const dirX = dx / currentDistance;
    const dirY = dy / currentDistance;
    hook.anchorX = pickup.x;
    hook.anchorY = pickup.y;
    hook.tetherTension = clamp(currentDistance / Math.max(120, GRAPPLE_TUNING.range), 0.16, 1);

    if (currentDistance > hook.breakDistance || hook.holdTimer <= 0) {
      this.breakTether(vehicle, "CABLE CUT", effects, audio, true);
      return;
    }

    const carryFactor = 1 + clamp(vehicle.speed / Math.max(1, vehicle.definition.speed), 0, 1.2) * GRAPPLE_TUNING.pickupCarryFactor;
    const pullImpulse = GRAPPLE_TUNING.pickupPullForce * carryFactor * dt;
    pickup.vx -= dirX * pullImpulse;
    pickup.vy -= dirY * pullImpulse;
    pickup.pullTimer = Math.max(pickup.pullTimer ?? 0, 0.18);

    vehicle.vx -= dirX * (GRAPPLE_TUNING.pickupRecoil * dt) / Math.max(0.9, vehicle.mass);
    vehicle.vy -= dirY * (GRAPPLE_TUNING.pickupRecoil * dt) / Math.max(0.9, vehicle.mass);

    if (currentDistance <= GRAPPLE_TUNING.pickupSnapDistance && hook.effectTimer <= 0) {
      effects.emitGrappleTension(mount.x + dx * 0.5, mount.y + dy * 0.5, Math.atan2(dy, dx), vehicle.trimColor, 0.7);
      hook.effectTimer = 0.05;
    }
  }

  processCableHits(vehicle, participants, ignoredIds, effects, audio, events) {
    const hook = vehicle.grapple;
    if ((hook.state !== GRAPPLE_STATES.attachedVehicle && hook.state !== GRAPPLE_STATES.attachedWorld)
      || hook.anchorKind === "pickup"
      || hook.tetherTension < 0.2) {
      return;
    }

    const mount = getMountPoint(vehicle);
    const endX = hook.anchorX;
    const endY = hook.anchorY;
    if (distance(mount.x, mount.y, endX, endY) < 90) {
      return;
    }

    if (hook.targetId) {
      ignoredIds.add(hook.targetId);
    }

    for (const participant of participants) {
      const target = participant.vehicle;
      if (!target || !target.isAlive() || target.id === vehicle.id || ignoredIds.has(target.id) || target.airborne) {
        continue;
      }
      if (target.speed < GRAPPLE_TUNING.lineHitSpeedThreshold) {
        continue;
      }

      const hitKey = `${vehicle.id}:${target.id}`;
      if (this.lineHitCooldowns.has(hitKey)) {
        continue;
      }
      if (!segmentCircleHit(mount.x, mount.y, endX, endY, target.x, target.y, target.radius + 8)) {
        continue;
      }

      const impactPoint = projectPointToSegment(target.x, target.y, mount.x, mount.y, endX, endY);
      if (impactPoint.t <= 0.08 || impactPoint.t >= 0.92) {
        continue;
      }

      this.lineHitCooldowns.set(hitKey, GRAPPLE_TUNING.lineHitCooldown);
      const damage = clamp(
        target.speed * GRAPPLE_TUNING.lineHitDamageScale * (0.8 + hook.tetherTension * 0.45),
        GRAPPLE_TUNING.lineHitDamageMin,
        GRAPPLE_TUNING.lineHitDamageMax,
      );
      effects.emitImpactBurst(impactPoint.x, impactPoint.y, Math.atan2(endY - mount.y, endX - mount.x), vehicle.trimColor, 0.62);
      audio.playSfx("grappleLatch", 0.16);
      events.push({
        type: "line_hit",
        sourceId: vehicle.id,
        targetId: target.id,
        damage,
        x: impactPoint.x,
        y: impactPoint.y,
      });
    }
  }

  beginRetract(vehicle, effects, audio, recovery, reason) {
    const hook = vehicle.grapple;
    if (hook.state === GRAPPLE_STATES.attachedVehicle || hook.state === GRAPPLE_STATES.attachedWorld) {
      hook.projectileX = hook.anchorX;
      hook.projectileY = hook.anchorY;
      hook.projectilePrevX = hook.anchorX;
      hook.projectilePrevY = hook.anchorY;
    }
    hook.state = GRAPPLE_STATES.retracting;
    hook.recovery = Math.max(hook.recovery, recovery);
    hook.holdTimer = 0;
    hook.projectileVx = 0;
    hook.projectileVy = 0;
    hook.targetId = null;
    hook.anchorKind = null;
    hook.anchorSourceId = null;
    hook.tetherTension = 0;
    if (reason !== "MISS") {
      audio.playSfx("grappleRetract", 0.18);
    }
    const retractAngle = Math.atan2(getMountPoint(vehicle).y - hook.projectileY, getMountPoint(vehicle).x - hook.projectileX);
    effects.emitGrappleRetract(hook.projectileX || vehicle.x, hook.projectileY || vehicle.y, retractAngle, vehicle.trimColor);
  }

  updateRetraction(dt, vehicle) {
    const hook = vehicle.grapple;
    const mount = getMountPoint(vehicle);
    const dx = mount.x - hook.projectileX;
    const dy = mount.y - hook.projectileY;
    const length = Math.hypot(dx, dy);

    if (length <= 14) {
      hook.projectileX = mount.x;
      hook.projectileY = mount.y;
      hook.projectilePrevX = mount.x;
      hook.projectilePrevY = mount.y;
      hook.projectileVx = 0;
      hook.projectileVy = 0;
      hook.state = GRAPPLE_STATES.cooldown;
      return;
    }

    const step = Math.min(length, GRAPPLE_TUNING.retractSpeed * dt);
    hook.projectilePrevX = hook.projectileX;
    hook.projectilePrevY = hook.projectileY;
    hook.projectileX += (dx / length) * step;
    hook.projectileY += (dy / length) * step;
  }

  breakTether(vehicle, reason, effects, audio, overloaded) {
    const hook = vehicle.grapple;
    if (hook.state !== GRAPPLE_STATES.attachedVehicle && hook.state !== GRAPPLE_STATES.attachedWorld) {
      if (hook.state === GRAPPLE_STATES.fired) {
        this.beginRetract(vehicle, effects, audio, GRAPPLE_TUNING.missRecovery, reason);
      }
      return;
    }

    const mount = getMountPoint(vehicle);
    const endX = hook.targetId ? hook.anchorX : hook.anchorX || hook.projectileX;
    const endY = hook.targetId ? hook.anchorY : hook.anchorY || hook.projectileY;
    effects.emitGrappleBreak(endX, endY, Math.atan2(endY - mount.y, endX - mount.x), overloaded ? "#ff8b5d" : vehicle.trimColor);
    audio.playSfx("grappleBreak", overloaded ? 0.3 : 0.2);
    if (vehicle.isHuman) {
      vehicle.queueHudMessage(reason, overloaded ? "Cable overloaded" : "Retracting", overloaded ? "#ff6b2d" : vehicle.color, 0.55);
    }
    hook.projectileX = endX;
    hook.projectileY = endY;
    hook.projectilePrevX = endX;
    hook.projectilePrevY = endY;
    this.beginRetract(vehicle, effects, audio, overloaded ? GRAPPLE_TUNING.detachRecovery : GRAPPLE_TUNING.cancelRecovery, reason);
  }

  render(ctx, participants, level, props, time = 0) {
    for (const participant of participants) {
      const vehicle = participant.vehicle;
      if (!vehicle?.isAlive()) {
        continue;
      }
      this.renderHookVisuals(ctx, vehicle, participant.controls ?? {}, time);
    }

    if (!this.debug) {
      return;
    }

    for (const anchor of getHookDebugAnchors(level, props)) {
      ctx.save();
      ctx.fillStyle = anchor.kind === "obstacle" ? `rgba(142,252,223,${GRAPPLE_TUNING.debugAnchorAlpha})` : "rgba(255,209,102,0.8)";
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, anchor.kind === "obstacle" ? 5 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderHookVisuals(ctx, vehicle, controls, time) {
    const hook = vehicle.grapple;
    const mount = getMountPoint(vehicle);
    const aimActive = Math.hypot(controls.aimX ?? 0, controls.aimY ?? 0) >= GRAPPLE_TUNING.aimDeadzone;
    const canPreview = aimActive && (hook.state === GRAPPLE_STATES.idle || hook.state === GRAPPLE_STATES.aiming || hook.state === GRAPPLE_STATES.cooldown);

    if (canPreview) {
      const previewAlpha = hook.state === GRAPPLE_STATES.cooldown ? 0.22 : 0.42 + hook.aimStrength * 0.28;
      const aimPointX = mount.x + Math.cos(hook.aimAngle) * GRAPPLE_TUNING.range;
      const aimPointY = mount.y + Math.sin(hook.aimAngle) * GRAPPLE_TUNING.range;

      ctx.save();
      ctx.setLineDash([18, 12]);
      ctx.strokeStyle = `rgba(255,255,255,${previewAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mount.x, mount.y);
      ctx.lineTo(aimPointX, aimPointY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = hook.state === GRAPPLE_STATES.cooldown ? "rgba(255,209,102,0.28)" : `${vehicle.trimColor}88`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(aimPointX, aimPointY, 12 + Math.sin(time * 7 + vehicle.x * 0.01) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = hook.state === GRAPPLE_STATES.cooldown ? "rgba(255,209,102,0.22)" : `${vehicle.color}33`;
      ctx.beginPath();
      ctx.arc(aimPointX, aimPointY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (hook.state === GRAPPLE_STATES.fired || hook.state === GRAPPLE_STATES.retracting) {
      this.drawCable(ctx, mount.x, mount.y, hook.projectileX, hook.projectileY, vehicle, Math.max(0.2, hook.tetherTension));
      ctx.save();
      ctx.translate(hook.projectileX, hook.projectileY);
      ctx.rotate(Math.atan2(hook.projectileVy || (hook.projectileY - mount.y), hook.projectileVx || (hook.projectileX - mount.x)));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-7, -3, 14, 6);
      ctx.strokeStyle = vehicle.trimColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(-7, -3, 14, 6);
      ctx.restore();
      return;
    }

    if (hook.state === GRAPPLE_STATES.attachedVehicle || hook.state === GRAPPLE_STATES.attachedWorld) {
      this.drawCable(ctx, mount.x, mount.y, hook.anchorX, hook.anchorY, vehicle, hook.tetherTension);
      ctx.save();
      ctx.strokeStyle = hook.state === GRAPPLE_STATES.attachedVehicle ? `${vehicle.color}bb` : `${vehicle.trimColor}bb`;
      ctx.lineWidth = 3 + hook.tetherTension * 2;
      ctx.beginPath();
      ctx.arc(hook.anchorX, hook.anchorY, 8 + hook.tetherTension * 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawCable(ctx, startX, startY, endX, endY, vehicle, tension) {
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy) || 1;
    const normalX = -dy / length;
    const normalY = dx / length;
    const sag = Math.sin((performance.now() * 0.01) + vehicle.x * 0.01) * 4 * (1 - tension);
    const midX = (startX + endX) * 0.5 + normalX * sag;
    const midY = (startY + endY) * 0.5 + normalY * sag;

    ctx.save();
    ctx.strokeStyle = `${vehicle.color}${tension > 0.66 ? "dd" : "88"}`;
    ctx.lineWidth = 3 + tension * 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
    ctx.restore();
  }
}
