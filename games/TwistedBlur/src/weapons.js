import { SPECIAL_WEAPON_DEFS } from "./constants.js";
import { angleToVector, clamp, distance, pointInRect, randomRange, segmentCircleHit, signedAngleToTarget } from "./physics.js";

function closestTarget(owner, participants, maxDistance = 900) {
  let best = null;
  let bestDistance = maxDistance;

  for (const participant of participants) {
    const vehicle = participant.vehicle;
    if (!vehicle || vehicle.id === owner.id || !vehicle.isAlive()) {
      continue;
    }

    const currentDistance = distance(owner.x, owner.y, vehicle.x, vehicle.y);
    if (currentDistance < bestDistance) {
      bestDistance = currentDistance;
      best = vehicle;
    }
  }

  return best;
}

function arcTargets(owner, participants, maxDistance = 380, maxAngle = 0.55, maxCount = 3) {
  return participants
    .map((participant) => participant.vehicle)
    .filter((target) => target && target.id !== owner.id && target.isAlive())
    .map((target) => ({
      target,
      distance: distance(owner.x, owner.y, target.x, target.y),
      angle: Math.abs(signedAngleToTarget(owner.angle, owner.x, owner.y, target.x, target.y)),
    }))
    .filter((entry) => entry.distance <= maxDistance && entry.angle <= maxAngle)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxCount)
    .map((entry) => entry.target);
}

export class WeaponSystem {
  constructor() {
    this.projectiles = [];
  }

  reset() {
    this.projectiles.length = 0;
  }

  tryFirePrimary(vehicle, participants, props, effects, audio) {
    if (!vehicle.isAlive() || vehicle.primaryCooldown > 0) {
      return [];
    }

    const spread = randomRange(-0.04, 0.04);
    const angle = vehicle.angle + spread;
    const direction = angleToVector(angle);
    const muzzleX = vehicle.x + direction.x * (vehicle.radius + 16);
    const muzzleY = vehicle.y + direction.y * (vehicle.radius + 16);

    this.projectiles.push({
      kind: "bullet",
      ownerId: vehicle.id,
      x: muzzleX,
      y: muzzleY,
      prevX: muzzleX,
      prevY: muzzleY,
      vx: direction.x * 1160 + vehicle.vx * 0.22,
      vy: direction.y * 1160 + vehicle.vy * 0.22,
      ttl: 0.62,
      radius: 8,
      damage: 6 * vehicle.damageMultiplier,
      color: "#fff6c7",
    });

    vehicle.primaryCooldown = 0.085;
    effects.emitSparks(muzzleX, muzzleY, angle, 3, "#fff6c7");
    audio.playSfx("gun", 0.18);
    return [];
  }

  tryFireSpecial(vehicle, participants, props, effects, audio) {
    if (!vehicle.isAlive() || !vehicle.specialWeaponId || vehicle.specialAmmo <= 0 || vehicle.specialCooldown > 0) {
      return [];
    }

    const events = [];
    const weaponId = vehicle.specialWeaponId;
    const def = SPECIAL_WEAPON_DEFS[weaponId];
    const forward = angleToVector(vehicle.angle);

    if (weaponId === "rocket") {
      const x = vehicle.x + forward.x * (vehicle.radius + 22);
      const y = vehicle.y + forward.y * (vehicle.radius + 22);
      this.projectiles.push({
        kind: "rocket",
        ownerId: vehicle.id,
        x,
        y,
        prevX: x,
        prevY: y,
        vx: forward.x * 720 + vehicle.vx * 0.35,
        vy: forward.y * 720 + vehicle.vy * 0.35,
        ttl: 2.6,
        radius: 12,
        damage: 26 * vehicle.damageMultiplier,
        splash: 150,
        color: def.color,
      });
      effects.emitSparks(x, y, vehicle.angle, 6, def.color);
      audio.playSfx("rocket", 0.4);
    } else if (weaponId === "homing") {
      const target = closestTarget(vehicle, participants, 1100);
      const x = vehicle.x + forward.x * (vehicle.radius + 20);
      const y = vehicle.y + forward.y * (vehicle.radius + 20);
      this.projectiles.push({
        kind: "homing",
        ownerId: vehicle.id,
        x,
        y,
        prevX: x,
        prevY: y,
        vx: forward.x * 540 + vehicle.vx * 0.18,
        vy: forward.y * 540 + vehicle.vy * 0.18,
        ttl: 3.6,
        radius: 12,
        damage: 22 * vehicle.damageMultiplier,
        splash: 135,
        targetId: target?.id ?? null,
        color: def.color,
      });
      if (target?.isHuman) {
        target.queueWarning("MISSILE LOCK", "Boost or break line", def.color, 1.1);
        audio.playSfx("warning", 0.22);
      }
      effects.emitSparks(x, y, vehicle.angle, 7, def.color);
      audio.playSfx("homing", 0.35);
    } else if (weaponId === "mine") {
      const x = vehicle.x - forward.x * (vehicle.radius + 10);
      const y = vehicle.y - forward.y * (vehicle.radius + 10);
      this.projectiles.push({
        kind: "mine",
        ownerId: vehicle.id,
        x,
        y,
        prevX: x,
        prevY: y,
        vx: vehicle.vx * 0.1,
        vy: vehicle.vy * 0.1,
        ttl: 16,
        radius: 18,
        damage: 24 * vehicle.damageMultiplier,
        splash: 160,
        armedTimer: 0.42,
        color: def.color,
      });
      audio.playSfx("mine", 0.32);
    } else if (weaponId === "emp") {
      const radius = 220;
      effects.emitShockwave(vehicle.x, vehicle.y, def.color, radius);
      audio.playSfx("emp", 0.4);
      for (const participant of participants) {
        const target = participant.vehicle;
        if (!target || target.id === vehicle.id || !target.isAlive()) {
          continue;
        }
        const currentDistance = distance(vehicle.x, vehicle.y, target.x, target.y);
        if (currentDistance > radius) {
          continue;
        }
        target.stunTimer = Math.max(target.stunTimer, 2.35);
        const destroyed = target.applyDamage(10 * vehicle.damageMultiplier, vehicle.id);
        const impulseScale = clamp(1 - currentDistance / radius, 0.2, 1);
        const awayX = (target.x - vehicle.x) / (currentDistance || 1);
        const awayY = (target.y - vehicle.y) / (currentDistance || 1);
        target.vx += awayX * 260 * impulseScale;
        target.vy += awayY * 260 * impulseScale;
        if (destroyed) {
          events.push({ type: "destroyed", sourceId: vehicle.id, targetId: target.id, x: target.x, y: target.y });
        }
      }
    } else if (weaponId === "shockwave") {
      const radius = 170;
      effects.emitShockwave(vehicle.x, vehicle.y, def.color, radius);
      audio.playSfx("shockwave", 0.35);
      for (const participant of participants) {
        const target = participant.vehicle;
        if (!target || target.id === vehicle.id || !target.isAlive()) {
          continue;
        }
        const currentDistance = distance(vehicle.x, vehicle.y, target.x, target.y);
        if (currentDistance > radius) {
          continue;
        }
        const destroyed = target.applyDamage(12 * vehicle.damageMultiplier, vehicle.id);
        const awayX = (target.x - vehicle.x) / (currentDistance || 1);
        const awayY = (target.y - vehicle.y) / (currentDistance || 1);
        target.vx += awayX * 420;
        target.vy += awayY * 420;
        if (destroyed) {
          events.push({ type: "destroyed", sourceId: vehicle.id, targetId: target.id, x: target.x, y: target.y });
        }
      }
    } else if (weaponId === "shield") {
      vehicle.shieldTimer = Math.max(vehicle.shieldTimer, 4.5);
      effects.emitShockwave(vehicle.x, vehicle.y, def.color, 100);
      audio.playSfx("shield", 0.32);
    } else if (weaponId === "rail") {
      const startX = vehicle.x + forward.x * (vehicle.radius + 18);
      const startY = vehicle.y + forward.y * (vehicle.radius + 18);
      const endX = startX + forward.x * 980;
      const endY = startY + forward.y * 980;
      effects.emitBeam(startX, startY, endX, endY, def.color);
      audio.playSfx("rail", 0.32);

      for (const participant of participants) {
        const target = participant.vehicle;
        if (!target || target.id === vehicle.id || !target.isAlive()) {
          continue;
        }
        if (!segmentCircleHit(startX, startY, endX, endY, target.x, target.y, target.radius)) {
          continue;
        }
        target.stunTimer = Math.max(target.stunTimer, 0.45);
        const destroyed = target.applyDamage(26 * vehicle.damageMultiplier, vehicle.id);
        if (destroyed) {
          events.push({ type: "destroyed", sourceId: vehicle.id, targetId: target.id, x: target.x, y: target.y });
        }
      }

      for (const propState of props) {
        if (!propState.active) {
          continue;
        }
        if (segmentCircleHit(startX, startY, endX, endY, propState.x, propState.y, propState.radius + 6)) {
          events.push({ type: "propHit", propId: propState.id, damage: 18, sourceId: vehicle.id, x: propState.x, y: propState.y });
        }
      }
    } else if (weaponId === "flak") {
      for (let pellet = 0; pellet < 5; pellet += 1) {
        const spread = vehicle.angle + randomRange(-0.22, 0.22);
        const direction = angleToVector(spread);
        const x = vehicle.x + direction.x * (vehicle.radius + 16);
        const y = vehicle.y + direction.y * (vehicle.radius + 16);
        this.projectiles.push({
          kind: "flak",
          ownerId: vehicle.id,
          x,
          y,
          prevX: x,
          prevY: y,
          vx: direction.x * randomRange(480, 620) + vehicle.vx * 0.22,
          vy: direction.y * randomRange(480, 620) + vehicle.vy * 0.22,
          ttl: randomRange(0.5, 0.82),
          radius: 10,
          damage: 11 * vehicle.damageMultiplier,
          splash: 70,
          color: def.color,
        });
      }
      effects.emitSparks(vehicle.x + forward.x * 28, vehicle.y + forward.y * 28, vehicle.angle, 8, def.color);
      audio.playSfx("flak", 0.36);
    } else if (weaponId === "arc") {
      const targets = arcTargets(vehicle, participants, 390, 0.58, 3);
      let arcFrom = { x: vehicle.x, y: vehicle.y };
      targets.forEach((target, index) => {
        const damage = (18 - index * 3) * vehicle.damageMultiplier;
        target.stunTimer = Math.max(target.stunTimer, 1.0 - index * 0.15);
        const destroyed = target.applyDamage(damage, vehicle.id);
        effects.emitBeam(arcFrom.x, arcFrom.y, target.x, target.y, def.color);
        arcFrom = target;
        if (destroyed) {
          events.push({ type: "destroyed", sourceId: vehicle.id, targetId: target.id, x: target.x, y: target.y });
        }
      });
      if (!targets.length) {
        effects.emitBeam(vehicle.x, vehicle.y, vehicle.x + forward.x * 260, vehicle.y + forward.y * 260, def.color);
      }
      audio.playSfx("arc", 0.34);
    }

    vehicle.specialAmmo -= 1;
    vehicle.specialCooldown = def.cooldown;
    if (vehicle.specialAmmo <= 0) {
      vehicle.clearSpecialWeapon();
    }

    return events;
  }

  update(dt, participants, level, props, effects, audio) {
    const events = [];

    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      projectile.ttl -= dt;
      projectile.prevX = projectile.x;
      projectile.prevY = projectile.y;

      if (projectile.kind === "mine") {
        projectile.armedTimer = Math.max(0, (projectile.armedTimer ?? 0) - dt);
      }

      if (projectile.kind === "homing") {
        const owner = participants.find((participant) => participant.id === projectile.ownerId)?.vehicle;
        let target = participants.find((participant) => participant.id === projectile.targetId)?.vehicle;
        if (!target || !target.isAlive()) {
          target = owner ? closestTarget(owner, participants, 1200) : null;
          projectile.targetId = target?.id ?? null;
        }
        if (target) {
          const desiredAngle = Math.atan2(target.y - projectile.y, target.x - projectile.x);
          const speed = Math.hypot(projectile.vx, projectile.vy);
          const currentAngle = Math.atan2(projectile.vy, projectile.vx);
          const delta = Math.atan2(Math.sin(desiredAngle - currentAngle), Math.cos(desiredAngle - currentAngle));
          const nextAngle = currentAngle + clamp(delta, -0.055, 0.055);
          const nextSpeed = Math.min(740, speed + dt * 65);
          projectile.vx = Math.cos(nextAngle) * nextSpeed;
          projectile.vy = Math.sin(nextAngle) * nextSpeed;
        }
      }

      if (projectile.kind !== "mine") {
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
      }

      const shouldRemove = projectile.ttl <= 0 || this.handleProjectileCollision(projectile, participants, level, props, effects, audio, events);
      if (shouldRemove) {
        this.projectiles.splice(index, 1);
      }
    }

    return events;
  }

  handleProjectileCollision(projectile, participants, level, props, effects, audio, events) {
    if (projectile.x < -240 || projectile.y < -240 || projectile.x > level.world.width + 240 || projectile.y > level.world.height + 240) {
      return true;
    }

    for (const propState of props) {
      if (!propState.active) {
        continue;
      }
      if (distance(projectile.x, projectile.y, propState.x, propState.y) > projectile.radius + propState.radius) {
        continue;
      }
      if (projectile.kind !== "bullet") {
        this.explode(projectile, participants, props, effects, audio, events);
      } else {
        effects.emitImpactBurst(propState.x, propState.y, Math.atan2(projectile.vy, projectile.vx), projectile.color, 0.8);
        audio.playSfx("impact", 0.16);
        events.push({ type: "propHit", propId: propState.id, damage: projectile.damage, sourceId: projectile.ownerId, x: propState.x, y: propState.y });
      }
      return true;
    }

    for (const obstacle of level.obstacles ?? []) {
      if (pointInRect(projectile.x, projectile.y, obstacle)) {
        if (projectile.kind !== "bullet") {
          this.explode(projectile, participants, props, effects, audio, events);
        }
        return true;
      }
    }

    for (const participant of participants) {
      const vehicle = participant.vehicle;
      if (!vehicle || !vehicle.isAlive() || vehicle.id === projectile.ownerId) {
        continue;
      }

      const hit = projectile.kind === "bullet"
        ? segmentCircleHit(projectile.prevX, projectile.prevY, projectile.x, projectile.y, vehicle.x, vehicle.y, vehicle.radius)
        : distance(projectile.x, projectile.y, vehicle.x, vehicle.y) <= vehicle.radius + projectile.radius;

      if (!hit) {
        continue;
      }

      if (projectile.kind === "bullet") {
        const destroyed = vehicle.applyDamage(projectile.damage, projectile.ownerId);
        vehicle.vx += projectile.vx * 0.05;
        vehicle.vy += projectile.vy * 0.05;
        effects.emitImpactBurst(vehicle.x, vehicle.y, Math.atan2(projectile.vy, projectile.vx), projectile.color, 0.7);
        audio.playSfx("impact", 0.18);
        if (destroyed) {
          events.push({ type: "destroyed", sourceId: projectile.ownerId, targetId: vehicle.id, x: vehicle.x, y: vehicle.y });
        }
      } else {
        this.explode(projectile, participants, props, effects, audio, events);
      }
      return true;
    }

    if (projectile.kind === "mine" && projectile.armedTimer <= 0) {
      for (const participant of participants) {
        const vehicle = participant.vehicle;
        if (!vehicle || !vehicle.isAlive() || vehicle.id === projectile.ownerId) {
          continue;
        }
        if (vehicle.airborne) {
          continue;
        }
        if (distance(projectile.x, projectile.y, vehicle.x, vehicle.y) <= vehicle.radius + projectile.radius + 12) {
          effects.emitShockwave(projectile.x, projectile.y, projectile.color, projectile.splash ?? 120);
          this.explode(projectile, participants, props, effects, audio, events);
          return true;
        }
      }
    }

    if (projectile.kind !== "mine" && projectile.ttl <= 0) {
      this.explode(projectile, participants, props, effects, audio, events);
      return true;
    }

    return projectile.ttl <= 0;
  }

  explode(projectile, participants, props, effects, audio, events) {
    const radius = projectile.splash ?? 120;
    effects.emitExplosion(projectile.x, projectile.y, projectile.color, projectile.kind === "rocket" ? 1.1 : 1);
    effects.emitShockwave(projectile.x, projectile.y, projectile.color, radius);
    audio.playSfx("explosion", 0.45);

    for (const participant of participants) {
      const vehicle = participant.vehicle;
      if (!vehicle || !vehicle.isAlive() || vehicle.id === projectile.ownerId) {
        continue;
      }

      const currentDistance = distance(projectile.x, projectile.y, vehicle.x, vehicle.y);
      if (currentDistance > radius + vehicle.radius) {
        continue;
      }

      const falloff = 1 - currentDistance / (radius + vehicle.radius);
      const destroyed = vehicle.applyDamage(projectile.damage * Math.max(0.35, falloff), projectile.ownerId);
      const awayX = (vehicle.x - projectile.x) / (currentDistance || 1);
      const awayY = (vehicle.y - projectile.y) / (currentDistance || 1);
      vehicle.vx += awayX * 420 * falloff;
      vehicle.vy += awayY * 420 * falloff;
      if (projectile.kind === "mine" || projectile.kind === "flak") {
        vehicle.stunTimer = Math.max(vehicle.stunTimer, 0.6);
      }
      if (destroyed) {
        events.push({ type: "destroyed", sourceId: projectile.ownerId, targetId: vehicle.id, x: vehicle.x, y: vehicle.y });
      }
    }

    for (const propState of props) {
      if (!propState.active) {
        continue;
      }
      const currentDistance = distance(projectile.x, projectile.y, propState.x, propState.y);
      if (currentDistance > radius + propState.radius) {
        continue;
      }
      const falloff = 1 - currentDistance / (radius + propState.radius);
      events.push({
        type: "propHit",
        propId: propState.id,
        damage: projectile.damage * Math.max(0.42, falloff),
        sourceId: projectile.ownerId,
        x: propState.x,
        y: propState.y,
      });
    }
  }

  render(ctx) {
    for (const projectile of this.projectiles) {
      if (projectile.kind === "mine") {
        const minePulse = Math.sin(performance.now() * 0.01) * 3;
        ctx.fillStyle = projectile.armedTimer > 0 ? "rgba(255,76,99,0.5)" : "#ff4c63";
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius + 10 + minePulse, 0, Math.PI * 2);
        ctx.fillStyle = projectile.armedTimer > 0 ? "rgba(255,76,99,0.12)" : "rgba(255,76,99,0.22)";
        ctx.fill();
        if (projectile.armedTimer <= 0) {
          ctx.strokeStyle = "rgba(255,76,99,0.45)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(projectile.x, projectile.y, (projectile.splash ?? 140) * 0.55, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = projectile.armedTimer > 0 ? "rgba(255,76,99,0.5)" : "#ff4c63";
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        continue;
      }

      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(Math.atan2(projectile.vy, projectile.vx));
      ctx.fillStyle = projectile.color;
      if (projectile.kind === "flak") {
        ctx.fillRect(-projectile.radius * 0.8, -projectile.radius * 0.55, projectile.radius * 1.6, projectile.radius * 1.1);
      } else {
        ctx.fillRect(-projectile.radius, -projectile.radius * 0.4, projectile.radius * 2.2, projectile.radius * 0.8);
      }
      ctx.restore();

      if (projectile.kind === "homing") {
        ctx.save();
        ctx.strokeStyle = "rgba(255,209,102,0.42)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius + 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}
